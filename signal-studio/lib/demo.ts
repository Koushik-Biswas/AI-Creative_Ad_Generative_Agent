import {
  blankProject,
  type Project,
  type Creative,
  type Platform,
} from "./types";

const when = "2026-10-25T10:00:00.000Z";
export function getDemo(): Project {
  const headlines = [
    "Less busywork.\nMore momentum.",
    "Your team's next\nbig move starts here.",
    "Bring your work\ninto orbit.",
    "Great work.\nOne clear view.",
  ];
  const platforms: Platform[] = ["linkedin", "meta", "google", "linkedin"];
  return blankProject({
    id: "demo",
    title: "Orbit · Make work flow",
    website: "https://example.com",
    description: "A fictional project management workspace for growing teams.",
    audience: "Operations leaders at growing B2B teams",
    profile: {
      name: "orbit",
      description:
        "A fictional project management workspace that brings projects, conversations and priorities together.",
      audience: "Operations leaders at growing B2B teams",
      industry: "B2B SaaS · Work management",
      valueProps: [
        "Bring projects and priorities together",
        "Give your team a clearer view",
        "Make room for meaningful work",
      ],
      tone: "Clear, confident and human",
      colors: ["#6e56cf", "#163d35", "#e9eece"],
      claims: [],
      confirmed: true,
    },
    competitorsConfirmed: true,
    competitors: [
      { id: "d1", name: "Taskwell (fictional)", url: "", type: "direct" },
      { id: "d2", name: "Flowbase (fictional)", url: "", type: "direct" },
      { id: "d3", name: "Planly (fictional)", url: "", type: "indirect" },
    ],
    report: {
      generatedAt: when,
      summary:
        "Illustrative sample: competitors lead with feature lists. A calmer, outcome-led direction offers a distinct creative hypothesis. This is fictional demonstration data, not live market research.",
      coverage: platforms
        .slice(0, 3)
        .map((platform) => ({
          platform,
          status: "Fictional sample",
          count: 0,
        })),
      insights: [
        {
          id: "di1",
          platform: "linkedin",
          pattern: "Feature-heavy messaging",
          whitespace: "Lead with clarity and momentum",
          rationale:
            "A creative hypothesis for this fictional example; no real competitor evidence.",
          evidenceIds: [],
        },
      ],
    },
    concepts: headlines.map((headline, i) => ({
      id: `dc${i}`,
      platform: platforms[i],
      title: [
        "Make space for focus",
        "A little more momentum",
        "Work, connected",
        "A clearer perspective",
      ][i],
      angle: "Benefit-led",
      headline,
      body: "One workspace for projects, people, and everything moving you forward.",
      cta: "Explore Orbit",
      visual: "Abstract orbit forms and confident typography",
      rationale:
        "An illustrative, calm alternative to busy feature-led layouts.",
      insightIds: ["di1"],
      claimIds: [],
      approved: true,
    })),
    creatives: headlines.map(
      (headline, i): Creative => ({
        id: `dv${i}`,
        conceptId: `dc${i}`,
        platform: platforms[i],
        ratio: "1:1",
        width: 1200,
        height: 1200,
        headline,
        body: "One workspace. A world of possibilities.",
        cta: "Explore Orbit",
        color: ["#6e56cf", "#163d35", "#e9eece", "#e7ddfb"][i],
        style: i,
        version: 1,
        status: i === 0 ? "approved" : "review",
        favorite: i === 0,
        history: [],
        savedAt: when,
        createdAt: when,
      }),
    ),
    activities: [
      { text: "4 sample creatives ready to explore", at: when },
      { text: "Sample creative direction approved", at: when },
    ],
    updatedAt: when,
  });
}
