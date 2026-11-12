/**
 * ROUTE 1: merge with jsonld.js only.
 *
 * We never touch RDF statements ourselves. jsonld.merge() does all the work:
 *   - expands each file using its own @context
 *   - joins nodes that have the same @id
 *   - drops values that are identical
 *
 * What it cannot do: recognise that two differently named fields, or two anonymous
 * nodes, mean the same thing. Route 2 (merge-rdf.js) reports those cases.
 */
(function (root) {
  const Shared = typeof module !== "undefined" ? require("./merge-shared") : root.MergeShared;

  function createJsonLdMerger(jsonld, contextLoader) {
    const jsonldOptions = { documentLoader: contextLoader.documentLoader };

    /**
     * @param {string|object} inputA  first JSON-LD document (text or parsed)
     * @param {string|object} inputB  second JSON-LD document
     * @returns {{ merged: object, statements: number }}
     */
    async function merge(inputA, inputB) {
      const documents = [inputA, inputB].map(parseIfText);

      // Step 1: the merge itself. The result is "flattened": one list of nodes, full IRIs.
      const flattened = await jsonld.merge(documents, null, jsonldOptions);

      // Step 2: make it readable by shortening IRIs with the prefixes from the contexts.
      const prefixes = Shared.collectPrefixes(contextLoader.loadedContexts, ...documents);
      const merged = await jsonld.compact(flattened, { "@context": prefixes });

      // Step 3: count statements, only so the page can compare with Route 2.
      const statementCount = (await jsonld.toRDF(flattened, jsonldOptions)).length;

      return { merged, statements: statementCount };
    }

    return { merge };
  }

  function parseIfText(input) {
    return typeof input === "string" ? JSON.parse(input) : input;
  }

  const api = { createJsonLdMerger };
  if (typeof module !== "undefined") module.exports = api;
  else root.MergeJsonLd = api;
})(typeof window !== "undefined" ? window : globalThis);
