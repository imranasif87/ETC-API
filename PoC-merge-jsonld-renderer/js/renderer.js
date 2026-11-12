/**
 * renderer.js
 *
 * Draws a merged JSON-LD graph as an HTML page, following a configuration file.
 * The renderer contains no field names. Everything about WHAT is shown and in WHICH ORDER
 * comes from the configuration, so changing the page means editing the config, not this code.
 *
 *   Renderer.render(graph, config, container)
 *
 *   graph      the merged JSON-LD (an object with "@context" and "@graph")
 *   config     the parsed configuration (see config/work.json)
 *   container  the DOM element to draw into
 *
 * How a configuration field finds its data:
 *   A "path" such as  "dcterms:creator/rism:hasRole/rdfs:label"  starts at an item (usually the
 *   main record) and follows one property per step, through linked nodes.
 *   Special steps:  "."  the item itself,  "@type"  its types,  "@id"  its IRI.
 *
 * Field kinds:
 *   title   the heading, linking to the record
 *   row     one label with one or more values
 *   rows    many labelled rows built from many nodes (for example RISM summary rows)
 *   cards   a heading with one boxed card per node, each card holding its own fields
 */
(function (root) {
  "use strict";

  const ALLOWED_HTML_TAGS = new Set(["A", "B", "BR", "EM", "I", "SPAN", "STRONG", "SUB", "SUP"]);

  // =====================================================================
  // The graph model: reading nodes, following paths, choosing languages
  // =====================================================================

  function createGraphModel(graph, config) {
    const prefixes = readPrefixes(graph["@context"]);
    const languages = config.languages || ["en"];
    const nodes = Array.isArray(graph["@graph"]) ? graph["@graph"] : [graph];
    const nodesById = new Map(nodes.map(node => [node["@id"], node]));

    // Labels for coded terms, stored under their full IRI so prefixes do not matter.
    const termLabels = {};
    for (const [term, label] of Object.entries(config.termLabels || {})) {
      termLabels[expandTerm(term)] = label;
    }

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
    function expandTerm(term) {
      const colon = term.indexOf(":");
      if (colon < 0) return term;
      const namespace = prefixes[term.slice(0, colon)];
      return namespace ? namespace + term.slice(colon + 1) : term;
    }

    /** The raw JSON-LD values a node has for a property. Matching ignores how the key is abbreviated. */
    function valuesOf(node, term) {
      if (term === "@type") return [].concat(node["@type"] || []).map(id => ({ "@id": id }));

      const wanted = expandTerm(term);
      const key = Object.keys(node).find(k => !k.startsWith("@") && expandTerm(k) === wanted);
      return key ? [].concat(node[key]) : [];
    }

    /** Wraps a raw value as an item: a node (a thing with an IRI) or a literal (text, number...). */
    function toItem(value) {
      if (value && value["@id"] !== undefined) {
        return { kind: "node", id: value["@id"], node: nodesById.get(value["@id"]) };
      }
      if (value && value["@value"] !== undefined) {
        return { kind: "literal", value: value["@value"], language: value["@language"] };
      }
      return { kind: "literal", value };
    }

    /** Follows a path such as "a/b/c" from every starting item. */
    function follow(items, path) {
      if (!path || path === ".") return items;

      let current = items;
      for (const step of path.split("/")) {
        current = current.flatMap(item => stepFrom(item, step));
      }
      return current;
    }

    function stepFrom(item, step) {
      if (step === ".") return [item];
      if (item.kind !== "node") return [];
      if (step === "@id") return [{ kind: "literal", value: item.id }];
      if (!item.node && step !== "@type") return []; // a node the graph does not describe
      return valuesOf(item.node || {}, step).map(toItem);
    }

    /** Several language versions of one value: keep the best language (plus any untagged values). */
    function chooseLanguage(items) {
      const tagged = items.filter(item => item.kind === "literal" && item.language);
      if (tagged.length === 0) return items;

      const untagged = items.filter(item => !(item.kind === "literal" && item.language));
      const best = languages.find(code => tagged.some(item => item.language === code)) || tagged[0].language;
      return [...untagged, ...tagged.filter(item => item.language === best)];
    }

    function isBlank(id) {
      return id.startsWith("_:");
    }

    function lastPart(id) {
      return id.replace(/^.*[#/:]/, "");
    }

    function prettify(text) {
      const words = text.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").toLowerCase();
      return words.charAt(0).toUpperCase() + words.slice(1);
    }

    /** Readable text for any item: a literal's value, a node's label, or a tidied-up IRI. */
    function textOf(item) {
      if (item.kind === "literal") return String(item.value);

      const labels = chooseLanguage(follow([item], "rdfs:label"));
      if (labels.length > 0) return textOf(labels[0]);
      return termLabels[expandTerm(item.id)] || prettify(lastPart(item.id));
    }

    function textsAt(item, path) {
      return chooseLanguage(follow([item], path)).map(textOf);
    }

    /** The link target for a node or for a literal that is a web address; otherwise null. */
    function hrefOf(item) {
      const address = item.kind === "node" ? expandTerm(item.id) : String(item.value);
      return /^https?:\/\//.test(address) ? address : null;
    }

    function findMainNode(type, focusId) {
      if (focusId) return nodesById.get(focusId);
      const wanted = expandTerm(type);
      return nodes.find(node => [].concat(node["@type"] || []).some(t => expandTerm(t) === wanted));
    }

    return { nodes, expandTerm, valuesOf, toItem, follow, chooseLanguage, textOf, textsAt, hrefOf, prettify, lastPart, isBlank, findMainNode };
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

  function anchor(href, text, title) {
    const link = h("a", "", text);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener";
    if (title) link.title = title;
    return link;
  }

  /** RISM notes contain a little HTML. Keep harmless formatting only: no scripts, no attributes except safe links. */
  function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html;

    function clean(parent) {
      for (const child of [...parent.childNodes]) {
        if (child.nodeType !== Node.ELEMENT_NODE) continue;

        clean(child);
        if (!ALLOWED_HTML_TAGS.has(child.tagName)) {
          child.replaceWith(...child.childNodes); // drop the tag, keep its text
          continue;
        }
        for (const attribute of [...child.attributes]) {
          const safeLink = child.tagName === "A" && attribute.name === "href" && /^https?:/.test(attribute.value);
          if (!safeLink) child.removeAttribute(attribute.name);
        }
      }
    }
    clean(template.content);
    return template.content;
  }

  // =====================================================================
  // Display types: how one value is drawn. Add a new one here to support a new display style.
  // =====================================================================

  const DISPLAYS = {
    text(item, model) {
      return model.textOf(item);
    },

    link(item, model) {
      const href = model.hrefOf(item);
      if (!href) return model.textOf(item);

      // A web address stored as plain text has no label, so show its last part.
      const isPlainAddress = item.kind === "literal";
      const text = isPlainAddress ? model.prettify(model.lastPart(href)) : model.textOf(item);
      return anchor(href, text, isPlainAddress ? href : undefined);
    },

    html(item) {
      return sanitizeHtml(String(item.value));
    },
  };

  // =====================================================================
  // Field renderers. Each returns a DOM element, or null when there is nothing to show.
  // =====================================================================

  function headingOf(field, context, model) {
    if (field.heading) return field.heading;
    return field.headingFrom ? model.textsAt(context, field.headingFrom).join("; ") : "";
  }

  function labelOf(field, context, model) {
    if (field.label) return field.label;
    if (field.labelFrom) return model.textsAt(context, field.labelFrom).join("; ");
    return field.id ? model.prettify(field.id) : "";
  }

  /** Values of one item. "valueFrom" may be a list of paths: the first one that has a value wins. */
  function valueItemsOf(item, valueFrom, model) {
    const paths = Array.isArray(valueFrom) ? valueFrom : [valueFrom || "."];
    for (const path of paths) {
      const found = model.chooseLanguage(model.follow([item], path));
      if (found.length > 0) return found;
    }
    return [];
  }

  function renderRow(field, context, model) {
    const items = field.itemsFrom ? model.follow([context], field.itemsFrom) : [context];
    const display = DISPLAYS[field.display || "text"] || DISPLAYS.text;
    const valueElements = [];

    for (const item of items) {
      const linkTarget = field.linkFrom ? model.follow([item], field.linkFrom)[0] : null;
      const suffix = field.suffixFrom ? model.textsAt(item, field.suffixFrom).join(" ") : "";

      for (const valueItem of valueItemsOf(item, field.valueFrom, model)) {
        let content = display(valueItem, model);
        if (linkTarget && model.hrefOf(linkTarget) && typeof content === "string") {
          content = anchor(model.hrefOf(linkTarget), content);
        }
        valueElements.push(h("div", "r-value-item", content, suffix ? `  ${suffix}` : ""));
      }
    }
    if (valueElements.length === 0) return null;

    return h("div", "r-row", h("div", "r-label", labelOf(field, context, model)), h("div", "r-value", ...valueElements));
  }

  /** Puts rows in the order given by field.order (English labels). Rows not listed follow, or are hidden. */
  function orderItems(items, field, model) {
    if (!field.order) return items;

    const listed = [];
    const unlisted = [];
    for (const item of items) {
      const labels = model.follow([item], field.labelFrom).map(model.textOf);
      const position = field.order.findIndex(name => labels.includes(name));
      (position >= 0 ? listed : unlisted).push({ item, position });
    }
    listed.sort((a, b) => a.position - b.position);

    const keepUnlisted = field.unlisted !== "hide";
    return [...listed, ...(keepUnlisted ? unlisted : [])].map(entry => entry.item);
  }

  function renderRows(field, context, model) {
    const items = orderItems(model.follow([context], field.itemsFrom), field, model);
    const rowField = { ...field, itemsFrom: undefined }; // each item becomes one row, values are relative to it

    const rows = items.map(item => renderRow(rowField, item, model)).filter(Boolean);
    if (rows.length === 0) return null;

    const heading = headingOf(field, context, model);
    return h("div", "r-block", heading ? h("h3", "r-heading", heading) : null, ...rows);
  }

  function renderCards(field, context, model) {
    const cards = [];
    for (const item of model.follow([context], field.itemsFrom)) {
      const title = field.titleFrom ? model.textsAt(item, field.titleFrom).join("; ") : "";
      const body = renderFields(field.fields || [], item, model);
      if (body.length > 0) cards.push(h("div", "r-card", title ? h("div", "r-card-title", title) : null, ...body));
    }
    if (cards.length === 0) return null;

    const heading = headingOf(field, context, model);
    return h("div", "r-block", heading ? h("h3", "r-heading", heading) : null, ...cards);
  }

  function renderTitle(field, context, model) {
    const text = model.textsAt(context, field.labelFrom || "rdfs:label").join("; ") || model.textOf(context);
    const href = model.hrefOf(context);
    return h("h1", "r-title", href ? anchor(href, text) : text);
  }

  const FIELD_RENDERERS = { title: renderTitle, row: renderRow, rows: renderRows, cards: renderCards };

  function renderFields(fields, context, model) {
    const elements = [];
    for (const field of fields) {
      const renderField = FIELD_RENDERERS[field.kind];
      if (!renderField) {
        elements.push(h("div", "r-error", `Unknown field kind "${field.kind}" (field "${field.id || "?"}")`));
        continue;
      }
      const element = renderField(field, context, model);
      if (element) {
        element.dataset.field = field.id || "";
        elements.push(element);
      }
    }
    return elements;
  }

  // =====================================================================
  // Optional: show properties that no field in the configuration uses
  // =====================================================================

  function firstStepsOf(config) {
    const used = new Set();
    const pathKeys = ["itemsFrom", "valueFrom", "labelFrom", "headingFrom", "titleFrom", "linkFrom", "suffixFrom"];

    for (const section of config.sections) {
      for (const field of section.fields) {
        for (const key of pathKeys) {
          [].concat(field[key] || []).forEach(path => used.add(path.split("/")[0]));
        }
      }
    }
    return used;
  }

  function renderUnmapped(config, mainItem, model) {
    const settings = config.unmapped;
    const skipped = new Set([...firstStepsOf(config), ...(settings.hide || [])].map(model.expandTerm));
    const rows = [];

    for (const key of Object.keys(mainItem.node).filter(key => !key.startsWith("@"))) {
      if (skipped.has(model.expandTerm(key))) continue;

      const values = model.valuesOf(mainItem.node, key).map(model.toItem).filter(item => item.kind === "literal" || !model.isBlank(item.id));
      if (values.length === 0) continue;

      const valueElements = model.chooseLanguage(values).map(item => h("div", "r-value-item", DISPLAYS.link(item, model)));
      rows.push(h("div", "r-row", h("div", "r-label", model.prettify(model.lastPart(model.expandTerm(key)))), h("div", "r-value", ...valueElements)));
    }
    return rows.length > 0 ? h("section", "r-section", h("h2", "r-section-title", settings.title || "Other data"), ...rows) : null;
  }

  // =====================================================================
  // The public function
  // =====================================================================

  function render(graph, config, container, options = {}) {
    container.replaceChildren();

    const model = createGraphModel(graph, config);
    const mainNode = model.findMainNode(config.appliesTo, options.focusId);
    if (!mainNode) {
      container.append(h("div", "r-error", `No record of type ${config.appliesTo} found in the merged graph.`));
      return;
    }
    const mainItem = model.toItem({ "@id": mainNode["@id"] });

    const page = h("article", "r-page");
    for (const section of config.sections) {
      const elements = renderFields(section.fields, mainItem, model);
      if (elements.length === 0) continue;
      page.append(h("section", "r-section", section.title ? h("h2", "r-section-title", section.title) : null, ...elements));
    }
    if (config.unmapped && config.unmapped.show) {
      const unmapped = renderUnmapped(config, mainItem, model);
      if (unmapped) page.append(unmapped);
    }
    container.append(page);
  }

  root.Renderer = { render };
})(typeof window !== "undefined" ? window : globalThis);
