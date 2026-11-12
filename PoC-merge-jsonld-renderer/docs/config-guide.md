# Config file guide

How to write and edit a display configuration such as `config/work.json`.
Read this before changing a config. Everything here has been checked against `js/renderer.js`.

## 1. What the config does

The renderer (`js/renderer.js`) draws a merged JSON-LD graph as a web page. It knows **no field names**.
The config tells it which fields to show, in which order, under which labels.

- To change what the page shows, edit the config. You do not need to touch any JavaScript.
- Fields appear **in the order they are written** in the file.
- If a field has no data, it is **hidden** automatically.

There is one config file per record type (`config/work.json`, later `config/correspondence.json`, and so on).
The `appliesTo` key says which record type a file is for.

## 2. File format rules (JSON)

The config is a JSON file. These rules are strict, and one mistake stops the whole page from drawing.

1. Use **double quotes** `"` around every key and every text value. Single quotes are not allowed.
2. **No trailing commas.** The last item in a list or object must not be followed by a comma.
3. **No comments.** JSON has none. Put notes in a `"description"` key instead (the renderer ignores it).
4. Every `{` needs a `}` and every `[` needs a `]`.
5. A backslash or a double quote inside text must be escaped: `\\` and `\"`.
6. Key names are **case-sensitive**. `valueFrom` is correct, `valuefrom` is silently ignored (see section 12).
7. Save the file as UTF-8 so accented letters survive.

## 3. Structure at a glance

```
config
 |- appliesTo, languages, termLabels, unmapped     (settings, section 4)
 '- sections[]                                      (section 5)
      '- fields[]                                   (section 6)
           '- (kind "cards" only) fields[]          a card's own fields
```

A minimal valid config:

```json
{
  "appliesTo": "rism:Work",
  "sections": [
    {
      "id": "main",
      "title": null,
      "fields": [
        { "id": "title", "kind": "title", "labelFrom": "rdfs:label" },
        { "id": "opus", "kind": "row", "label": "ETC identifier", "valueFrom": "suppa:etcIdentifier" }
      ]
    }
  ]
}
```

## 4. Top-level keys

| Key | Required | Type | Meaning |
|---|---|---|---|
| `appliesTo` | yes | text | The record type this config draws, as a prefixed name, for example `"rism:Work"`. The renderer finds the first record of this type in the graph and draws it. |
| `sections` | yes | list | The page, from top to bottom. See section 5. |
| `languages` | no | list of text | Language preference, best first, for example `["en", "de", "fr"]`. Default `["en"]`. See section 8. |
| `termLabels` | no | object | Labels for coded terms the data does not label itself. See section 9. |
| `unmapped` | no | object | Optionally show data that no field uses. See section 10. |
| `configVersion` | no | number | For humans only. Not read by the renderer. Increase it when you change the structure of the file. |
| `description` | no | text | A note for editors. Not read by the renderer. |

## 5. Sections

A section is a block of the page, drawn in the order written.

| Key | Required | Meaning |
|---|---|---|
| `id` | yes | A short unique name, for example `"rism"`. |
| `title` | no | Heading shown above the section. Use `null` for no heading. |
| `description` | no | A note for editors. Not shown. |
| `fields` | yes | The list of fields in this section. |

A section whose fields all have no data is left out of the page.

The Work config has two sections: `rism` (the RISM record, no heading) and `supplementary`
(heading "Supplementary data"). The RISM section comes first, so RISM data is always shown before supplementary data.

## 6. Fields

Every field has a `kind`. The kind decides which other keys apply.

| Kind | Draws |
|---|---|
| `title` | The page heading. It links to the record's own web address. |
| `row` | One label with one or more values. |
| `rows` | Many labelled rows built from many nodes (for example the RISM summary rows). |
| `cards` | An optional heading, then one boxed card per node, each card holding its own fields. |

If `kind` is missing or misspelt, the page shows a red message: `Unknown field kind "x"`.

### 6.1 Keys that apply to every field

| Key | Meaning |
|---|---|
| `id` | A short unique name. Used as the label if you give no other label (`etcIdentifier` shows as "Etc identifier"). Not required inside a card. |
| `kind` | `title`, `row`, `rows` or `cards`. Required. |
| `description` | A note for editors. Not shown. |

### 6.2 Kind `title`

| Key | Required | Meaning |
|---|---|---|
| `labelFrom` | no | Path to the text. Default `"rdfs:label"`. |

