# ETC Pages — frontend prototype

Static, backend-free frontend for the Elgar Thematic Catalogue project. Built with Bootstrap 5.3 and vanilla JavaScript, reading data from static JSON files — designed to be hosted as-is on GitHub Pages.

## Folder structure

```
etc-frontend/
├── index.html              Home / dashboard
├── works.html               Works list (search, filter, sort)
├── work-detail.html         Work detail (cycle-level or song-level layout)
├── people.html               People list (search, filter)
├── person-detail.html        Person detail
├── README.md
├── assets/
│   ├── css/
│   │   └── styles.css        All design tokens + component styles
│   └── js/
│       ├── etc-data.js       Shared: data loading, caching, card/badge renderers
│       ├── works.js          Works list page logic
│       ├── work-detail.js    Work detail page logic
│       ├── people.js         People list page logic
│       └── person-detail.js  Person detail page logic
└── data/
    ├── suppA_works.json      Summary index for the works list page
    ├── suppA_people.json     Summary index for the people list page
    ├── works/
    │   ├── ETC-44.json        Sea Pictures (cycle) — full SuppA detail record
    │   ├── ETC-44.1.json      Sea Slumber Song — full SuppA detail record
    │   ├── ETC-44.2.json ... ETC-44.5.json   (remaining songs)
    │   └── ETC-36.json        Illustrative placeholder work
    └── people/
        ├── ETC-P-0001.json ... ETC-P-0006.json   one file per person
```

Adding a future list page (Sources, Places) means: one new JSON file in `data/`, one new `<name>.html` following the existing page skeleton, one new `<name>.js` following the pattern in `works.js`/`people.js`, and a nav link. No changes needed to `etc-data.js`'s core loading pattern — just add a new `load<Name>()` function alongside `loadWorks`/`loadPeople`.

## Running locally

Browsers block `fetch()` of local files under the `file://` protocol, so double-clicking `index.html` will not load data. Serve the folder with any static server, e.g.:

```
cd etc-frontend
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. On GitHub Pages this isn't a concern — it's served over HTTPS like any other static site.

## Data fetch architecture (revised)

Each entity now has **two layers**:

- **Summary index** (`data/suppA_works.json`, `data/suppA_people.json`) — one lightweight row per record, enough to render list pages fast. Each row includes `derivedFrom`, the record's RISM URI, so a detail page already knows where to fetch RISM data from the moment it's linked to — no need to load the detail record first just to discover it.
- **Per-record detail file** (`data/works/<id>.json`, `data/people/<id>.json`) — the full SuppA JSON-LD record, following the `@context` shape designed earlier in this project, with a `targetType` hint (`"work"` or `"person"`) on every relationship so the frontend can route to the right page without an extra lookup.

On a detail page, the SuppA detail file and the live RISM record are fetched **in parallel** via `Promise.allSettled` (see `loadEntityBundle()` in `etc-data.js`) — confirmed against a real RISM fetch during this build (CORS is open, as you tested). `allSettled` means a failure on either side never blocks the other: if RISM is briefly unreachable, the page still renders with SuppA data and a small inline note, rather than failing outright. This was validated directly during development — a RISM fetch failing in the build sandbox surfaced exactly as the graceful-degradation path, not a crash.

**Extensibility for Sources, Places, and future types** (postcards, recordings, etc.): the whole system routes through one `TYPE_REGISTRY` object at the top of `etc-data.js`. Adding a new type means adding one entry there (its summary path, detail path pattern, and detail page URL) — every existing relationship-rendering function already routes generically by `targetType`, so a work-to-source link works the same day sources are added, with no changes to work-detail.js itself.

## Design decisions worth knowing about

**Data shape is a flattened "view model," not the JSON-LD wire format.** Earlier work in this project defined `@context` files and JSON-LD shapes for the real SuppA/RISM aggregator API. `suppA_works.json` and `suppA_people.json` here are deliberately simpler flat objects — easy to bind directly to HTML without walking nested `@context`-driven structures. When a real backend/aggregator exists, it would transform its JSON-LD responses into this flatter shape (or the frontend gains a small adapter layer to do the flattening) — this file format is a frontend convenience, not the source of truth.

**The work detail page branches on `type`.** A cycle (`type: "cycle"`, e.g. Sea Pictures) renders differently from a song (`type: "song"`) — the cycle page lists its members and explains it has no single RISM equivalent; a song page shows its own fields and links back up to its cycle. This directly reflects the real finding from the RISM data modelling work: RISM catalogues individual songs but has no record for a cycle as a whole.

**Catalogue identifiers render in monospace**, deliberately distinct from prose text, so a reference like `ETC-44.2` or `KenE 1899-8` reads as a precise code rather than a stray number in a sentence.

**Filters are visibly real vs. visibly placeholder.** Work type and role filters actually work against the sample data. Genre, date-range, and life-period filters are shown but disabled, labelled "(placeholder)" — so it's clear to anyone testing this which parts are wired up already and which are laid out for a future data source.

**The signature visual element is a five-line staff motif** (pure CSS `repeating-linear-gradient`, no images), used as section dividers and under the active nav link — a deliberate, cheap way to tie the interface back to "this is a thematic catalogue of music" rather than a generic decorative rule.

## What's genuinely a prototype vs. production-ready

- No pagination on list pages yet — fine for a handful of sample records, will matter once the real dataset loads.
- Search is client-side substring matching over already-loaded JSON — works for a small dataset, would need a real search index (or backend endpoint) at scale.
- No unit or integration tests.
- Accessibility floor covered (visible focus states, reduced-motion respected, semantic headings, breadcrumbs, `aria-label`s on search inputs) but hasn't been run through a screen reader or automated a11y checker.
- Bootstrap and Google Fonts are loaded from CDN (jsdelivr, fonts.googleapis.com) rather than self-hosted — fine for GitHub Pages, but worth self-hosting instead if the project ever needs to work somewhere without third-party CDN access, or wants tighter control over long-term link stability.

## Suggestions for future enhancements

- **Sources and Places pages**, following the same list/detail pattern already established.
- **A real search/filter backend** once record counts grow past what client-side JSON filtering handles comfortably.
- **Deep-linkable filter state** (filters reflected in the URL query string, like the search box already is) so a filtered view is shareable.
- **Cross-references rendered both directions** — e.g. a lyricist's page already lists their related works; the reverse (a work showing all named contributors, not just the composer and lyricist) could be extended as more relationship types come online.
- **A lightweight build step** (even just a template partial for the navbar/footer) once the number of pages grows enough that keeping five copies of the same markup in sync becomes error-prone.
