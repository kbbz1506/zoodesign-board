// ─────────────────────────────────────────────────────────────
// ZOODESIGN Studio Board — API Layer
// All ClickUp and Notion calls live here.
// ─────────────────────────────────────────────────────────────

// ─── CREDENTIALS ─────────────────────────────────────────────
// Replace these values with your real tokens.
// CLICKUP_TOKEN: your personal ClickUp API token (pk_...)
// NOTION_TOKEN:  your Notion internal integration token (secret_...)
export const CLICKUP_TOKEN = "pk_48795404_K4GRD4VKKJNQ1KZUMM2UMFDUZ1MLX1VX";
export const NOTION_TOKEN  = "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";

// ─── IDs (confirmed in Step 1) ───────────────────────────────
const CLICKUP_LIST_ID       = "901611810331";
const DESIGNER_FIELD_ID     = "b4754fc3-6625-4adb-a91c-37b48dab518d";
const STAGE_DL_FIELD_ID     = "d3eaa57c-091b-47f6-bc39-b12eab4a32a0";
const CLIENT_FIELD_ID       = "6fd9559e-5e7b-4db1-ba64-e2d0565957e9";
const SERVICES_FIELD_ID     = "b861a06b-323c-476e-9cc3-84ca1f70aa1c";
const NOTION_CAPACITY_DB    = "d213e8cdc91e4cc9a4b50ebc49fca1fb";
const NOTION_SKILLS_DB      = "7508c810be1b40e08483a7158cf27eb8";

// Statuses excluded from Unassigned tab
const EXCLUDED_STATUSES = ["completed", "approved - studio finalise"];

// ─── CLIENT NAME MAP ─────────────────────────────────────────
// Maps ClickUp dropdown option index → client name
const CLIENT_OPTION_MAP = {
  0: "BBC",
  1: "BUNNINGS",
  2: "COMM BANK",
  3: "PROLOGICAL",
  4: "TOGA",
  5: "TWO BLIND MICE",
  6: "WARRIGAL",
};

// ─────────────────────────────────────────────────────────────
// CLICKUP API
// ─────────────────────────────────────────────────────────────

// Fetch all tasks from Production Hub list
// Returns two arrays: unassigned (Designer field empty) and assigned (Designer field set)
export async function fetchClickUpTasks() {
  let allTasks = [];
  let page = 0;
  let hasMore = true;

  // ClickUp paginates at 100 tasks per page — loop until we have everything
  while (hasMore) {
    const url = `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?include_closed=true&subtasks=false&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: CLICKUP_TOKEN },
    });

    if (!res.ok) {
      throw new Error(`ClickUp API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    allTasks = [...allTasks, ...data.tasks];

    // ClickUp returns fewer than 100 when on the last page
    hasMore = data.tasks.length === 100;
    page++;
  }

  // Normalise each task into the shape the board expects
  const normalised = allTasks
    .filter(t => !EXCLUDED_STATUSES.includes(t.status?.status))
    .map(t => normaliseTask(t));

  // Split into unassigned (Designer field empty) and assigned (Designer field set)
  const unassigned = normalised.filter(t => !t.designerUserId);
  const assigned   = normalised.filter(t =>  t.designerUserId);

  return { unassigned, assigned };
}

// Update a task's Designer custom field and Due Date in ClickUp
export async function assignTaskInClickUp(taskId, clickupUserId, dueDateMs) {
  const url = `https://api.clickup.com/api/v2/task/${taskId}`;

  // Step 1: set the due date on the task
  const taskRes = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: CLICKUP_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      due_date: dueDateMs,
      due_date_time: false,
    }),
  });

  if (!taskRes.ok) {
    throw new Error(`ClickUp due date update failed: ${taskRes.status}`);
  }

  // Step 2: set the Designer custom field
  const fieldUrl = `https://api.clickup.com/api/v2/task/${taskId}/field/${DESIGNER_FIELD_ID}`;
  const fieldRes = await fetch(fieldUrl, {
    method: "POST",
    headers: {
      Authorization: CLICKUP_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      value: { add: [Number(clickupUserId)], rem: [] },
    }),
  });

  if (!fieldRes.ok) {
    throw new Error(`ClickUp Designer field update failed: ${fieldRes.status}`);
  }

  return true;
}

// Clear a task's Designer custom field (used when unassigning from the board)
export async function unassignTaskInClickUp(taskId, clickupUserId) {
  const fieldUrl = `https://api.clickup.com/api/v2/task/${taskId}/field/${DESIGNER_FIELD_ID}`;
  const res = await fetch(fieldUrl, {
    method: "POST",
    headers: {
      Authorization: CLICKUP_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      value: { add: [], rem: [Number(clickupUserId)] },
    }),
  });

  if (!res.ok) {
    throw new Error(`ClickUp unassign failed: ${res.status}`);
  }

  return true;
}