### 6.3 Kind `row`

One label, one value cell. If the field finds several values, they are listed one per line in the same cell.

| Key | Required | Default | Meaning |
|---|---|---|---|
| `label` | no | | Fixed label text. Wins over `labelFrom`. |
| `labelFrom` | no | | Path to the label, when the data carries its own label (RISM does). |
| `itemsFrom` | no | the record itself | Path to the nodes to read values from. |
| `valueFrom` | no | `"."` (the item itself) | Path, relative to each item, to the value. May be a **list of paths**: the first one that has a value is used. |
| `display` | no | `"text"` | How to draw each value. See section 7. |
| `linkFrom` | no | | Path, relative to each item, to a node or web address. The value text becomes a link to it. Works with `display` `"text"`. |
| `suffixFrom` | no | | Path, relative to each item, to text added after the value. Used for catalogue numbers: `Elgar Thematic Catalogue  ETC 1`. |

If neither `label` nor `labelFrom` is given, the label is made from the `id`.
A row with no values is not drawn.

Example from the Work config:

```json
{ "id": "partOf", "kind": "row",
  "labelFrom": "rism:partOf/rdfs:label",
  "itemsFrom": "rism:partOf/rism:isPartOf",
  "valueFrom": "dcterms:relation", "display": "link",
  "suffixFrom": "rism:hasWorkNumber" }
```

Read it as: label comes from the data; find each "is part of" node; show its related publication as a link, followed by its work number.

### 6.4 Kind `rows`

Builds one row for every node found at `itemsFrom`. Inside each row, `labelFrom` and `valueFrom` are relative to **that row's node**.

| Key | Required | Default | Meaning |
|---|---|---|---|
| `itemsFrom` | **yes** | | Path to the nodes that become rows. |
| `labelFrom` | no | | Path, relative to the row node, to the row label. |
| `label` | no | | One fixed label used for **every** row. Rarely what you want. |
| `valueFrom` | no | `"."` | Path, relative to the row node, to the value. May be a list of paths. |
| `display`, `linkFrom`, `suffixFrom` | no | | As for `row`. |
| `heading` / `headingFrom` | no | | A heading above the block: fixed text, or a path to text in the data. |
| `order` | no | | List of labels. Rows whose label matches are shown first, in this order. Matching uses the label in **any language**. |
| `unlisted` | no | `"append"` | What to do with rows not named in `order`: `"append"` shows them after the listed ones, in the graph's own order; `"hide"` drops them. |

Example (the RISM summary rows):

```json
{ "id": "summary", "kind": "rows",
  "itemsFrom": "rism:hasSummary", "labelFrom": "rdfs:label", "valueFrom": "rdf:value",
  "order": ["Opus number", "Key or mode", "Scoring summary", "Text incipit", "Standardized title", "Dates", "RISM ID number"],
  "unlisted": "append" }
```

**Why `order` exists:** the graph keeps no row order. The page order is therefore set by this list. Without `order`, rows appear in an arbitrary order.

### 6.5 Kind `cards`

| Key | Required | Meaning |
|---|---|---|
| `itemsFrom` | **yes** | Path to the nodes that become cards. |
| `heading` / `headingFrom` | no | Heading above all the cards. |
| `titleFrom` | no | Path, relative to the card node, to the card's title. `"@type"` uses the node's type. |
| `fields` | no | The card's content: a list of fields (`row`, `rows` or `cards`). Their paths start at the **card node**. |

A card with no visible fields is not drawn.

Example:

```json
{ "id": "events", "kind": "cards", "heading": "Events",
  "itemsFrom": "suppa:events/suppa:hasEvent", "titleFrom": "@type",
  "fields": [
    { "kind": "row", "label": "Date",  "valueFrom": "suppa:date" },
    { "kind": "row", "label": "Place", "valueFrom": "suppa:place", "display": "link" }
  ] }
```

## 7. Display types

Set with `display`. If you name a display that does not exist, the renderer falls back to `text`.

| Display | Result |
|---|---|
| `text` | Plain text. For a node, its label. |
| `link` | A link. A node with a web address links to it, shown with its label. A text value that is itself a web address links to it, shown as the last part of the address (for example `example-clara-butt`). Anything else is plain text. |
| `html` | Text that contains simple HTML (RISM notes). Only safe formatting is kept: `a` (with an http or https `href` only), `b`, `br`, `em`, `i`, `span`, `strong`, `sub`, `sup`. Scripts and all other tags and attributes are removed. |

