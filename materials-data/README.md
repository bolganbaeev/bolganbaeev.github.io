# Materials Data Format

This directory is used by the `Study Materials` page on GitHub Pages.
No backend/server is required.

## 1) Catalog file
Edit `catalog.json` to define subjects and topics.

Each topic must contain:
- `id`: unique topic id
- `code`: short code (for example `1.1`)
- `title`: topic name
- `summary`: short text on card
- `count`: total Q/A count (for card preview)
- `file`: path to topic JSON file

## 2) Topic files
Create topic files under `topics/`.

Supported formats:

```json
{
  "items": [
    { "question": "...", "answer": "..." },
    { "q": "...", "a": "..." }
  ]
}
```

or plain array:

```json
[
  { "question": "...", "answer": "..." }
]
```

## Notes
- The page shows only topic cards first.
- Q/A list is loaded only when user opens a topic.
- Topic viewer uses pagination, so large datasets (for example 5000+) are supported.

## Optional text parser
If you have lines like `Question:Answer`, use:

```bash
node materials-data/parse-qa.js materials-data/source.txt materials-data/topics/new-topic.json
```

It will convert each valid line into:

```json
{ "question": "...", "answer": "..." }
```
