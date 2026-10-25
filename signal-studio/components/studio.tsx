"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Folders,
  Globe,
  HelpCircle,
  Images,
  Info,
  Layers,
  LayoutDashboard,
  Link2,
  Loader2,
  Menu,
  Palette,
  Plus,
  RefreshCw,
  ScanEye,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TriangleAlert,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { getDemo } from "@/lib/demo";
import {
  newId,
  blankProject,
  FORMAT_SPECS,
  LABELS,
  PLATFORMS,
  type Project,
  type Platform,
  type Profile,
  type Creative,
  type Evidence,
  type Concept,
} from "@/lib/types";
import {
  checks,
  creativeSvg,
  download,
  filename,
  raster,
  reportHtml,
  zip,
} from "@/lib/creative";

type Nav =
  | "Overview"
  | "Campaigns"
  | "Creative library"
  | "Competitor intelligence"
  | "Brand kit"
  | "Settings";
type Capabilities = {
  llm: boolean;
  model: string;
  adCollection: boolean;
  renderer: string;
  runtime: string;
};
const STEPS = [
  "Business profile",
  "Competitors",
  "Insights",
  "Creative brief",
  "Creatives",
  "Export",
];
const ICONS = [Globe, ScanEye, Activity, FileText, Images, Download];
const fmt = (date: string) =>
  new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" });
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server did not return a valid response. Please refresh and retry.",
    );
  }
  if (!response.ok)
    throw new Error(
      (data.error || "Request failed") +
        (data.details ? " " + data.details.join(" · ") : ""),
    );
  return data;
}
function PlatformMark({ platform }: { platform: Platform }) {
  return (
    <span className={`platform-mark ${platform}`}>
      {platform === "linkedin" ? "in" : platform === "meta" ? "∞" : "G"}
    </span>
  );
}
function Badge({
  children,
  kind = "neutral",
}: {
  children: React.ReactNode;
  kind?: string;
}) {
  return <span className={`badge ${kind}`}>{children}</span>;
}
function Empty({
  icon: Icon = Images,
  title,
  text,
  children,
}: {
  icon?: any;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const el = ref.current;
    el?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && el) {
        const items = el.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),textarea,select,a[href]",
        );
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", listener);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Art({
  creative,
  project,
  logo = "",
}: {
  creative: Creative;
  project: Project;
  logo?: string;
}) {
  return (
    <div
      className="creative-art"
      role="img"
      aria-label={`${project.profile?.name || project.title}: ${creative.headline}`}
      dangerouslySetInnerHTML={{ __html: creativeSvg(creative, project, logo) }}
    />
  );
}

