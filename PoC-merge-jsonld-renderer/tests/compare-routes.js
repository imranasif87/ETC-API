/**
 * Runs both merge routes in Node and prints the results side by side.
 *   npm install
 *   npm test
 */
const jsonld = require("jsonld");
const N3 = require("n3");

const MergeShared = require("../js/merge-shared");
const { createJsonLdMerger } = require("../js/merge-jsonld");
const { createRdfMerger } = require("../js/merge-rdf");
const EMBEDDED_CONTEXTS = require("../data/contexts");
const SAMPLE_DATA = require("../data/samples");

async function compareRoutes(label, inputA, inputB) {
  const contextLoader = MergeShared.createContextLoader({ embeddedContexts: EMBEDDED_CONTEXTS, allowNetwork: false });
  const route1 = await createJsonLdMerger(jsonld, contextLoader).merge(inputA, inputB);
  const route2 = await createRdfMerger(jsonld, contextLoader, { N3 }).merge(inputA, inputB);

  console.log(`\n${label}`);
  console.log(`  Route 1 (jsonld.merge)  : ${route1.statements} statements`);
  console.log(`  Route 2 (via RDF)       : ${route2.stats.statementsMerged} statements`);
  console.log(`  exact duplicates merged : ${route2.stats.exactDuplicatesMerged}`);
  console.log(`  possible duplicates     : ${route2.stats.possibleDuplicates}`);
  console.log(`  routes agree            : ${route1.statements === route2.stats.statementsMerged}`);
}

(async () => {
  await compareRoutes("RISM Work + SuppA Work", SAMPLE_DATA.rism, SAMPLE_DATA.suppa);
  await compareRoutes("SuppA Work merged with itself (shows exact vs possible duplicates)", SAMPLE_DATA.suppa, SAMPLE_DATA.suppa);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
