# Project Requirements: B2B Ad Creative Generator

**Document type:** Product Requirements **Version:** 1.1 (Draft) **Date:** 6 October 2026



---



## 1. Overview

### 1.1 Purpose

Build an automated agent that produces ready-to-use **image ad creatives for B2B businesses** across **Google Ads, Meta Ads (Facebook/Instagram) and LinkedIn Ads**.

The agent must first **understand the customer's business** (from their website and/or inputs), then **study what competitors are running** in public ad libraries, and only then **generate image creatives** that are on-brand, platform-correct and clearly differentiated from competitor ads.

### 1.2 Problem Statement

B2B marketers and agencies spend significant time and money on ad creatives. Most of it is guesswork: creatives look like every competitor's, ignore platform specs, and are not grounded in the actual business or the market. This product removes that guesswork by grounding every creative in business research and live competitor evidence.

### 1.3 Goals

- Turn a website URL (plus optional inputs) into a set of high-quality ad image creatives in minutes.
- Ensure each creative is **informed by competitor analysis**, not generated in isolation.
- Deliver creatives in the **correct sizes and formats** for Google, Meta and LinkedIn.
- Keep creatives **on-brand, B2B-appropriate and policy-compliant**.

### 1.4 Market Context

Several existing products already cover parts of this problem (AI ad creative generators, competitor ad research tools, and the ad platforms' own creative tools). The team should review them before building. See **Section 11: Existing Solutions to Study**.

### 1.5 Out of Scope (Version 1)

- Video, carousel-animation, or motion ad creatives
- Direct publishing / campaign creation inside ad platforms
- Campaign performance tracking and optimisation
- Ad platforms other than Google, Meta and LinkedIn
- B2C-specific creative styles



---



## 2. Target Users

| **User**                       | **Need**                                                    |
| ------------------------------ | ----------------------------------------------------------- |
| In-house B2B marketer          | Quickly produce on-brand ad creatives without a design team |
| Marketing agency               | Produce creatives for many clients at scale                 |
| Founder / small business owner | Get professional ad creatives with no marketing expertise   |



---



## 3. High-Level User Flow

1. User creates a project and provides their business website and/or business details.
2. System researches the business and presents a **Business Profile** for user confirmation.
3. System identifies competitors; user confirms or edits the list.
4. System analyses competitor ads from public ad libraries and presents a **Competitor Insights Report**.
5. System proposes a **Creative Brief** (angles, messages, visual direction, differentiation).
6. User approves or adjusts the brief and selects platforms and formats.
7. System generates image creatives per platform.
8. User reviews, requests edits or regenerations.
9. User downloads final creatives (with suggested ad copy).



---



## 4. Functional Requirements

### FR-1: Project and Business Input

| **ID** | **Requirement**                                                                                                                                                                                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-1.1 | User can create multiple projects (one per business/brand).                                                                                                                                                                                                                              |
| FR-1.2 | User can provide a **website URL** as the primary input.                                                                                                                                                                                                                                 |
| FR-1.3 | User can optionally provide extra inputs: business description, products/services, target audience (industries, job titles, company size), key offer, campaign goal (lead generation, demo bookings, webinar signups, content downloads, brand awareness), target regions and languages. |
| FR-1.4 | User can upload brand assets: logo, brand colours, fonts, product screenshots, brand guidelines, existing ad creatives.                                                                                                                                                                  |
| FR-1.5 | If no website is available, the system must still work from manual inputs alone.                                                                                                                                                                                                         |
| FR-1.6 | User can set campaign constraints: words/claims to avoid, mandatory disclaimers, tone preferences.                                                                                                                                                                                       |

### FR-2: Business Research

| **ID** | **Requirement**                                                                                                                                                                                                                                                                                                                                                                                    |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-2.1 | System must analyse the provided website (multiple pages, not just the homepage) and extract: what the business does, products/services, pricing signals, business model, value propositions, key differentiators, pain points addressed, target customers and industries, customer proof (testimonials, case studies, client logos, statistics, awards), tone of voice, and calls to action used. |
| FR-2.2 | System must extract **brand identity** from the website: logo, colour palette, typography style, imagery style, visual mood.                                                                                                                                                                                                                                                                       |
| FR-2.3 | System must classify the business: industry, sub-category, B2B segment (SaaS, services, manufacturing, fintech, etc.), and typical buying stage/sales cycle.                                                                                                                                                                                                                                       |
| FR-2.4 | System must present the findings as an editable **Business Profile**.                                                                                                                                                                                                                                                                                                                              |
| FR-2.5 | User must be able to correct, add to, or remove any item before the profile is used downstream.                                                                                                                                                                                                                                                                                                    |
| FR-2.6 | If the website cannot be accessed or has too little content, the system must tell the user clearly and request additional inputs rather than guess.                                                                                                                                                                                                                                                |
| FR-2.7 | Every claim used later in a creative (statistics, awards, customer names) must be traceable to the website or to user input. The system must not invent claims.                                                                                                                                                                                                                                    |

### FR-3: Competitor Identification

| **ID** | **Requirement**                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------ |
| FR-3.1 | System must automatically suggest **direct and indirect competitors** based on the Business Profile.   |
| FR-3.2 | User can add, remove, or replace competitors manually (by name or URL).                                |
| FR-3.3 | Competitors must be grouped as direct, indirect, or aspirational/market leaders.                       |
| FR-3.4 | A configurable minimum and maximum number of competitors is analysed per project (suggested: 3 to 10). |

### FR-4: Competitor Ad Analysis (Core Feature)

| **ID**  | **Requirement**                                                                                                                                                                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-4.1  | System must collect competitor ads from public sources: **Google Ads Transparency Center**, **Meta Ad Library**, and **LinkedIn Ad Library**.                                                                                                                          |
| FR-4.2  | For each competitor, the system must collect (where publicly available): ad image/creative, headline and body text, call to action, format and aspect ratio, platform, region, start date / how long the ad has been running, and number of active ads.                |
| FR-4.3  | System must analyse the **visual** side of each competitor creative: layout and composition, colour usage, imagery type (photo, illustration, product screenshot, abstract, people, data visualisation), text amount and placement, logo placement, and overall style. |
| FR-4.4  | System must analyse the **messaging** side: core angle (pain point, ROI, social proof, urgency, authority, feature-led, offer-led), headline patterns, CTA patterns, tone, and funnel stage.                                                                           |
| FR-4.5  | System must use **ad longevity and repetition** (ads running for a long time, many variations of the same concept) as a signal of what is likely working, and must state clearly that this is an inference, not confirmed performance data.                            |
| FR-4.6  | System must identify, per platform: **common patterns** (what everyone is doing), **saturated styles** (overused visuals and phrases), and **gaps/whitespace** (angles, styles or formats nobody is using).                                                            |
| FR-4.7  | System must produce a **Competitor Insights Report** containing: sample competitor creatives, per-competitor summary, platform-wise patterns, saturation and whitespace analysis, and clear recommendations for how the user's ads should differ.                      |
| FR-4.8  | If a competitor has no ads on a platform, or the library is unavailable or returns incomplete data, the system must report this transparently and continue with the data it has.                                                                                       |
| FR-4.9  | The analysis must be **platform-aware**: what works visually on LinkedIn (professional, proof-led) differs from Meta (scroll-stopping) and Google display (clear and simple).                                                                                          |
| FR-4.10 | The report must show the user which competitor ads influenced which recommendation (traceability).                                                                                                                                                                     |

### FR-5: Creative Brief and Strategy

| **ID** | **Requirement**                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-5.1 | Using the Business Profile and Competitor Insights, the system must generate a **Creative Brief** per platform, containing: campaign objective, target audience, 3 to 5 distinct creative angles/concepts, key message and headline direction, visual direction (style, colour, imagery, layout), CTA recommendation, and a **differentiation rationale** explaining how each concept stands apart from competitors. |
| FR-5.2 | User can approve, edit, reorder or reject concepts before generation.                                                                                                                                                                                                                                                                                                                                                |
| FR-5.3 | The brief must favour concepts that exploit competitor whitespace while staying true to the brand.                                                                                                                                                                                                                                                                                                                   |

### FR-6: Image Creative Generation

| **ID**  | **Requirement**                                                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-6.1  | System must generate image ad creatives for **Google Ads, Meta Ads and LinkedIn Ads**, each according to its own platform conventions.                                                 |
| FR-6.2  | Creatives must be generated from the approved Creative Brief, not from a generic, one-size-fits-all request.                                                                           |
| FR-6.3  | Creatives must be **on-brand**: correct logo, brand colours, typography feel, and imagery style.                                                                                       |
| FR-6.4  | Creatives must be **B2B-appropriate**: professional, credible, benefit- or proof-led, and suitable for decision makers.                                                                |
| FR-6.5  | Text on creatives (headline, sub-text, CTA, statistics) must be **accurate, spelled correctly, legible, and well placed**, within platform best practice for text-on-image.            |
| FR-6.6  | Creatives must **not copy** any competitor's ad, logo, trademark, layout or wording. They must be visibly distinct while remaining relevant.                                           |
| FR-6.7  | System must generate **multiple variations** per concept (for example different headlines, layouts, colour treatments) so the user can A/B test. Number of variations is configurable. |
| FR-6.8  | System must respect safe zones and cropping behaviour of each placement so key content is never cut off.                                                                               |
| FR-6.9  | System must not fabricate people, customer logos, testimonials, certifications, or statistics. Only verified assets and claims from the Business Profile may be used.                  |
| FR-6.10 | Each creative must carry a short note explaining the **concept and the competitor insight** behind it.                                                                                 |

### FR-7: Platform Format Support

The system must output each creative in the formats below. Specifications must be **configurable and kept current**, because platforms change them.

| **Platform**     | **Placements**                                                  | **Indicative image formats**                                       |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Google Ads**   | Responsive display, Display, Demand Gen                         | Landscape 1.91:1, Square 1:1, Portrait 4:5, optional Vertical 9:16 |
| **Meta Ads**     | Facebook and Instagram Feed, Stories, Reels cover, Right-column | Square 1:1, Portrait 4:5, Vertical 9:16, Landscape 1.91:1          |
| **LinkedIn Ads** | Single image ads in Feed                                        | Landscape 1.91:1, Square 1:1, Portrait 4:5                         |



| **ID** | **Requirement**                                                                                                                     |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| FR-7.1 | Output must meet each platform's current requirements for dimensions, aspect ratio, file type, file size, and text/logo guidelines. |
| FR-7.2 | The same concept must be adapted (not merely resized) across aspect ratios so layout remains balanced.                              |
| FR-7.3 | User can choose which platforms and formats to generate.                                                                            |
| FR-7.4 | System must flag any creative that does not meet a platform requirement before export.                                              |

### FR-8: Review, Edit and Regenerate

| **ID** | **Requirement**                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| FR-8.1 | User can view all creatives in a gallery grouped by platform, concept and format.                                                          |
| FR-8.2 | User can give feedback in plain language (for example "make it more minimal", "use blue", "change the headline") and request regeneration. |
| FR-8.3 | User can edit specific elements directly: headline, sub-text, CTA, colours, logo position.                                                 |
| FR-8.4 | User can mark creatives as approved, rejected or favourite.                                                                                |
| FR-8.5 | System must keep **version history** so the user can return to earlier versions.                                                           |
| FR-8.6 | User can request additional variations of any creative.                                                                                    |

### FR-9: Ad Copy Companion

| **ID** | **Requirement**                                                                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-9.1 | For each creative, the system must suggest matching ad copy: headlines, descriptions/primary text, and CTA, within each platform's character limits. |
| FR-9.2 | Copy must align with the creative concept and the Business Profile, and avoid unverified claims.                                                     |

### FR-10: Export and Delivery

| **ID**  | **Requirement**                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------ |
| FR-10.1 | User can download individual creatives or a complete package.                                                |
| FR-10.2 | Exports must be organised by platform, concept and format with clear file names.                             |
| FR-10.3 | Export formats must include at least PNG and JPG, within platform file-size limits.                          |
| FR-10.4 | User can export the Business Profile, Competitor Insights Report and Creative Brief as a shareable document. |
| FR-10.5 | The package must include the suggested ad copy alongside the images.                                         |

### FR-11: Compliance and Safety

| **ID**  | **Requirement**                                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-11.1 | Creatives must be checked against the **advertising policies** of Google, Meta and LinkedIn (for example prohibited claims, misleading content, excessive text, restricted categories, personal attributes targeting language). |
| FR-11.2 | System must warn the user when the business falls into a restricted or sensitive category (finance, health, legal, etc.) and apply stricter checks.                                                                             |
| FR-11.3 | System must not use competitor trademarks, logos or names in creatives.                                                                                                                                                         |
| FR-11.4 | System must avoid copyright-infringing imagery and must not reproduce competitor creatives.                                                                                                                                     |
| FR-11.5 | System must show a **policy and quality checklist** for each creative, with any warnings.                                                                                                                                       |

### FR-12: Workspace and History

| **ID**  | **Requirement**                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------- |
| FR-12.1 | Business Profile, brand kit, competitor list and past reports are saved per project and reusable. |
| FR-12.2 | User can refresh competitor analysis on demand to capture new competitor ads.                     |
| FR-12.3 | User can duplicate a project to create creatives for a new campaign or offer.                     |
| FR-12.4 | Agency users can manage multiple client projects and share projects with team members.            |



---



## 5. Non-Functional Requirements

| **Area**                       | **Requirement**                                                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**                | Business research within a few minutes; competitor analysis within a reasonable time with visible progress; first creative set delivered quickly after brief approval. Target times to be agreed.   |
| **Transparency**               | Show live progress for each stage (researching, analysing competitors, generating) so users never face a silent wait.                                                                               |
| **Accuracy**                   | No fabricated facts, names, numbers or testimonials in any output.                                                                                                                                  |
| **Quality**                    | Creatives must be professional-grade, with sharp, legible text and consistent branding.                                                                                                             |
| **Reliability**                | Graceful handling of unreachable websites, empty ad libraries, partial data and generation failures, with clear messages and retry options.                                                         |
| **Scalability**                | Support many simultaneous projects and users, including agencies running bulk work.                                                                                                                 |
| **Security and privacy**       | User data, uploaded brand assets and generated creatives are private to the account, encrypted in transit and at rest, and not shared across customers.                                             |
| **Legal and ethical data use** | Competitor data is gathered only from publicly available ad libraries and used for analysis, in line with the terms of those libraries. Competitor creatives are used as insight, never reproduced. |
| **Auditability**               | Keep a record of which sources, competitor ads and inputs informed each creative.                                                                                                                   |
| **Usability**                  | A non-designer must be able to complete the full flow without training.                                                                                                                             |
| **Accessibility**              | Interface follows accessibility standards; creatives maintain adequate text contrast.                                                                                                               |
| **Localisation**               | Support creatives and ad copy in multiple languages and regional variations.                                                                                                                        |
| **Maintainability**            | Platform specs, policy rules and ad library sources must be updatable without redesigning the product.                                                                                              |



---



## 6. Key Outputs

1. **Business Profile** (editable, confirmed by user)
2. **Competitor Insights Report** (visual and messaging analysis, saturation and whitespace)
3. **Creative Brief** (concepts, visual direction, differentiation rationale)
4. **Image Creatives** (per platform, per format, multiple variations)
5. **Suggested Ad Copy** (matched to each creative)
6. **Policy and Quality Checklist** (per creative)
7. **Export Package** (organised files plus documents)



---



## 7. Acceptance Criteria (Summary)

- Given only a website URL, the system produces a confirmed Business Profile that correctly reflects the business.
- The system retrieves and analyses competitor ads from all three ad libraries where data exists, and clearly reports where it does not.
- The Competitor Insights Report identifies concrete patterns, saturated styles and whitespace, each linked to example competitor ads.
- Every generated creative traces back to a specific concept in the approved brief and a specific competitor insight.
- No creative reproduces a competitor's ad, logo or wording.
- All exported creatives meet the stated dimensions, file types and size limits of their platform.
- All text on creatives is correct and legible, and all claims are verifiable from user-provided or website content.
- The user can regenerate, edit and version creatives without losing earlier work.
- A first-time user can go from URL to downloadable creatives without assistance.



---



## 8. Assumptions and Dependencies

- Public ad libraries remain accessible and continue to provide creative visibility. Performance data (spend, clicks, conversions) is **not** available from them, so effectiveness is inferred from longevity and repetition only.
- Library coverage varies by region and platform. Some competitors may have limited or no visible ads.
- Users own, or have rights to use, the logos and assets they supply.
- Platform specifications and ad policies change over time and must be reviewed regularly.



---



## 9. Open Questions

1. Should the user be able to choose how many competitors to analyse, or should the system decide?
2. How many concepts and variations per platform should be produced by default?
3. Is direct publishing to ad platforms planned for a later phase?
4. Which languages and regions are required at launch?
5. Is a team/agency workspace with roles and approvals needed in Version 1?
6. What pricing or usage limits (projects, creatives per month) should the product enforce?
7. Should the product support a recurring competitor watch with alerts when competitors launch new creatives?



---



## 10. Future Enhancements (Not in Version 1)

- Video and carousel creatives
- One-click publishing to Google, Meta and LinkedIn
- Performance feedback loop that learns which creatives win
- Scheduled competitor monitoring with alerts
- Additional platforms (X, TikTok, Reddit, Microsoft Ads)
- Brand-guideline enforcement and approval workflows for larger teams



---



## 11. Existing Solutions to Study

### 11.1 Why this section exists

Products already exist that do parts of what this project needs. The team should try them before building, to benchmark quality, learn from their workflows, and be clear about where this product must be better.

The descriptions below come from vendor websites and third-party roundup articles published in 2026. Features, platform coverage and pricing change quickly, so each tool must be checked directly (free trial or demo) before the team relies on this summary.

### 11.2 Closest alternatives: AI ad creative generators

| **Tool**                 | **What it does**                                                                                                                                                         | **Platforms**                             | **What to look at**                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **AdCreative.ai**        | Generates static ad images and copy; pulls logo, colours and fonts into a brand kit; builds ads from a web page; has a competitor-insights feature and creative scoring. | Meta, Google                              | The closest match to this brief. Its public pages do not explain how competitor findings shape the generated visuals, so test this closely. |
| **Atria**                | Combines an ad library and creative research with concept and copy generation.                                                                                           | Meta, TikTok                              | Research and generation in one product. Listed for Meta and TikTok only.                                                                    |
| **Hawky**                | Tracks competitor ads, analyses the user's own creative elements, plans and launches campaigns.                                                                          | Meta, Google, YouTube, TikTok, LinkedIn   | Widest platform coverage in this group by its own description. Verify real depth on Google and LinkedIn.                                    |
| **Pencil**               | Enterprise ad platform with predictive creative scoring, brand governance and multi-market production.                                                                   | Meta, Google, TikTok                      | Scoring and governance workflow.                                                                                                            |
| **Omneky**               | Generates ads from a URL, with performance optimisation and direct publishing.                                                                                           | Meta, Google, TikTok, LinkedIn, Reddit    | URL-to-ad flow and publishing.                                                                                                              |
| **Predis.ai**            | Social-first generation of visuals and captions, with competitor analysis, scheduling and publishing.                                                                    | Instagram, Facebook, LinkedIn, X          | Depth of its competitor analysis.                                                                                                           |
| **Creatopy**             | Design automation: build one ad and resize it into many variants; batch creation; team collaboration.                                                                    | Display and social formats                | Quality of adapting one concept across sizes (see FR-7.2).                                                                                  |
| **Smartly.io**           | Enterprise creative automation joined to media buying, producing large numbers of variations.                                                                            | Meta, Google, Snapchat, Pinterest, TikTok | How creative insight feeds back into production (relevant to future phases).                                                                |
| **Canva (Magic Studio)** | General design tool with text-to-image and AI copy.                                                                                                                      | General social                            | Benchmark for ease of use and editing.                                                                                                      |

Lower relevance, because they are mainly video, e-commerce or single-platform: AdStellar (Meta only), Creatify (video), QuickAds (e-commerce).

### 11.3 Competitor ad research tools

These show what competitors are running. Most analyse and organise ads but do not generate creatives.

| **Tool**                              | **What it does**                                                     | **Coverage**                                      |
| ------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| **Foreplay**                          | Saves and organises competitor ads; AI-assisted creative briefs.     | Meta and TikTok (one roundup also lists LinkedIn) |
| **BigSpy, AdSpy, Minea**              | Search and swipe files built on public ad libraries.                 | Mainly Meta, TikTok, YouTube, Pinterest           |
| **PowerAdSpy**                        | Indexes ads across many networks.                                    | 11 networks, including Google and LinkedIn        |
| **Pathmatics, AdClarity, Similarweb** | Estimate competitor ad spend, impressions and share of voice.        | Social, display, video                            |
| **SpyFu, Adbeat**                     | Ad copy history for Google search; display and native ad tracking.   | Google search; display and native                 |
| **Motion**                            | Creative performance dashboards built on the user's own ad accounts. | Meta, TikTok, YouTube, LinkedIn                   |
| **Vidmob, CreativeX**                 | Tag creative elements, score quality, check brand compliance.        | Multi-channel                                     |

### 11.4 Platform-native tools

| **Platform**                  | **What it offers**                                                                                                                                                         | **Limits**                                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Google Ads**                | Built-in image editor: generate images from text, edit uploads, replace backgrounds, crop to recommended sizes.                                                            | Works in Performance Max and Demand Gen only. Rolling out gradually; accounts need about 30 days of ad history and a clean policy record, and sensitive verticals are excluded. |
| **Meta Ads**                  | Advantage+ Creative automatically adapts and varies creative by placement. A third-party report says generative image creation is being added to it (announced July 2026). | Platform-specific; no competitor awareness. One guide advises careful testing for B2B lead qualification.                                                                       |
| **LinkedIn Campaign Manager** | Tools announced in July 2026: Brand Kit, Draft with AI (copy and image suggestions from a URL), AI Ad Variants, Flexible Ads, Ads Personalization.                         | Aimed at small businesses; focused on copy and variants, not competitor-led image creation. Brand Kit currently works for single image ads only.                                |

### 11.5 Observations for the team

- Most products do either competitor research **or** creative generation. A few claim to do both (AdCreative.ai, Atria, Hawky), but their public pages do not show competitor findings actually driving the visuals. Test this.
- Among paid ad-research tools, **Google and LinkedIn coverage is thin**; Meta and TikTok dominate. The LinkedIn Ad Library is also described as thinner than the others. This is an opportunity, and also a data risk for FR-4 that the team should plan for.
- Most generators are built for e-commerce and direct-to-consumer brands, often video-first. **B2B needs** (audience by job role and industry, proof-led messaging, lead-generation calls to action) look underserved.
- Platform-native tools are free but limited: each covers one platform, and none looks at competitors.

### 11.6 What to evaluate in each tool

Run the same B2B business through each tool and compare:

1. How well it understands the business from a website alone.
2. How accurately it extracts brand colours, logo and style.
3. Whether competitor analysis actually changes the creatives, and whether the user can see why.
4. Coverage and quality of Google, Meta and LinkedIn competitor data.
5. Text legibility and spelling on generated images.
6. Whether creatives are properly adapted for each platform size, not just resized.
7. Editing and regeneration experience, and version history.
8. Policy and compliance checks before export.
9. Whether outputs feel generic or look like competitors' ads.
10. Pricing, usage limits and where it fails for B2B.

### 11.7 Sources

- AdCreative.ai: https\://www\.adcreative.ai/ and https\://www\.adcreative.ai/post/track-competitor-ads-and-traffic-with-ad-creative-ai-insights
- Ad creative generator roundups: https\://www\.cometly.com/post/ai-ad-creative-generator and https\://www\.superside.com/blog/ai-ad-creative-generators
- Creative analysis and competitor research tools: https\://www\.tryatria.com/blog/best-ai-ad-tools-for-creative-analysis and https\://hawky.ai/blog/ai-ad-intelligence-tools
- Ad library coverage by tool: https\://www\.superscale.ai/learn/digital-ad-intelligence/
- Google Ads image editor: https\://support.google.com/google-ads/answer/14210318?hl=en
- LinkedIn AI creative tools: https\://www\.techwyse.com/news/platform-updates/linkedin-ai-creative-tools-campaign-manager and https\://www\.thekeyword.co/news/linkedin-brand-kit-creative-tools
- Meta AI creative features: https\://almcorp.com/meta-ads-2026-guide-advantage-plus-ai-creative/