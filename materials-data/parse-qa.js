#!/usr/bin/env node

const fs = require('fs');

function usage() {
  console.error('Usage: node materials-data/parse-qa.js <input.txt> <output.json>');
  process.exit(1);
}

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) usage();

if (!fs.existsSync(inputPath)) {
  console.error(`Input not found: ${inputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8');
const lines = raw.split(/\r?\n/);
const items = [];

for (const line of lines) {
  const cleaned = line
    .replace(/^\s*[\-\*•►>]+\s*/, '')
    .replace(/^\s*\d+[\).\-]?\s*/, '')
    .trim();

  if (!cleaned) continue;

  const colonIndex = cleaned.indexOf(':');
  if (colonIndex === -1) continue;

  const question = cleaned.slice(0, colonIndex).trim();
  const answer = cleaned.slice(colonIndex + 1).trim();
  if (!question || !answer) continue;

  items.push({ question, answer });
}

const out = { items };
fs.writeFileSync(outputPath, JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`Parsed ${items.length} Q/A lines -> ${outputPath}`);
