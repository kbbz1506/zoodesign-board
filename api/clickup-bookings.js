// api/clickup-bookings.js
// Vercel serverless function — saves multi-day / multi-designer production
// bookings and related task details to ClickUp in one call.
//
// Writes (all optional except taskId + bookings):
//   • Studio Bookings custom field  — board-owned JSON array
//   • Booking Summary custom field  — human-readable plan (ClickUp Automation
//     logs this to a task comment for historical record)
//   • Designer custom field         — lead designer (first booking's designer)
//   • due_date                      — ONLY when explicitly sent (studio manager
//     controls when the task goes live for a designer)
//   • assignees                     — add/remove formal ClickUp assignees

const CLICKUP_TOKEN     = process.env.CLICKUP_TOKEN;
const DESIGNER_FIELD_ID = "b4754fc3-6625-4adb-a91c-37b48dab518d";
const BOOKINGS_FIELD_ID = "8b361fc0-e800-4720-ba09-d6334c8c8530";
const SUMMARY_FIELD_ID  = "3d4a4d2a-1556-491b-bcec-bc413835abf9";

async function cu(path, method, body) {
  const res = await fetch(`https://api.clickup.com/api/v2${path}`, {
    method,
    headers: { Authorization: CLICKUP_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    const clean = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
    const err = new Error(`ClickUp ${method} ${path} failed (${res.status}): ${clean}`);
    err.status = res.status;
    throw err;
  }
  return res.json().catch(() => ({}));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!CLICKUP_TOKEN) {
    return res.status(500).json({ error: "CLICKUP_TOKEN environment variable not set" });
  }

  const {
    taskId,
    bookings,        // [{designerId, date:"YYYY-MM-DD", hours}] — required (may be empty array to clear)
    summary,         // human-readable Booking Summary text
    leadAdd,         // designer userId to set as Designer field (lead)
    leadRem,         // previous lead userId to remove from Designer field
    dueDateMs,       // set task due date (ms) — only when manager explicitly changes it
    assigneeAdd,     // userId to formally assign in ClickUp
    assigneeRem,     // userId(s) to remove — string or array
    complete,        // manual "fully booked" override (bool)
  } = req.body;

  if (!taskId) return res.status(400).json({ error: "taskId required" });
  if (!Array.isArray(bookings)) return res.status(400).json({ error: "bookings array required" });

  // Validate + normalise bookings
  const clean = [];
  for (const b of bookings) {
    const designerId = String(b?.designerId || "");
    const date = String(b?.date || "").substring(0, 10);
    const hours = Math.round(Number(b?.hours) * 10) / 10;
    if (!designerId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(hours > 0)) {
      return res.status(400).json({ error: `Invalid booking entry: ${JSON.stringify(b)}` });
    }
    clean.push({ designerId, date, hours });
  }
  clean.sort((a, b) => a.date.localeCompare(b.date));

  const done = [];
  try {
    // 1. Studio Bookings JSON (board-owned) — v2 shape carries the manual
    //    "fully booked" override alongside the booking entries
    await cu(`/task/${taskId}/field/${BOOKINGS_FIELD_ID}`, "POST", {
      value: (clean.length || complete) ? JSON.stringify({ v: 2, complete: !!complete, bookings: clean }) : "",
    });
    done.push("bookings");

    // 2. Booking Summary (human-readable — Automation copies to comment)
    if (summary !== undefined) {
      await cu(`/task/${taskId}/field/${SUMMARY_FIELD_ID}`, "POST", { value: summary || "" });
      done.push("summary");
    }

    // 3. Designer field = lead designer
    if (leadAdd || leadRem) {
      await cu(`/task/${taskId}/field/${DESIGNER_FIELD_ID}`, "POST", {
        value: {
          add: leadAdd ? [Number(leadAdd)] : [],
          rem: leadRem ? [Number(leadRem)] : [],
        },
      });
      done.push("lead");
    }

    // 4. Due date — explicit manager action only
    if (dueDateMs) {
      await cu(`/task/${taskId}`, "PUT", { due_date: Number(dueDateMs), due_date_time: false });
      done.push("due_date");
    }

    // 5. Formal ClickUp assignees
    if (assigneeAdd || assigneeRem) {
      const rem = Array.isArray(assigneeRem) ? assigneeRem : assigneeRem ? [assigneeRem] : [];
      await cu(`/task/${taskId}`, "PUT", {
        assignees: {
          add: assigneeAdd ? [Number(assigneeAdd)] : [],
          rem: rem.map(Number),
        },
      });
      done.push("assignees");
    }

    return res.status(200).json({ success: true, updated: done, bookings: clean });
  } catch (err) {
    // Report partial progress so the frontend can reload state accurately
    return res.status(err.status || 500).json({ error: err.message, updated: done });
  }
}
