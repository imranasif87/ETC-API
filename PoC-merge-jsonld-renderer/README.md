# JSON-LD merge proof of concept

Merges a RISM JSON-LD record and a SuppA JSON-LD record in the browser, two ways, and reports what could not be merged.

## Run it
- Open `index.html` in a browser (double-click is enough; nothing to install).
- Press **Load Work sample**, then **Merge**. **Report** shows what did not merge and how to fix it.
- Optional, in Node: `npm install` then `npm test` compares both routes on the samples.

## Files
| File | Purpose |
|---|---|
| `js/merge-jsonld.js` | Route 1: `jsonld.merge()` only (about 25 lines) |
| `js/merge-rdf.js` | Route 2: JSON-LD to RDF statements, combine, back to JSON-LD, plus Turtle, N-Quads and the report |
| `js/merge-shared.js` | Finds contexts, collects prefixes (used by both routes) |
| `js/app.js` | Screen wiring only |
| `data/contexts.js` | Built-in JSON-LD contexts (RISM Work; SuppA Work, Person, Place, Correspondence) |
| `data/samples.js` | Sample Work records |
| `vendor/` | Third-party libraries: Bootstrap 5.3.8, jsonld.js 9.0.0, N3.js 2.13.12 (minified, as published on npm) |

The code in `js/` is not minified. Only the files in `vendor/` are.

## Reusing the merge
`merge-jsonld.js` and `merge-rdf.js` have no browser code. Copy them with `merge-shared.js` into a build step or a Node service and call
`createJsonLdMerger(jsonld, loader).merge(a, b)` or `createRdfMerger(jsonld, loader, { N3 }).merge(a, b)`.

## Known limits
- The RISM sample is rebuilt from an example, not a live API response.
- Contexts other than the built-in ones are fetched, which needs the server to allow cross-origin requests.
- Tested in Node; check the page in your browser.
