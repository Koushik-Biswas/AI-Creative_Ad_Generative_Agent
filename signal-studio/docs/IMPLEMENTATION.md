# Implementation and remaining requirements

This is a functional first release, not completion of every acceptance criterion in the October 2026 PRD.

| Area | Included | Remaining work / dependency |
| --- | --- | --- |
| Projects and campaign input | Persistent, account-owned campaigns; URL or manual input; goals, audiences, language, region, exclusions, disclaimers; input duplication | Agency membership, roles and shared approvals |
| Business research | Up to four same-site HTML pages; sourced text; structured Groq extraction; editable, confirmed business profile; quoted claim validation | Browser-rendered crawling, robust external stylesheet/font/logo discovery, richer business classification |
| Branding | Editable palette and tone; private logo/screenshot/PDF uploads; logo selection and rendering | Custom fonts, brand-guideline parsing, free-position canvas editing |
| Competitors | Three-to-five model suggestions, manual list of up to ten, relationship classification and confirmation | Suggestions are not live search verification; user must verify names and URLs |
| Ad research | Official Google/Meta/LinkedIn links, validated source-linked imports, visual notes, messaging analysis, coverage reporting, optional authorized collector API contract | No built-in universal scraper or pre-authorized access to the three libraries; pixel-level vision analysis is not connected |
| Insights | Evidence-linked platform patterns and opportunities; explicit hypotheses when no evidence; no performance claims | Market-wide saturation requires enough representative data; estimates are not confirmed performance |
| Brief | Platform-specific concepts, editable headline/body/CTA, approval gates, differentiation rationale | Reordering and richer visual-direction editing |
| Image generation | Precise vector composition and raster export; original abstract imagery, uploaded logo, configured variations and formats | Diffusion/photo generation is not connected; current layout system does not implement arbitrary art direction |
| Review | Direct copy, palette and treatment controls; AI copy revisions; favourites; approval; server-owned version history and restore | Full drag/drop design editor and richer per-element editing |
| Formats | Square 1200×1200, landscape 1200×628, portrait 1440×1800, story 1080×1920; placement-aware margins; LinkedIn excludes story | Must select compatible placements in ad managers; no guarantee every ratio is accepted by every placement; specs must be reviewed regularly |
| Export | Browser PNG/JPG and ZIP; shareable HTML report; JSON copy, checklist and provenance; Python PNG/JPG and ZIP endpoints | No DOCX/PDF export; full platform-specific companion copy variants and rules need expansion |
| Compliance | File/dimension checks; numeric-claim, excluded phrase and competitor-name checks; warnings and human approval | Automated screening is partial; semantic claim validation, copyright clearance and full policy compliance are not established |
| Workspace | SQLite WAL and a persistent disk in this portable package; revision conflict prevention; evidence snapshots | Billing, granular team permissions, bulk queues, continuous monitoring and enterprise scaling |

## Runtime distinction

This portable package runs standard Next.js with a Python/FastAPI backend. It does not require Cloudflare, D1, R2 or ChatGPT sign-in. Render can run the full stack in one Docker service, or Vercel can host the frontend while Python runs on Render. Credentials are supplied through runtime environment variables. The separately hosted ChatGPT demo uses a different adapter and is not the runtime in this ZIP.

The single-owner workspace uses a password and signed HTTP-only session cookie. This is not an agency/team role system. The Python service requires a shared gateway token before trusting the account identity sent by Next.js.

## Security boundaries

- Gateway APIs verify a signed session cookie; Python verifies its service token and checks ownership on every data operation.
- The Python backend requires a constant-time-verified `SERVICE_TOKEN` before trusting `X-User-Id`. Keep it behind the Site gateway. `DEV_AUTH=1` is for isolated local tests only.
- Website acquisition rejects private destinations and validates every redirect. Python pins each connection to its validated DNS result; the portable package does not include an edge crawler.
- LLM inputs are treated as untrusted content. Runtime contracts are validated, with one bounded retry. Exact quote matching filters extracted claims. This does not prove broader semantic factual accuracy.
- Asset uploads have type/signature and size checks. SVG upload is rejected. User assets never enter a public asset bucket.
- Creative edits preserve earlier versions. Every generated batch keeps its research/profile/brief snapshot in `contexts`.
- SQLite is intended for a single Python service instance with a mounted persistent volume. For multiple replicas, migrate storage to managed PostgreSQL/object storage and add a durable worker queue.

## Official references

Specs are indicative defaults, reviewed 25 October 2026. Recheck before paid campaigns.

- [Groq structured outputs and JSON object mode](https://console.groq.com/docs/structured-outputs)
- [Google responsive display best practices](https://support.google.com/google-ads/answer/9823397?hl=en)
- [LinkedIn Single Image specifications](https://business.linkedin.com/advertise/ads/sponsored-content/single-image-ads-specs)
- [Meta minimum image sizes](https://www.facebook.com/business/help/469767027114079)
- [LinkedIn Ad Library coverage](https://www.linkedin.com/help/linkedin/answer/a1517918)
- [Meta Ad Library API access and scope](https://www.facebook.com/ads/library/api/)
