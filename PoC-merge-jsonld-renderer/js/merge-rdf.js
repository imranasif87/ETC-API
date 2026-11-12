/**
 * ROUTE 2: merge via RDF.
 *
 *   1. Convert each JSON-LD file into RDF statements (subject, predicate, object).
 *   2. Put all statements together. A statement that appears in both files is kept once.
 *   3. Convert the combined statements back to JSON-LD. Turtle and N-Quads are produced too.
 *   4. Compare the two files and explain what could not be merged (the report).
 *
 * Why not just use jsonld.merge()? Working with statements lets us tag each one with the
 * file it came from, and lets the report compare the files statement by statement.
 *
 * No browser-only code: works in a page (window.MergeRdf) and in Node (require).
 */
(function (root) {
  const Shared = typeof module !== "undefined" ? require("./merge-shared") : root.MergeShared;

  const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  const XSD_STRING = "http://www.w3.org/2001/XMLSchema#string";
  const PROV_DERIVED_FROM = "http://www.w3.org/ns/prov#wasDerivedFrom";
  const MAX_ANONYMOUS_NODE_REPORTS = 12;

  /**
   * @param {object} jsonld          the jsonld.js library
   * @param {object} contextLoader   from MergeShared.createContextLoader()
   * @param {object} options
   * @param {object} options.N3      the N3.js library (only used to write Turtle)
   */
  function createRdfMerger(jsonld, contextLoader, options = {}) {
    const N3 = options.N3;
    const documentLoader = contextLoader.documentLoader;

    // =====================================================================
    // Small helpers for RDF terms
    //
    // jsonld.js returns each statement as { subject, predicate, object }.
    // A term is { termType: "NamedNode" | "BlankNode" | "Literal", value, ... }.
    // =====================================================================

    /**
     * A text key for a term. Two terms are the same thing exactly when their keys are equal,
     * which is how we detect duplicate statements.
     */
    function termKey(term) {
      if (term.termType === "BlankNode") return term.value;
      if (term.termType === "NamedNode") return `<${term.value}>`;

      let key = JSON.stringify(term.value); // a literal, for example "Allegro maestoso"
      if (term.language) {
        key += "@" + term.language;
      } else if (term.datatype && term.datatype.value !== XSD_STRING) {
        key += `^^<${term.datatype.value}>`;
      }
      return key;
    }

    function statementKey(statement) {
      return [statement.subject, statement.predicate, statement.object].map(termKey).join(" ");
    }

    /** Short, human-friendly text for a term, used in the report. */
    function describeTerm(term, prefixes) {
      if (term.termType === "NamedNode") return Shared.shortenIri(term.value, prefixes);
      if (term.termType === "BlankNode") return "(anonymous node)";

      const text = term.value.length > 60 ? term.value.slice(0, 57) + "..." : term.value;
      return JSON.stringify(text);
    }

    // =====================================================================
    // Step 1: JSON-LD -> statements
    // =====================================================================

    /**
     * Anonymous (blank) nodes are labelled _:b0, _:b1 ... separately for each file, so the two
     * files would both have a "_:b0" that are different things. We add the file name:
     * _:rism_b0 and _:suppa_b0 can never be confused.
     */
    function prefixBlankNode(term, sourceName) {
      if (term.termType !== "BlankNode") return term;
      const label = term.value.replace(/^_:/, "");
      return { termType: "BlankNode", value: `_:${sourceName}_${label}` };
    }

    /**
     * @returns {{ document: object, warnings: object[], statements: object[] }}
     *   warnings are messages from jsonld.js, for example "this key is not defined in the context".
     */
    async function convertToStatements(sourceName, input) {
      const document = typeof input === "string" ? JSON.parse(input) : input;
      const warnings = [];

      const dataset = await jsonld.toRDF(document, {
        documentLoader,
        eventHandler: ({ event }) => {
          warnings.push(event);
        },
      });

      const statements = dataset.map(quad => ({
        subject: prefixBlankNode(quad.subject, sourceName),
        predicate: quad.predicate,
        object: prefixBlankNode(quad.object, sourceName),
        source: sourceName,
      }));

      return { document, warnings, statements };
    }

    /**
     * Optional: when file B says "I am derived from <X>" (prov:wasDerivedFrom), treat B's own
     * IRI as X so the two records join. Returns the rewritten statements.
     */
    function rewriteDerivedFrom(statements, notes) {
      const replacements = new Map(); // B's IRI -> the IRI it was derived from

      for (const statement of statements) {
        const isDerivedFrom = statement.predicate.value === PROV_DERIVED_FROM;
        if (isDerivedFrom && statement.object.termType === "NamedNode") {
          replacements.set(statement.subject.value, statement.object.value);
        }
      }

      function replaceIri(term) {
        const shouldReplace = term.termType === "NamedNode" && replacements.has(term.value);
        return shouldReplace ? { termType: "NamedNode", value: replacements.get(term.value) } : term;
      }

      replacements.forEach((target, original) => {
        notes.push(`derivedFrom applied: ${original} is now treated as ${target}`);
      });

      return statements
        .filter(statement => statement.predicate.value !== PROV_DERIVED_FROM)
        .map(statement => ({
          ...statement,
          subject: replaceIri(statement.subject),
          object: replaceIri(statement.object),
        }));
    }

    // =====================================================================
    // Step 2: combine statements. Identical statements collapse into one.
    // =====================================================================

    /**
     * @returns {Map} statement key -> the statement plus `sources`, the set of files that said it.
     *   A statement whose `sources` has two entries was present in both files: an exact duplicate.
     */
    function unionStatements(statements) {
      const union = new Map();

      for (const statement of statements) {
        const key = statementKey(statement);
        if (!union.has(key)) {
          union.set(key, { ...statement, sources: new Set() });
        }
        union.get(key).sources.add(statement.source);
      }
      return union;
    }

    // =====================================================================
    // Outputs: N-Quads and Turtle
    // =====================================================================

    function termToNTriples(term) {
      return term.termType === "BlankNode" ? term.value : termKey(term);
    }

    /**
     * One line per statement. The last item, such as <urn:source:rism>, tells which file the
     * statement came from. (In RDF this fourth item is called the "named graph".)
     */
    function buildNQuads(allStatements, union) {
      return allStatements
        .map(statement => {
          const parts = [statement.subject, statement.predicate, statement.object].map(termToNTriples);
          const inBothFiles = union.get(statementKey(statement)).sources.size > 1;
          const marker = inBothFiles ? "  # identical statement in both sources" : "";
          return `${parts.join(" ")} <urn:source:${statement.source}> .${marker}`;
        })
        .join("\n");
    }

    /** Turtle for the merged statements. N3.js is used only as a writer here. */
    function buildTurtle(unionEntries, prefixes) {
      const { DataFactory } = N3;
      const writer = new N3.Writer({ prefixes });

      function toN3Term(term) {
        if (term.termType === "BlankNode") return DataFactory.blankNode(term.value.replace(/^_:/, ""));
        if (term.termType === "NamedNode") return DataFactory.namedNode(term.value);
        if (term.language) return DataFactory.literal(term.value, term.language);
        return DataFactory.literal(term.value, DataFactory.namedNode(term.datatype.value));
      }

      return new Promise((resolve, reject) => {
        for (const entry of unionEntries) {
          writer.addQuad(
            DataFactory.quad(toN3Term(entry.subject), toN3Term(entry.predicate), toN3Term(entry.object))
          );
        }
        writer.end((error, turtle) => (error ? reject(error) : resolve(turtle)));
      });
    }

    // =====================================================================
    // Step 4: the report. Each function below looks for one kind of problem.
    //
    // `add(level, title, detail, fix)` records a finding.
    //   level: "ok" | "info" | "warn" | "error"
    // =====================================================================

    /** Messages from jsonld.js, for example keys that the context does not define. */
    function reportLibraryWarnings(add, source, label) {
      const alreadyReported = new Set();

      for (const warning of source.warnings) {
        const property = warning.details && warning.details.property;
        const dedupeKey = `${warning.code}|${property || ""}`;
        if (alreadyReported.has(dedupeKey)) continue;
        alreadyReported.add(dedupeKey);

        // A context can ignore a key on purpose by mapping it to null (RISM does this for typeLabel).
        const ignoredOnPurpose = warning.details && warning.details.expandedProperty === null;
        add(
          ignoredOnPurpose ? "info" : "warn",
          `Source ${label}: key "${property}" was ${ignoredOnPurpose ? "ignored by the context on purpose" : "dropped"}`,
          warning.message,
          ignoredOnPurpose
            ? ""
            : "The JSON-LD context does not define this key, so it never reached the merge. Add it to the context, or add an @vocab."
        );
      }
    }

    function reportExactDuplicates(add, exactDuplicates, prefixes) {
      if (exactDuplicates.length === 0) {
        add(
          "info",
          "No exact duplicate statements were found",
          "Exact means the same subject, predicate and object in both files. Facts that mean the same thing " +
            "but use different field names or anonymous nodes are not exact duplicates; they are listed " +
            "below as possible duplicates."
        );
        return;
      }

      const examples = exactDuplicates
        .slice(0, 15)
        .map(entry => {
          const subject = describeTerm(entry.subject, prefixes);
          const predicate = Shared.shortenIri(entry.predicate.value, prefixes);
          const object = describeTerm(entry.object, prefixes);
          return `${subject}  ${predicate}  ${object}`;
        })
        .join("\n");

      add("ok", `${exactDuplicates.length} exact duplicate statement(s) merged into one`, examples);
    }

    function namedSubjects(statements) {
      const iris = statements.filter(s => s.subject.termType === "NamedNode").map(s => s.subject.value);
      return new Set(iris);
    }

    /** Do the two files describe the same record(s)? Returns the shared IRIs. */
    function reportSharedRecords(add, sourceA, sourceB, prefixes) {
      const subjectsA = namedSubjects(sourceA.statements);
      const subjectsB = namedSubjects(sourceB.statements);
      const sharedIris = [...subjectsA].filter(iri => subjectsB.has(iri));

      if (sharedIris.length > 0) {
        add("ok", "Records joined on a shared IRI", sharedIris.map(iri => Shared.shortenIri(iri, prefixes)).join(", "));
        return sharedIris;
      }

      const sample = subjects => [...subjects].slice(0, 3).map(iri => Shared.shortenIri(iri, prefixes)).join(", ");
      add(
        "error",
        "The two files share no record IRI, so nothing joins",
        `A describes: ${sample(subjectsA)}. B describes: ${sample(subjectsB)}.`,
        'If B is a supplement to A, tick "Treat prov:wasDerivedFrom as the same record", or give both records the same @id.'
      );
      return sharedIris;
    }

    /** For every (shared record, field) pair, gather the set of values one file gives. */
    function groupValues(statements, sharedIris) {
      const groups = new Map(); // "record field" -> { predicate, values: Map(termKey -> term) }

      for (const statement of statements) {
        if (!sharedIris.includes(statement.subject.value)) continue;

        const groupKey = `${statement.subject.value} ${statement.predicate.value}`;
        if (!groups.has(groupKey)) {
          groups.set(groupKey, { predicate: statement.predicate.value, values: new Map() });
        }
        groups.get(groupKey).values.set(termKey(statement.object), statement.object);
      }
      return groups;
    }

    /** Same record, same field: do both files agree on the value? */
    function reportFieldComparison(add, sourceA, sourceB, sharedIris, prefixes) {
      const groupsA = groupValues(sourceA.statements, sharedIris);
      const groupsB = groupValues(sourceB.statements, sharedIris);
      const fieldsWithIdenticalValues = new Set();
      const fieldsOnlyInA = new Set();
      const fieldsOnlyInB = new Set();

      const allGroupKeys = new Set([...groupsA.keys(), ...groupsB.keys()]);
      for (const groupKey of allGroupKeys) {
        const a = groupsA.get(groupKey);
        const b = groupsB.get(groupKey);
        const predicate = (a || b).predicate;
        const fieldName = Shared.shortenIri(predicate, prefixes);

        if (!a || !b) {
          (a ? fieldsOnlyInA : fieldsOnlyInB).add(fieldName);
          continue;
        }

        const valuesOnlyInA = [...a.values].filter(([key]) => !b.values.has(key));
        const valuesOnlyInB = [...b.values].filter(([key]) => !a.values.has(key));
        const hasIdenticalValue = valuesOnlyInA.length < a.values.size;
        if (hasIdenticalValue) fieldsWithIdenticalValues.add(fieldName);

        // A field such as rdf:type can legitimately have several values, so it is not a conflict.
        const isConflict = (valuesOnlyInA.length > 0 || valuesOnlyInB.length > 0) && predicate !== RDF_TYPE;
        if (isConflict) {
          const list = values => values.map(([, term]) => describeTerm(term, prefixes)).join(", ") || "-";
          add(
            "warn",
            `Same field, different values: ${fieldName}`,
            `A: ${list(valuesOnlyInA)}  |  B: ${list(valuesOnlyInB)}`,
            "Both values are kept in the merged graph. If only one should win, choose a preferred source and " +
              "drop the other, or keep each source's value in its own named graph (see the N-Quads tab)."
          );
        }
      }

      if (fieldsWithIdenticalValues.size > 0) {
        add("ok", "Identical statements merged (duplicates removed)", [...fieldsWithIdenticalValues].join(", "));
      }
      if (fieldsOnlyInA.size > 0 || fieldsOnlyInB.size > 0) {
        add(
          "info",
          "Fields found in only one source (kept, nothing to merge)",
          `A only: ${[...fieldsOnlyInA].join(", ") || "-"}  |  B only: ${[...fieldsOnlyInB].join(", ") || "-"}`
        );
      }
    }

    function predicatesUsed(statements) {
      return new Set(statements.map(statement => statement.predicate.value));
    }

    function lastPart(iri) {
      return iri.replace(/.*[#/]/, ""); // ".../v1#hasRole" -> "hasRole"
    }

    function iriValuesOf(statements, predicate, prefixes) {
      const values = statements
        .filter(s => s.predicate.value === predicate && s.object.termType === "NamedNode")
        .map(s => Shared.shortenIri(s.object.value, prefixes));
      return [...new Set(values)].slice(0, 6);
    }

    /** Two fields with the same name but different IRIs (rism:hasRole and suppa:hasRole). */
    function reportSameNameDifferentNamespace(add, sourceA, sourceB, prefixes) {
      const predicatesA = predicatesUsed(sourceA.statements);
      const predicatesB = predicatesUsed(sourceB.statements);

      for (const predicateA of predicatesA) {
        if (predicatesB.has(predicateA)) continue; // same IRI in both: already the same field

        for (const predicateB of predicatesB) {
          if (predicatesA.has(predicateB)) continue;
          if (lastPart(predicateA) !== lastPart(predicateB)) continue;

          const valuesA = iriValuesOf(sourceA.statements, predicateA, prefixes);
          const valuesB = iriValuesOf(sourceB.statements, predicateB, prefixes);
          const valuesDiffer =
            valuesA.length > 0 && valuesB.length > 0 && !valuesA.some(value => valuesB.includes(value));

          add(
            "warn",
            `Possible duplicate: same name, different namespace: ${Shared.shortenIri(predicateA, prefixes)} and ${Shared.shortenIri(predicateB, prefixes)}`,
            valuesDiffer ? `Their values also differ. A: ${valuesA.join(", ")}  |  B: ${valuesB.join(", ")}` : "",
            "These look like the same field, but the merge cannot know. Best fix: make one context reuse the " +
              "other's IRI. Alternative: add owl:equivalentProperty" +
              (valuesDiffer ? " and align the values with owl:sameAs or skos:exactMatch." : ".")
          );
        }
      }
    }

    /**
     * For each anonymous node, the facts it states directly about IRIs or literals,
     * for example "dcterms:relation <person/45128>". Returns Map(blank node -> Set(fact text)).
     */
    function factsOfAnonymousNodes(statements, prefixes) {
      const facts = new Map();

      for (const statement of statements) {
        const isFactAboutAnonymousNode =
          statement.subject.termType === "BlankNode" &&
          statement.object.termType !== "BlankNode" &&
          statement.predicate.value !== RDF_TYPE;
        if (!isFactAboutAnonymousNode) continue;

        if (!facts.has(statement.subject.value)) facts.set(statement.subject.value, new Set());
        const predicate = Shared.shortenIri(statement.predicate.value, prefixes);
        facts.get(statement.subject.value).add(`${predicate} ${describeTerm(statement.object, prefixes)}`);
      }
      return facts;
    }

    /** The field an anonymous node hangs from, for example "rism:creator". */
    function parentFieldOf(statements, blankNode, prefixes) {
      const link = statements.find(s => s.object.termType === "BlankNode" && s.object.value === blankNode);
      return link ? Shared.shortenIri(link.predicate.value, prefixes) : "top level";
    }

    /**
     * Anonymous nodes are never merged automatically. If one in each file states the same fact,
     * that fact now appears twice.
     */
    function reportAnonymousNodeRepeats(add, sourceA, sourceB, prefixes) {
      const factsA = factsOfAnonymousNodes(sourceA.statements, prefixes);
      const factsB = factsOfAnonymousNodes(sourceB.statements, prefixes);
      let reportedCount = 0;

      for (const [nodeA, setA] of factsA) {
        for (const [nodeB, setB] of factsB) {
          const sharedFacts = [...setA].filter(fact => setB.has(fact));
          if (sharedFacts.length === 0) continue;

          reportedCount++;
          if (reportedCount > MAX_ANONYMOUS_NODE_REPORTS) continue;

          const parentA = parentFieldOf(sourceA.statements, nodeA, prefixes);
          const parentB = parentFieldOf(sourceB.statements, nodeB, prefixes);
          add(
            "warn",
            `Possible duplicate: anonymous nodes repeat the same fact: ${parentA} (A) and ${parentB} (B)`,
            `Shared: ${sharedFacts.join("; ")}`,
            "Anonymous (blank) nodes are never merged automatically, so this fact appears twice. Give such " +
              "items a stable @id in both sources (for example a URI built from work + role + person), or " +
              "add a rule that merges anonymous nodes sharing the same target."
          );
        }
      }
    }

    function buildReport({ sourceA, sourceB, prefixes, notes, exactDuplicates }) {
      const findings = [];
      const add = (level, title, detail = "", fix = "") => findings.push({ level, title, detail, fix });

      notes.forEach(note => add("info", note));
      reportLibraryWarnings(add, sourceA, "A (RISM)");
      reportLibraryWarnings(add, sourceB, "B (SuppA)");
      reportExactDuplicates(add, exactDuplicates, prefixes);
      const sharedIris = reportSharedRecords(add, sourceA, sourceB, prefixes);
      reportFieldComparison(add, sourceA, sourceB, sharedIris, prefixes);
      reportSameNameDifferentNamespace(add, sourceA, sourceB, prefixes);
      reportAnonymousNodeRepeats(add, sourceA, sourceB, prefixes);
      return findings;
    }

    // =====================================================================
    // The public function: run all the steps
    // =====================================================================

    /**
     * @param {string|object} inputA  RISM JSON-LD
     * @param {string|object} inputB  SuppA JSON-LD
     * @param {object} mergeOptions
     * @param {boolean} mergeOptions.derived  treat prov:wasDerivedFrom as "same record"
     */
    async function merge(inputA, inputB, mergeOptions = {}) {
      // Step 1: JSON-LD -> statements
      const sourceA = await convertToStatements("rism", inputA);
      const sourceB = await convertToStatements("suppa", inputB);
      const notes = [];
      if (mergeOptions.derived) {
        sourceB.statements = rewriteDerivedFrom(sourceB.statements, notes);
      }

      // Step 2: combine
      const allStatements = [...sourceA.statements, ...sourceB.statements];
      const union = unionStatements(allStatements);
      const unionEntries = [...union.values()];
      const exactDuplicates = unionEntries.filter(entry => entry.sources.size > 1);

      // Step 3: statements -> JSON-LD (and Turtle, N-Quads)
      const prefixes = Shared.collectPrefixes(contextLoader.loadedContexts, sourceA.document, sourceB.document);
      const dataset = unionEntries.map(entry => ({
        subject: entry.subject,
        predicate: entry.predicate,
        object: entry.object,
        graph: { termType: "DefaultGraph", value: "" },
      }));
      const expanded = await jsonld.fromRDF(dataset);
      const merged = await jsonld.compact(expanded, { "@context": prefixes });
      const turtle = N3 ? await buildTurtle(unionEntries, prefixes) : "(N3.js is not loaded)";
      const nquads = buildNQuads(allStatements, union);

      // Step 4: report
      const findings = buildReport({ sourceA, sourceB, prefixes, notes, exactDuplicates });
      const possibleDuplicates = findings.filter(f => f.title.startsWith("Possible duplicate")).length;

      return {
        merged,
        turtle,
        nquads,
        findings,
        stats: {
          statementsInA: sourceA.statements.length,
          statementsInB: sourceB.statements.length,
          statementsMerged: union.size,
          exactDuplicatesMerged: exactDuplicates.length,
          possibleDuplicates,
        },
      };
    }

    return { merge };
  }

  const api = { createRdfMerger };
  if (typeof module !== "undefined") module.exports = api;
  else root.MergeRdf = api;
})(typeof window !== "undefined" ? window : globalThis);
