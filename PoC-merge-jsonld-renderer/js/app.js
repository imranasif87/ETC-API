/**
 * Page wiring: reads the two text boxes, runs both merge routes, and fills the tabs.
 * All merge logic lives in merge-jsonld.js and merge-rdf.js; this file only handles the screen.
 */
(function () {
  "use strict";

  // ---- find the elements we need ----
  const inputA = document.getElementById("input-a");
  const inputB = document.getElementById("input-b");
  const derivedCheckbox = document.getElementById("derived-checkbox");
  const statusText = document.getElementById("status");
  const jsonldNote = document.getElementById("jsonld-note");
  const configText = document.getElementById("config-text");
  const renderedOutput = document.getElementById("output-rendered");
  const genericOutput = document.getElementById("output-generic");

  const outputs = {
    jsonld: document.getElementById("output-jsonld"),
    rdf: document.getElementById("output-rdf"),
    turtle: document.getElementById("output-turtle"),
    nquads: document.getElementById("output-nquads"),
    report: document.getElementById("output-report"),
  };

  // ---- set up the two merge routes (they share one context loader) ----
  const contextLoader = MergeShared.createContextLoader({ embeddedContexts: EMBEDDED_CONTEXTS });
  const rdfRoute = MergeRdf.createRdfMerger(jsonld, contextLoader, { N3: window.N3 });
  const jsonLdRoute = MergeJsonLd.createJsonLdMerger(jsonld, contextLoader);

  // Follow the visitor's light/dark preference (Bootstrap 5.3 supports both)
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-bs-theme", prefersDark ? "dark" : "light");

  // ---- rendered page ----
  let lastMergedGraph = null; // the Route 1 result, kept so "Apply config" can redraw without merging again

  function drawRenderedPage() {
    if (!lastMergedGraph) return;
    try {
      const config = JSON.parse(configText.value);
      Renderer.render(lastMergedGraph, config, renderedOutput);
    } catch (error) {
      renderedOutput.textContent = `Could not draw the page: ${error.message}`;
    }
  }

  configText.value = JSON.stringify(EMBEDDED_CONFIGS.work, null, 2);
  document.getElementById("apply-config-button").addEventListener("click", () => {
    drawRenderedPage();
    showTab("pane-rendered");
  });

  // ---- tabs ----
  function showTab(paneId) {
    document.querySelectorAll(".pane").forEach(pane => {
      pane.classList.toggle("d-none", pane.id !== paneId);
    });
    document.querySelectorAll("#tabs .nav-link").forEach(button => {
      button.classList.toggle("active", button.dataset.pane === paneId);
    });
  }

  document.querySelectorAll("#tabs .nav-link").forEach(button => {
    button.addEventListener("click", () => showTab(button.dataset.pane));
  });

  document.querySelectorAll(".copy-button").forEach(button => {
    button.addEventListener("click", () => {
      navigator.clipboard.writeText(document.getElementById(button.dataset.target).textContent);
    });
  });

  // ---- full page mode for the results tabs ----
  const fullPageButton = document.getElementById("fullpage-button");

  function setFullPage(isOn) {
    document.body.classList.toggle("fullpage-open", isOn);
    fullPageButton.textContent = isOn ? "Exit full page (Esc)" : "Full page";
  }

  fullPageButton.addEventListener("click", () => {
    setFullPage(!document.body.classList.contains("fullpage-open"));
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") setFullPage(false);
  });

  // ---- report display ----
  const LEVEL_ORDER = ["error", "warn", "info", "ok"];
  const LEVEL_BADGE = {
    ok: { color: "success", text: "Merged" },
    info: { color: "info", text: "Info" },
    warn: { color: "warning", text: "Check" },
    error: { color: "danger", text: "Problem" },
  };

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderFinding(finding) {
    const badge = LEVEL_BADGE[finding.level];
    const detail = finding.detail
      ? `<div class="small text-body-secondary mt-1 report-detail">${escapeHtml(finding.detail)}</div>`
      : "";
    const fix = finding.fix
      ? `<div class="small mt-1"><em>How to fix:</em> ${escapeHtml(finding.fix)}</div>`
      : "";

    return `
      <div class="card mb-2">
        <div class="card-body py-2">
          <span class="badge text-bg-${badge.color} me-2">${badge.text}</span>
          <strong>${escapeHtml(finding.title)}</strong>
          ${detail}
          ${fix}
        </div>
      </div>`;
  }

  function renderReport(findings) {
    // problems first, then warnings, then information, then what merged fine
    const html = LEVEL_ORDER.map(level =>
      findings.filter(finding => finding.level === level).map(renderFinding).join("")
    ).join("");
    outputs.report.innerHTML = html;
  }

  function renderError(error) {
    const details = escapeHtml(JSON.stringify(error.details || {}).slice(0, 400));
    outputs.report.innerHTML = `
      <div class="alert alert-danger">
        <strong>Merge failed:</strong> ${escapeHtml(error.message)}
        <div class="small mt-1">${details}</div>
        <div class="small mt-2">
          Common causes: invalid JSON, or a remote @context that cannot be fetched (CORS or offline).
          Contexts for the Work records are built in.
        </div>
      </div>`;
  }

  // ---- the Merge / Report buttons ----
  async function runMerge(tabToShow) {
    statusText.textContent = "Working...";

    try {
      const rdfResult = await rdfRoute.merge(inputA.value, inputB.value, {
        derived: derivedCheckbox.checked,
      });
      const jsonLdResult = await jsonLdRoute.merge(inputA.value, inputB.value);

      outputs.jsonld.textContent = JSON.stringify(jsonLdResult.merged, null, 2);
      outputs.rdf.textContent = JSON.stringify(rdfResult.merged, null, 2);
      outputs.turtle.textContent = rdfResult.turtle;
      outputs.nquads.textContent = rdfResult.nquads;
      renderReport(rdfResult.findings);
      lastMergedGraph = jsonLdResult.merged;
      drawRenderedPage();
      GenericRenderer.render(lastMergedGraph, genericOutput);

      const stats = rdfResult.stats;
      const sameResult = jsonLdResult.statements === stats.statementsMerged;
      jsonldNote.textContent =
        `Route 1 (jsonld.merge, no RDF step): ${jsonLdResult.statements} statements. ` +
        `Route 2 (via RDF): ${stats.statementsMerged}. ` +
        (sameResult ? "Same result. " : "The results differ: compare the two tabs. ") +
        "The derivedFrom checkbox applies only to Route 2.";

      statusText.textContent =
        `A ${stats.statementsInA} + B ${stats.statementsInB} statements -> ${stats.statementsMerged} merged | ` +
        `exact duplicates merged: ${stats.exactDuplicatesMerged} | ` +
        `possible duplicates to review: ${stats.possibleDuplicates} (see Report)`;
      showTab(tabToShow);
    } catch (error) {
      renderError(error);
      statusText.textContent = "Failed";
      showTab("pane-report");
    }
  }

  document.getElementById("merge-button").addEventListener("click", () => runMerge("pane-rendered"));
  document.getElementById("generic-button").addEventListener("click", () => runMerge("pane-generic"));
  document.getElementById("report-button").addEventListener("click", () => runMerge("pane-report"));

  document.getElementById("sample-button").addEventListener("click", () => {
    inputA.value = JSON.stringify(SAMPLE_DATA.rism, null, 2);
    inputB.value = JSON.stringify(SAMPLE_DATA.suppa, null, 2);
  });
})();
