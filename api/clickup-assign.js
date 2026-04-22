// api/clickup-assign.js
// Vercel serverless function — proxies ClickUp task updates server-side

const CLICKUP_TOKEN      = process.env.CLICKUP_TOKEN;
const DESIGNER_FIELD_ID  = "b4754fc3-6625-4adb-a91c-37b48dab518d";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!CLICKUP_TOKEN) {
    return res.status(500).json({ error: "CLICKUP_TOKEN environment variable not set" });
  }

  const { taskId, clickupUserId, dueDateMs, action } = req.body;

  if (!taskId) return res.status(400).json({ error: "taskId required" });

  try {
    // action = "assign" | "unassign" | "reassign"
    if (action === "assign" || action === "reassign") {
      // Set due date
      if (dueDateMs) {
        const duRes = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
          method: "PUT",
          headers: { Authorization: CLICKUP_TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify({ due_date: Number(dueDateMs), due_date_time: false }),
        });
        if (!duRes.ok) {
          const text = await duRes.text();
          return res.status(duRes.status).json({ error: `Due date update failed: ${text}` });
        }
      }

      // Set Designer custom field
      const fieldRes = await fetch(
        `https://api.clickup.com/api/v2/task/${taskId}/field/${DESIGNER_FIELD_ID}`,
        {
          method: "POST",
          headers: { Authorization: CLICKUP_TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify({ value: { add: [Number(clickupUserId)], rem: [] } }),
        }
      );
      if (!fieldRes.ok) {
        const text = await fieldRes.text();
        return res.status(fieldRes.status).json({ error: `Designer field update failed: ${text}` });
      }
    }

    if (action === "unassign" || action === "reassign") {
      const { fromUserId } = req.body;
      const uid = action === "unassign" ? clickupUserId : fromUserId;
      if (uid) {
        const unRes = await fetch(
          `https://api.clickup.com/api/v2/task/${taskId}/field/${DESIGNER_FIELD_ID}`,
          {
            method: "POST",
            headers: { Authorization: CLICKUP_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({ value: { add: [], rem: [Number(uid)] } }),
          }
        );
        if (!unRes.ok) {
          const text = await unRes.text();
          return res.status(unRes.status).json({ error: `Unassign failed: ${text}` });
        }
      }
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
