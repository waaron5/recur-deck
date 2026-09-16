# Release validation set: candidate companies

Researched 2026-09-15. All companies are private, software, and outside fleet, telematics and GPS tracking. None are Recur portfolio companies (slides 6-8 show only past "journeys" and backers, not holdings). None are in `discover-logos.js` (USFT, Samsara, Geotab, Verizon Connect, Motive, Azuga, GPS Insight, Teletrac Navman, Linxup, Force by Mojio).

## A cross-cutting finding from the curl tests

The brief's test command sends the bare UA `Mozilla/5.0`, and Cloudflare blocks it on many ordinary sites: 403 "Attention Required! | Cloudflare", 5,491 bytes, about 127 words of block-page text. Affected: MRI Software, Canopy, Ekos, InnoVint, Jackrabbit, Kipu Health, Curbside Laundries.

The same sites return 200 with full content when sent a full Chrome UA string. `discover-logos.js` already uses a full Chrome UA (line 21), so its fetches are fine. Any other fetch step that sends a short UA will hit this block, on sites that are otherwise clean.

For slot 4 I therefore only counted sites that stay hostile with a full Chrome UA.

Headcounts come from data aggregators (PitchBook, ZoomInfo, LeadIQ, and others). They vary by source, so treat them as approximate.

---

## Slot 1: Ambiguous name

