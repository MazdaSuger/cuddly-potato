import type { Actor, Claim, Event, Evidence, Project, Source } from "../types/research";
import { buildApaLikeCitation } from "./citation";

type ExportFile = { path: string; content: string };

const slug = (value: string): string =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ");

const yaml = (rows: Array<[string, string | number | string[] | undefined]>): string => {
  const body = rows
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length === 0) return `${k}: []`;
        return `${k}:\n${v.map((item) => `  - ${item}`).join("\n")}`;
      }
      return `${k}: ${String(v)}`;
    })
    .join("\n");
  return `---\n${body}\n---`;
};

const link = (name: string) => `[[${name}]]`;

function sourceMd(source: Source): string {
  return [
    yaml([
      ["type", "source"],
      ["source_type", source.type],
      ["year", source.year],
      ["author", source.author || "作成者未確認"],
      ["tags", ["source", "cuddly-potato", ...(source.tags ?? [])]],
    ]),
    `# ${source.title}`,
    "",
    `- APA: ${buildApaLikeCitation(source)}`,
    source.note ? `- Note: ${source.note}` : "",
    source.bias ? `- Bias: ${source.bias}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const actorMd = (actor: Actor): string =>
  [yaml([["type", "actor"], ["tags", ["actor", "cuddly-potato"]]]), `# ${actor.name}`, "", actor.note].join("\n");

const eventMd = (event: Event, actors: Actor[], sources: Source[]): string => {
  const actorLinks = event.actorIds
    .map((id) => actors.find((a) => a.id === id)?.name)
    .filter(Boolean)
    .map((n) => link(n as string));
  const sourceLinks = event.sourceIds
    .map((id) => sources.find((s) => s.id === id)?.title)
    .filter(Boolean)
    .map((t) => link(t as string));
  return [
    yaml([["type", "event"], ["date", event.date], ["certainty", event.certainty], ["tags", ["event", "cuddly-potato", ...event.tags]]]),
    `# ${event.title}`,
    "",
    `- Place: ${event.place}`,
    `- Actors: ${actorLinks.join(", ") || "なし"}`,
    `- Sources: ${sourceLinks.join(", ") || "なし"}`,
    "",
    event.summary,
    "",
    `## Research Meaning\n${event.researchMeaning}`,
  ].join("\n");
};

const claimMd = (claim: Claim): string =>
  [yaml([["type", "claim"], ["status", claim.status], ["tags", ["claim", "cuddly-potato"]]]), `# ${claim.title}`, "", claim.description].join("\n");

const evidenceMd = (e: Evidence, claims: Claim[], events: Event[], sources: Source[]): string => {
  const claim = claims.find((c) => c.id === e.claimId);
  const event = events.find((ev) => ev.id === e.eventId);
  const source = sources.find((s) => s.id === e.sourceId);
  return [
    yaml([["type", "evidence"], ["strength", e.strength], ["tags", ["evidence", "cuddly-potato"]]]),
    `# Evidence ${e.id}`,
    "",
    `- Claim: ${claim ? link(claim.title) : "未設定"}`,
    `- Event: ${event ? link(event.title) : "未設定"}`,
    `- Source: ${source ? link(source.title) : "未設定"}`,
    "",
    `> ${e.quote}`,
    "",
    e.interpretation,
  ].join("\n");
};

export function exportProjectToObsidianFiles(project: Project): ExportFile[] {
  const files: ExportFile[] = [];

  for (const s of project.sources) files.push({ path: `Sources/${slug(s.title)}.md`, content: sourceMd(s) });
  for (const a of project.actors) files.push({ path: `Actors/${slug(a.name)}.md`, content: actorMd(a) });
  for (const e of project.events) files.push({ path: `Events/${slug(e.title)}.md`, content: eventMd(e, project.actors, project.sources) });
  for (const c of project.claims) files.push({ path: `Claims/${slug(c.title)}.md`, content: claimMd(c) });
  for (const ev of project.evidence)
    files.push({ path: `Evidence/evidence-${ev.id}.md`, content: evidenceMd(ev, project.claims, project.events, project.sources) });

  files.push({
    path: "Index.md",
    content: [
      "# Research Index",
      "",
      "## Sources",
      ...project.sources.map((s) => `- ${link(s.title)}`),
      "",
      "## Actors",
      ...project.actors.map((a) => `- ${link(a.name)}`),
      "",
      "## Events",
      ...project.events.map((e) => `- ${link(e.title)}`),
      "",
      "## Claims",
      ...project.claims.map((c) => `- ${link(c.title)}`),
    ].join("\n"),
  });

  return files;
}
