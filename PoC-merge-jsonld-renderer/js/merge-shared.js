/**
 * Helpers shared by both merge routes.
 *
 *   createContextLoader  finds JSON-LD @context documents (built-in copies first, then the network)
 *   collectPrefixes      reads prefix definitions (rism:, dcterms: ...) out of the loaded contexts
 *   shortenIri           turns a full IRI into prefix:name so people can read it
 *
 * No browser-only code, so it works in a page (window.MergeShared) and in Node (require).
 */
(function (root) {
  /**
   * @param {object}  options
   * @param {object}  options.embeddedContexts  map of context URL -> context document
   * @param {boolean} options.allowNetwork      fetch contexts that are not built in (default: true if fetch exists)
   */
  function createContextLoader(options = {}) {
    const embeddedContexts = options.embeddedContexts || {};
    const allowNetwork = options.allowNetwork ?? typeof fetch !== "undefined";
    const loadedContexts = {}; // every context used so far; needed later to find prefixes

    // The function jsonld.js calls whenever a document refers to a context by URL.
    async function documentLoader(url) {
      let contextDocument = embeddedContexts[url];

      if (!contextDocument) {
        if (!allowNetwork) {
          throw new Error(`Context ${url} is not built in and network access is not available`);
        }
        const response = await fetch(url, {
          headers: { Accept: "application/ld+json, application/json" },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} while fetching context ${url}`);
        }
        contextDocument = await response.json();
      }

      loadedContexts[url] = contextDocument;
      return { contextUrl: null, documentUrl: url, document: contextDocument };
    }

    return { documentLoader, loadedContexts };
  }

  /**
   * Collects prefix definitions such as  "rism": "https://rism.online/api/v1#"
   * from the contexts that the given JSON-LD documents use.
   */
  function collectPrefixes(loadedContexts, ...documents) {
    const prefixes = {};

    function readContext(context) {
      if (typeof context === "string") {
        // a URL: look at the context we loaded for it
        const loaded = loadedContexts[context];
        if (loaded) readContext(loaded["@context"]);
        return;
      }
      if (Array.isArray(context)) {
        context.forEach(readContext);
        return;
      }
      if (!context || typeof context !== "object") return;

      for (const [term, definition] of Object.entries(context)) {
        const isPrefix =
          typeof definition === "string" &&
          /^https?:/.test(definition) &&
          /[#/]$/.test(definition) &&
          !term.startsWith("@");
        if (isPrefix) prefixes[term] = definition;
      }
    }

    documents.forEach(document => readContext(document["@context"]));
    return prefixes;
  }

  /** "https://rism.online/api/v1#hasRole" -> "rism:hasRole" (unchanged if no prefix matches) */
  function shortenIri(iri, prefixes) {
    for (const [prefix, namespace] of Object.entries(prefixes)) {
      if (iri.startsWith(namespace)) return `${prefix}:${iri.slice(namespace.length)}`;
    }
    return iri;
  }

  const api = { createContextLoader, collectPrefixes, shortenIri };
  if (typeof module !== "undefined") module.exports = api;
  else root.MergeShared = api;
})(typeof window !== "undefined" ? window : globalThis);
