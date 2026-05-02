import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  Clipboard,
  Download,
  FileText,
  Lightbulb,
  MapPin,
  Network,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

// cuddly potato
// AIなし・バックエンドなしのMVP版。
// 研究テーマ、史料、出来事、アクター、仮説、根拠リンク、APA方式の引用生成をlocalStorageに保存する。

const STORAGE_KEY = "cuddly-potato:v2";
const OLD_STORAGE_KEY = "cuddly-potato:v1";

type SourceType = "一次資料" | "二次文献" | "新聞" | "回想録" | "ウェブ" | "その他";
type CitationKind = "book" | "journal" | "chapter" | "webpage" | "newspaper" | "report" | "archival" | "other";
type Certainty = "確実" | "推定" | "要確認";
type EvidenceStrength = "強く支持" | "支持" | "中立" | "反証" | "要検討";

type Source = {
  id: string;
  title: string;
  author: string;
  date: string;
  type: SourceType;
  note: string;
  bias: string;
  citationKind?: CitationKind;
  year?: string;
  containerTitle?: string;
  publisher?: string;
  editors?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  reportNumber?: string;
  archiveName?: string;
  collectionName?: string;
  box?: string;
  folder?: string;
  mediumDescription?: string;
};

type Actor = {
  id: string;
  name: string;
  kind: string;
  position: string;
  note: string;
};

type Event = {
  id: string;
  date: string;
  title: string;
  summary: string;
  place: string;
  actorIds: string[];
  sourceIds: string[];
  tags: string[];
  certainty: Certainty;
  researchMeaning: string;
};

type Claim = {
  id: string;
  title: string;
  description: string;
  status: "仮説" | "検討中" | "暫定結論";
};

type Evidence = {
  id: string;
  claimId: string;
  sourceId: string;
  eventId: string;
  quote: string;
  interpretation: string;
  strength: EvidenceStrength;
};

type Project = {
  title: string;
  question: string;
  scope: string;
};

type AppData = {
  project: Project;
  sources: Source[];
  actors: Actor[];
  events: Event[];
  claims: Claim[];
  evidence: Evidence[];
};

const makeId = () => crypto.randomUUID();

const initialData: AppData = {
  project: {
    title: "国際関係史・政治史研究ノート",
    question: "どの出来事・史料・アクターが、どの仮説を支えるのか。",
    scope: "対象時期・地域・史料群をここに記録する。",
  },
  sources: [
    {
      id: makeId(),
      title: "会談記録サンプル",
      author: "作成者未確認",
      date: "1987-11",
      type: "一次資料",
      note: "史料の概要をここに記録する。",
      bias: "誰が、何のために作成した史料かを検討する。",
      citationKind: "archival",
      year: "1987",
      archiveName: "外務省外交史料館",
      collectionName: "南アフリカ関係資料",
      mediumDescription: "会談記録",
    },
  ],
  actors: [
    {
      id: makeId(),
      name: "日本外務省",
      kind: "国家機関",
      position: "対外政策を形成・調整する主体",
      note: "関連する政策判断、会談、記録を紐づける。",
    },
  ],
  events: [],
  claims: [
    {
      id: makeId(),
      title: "仮説A：国内政治分析としての判断",
      description: "ある判断が、対象国・地域の政治情勢を踏まえた妥当な分析だった可能性。",
      status: "仮説",
    },
    {
      id: makeId(),
      title: "仮説B：外交上便利な説明としての判断",
      description: "ある判断が、政策維持や対外説明のために利用された可能性。",
      status: "仮説",
    },
  ],
  evidence: [],
};

function normalizeData(data: AppData): AppData {
  return {
    project: data.project ?? initialData.project,
    sources: (data.sources ?? []).map((source) => ({
      citationKind: "other",
      year: extractYear(source.year || source.date),
      ...source,
    })),
    actors: data.actors ?? [],
    events: data.events ?? [],
    claims: data.claims ?? [],
    evidence: data.evidence ?? [],
  };
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
    if (!raw) return initialData;
    return normalizeData(JSON.parse(raw) as AppData);
  } catch {
    return initialData;
  }
}