| | **Lattice** | **Qualia** | **Canopy** |
|---|---|---|---|
| Site | https://lattice.com/ | https://www.qualia.com/ | https://www.getcanopy.com/ |
| Sells | People management / HR (performance, engagement, comp) | Real-estate closing and title software | Practice management for accounting & tax firms |
| HQ | San Francisco, CA ([Built In SF](https://www.builtinsf.com/company/lattice), [lattice.com/about](https://lattice.com/about)) | San Francisco, CA; offices in Austin and Superior, CO ([PitchBook](https://pitchbook.com/profiles/company/126020-26), [LinkedIn](https://www.linkedin.com/company/qualiasoftware)) | **Conflicting.** Lehi, UT, per Canopy's own [press release](https://www.getcanopy.com/resources/press-room/canopy-expands-into-new-hq/) (moved Jan 2019, 4100 N Chapel Ridge Rd), [BBB](https://www.bbb.org/us/ut/lehi/profile/tax-software/canopy-tax-inc-1166-90024536) and [Yelp](https://www.yelp.com/biz/canopy-lehi). South Jordan, UT, per ZoomInfo and LeadIQ ([LeadIQ](https://leadiq.com/c/canopy/5a1d89bd240000240063120c)) |
| Headcount | ~537, private, $3B valuation ([Latka](https://getlatka.com/companies/lattice), [PitchBook](https://pitchbook.com/profiles/company/155954-35)) | ~456–633 ([PitchBook](https://pitchbook.com/profiles/company/126020-26)) | ~299 ([LeadIQ](https://leadiq.com/c/canopy/5a1d89bd240000240063120c)) |
| Collision | **Lattice Semiconductor**, NASDAQ: LSCC, Hillsboro, OR, about 1,110 staff ([Wikipedia](https://en.wikipedia.org/wiki/Lattice_Semiconductor)) | **Qualia Life Sciences**, formerly Neurohacker Collective, a well-known nootropic supplement brand ([PR Newswire](https://www.prnewswire.com/news-releases/neurohacker-collective-is-becoming-qualia-life-sciences-302159509.html)). Also the philosophy term "qualia" | **Canopy Growth**, NASDAQ: CGC, cannabis ([Wikipedia](https://en.wikipedia.org/wiki/Canopy_Growth)). Also the common word |
| Why evidence favors the software co. | Recur targets private software, and the collider is a public chip maker | Only one "Qualia" is a software company; the collider sells supplements | Only one "Canopy" is software; the collider is public |
| Risks | Horizontal HR rather than vertical, but "any vertical" is allowed. Logo is a clean SVG in the nav (`logo-color-lattice.svg`, 200 image/svg+xml, 3.8 KB). No other edge case | Logo is a PNG in the nav (`/images/topbar-logo.png`). Headcount may exceed the "mid" bucket | **Triggers two other edge cases.** (a) HQ city is genuinely ambiguous. (b) The bare-UA fetch gets the Cloudflare 403 |

Curl results: Lattice 200 / 1,225 words; Qualia 200 / 870 words; Canopy 403 with the bare UA, 200 / 542 KB with a Chrome UA.

---

## Slot 2: Small-town HQ, metro within ~60 km

Distances are straight-line, computed from town-centre coordinates.

| | **MRI Software** | **eClinicalWorks** | **Shopmonkey** |
|---|---|---|---|
| Site | https://www.mrisoftware.com/ | https://www.eclinicalworks.com/ | https://www.shopmonkey.io/ |
| Sells | Real-estate / property management software | Ambulatory EHR and practice management | Auto-repair shop management |
| HQ | 28925 Fountain Pkwy, **Solon, OH** ([Wikipedia](https://en.wikipedia.org/wiki/MRI_Software), [CB Insights](https://www.cbinsights.com/company/mri-software)) | 2 Technology Dr, **Westborough, MA** ([eCW press release](https://www.eclinicalworks.com/pr-eclinicalworks-expands-headquarters-2/), [LinkedIn](https://www.linkedin.com/company/eclinicalworks)) | 155 E Main St, **Morgan Hill, CA** ([LeadIQ](https://leadiq.com/c/shopmonkey/5abc986a530000160176171c), [MWACA directory](https://members.mwaca.org/list/member/shopmonkey-morgan-hill-216430), [CB Insights](https://www.cbinsights.com/company/shopmonkey)) |
| Town population | 24,262 in the 2020 census ([Wikipedia](https://en.wikipedia.org/wiki/Solon,_Ohio)) | 21,567 in 2020 ([Wikipedia](https://en.wikipedia.org/wiki/Westborough,_Massachusetts)) | ~45,500 in 2020 ([Bay Area Census](https://census.bayareametro.gov/cities-counties/santa_clara_county/morgan_hill)) |
| Metro fallback | Cleveland, ~24 km | Boston, ~47 km | San Jose, ~31 km (SF about 95 km) |
| Local landmark? | None notable, suburban office park | None notable | None notable |
| Headcount | ~3,975; PE-backed by GI Partners, TA and Harvest ([Harvest Partners](https://harvestpartners.com/portfolio/mri-software/)) | ~4,300–6,000; privately held ([LinkedIn](https://www.linkedin.com/company/eclinicalworks)) | ~200–211 ([LeadIQ](https://leadiq.com/c/shopmonkey/5abc986a530000160176171c)) |
| Risks | Bare-UA fetch gets the Cloudflare 403 (a Chrome UA works). The vertical is close to Qualia's (real estate). Very large, arguably beyond a Recur-sized target | Healthcare EHR, the same vertical as TherapyNotes in slot 4. Well known in health IT, but not a household name | Many older profiles list San Francisco, so HQ resolution could go wrong. Same vertical as the Tekmetric control; don't use both |

Tiny-company alternative for slot 2: **Captira** (see slot 3). Its mailing address is a PO Box in Clifton Park, NY (population 38,209 in 2020, ~24 km from Albany), per its [contact page](https://www.captira.com/pages/contact-us). Albany is only a mid-size metro, and the HQ is a PO Box, so it is weaker here.

---

## Slot 3: Thin competitor field

| | **Captira** | **Skimmer** | **Pool Office Manager** |
|---|---|---|---|
| Site | https://www.captira.com/ | https://www.getskimmer.com/ | https://poolofficemanager.com/ |
| Vertical | Bail-bond agency software | Pool service route and billing software | Pool service software |
| HQ | Clifton Park, NY (PO Box 371) per its [own contact page](https://www.captira.com/pages/contact-us). Aggregators say Albany, NY ([Tracxn](https://tracxn.com/d/companies/captira/__E7dBmErtfvXA1sNQIFR99_S91mdTgvF1H3ULoEC_99s)) | Austin, TX ([Inc.](https://www.inc.com/profile/skimmer), [Mainsail](https://mainsailpartners.com/company/skimmer/)) | 4179 Lyman Dr, Columbus, OH 43026, on its own homepage. ZIP 43026 is the Hilliard suburb |
| Headcount | ~7–15 ([LeadIQ](https://leadiq.com/c/captira-software/5a1da5782300005e00984d7b)). Private: divested by then-NASDAQ Intersections in Jan 2017 ([PR Newswire](https://www.prnewswire.com/news-releases/intersections-inc-sells-captira-analytical-llc-300410592.html)) | ~52–70 ([LinkedIn](https://www.linkedin.com/company/skimmer-pool-service-software), [Latka](https://getlatka.com/companies/getskimmer.com)); PE-backed | Small (not verified) |
| Direct competitors found | **eBail, BailBooks, Simply Bail, EbailSoft**, plus Captira's own second brand ti3 ([Guideflow](https://www.guideflow.com/blog/bail-bonds-software), [Slashdot category](https://slashdot.org/software/bail-bond-agency/f-small-business/), [Captira's comparison page](https://www.captira.com/pages/bail-software-comparison)). About 4–6 real ones | Pool-specific: **Pool Brain** (Phoenix, ~4 staff), **Pool Office Manager** (Columbus), **PoolTrackr** (Australia), **PoolDial**, **Paythepoolman** ([PoolDial list](https://pooldial.com/resources/articles/software-reviews/pooltrackr-alternatives), [SourceForge](https://sourceforge.net/software/compare/Pool-Brain-vs-Pooltrackr-vs-Skimmer-Pool/), [Latka on Pool Brain](https://getlatka.com/companies/poolbrain.com/team)). Horizontal field-service tools (Jobber, Housecall Pro, ServiceTitan, GorillaDesk) are adjacent, not direct | The same pool field, with Skimmer in place of POM |
| Risks | The thinnest field of the three, possibly below 6 once dead products are removed. Its site links to ti3.co, a separate AR-recovery product, which could confuse the research step. Its homepage returned 200 / 1,302 words | **Relationship flag:** Skimmer is a Mainsail Partners portfolio company, and slide 8 says Recur is backed by Mainsail's founders. Fine as a test input; awkward as a real mail target. Logo is a clean SVG (`Logo.svg`, 5.6 KB) | Suburban HQ address could cross-trigger slot 2 |

Rejected for slot 3:
- Towbook (towing): adjacent to the excluded fleet category, and St. Clair, MI is ~71 km from Detroit.
- Ekos (brewery): acquired by Next Glass in Oct 2025 ([Hypepotamus](https://hypepotamus.com/companies/b2b/next-glass-acquires-ekos/)).
- Dockwa: the marina field has 8+ players.

---

## Slot 4: JavaScript shell or blocked site

Tested with the brief's bare-UA command and also with a full Chrome UA.

| | **TherapyNotes** | **Dockwa** | **Buildertrend** |
|---|---|---|---|
| Site | https://www.therapynotes.com/ | https://dockwa.com/ | https://buildertrend.com/ |
| Bare UA | **200, 52,794 bytes, 5 visible words** (title only) | **403, Cloudflare "Just a moment..." challenge**, 3 words | **403 "Error 403 Forbidden", 103 bytes**, 5 words |
| Chrome UA | 200, 5 words, unchanged | 403 challenge, unchanged | 403, unchanged |
| WebFetch | Title only: "page content is minimal" | HTTP 403 | not tested |
| Failure mode | Client-side rendered shell: body built by JS bundles, no `<noscript>` | Bot challenge | Hard block of non-browser clients |
| Sells / to whom | Behavioral-health EHR and practice management for therapists | Marina management and slip reservations for marinas and boaters | Construction management for home builders and remodelers |
| HQ | 630 Dresher Rd, Horsham, PA ([ZoomInfo](https://www.zoominfo.com/c/therapynotes-llc/371746196), [TherapyNotes blog](https://blog.therapynotes.com/new-therapynotes-corporate-offices)) | 1 Commercial Wharf, Newport, RI ([Discover Newport](https://www.discovernewport.org/listing/dockwa-inc/4191/), [Visit RI](https://www.visitrhodeisland.com/listing/dockwa-inc/8113/)) | 11818 I St, Omaha, NE ([Silicon Prairie News](https://siliconprairienews.com/2026/02/omaha-based-buildertrend-celebrates-20-years-providing-software-solutions-for-home-builders/), [Omaha Chamber](https://www.omahachamber.org/buildertrend-where-tech-and-talent-thrive-in-omaha/)) |
| Headcount | ~353 (201–500 band) ([LinkedIn](https://www.linkedin.com/company/therapynotes-llc)) | 11–50 ([Datanyze](https://www.datanyze.com/companies/dockwa/368479345)) | ~713–808; PE/growth-backed by Bain Capital Tech Opportunities, HGGC and Serent (2021) ([Bain Capital](https://www.baincapital.com/news/buildertrend-leader-construction-management-software-secures-significant-investment-led-bain)) |
| ≥2 independent 3rd-party sources agree? | **Yes.** [G2](https://www.g2.com/products/therapynotes/reviews), [Capterra](https://capterra.com/p/118981/TherapyNotes-com/) (968 reviews) and [TechRadar](https://www.techradar.com/reviews/therapynotes) all describe behavioral-health EHR for therapists | **Yes.** [Software Advice](https://www.softwareadvice.com/marine/dockwa-profile/), [Capterra](https://www.capterra.com/compare/141098-147452/Molo-vs-Dockwa) and [PitchBook](https://pitchbook.com/profiles/company/108440-65) describe marina management | **Yes.** Silicon Prairie News, the Omaha Chamber, Bain Capital and [PitchBook](https://pitchbook.com/profiles/company/169168-15) describe residential construction management |
| Risks | **Cross-triggers slot 2:** Horsham Township, population 26,564 ([Wikipedia](https://en.wikipedia.org/wiki/Horsham_Township,_Pennsylvania)), is ~25 km from Philadelphia. Logo cannot be found in the HTML (only favicon/touch icons), so it also stresses logo discovery | **HQ misresolution risk:** [Tracxn](https://tracxn.com/d/companies/dockwa/__amygSuv0ZWamLsxD6eQUW3og9Mi-QP5ng2J0A2xXauw) lists "Newport Beach". Newport, RI (~25k) has landmarks (The Breakers, Cliff Walk). Logo also unreachable on its own site | Cleanest single failure mode. Omaha is a normal city. Logo unreachable on its own site. Large company |

Also seen: TaxDome also serves a Cloudflare challenge to both UAs, but its HQ is unclear, so I skipped it.

---

## Slot 5: Clean control

| | **Tekmetric** | **Luma Health** |
|---|---|---|
| Site | https://www.tekmetric.com/ | https://www.lumahealth.io/ |
| Sells | Auto-repair shop management | Patient engagement / access for health systems and practices |
| HQ | 730 Town & Country Blvd, Houston, TX ([LeadIQ](https://leadiq.com/c/tekmetric/5a1dd2aa2300005e00dbf63a), [Facebook](https://www.facebook.com/Tekmetric/)) | San Francisco, CA ([Tracxn](https://tracxn.com/d/companies/luma-health/__sBQ4-X04-eYj4iuD8spMR45wIjz0PmoX99WubZ8KgiY), [Built In](https://builtin.com/company/luma-health)) |
| Landmark | Houston: skyline, Sam Houston Monument, Space Center (moderately iconic) | San Francisco: Golden Gate Bridge (highly iconic) |
| Headcount | ~332–336 ([PitchBook](https://pitchbook.com/profiles/company/232364-98)); growth-backed by Susquehanna | ~202 (201–500 band); $130M Series C led by FTV ([PR Newswire](https://www.prnewswire.com/news-releases/luma-health-raises-130-million-in-series-c-funding-to-unify-automate-and-transform-patients-healthcare-journeys-301430687.html)) |
| Site fetch | 200, 1,693 words | 200, 1,130 words |
| Logo on own site | `<img class="nav_logo" src=".../Tekmetric-2CR.svg">`, fetched 200 image/svg+xml, 9.9 KB | `<img src=".../assets/images/logo.svg" alt="luma">`, fetched 200 image/svg+xml, 3.2 KB |
| Competitors (healthy field) | Shopmonkey, AutoLeap, Shop-Ware, Mitchell 1, ShopCentral/ISM, Shop Boss, Alldata, Fullbay ([G2](https://www.g2.com/products/tekmetric/competitors/alternatives), [GetApp](https://www.getapp.com/retail-consumer-services-software/a/tekmetric/alternatives/)) | Artera, Solutionreach, Relatient, NexHealth, Kyruus, Klara, Phreesia (public, but fine as a competitor) ([G2](https://www.g2.com/products/luma-health/competitors/alternatives), [SelectHub](https://www.selecthub.com/patient-engagement-software/luma-health/alternatives/)) |
| Risks | Slightly above the 50–250 band. One 2024 source says ~80 staff, so counts are noisy. Don't pair with Shopmonkey (same vertical) | The bare word "Luma" collides with Luma AI and lu.ma. Always prompt with the full name "Luma Health" |

Rejected controls:
- **GlossGenius:** rebranded to **Genius AI** on 2026-07-21 ([Fortune](https://fortune.com/2026/07/21/glossgenius-rebrand-genius-ai-small-businesses-beauty-unicorn-series-d/)). That makes it a good *future* rename or stale-name test, but not a control.
- **Squire** (NYC barbershops): collides with Squire Technologies (UK telecom) and Squire Patton Boggs, and its nav logo is served as `.heif` from Sanity.
- **Boulevard** (LA): ~575 staff, and no obvious logo `<img>` in its HTML.

---

## Size spread across the recommended set

- **Tiny (<50):** Captira (~7–15), Dockwa (11–50)
- **Mid (50–250):** Skimmer (~52–70), Luma Health (~202), Shopmonkey (~200)
- **Large (250+, PE or growth-backed):**
  - MRI Software (~4k)
  - Buildertrend (~750, Bain Capital Tech Opportunities)
  - Lattice (~537)
  - TherapyNotes (~353)
  - Tekmetric (~335)

## Top pick per slot

1. **Ambiguous name: Lattice.** The collision with public Lattice Semiconductor is strong, but the evidence clearly favors the software company, and nothing else goes wrong: clean SF HQ, SVG logo, site fetches fine. Canopy has the stronger collision, but it also trips the HQ-ambiguity and Cloudflare cases, so it would muddy the test.
2. **Small-town HQ: MRI Software, in Solon, OH.** Population 24k, ~24 km to Cleveland, no local landmark, and the HQ address is consistent across sources. Fetch it with a Chrome UA, since the bare UA gets the Cloudflare 403. If a mid-size company is wanted instead, use Shopmonkey (Morgan Hill, ~31 km to San Jose); watch for stale "San Francisco" listings.
3. **Thin competitor field: Captira.** About 4–6 real bail-bond competitors, a tiny bootstrapped-scale company, and a vertical unrelated to the other picks. Skimmer has a better-documented 5–6-competitor field, but its Mainsail ownership ties it to Recur's backers.
4. **JS shell or blocked site: TherapyNotes if you want a pure JS shell; Buildertrend if you want a single edge case.**
   - TherapyNotes: 200 but 5 words with both UAs and with WebFetch; three third-party sources agree on what it sells and to whom. It also exercises the small-town fallback (Horsham, ~25 km from Philadelphia) and the missing-logo path.
   - Buildertrend: a pure hard 403 to both UAs, with a normal Omaha HQ.
5. **Clean control: Luma Health.** Mid-size (~200), iconic SF landmark, healthy named competitor field, SVG logo in the site HTML. Always prompt with "Luma Health", not "Luma". Tekmetric is the backup: clean SVG logo, but a less iconic Houston landmark and headcount just above 250.
