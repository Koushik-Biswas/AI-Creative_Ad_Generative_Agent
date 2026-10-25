export type Platform = "linkedin" | "meta" | "google";
export type Source = { id: string; url: string; title: string; text: string };
export type Claim = { text: string; sourceId: string; quote: string };
export type Profile = {
  name: string;
  description: string;
  audience: string;
  industry: string;
  valueProps: string[];
  tone: string;
  colors: string[];
  claims: Claim[];
  confirmed: boolean;
};
export type Competitor = {
  id: string;
  name: string;
  url: string;
  type: "direct" | "indirect" | "aspirational";
  verified?: boolean;
};
export type Evidence = {
  id: string;
  competitor: string;
  platform: Platform;
  sourceUrl: string;
  headline: string;
  body: string;
  cta: string;
  visual: string;
  started: string;
  region: string;
  imageAsset?: string;
  importedAt: string;
};
export type Insight = {
  id: string;
  platform: Platform;
  pattern: string;
  whitespace: string;
  rationale: string;
  evidenceIds: string[];
};
export type Report = {
  generatedAt: string;
  summary: string;
  insights: Insight[];
  coverage: { platform: Platform; status: string; count: number }[];
};
export type Concept = {
  id: string;
  platform: Platform;
  title: string;
  angle: string;
  headline: string;
  body: string;
  cta: string;
  visual: string;
  rationale: string;
  insightIds: string[];
  claimIds: string[];
  approved: boolean;
};
export type CreativeVersion = {
  version: number;
  headline: string;
  body: string;
  cta: string;
  color: string;
  style: number;
  savedAt: string;
};
export type Creative = CreativeVersion & {
  id: string;
  conceptId: string;
  contextId?: string;
  platform: Platform;
  ratio: string;
  width: number;
  height: number;
  status: "review" | "approved" | "rejected";
  favorite: boolean;
  history: CreativeVersion[];
  createdAt: string;
};
export type ResearchContext = {
  id: string;
  capturedAt: string;
  profile: Profile;
  report: Report | null;
  concepts: Concept[];
  sources: Source[];
  evidence: Evidence[];
};
export type Asset = { id: string; name: string; mime: string; size: number };
export type Project = {
  id: string;
  revision: number;
  title: string;
  website: string;
  description: string;
  audience: string;
  goal: string;
  language: string;
  region: string;
  avoid: string;
  disclaimer: string;
  platforms: Platform[];
  ratios: string[];
  variations: number;
  profile: Profile | null;
  sources: Source[];
  competitors: Competitor[];
  competitorsConfirmed: boolean;
  evidence: Evidence[];
  report: Report | null;
  concepts: Concept[];
  creatives: Creative[];
  assets: Asset[];
  logoId: string;
  contexts: ResearchContext[];
  activities: { text: string; at: string }[];
  updatedAt: string;
};
export const PLATFORMS: Platform[] = ["linkedin", "meta", "google"];
export const LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  meta: "Meta",
  google: "Google",
};
export const FORMAT_SPECS: Record<
  string,
  { width: number; height: number; label: string }
> = {
  "1:1": { width: 1200, height: 1200, label: "Square" },
  "1.91:1": { width: 1200, height: 628, label: "Landscape" },
  "4:5": { width: 1440, height: 1800, label: "Portrait" },
  "9:16": { width: 1080, height: 1920, label: "Story" },
};
export function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function blankProject(input: Partial<Project>): Project {
  return {
    id: newId(),
    revision: 1,
    title: "Untitled campaign",
    website: "",
    description: "",
    audience: "",
    goal: "Demo bookings",
    language: "English",
    region: "Global",
    avoid: "",
    disclaimer: "",
    platforms: ["linkedin", "meta", "google"],
    ratios: ["1:1"],
    variations: 1,
    profile: null,
    sources: [],
    competitors: [],
    competitorsConfirmed: false,
    evidence: [],
    report: null,
    concepts: [],
    creatives: [],
    contexts: [],
    assets: [],
    logoId: "",
    activities: [],
    updatedAt: new Date().toISOString(),
    ...input,
  };
}
