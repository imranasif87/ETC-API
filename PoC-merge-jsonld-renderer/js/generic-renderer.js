/**
 * generic-renderer.js
 *
 * Draws a merged JSON-LD graph WITHOUT any configuration. It is deliberately separate from
 * renderer.js (the configured renderer) so the two approaches can be compared side by side.
 *
 *   GenericRenderer.render(graph, container, options)  ->  statistics about what it had to guess
 *
 * How it works: find the main record, then walk every property it has and show everything.
 * It knows nothing about RISM or the supplementary data. The only vocabulary it knows is
 * the universal RDF one: rdfs:label, rdf:value and @type.
 *
 * Everything it cannot know, it has to guess. The report at the top of the page lists the guesses.
 * That list is the answer to "what does a configuration file give us?".
 */
(function (root) {
  "use strict";

  const MAX_DEPTH = 5; // stop following links this many levels deep

  function render(graph, container, options = {}) {
    const languages = options.languages || ["en"];
    const nodes = Array.isArray(graph["@graph"]) ? graph["@graph"] : [graph];
    const nodesById = new Map(nodes.map(node => [node["@id"], node]));
    const prefixes = readPrefixes(graph["@context"]);

    // Counters for the report: every guess the renderer makes is counted here.
    const stats = {
      propertiesShown: 0,
      labelsGuessed: 0,
      labelExamples: [],
      anonymousNodesExpanded: 0,
      linkedNodesExpandable: 0,
      labelledValues: 0,
      multiLanguageValuesCollapsed: 0,
      htmlValuesFlattened: 0,
      webAddressesWithoutLabel: 0,
      cyclesStopped: 0,
      depthLimitReached: 0,
    };

    // =====================================================================
    // Reading the graph
    // =====================================================================

    function readPrefixes(context) {
      const found = {};
      if (context && typeof context === "object" && !Array.isArray(context)) {
        for (const [prefix, namespace] of Object.entries(context)) {
          if (typeof namespace === "string") found[prefix] = namespace;
        }
      }
      return found;
    }

    /** "rism:hasRole" -> "https://rism.online/api/v1#hasRole" */
    function expand(term) {
      const colon = term.indexOf(":");
      const namespace = colon > 0 ? prefixes[term.slice(0, colon)] : undefined;
      return namespace ? namespace + term.slice(colon + 1) : term;
    }

    /** Values of a property, whichever way the key is abbreviated. */
    function valuesOf(node, term) {
      const wanted = expand(term);
      const key = Object.keys(node).find(k => !k.startsWith("@") && expand(k) === wanted);
      return key ? [].concat(node[key]) : [];
    }

    function isBlankId(id) {
      return id.startsWith("_:");
    }

    function isLiteral(value) {
      return typeof value !== "object" || value === null || value["@value"] !== undefined;
    }

    function literalText(value) {
      return typeof value === "object" && value !== null ? String(value["@value"]) : String(value);
    }

    /** If a value comes in several languages, show one (preferred language first). */
    function chooseLanguage(values) {
      const tagged = values.filter(value => typeof value === "object" && value["@language"]);
      if (tagged.length === 0) return values;

      const best = languages.find(code => tagged.some(value => value["@language"] === code)) || tagged[0]["@language"];
      const kept = tagged.filter(value => value["@language"] === best);
      stats.multiLanguageValuesCollapsed += tagged.length - kept.length;
      return [...values.filter(value => !tagged.includes(value)), ...kept];
    }

    function labelOfNode(node) {
      const labels = chooseLanguage(valuesOf(node, "rdfs:label")).filter(isLiteral);
      return labels.length > 0 ? literalText(labels[0]) : null;
    }

    // =====================================================================
    // Finding the main record (a guess)
    // =====================================================================

    /**
     * Nothing tells us which node is "the record". We guess: an IRI node that no other node
     * points to, with the most properties.
     */
    function findMainRecord() {
      const pointedAt = new Set();
      for (const node of nodes) {
        for (const key of Object.keys(node).filter(k => !k.startsWith("@"))) {
          for (const value of [].concat(node[key])) {
            const target = value && value["@id"];
            if (target && target !== node["@id"]) pointedAt.add(target);
          }
        }
      }
      const byPropertyCount = (a, b) => Object.keys(b).length - Object.keys(a).length;
      const candidates = nodes.filter(node => !isBlankId(node["@id"]) && !pointedAt.has(node["@id"]));
      return [...(candidates.length > 0 ? candidates : nodes)].sort(byPropertyCount)[0];
    }

    // =====================================================================
    // Making labels (a guess)
    // =====================================================================

    /** "https://rism.online/api/v1#hasSummary" or "rism:hasSummary" -> "hasSummary" */
    function localName(key) {
      return key.replace(/^.*[#/:]/, "");
    }

    function prettify(text) {
      const words = text.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").toLowerCase();
      return words.charAt(0).toUpperCase() + words.slice(1);
    }

    /** Only the universal RDF terms are known. Every other label is made up from the property name. */
    const KNOWN_LABELS = { "@type": "Type", "rdfs:label": "Label", "rdf:value": "Value", "rdfs:comment": "Comment" };

    function labelForProperty(key) {
      const known = Object.entries(KNOWN_LABELS).find(([term]) => expand(term) === expand(key));
      if (known) return known[1];

      stats.labelsGuessed++;
      const guess = prettify(localName(key));
      if (stats.labelExamples.length < 4 && !stats.labelExamples.includes(guess)) stats.labelExamples.push(guess);
      return guess;
    }

    /** The vocabulary a property belongs to, used to group the page: "rism:hasRole" -> "rism". */
    function groupOf(key) {
      if (key.startsWith("@")) return "type";
      const colon = key.indexOf(":");
      return colon > 0 && !key.startsWith("http") ? key.slice(0, colon) : "other";
    }

    // =====================================================================
    // Small DOM helpers
    // =====================================================================

    function h(tag, className, ...children) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      element.append(...children.filter(child => child !== null && child !== undefined && child !== ""));
      return element;
    }

    function anchor(href, text) {
      const link = h("a", "", text);
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener";
      return link;
    }

    function htmlToPlainText(html) {
      const template = document.createElement("template");
      template.innerHTML = html;
      return template.content.textContent;
    }

    // =====================================================================
    // Drawing values
    // =====================================================================

    function drawLiteral(value) {
      let text = literalText(value);

      if (/<[a-z][\s\S]*>/i.test(text)) {
        stats.htmlValuesFlattened++;
        text = htmlToPlainText(text);
      }
      if (/^https?:\/\/\S+$/.test(text)) {
        stats.webAddressesWithoutLabel++;
        return h("div", "g-item", anchor(text, text));
      }
      return h("div", "g-item", text);
    }

    function drawUndescribedReference(id) {
      const address = expand(id);
      return h("div", "g-item", /^https?:\/\//.test(address) ? anchor(address, id) : h("code", "g-term", id));
    }

    /** RISM-style pattern, but universal RDF: a node with both a label and a value is a "label: value" pair. */
    function drawLabelledValue(node) {
      stats.labelledValues++;
      const label = labelOfNode(node);
      const valueElements = chooseLanguage(valuesOf(node, "rdf:value")).filter(isLiteral).map(drawLiteral);
      return h("div", "g-item g-labelled", h("span", "g-labelled-label", `${label}: `), ...valueElements);
    }

    function drawReference(reference, depth, ancestors) {
      const id = reference["@id"];
      const node = nodesById.get(id);
      if (!node) return drawUndescribedReference(id);

      if (ancestors.has(id)) {
        stats.cyclesStopped++;
        return h("div", "g-item g-muted", `(${isBlankId(id) ? "anonymous node" : id} is shown above)`);
      }
      if (depth >= MAX_DEPTH) {
        stats.depthLimitReached++;
        return h("div", "g-item g-muted", "(further levels not shown)");
      }

      const deeper = new Set(ancestors).add(id);
      const hasLabel = valuesOf(node, "rdfs:label").length > 0;
      const hasValue = valuesOf(node, "rdf:value").length > 0;

      if (hasLabel && hasValue) return drawLabelledValue(node);

      if (isBlankId(id)) {
        stats.anonymousNodesExpanded++;
        return h("div", "g-item g-nested", drawProperties(node, depth + 1, deeper, new Set()));
      }

      // A node with its own address: show its label as a link, with the rest available on demand.
      const label = labelOfNode(node) || id;
      const link = anchor(expand(id), label);
      const labelKeys = new Set(Object.keys(node).filter(key => expand(key) === expand("rdfs:label")));
      const hasMore = Object.keys(node).some(key => !key.startsWith("@") && !labelKeys.has(key));
      if (!hasMore) return h("div", "g-item", link);

      stats.linkedNodesExpandable++;
      return h("div", "g-item", h("details", "g-details", h("summary", "", link), drawProperties(node, depth + 1, deeper, labelKeys)));
    }

    function drawValues(values, depth, ancestors) {
      const literals = chooseLanguage(values.filter(isLiteral));
      const references = values.filter(value => !isLiteral(value));
      return [...literals.map(drawLiteral), ...references.map(reference => drawReference(reference, depth, ancestors))];
    }

    function drawPropertyRow(key, values, depth, ancestors) {
      stats.propertiesShown++;
      const typeValues = key === "@type" ? values.map(type => ({ "@value": type })) : values;
      const label = h("div", "g-key", labelForProperty(key), h("code", "g-term", key));
      return h("div", "g-row", label, h("div", "g-val", ...drawValues(typeValues, depth, ancestors)));
    }

    /** All properties of a node, in the order found in the file. */
    function drawProperties(node, depth, ancestors, skippedKeys) {
      const wrapper = h("div", "g-props");
      for (const key of Object.keys(node)) {
        if (key === "@id" || skippedKeys.has(key)) continue;
        wrapper.append(drawPropertyRow(key, [].concat(node[key]), depth, ancestors));
      }
      return wrapper;
    }

    /** The main record's properties, grouped by vocabulary (rism, suppa, dcterms ...). */
    function drawMainRecord(node) {
      const groups = new Map();
      for (const key of Object.keys(node).filter(k => k !== "@id")) {
        const group = groupOf(key);
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group).push(key);
      }

      const sections = [];
      for (const [group, keys] of groups) {
        const ancestors = new Set([node["@id"]]);
        const rows = keys.map(key => drawPropertyRow(key, [].concat(node[key]), 1, ancestors));
        sections.push(h("section", "g-group", h("h2", "g-group-title", group === "type" ? "Type" : `${group}: properties`), ...rows));
      }
      return sections;
    }

    // =====================================================================
    // The report: everything the renderer had to guess
    // =====================================================================

    function drawReport(mainRecord) {
      const items = [
        `Main record: ${mainRecord["@id"]}. Guessed: it is the only record nothing else points to, with the most properties.`,
        `${stats.propertiesShown} properties shown. Order is the order found in the file, grouped by vocabulary prefix, not a designed order.`,
        `${stats.labelsGuessed} labels made up from property names, for example ${stats.labelExamples.map(label => `'${label}'`).join(", ") || "none"}. No translation and no editorial wording.`,
        `${stats.anonymousNodesExpanded} anonymous nodes expanded inline and ${stats.linkedNodesExpandable} linked nodes folded away. Nothing is hidden, so technical structure is visible.`,
        `${stats.labelledValues} label-and-value pairs recognised by the universal rdfs:label plus rdf:value pattern.`,
        `${stats.multiLanguageValuesCollapsed} extra language versions dropped. Preferred language: ${languages.join(", ")}.`,
        `${stats.htmlValuesFlattened} values contained HTML and were flattened to plain text.`,
        `${stats.webAddressesWithoutLabel} web addresses shown as raw links, because nothing gives them a label.`,
        "Duplicates cannot be detected: the same fact stored under two different properties shows twice.",
      ];
      if (stats.cyclesStopped + stats.depthLimitReached > 0) {
        items.push(`${stats.cyclesStopped} loops and ${stats.depthLimitReached} deep branches were cut short.`);
      }

      const adds = [
        "a designed order, with the RISM record before the supplementary data",
        "human labels, taken from the data or written once in the configuration",
        "a way to hide technical fields",
        "knowledge that two properties mean the same thing",
        "different layouts for different kinds of record",
      ];

      return h("details", "g-report", h("summary", "g-report-title", "What this view had to guess"),
        h("ul", "", ...items.map(text => h("li", "", text))),
        h("div", "g-report-adds", h("strong", "", "What a configuration adds: "), adds.join("; ") + "."),
      );
    }

    // =====================================================================
    // Run
    // =====================================================================

    container.replaceChildren();
    if (nodes.length === 0 || !nodes[0]) {
      container.append(h("div", "g-muted", "The merged graph is empty."));
      return stats;
    }

    const mainRecord = findMainRecord();
    const mainRecordLabel = labelOfNode(mainRecord) || mainRecord["@id"];
    const groups = drawMainRecord(mainRecord);
    const report = drawReport(mainRecord);
    report.open = true;

    container.append(h("article", "g-page", h("h1", "g-title", mainRecordLabel), report, ...groups));
    return stats;
  }

  root.GenericRenderer = { render };
})(typeof window !== "undefined" ? window : globalThis);