To add a new display type, a developer adds one function to `DISPLAYS` in `js/renderer.js`. Editors cannot add one from the config.

## 8. Paths

A path tells the renderer where to find a value in the graph.

**Syntax.** One or more steps separated by `/`. Each step is one property:

```
dcterms:creator/rism:hasRole/rdfs:label
```

Read left to right: take the record's creator, then its role, then the role's label.

**Step names.**
- A prefixed name such as `rism:hasRole`, or a full web address. How the merged file abbreviates a name does not matter: `rism:hasRole` and the full address are the same.
- The prefix must exist in the merged graph. Currently available: `rdfs`, `rdf`, `rism`, `rismrel`, `pmo`, `relators`, `dcterms`, `geo`, `geojson`, `schemaorg`, `rdau`, `xsd`, `suppa`, `etcrel`, `prov`. The authoritative list is the `@context` at the top of the "Merge JSON-LD" tab.
- Special steps: `.` the item itself, `@id` its web address, `@type` its types.

**Where a path starts.**

| Key | Starts at |
|---|---|
| `itemsFrom`, `labelFrom`, `headingFrom` and other paths of a **top-level** field | The main record |
| `itemsFrom` of a field **inside a card** | The card's node |
| `valueFrom`, `labelFrom`, `linkFrom`, `suffixFrom` when the field has `itemsFrom` | Each item found by `itemsFrom` |

**Languages.** Many values come in several languages. For each path the renderer keeps one language: the first entry in `languages` that is present; if none is, the first one found. Values with no language are always kept.

**Dead ends.** A step that finds nothing simply gives no value, and the field is hidden. A wrong path never causes an error, which is why a misspelt path shows nothing (see section 12).

**How to find the path for a new field.**
1. Run a merge and open the "Merge JSON-LD" tab.
2. Find the record node (the one with `"@id": "https://rism.online/works/..."`). Its keys are the possible first steps.
3. If the value is `{ "@id": "_:b3" }`, find the node with that `@id`; its keys are the next steps.
4. Repeat until you reach the value. Join the keys with `/`.

Worked example: Opus number. The record has `rism:hasSummary` (several nodes). One of them has `rdfs:label` "Opus number" and `rdf:value` "op. 25". So: `itemsFrom: "rism:hasSummary"`, `labelFrom: "rdfs:label"`, `valueFrom: "rdf:value"`, and the row is chosen by naming it in `order`.

## 9. Labels

Where the label of a field comes from, in this order:

1. `label`: fixed text.
2. `labelFrom`: read from the data, translated by the same language rules.
3. The field's `id`, tidied up (`etcIdentifier` becomes "Etc identifier").

**Which to use.** For RISM data, use `labelFrom`: RISM sends its own labels in seven languages, and they stay correct if RISM changes the wording. For supplementary data, which carries no labels, use `label`.

`termLabels` (below) is separate: it labels coded values, not fields.

## 10. `termLabels`

Some values are coded terms with no label in the data, such as `etcrel:author`. `termLabels` gives them a label:

```json
"termLabels": { "etcrel:author": "Author", "etcrel:place": "Place" }
```

It is used wherever a node has no `rdfs:label`. If a term is not listed, the renderer shows a tidied last part of its address (`etcrel:place` becomes "Place"). Prefixes do not need to match the data's: the lookup uses full addresses.

## 11. `unmapped`

Shows properties of the main record that **no field in the config uses**, so new data is never lost silently.

```json
"unmapped": { "show": true, "title": "Other data", "hide": ["prov:wasDerivedFrom", "rism:hasKeyMode"] }
```

| Key | Meaning |
|---|---|
| `show` | `true` to display the extra section. Default off. |
| `title` | Section heading. |
| `hide` | Properties never to show here (technical or duplicate data). |

This is a discovery aid: each leftover property is shown as a plain "label: value" row with a label made from the property name. When you see something useful there, give it a proper field and add it to `hide` or just leave it, since a property used by a field is excluded automatically.

## 12. Recipes

**Remove a field.** Delete the whole `{ ... }` object. Check the commas: no comma after the last item.

**Move a field.** Cut the object and paste it where you want it. Order in the file is order on the page. To move something to another section, paste it into that section's `fields`.

**Rename a label.** If the field has `label`, edit it. If it has `labelFrom`, replace the `labelFrom` line with `"label": "New text"`.