// Normalise a raw ClickUp task into the shape the board uses
function normaliseTask(t) {
  const fields = t.custom_fields || [];

  const getField = (id) => fields.find(f => f.id === id);

  // Designer custom field — users type, value is array of user objects
  const designerField = getField(DESIGNER_FIELD_ID);
  const designerUsers = designerField?.value || [];
  const designerUserId = designerUsers[0]?.id
    ? String(designerUsers[0].id)
    : null;
  const designerName = designerUsers[0]?.username || null;

  // Client dropdown — value is the orderindex integer
  const clientField  = getField(CLIENT_FIELD_ID);
  const clientIndex  = clientField?.value ?? null;
  const client       = clientIndex !== null ? CLIENT_OPTION_MAP[clientIndex] || "Unknown" : null;

  // Services labels — value is array of option IDs; map to label names
  const servicesField   = getField(SERVICES_FIELD_ID);
  const servicesOptions = servicesField?.type_config?.options || [];
  const servicesValues  = servicesField?.value || [];
  const services = servicesValues.map(id => {
    const opt = servicesOptions.find(o => o.id === id);
    return opt?.label || opt?.name || id;
  });

  // Stage Deadline — date field, value is ms timestamp string
  const stageDLField = getField(STAGE_DL_FIELD_ID);
  const stage_deadline = stageDLField?.value ? String(stageDLField.value) : null;

  return {
    id:             t.id,
    name:           t.name,
    status:         t.status?.status || "",
    due_date:       t.due_date ? String(t.due_date) : null,
    stage_deadline,
    time_estimate:  t.time_estimate || 0,
    priority:       t.priority || { priority: "normal" },
    client:         client || "Unknown",
    services,
    designerUserId,
    designerName,
    assignedTo:     designerUserId,
    // Keep raw for debugging
    _raw: t,
  };
}

// ─────────────────────────────────────────────────────────────
// NOTION API
// ─────────────────────────────────────────────────────────────

// Fetch capacity entries from Notion for a given week
// weekStartStr: "YYYY-MM-DD" (Monday of the week)
// weekEndStr:   "YYYY-MM-DD" (Friday of the week)
export async function fetchNotionCapacity(weekStartStr, weekEndStr) {
  const url = `https://api.notion.com/v1/databases/${NOTION_CAPACITY_DB}/query`;

  const body = {
    filter: {
      and: [
        {
          property: "Date",
          date: { on_or_after: weekStartStr },
        },
        {
          property: "Date",
          date: { on_or_before: weekEndStr },
        },
      ],
    },
    sorts: [{ property: "Date", direction: "ascending" }],
    page_size: 100,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Notion capacity fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.results.map(normaliseCapacityRow);
}

// Fetch all designer skill profiles from Notion
export async function fetchNotionSkills() {
  const url = `https://api.notion.com/v1/databases/${NOTION_SKILLS_DB}/query`;

  const body = {
    filter: {
      property: "Active",
      checkbox: { equals: true },
    },
    page_size: 100,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Notion skills fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.results.map(normaliseSkillRow);
}

// Normalise a Notion capacity database row into the shape the board uses
function normaliseCapacityRow(page) {
  const props = page.properties;

  const getText   = (p) => p?.title?.[0]?.plain_text || p?.rich_text?.[0]?.plain_text || "";
  const getDate   = (p) => p?.date?.start || null;
  const getSelect = (p) => p?.select?.name || null;
  const getNumber = (p) => p?.number ?? 0;

  return {
    designer:       getText(props["Designer"]),
    clickupUserId:  getText(props["ClickUp User ID"]),
    date:           getDate(props["Date"]),
    dayOfWeek:      getSelect(props["Day of Week"]),
    availableHours: getNumber(props["Available Hours"]),
    status:         getSelect(props["Status"]) || "Unavailable",
    notes:          getText(props["Notes"]),
  };
}

// Normalise a Notion skills database row into the shape the board uses
function normaliseSkillRow(page) {
  const props = page.properties;

  const getText      = (p) => p?.title?.[0]?.plain_text || p?.rich_text?.[0]?.plain_text || "";
  const getSelect    = (p) => p?.select?.name || null;
  const getMulti     = (p) => p?.multi_select?.map(o => o.name) || [];

  return {
    designer:       getText(props["Designer"]),
    clickupUserId:  getText(props["ClickUp User ID"]),
    role:           getSelect(props["Role"]),
    skills:         getMulti(props["Skills"]),
    skillNotes:     getText(props["Skill Notes"]),
    notSuitedFor:   getText(props["Not Suited For"]),
    active:         props["Active"]?.checkbox ?? true,
  };
}
