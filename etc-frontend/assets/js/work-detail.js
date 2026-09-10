(function () {
  const contentEl = document.getElementById("workContent");
  const titleEl = document.getElementById("pageTitle");
  const breadcrumbEl = document.getElementById("breadcrumbCurrent");
  const esc = ETC.escapeHtml;
  const f = ETC.field; // f(merged, "opus") -> value or null, regardless of which source it came from

  function fieldRow(label, value) {
    if (!value) return "";
    return `
      <div class="etc-field-label">${esc(label)}</div>
      <div class="etc-field-value">${value}</div>`;
  }

  function summaryLookupFactory(worksSummary, peopleSummary) {
    return (targetType, id) => {
      if (targetType === "work") {
        const w = worksSummary.find((w) => w.etcIdentifier === id);
        return w ? w.title : id;
      }
      if (targetType === "person") {
        const p = peopleSummary.find((p) => p.etcIdentifier === id);
        return p ? p.name : id;
      }
      return id;
    };
  }

  function renderCycle(merged, worksSummary, peopleSummary) {
    const lookup = summaryLookupFactory(worksSummary, peopleSummary);
    const memberRels = merged.relationships.filter((r) => r.role === "has-member");
    const composerRel = merged.relationships.find((r) => r.targetType === "person");

    return `
      <header class="etc-detail-header">
        <div class="container">
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span class="etc-badge-type etc-badge-type--cycle">Cycle</span>
            <span class="etc-badge-id">${esc(merged.etcIdentifier)}</span>
          </div>
          <h1 style="font-size: 2rem;">${esc(f(merged, "title"))}</h1>
          <p class="text-secondary mb-0">${esc(f(merged, "subtitle") || "")}</p>
        </div>
      </header>
      <div class="container">
        <div class="row">
          <div class="col-lg-8">
            <section class="etc-detail-section">
              <h2>About this cycle</h2>
              <p>${esc(f(merged, "summary") || "")}</p>
              <div class="row">
                ${composerRel ? `<div class="col-sm-6">${fieldRow("Composer", ETC.relationshipLinkHtml(composerRel, lookup))}</div>` : ""}
                <div class="col-sm-6">${fieldRow("Opus", esc(f(merged, "opus")))}</div>
                <div class="col-sm-6">${fieldRow("Genre", esc(f(merged, "genre")))}</div>
                <div class="col-sm-6">${fieldRow("Dates", esc(f(merged, "dateStatement")))}</div>
                <div class="col-sm-12">${fieldRow("Scoring", esc(f(merged, "scoring")))}</div>
              </div>
            </section>

            <section class="etc-detail-section">
              <h2>Constituent songs</h2>
              <div class="list-group etc-member-list">
                ${memberRels.map((r) => `
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    ${ETC.relationshipLinkHtml(r, lookup)}
                    <span class="text-secondary small">${esc(r.note || "")}</span>
                  </div>`).join("")}
              </div>
            </section>
          </div>
          <div class="col-lg-4">
            <div class="etc-filter-rail">
              <h6>Record status</h6>
              <p class="small text-secondary mb-0">This cycle has no equivalent RISM work record &mdash; RISM catalogues only the constituent songs. This page is a SuppA construct grouping them for display.</p>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderSong(merged, worksSummary, peopleSummary) {
    const lookup = summaryLookupFactory(worksSummary, peopleSummary);
    const cycleRel = merged.relationships.find((r) => r.role === "member-of");
    const composerRel = merged.relationships.find((r) => r.role.endsWith("/cre"));
    const lyricistRel = merged.relationships.find((r) => r.role.endsWith("/lyr"));
    const versionRel = merged.relationships.find((r) => r.role === "version-of");

    return `
      <header class="etc-detail-header">
        <div class="container">
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span class="etc-badge-type etc-badge-type--song">Song</span>
            <span class="etc-badge-id">${esc(merged.etcIdentifier)}</span>
            ${f(merged, "kentNumber") ? `<span class="etc-badge-id">${esc(f(merged, "kentNumber"))}</span>` : ""}
          </div>
          <h1 style="font-size: 2rem;">${esc(f(merged, "title"))}</h1>
          <p class="text-secondary mb-0">${esc(f(merged, "subtitle") || "")}</p>
        </div>
      </header>
      <div class="container">
        ${merged.rismError ? ETC.partialErrorBannerHtml(`RISM data for this work couldn't be loaded (${merged.rismError}). Showing SuppA fields only where RISM data is missing.`) : ""}
        ${merged.dataQualityNote ? ETC.partialErrorBannerHtml(merged.dataQualityNote) : ""}
        <div class="row">
          <div class="col-lg-8">

            <section class="etc-detail-section">
              <h2>About this work</h2>
              <div class="row">
                ${composerRel ? `<div class="col-sm-6">${fieldRow("Composer", ETC.relationshipLinkHtml(composerRel, lookup))}</div>` : ""}
                <div class="col-sm-6">${fieldRow("Opus", esc(f(merged, "opus")))}</div>
                <div class="col-sm-6">${fieldRow("Key", esc(f(merged, "key")))}</div>
                <div class="col-sm-6">${fieldRow("Tempo", esc(f(merged, "tempo")))}</div>
                <div class="col-sm-12">${fieldRow("Scoring", esc(f(merged, "scoring")))}</div>
              </div>
            </section>

            ${f(merged, "textIncipit") || lyricistRel ? `
            <section class="etc-detail-section">
              <h2>Text</h2>
              ${fieldRow("Text incipit", f(merged, "textIncipit") ? `&ldquo;${esc(f(merged, "textIncipit"))}&rdquo;` : "")}
              ${lyricistRel ? fieldRow("Lyricist", ETC.relationshipLinkHtml(lyricistRel, lookup)) : ""}
            </section>` : ""}

            ${cycleRel ? `
            <section class="etc-detail-section">
              <h2>Part of</h2>
              <p>&larr; ${ETC.relationshipLinkHtml(cycleRel, lookup)}</p>
            </section>` : ""}

            ${versionRel ? `
            <section class="etc-detail-section">
              <h2>Versions and revisions</h2>
              <p class="mb-0 small text-secondary">${esc(versionRel.note)}</p>
            </section>` : ""}

          </div>
          <div class="col-lg-4">
            <div class="etc-filter-rail">
              <h6>Source record</h6>
              ${merged.derivedFrom ? `
                <p class="small text-secondary mb-2">SuppA and RISM data for this page were fetched in parallel and merged into one record.</p>
                <a href="${esc(merged.derivedFrom)}" target="_blank" rel="noopener" class="etc-mono small d-block mb-0">View on RISM Online &rarr;</a>
              ` : `<p class="small text-secondary mb-0">No RISM work record yet &mdash; supplementary data only.</p>`}
            </div>
          </div>
        </div>
      </div>`;
  }

  async function init() {
    const id = ETC.getQueryParam("id");
    if (!id) {
      contentEl.innerHTML = `<div class="container py-5">${ETC.emptyStateHtml("No work specified.", "Go back to the works list and choose a work.")}</div>`;
      return;
    }

    try {
      const [worksSummary, peopleSummary] = await Promise.all([ETC.loadWorks(), ETC.loadPeople()]);
      const workRow = worksSummary.find((w) => w.etcIdentifier === id);

      if (!workRow) {
        contentEl.innerHTML = `<div class="container py-5">${ETC.emptyStateHtml(`No work found with identifier "${id}".`)}</div>`;
        return;
      }

      titleEl.textContent = `${workRow.title} — ETC Pages`;
      breadcrumbEl.textContent = workRow.title;

      // Fetch SuppA + RISM in parallel and merge into ONE graph.
      const merged = await ETC.loadEntityBundle("work", id, workRow.derivedFrom);

      if (Object.keys(merged.data).length === 0 && merged.suppaError) {
        contentEl.innerHTML = `<div class="container py-5">${ETC.errorStateHtml(merged.suppaError)}</div>`;
        return;
      }

      contentEl.innerHTML = workRow.type === "cycle"
        ? renderCycle(merged, worksSummary, peopleSummary)
        : renderSong(merged, worksSummary, peopleSummary);
    } catch (e) {
      contentEl.innerHTML = `<div class="container py-5">${ETC.errorStateHtml(e.message)}</div>`;
    }
  }

  init();
})();
