/**
 * ETC Pages — shared data, fetch, and merge helpers.
 *
 * Architecture:
 *  - suppA_<type>.json       = lightweight summary index for list pages,
 *                              each row carrying `derivedFrom` (the RISM
 *                              URI) so a detail page never has to wait on
 *                              one fetch to discover the other.
 *  - data/<type>s/<id>.json  = full SuppA JSON-LD detail record for one
 *                              entity, self-sufficient (title, opus, key,
 *                              etc. all present as their own fields).
 *  - RISM's own API (confirmed CORS-open) = fetched directly, in parallel
 *          with the SuppA detail fetch.
 *
 * loadEntityBundle() fetches both in parallel via Promise.allSettled and
 * MERGES them into a single graph before returning — callers (the detail
 * pages) read from one merged object, not two separate sources. Where a
 * field exists in both (opus, key, scoring, text incipit, title, life
 * dates, profession), RISM's value wins, since it's the authoritative
 * cataloguing source for those. Fields RISM doesn't have (tempo, cycle
 * placement, curated biography, etc.) come from SuppA untouched. Nothing
 * is silently dropped — every field is tagged with its source, and both
 * raw records are kept under `merged.sources` for provenance/debugging.
 *
 * Adding a new entity type (source, place, postcard, recording...) means:
 *   1. Add an entry to TYPE_REGISTRY below.
 *   2. Add a suppA_<type>.json summary file and data/<type>s/<id>.json details.
 *   3. Reuse relationshipLinkHtml() — it already routes generically by
 *      targetType, so cross-links to the new type work with no extra code.
 */

