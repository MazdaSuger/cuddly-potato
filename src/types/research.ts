export type SourceType = "一次資料" | "二次文献" | "新聞" | "回想録" | "ウェブ" | "その他";

export type CitationKind =
  | "book"
  | "journal"
  | "chapter"
  | "webpage"
  | "newspaper"
  | "report"
  | "archival"
  | "other";

export type ClaimStatus = "仮説" | "検討中" | "暫定結論";
export type EvidenceStrength = "強く支持" | "支持" | "中立" | "反証" | "要検討";

export type Source = {
  id: string;
  title: string;
  author: string;
  date: string;
  type: SourceType;
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
  note: string;
  bias: string;
  tags?: string[];
};

export type Actor = {
  id: string;
  name: string;
  kind: string;
  position: string;
  note: string;
};

export type Event = {
  id: string;
  date: string;
  title: string;
  summary: string;
  place: string;
  actorIds: string[];
  sourceIds: string[];
  tags: string[];
  certainty: "確実" | "推定" | "要確認";
  researchMeaning: string;
};

export type Claim = {
  id: string;
  title: string;
  description: string;
  status: ClaimStatus;
};

export type Evidence = {
  id: string;
  claimId: string;
  sourceId: string;
  eventId: string;
  quote: string;
  interpretation: string;
  strength: EvidenceStrength;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  sources: Source[];
  actors: Actor[];
  events: Event[];
  claims: Claim[];
  evidence: Evidence[];
  updatedAt: string;
};
