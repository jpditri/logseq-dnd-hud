#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const runPrompt = require('../lib/runPrompt');

const BASE = path.join(__dirname, '..', 'pages', 'workflow', 'prompts');
const RAW_DIR = path.join(BASE, 'raw');
const PRE_DIR = path.join(BASE, 'preprocessed');
const TEMPLATES_DIR = path.join(BASE, 'templates');
const CONTEXT_DIR = path.join(BASE, 'context');
const RESULTS = path.join(BASE, 'results');

function listMarkdown(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

function preprocessFile(file) {
  // Placeholder for template rendering. For now, copy the file.
  const dest = path.join(PRE_DIR, path.basename(file));
  fs.mkdirSync(PRE_DIR, { recursive: true });
  fs.copyFileSync(file, dest);
  fs.unlinkSync(file);
  return dest;
}

function addFrontmatter(file, metadata) {
  let content = fs.readFileSync(file, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  let body = content;
  const meta = {};
  if (fmMatch) {
    body = content.slice(fmMatch[0].length);
    for (const line of fmMatch[1].split(/\r?\n/)) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
  }
  Object.assign(meta, metadata);
  const yaml = Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  content = `---\n${yaml}\n---\n${body}`;
  fs.writeFileSync(file, content);
}

function move(src, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.renameSync(src, path.join(destDir, path.basename(src)));
}

async function processFile(file) {
  const start = Date.now();
  let exitCode = 0;
  let status = 'success_short';
  try {
    const result = await runPrompt(file, { timeout: 600000 });
    exitCode = result.code;
    const duration = (Date.now() - start) / 1000;
    if (exitCode !== 0) {
      status = 'error';
    } else if (duration <= 60) {
      status = 'success_short';
    } else if (duration <= 600) {
      status = 'success_long';
    } else {
      status = 'timeout';
    }
    const dest = path.join(RESULTS, status);
    addFrontmatter(file, {
      status,
      duration: duration.toFixed(1),
      exitCode,
      executedAt: new Date().toISOString(),
    });
    move(file, dest);
  } catch (err) {
    status = err.message === 'timeout' ? 'timeout' : 'error';
    const duration = (Date.now() - start) / 1000;
    const dest = path.join(RESULTS, status);
    addFrontmatter(file, {
      status,
      duration: duration.toFixed(1),
      exitCode: exitCode || 1,
      executedAt: new Date().toISOString(),
    });
    move(file, dest);
  }
}

function main() {
  // Step 1 & 2: preprocess raw prompts
  listMarkdown(RAW_DIR).forEach((file) => {
    preprocessFile(file);
  });

  // Step 3-5: execute and classify
  listMarkdown(PRE_DIR).forEach((file) => {
    processFile(file);
  });
}

main();
