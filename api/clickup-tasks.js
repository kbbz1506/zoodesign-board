// api/clickup-tasks.js
// Vercel serverless function — proxies ClickUp task fetches server-side
// so the API token is never exposed in the browser.

const CLICKUP_TOKEN   = process.env.CLICKUP_TOKEN;
const CLICKUP_LIST_ID = "901611810331";
const EXCLUDED_STATUSES = ["completed", "approved - studio finalise"];

const CLIENT_OPTION_MAP = {
  0:"BBC", 1:"BUNNINGS", 2:"COMM BANK", 3:"PROLOGICAL",
  4:"TOGA", 5:"TWO BLIND MICE", 6:"WARRIGAL",
};

const DESIGNER_FIELD_ID  = "b4754fc3-6625-4adb-a91c-37b48dab518d";
const STAGE_DL_FIELD_ID  = "d3eaa57c-091b-47f6-bc39-b12eab4a32a0";
const CLIENT_FIELD_ID    = "6fd9559e-5e7b-4db1-ba64-e2d0565957e9";
const SERVICES_FIELD_ID  = "b861a06b-323c-476e-9cc3-84ca1f70aa1c";

// ─── Retry helper — retries on 502 Bad Gateway only ──────────
async function fetchWithRetry(url, options, retries = 3) {
  let lastRes;
  for (let i = 0; i < retries; i++) {
    lastRes = await fetch(url, options);
    if (lastRes.ok || lastRes.status !== 502) return lastRes; // success or non-502 error — stop
    // 502 only: wait with exponential backoff before retrying
    if (i < retries - 1) await new Promise(r => setTimeout(r, 600 * (i + 1)));
  }
  return lastRes; // return last response after exhausting retries
}

export default async function handler(req, res) {
  // CORS headers — allow requests from any origin (our Vercel frontend)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!CLICKUP_TOKEN) {
    return res.status(500).json({ error: "CLICKUP_TOKEN environment variable not set" });
  }

  try {
    let allTasks = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const url = `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?include_closed=true&subtasks=false&page=${page}`;
      const response = await fetchWithRetry(url, {
        headers: { Authorization: CLICKUP_TOKEN },
      });

      if (!response.ok) {
        const text = await response.text();
        // Strip any HTML from gateway error messages so the frontend can display them cleanly
        const clean = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
        return res.status(response.status).json({ error: `ClickUp error (${response.status}): ${clean}` });
      }

      const data = await response.json();
      allTasks = [...allTasks, ...data.tasks];
      hasMore = data.tasks.length === 100;
      page++;
    }

    // Filter and normalise
    const normalised = allTasks
      .filter(t => !EXCLUDED_STATUSES.includes(t.status?.status))
      .map(t => normaliseTask(t));

    const unassigned = normalised.filter(t => !t.designerUserId);
    const assigned   = normalised.filter(t =>  t.designerUserId);

    return res.status(200).json({ unassigned, assigned });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function normaliseTask(t) {
  const fields = t.custom_fields || [];
  const getField = id => fields.find(f => f.id === id);

  const designerField  = getField(DESIGNER_FIELD_ID);
  const designerUsers  = designerField?.value || [];
  const designerUserId = designerUsers[0]?.id ? String(designerUsers[0].id) : null;
  const designerName   = designerUsers[0]?.username || null;

  const clientField  = getField(CLIENT_FIELD_ID);
  const clientIndex  = clientField?.value ?? null;
  const client       = clientIndex !== null ? (CLIENT_OPTION_MAP[clientIndex] || "Unknown") : "Unknown";

  const servicesField   = getField(SERVICES_FIELD_ID);
  const servicesOptions = servicesField?.type_config?.options || [];
  const servicesValues  = servicesField?.value || [];
  const services = servicesValues.map(id => {
    const opt = servicesOptions.find(o => o.id === id);
    return opt?.label || opt?.name || id;
  });

  const stageDLField   = getField(STAGE_DL_FIELD_ID);
  const stage_deadline = stageDLField?.value ? String(stageDLField.value) : null;

  return {
    id:            t.id,
    name:          t.name,
    status:        t.status?.status || "",
    due_date:      t.due_date ? String(t.due_date) : null,
    stage_deadline,
    time_estimate: t.time_estimate || 0,
    priority:      t.priority || { priority: "normal" },
    client,
    services,
    designerUserId,
    designerName,
    assignedTo:    designerUserId,
  };
}