export default function Studio() {
  const [projects, setProjects] = useState<Project[]>([]),
    [demo, setDemo] = useState<Project>(() => getDemo());
  const [nav, setNav] = useState<Nav>("Overview"),
    [activeId, setActiveId] = useState("demo"),
    [stage, setStage] = useState(0),
    [projectView, setProjectView] = useState(false);
  const [modal, setModal] = useState<
      "new" | "settings" | "evidence" | "search" | "help" | null
    >(null),
    [selected, setSelected] = useState<string | null>(null),
    [busy, setBusy] = useState(""),
    [elapsed, setElapsed] = useState(0),
    [toast, setToast] = useState<{ message: string; error: boolean } | null>(
      null,
    );
  const [cap, setCap] = useState<Capabilities | null>(null),
    [authError, setAuthError] = useState(false),
    [loaded, setLoaded] = useState(false),
    [filter, setFilter] = useState<"all" | Platform>("all"),
    [search, setSearch] = useState(""),
    [notifications, setNotifications] = useState(false),
    [mobileNav, setMobileNav] = useState(false);
  const [logos, setLogos] = useState<Record<string, string>>({});
  const active =
    activeId === "demo"
      ? demo
      : projects.find((p) => p.id === activeId) || demo;
  const displayed = projects.length ? projects : [demo];
  const allCreatives = displayed.flatMap((p) =>
    p.creatives.map((c) => ({ p, c })),
  );
  const visible = allCreatives.filter(
    ({ p, c }) =>
      (filter === "all" || c.platform === filter) &&
      [p.title, c.headline]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const viewingDemo = active.id === "demo";
  const allCount = allCreatives.length,
    approved = allCreatives.filter((x) => x.c.status === "approved").length;
  const current = active.creatives.find((c) => c.id === selected);
  const notify = (message: string, error = false) =>
    setToast({ message, error });
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 6500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const load = async () => {
    try {
      const data = await api<{
        projects: Project[];
        capabilities: Capabilities;
      }>("bootstrap");
      setProjects(data.projects);
      setCap(data.capabilities);
      setAuthError(false);
      if (data.projects.length)
        setActiveId((v) => (v === "demo" ? data.projects[0].id : v));
    } catch {
      setAuthError(true);
    } finally {
      setLoaded(true);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal("search");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    for (const p of projects) {
      if (p.logoId && !logos[p.logoId])
        fetch(`/api/assets/${p.logoId}`)
          .then((r) => {
            if (!r.ok) throw Error();
            return r.blob();
          })
          .then(
            (blob) =>
              new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.readAsDataURL(blob);
              }),
          )
          .then((value) => setLogos((x) => ({ ...x, [p.logoId]: value })))
          .catch(() => {});
    }
  }, [projects]);
  const put = (p: Project) => {
    if (p.id === "demo") setDemo(p);
    else setProjects((v) => [p, ...v.filter((x) => x.id !== p.id)]);
  };
  async function run<T>(
    label: string,
    work: () => Promise<T>,
  ): Promise<T | undefined> {
    if (busy) return;
    setBusy(label);
    try {
      return await work();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Something went wrong",
        true,
      );
    } finally {
      setBusy("");
    }
  }
  async function patch(changes: Partial<Project>, p = active) {
    if (p.id === "demo") {
      if (changes.creatives)
        changes.creatives = changes.creatives.map((c) => {
          const old = p.creatives.find((x) => x.id === c.id);
          if (
            old &&
            ["headline", "body", "cta", "color", "style"].some(
              (k) => (old as any)[k] !== (c as any)[k],
            )
          )
            return {
              ...c,
              version: old.version + 1,
              status: "review",
              history: [
                ...old.history,
                {
                  version: old.version,
                  headline: old.headline,
                  body: old.body,
                  cta: old.cta,
                  color: old.color,
                  style: old.style,
                  savedAt: old.savedAt,
                },
              ],
              savedAt: new Date().toISOString(),
            };
          return c;
        });
      const next = { ...p, ...changes, revision: p.revision + 1 };
      put(next);
      return next;
    }
    const next = await api<Project>(`projects/${p.id}`, "PATCH", {
      ...changes,
      revision: p.revision,
    });
    put(next);
    return next;
  }
  async function action(name: string, label: string, next?: number) {
    if (viewingDemo) {
      notify(
        "Create a campaign to run the agent on your business. This workspace contains fictional sample data.",
      );
      setModal("new");
      return;
    }
    await run(label, async () => {
      const p = await api<Project>(`projects/${active.id}/${name}`, "POST", {});
      put(p);
      if (next !== undefined) setStage(next);
      notify(label + " completed");
    });
  }
  const openProject = (p: Project, s = 0) => {
    setActiveId(p.id);
    setStage(s);
    setProjectView(true);
    setNav("Campaigns");
    setMobileNav(false);
  };
  async function exportCreative(
    c: Creative,
    p = active,
    type: "png" | "jpg" = "png",
  ) {
    const errors = checks(c, p).filter((x) => x.level === "error");
    if (errors.length)
      throw new Error(
        "Resolve these checks first: " + errors.map((x) => x.label).join(", "),
      );
    download(
      await raster(c, p, type, logos[p.logoId] || ""),
      `${filename(p.title)}-${c.platform}-${c.ratio.replace(":", "x")}-v${c.version}.${type}`,
    );
  }
  async function exportPackage() {
    await run("Preparing your export package", async () => {
      const creatives = active.creatives.filter((c) => c.status === "approved");
      if (!creatives.length)
        throw new Error(
          "Approve at least one creative before exporting a campaign package.",
        );
      if (
        creatives.some((c) =>
          checks(c, active).some((x) => x.level === "error"),
        )
      )
        throw new Error(
          "Some approved creatives have blocking checks. Review them before export.",
        );
      const files: { name: string; data: Uint8Array }[] = [];
      for (const c of creatives)
        for (const format of ["png", "jpg"] as const) {
          const blob = await raster(
            c,
            active,
            format,
            logos[active.logoId] || "",
          );
          files.push({
            name: `${c.platform}/${filename(c.conceptId)}/${c.ratio.replace(":", "x")}-${c.id.slice(0, 8)}-v${c.version}.${format}`,
            data: new Uint8Array(await blob.arrayBuffer()),
          });
        }
      const enc = new TextEncoder();
      files.push(
        {
          name: "research-and-brief.html",
          data: enc.encode(reportHtml(active)),
        },
        {
          name: "ad-copy-and-checklist.json",
          data: enc.encode(
            JSON.stringify(
              creatives.map((c) => ({
                id: c.id,
                platform: LABELS[c.platform],
                headline: c.headline,
                primaryText: c.body,
                cta: c.cta,
                concept: active.concepts.find((x) => x.id === c.conceptId),
                checks: checks(c, active),
              })),
              null,
              2,
            ),
          ),
        },
        {
          name: "provenance.json",
          data: enc.encode(
            JSON.stringify(
              {
                title: active.title,
                exportedAt: new Date().toISOString(),
                sample: viewingDemo,
                contexts: active.contexts,
                sources: active.sources,
                evidence: active.evidence,
                report: active.report,
                concepts: active.concepts,
                creatives: creatives.map((c) => ({
                  id: c.id,
                  conceptId: c.conceptId,
                  version: c.version,
                  history: c.history,
                })),
              },
              null,
              2,
            ),
          ),
        },
      );
      download(
        zip(files),
        `${filename(active.title)}${viewingDemo ? "-fictional-sample" : ""}.zip`,
      );
      notify("Export package downloaded");
    });
  }
  function card(p: Project, c: Creative) {
    return (
      <article className="creative-card" key={c.id}>
        <button
          className="art-button"
          onClick={() => {
            setActiveId(p.id);
            setSelected(c.id);
          }}
        >
          <Art creative={c} project={p} logo={logos[p.logoId]} />
          <span className="preview-label">
            Open in studio <ArrowUpRight size={13} />
          </span>
        </button>
        <div className="creative-meta">
          <div className="row spread">
            <span className="platform-label">
              <PlatformMark platform={c.platform} />
              {LABELS[c.platform]}
            </span>
            <button
              className={`star-button ${c.favorite ? "selected" : ""}`}
              aria-label={
                c.favorite ? "Remove favourite" : "Favourite creative"
              }
              onClick={() =>
                run("Saving favourite", async () => {
                  await patch(
                    {
                      creatives: p.creatives.map((x) =>
                        x.id === c.id ? { ...x, favorite: !x.favorite } : x,
                      ),
                    },
                    p,
                  );
                })
              }
            >
              <Star size={16} fill={c.favorite ? "currentColor" : "none"} />
            </button>
          </div>
          <h3>
            {p.concepts.find((x) => x.id === c.conceptId)?.title || c.headline}
          </h3>
          <div className="row spread">
            <span className="muted tiny">
              {c.width} × {c.height} <span className="dot">·</span> v{c.version}
            </span>
            <Badge kind={c.status === "approved" ? "green" : "neutral"}>
              {c.status === "approved" ? (
                <Check size={10} />
              ) : (
                <Clock3 size={10} />
              )}{" "}
              {c.status === "review"
                ? "In review"
                : c.status === "approved"
                  ? "Approved"
                  : "Rejected"}
            </Badge>
          </div>
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setNav("Overview");
            setProjectView(false);
          }}
        >
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          <span>
            signal<span className="brand-light">studio</span>
          </span>
        </a>
        <button
          className="workspace-selector"
          onClick={() => setModal("search")}
        >
          <span className="workspace-avatar">K</span>
          <span>
            <strong>Koushik's workspace</strong>
            <small>Personal workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {(
            [
              ["Overview", LayoutDashboard],
              ["Campaigns", Folders],
              ["Creative library", Images],
              ["Competitor intelligence", ScanEye],
              ["Brand kit", Palette],
            ] as [Nav, any][]
          ).map(([name, Icon]) => (
            <button
              key={name}
              className={`nav-item ${nav === name ? "active" : ""}`}
              onClick={() => {
                setNav(name);
                setProjectView(false);
                setMobileNav(false);
              }}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Creative library" && (
                <span className="nav-count">{allCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="mini-spark">
              <Sparkles size={17} />
            </span>
            <strong>
              A little insight.
              <br />A bigger creative edge.
            </strong>
            <p>
              Better research makes
              <br />
              better first impressions.
            </p>
            <button onClick={() => setModal("new")}>
              Create something great <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`nav-item ${nav === "Settings" ? "active" : ""}`}
            onClick={() => {
              setNav("Settings");
              setProjectView(false);
            }}
          >
            <Settings size={18} />
            Settings & integrations
          </button>
          <button className="nav-item" onClick={() => setModal("help")}>
            <HelpCircle size={18} />
            Help & getting started
            <ArrowUpRight size={13} />
          </button>
          <div className="sidebar-user">
            <span className="user-avatar">KB</span>
            <div>
              <strong>Koushik Biswas</strong>
              <small>Workspace owner</small>
            </div>
            <Badge kind="green">Private</Badge>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{projectView ? active.title : nav}</strong>
          </div>
          <div className="top-actions">
            <button
              className="global-search"
              onClick={() => setModal("search")}
            >
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Activity notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {active.activities.length > 0 && <i />}
              </button>
              {notifications && (
                <div className="notification-pop">
                  <h4>Workspace activity</h4>
                  {active.activities.slice(0, 5).map((a, i) => (
                    <div key={i}>
                      <span className="activity-dot" />
                      <p>
                        {a.text}
                        <small>{fmt(a.at)}</small>
                      </p>
                    </div>
                  ))}
                  {!active.activities.length && <p>No activity yet.</p>}
                </div>
              )}
            </div>
            <span className="top-divider" />
            <span className="user-avatar small">KB</span>
          </div>
        </header>
        <div className="page-content">
          <form
            action="/api/auth/logout"
            method="post"
            className="portable-signout"
          >
            <button type="submit">Sign out of workspace</button>
          </form>
          {!projects.length && (
            <div className="sample-banner">
              <span>
                <Info size={14} />
                {loaded
                  ? "You're exploring a fictional sample workspace. Create a campaign to use your own business."
                  : "Loading your workspace…"}
              </span>
              <button onClick={() => setModal("new")}>
                Start your campaign <ArrowRight size={13} />
              </button>
            </div>
          )}
          {projectView ? (
            <>
              <div className="page-heading">
                <div>
                  <button
                    className="back-link"
                    onClick={() => setProjectView(false)}
                  >
                    <ChevronLeft size={14} />
                    All campaigns
                  </button>
                  <h1>{active.title}</h1>
                  <p>
                    {active.website || "Manual business input"}{" "}
                    <span className="dot">·</span>{" "}
                    {viewingDemo
                      ? "Fictional sample"
                      : `Saved ${fmt(active.updatedAt)}`}
                  </p>
                </div>
                <div className="row">
                  <button
                    className="button secondary"
                    onClick={() => setModal("settings")}
                  >
                    <Settings size={15} />
                    Campaign settings
                  </button>
                  <button
                    className="button primary"
                    onClick={() => setStage(5)}
                  >
                    <Download size={15} />
                    Export
                  </button>
                </div>
              </div>
              <div className="workflow-stepper">
                {STEPS.map((s, i) => {
                  const Icon = ICONS[i];
                  return (
                    <button
                      key={s}
                      className={`${stage === i ? "selected" : ""} ${i < stage ? "done" : ""}`}
                      onClick={() => setStage(i)}
                    >
                      <span>
                        {i < stage ? <Check size={13} /> : <Icon size={14} />}
                      </span>
                      {s}
                      {i < 5 && (
                        <ChevronRight className="step-chevron" size={13} />
                      )}
                    </button>
                  );
                })}
              </div>
              {stage === 0 && (
                <div className="two-col profile-layout">
                  <section className="panel">
                    <div className="section-head">
                      <div>
                        <h2>Understand the business</h2>
                        <p>A strong creative starts with a clear picture.</p>
                      </div>
                      <button
                        className="button secondary"
                        disabled={!!busy}
                        onClick={() =>
                          action("research", "Researching business pages", 0)
                        }
                      >
                        <RefreshCw size={14} />
                        Research {active.profile ? "again" : "website"}
                      </button>
                    </div>
                    {active.profile ? (
                      <ProfileEditor
                        key={`${active.id}-${active.revision}`}
                        project={active}
                        onSave={(profile, next) =>
                          run("Saving business profile", async () => {
                            await patch({ profile });
                            notify(
                              profile.confirmed
                                ? "Business profile confirmed"
                                : "Profile saved",
                            );
                            if (next) setStage(1);
                          })
                        }
                        busy={!!busy}
                      />
                    ) : (
                      <div className="padded">
                        <Empty
                          icon={Globe}
                          title="Let's get to know your business"
                          text="Research your website, or write an editable profile manually if your website is unavailable."
                        >
                          <div className="row">
                            <button
                              className="button primary"
                              disabled={!!busy}
                              onClick={() =>
                                action(
                                  "research",
                                  "Researching business pages",
                                  0,
                                )
                              }
                            >
                              <Sparkles size={15} />
                              Research business
                            </button>
                            <button
                              className="button secondary"
                              onClick={() =>
                                run("Creating manual profile", async () => {
                                  await patch({
                                    profile: {
                                      name: active.title,
                                      description: active.description,
                                      audience: active.audience,
                                      industry: "",
                                      valueProps: [],
                                      tone: "Clear and professional",
                                      colors: ["#6e56cf", "#163d35", "#e9eece"],
                                      claims: [],
                                      confirmed: false,
                                    },
                                  });
                                })
                              }
                            >
                              Write manually
                            </button>
                          </div>
                        </Empty>
                      </div>
                    )}
                  </section>
                  <aside className="stack">
                    <section className="panel padded">
                      <span className="eyebrow">
                        <Link2 size={13} />
                        Source trail
                      </span>
                      <h3>Grounded in your business</h3>
                      <p className="muted">
                        Every proof point needs a source. The agent keeps quoted
                        claims attached to the pages they came from.
                      </p>
                      {active.sources.map((s) => (
                        <div className="source-item" key={s.id}>
                          <Globe size={15} />
                          <div>
                            <strong>{s.title}</strong>
                            {s.url !== "user-input" ? (
                              <a href={s.url} target="_blank" rel="noreferrer">
                                View source <ExternalLink size={11} />
                              </a>
                            ) : (
                              <small>User-provided information</small>
                            )}
                          </div>
                        </div>
                      ))}
                      {!active.sources.length && (
                        <div className="note">
                          No research sources yet. Manual profile changes are
                          your responsibility to verify.
                        </div>
                      )}
                    </section>
                    <div className="tip-card">
                      <Sparkles size={21} />
                      <h3>Proof beats promises.</h3>
                      <p>
                        Add real product benefits, customer evidence and brand
                        details. We never invent numbers or testimonials.
                      </p>
                    </div>
                  </aside>
                </div>
              )}
              {stage === 1 && (
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>Your competitive landscape</h2>
                      <p>
                        Verify suggested competitors, or add businesses you
                        already know.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      disabled={!!busy || !active.profile?.confirmed}
                      onClick={() =>
                        action(
                          "suggest-competitors",
                          "Finding competitor suggestions",
                          1,
                        )
                      }
                    >
                      <Sparkles size={15} />
                      Suggest competitors
                    </button>
                  </div>
                  <CompetitorsEditor
                    key={`${active.id}-${active.revision}`}
                    project={active}
                    busy={!!busy}
                    onSave={(value) =>
                      run("Saving competitor list", async () => {
                        await patch({ competitors: value });
                        notify(
                          "List saved. Confirm it after checking the businesses.",
                        );
                      })
                    }
                  />
                  <div className="panel-footer">
                    <span className="muted tiny">
                      Suggestions come from model knowledge. Names and URLs need
                      your verification.
                    </span>
                    <button
                      className="button primary"
                      disabled={!!busy || !active.competitors.length}
                      onClick={() =>
                        run("Confirming competitors", async () => {
                          await patch({ competitorsConfirmed: true });
                          setStage(2);
                          notify("Competitor list confirmed");
                        })
                      }
                    >
                      <Check size={15} />
                      Confirm competitors <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
              )}
              {stage === 2 && (
                <div className="stack">
                  <section className="panel">
                    <div className="section-head">
                      <div>
                        <h2>Competitor intelligence</h2>
                        <p>
                          Real evidence. Clear patterns. Room for something
                          different.
                        </p>
                      </div>
                      <div className="row">
                        <button
                          className="button secondary"
                          disabled={!!busy}
                          onClick={() => setModal("evidence")}
                        >
                          <Plus size={15} />
                          Import ad evidence
                        </button>
                        <button
                          className="button primary"
                          disabled={!!busy || !active.competitorsConfirmed}
                          onClick={() =>
                            action(
                              "insights",
                              "Analysing competitor evidence",
                              2,
                            )
                          }
                        >
                          <ScanEye size={15} />
                          {active.report
                            ? "Refresh insights"
                            : "Build insights report"}
                        </button>
                      </div>
                    </div>
                    <div className="coverage-grid">
                      {PLATFORMS.map((platform) => (
                        <div className="coverage-card" key={platform}>
                          <PlatformMark platform={platform} />
                          <strong>{LABELS[platform]}</strong>
                          <span>
                            {
                              active.evidence.filter(
                                (e) => e.platform === platform,
                              ).length
                            }{" "}
                            ads collected
                          </span>
                          <Badge
                            kind={
                              active.evidence.some(
                                (e) => e.platform === platform,
                              )
                                ? "green"
                                : "amber"
                            }
                          >
                            {active.evidence.some(
                              (e) => e.platform === platform,
                            )
                              ? "Evidence available"
                              : "Coverage unknown"}
                          </Badge>
                          <a
                            href={libraryUrl(
                              platform,
                              active.competitors[0]?.name || "",
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open ad library <ExternalLink size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                    <div className="notice">
                      <Info size={16} />
                      <p>
                        Public libraries have different access and regional
                        coverage. An empty collection does not mean a competitor
                        has no ads. Import exact ad links and observations, or
                        configure an authorized collector in Settings.
                      </p>
                    </div>
                  </section>
                  {active.report && (
                    <section className="panel padded">
                      <div className="row spread">
                        <div>
                          <span className="eyebrow">RESEARCH FINDINGS</span>
                          <h2>Find your creative whitespace</h2>
                        </div>
                        <Badge kind="green">
                          <Clock3 size={11} />
                          {fmt(active.report.generatedAt)}
                        </Badge>
                      </div>
                      <p className="report-summary">{active.report.summary}</p>
                      <div className="insights-grid">
                        {active.report.insights.map((i) => (
                          <div className="insight-card" key={i.id}>
                            <div className="row spread">
                              <span className="platform-label">
                                <PlatformMark platform={i.platform} />
                                {LABELS[i.platform]}
                              </span>
                              <Badge
                                kind={i.evidenceIds.length ? "green" : "amber"}
                              >
                                {i.evidenceIds.length
                                  ? `${i.evidenceIds.length} source ads`
                                  : "Hypothesis"}
                              </Badge>
                            </div>
                            <small>OBSERVED PATTERN</small>
                            <h3>{i.pattern}</h3>
                            <small>YOUR OPPORTUNITY</small>
                            <p className="opportunity">{i.whitespace}</p>
                            <p className="muted tiny">{i.rationale}</p>
                            {i.evidenceIds.map((id) => {
                              const e = active.evidence.find(
                                (e) => e.id === id,
                              );
                              return e ? (
                                <a
                                  key={id}
                                  href={e.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="evidence-link"
                                >
                                  {e.competitor}: {e.headline.slice(0, 60)}
                                  <ExternalLink size={12} />
                                </a>
                              ) : null;
                            })}
                          </div>
                        ))}
                      </div>
                      <div className="notice">
                        <Info size={15} />
                        <p>
                          Ad longevity and repetition are possible effectiveness
                          signals. They do not establish spend, clicks,
                          conversions or actual performance.
                        </p>
                      </div>
                      <button
                        className="button primary"
                        onClick={() => setStage(3)}
                      >
                        Continue to creative brief <ArrowRight size={14} />
                      </button>
                    </section>
                  )}
                  {active.evidence.length > 0 && (
                    <section className="panel">
                      <div className="section-head">
                        <div>
                          <h2>Evidence library</h2>
                          <p>
                            Imported observations are user-supplied unless
                            collected by your configured provider.
                          </p>
                        </div>
                        <Badge>{active.evidence.length} ads</Badge>
                      </div>
                      {active.evidence.map((e) => (
                        <div className="evidence-row" key={e.id}>
                          <PlatformMark platform={e.platform} />
                          <div>
                            <strong>{e.headline}</strong>
                            <p>
                              {e.competitor} ·{" "}
                              {e.visual || "No visual notes supplied"}
                            </p>
                            <a
                              href={e.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Source ad <ExternalLink size={11} />
                            </a>
                          </div>
                          <button
                            className="icon-button"
                            aria-label="Remove evidence"
                            onClick={() =>
                              run("Removing evidence", async () => {
                                await patch({
                                  evidence: active.evidence.filter(
                                    (x) => x.id !== e.id,
                                  ),
                                });
                              })
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                </div>
              )}
              {stage === 3 && (
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>The creative direction</h2>
                      <p>Choose the concepts worth bringing to life.</p>
                    </div>
                    <button
                      className="button primary"
                      disabled={!!busy || !active.report}
                      onClick={() =>
                        action(
                          "brief",
                          "Writing platform-specific creative concepts",
                          3,
                        )
                      }
                    >
                      <Sparkles size={15} />
                      {active.concepts.length
                        ? "Rebuild brief"
                        : "Propose creative brief"}
                    </button>
                  </div>
                  {!active.concepts.length ? (
                    <Empty
                      icon={FileText}
                      title="From insight to idea"
                      text="Build an insights report, then let the agent propose three distinct concepts for each selected platform."
                    />
                  ) : (
                    <>
                      <div className="concept-grid">
                        {active.concepts.map((concept) => (
                          <ConceptCard
                            key={`${concept.id}-${active.revision}`}
                            concept={concept}
                            project={active}
                            busy={!!busy}
                            onSave={(c) =>
                              run("Saving concept", async () => {
                                await patch({
                                  concepts: active.concepts.map((x) =>
                                    x.id === c.id ? c : x,
                                  ),
                                });
                                notify(
                                  c.approved
                                    ? "Concept approved"
                                    : "Concept updated",
                                );
                              })
                            }
                          />
                        ))}
                      </div>
                      <div className="panel-footer">
                        <span className="muted">
                          {active.concepts.filter((c) => c.approved).length}{" "}
                          concepts approved
                        </span>
                        <button
                          className="button primary"
                          disabled={!active.concepts.some((c) => c.approved)}
                          onClick={() => setStage(4)}
                        >
                          Create your ads <ArrowRight size={15} />
                        </button>
                      </div>
                    </>
                  )}
                </section>
              )}
              {stage === 4 && (
                <div className="stack">
                  <section className="panel">
                    <div className="section-head">
                      <div>
                        <h2>Make a strong first impression.</h2>
                        <p>
                          Distinct layouts, adapted to your placements. Every
                          word stays editable.
                        </p>
                      </div>
                      <button
                        className="button primary"
                        disabled={
                          !!busy || !active.concepts.some((c) => c.approved)
                        }
                        onClick={() =>
                          action(
                            "generate",
                            "Rendering approved creative variations",
                            4,
                          )
                        }
                      >
                        <Sparkles size={15} />
                        Generate creatives
                      </button>
                    </div>
                    <GenerationSettings
                      key={`${active.id}-${active.revision}`}
                      project={active}
                      busy={!!busy}
                      onSave={(v) =>
                        run("Saving generation settings", async () => {
                          await patch(v);
                          notify("Generation settings saved");
                        })
                      }
                    />
                  </section>
                  {active.creatives.length ? (
                    <div className="creative-grid">
                      {active.creatives.map((c) => card(active, c))}
                    </div>
                  ) : (
                    <section className="panel">
                      <Empty
                        title="Your next big idea belongs here"
                        text="Approve a concept in the brief, choose your formats, and generate your first set of branded creatives."
                      />
                    </section>
                  )}
                </div>
              )}
              {stage === 5 && (
                <div className="two-col">
                  <section className="panel padded">
                    <span className="eyebrow">READY WHEN YOU ARE</span>
                    <h2>Your campaign, neatly packaged.</h2>
                    <p className="muted">
                      Download approved creatives in PNG and JPG, matched ad
                      copy, the research report, and a source manifest.
                    </p>
                    <div className="export-list">
                      {[
                        [
                          Images,
                          "Platform-ready images",
                          "Organised by platform, concept and format",
                        ],
                        [
                          FileText,
                          "Research & creative brief",
                          "Shareable HTML document with cited evidence",
                        ],
                        [
                          Copy,
                          "Matching ad copy",
                          "Headlines, primary text and calls to action",
                        ],
                        [
                          ShieldCheck,
                          "Quality & provenance",
                          "Per-creative checks and source relationships",
                        ],
                      ].map(([Icon, title, text]: any) => (
                        <div key={title}>
                          <span>
                            <Icon size={20} />
                          </span>
                          <div>
                            <strong>{title}</strong>
                            <p>{text}</p>
                          </div>
                          <Check size={16} />
                        </div>
                      ))}
                    </div>
                    <div className="notice">
                      <TriangleAlert size={16} />
                      <p>
                        Export checks cover dimensions, file size, excluded
                        language and numeric claims. They do not guarantee
                        platform policy approval. Review all copy and final
                        images before advertising.
                      </p>
                    </div>
                    <button
                      className="button primary large"
                      disabled={
                        !!busy ||
                        !active.creatives.some((c) => c.status === "approved")
                      }
                      onClick={exportPackage}
                    >
                      <Download size={17} />
                      Download campaign package{" "}
                      <span>
                        {
                          active.creatives.filter(
                            (c) => c.status === "approved",
                          ).length
                        }{" "}
                        approved
                      </span>
                    </button>
                  </section>
                  <section className="panel padded">
                    <h3>Final review</h3>
                    <p className="muted">
                      Select any creative to edit, review warnings, and approve
                      it.
                    </p>
                    {active.creatives.map((c) => (
                      <button
                        className="export-creative"
                        key={c.id}
                        onClick={() => setSelected(c.id)}
                      >
                        <div>
                          <Art creative={c} project={active} />
                        </div>
                        <span>
                          <strong>{c.headline}</strong>
                          <small>
                            {LABELS[c.platform]} · {c.ratio}
                          </small>
                        </span>
                        <Badge
                          kind={c.status === "approved" ? "green" : "amber"}
                        >
                          {c.status === "approved" ? "Approved" : "Review"}
                        </Badge>
                      </button>
                    ))}
                    {!active.creatives.length && (
                      <Empty
                        title="No creatives yet"
                        text="Generate your first set before exporting."
                      />
                    )}
                  </section>
                </div>
              )}
            </>
          ) : nav === "Overview" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow greeting">
                    YOUR CREATIVE COMMAND CENTER <span className="live-dot" />
                  </div>
                  <h1>A fresh perspective. A better ad.</h1>
                  <p>Welcome back, Koushik. Let's make your brand stand out.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setModal("new")}
                >
                  <Plus size={17} />
                  New campaign
                </button>
              </div>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-eyebrow">
                    <Sparkles size={13} /> INSIGHT MEETS IMAGINATION
                  </span>
                  <h2>
                    Good ads get noticed.
                    <br />
                    Great ads start
                    <br />
                    with a <em>signal.</em>
                  </h2>
                  <p>
                    Know your business. Read the market.
                    <br />
                    Create something unmistakably yours.
                  </p>
                  <button
                    className="button lime"
                    onClick={() => setModal("new")}
                  >
                    Create your next campaign <ArrowUpRight size={17} />
                  </button>
                  <div className="hero-platforms">
                    <span>BUILT FOR</span>
                    <b>Google</b>
                    <b>∞ Meta</b>
                    <b>
                      Linked<span>in</span>
                    </b>
                  </div>
                </div>
                <div className="hero-visual" aria-hidden="true">
                  <div className="hero-orbit one" />
                  <div className="hero-orbit two" />
                  <div className="floating-insight">
                    <span>
                      <ScanEye size={17} />
                    </span>
                    <div>
                      <strong>Find the gap. Own the space.</strong>
                      <small>Competitor insight → creative direction</small>
                    </div>
                    <ArrowUpRight size={17} />
                  </div>
                  <div className="hero-ad back">
                    <Art creative={demo.creatives[1]} project={demo} />
                  </div>
                  <div className="hero-ad front">
                    <Art creative={demo.creatives[0]} project={demo} />
                  </div>
                  <div className="floating-ready">
                    <span>
                      <Check size={15} />
                    </span>
                    Made for your brand.
                    <Sparkles size={14} />
                  </div>
                  <div className="hero-caption">
                    A fictional brand. A real creative workflow.
                  </div>
                </div>
              </section>
              <div className="stats-grid">
                {[
                  [
                    Folders,
                    "Campaigns",
                    projects.length,
                    "Your brands, in one place",
                    "purple",
                  ],
                  [
                    Images,
                    "Creative variations",
                    allCount,
                    projects.length
                      ? "Across your saved campaigns"
                      : "Explore the sample collection",
                    "green",
                  ],
                  [
                    ScanEye,
                    "Competitors tracked",
                    displayed.reduce((n, p) => n + p.competitors.length, 0),
                    projects.length
                      ? "Confirmed and suggested businesses"
                      : "Fictional examples in preview",
                    "orange",
                  ],
                  [
                    CheckCircle2,
                    "Approved creatives",
                    approved,
                    "Reviewed and ready to export",
                    "blue",
                  ],
                ].map(([Icon, label, value, text, tone]: any) => (
                  <div className="stat-card" key={label}>
                    <div className="row spread">
                      <span className="stat-label">{label}</span>
                      <span className={`stat-icon ${tone}`}>
                        <Icon size={17} />
                      </span>
                    </div>
                    <strong className="stat-value">
                      {String(value).padStart(2, "0")}
                    </strong>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
              <div className="section-title">
                <div>
                  <h2>Your creative workspace</h2>
                  <p>From a business URL to your next great campaign.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setNav("Campaigns");
                    setProjectView(false);
                  }}
                >
                  View all campaigns <ArrowRight size={14} />
                </button>
              </div>
              <div className="workspace-grid">
                <section className="panel campaign-panel">
                  <div className="row spread panel-title">
                    <h3>
                      Recent campaigns <span>{displayed.length}</span>
                    </h3>
                    <button
                      className="icon-button"
                      aria-label="New campaign"
                      onClick={() => setModal("new")}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  {displayed.slice(0, 3).map((p) => (
                    <button
                      className="campaign-row"
                      key={p.id}
                      onClick={() => openProject(p, p.creatives.length ? 4 : 0)}
                    >
                      <span
                        className="campaign-brand"
                        style={{
                          background: p.profile?.colors[0] || "#6e56cf",
                        }}
                      >
                        {(p.profile?.name || p.title).slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{p.title}</strong>
                        <small>
                          {p.profile?.industry || "Business research"}{" "}
                          <span className="dot">·</span> {p.creatives.length}{" "}
                          creatives
                        </small>
                      </div>
                      <Badge
                        kind={
                          p.id === "demo"
                            ? "purple"
                            : p.creatives.length
                              ? "green"
                              : "neutral"
                        }
                      >
                        {p.id === "demo"
                          ? "Sample"
                          : p.creatives.length
                            ? "In progress"
                            : "New"}
                      </Badge>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                  <button
                    className="new-campaign-row"
                    onClick={() => setModal("new")}
                  >
                    <span>
                      <Plus size={18} />
                    </span>
                    <div>
                      <strong>Start something new</strong>
                      <small>A website URL is all you need to begin.</small>
                    </div>
                    <ArrowUpRight size={18} />
                  </button>
                </section>
                <section className="quick-start">
                  <span className="eyebrow">THE SIGNAL WAY</span>
                  <h3>
                    A little research.
                    <br />A lot more <em>possibility.</em>
                  </h3>
                  <div>
                    {[
                      "Understand your business",
                      "Discover your creative edge",
                      "Bring your ideas to life",
                    ].map((s, i) => (
                      <p key={s}>
                        <span>0{i + 1}</span>
                        {s}
                        <Check size={13} />
                      </p>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setModal("help")}
                  >
                    See how it works <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>
              <div className="section-title">
                <div>
                  <h2>
                    Fresh from the studio{" "}
                    <span className="count-bubble">{allCount}</span>
                  </h2>
                  <p>Your latest ideas, ready for their moment.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setNav("Creative library");
                    setProjectView(false);
                  }}
                >
                  Explore creative library <ArrowRight size={14} />
                </button>
              </div>
              <div className="creative-grid">
                {allCreatives.slice(0, 4).map(({ p, c }) => card(p, c))}
              </div>
              {!allCount && (
                <section className="panel">
                  <Empty
                    title="Your studio is ready"
                    text="Open a campaign to generate your first set of creatives."
                  />
                </section>
              )}
            </>
          ) : nav === "Campaigns" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">IDEAS WITH DIRECTION</span>
                  <h1>Your campaigns</h1>
                  <p>One workspace for every brand and every big idea.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setModal("new")}
                >
                  <Plus size={17} />
                  New campaign
                </button>
              </div>
              <div className="campaigns-grid">
                {displayed.map((p) => (
                  <section className="panel campaign-tile" key={p.id}>
                    <div
                      className="campaign-tile-art"
                      style={{ background: p.profile?.colors[0] || "#6e56cf" }}
                    >
                      {p.creatives[0] ? (
                        <Art creative={p.creatives[0]} project={p} />
                      ) : (
                        <>
                          <span>{p.title.slice(0, 1)}</span>
                          <Sparkles size={60} />
                        </>
                      )}
                    </div>
                    <div className="padded">
                      <div className="row spread">
                        <Badge kind={p.id === "demo" ? "purple" : "green"}>
                          {p.id === "demo"
                            ? "Fictional sample"
                            : "Saved campaign"}
                        </Badge>
                        <small className="muted">{fmt(p.updatedAt)}</small>
                      </div>
                      <h3>{p.title}</h3>
                      <p className="muted">
                        {p.goal} · {p.language}
                      </p>
                      <div className="row spread">
                        <span className="muted tiny">
                          {p.creatives.length} creatives ·{" "}
                          {p.competitors.length} competitors
                        </span>
                        <button
                          className="button secondary"
                          onClick={() => openProject(p)}
                        >
                          Open campaign <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
                <button
                  className="campaign-tile add-tile"
                  onClick={() => setModal("new")}
                >
                  <span>
                    <Plus size={24} />
                  </span>
                  <h3>Make your next move</h3>
                  <p>Create a campaign for your business.</p>
                </button>
              </div>
            </>
          ) : nav === "Creative library" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">MADE TO STAND OUT</span>
                  <h1>The creative library</h1>
                  <p>Every concept. Every variation. All in one place.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => setModal("new")}
                >
                  <Plus size={17} />
                  New campaign
                </button>
              </div>
              <div className="library-toolbar">
                <div className="filter-tabs">
                  {(["all", ...PLATFORMS] as const).map((p) => (
                    <button
                      className={filter === p ? "selected" : ""}
                      key={p}
                      onClick={() => setFilter(p)}
                    >
                      {p === "all" ? (
                        "All creatives"
                      ) : (
                        <>
                          <PlatformMark platform={p} />
                          {LABELS[p]}
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <label className="inline-search">
                  <Search size={15} />
                  <input
                    aria-label="Search creatives"
                    placeholder="Search creatives"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="creative-grid">
                {visible.map(({ p, c }) => card(p, c))}
              </div>
              {!visible.length && (
                <section className="panel">
                  <Empty
                    icon={Search}
                    title="No matching creatives"
                    text="Try another search or platform filter."
                  />
                </section>
              )}
            </>
          ) : nav === "Competitor intelligence" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    LOOK OUTSIDE. THINK DIFFERENT.
                  </span>
                  <h1>Your competitive edge</h1>
                  <p>
                    Bring the market into focus with source-linked ad research.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => openProject(active, 2)}
                >
                  <ScanEye size={16} />
                  Open research workspace
                </button>
              </div>
              <div className="two-col">
                <section className="panel padded">
                  <h2>Research that leads somewhere.</h2>
                  <p className="muted">
                    Explore public ad libraries, capture creative examples, and
                    turn visual and messaging patterns into a distinctive brief.
                  </p>
                  {PLATFORMS.map((p) => (
                    <a
                      className="library-link"
                      key={p}
                      href={libraryUrl(p, "")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <PlatformMark platform={p} />
                      <div>
                        <strong>{LABELS[p]} ad library</strong>
                        <small>
                          {p === "google"
                            ? "Ads Transparency Center"
                            : p === "meta"
                              ? "Facebook & Instagram"
                              : "Professional network advertising"}
                        </small>
                      </div>
                      <ArrowUpRight size={19} />
                    </a>
                  ))}
                </section>
                <section className="panel padded">
                  <span className="eyebrow">EVIDENCE FIRST</span>
                  <h3>What we know. And what we don't.</h3>
                  <p className="muted">
                    Public libraries don't provide full campaign performance.
                    Signal separates observations from hypotheses and keeps
                    recommendations attached to their source ads.
                  </p>
                  <div className="note">
                    Collection status:{" "}
                    {cap?.adCollection
                      ? "Authorized collector configured"
                      : "Manual import · automatic collector not connected"}
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setNav("Settings")}
                  >
                    Manage integrations <ArrowRight size={14} />
                  </button>
                </section>
              </div>
              <div className="section-title">
                <h2>Research by campaign</h2>
              </div>
              <section className="panel">
                {displayed.map((p) => (
                  <button
                    className="campaign-row"
                    key={p.id}
                    onClick={() => openProject(p, 2)}
                  >
                    <span className="stat-icon purple">
                      <ScanEye size={18} />
                    </span>
                    <div>
                      <strong>{p.title}</strong>
                      <small>
                        {p.evidence.length} source ads · {p.competitors.length}{" "}
                        competitors
                      </small>
                    </div>
                    <Badge kind={p.report ? "green" : "neutral"}>
                      {p.report ? "Report available" : "Start research"}
                    </Badge>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </section>
            </>
          ) : nav === "Brand kit" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">UNMISTAKABLY YOURS</span>
                  <h1>Your brand, beautifully consistent.</h1>
                  <p>
                    Give every creative the right colours, voice and visual
                    assets.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => openProject(active, 0)}
                >
                  <Palette size={16} />
                  Edit business profile
                </button>
              </div>
              <BrandKit
                key={active.id}
                project={active}
                logos={logos}
                busy={!!busy}
                onUpload={(file) =>
                  run("Uploading brand asset", async () => {
                    if (viewingDemo)
                      throw new Error(
                        "Create your own campaign to upload private brand assets.",
                      );
                    const form = new FormData();
                    form.set("file", file);
                    put(
                      await api<Project>(
                        `projects/${active.id}/assets`,
                        "POST",
                        form,
                      ),
                    );
                    notify("Asset uploaded");
                  })
                }
                onLogo={(id) =>
                  run("Updating brand logo", async () => {
                    await patch({ logoId: id });
                    notify("Logo selected");
                  })
                }
              />
              <div className="section-title">
                <h2>Switch campaign brand</h2>
              </div>
              <div className="brand-switcher">
                {displayed.map((p) => (
                  <button
                    key={p.id}
                    className={p.id === active.id ? "selected" : ""}
                    onClick={() => setActiveId(p.id)}
                  >
                    <span
                      style={{ background: p.profile?.colors[0] || "#6e56cf" }}
                    >
                      {p.title[0]}
                    </span>
                    {p.title}
                    {p.id === active.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR WORKSPACE, CONNECTED</span>
                  <h1>Settings & integrations</h1>
                  <p>
                    Know what's connected and what powers your creative
                    workflow.
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() =>
                    run("Refreshing connection status", async () => {
                      await load();
                      notify("Connection status refreshed");
                    })
                  }
                >
                  <RefreshCw size={15} />
                  Refresh status
                </button>
              </div>
              <section className="panel">
                <div className="section-head">
                  <div>
                    <h2>Intelligence & generation</h2>
                    <p>
                      Credentials stay server-side. This dashboard never
                      displays API keys.
                    </p>
                  </div>
                  <Badge kind="green">
                    <ShieldCheck size={12} />
                    Private workspace
                  </Badge>
                </div>
                {[
                  [
                    Zap,
                    "Groq language models",
                    cap?.model || "Model status unavailable",
                    cap?.llm ? "Configured" : "Not connected",
                    !!cap?.llm,
                  ],
                  [
                    Images,
                    "Creative renderer",
                    "Branded vector layouts with PNG & JPG export",
                    "Ready",
                    true,
                  ],
                  [
                    ScanEye,
                    "Public ad-library collector",
                    "Authorized collection service; manual imports always available",
                    cap?.adCollection ? "Configured" : "Manual import",
                    !!cap?.adCollection,
                  ],
                  [
                    Layers,
                    "Project storage",
                    cap?.runtime || "Persistent storage status unavailable",
                    loaded && !authError ? "Connected" : "Sign in required",
                    loaded && !authError,
                  ],
                ].map(([Icon, name, description, status, connected]: any) => (
                  <div className="integration-row" key={name}>
                    <span
                      className={`integration-icon ${connected ? "purple" : ""}`}
                    >
                      <Icon size={23} />
                    </span>
                    <div>
                      <h3>{name}</h3>
                      <p>{description}</p>
                    </div>
                    <Badge kind={connected ? "green" : "amber"}>
                      {connected ? <Check size={11} /> : <Info size={11} />}{" "}
                      {status}
                    </Badge>
                  </div>
                ))}
                <div className="notice">
                  <Info size={16} />
                  <p>
                    Generative photography is not connected. Current ads use
                    precise typography and original abstract layouts. Automatic
                    competitor collection needs a separately authorized data
                    provider. Model configuration means a key is present; the
                    next agent run verifies provider access.
                  </p>
                </div>
              </section>
              <div className="two-col settings-bottom">
                <section className="panel padded">
                  <h3>Designed for private work</h3>
                  <p className="muted">
                    Campaigns and uploaded assets belong to your signed-in
                    account. Every save checks ownership and campaign revision.
                  </p>
                  {authError && (
                    <a className="button primary" href="/login" target="_top">
                      Sign in to workspace <ArrowUpRight size={14} />
                    </a>
                  )}
                  <a
                    className="text-button"
                    href="https://github.com/Koushik-Biswas/AI-Creative_Ad_Generative_Agent"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View source on GitHub <ArrowUpRight size={14} />
                  </a>
                </section>
                <section className="panel padded">
                  <h3>Campaign controls</h3>
                  <p className="muted">
                    Manage the active campaign: {active.title}
                  </p>
                  <div className="row wrap">
                    <button
                      className="button secondary"
                      onClick={() => setModal("settings")}
                    >
                      <Settings size={14} />
                      Edit settings
                    </button>
                    <button
                      className="button secondary"
                      disabled={viewingDemo || !!busy}
                      onClick={() =>
                        run("Duplicating campaign", async () => {
                          const p = await api<Project>("projects", "POST", {
                            title: active.title + " · Copy",
                            website: active.website,
                            description: active.description,
                            audience: active.audience,
                            goal: active.goal,
                            language: active.language,
                            region: active.region,
                            platforms: active.platforms,
                            ratios: active.ratios,
                            avoid: active.avoid,
                            disclaimer: active.disclaimer,
                            variations: active.variations,
                          });
                          put(p);
                          openProject(p);
                          notify(
                            "New campaign created with copied inputs. Research starts fresh.",
                          );
                        })
                      }
                    >
                      <Copy size={14} />
                      Duplicate inputs
                    </button>
                  </div>
                  <details className="danger-zone">
                    <summary>Delete campaign</summary>
                    <p>
                      This permanently removes this campaign, its history and
                      uploaded assets.
                    </p>
                    <button
                      className="button danger"
                      disabled={viewingDemo || !!busy}
                      onClick={() =>
                        run("Deleting campaign", async () => {
                          await api(`projects/${active.id}`, "DELETE");
                          setProjects((p) =>
                            p.filter((x) => x.id !== active.id),
                          );
                          setActiveId("demo");
                          setProjectView(false);
                          notify("Campaign deleted");
                        })
                      }
                    >
                      <Trash2 size={14} />
                      Permanently delete campaign
                    </button>
                  </details>
                </section>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span className="row">
              <span className="brand-symbol mini">
                <i />
                <i />
                <i />
              </span>
              Made with insight. Created with intention.
            </span>
            <span>
              Signal Studio <span className="dot">·</span> B2B creative
              intelligence
            </span>
          </footer>
        </div>
      </main>
      {busy && (
        <div className="progress-toast" role="status">
          <span className="progress-spinner">
            <Loader2 size={19} />
          </span>
          <div>
            <strong>{busy}</strong>
            <small>
              {elapsed > 4 ? `${elapsed}s · ` : ""}Your saved work stays safe
              while the agent runs.
            </small>
          </div>
          <span className="progress-dots">•••</span>
        </div>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? "error" : ""}`}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? (
            <TriangleAlert size={19} />
          ) : (
            <CheckCircle2 size={19} />
          )}
          <span>{toast.message}</span>
          <button aria-label="Dismiss message" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal === "new" && (
        <Modal
          title="Let's create something distinctive."
          subtitle="Start with a business URL, a description, or both."
          onClose={() => !busy && setModal(null)}
        >
          <CampaignForm
            busy={!!busy}
            onSubmit={(input) =>
              run("Creating your campaign", async () => {
                const p = await api<Project>("projects", "POST", input);
                put(p);
                setActiveId(p.id);
                setModal(null);
                openProject(p, 0);
                notify(
                  "Campaign created. Research the business or write a manual profile.",
                );
              })
            }
          />
          {authError && (
            <div className="notice">
              <Info size={15} />
              <p>
                Sign in to your workspace to save campaigns.{" "}
                <a href="/login" target="_top">
                  Sign in to workspace
                </a>
              </p>
            </div>
          )}
        </Modal>
      )}
      {modal === "settings" && (
        <Modal
          title="Campaign settings"
          subtitle="Choose your audience, goals and generation preferences."
          onClose={() => !busy && setModal(null)}
        >
          <CampaignForm
            project={active}
            busy={!!busy}
            onSubmit={(input) =>
              run("Saving campaign settings", async () => {
                await patch(input);
                setModal(null);
                notify("Campaign settings saved");
              })
            }
          />
        </Modal>
      )}
      {modal === "evidence" && (
        <Modal
          title="Bring the evidence."
          subtitle="Import a real ad from an official public library."
          onClose={() => !busy && setModal(null)}
        >
          <EvidenceForm
            project={active}
            busy={!!busy}
            onSubmit={(e) =>
              run("Importing competitor ad", async () => {
                await patch({ evidence: [...active.evidence, e] });
                setModal(null);
                notify("Ad evidence saved. Refresh the report to include it.");
              })
            }
          />
        </Modal>
      )}
      {modal === "search" && (
        <Modal
          title="Find your next idea"
          subtitle="Search campaigns and creative headlines."
          onClose={() => setModal(null)}
        >
          <label className="search-modal-input">
            <Search size={20} />
            <input
              autoFocus
              aria-label="Search workspace"
              placeholder="Search your workspace…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="search-results">
            {displayed
              .filter((p) =>
                [p.title, p.description, ...p.creatives.map((c) => c.headline)]
                  .join(" ")
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    openProject(p);
                    setModal(null);
                  }}
                >
                  <span className="stat-icon purple">
                    <Folders size={18} />
                  </span>
                  <div>
                    <strong>{p.title}</strong>
                    <small>
                      {p.creatives.length} creatives · {p.goal}
                    </small>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              ))}
          </div>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="A better ad starts with a signal."
          subtitle="Your guide from business knowledge to ready-to-use creatives."
          onClose={() => setModal(null)}
        >
          <div className="help-steps">
            {[
              [
                "01",
                "Know the business",
                "Create a campaign. Research several website pages or enter details manually. Correct the profile and confirm it.",
              ],
              [
                "02",
                "Read the market",
                "Verify competitors. Open public ad libraries and import source-linked ads with visual and messaging notes.",
              ],
              [
                "03",
                "Find your direction",
                "Build the insights report, propose a brief, edit the concepts and approve your favourites.",
              ],
              [
                "04",
                "Make it yours",
                "Choose formats, generate branded layouts, refine copy and colours, and review quality warnings.",
              ],
              [
                "05",
                "Take it to the world",
                "Approve final creatives and download PNG/JPG images, copy, research and provenance.",
              ],
            ].map(([n, title, text]) => (
              <div key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
            <div className="note">
              This version creates static image ads. It does not publish
              campaigns, measure ad performance, or guarantee policy approval.
            </div>
          </div>
        </Modal>
      )}
      {current && (
        <Modal
          wide
          title="Make it unmistakably yours."
          subtitle={`${LABELS[current.platform]} · ${current.width} × ${current.height} · Version ${current.version}${viewingDemo ? " · Fictional sample" : ""}`}
          onClose={() => !busy && setSelected(null)}
        >
          <CreativeEditor
            key={`${current.id}-${current.version}-${active.revision}`}
            creative={current}
            project={active}
            logo={logos[active.logoId]}
            busy={!!busy}
            onSave={(c) =>
              run("Saving creative version", async () => {
                await patch({
                  creatives: active.creatives.map((x) =>
                    x.id === c.id ? c : x,
                  ),
                });
                notify("Creative saved");
              })
            }
            onRewrite={(feedback) => {
              if (viewingDemo) {
                notify("Create a real campaign to use AI revisions.");
                return;
              }
              run("Revising creative copy", async () => {
                const p = await api<Project>(
                  `projects/${active.id}/rewrite`,
                  "POST",
                  { creativeId: current.id, feedback },
                );
                put(p);
                notify("New version saved");
              });
            }}
            onExport={(type) =>
              run("Exporting creative", async () => {
                await exportCreative(current, active, type);
                notify("Creative downloaded");
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}

function libraryUrl(platform: Platform, name: string) {
  if (platform === "google")
    return `https://adstransparency.google.com/?region=anywhere&search=${encodeURIComponent(name)}`;
  if (platform === "meta")
    return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(name)}&search_type=keyword_unordered`;
  return `https://www.linkedin.com/ad-library/search?keyword=${encodeURIComponent(name)}`;
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function CampaignForm({
  project,
  busy,
  onSubmit,
}: {
  project?: Project;
  busy: boolean;
  onSubmit: (p: Partial<Project>) => void;
}) {
  const [value, setValue] = useState(
    () =>
      project ||
      blankProject({ title: "", platforms: ["linkedin", "meta", "google"] }),
  );
  const change = (key: string, v: unknown) =>
    setValue((p) => ({ ...p, [key]: v }));
  return (
    <form
      className="campaign-form"
      onSubmit={(e) => {
        e.preventDefault();
        const keys = [
          "title",
          "website",
          "description",
          "audience",
          "goal",
          "language",
          "region",
          "avoid",
          "disclaimer",
          "platforms",
          "ratios",
          "variations",
        ] as const;
        onSubmit(
          Object.fromEntries(
            keys.map((k) => [k, value[k]]),
          ) as Partial<Project>,
        );
      }}
    >
      <Field label="Campaign name">
        <input
          required
          maxLength={150}
          placeholder="e.g. Q4 product launch"
          value={value.title}
          onChange={(e) => change("title", e.target.value)}
        />
      </Field>
      <Field
        label="Business website"
        hint="No website? Describe your business below instead."
      >
        <div className="input-with-icon">
          <Globe size={15} />
          <input
            type="url"
            placeholder="https://yourbusiness.com"
            value={value.website}
            onChange={(e) => change("website", e.target.value)}
          />
        </div>
      </Field>
      <Field label="What does your business do?">
        <textarea
          required={!value.website}
          rows={3}
          maxLength={12000}
          placeholder="Your products, benefits and the customers you serve…"
          value={value.description}
          onChange={(e) => change("description", e.target.value)}
        />
      </Field>
      <Field label="Target audience">
        <input
          placeholder="e.g. Operations leaders at mid-market SaaS companies"
          value={value.audience}
          maxLength={2000}
          onChange={(e) => change("audience", e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label="Campaign goal">
          <select
            value={value.goal}
            onChange={(e) => change("goal", e.target.value)}
          >
            {[
              "Demo bookings",
              "Lead generation",
              "Webinar signups",
              "Content downloads",
              "Brand awareness",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Creative language">
          <input
            required
            value={value.language}
            maxLength={80}
            onChange={(e) => change("language", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Target region">
        <input
          required
          value={value.region}
          maxLength={150}
          onChange={(e) => change("region", e.target.value)}
        />
      </Field>
      <span className="field-label">Platforms</span>
      <div className="platform-choices">
        {PLATFORMS.map((p) => (
          <button
            type="button"
            key={p}
            className={value.platforms.includes(p) ? "selected" : ""}
            onClick={() =>
              change(
                "platforms",
                value.platforms.includes(p)
                  ? value.platforms.filter((x) => x !== p)
                  : [...value.platforms, p],
              )
            }
          >
            <PlatformMark platform={p} />
            {LABELS[p]}
            {value.platforms.includes(p) && <Check size={13} />}
          </button>
        ))}
      </div>
      <details>
        <summary>Campaign constraints</summary>
        <div className="stack">
          <Field
            label="Words or claims to avoid"
            hint="Separate phrases with commas."
          >
            <input
              value={value.avoid}
              maxLength={1000}
              onChange={(e) => change("avoid", e.target.value)}
              placeholder="e.g. guaranteed, best in the world"
            />
          </Field>
          <Field
            label="Mandatory disclaimer"
            hint="Up to 115 characters; appears on each creative."
          >
            <input
              value={value.disclaimer}
              maxLength={115}
              onChange={(e) => change("disclaimer", e.target.value)}
            />
          </Field>
        </div>
      </details>
      <div className="form-footer">
        <span>
          <ShieldCheck size={14} />
          Your campaign stays private.
        </span>
        <button
          className="button primary"
          disabled={busy || !value.platforms.length}
          type="submit"
        >
          {busy ? (
            <Loader2 size={15} className="spin" />
          ) : (
            <Sparkles size={15} />
          )}{" "}
          {project ? "Save settings" : "Create campaign"}
          <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
function ProfileEditor({
  project,
  onSave,
  busy,
}: {
  project: Project;
  onSave: (p: Profile, next?: boolean) => void;
  busy: boolean;
}) {
  const [p, setP] = useState(project.profile!);
  const change = (key: string, v: unknown) =>
    setP((p) => ({ ...p, [key]: v, confirmed: false }));
  return (
    <form
      className="profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...p, confirmed: false });
      }}
    >
      <div className="row spread">
        <span className="eyebrow">BUSINESS PROFILE</span>
        <Badge kind={p.confirmed ? "green" : "amber"}>
          {p.confirmed ? <Check size={11} /> : <Clock3 size={11} />}{" "}
          {p.confirmed ? "Confirmed" : "Awaiting your review"}
        </Badge>
      </div>
      <div className="form-grid">
        <Field label="Brand name">
          <input
            required
            value={p.name}
            maxLength={100}
            onChange={(e) => change("name", e.target.value)}
          />
        </Field>
        <Field label="Industry / B2B segment">
          <input
            value={p.industry}
            maxLength={150}
            onChange={(e) => change("industry", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Business description">
        <textarea
          rows={4}
          value={p.description}
          maxLength={3000}
          onChange={(e) => change("description", e.target.value)}
        />
      </Field>
      <Field label="Target customers">
        <textarea
          rows={2}
          value={p.audience}
          maxLength={1000}
          onChange={(e) => change("audience", e.target.value)}
        />
      </Field>
      <Field
        label="Value propositions"
        hint="One benefit per line. Use only factual, verifiable statements."
      >
        <textarea
          rows={3}
          value={p.valueProps.join("\n")}
          onChange={(e) =>
            change("valueProps", e.target.value.split("\n").slice(0, 8))
          }
        />
      </Field>
      <Field label="Tone of voice">
        <input
          value={p.tone}
          maxLength={300}
          onChange={(e) => change("tone", e.target.value)}
        />
      </Field>
      <span className="field-label">Brand palette</span>
      <div className="color-picker-row">
        {p.colors.map((c, i) => (
          <label key={i}>
            <input
              type="color"
              aria-label={`Brand colour ${i + 1}`}
              value={c}
              onChange={(e) =>
                change(
                  "colors",
                  p.colors.map((x, j) => (i === j ? e.target.value : x)),
                )
              }
            />
            <span>{c.toUpperCase()}</span>
          </label>
        ))}
      </div>
      <div className="claims">
        <span className="field-label">Verified proof points</span>
        {p.claims.length ? (
          p.claims.map((c, i) => (
            <div className="claim" key={i}>
              <ShieldCheck size={15} />
              <div>
                <strong>{c.text}</strong>
                <small>
                  Source: {c.sourceId} · “{c.quote}”
                </small>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Remove claim"
                onClick={() =>
                  change(
                    "claims",
                    p.claims.filter((_, j) => i !== j),
                  )
                }
              >
                <X size={13} />
              </button>
            </div>
          ))
        ) : (
          <p className="muted tiny">
            No sourced statistics or testimonials found. Ad copy will avoid
            unsupported proof.
          </p>
        )}
      </div>
      <div className="form-footer">
        <button type="submit" className="button secondary" disabled={busy}>
          Save changes
        </button>
        <button
          type="button"
          className="button primary"
          disabled={busy || !p.name || !p.description}
          onClick={() => onSave({ ...p, confirmed: true }, true)}
        >
          <Check size={15} />
          Confirm profile <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
function CompetitorsEditor({
  project,
  busy,
  onSave,
}: {
  project: Project;
  busy: boolean;
  onSave: (c: Project["competitors"]) => void;
}) {
  const [competitors, setCompetitors] = useState(project.competitors);
  const update = (i: number, key: string, value: string) =>
    setCompetitors((c) =>
      c.map((x, j) => (i === j ? { ...x, [key]: value } : x)),
    );
  return (
    <form
      className="competitor-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(competitors);
      }}
    >
      {competitors.map((c, i) => (
        <div className="competitor-edit" key={c.id}>
          <span className="competitor-number">
            {String(i + 1).padStart(2, "0")}
          </span>
          <Field label="Business name">
            <input
              required
              value={c.name}
              maxLength={100}
              onChange={(e) => update(i, "name", e.target.value)}
            />
          </Field>
          <Field label="Website">
            <input
              type="url"
              placeholder="https://"
              value={c.url}
              maxLength={1000}
              onChange={(e) => update(i, "url", e.target.value)}
            />
          </Field>
          <Field label="Relationship">
            <select
              value={c.type}
              onChange={(e) => update(i, "type", e.target.value)}
            >
              <option value="direct">Direct</option>
              <option value="indirect">Indirect</option>
              <option value="aspirational">Aspirational</option>
            </select>
          </Field>
          <button
            type="button"
            className="icon-button remove-competitor"
            aria-label={`Remove ${c.name || "competitor"}`}
            onClick={() =>
              setCompetitors((x) => x.filter((y) => y.id !== c.id))
            }
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      {!competitors.length && (
        <Empty
          icon={ScanEye}
          title="Who else is in the conversation?"
          text="Add three to ten competitors, or use the agent to suggest a starting list."
        />
      )}
      <div className="row spread wrap">
        <button
          type="button"
          className="button secondary"
          disabled={competitors.length >= 10}
          onClick={() =>
            setCompetitors((c) => [
              ...c,
              { id: newId(), name: "", url: "", type: "direct" },
            ])
          }
        >
          <Plus size={14} />
          Add competitor
        </button>
        <div className="row">
          {project.competitorsConfirmed && (
            <Badge kind="green">
              <Check size={12} />
              List confirmed
            </Badge>
          )}
          <button type="submit" className="button secondary" disabled={busy}>
            Save list
          </button>
        </div>
      </div>
    </form>
  );
}
function EvidenceForm({
  project,
  busy,
  onSubmit,
}: {
  project: Project;
  busy: boolean;
  onSubmit: (e: Evidence) => void;
}) {
  const [e, setE] = useState<Evidence>({
    id: "",
    competitor: project.competitors[0]?.name || "",
    platform: "linkedin",
    sourceUrl: "",
    headline: "",
    body: "",
    cta: "",
    visual: "",
    started: "",
    region: project.region,
    importedAt: "",
  });
  const set = (key: string, value: string) =>
    setE((x) => ({ ...x, [key]: value }));
  return (
    <form
      className="campaign-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...e, id: newId(), importedAt: new Date().toISOString() });
      }}
    >
      <div className="form-grid">
        <Field label="Competitor">
          <input
            list="competitors-list"
            required
            value={e.competitor}
            maxLength={100}
            onChange={(x) => set("competitor", x.target.value)}
          />
          <datalist id="competitors-list">
            {project.competitors.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </datalist>
        </Field>
        <Field label="Platform">
          <select
            value={e.platform}
            onChange={(x) => set("platform", x.target.value)}
          >
            {PLATFORMS.map((p) => (
              <option value={p} key={p}>
                {LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label="Official ad-library URL"
        hint="Use an exact ad page from Google, Meta or LinkedIn."
      >
        <input
          required
          type="url"
          value={e.sourceUrl}
          onChange={(x) => set("sourceUrl", x.target.value)}
          placeholder="https://www.linkedin.com/ad-library/detail/…"
        />
      </Field>
      <Field label="Ad headline">
        <input
          required
          value={e.headline}
          maxLength={500}
          onChange={(x) => set("headline", x.target.value)}
        />
      </Field>
      <Field label="Ad body text">
        <textarea
          rows={3}
          value={e.body}
          maxLength={3000}
          onChange={(x) => set("body", x.target.value)}
        />
      </Field>
      <Field
        label="Visual observations"
        hint="Describe what you actually see: layout, colours, imagery, text and logo placement."
      >
        <textarea
          rows={3}
          value={e.visual}
          maxLength={2500}
          onChange={(x) => set("visual", x.target.value)}
          placeholder="e.g. Dark background, product screenshot on the right, short headline on the left…"
        />
      </Field>
      <div className="form-grid">
        <Field label="Call to action">
          <input
            value={e.cta}
            maxLength={100}
            onChange={(x) => set("cta", x.target.value)}
          />
        </Field>
        <Field label="Start date (if public)">
          <input
            type="date"
            value={e.started}
            onChange={(x) => set("started", x.target.value)}
          />
        </Field>
      </div>
      <Field label="Region">
        <input
          value={e.region}
          maxLength={100}
          onChange={(x) => set("region", x.target.value)}
        />
      </Field>
      <div className="form-footer">
        <span>
          <Link2 size={14} />
          Observations stay linked to the source.
        </span>
        <button type="submit" className="button primary" disabled={busy}>
          <Plus size={15} />
          Import ad evidence
        </button>
      </div>
    </form>
  );
}
function ConceptCard({
  concept,
  project,
  busy,
  onSave,
}: {
  concept: Concept;
  project: Project;
  busy: boolean;
  onSave: (c: Concept) => void;
}) {
  const [value, setValue] = useState(concept);
  return (
    <div className={`concept-card ${concept.approved ? "approved" : ""}`}>
      <div className="row spread">
        <span className="platform-label">
          <PlatformMark platform={concept.platform} />
          {LABELS[concept.platform]}
        </span>
        <Badge kind="purple">{concept.angle}</Badge>
      </div>
      <h3>{concept.title}</h3>
      <h4>“{concept.headline}”</h4>
      <p>{concept.body}</p>
      <div className="concept-visual">
        <Palette size={14} />
        <span>{concept.visual}</span>
      </div>
      <small>WHY THIS DIRECTION</small>
      <p className="muted tiny">{concept.rationale}</p>
      <div className="row wrap">
        {concept.insightIds.map((id) => (
          <Badge
            key={id}
            kind={
              project.report?.insights.find((i) => i.id === id)?.evidenceIds
                .length
                ? "green"
                : "amber"
            }
          >
            {project.report?.insights.find((i) => i.id === id)?.evidenceIds
              .length
              ? "Evidence-linked"
              : "Hypothesis"}
          </Badge>
        ))}
      </div>
      <details>
        <summary>Edit this concept</summary>
        <Field label="Headline">
          <input
            value={value.headline}
            maxLength={100}
            onChange={(e) =>
              setValue((x) => ({
                ...x,
                headline: e.target.value,
                approved: false,
              }))
            }
          />
        </Field>
        <Field label="Supporting copy">
          <textarea
            value={value.body}
            maxLength={145}
            onChange={(e) =>
              setValue((x) => ({ ...x, body: e.target.value, approved: false }))
            }
          />
        </Field>
        <Field label="Call to action">
          <input
            value={value.cta}
            maxLength={24}
            onChange={(e) =>
              setValue((x) => ({ ...x, cta: e.target.value, approved: false }))
            }
          />
        </Field>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => onSave(value)}
        >
          Save concept
        </button>
      </details>
      <button
        className={`button ${concept.approved ? "approved-button" : "secondary"}`}
        disabled={busy}
        onClick={() => onSave({ ...value, approved: !concept.approved })}
      >
        <Check size={15} />
        {concept.approved ? "Approved · click to unapprove" : "Approve concept"}
      </button>
    </div>
  );
}
function GenerationSettings({
  project,
  busy,
  onSave,
}: {
  project: Project;
  busy: boolean;
  onSave: (p: Partial<Project>) => void;
}) {
  const [ratios, setRatios] = useState(project.ratios),
    [variations, setVariations] = useState(project.variations);
  return (
    <div className="generation-settings">
      <div>
        <span className="field-label">Image formats</span>
        <div className="ratio-choices">
          {Object.entries(FORMAT_SPECS).map(([ratio, spec]) => (
            <button
              key={ratio}
              className={ratios.includes(ratio) ? "selected" : ""}
              onClick={() =>
                setRatios((r) =>
                  r.includes(ratio)
                    ? r.filter((x) => x !== ratio)
                    : [...r, ratio],
                )
              }
            >
              <span
                className="ratio-icon"
                style={{
                  aspectRatio: String(spec.width / spec.height),
                  width: ratio === "1.91:1" ? 25 : ratio === "9:16" ? 13 : 20,
                }}
              />
              {spec.label}
              <small>{ratio}</small>
              {ratios.includes(ratio) && <Check size={12} />}
            </button>
          ))}
        </div>
        <small className="muted">
          LinkedIn skips 9:16. Google portrait/story assets need a compatible
          placement such as Demand Gen.
        </small>
      </div>
      <div className="variation-select">
        <Field label="Variations per concept">
          <select
            value={variations}
            onChange={(e) => setVariations(Number(e.target.value))}
          >
            {[1, 2, 3].map((n) => (
              <option value={n} key={n}>
                {n} {n === 1 ? "variation" : "variations"}
              </option>
            ))}
          </select>
        </Field>
        <button
          className="button secondary"
          disabled={busy || !ratios.length}
          onClick={() => onSave({ ratios, variations })}
        >
          Save choices
        </button>
      </div>
    </div>
  );
}
function CreativeEditor({
  creative,
  project,
  logo,
  busy,
  onSave,
  onRewrite,
  onExport,
}: {
  creative: Creative;
  project: Project;
  logo?: string;
  busy: boolean;
  onSave: (c: Creative) => void;
  onRewrite: (feedback: string) => void;
  onExport: (type: "png" | "jpg") => void;
}) {
  const [value, setValue] = useState(creative),
    [feedback, setFeedback] = useState(""),
    [tab, setTab] = useState("Edit design");
  const validation = checks(value, project),
    blocked = validation.some((x) => x.level === "error"),
    dirty = ["headline", "body", "cta", "color", "style"].some(
      (k) => (value as any)[k] !== (creative as any)[k],
    );
  const concept = project.concepts.find((c) => c.id === creative.conceptId);
  return (
    <div className="editor-layout">
      <div className="editor-preview">
        <div className="editor-art">
          <Art creative={value} project={project} logo={logo} />
        </div>
        <div className="row spread">
          <span>
            <PlatformMark platform={creative.platform} />{" "}
            {LABELS[creative.platform]} · {creative.ratio}
          </span>
          <Badge kind={creative.status === "approved" ? "green" : "neutral"}>
            {creative.status === "approved" ? "Approved" : "In review"}
          </Badge>
        </div>
        <div className="concept-note">
          <Sparkles size={15} />
          <p>
            <strong>{concept?.title}</strong>
            {concept?.rationale ||
              "Review the business profile and brief before using this creative."}
          </p>
        </div>
      </div>
      <div className="editor-controls">
        <div className="editor-tabs">
          {["Edit design", "Quality checks", "History"].map((t) => (
            <button
              key={t}
              className={t === tab ? "selected" : ""}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "Edit design" ? (
          <div className="edit-form">
            <Field label={`Headline · ${value.headline.length}/100`}>
              <textarea
                rows={3}
                value={value.headline}
                maxLength={100}
                onChange={(e) =>
                  setValue((c) => ({ ...c, headline: e.target.value }))
                }
              />
            </Field>
            <Field label={`Supporting copy · ${value.body.length}/145`}>
              <textarea
                rows={2}
                value={value.body}
                maxLength={145}
                onChange={(e) =>
                  setValue((c) => ({ ...c, body: e.target.value }))
                }
              />
            </Field>
            <Field label="Call to action">
              <input
                value={value.cta}
                maxLength={24}
                onChange={(e) =>
                  setValue((c) => ({ ...c, cta: e.target.value }))
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="Background colour">
                <div className="editor-color">
                  <input
                    type="color"
                    value={value.color}
                    onChange={(e) =>
                      setValue((c) => ({ ...c, color: e.target.value }))
                    }
                  />
                  <span>{value.color}</span>
                </div>
              </Field>
              <Field label="Visual treatment">
                <select
                  value={value.style}
                  onChange={(e) =>
                    setValue((c) => ({ ...c, style: Number(e.target.value) }))
                  }
                >
                  {["Orbital", "Momentum", "Intersect", "Perspective"].map(
                    (s, i) => (
                      <option value={i} key={s}>
                        {s}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>
            <div className="row spread">
              <button
                className="button secondary"
                disabled={busy || !dirty || !value.headline || !value.cta}
                onClick={() => onSave(value)}
              >
                Save new version
              </button>
              <button
                className="button primary"
                disabled={busy || dirty || blocked}
                onClick={() =>
                  onSave({
                    ...value,
                    status: value.status === "approved" ? "review" : "approved",
                  })
                }
              >
                <Check size={14} />
                {value.status === "approved"
                  ? "Return to review"
                  : "Approve creative"}
              </button>
            </div>
            <div className="rewrite-box">
              <span className="eyebrow">
                <Sparkles size={13} />
                REFINE WITH AI
              </span>
              <textarea
                aria-label="AI revision instructions"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={2000}
                placeholder="e.g. Make the headline more concise and focus on operations leaders…"
                rows={2}
              />
              <button
                className="text-button"
                disabled={busy || feedback.trim().length < 3 || dirty}
                onClick={() => onRewrite(feedback)}
              >
                Revise the copy <ArrowRight size={14} />
              </button>
              <small>
                For layout and colour changes, use the direct design controls.
              </small>
            </div>
          </div>
        ) : tab === "Quality checks" ? (
          <div className="checklist">
            {validation.map((c) => (
              <div key={c.label} className={c.level}>
                {c.level === "pass" ? (
                  <CheckCircle2 size={17} />
                ) : c.level === "error" ? (
                  <X size={17} />
                ) : (
                  <TriangleAlert size={17} />
                )}
                <div>
                  <strong>{c.label}</strong>
                  <p>{c.detail}</p>
                </div>
              </div>
            ))}
            <div className="note">
              PNG/JPG file size is checked at export. Automated checks cannot
              establish full factual accuracy, trademark clearance or platform
              approval.
            </div>
          </div>
        ) : (
          <div className="history-list">
            <div className="history-current">
              <CheckCircle2 size={17} />
              <span>Version {creative.version} · current</span>
            </div>
            {[...creative.history].reverse().map((v) => (
              <div key={v.version}>
                <span>
                  <strong>Version {v.version}</strong>
                  <small>
                    {fmt(v.savedAt)} · {v.headline}
                  </small>
                </span>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    setValue((c) => ({
                      ...c,
                      headline: v.headline,
                      body: v.body,
                      cta: v.cta,
                      color: v.color,
                      style: v.style,
                    }));
                    setTab("Edit design");
                  }}
                >
                  Restore
                </button>
              </div>
            ))}
            {!creative.history.length && (
              <p className="muted">
                Your next saved edit will appear here. Earlier versions stay
                available.
              </p>
            )}
          </div>
        )}
        <div className="editor-download">
          <button
            className="button secondary"
            disabled={busy || blocked || dirty}
            onClick={() => onExport("png")}
          >
            <Download size={14} />
            PNG
          </button>
          <button
            className="button secondary"
            disabled={busy || blocked || dirty}
            onClick={() => onExport("jpg")}
          >
            <Download size={14} />
            JPG
          </button>
          <span>
            Review policy warnings
            <br />
            before publishing.
          </span>
        </div>
      </div>
    </div>
  );
}
function BrandKit({
  project,
  logos,
  busy,
  onUpload,
  onLogo,
}: {
  project: Project;
  logos: Record<string, string>;
  busy: boolean;
  onUpload: (f: File) => void;
  onLogo: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="two-col">
      <section className="panel padded">
        <div className="row spread">
          <div>
            <span className="eyebrow">BRAND IDENTITY</span>
            <h2>{project.profile?.name || project.title}</h2>
          </div>
          <Badge kind={project.id === "demo" ? "purple" : "green"}>
            {project.id === "demo" ? "Sample brand" : "Campaign brand"}
          </Badge>
        </div>
        <div className="brand-palette">
          {(project.profile?.colors || ["#6e56cf", "#163d35", "#e9eece"]).map(
            (c) => (
              <div key={c}>
                <span style={{ background: c }} />
                <strong>{c.toUpperCase()}</strong>
                <small>Brand colour</small>
              </div>
            ),
          )}
        </div>
        <div className="brand-voice">
          <small>TONE OF VOICE</small>
          <h3>
            {project.profile?.tone ||
              "Add your brand voice in the business profile"}
          </h3>
          <p>{project.profile?.description || project.description}</p>
        </div>
        <div className="notice">
          <Palette size={16} />
          <p>
            Palette and tone are editable in the Business Profile. Custom font
            uploads are not available in this version; creatives use readable
            system typography.
          </p>
        </div>
      </section>
      <section className="panel padded">
        <h2>Your brand assets</h2>
        <p className="muted">
          Logos, product screenshots and guidelines. Only upload assets you have
          permission to use.
        </p>
        <input
          ref={input}
          type="file"
          className="hidden"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <button
          className="upload-zone"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <span>
            <Upload size={23} />
          </span>
          <strong>Give your brand a home.</strong>
          <p>Click to upload PNG, JPG, WebP or PDF</p>
          <small>Up to 4 MB · 30 assets per campaign</small>
        </button>
        <div className="asset-list">
          {project.assets.map((a) => (
            <div key={a.id}>
              {a.mime.startsWith("image/") ? (
                <img src={logos[a.id] || `/api/assets/${a.id}`} alt={a.name} />
              ) : (
                <FileText size={23} />
              )}
              <div>
                <strong>{a.name}</strong>
                <small>
                  {Math.ceil(a.size / 1024)} KB · {a.mime}
                </small>
              </div>
              {a.mime.startsWith("image/") ? (
                <button
                  className="button secondary"
                  disabled={busy || a.id === project.logoId}
                  onClick={() => onLogo(a.id)}
                >
                  {a.id === project.logoId ? "Current logo" : "Use as logo"}
                </button>
              ) : (
                <a
                  href={`/api/assets/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="icon-button"
                  aria-label={`Open ${a.name}`}
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
