// api/notion-skills.js
// Vercel serverless function — proxies Notion skills database queries

const NOTION_TOKEN    = process.env.NOTION_TOKEN;
const NOTION_SKILLS_DB = "7508c810be1b40e08483a7158cf27eb8";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!NOTION_TOKEN) {
    return res.status(500).json({ error: "NOTION_TOKEN environment variable not set" });
  }

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_SKILLS_DB}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          filter: { property: "Active", checkbox: { equals: true } },
          page_size: 100,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Notion error: ${text}` });
    }

    const data = await response.json();
    const designers = data.results.map(normaliseRow);
    return res.status(200).json({ designers });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function normaliseRow(page) {
  const p = page.properties;
  const getText   = prop => prop?.title?.[0]?.plain_text || prop?.rich_text?.[0]?.plain_text || "";
  const getSelect = prop => prop?.select?.name || null;
  const getMulti  = prop => prop?.multi_select?.map(o => o.name) || [];

  return {
    designer:      getText(p["Designer"]),
    clickupUserId: getText(p["ClickUp User ID"]),
    role:          getSelect(p["Role"]),
    skills:        getMulti(p["Skills"]),
    skillNotes:    getText(p["Skill Notes"]),
    notSuitedFor:  getText(p["Not Suited For"]),
    active:        p["Active"]?.checkbox ?? true,
  };
}