**Reorder the summary rows.** Reorder the names inside `order`.

**Hide one summary row.** Remove its name from `order`, then set `"unlisted": "hide"`. Note that this hides **every** row not named, so list all the rows you want to keep.

**Add a supplementary field.**
1. Find the property in the "Merge JSON-LD" tab (section 8).
2. Add inside the right section's `fields`:
   ```json
   { "id": "textSource", "kind": "row", "label": "Text source", "valueFrom": "suppa:textSource" }
   ```

**Add a list of linked items.** Use `itemsFrom` and `valueFrom`:
```json
{ "id": "formOfWork", "kind": "row", "label": "Form of work",
  "itemsFrom": "rism:formOfWork/rism:hasFormOfWork", "valueFrom": ".", "display": "link" }
```

**Add a new section.** Add an object to `sections` with `id`, `title` and `fields`.

**Prefer German before English.** Set `"languages": ["de", "en"]`.

**Label a coded term.** Add it to `termLabels`.

**Show data nobody configured yet.** Set `unmapped.show` to `true`.

## 13. What the config cannot do (yet)

| Not supported | Workaround |
|---|---|
| Showing only some relationships (for example only the dedicatee) | Not possible yet. A role filter is a planned feature. |
| Grouping rows by role | Not possible yet. |
| Reusing a block between configs (shared field definitions) | Copy the block. A shared-blocks feature is planned. |
| Date or number formatting | Values are shown as stored. |
| Images and music notation | Not drawn. |
| A hidden flag on a field | Delete the field instead. |
| Several main records on one page | One record per page. |
| Language choice per field | One language order for the whole config. |

## 14. When something looks wrong

| Symptom | Likely cause |
|---|---|
| "Could not draw the page: ..." | The JSON is invalid. See section 2. Look for a trailing comma, a missing quote or bracket. |
| Red message `Unknown field kind` | `kind` is missing or misspelt. |
| Red message `No record of type ... found` | `appliesTo` is wrong, or the merge did not produce a record of that type. |
| A field is missing from the page | Its path finds nothing: wrong prefix, wrong property name, or the data really has no value. Test the path by walking it by hand (section 8). |
| A row shows the record's own title as its value | A key was misspelt (for example `valuefrom`) and the default `"."` took over. Run the checker (section 15). |
| Labels are in the wrong language | Check `languages`. |
| A label looks odd ("Example clara butt") | The value is a web address with no label in the data. This is a data gap, not a config problem. |
| Rows appear in a strange order | The `rows` field has no `order`, or the names in `order` do not match the labels exactly. |
| New data does not appear | It has no field yet. Turn on `unmapped` to see it. |

## 15. Check your config before saving

**1. Run the checker.** It catches misspelt keys, wrong values and missing required keys:

```
npm install
npm run check-config
```

It checks every file in `config/` against `config/config.schema.json`.

**2. Look at the page.** Paste the config into the "Config" tab and press Apply config. Compare the result with the page you expected.

The checker cannot know whether a path is right. Only the page shows that.

**Final checklist**
- [ ] The file is valid JSON (no trailing commas, no comments).
- [ ] Every field has a `kind`; `rows` and `cards` have `itemsFrom`.
- [ ] The checker passes.
- [ ] The page shows what you expected, in the right order.
- [ ] Notes are in `description` keys, not comments.
- [ ] If you changed the structure of the file, `configVersion` was increased.

## 16. Quick reference

| Key | Used in | Value |
|---|---|---|
| `appliesTo` | top level | record type, e.g. `"rism:Work"` |
| `languages` | top level | list, best first |
| `termLabels` | top level | object: term to label |
| `unmapped` | top level | `{ show, title, hide }` |
| `sections` | top level | list of sections |
| `id`, `title`, `fields` | section | name, heading or `null`, list |
| `kind` | field | `title` `row` `rows` `cards` |
| `label`, `labelFrom` | field | fixed text, path |
| `heading`, `headingFrom` | `rows`, `cards` | fixed text, path |
| `itemsFrom` | `row` (optional), `rows` and `cards` (required) | path |
| `valueFrom` | `row`, `rows` | path, or list of paths |
| `display` | `row`, `rows` | `text` `link` `html` |
| `linkFrom`, `suffixFrom` | `row`, `rows` | path |
| `order`, `unlisted` | `rows` | list of labels; `append` or `hide` |
| `titleFrom` | `cards` | path |
| `fields` | `cards` | list of fields |
