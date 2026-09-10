(function () {
  const contentEl = document.getElementById("personContent");
  const titleEl = document.getElementById("pageTitle");
  const breadcrumbEl = document.getElementById("breadcrumbCurrent");
  const esc = ETC.escapeHtml;
  const f = ETC.field; // f(merged, "lifeDates") -> value regardless of which source it came from

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

  function renderPerson(merged, personRow, worksSummary, peopleSummary) {
    const lookup = summaryLookupFactory(worksSummary, peopleSummary);
    const workRels = merged.relationships.filter((r) => r.targetType === "work");

    return `
      <header class="etc-detail-header">
        <div class="container">
          <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span class="etc-badge-type etc-badge-type--work">${esc(f(merged, "profession") || "Person")}</span>
            <span class="etc-badge-id">${esc(merged.etcIdentifier)}</span>
          </div>
          <h1 style="font-size: 2rem;">${esc(f(merged, "name"))}</h1>
          <p class="text-secondary mb-0">${esc(f(merged, "lifeDates") || "")}</p>
        </div>
      </header>
      <div class="container">
        ${merged.rismError ? ETC.partialErrorBannerHtml(`RISM data for this person couldn't be loaded (${merged.rismError}). Showing SuppA fields only where RISM data is missing.`) : ""}
        <div class="row">
          <div class="col-lg-8">

            <section class="etc-detail-section">
              <h2>Biography</h2>
              <p>${esc(f(merged, "biography") || "")}</p>
              <div class="row">
                <div class="col-sm-6">${fieldRow("Profession", esc(f(merged, "profession")))}</div>
                <div class="col-sm-6">${fieldRow("Life dates", esc(f(merged, "lifeDates")))}</div>
                ${f(merged, "relationship") ? `<div class="col-sm-12">${fieldRow("Relationship", esc(f(merged, "relationship")))}</div>` : ""}
              </div>
              <p class="small text-secondary mb-0">Life dates above are fetched live from RISM when available; biography text is SuppA&rsquo;s own, since RISM does not supply narrative biographical text.</p>
            </section>

            ${personRow.placesActive && personRow.placesActive.length ? `
            <section class="etc-detail-section">
              <h2>Places active</h2>
              <div class="d-flex flex-wrap gap-2">
                ${personRow.placesActive.map((p) => `<span class="etc-badge-id">${esc(p)}</span>`).join("")}
              </div>
            </section>` : ""}

            ${workRels.length ? `
            <section class="etc-detail-section">
              <h2>Related works</h2>
              <p class="small text-secondary">From this person's SuppA relationship record &mdash; click through to a work, and its own page will independently fetch and merge its RISM record.</p>
              <div class="list-group etc-member-list">
                ${workRels.map((r) => `
                  <div class="list-group-item d-flex justify-content-between align-items-center">
                    ${ETC.relationshipLinkHtml(r, lookup)}
                    <span class="text-secondary small">${esc(r.note || "")}</span>
                  </div>`).join("")}
              </div>
            </section>` : ""}

          </div>
          <div class="col-lg-4">
            <div class="etc-filter-rail">
              <h6>Source record</h6>
              ${merged.derivedFrom ? `
                <p class="small text-secondary mb-2">SuppA and RISM data for this page were fetched in parallel and merged into one record.</p>
                <a href="${esc(merged.derivedFrom)}" target="_blank" rel="noopener" class="etc-mono small d-block mb-0">View on RISM Online &rarr;</a>
              ` : `<p class="small text-secondary mb-0">No RISM person record yet &mdash; supplementary data only.</p>`}
            </div>
          </div>
        </div>
      </div>`;
  }

  async function init() {
    const id = ETC.getQueryParam("id");
    if (!id) {
      contentEl.innerHTML = `<div class="container py-5">${ETC.emptyStateHtml("No person specified.", "Go back to the people list and choose someone.")}</div>`;
      return;
    }

    try {
      const [peopleSummary, worksSummary] = await Promise.all([ETC.loadPeople(), ETC.loadWorks()]);
      const personRow = peopleSummary.find((p) => p.etcIdentifier === id);

      if (!personRow) {
        contentEl.innerHTML = `<div class="container py-5">${ETC.emptyStateHtml(`No person found with identifier "${id}".`)}</div>`;
        return;
      }

      titleEl.textContent = `${personRow.name} — ETC Pages`;
      breadcrumbEl.textContent = personRow.name;

      const merged = await ETC.loadEntityBundle("person", id, personRow.derivedFrom || personRow.id);

      if (Object.keys(merged.data).length === 0 && merged.suppaError) {
        contentEl.innerHTML = `<div class="container py-5">${ETC.errorStateHtml(merged.suppaError)}</div>`;
        return;
      }

      contentEl.innerHTML = renderPerson(merged, personRow, worksSummary, peopleSummary);
    } catch (e) {
      contentEl.innerHTML = `<div class="container py-5">${ETC.errorStateHtml(e.message)}</div>`;
    }
  }

  init();
})();