function downloadJson(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cuddly-potato-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

function splitTags(value: string): string[] {
  return value
    .split(/[、,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function hasCjk(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
}

function ensurePeriod(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /[.!?。]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function extractYear(value?: string) {
  const match = String(value ?? "").match(/\b(\d{4})\b/);
  return match?.[1] ?? "";
}

function initials(givenNames: string) {
  return givenNames
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(" ");
}

function formatSingleAuthor(rawName: string) {
  const name = rawName.trim();
  if (!name) return "";
  if (hasCjk(name)) return name;
  if (name.includes(",")) {
    const [last, given] = name.split(",").map((part) => part.trim());
    return given ? `${last}, ${initials(given)}` : last;
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return `${last}, ${initials(given)}`;
}

function formatAuthors(authorField: string) {
  const authors = authorField
    .split(/;|\n|\s+and\s+/i)
    .map(formatSingleAuthor)
    .filter(Boolean);
  if (authors.length === 0) return "";
  if (authors.length === 1) return authors[0];
  if (authors.length <= 20) {
    return `${authors.slice(0, -1).join(", ")}, & ${authors[authors.length - 1]}`;
  }
  return `${authors.slice(0, 19).join(", ")}, ... ${authors[authors.length - 1]}`;
}

function formatEditors(editorsField?: string) {
  const editors = formatAuthors(editorsField ?? "");
  if (!editors) return "";
  return `In ${editors} (Ed${editors.includes("&") ? "s" : ""}.), `;
}

function formatParentheticalDate(source: Source, detailed = false) {
  const date = (source.date || source.year || "").trim();
  const year = (source.year || extractYear(date)).trim();
  if (!detailed) return `(${year || "n.d."}).`;

  const fullDate = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fullDate) {
    const [, y, m, d] = fullDate;
    const parsed = new Date(Number(y), Number(m) - 1, Number(d));
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(parsed);
    return `(${y}, ${month} ${Number(d)}).`;
  }

  const yearMonth = date.match(/^(\d{4})-(\d{2})$/);
  if (yearMonth) {
    const [, y, m] = yearMonth;
    const parsed = new Date(Number(y), Number(m) - 1, 1);
    const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(parsed);
    return `(${y}, ${month}).`;
  }

  return `(${year || "n.d."}).`;
}

function appendLocator(parts: string[], source: Source) {
  const locators = [
    source.collectionName,
    source.box ? `Box ${source.box}` : "",
    source.folder ? `Folder ${source.folder}` : "",
    source.archiveName,
  ].filter(Boolean);
  if (locators.length > 0) parts.push(ensurePeriod(locators.join(", ")));
}

function appendDoiOrUrl(parts: string[], source: Source) {
  const doi = (source.doi ?? "").trim();
  const url = (source.url ?? "").trim();
  if (doi) {
    parts.push(doi.startsWith("http") ? doi : `https://doi.org/${doi.replace(/^doi:\s*/i, "")}`);
  } else if (url) {
    parts.push(url);
  }
}

function generateApaCitation(source: Source) {
  const kind = source.citationKind ?? "other";
  const authors = formatAuthors(source.author);
  const authorPart = authors ? ensurePeriod(authors) : "";
  const title = source.title.trim() || "Untitled";
  const container = source.containerTitle?.trim() ?? "";
  const publisher = source.publisher?.trim() ?? "";
  const medium = source.mediumDescription?.trim();
  const titleWithMedium = medium ? `${title} [${medium}]` : title;
  const parts: string[] = [];

  if (authorPart) parts.push(authorPart);

  switch (kind) {
    case "book":
      parts.push(formatParentheticalDate(source));
      parts.push(ensurePeriod(titleWithMedium));
      if (publisher) parts.push(ensurePeriod(publisher));
      appendDoiOrUrl(parts, source);
      break;

    case "journal": {
      const volumeIssue = [source.volume, source.issue ? `(${source.issue})` : ""].filter(Boolean).join("");
      const journalBits = [container, volumeIssue, source.pages].filter(Boolean).join(", ");
      parts.push(formatParentheticalDate(source));
      parts.push(ensurePeriod(title));
      if (journalBits) parts.push(ensurePeriod(journalBits));
      appendDoiOrUrl(parts, source);
      break;
    }

    case "chapter":
      parts.push(formatParentheticalDate(source));
      parts.push(ensurePeriod(title));
      parts.push(ensurePeriod(`${formatEditors(source.editors)}${container}${source.pages ? ` (pp. ${source.pages})` : ""}`));
      if (publisher) parts.push(ensurePeriod(publisher));
      appendDoiOrUrl(parts, source);
      break;

    case "webpage":
      parts.push(formatParentheticalDate(source, true));
      parts.push(ensurePeriod(title));
      if (container) parts.push(ensurePeriod(container));
      appendDoiOrUrl(parts, source);
      break;

    case "newspaper":
      parts.push(formatParentheticalDate(source, true));
      parts.push(ensurePeriod(title));
      if (container) parts.push(ensurePeriod(container));
      appendDoiOrUrl(parts, source);
      break;

    case "report":
      parts.push(formatParentheticalDate(source));
      parts.push(ensurePeriod(`${title}${source.reportNumber ? ` (${source.reportNumber})` : ""}`));
      if (publisher) parts.push(ensurePeriod(publisher));
      appendDoiOrUrl(parts, source);
      break;

    case "archival":
      parts.push(formatParentheticalDate(source));
      parts.push(ensurePeriod(titleWithMedium));
      appendLocator(parts, source);
      appendDoiOrUrl(parts, source);
      break;

    default:
      parts.push(formatParentheticalDate(source));
      parts.push(ensurePeriod(titleWithMedium));
      if (container) parts.push(ensurePeriod(container));
      if (publisher) parts.push(ensurePeriod(publisher));
      appendDoiOrUrl(parts, source);
      break;
  }

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[1.75rem] border border-[#2f5f67]/60 bg-[#102a33]/90 p-4 shadow-[0_14px_40px_rgba(0,0,0,0.24)] ${className}`}>{children}</div>;
}

function SectionTitle({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl border border-[#d29748]/40 bg-[#d29748]/15 p-2 text-[#f1c57a]">{icon}</div>
      <div>
        <h2 className="text-xl font-semibold text-[#f0ede6]">{title}</h2>
        <p className="text-sm text-[#9fb7ba]">{desc}</p>
      </div>
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-2xl border border-[#2f5f67]/70 bg-[#0a1c25] px-3 py-2 text-sm text-[#f0ede6] outline-none placeholder:text-[#759095] focus:border-[#d29748] focus:ring-2 focus:ring-[#d29748]/30 ${props.className ?? ""}`} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`min-h-24 w-full rounded-2xl border border-[#2f5f67]/70 bg-[#0a1c25] px-3 py-2 text-sm text-[#f0ede6] outline-none placeholder:text-[#759095] focus:border-[#d29748] focus:ring-2 focus:ring-[#d29748]/30 ${props.className ?? ""}`} />;
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-2xl border border-[#2f5f67]/70 bg-[#0a1c25] px-3 py-2 text-sm text-[#f0ede6] outline-none focus:border-[#d29748] focus:ring-2 focus:ring-[#d29748]/30 ${props.className ?? ""}`} />;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-[#2f5f67]/70 bg-[#0a1c25]/80 px-2.5 py-1 text-xs text-[#c9d6d3]">{children}</span>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1c57a]">{children}</label>;
}

function PrimaryButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl border border-[#f1c57a]/50 bg-[#d29748] px-3 py-2 text-sm font-semibold text-[#0a1c25] shadow-[0_8px_0_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:bg-[#f1c57a] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-2xl border border-[#2f5f67] bg-[#0a1c25]/70 px-3 py-2 text-sm text-[#f0ede6] transition hover:border-[#d29748] hover:text-[#f1c57a]">
      {children}
    </button>
  );
}

export default function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [tab, setTab] = useState<"dashboard" | "events" | "sources" | "actors" | "claims" | "evidence">("dashboard");
  const [query, setQuery] = useState("");
  const [copiedSourceId, setCopiedSourceId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const sourceById = useMemo(() => new Map(data.sources.map((s) => [s.id, s])), [data.sources]);
  const actorById = useMemo(() => new Map(data.actors.map((a) => [a.id, a])), [data.actors]);
  const claimById = useMemo(() => new Map(data.claims.map((c) => [c.id, c])), [data.claims]);
  const eventById = useMemo(() => new Map(data.events.map((e) => [e.id, e])), [data.events]);

  const filteredEvents = data.events
    .filter((event) => {
      const text = [event.date, event.title, event.summary, event.place, event.tags.join(" "), event.researchMeaning]
        .join(" ")
        .toLowerCase();
      return text.includes(query.toLowerCase());
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  function updateProject(field: keyof Project, value: string) {
    setData((prev) => ({ ...prev, project: { ...prev.project, [field]: value } }));
  }

  function addSource() {
    const source: Source = {
      id: makeId(),
      title: "新しい史料",
      author: "",
      date: "",
      type: "一次資料",
      note: "",
      bias: "",
      citationKind: "other",
      year: "",
      containerTitle: "",
      publisher: "",
      editors: "",
      volume: "",
      issue: "",
      pages: "",
      doi: "",
      url: "",
      reportNumber: "",
      archiveName: "",
      collectionName: "",
      box: "",
      folder: "",
      mediumDescription: "",
    };
    setData((prev) => ({ ...prev, sources: [source, ...prev.sources] }));
  }

  function updateSource(id: string, patch: Partial<Source>) {
    setData((prev) => ({ ...prev, sources: prev.sources.map((source) => (source.id === id ? { ...source, ...patch } : source)) }));
  }

  function deleteSource(id: string) {
    setData((prev) => ({
      ...prev,
      sources: prev.sources.filter((source) => source.id !== id),
      events: prev.events.map((event) => ({ ...event, sourceIds: event.sourceIds.filter((sourceId) => sourceId !== id) })),
      evidence: prev.evidence.filter((item) => item.sourceId !== id),
    }));
  }

  function copyApa(source: Source) {
    const citation = generateApaCitation(source);
    navigator.clipboard.writeText(citation);
    setCopiedSourceId(source.id);
    window.setTimeout(() => setCopiedSourceId(null), 1400);
  }

  function addActor() {
    const actor: Actor = { id: makeId(), name: "新しいアクター", kind: "", position: "", note: "" };
    setData((prev) => ({ ...prev, actors: [actor, ...prev.actors] }));
  }

  function updateActor(id: string, patch: Partial<Actor>) {
    setData((prev) => ({ ...prev, actors: prev.actors.map((actor) => (actor.id === id ? { ...actor, ...patch } : actor)) }));
  }

  function deleteActor(id: string) {
    setData((prev) => ({
      ...prev,
      actors: prev.actors.filter((actor) => actor.id !== id),
      events: prev.events.map((event) => ({ ...event, actorIds: event.actorIds.filter((actorId) => actorId !== id) })),
    }));
  }

  function addEvent() {
    const event: Event = {
      id: makeId(),
      date: "",
      title: "新しい出来事",
      summary: "",
      place: "",
      actorIds: [],
      sourceIds: [],
      tags: [],
      certainty: "要確認",
      researchMeaning: "",
    };
    setData((prev) => ({ ...prev, events: [event, ...prev.events] }));
  }

  function updateEvent(id: string, patch: Partial<Event>) {
    setData((prev) => ({ ...prev, events: prev.events.map((event) => (event.id === id ? { ...event, ...patch } : event)) }));
  }

  function deleteEvent(id: string) {
    setData((prev) => ({
      ...prev,
      events: prev.events.filter((event) => event.id !== id),
      evidence: prev.evidence.filter((item) => item.eventId !== id),
    }));
  }

  function addClaim() {
    const claim: Claim = { id: makeId(), title: "新しい仮説", description: "", status: "仮説" };
    setData((prev) => ({ ...prev, claims: [claim, ...prev.claims] }));
  }

  function updateClaim(id: string, patch: Partial<Claim>) {
    setData((prev) => ({ ...prev, claims: prev.claims.map((claim) => (claim.id === id ? { ...claim, ...patch } : claim)) }));
  }

  function deleteClaim(id: string) {
    setData((prev) => ({
      ...prev,
      claims: prev.claims.filter((claim) => claim.id !== id),
      evidence: prev.evidence.filter((item) => item.claimId !== id),
    }));
  }

  function addEvidence() {
    if (!data.claims[0] || !data.sources[0] || !data.events[0]) return;
    const item: Evidence = {
      id: makeId(),
      claimId: data.claims[0].id,
      sourceId: data.sources[0].id,
      eventId: data.events[0].id,
      quote: "",
      interpretation: "",
      strength: "要検討",
    };
    setData((prev) => ({ ...prev, evidence: [item, ...prev.evidence] }));
  }

  function updateEvidence(id: string, patch: Partial<Evidence>) {
    setData((prev) => ({ ...prev, evidence: prev.evidence.map((item) => (item.id === id ? { ...item, ...patch } : item)) }));
  }

  function deleteEvidence(id: string) {
    setData((prev) => ({ ...prev, evidence: prev.evidence.filter((item) => item.id !== id) }));
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData;
        setData(normalizeData(parsed));
      } catch {
        alert("JSONを読み込めませんでした。");
      }
    };
    reader.readAsText(file);
  }

  const tabs = [
    { id: "dashboard", label: "概要", icon: <BookOpen size={16} /> },
    { id: "events", label: "年表", icon: <CalendarDays size={16} /> },
    { id: "sources", label: "史料・引用", icon: <FileText size={16} /> },
    { id: "actors", label: "アクター", icon: <Users size={16} /> },
    { id: "claims", label: "仮説", icon: <Lightbulb size={16} /> },
    { id: "evidence", label: "根拠リンク", icon: <Network size={16} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0a1c25] text-[#f0ede6]">
      <div className="pointer-events-none fixed inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 10%, rgba(210,151,72,0.18), transparent 30%), radial-gradient(circle at 80% 0%, rgba(47,95,103,0.4), transparent 34%), linear-gradient(rgba(240,237,230,0.03) 1px, transparent 1px)", backgroundSize: "auto, auto, 100% 24px" }} />

      <header className="relative border-b border-[#2f5f67]/70 bg-[#07161d]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#d29748]/40 bg-[#d29748]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#f1c57a]">
              <Sparkles size={14} /> local-first / no AI
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#f0ede6]">cuddly potato</h1>
            <p className="text-sm text-[#9fb7ba]">史料・年表・アクター・仮説・APA引用を、夜の研究室みたいなレトロ端末で整理する。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={() => downloadJson(data)}><Download size={16} /> JSON出力</GhostButton>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#2f5f67] bg-[#0a1c25]/70 px-3 py-2 text-sm text-[#f0ede6] transition hover:border-[#d29748] hover:text-[#f1c57a]">
              <Upload size={16} /> JSON読込
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-7xl gap-4 px-4 py-5 md:grid-cols-[230px_1fr]">
        <aside className="space-y-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition ${tab === item.id ? "border-[#d29748] bg-[#d29748] text-[#0a1c25] shadow-[0_8px_0_rgba(0,0,0,0.20)]" : "border-[#2f5f67]/70 bg-[#102a33]/80 text-[#c9d6d3] hover:border-[#d29748] hover:text-[#f1c57a]"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </aside>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
          {tab === "dashboard" && (
            <>
              <SectionTitle icon={<BookOpen size={20} />} title="研究概要" desc="研究テーマ、問い、対象範囲を最初に固定する。" />
              <Card>
                <div className="grid gap-3">
                  <FieldLabel>研究タイトル</FieldLabel>
                  <TextInput value={data.project.title} onChange={(e) => updateProject("title", e.target.value)} />
                  <FieldLabel>研究問い</FieldLabel>
                  <TextArea value={data.project.question} onChange={(e) => updateProject("question", e.target.value)} />
                  <FieldLabel>対象時期・地域・史料群</FieldLabel>
                  <TextArea value={data.project.scope} onChange={(e) => updateProject("scope", e.target.value)} />
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-4">
                <Card><p className="text-sm text-[#9fb7ba]">出来事</p><p className="mt-2 text-4xl font-black text-[#f1c57a]">{data.events.length}</p></Card>
                <Card><p className="text-sm text-[#9fb7ba]">史料</p><p className="mt-2 text-4xl font-black text-[#f1c57a]">{data.sources.length}</p></Card>
                <Card><p className="text-sm text-[#9fb7ba]">アクター</p><p className="mt-2 text-4xl font-black text-[#f1c57a]">{data.actors.length}</p></Card>
                <Card><p className="text-sm text-[#9fb7ba]">根拠リンク</p><p className="mt-2 text-4xl font-black text-[#f1c57a]">{data.evidence.length}</p></Card>
              </div>

              <Card>
                <h3 className="mb-3 font-semibold text-[#f0ede6]">最近の年表</h3>
                <div className="space-y-3">
                  {filteredEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="rounded-2xl border border-[#2f5f67]/70 bg-[#0a1c25]/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{event.date || "日付未入力"}</Badge>
                        <strong>{event.title}</strong>
                        <Badge>{event.certainty}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-[#c9d6d3]">{event.summary}</p>
                    </div>
                  ))}
                  {data.events.length === 0 && <p className="text-sm text-[#9fb7ba]">まだ出来事がありません。年表タブから追加できます。</p>}
                </div>
              </Card>
            </>
          )}

          {tab === "events" && (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <SectionTitle icon={<CalendarDays size={20} />} title="年表" desc="出来事を、日付・場所・アクター・史料・研究上の意味と結びつける。" />
                <PrimaryButton onClick={addEvent}><Plus size={16} /> 出来事を追加</PrimaryButton>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-[#759095]" size={16} />
                <TextInput className="pl-9" placeholder="年表を検索" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <Card key={event.id}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="grid flex-1 gap-2 md:grid-cols-[160px_1fr]">
                        <TextInput placeholder="YYYY-MM-DD / YYYY-MM / 1980年代" value={event.date} onChange={(e) => updateEvent(event.id, { date: e.target.value })} />
                        <TextInput placeholder="出来事名" value={event.title} onChange={(e) => updateEvent(event.id, { title: e.target.value })} />
                      </div>
                      <button onClick={() => deleteEvent(event.id)} className="rounded-2xl p-2 text-[#759095] hover:bg-[#0a1c25] hover:text-red-300"><Trash2 size={17} /></button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel>概要</FieldLabel>
                        <TextArea value={event.summary} onChange={(e) => updateEvent(event.id, { summary: e.target.value })} />
                        <FieldLabel>研究上の意味</FieldLabel>
                        <TextArea value={event.researchMeaning} onChange={(e) => updateEvent(event.id, { researchMeaning: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>場所</FieldLabel>
                        <TextInput value={event.place} onChange={(e) => updateEvent(event.id, { place: e.target.value })} placeholder="東京、プレトリア、ルサカなど" />
                        <FieldLabel>確実度</FieldLabel>
                        <Select value={event.certainty} onChange={(e) => updateEvent(event.id, { certainty: e.target.value as Certainty })}>
                          <option>確実</option><option>推定</option><option>要確認</option>
                        </Select>
                        <FieldLabel>タグ</FieldLabel>
                        <TextInput value={event.tags.join("、")} onChange={(e) => updateEvent(event.id, { tags: splitTags(e.target.value) })} placeholder="外交、選挙、制裁" />
                        <FieldLabel>関連アクター</FieldLabel>
                        <select multiple value={event.actorIds} onChange={(e) => updateEvent(event.id, { actorIds: Array.from(e.target.selectedOptions).map((o) => o.value) })} className="h-28 w-full rounded-2xl border border-[#2f5f67]/70 bg-[#0a1c25] px-3 py-2 text-sm text-[#f0ede6]">
                          {data.actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}</option>)}
                        </select>
                        <FieldLabel>関連史料</FieldLabel>
                        <select multiple value={event.sourceIds} onChange={(e) => updateEvent(event.id, { sourceIds: Array.from(e.target.selectedOptions).map((o) => o.value) })} className="h-28 w-full rounded-2xl border border-[#2f5f67]/70 bg-[#0a1c25] px-3 py-2 text-sm text-[#f0ede6]">
                          {data.sources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#c9d6d3]">
                      {event.place && <Badge><MapPin size={12} /> {event.place}</Badge>}
                      {event.actorIds.map((id) => actorById.get(id)?.name).filter(Boolean).map((name) => <Badge key={name}>{name}</Badge>)}
                      {event.sourceIds.map((id) => sourceById.get(id)?.title).filter(Boolean).map((title) => <Badge key={title}>{title}</Badge>)}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {tab === "sources" && (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <SectionTitle icon={<FileText size={20} />} title="史料カード・APA引用" desc="入力値だけでAPA方式の文献表記を生成する。最終提出前には各大学・学会の規定に合わせて確認する。" />
                <PrimaryButton onClick={addSource}><Plus size={16} /> 史料を追加</PrimaryButton>
              </div>
              <div className="grid gap-4">
                {data.sources.map((source) => {
                  const apa = generateApaCitation(source);
                  return (
                    <Card key={source.id}>
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <TextInput value={source.title} onChange={(e) => updateSource(source.id, { title: e.target.value })} placeholder="タイトル" />
                          <p className="mt-2 text-xs text-[#9fb7ba]">著者は semicolon 区切りで複数入力できます。例：Smith, John; Brown, Mary</p>
                        </div>
                        <button onClick={() => deleteSource(source.id)} className="rounded-2xl p-2 text-[#759095] hover:bg-[#0a1c25] hover:text-red-300"><Trash2 size={17} /></button>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-3">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div><FieldLabel>史料種別</FieldLabel><Select value={source.type} onChange={(e) => updateSource(source.id, { type: e.target.value as SourceType })}><option>一次資料</option><option>二次文献</option><option>新聞</option><option>回想録</option><option>ウェブ</option><option>その他</option></Select></div>
                            <div><FieldLabel>引用タイプ</FieldLabel><Select value={source.citationKind ?? "other"} onChange={(e) => updateSource(source.id, { citationKind: e.target.value as CitationKind })}><option value="book">書籍</option><option value="journal">雑誌論文</option><option value="chapter">分担執筆</option><option value="webpage">Webページ</option><option value="newspaper">新聞記事</option><option value="report">報告書</option><option value="archival">アーカイブ史料</option><option value="other">その他</option></Select></div>
                            <div><FieldLabel>年</FieldLabel><TextInput value={source.year ?? ""} onChange={(e) => updateSource(source.id, { year: e.target.value })} placeholder="1987" /></div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div><FieldLabel>著者・作成者</FieldLabel><TextInput value={source.author} onChange={(e) => updateSource(source.id, { author: e.target.value })} placeholder="Smith, John; 外務省" /></div>
                            <div><FieldLabel>日付</FieldLabel><TextInput value={source.date} onChange={(e) => updateSource(source.id, { date: e.target.value, year: source.year || extractYear(e.target.value) })} placeholder="YYYY-MM-DD / YYYY-MM / YYYY" /></div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div><FieldLabel>掲載誌・サイト・書名・新聞名</FieldLabel><TextInput value={source.containerTitle ?? ""} onChange={(e) => updateSource(source.id, { containerTitle: e.target.value })} placeholder="Journal / Website / Book title" /></div>
                            <div><FieldLabel>出版社・発行機関</FieldLabel><TextInput value={source.publisher ?? ""} onChange={(e) => updateSource(source.id, { publisher: e.target.value })} /></div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-4">
                            <div><FieldLabel>巻</FieldLabel><TextInput value={source.volume ?? ""} onChange={(e) => updateSource(source.id, { volume: e.target.value })} /></div>
                            <div><FieldLabel>号</FieldLabel><TextInput value={source.issue ?? ""} onChange={(e) => updateSource(source.id, { issue: e.target.value })} /></div>
                            <div><FieldLabel>ページ</FieldLabel><TextInput value={source.pages ?? ""} onChange={(e) => updateSource(source.id, { pages: e.target.value })} placeholder="12-31" /></div>
                            <div><FieldLabel>報告書番号</FieldLabel><TextInput value={source.reportNumber ?? ""} onChange={(e) => updateSource(source.id, { reportNumber: e.target.value })} /></div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div><FieldLabel>DOI</FieldLabel><TextInput value={source.doi ?? ""} onChange={(e) => updateSource(source.id, { doi: e.target.value })} placeholder="10.xxxx/xxxxx" /></div>
                            <div><FieldLabel>URL</FieldLabel><TextInput value={source.url ?? ""} onChange={(e) => updateSource(source.id, { url: e.target.value })} /></div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div><FieldLabel>編者</FieldLabel><TextInput value={source.editors ?? ""} onChange={(e) => updateSource(source.id, { editors: e.target.value })} placeholder="分担執筆の場合" /></div>
                            <div><FieldLabel>媒体説明</FieldLabel><TextInput value={source.mediumDescription ?? ""} onChange={(e) => updateSource(source.id, { mediumDescription: e.target.value })} placeholder="会談記録、書簡、写真など" /></div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-4">
                            <div><FieldLabel>所蔵機関</FieldLabel><TextInput value={source.archiveName ?? ""} onChange={(e) => updateSource(source.id, { archiveName: e.target.value })} /></div>
                            <div><FieldLabel>コレクション</FieldLabel><TextInput value={source.collectionName ?? ""} onChange={(e) => updateSource(source.id, { collectionName: e.target.value })} /></div>
                            <div><FieldLabel>Box</FieldLabel><TextInput value={source.box ?? ""} onChange={(e) => updateSource(source.id, { box: e.target.value })} /></div>
                            <div><FieldLabel>Folder</FieldLabel><TextInput value={source.folder ?? ""} onChange={(e) => updateSource(source.id, { folder: e.target.value })} /></div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div><FieldLabel>概要・使える論点</FieldLabel><TextArea value={source.note} onChange={(e) => updateSource(source.id, { note: e.target.value })} /></div>
                            <div><FieldLabel>史料批判</FieldLabel><TextArea value={source.bias} onChange={(e) => updateSource(source.id, { bias: e.target.value })} placeholder="立場・作成目的・沈黙している情報" /></div>
                          </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-[#d29748]/40 bg-[#07161d]/80 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1c57a]">APA citation</p>
                              <p className="text-xs text-[#9fb7ba]">生成結果</p>
                            </div>
                            <GhostButton onClick={() => copyApa(source)}><Clipboard size={15} /> {copiedSourceId === source.id ? "コピー済み" : "コピー"}</GhostButton>
                          </div>
                          <p className="whitespace-pre-wrap rounded-2xl border border-[#2f5f67]/60 bg-[#0a1c25] p-4 font-serif text-sm leading-7 text-[#f0ede6]">{apa}</p>
                          <div className="mt-3 space-y-1 text-xs text-[#9fb7ba]">
                            <p>・英語名は「Last, First」または「First Last」で入力できます。</p>
                            <p>・日本語名・組織名は入力した形を保ちます。</p>
                            <p>・史料館資料は所蔵機関・コレクション・Box・Folderを末尾に出します。</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {tab === "actors" && (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <SectionTitle icon={<Users size={20} />} title="アクター" desc="国家、政党、官僚、運動組織、企業などを同じ土台で管理する。" />
                <PrimaryButton onClick={addActor}><Plus size={16} /> アクターを追加</PrimaryButton>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {data.actors.map((actor) => (
                  <Card key={actor.id}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <TextInput value={actor.name} onChange={(e) => updateActor(actor.id, { name: e.target.value })} />
                      <button onClick={() => deleteActor(actor.id)} className="rounded-2xl p-2 text-[#759095] hover:bg-[#0a1c25] hover:text-red-300"><Trash2 size={17} /></button>
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel>種類</FieldLabel>
                      <TextInput placeholder="国家、政党、官僚、運動組織など" value={actor.kind} onChange={(e) => updateActor(actor.id, { kind: e.target.value })} />
                      <FieldLabel>立場・利害・政策上の位置</FieldLabel>
                      <TextArea value={actor.position} onChange={(e) => updateActor(actor.id, { position: e.target.value })} />
                      <FieldLabel>補足メモ</FieldLabel>
                      <TextArea value={actor.note} onChange={(e) => updateActor(actor.id, { note: e.target.value })} />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {tab === "claims" && (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <SectionTitle icon={<Lightbulb size={20} />} title="仮説・主張" desc="結論を急がず、複数の説明可能性を並べて管理する。" />
                <PrimaryButton onClick={addClaim}><Plus size={16} /> 仮説を追加</PrimaryButton>
              </div>
              <div className="space-y-4">
                {data.claims.map((claim) => (
                  <Card key={claim.id}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <TextInput value={claim.title} onChange={(e) => updateClaim(claim.id, { title: e.target.value })} />
                      <button onClick={() => deleteClaim(claim.id)} className="rounded-2xl p-2 text-[#759095] hover:bg-[#0a1c25] hover:text-red-300"><Trash2 size={17} /></button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[180px_1fr]">
                      <Select value={claim.status} onChange={(e) => updateClaim(claim.id, { status: e.target.value as Claim["status"] })}>
                        <option>仮説</option><option>検討中</option><option>暫定結論</option>
                      </Select>
                      <TextArea value={claim.description} onChange={(e) => updateClaim(claim.id, { description: e.target.value })} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {data.evidence.filter((item) => item.claimId === claim.id).map((item) => <Badge key={item.id}>{item.strength}</Badge>)}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {tab === "evidence" && (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <SectionTitle icon={<Network size={20} />} title="根拠リンク" desc="史料の記述が、どの出来事を通じて、どの仮説をどう支えるかを記録する。" />
                <PrimaryButton disabled={!data.claims[0] || !data.sources[0] || !data.events[0]} onClick={addEvidence}><Plus size={16} /> 根拠を追加</PrimaryButton>
              </div>
              {(!data.claims[0] || !data.sources[0] || !data.events[0]) && (
                <Card>
                  <p className="text-sm text-[#c9d6d3]">根拠リンクを作るには、仮説・史料・出来事がそれぞれ1件以上必要です。</p>
                </Card>
              )}
              <div className="space-y-4">
                {data.evidence.map((item) => (
                  <Card key={item.id}>
                    <div className="mb-3 flex justify-end">
                      <button onClick={() => deleteEvidence(item.id)} className="rounded-2xl p-2 text-[#759095] hover:bg-[#0a1c25] hover:text-red-300"><Trash2 size={17} /></button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel>仮説</FieldLabel>
                        <Select value={item.claimId} onChange={(e) => updateEvidence(item.id, { claimId: e.target.value })}>
                          {data.claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.title}</option>)}
                        </Select>
                        <FieldLabel>史料</FieldLabel>
                        <Select value={item.sourceId} onChange={(e) => updateEvidence(item.id, { sourceId: e.target.value })}>
                          {data.sources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}
                        </Select>
                        <FieldLabel>出来事</FieldLabel>
                        <Select value={item.eventId} onChange={(e) => updateEvidence(item.id, { eventId: e.target.value })}>
                          {data.events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                        </Select>
                        <FieldLabel>証拠の向き</FieldLabel>
                        <Select value={item.strength} onChange={(e) => updateEvidence(item.id, { strength: e.target.value as EvidenceStrength })}>
                          <option>強く支持</option><option>支持</option><option>中立</option><option>反証</option><option>要検討</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>引用・要旨</FieldLabel>
                        <TextArea value={item.quote} onChange={(e) => updateEvidence(item.id, { quote: e.target.value })} />
                        <FieldLabel>解釈</FieldLabel>
                        <TextArea value={item.interpretation} onChange={(e) => updateEvidence(item.id, { interpretation: e.target.value })} />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge>{claimById.get(item.claimId)?.title ?? "仮説不明"}</Badge>
                      <Badge>{sourceById.get(item.sourceId)?.title ?? "史料不明"}</Badge>
                      <Badge>{eventById.get(item.eventId)?.title ?? "出来事不明"}</Badge>
                      <Badge>{item.strength}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </motion.section>
      </main>
    </div>
  );
}
