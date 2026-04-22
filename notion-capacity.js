// api/notion-capacity.js
// Vercel serverless function — proxies Notion capacity database queries

const NOTION_TOKEN       = process.env.NOTION_TOKEN;
const NOTION_CAPACITY_DB = "d213e8cdc91e4cc9a4b50ebc49fca1fb";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: "NOTION_TOKEN environment variable not set" });
  }

  const { weekStart, weekEnd } = req.query;
  if (!weekStart || !weekEnd) {
    return res.status(400).json({ error: "weekStart and weekEnd query params required (YYYY-MM-DD)" });
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_CAPACITY_DB}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter: {
            and: [
              { property: "Date", date: { on_or_after: weekStart } },
              { property: "Date", date: { on_or_before: weekEnd } },
            ],
          },
          sorts: [{ property: "Date", direction: "ascending" }],
          page_size: 100,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Notion error: ${text}` });
    }

    const data = await response.json();
    const rows = data.results.map(normaliseRow);
    return res.status(200).json({ rows });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function normaliseRow(page) {
  const p = page.properties;
  const getText   = prop => prop?.title?.[0]?.plain_text || prop?.rich_text?.[0]?.plain_text || "";
  const getDate   = prop => prop?.date?.start || null;
  const getSelect = prop => prop?.select?.name || null;
  const getNumber = prop => prop?.number ?? 0;

  return {
    designer:       getText(p["Designer"]),
    clickupUserId:  getText(p["ClickUp User ID"]),
    date:           getDate(p["Date"]),
    dayOfWeek:      getSelect(p["Day of Week"]),
    availableHours: getNumber(p["Available Hours"]),
    status:         getSelect(p["Status"]) || "Unavailable",
    notes:          getText(p["Notes"]),
  };
}
