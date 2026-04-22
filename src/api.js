// ─────────────────────────────────────────────────────────────
// ZOODESIGN Studio Board — API Layer
// All calls go to Vercel serverless proxy functions (/api/*)
// Tokens live in Vercel environment variables — never in browser.
// ─────────────────────────────────────────────────────────────

export const API_READY = true;

// ─── CLICKUP ─────────────────────────────────────────────────

export async function fetchClickUpTasks() {
  const res = await fetch("/api/clickup-tasks");
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Tasks fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function assignTaskInClickUp(taskId, clickupUserId, dueDateMs) {
  const res = await fetch("/api/clickup-assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, clickupUserId, dueDateMs, action: "assign" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Assign failed: ${res.status}`);
  }
  return res.json();
}

export async function unassignTaskInClickUp(taskId, clickupUserId) {
  const res = await fetch("/api/clickup-assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, clickupUserId, action: "unassign" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Unassign failed: ${res.status}`);
  }
  return res.json();
}

export async function reassignTaskInClickUp(taskId, fromUserId, toUserId, dueDateMs) {
  const res = await fetch("/api/clickup-assign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, clickupUserId: toUserId, fromUserId, dueDateMs, action: "reassign" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Reassign failed: ${res.status}`);
  }
  return res.json();
}

// ─── NOTION ──────────────────────────────────────────────────

export async function fetchNotionCapacity(weekStart, weekEnd) {
  const res = await fetch(`/api/notion-capacity?weekStart=${weekStart}&weekEnd=${weekEnd}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Capacity fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.rows;
}

export async function fetchNotionSkills() {
  const res = await fetch("/api/notion-skills");
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Skills fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return data.designers;
}