const ETC = (() => {
  const TYPE_REGISTRY = {
    work: {
      summaryPath: "data/suppA_works.json",
      summaryKey: "works",
      detailPathTemplate: (id) => `data/works/${id}.json`,
      detailPage: (id) => `work-detail.html?id=${encodeURIComponent(id)}`,
      label: "Work",
    },
    person: {
      summaryPath: "data/suppA_people.json",
      summaryKey: "people",
      detailPathTemplate: (id) => `data/people/${id}.json`,
      detailPage: (id) => `person-detail.html?id=${encodeURIComponent(id)}`,
      label: "Person",
    },
    // source: { ... }   <- future
    // place:  { ... }   <- future
  };

  // RISM summary/biographicalDetails label -> the SuppA field key it
  // should override when both exist. Extend as new overlapping fields
  // are found (see rismSummaryFields()).
  const RISM_OVERRIDES_SUPPA_FIELD = {
    "Opus number": "opus",
    "Key or mode": "key",
    "Scoring summary": "scoring",
    "Text incipit": "textIncipit",
    "Life dates": "lifeDates",
    "Profession or function": "profession",
    "Standardized title": "title",
  };

  // Top-level SuppA keys that are structural/meta, not display fields.
  const SUPPA_META_KEYS = new Set([
    "@context", "id", "type", "etcIdentifier", "derivedFrom",
    "created", "updated", "relationships", "workNotes", "personNotes",
    "dataQualityNote", "activityByPlace",
  ]);

  const cache = { summaries: {} };

  async function loadSummary(type) {
    const entry = TYPE_REGISTRY[type];
    if (!entry) throw new Error(`Unknown entity type: ${type}`);
    if (!cache.summaries[type]) {
      const res = await fetch(entry.summaryPath);
      if (!res.ok) throw new Error(`Failed to load ${type} summary (${res.status})`);
      const json = await res.json();
      cache.summaries[type] = json[entry.summaryKey];
    }
    return cache.summaries[type];
  }

  const loadWorks = () => loadSummary("work");
  const loadPeople = () => loadSummary("person");

  async function loadDetail(type, id) {
    const entry = TYPE_REGISTRY[type];
    if (!entry) throw new Error(`Unknown entity type: ${type}`);
    const res = await fetch(entry.detailPathTemplate(id));
    if (!res.ok) throw new Error(`No SuppA detail record for ${type} ${id} (${res.status})`);
    return res.json();
  }

  async function loadRismRecord(rismUri) {
    if (!rismUri) return null;
    const res = await fetch(rismUri, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`RISM record fetch failed (${res.status})`);
    return res.json();
  }

  // ---- Merge helpers ------------------------------------------------

  function firstLangValue(valueObj) {
    if (!valueObj) return null;
    const arr = valueObj.en || valueObj.none || Object.values(valueObj)[0];
    return Array.isArray(arr) ? arr[0] : arr || null;
  }

  /** RISM's summary[] (works) or biographicalDetails.summary[] (people) -> {label: value}. */
  function rismSummaryFields(rismRecord) {
    const arr =
      (rismRecord && rismRecord.summary) ||
      (rismRecord && rismRecord.biographicalDetails && rismRecord.biographicalDetails.summary) ||
      [];
    const out = {};
    arr.forEach((row) => {
      const label = row.label && (row.label.en ? row.label.en[0] : Object.values(row.label)[0][0]);
      const value = firstLangValue(row.value);
      if (label && value) out[label] = value;
    });
    return out;
  }

  function suppaScalarFields(suppaRecord) {
    const out = {};
    Object.keys(suppaRecord || {}).forEach((key) => {
      if (SUPPA_META_KEYS.has(key)) return;
      const val = suppaRecord[key];
      if (val === null || typeof val === "object") return;
      out[key] = val;
    });
    return out;
  }

  function rismRelationships(rismRecord) {
    const out = [];
    if (!rismRecord) return out;

    if (rismRecord.creator) {
      out.push({
        role: rismRecord.creator.role && rismRecord.creator.role.label && rismRecord.creator.role.label.en[0],
        relatedToLabel: rismRecord.creator.relatedTo && rismRecord.creator.relatedTo.label && rismRecord.creator.relatedTo.label.none[0],
        relatedToUri: rismRecord.creator.relatedTo && rismRecord.creator.relatedTo.id,
        source: "rism",
      });
    }
    (rismRecord.relationships && rismRecord.relationships.items || []).forEach((item) => {
      out.push({
        role: item.role && item.role.label && item.role.label.en[0],
        relatedToLabel: item.relatedTo && item.relatedTo.label && item.relatedTo.label.none[0],
        relatedToUri: item.relatedTo && item.relatedTo.id,
        source: "rism",
      });
    });
    (rismRecord.partOf && rismRecord.partOf.items || []).forEach((item) => {
      out.push({
        role: "Part of catalogue",
        relatedToLabel: item.relatedTo && item.relatedTo.label && item.relatedTo.label.none[0],
        relatedToUri: item.relatedTo && item.relatedTo.id,
        note: item.workNumber,
        source: "rism",
      });
    });
    return out;
  }

  function suppaRelationships(suppaRecord) {
    const items = (suppaRecord && suppaRecord.relationships && suppaRecord.relationships.items) || [];
    return items.map((item) => ({
      role: (item.qualifier || "").split("#").pop(),
      targetType: item.targetType,
      relatedTo: item.relatedTo,
      note: item.note,
      migrationStatus: item.migrationStatus,
      source: "suppa",
    }));
  }

  /**
   * Merge one SuppA record + one RISM record into a single graph object.
   * `merged.data.<key>` gives { value, source } for any display field;
   * `merged.relationships` combines both sources' links, each tagged.
   */
  function mergeRecords(type, id, suppaRecord, rismRecord) {
    const data = {};
    Object.entries(suppaScalarFields(suppaRecord)).forEach(([key, value]) => {
      data[key] = { value, source: "suppa" };
    });
    Object.entries(rismSummaryFields(rismRecord)).forEach(([label, value]) => {
      const suppaKey = RISM_OVERRIDES_SUPPA_FIELD[label];
      const key = suppaKey || label;
      data[key] = { value, source: "rism", label, overrode: suppaKey && data[suppaKey] ? "suppa" : undefined };
    });

    return {
      id: (suppaRecord && suppaRecord.id) || `https://etc.web.ox.ac.uk/suppa/${type}s/${id}`,
      etcType: type,
      etcIdentifier: id,
      derivedFrom: (suppaRecord && suppaRecord.derivedFrom) || null,
      data,
      // SuppA relationships kept first and separately, since they carry
      // ETC ids the app can route to directly; RISM relationships are
      // display-only (external people/places not necessarily in our own
      // catalogue yet) and kept in their own list.
      relationships: suppaRelationships(suppaRecord),
      externalRelationships: rismRelationships(rismRecord),
      notes: (suppaRecord && (suppaRecord.workNotes || suppaRecord.personNotes)) || null,
      dataQualityNote: (suppaRecord && suppaRecord.dataQualityNote) || null,
      sources: { suppa: suppaRecord || null, rism: rismRecord || null },
    };
  }

  /**
   * Fetch SuppA detail + RISM record in parallel (allSettled, so one
   * failing never blocks the other), then merge into ONE graph. This is
   * what detail pages call — they get back a single merged object, not
   * two separate sources to reconcile themselves.
   */
  async function loadEntityBundle(type, id, rismUri) {
    const [suppaResult, rismResult] = await Promise.allSettled([
      loadDetail(type, id),
      loadRismRecord(rismUri),
    ]);

    const suppa = suppaResult.status === "fulfilled" ? suppaResult.value : null;
    const suppaError = suppaResult.status === "rejected" ? suppaResult.reason.message : null;
    const rism = rismResult.status === "fulfilled" ? rismResult.value : null;
    const rismError = rismResult.status === "rejected" ? rismResult.reason.message : null;

    if (!suppa) {
      // Nothing to merge into — surface the failure directly.
      return { suppaError, rismError, data: {}, relationships: [], externalRelationships: [] };
    }

    const merged = mergeRecords(type, id, suppa, rism);
    merged.suppaError = suppaError;
    merged.rismError = rismError;
    return merged;
  }

  function field(merged, key) {
    return merged.data[key] ? merged.data[key].value : null;
  }

  // ---- Query params, escaping, generic link rendering ----------------

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Render one SuppA relationship as a routed link, via TYPE_REGISTRY. */
  function relationshipLinkHtml(rel, summaryLookup) {
    const entry = TYPE_REGISTRY[rel.targetType];
    const label = (summaryLookup && summaryLookup(rel.targetType, rel.relatedTo)) || rel.note || rel.relatedTo;
    if (!entry || !rel.relatedTo) {
      return `<span class="text-secondary">${escapeHtml(label)}</span>`;
    }
    return `<a href="${entry.detailPage(rel.relatedTo)}">${escapeHtml(label)}</a>`;
  }

  function typeBadgeClass(type) {
    if (type === "cycle") return "etc-badge-type--cycle";
    if (type === "song") return "etc-badge-type--song";
    return "etc-badge-type--work";
  }
  function typeBadgeLabel(type) {
    if (type === "cycle") return "Cycle";
    if (type === "song") return "Song";
    return "Work";
  }

  function workCardHtml(work) {
    const composerName = work.composer ? escapeHtml(work.composer.name) : "";
    return `
      <div class="col-sm-6 col-lg-4">
        <div class="card etc-card">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="etc-badge-type ${typeBadgeClass(work.type)}">${typeBadgeLabel(work.type)}</span>
              <span class="etc-badge-id">${escapeHtml(work.etcIdentifier)}</span>
            </div>
            <h3 class="etc-card-title">
              <a href="work-detail.html?id=${encodeURIComponent(work.etcIdentifier)}">${escapeHtml(work.title)}</a>
            </h3>
            <p class="etc-card-subtitle">${escapeHtml(work.subtitle || "")}</p>
            <div class="etc-card-meta mt-auto">
              ${composerName ? `<div>${composerName}</div>` : ""}
              ${work.dateStatement ? `<div>${escapeHtml(work.dateStatement)}</div>` : ""}
            </div>
          </div>
        </div>
      </div>`;
  }

  function personCardHtml(person) {
    return `
      <div class="col-sm-6 col-lg-4">
        <div class="card etc-card">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="etc-badge-type etc-badge-type--work">${escapeHtml(person.profession || "Person")}</span>
              <span class="etc-badge-id">${escapeHtml(person.etcIdentifier)}</span>
            </div>
            <h3 class="etc-card-title">
              <a href="person-detail.html?id=${encodeURIComponent(person.etcIdentifier)}">${escapeHtml(person.name)}</a>
            </h3>
            <p class="etc-card-subtitle">${escapeHtml(person.lifeDates || "")}</p>
            <div class="etc-card-meta mt-auto">
              ${person.workCount ? `<div>${person.workCount} work${person.workCount === 1 ? "" : "s"} in catalogue</div>` : ""}
            </div>
          </div>
        </div>
      </div>`;
  }

  function skeletonCardsHtml(count) {
    let out = "";
    for (let i = 0; i < count; i++) {
      out += `
        <div class="col-sm-6 col-lg-4">
          <div class="card etc-card">
            <div class="card-body">
              <div class="etc-skeleton mb-3" style="height:1rem;width:40%;"></div>
              <div class="etc-skeleton mb-2" style="height:1.4rem;width:80%;"></div>
              <div class="etc-skeleton mb-3" style="height:0.9rem;width:60%;"></div>
              <div class="etc-skeleton" style="height:0.8rem;width:50%;"></div>
            </div>
          </div>
        </div>`;
    }
    return out;
  }

  function emptyStateHtml(message, sub) {
    return `
      <div class="etc-empty-state">
        <span class="etc-eyebrow">No results</span>
        <p class="mb-1">${escapeHtml(message)}</p>
        ${sub ? `<p class="small">${escapeHtml(sub)}</p>` : ""}
      </div>`;
  }

  function errorStateHtml(message) {
    return `
      <div class="etc-empty-state">
        <span class="etc-eyebrow" style="color: var(--etc-rubric);">Couldn&rsquo;t load data</span>
        <p class="mb-0">${escapeHtml(message)}</p>
      </div>`;
  }

  function partialErrorBannerHtml(message) {
    return `
      <div class="etc-badge-note d-inline-block mb-3">
        <strong>Note:</strong> ${escapeHtml(message)}
      </div>`;
  }

  function markActiveNav() {
    const current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".etc-nav-link").forEach((link) => {
      const href = link.getAttribute("href");
      if (href === current || (current === "" && href === "index.html")) {
        link.classList.add("active");
      }
    });
  }

  return {
    TYPE_REGISTRY,
    loadWorks,
    loadPeople,
    loadSummary,
    loadDetail,
    loadRismRecord,
    loadEntityBundle,
    field,
    getQueryParam,
    escapeHtml,
    relationshipLinkHtml,
    workCardHtml,
    personCardHtml,
    skeletonCardsHtml,
    emptyStateHtml,
    errorStateHtml,
    partialErrorBannerHtml,
    markActiveNav,
  };
})();

document.addEventListener("DOMContentLoaded", ETC.markActiveNav);
