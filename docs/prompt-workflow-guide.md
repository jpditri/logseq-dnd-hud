Prompt Workflow Guide

This document outlines a semi-automatic workflow for creating, templating, refining, executing, and classifying directive prompts as Markdown files. It covers directory structure, naming conventions, CLI tools, classification logic, and optional GitHub Actions integration.

⸻

1. Directory Structure

/pages/workflow/prompts/
├── raw/                   # New, unprocessed prompt .md files
├── preprocessed/          # After templating/refinement
├── templates/             # Mustache/Jinja2 template files (.mustache/.j2)
├── context/               # Data for templating (JSON/YAML)
└── results/
    ├── error/             # Prompts that errored during execution
    ├── success_short/     # Completed in ≤ 60s
    ├── success_long/      # Completed in 61s–600s
    └── timeout/           # Timed out (> 600s)

All files are Markdown (.md).

⸻

2. Naming Conventions
•Raw/Preprocessed files: YYYYMMDD-HHMMSS_<slug>.md
•Result files: preserve original filename when moving into outcome folder.
•Templates: human-readable names, e.g. api_call.mustache.

Example: /pages/workflow/prompts/raw/20250616-104512_fetch_user_data.md

⸻

3. Workflow Steps
1.Create a prompt
•Manually drop a new .md into raw/ or run:

prompt-init "fetch user data from API"

2.Preprocess (LLM-powered template selection & rendering)
•Invoke the LLM with:
•the raw prompt text
•a list of available template filenames from templates/
•any supplemental context snippets from context/
•The LLM will select the most appropriate template (or suggest adjustments) and return a fully rendered, refined prompt.
•Example CLI invocation:

prompt-preprocess --in raw/20250616-104512_fetch_user_data.md \
                  --templates templates/ \
                  --context context/user_api.json \
                  --out preprocessed/

•Output: preprocessed/20250616-104512_fetch_user_data.md now contains frontmatter metadata (e.g. templateUsed) and the refined prompt body.

3.Execute asynchronously**
•Launch runner:

prompt-run --in preprocessed/*.md \
           --concurrency 4 \
           --timeout 600 \
           --results-dir results/

4.Classify & move
•Runner measures duration and exitCode:
•exitCode ≠ 0 → move to results/error/
•duration ≤ 60s → results/success_short/
•61s ≤ duration ≤ 600s → results/success_long/
•duration > 600s (timeout) → results/timeout/
5.Archive & log
•Each result file gets frontmatter metadata:

---
status: success_short
duration: 42.7
exitCode: 0
executedAt: 2025-06-16T10:55:12-07:00
---

6.Refinement Loop
•Review results/error/*.md and results/success_long/*.md for further tuning.
•Updated prompts get copied back to raw/ or into preprocessed/ for re‑run.

⸻

4. CLI Tool Suggestions

CommandPurpose
prompt-initScaffold a new raw prompt skeleton
prompt-preprocessRender templates with context data
prompt-runExecute prompts asynchronously
prompt-classify(Internal) Classify based on time & code
prompt-cleanupArchive/move finished prompts

⸻

5. Sample Classification Script (Node.js)

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const runPrompt = require('./lib/runPrompt');

async function processFile(file) {
  const start = Date.now();
  try {
    await runPrompt(file, { timeout: 600000 });
    const duration = (Date.now() - start) / 1000;
    let folder = duration <= 60 ? 'success_short' : 'success_long';
    move(file, `results/${folder}`);
  } catch (err) {
    if (err.message.includes('timeout')) {
      move(file, 'results/timeout');
    } else {
      move(file, 'results/error');
    }
  }
}

function move(src, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.renameSync(src, path.join(destDir, path.basename(src)));
}

// process all files in preprocessed/
fs.readdirSync('preprocessed').forEach(f => processFile(`preprocessed/${f}`));

⸻

6. (Optional) GitHub Actions Integration

on:
  push:
    paths:
      - 'pages/workflow/prompts/raw/**/*.md'
jobs:
  run-prompts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install Dependencies
        run: npm ci
      - name: Execute Prompts
        run: npm run process-prompts
      - name: Commit Results
        run: |
          git config user.name 'github-actions'
          git config user.email 'actions@github.com'
          git add pages/workflow/prompts/results/
          git commit -m 'chore: update prompt results'
          git push

⸻

With this structure in place, you can rapidly author, iterate, and track the lifecycle of your prompts, ensuring clear visibility into successes, failures, and performance characteristics. Adjust naming, thresholds, or tool choices to suit your environment.

⸻

7. LLM Agent Directive Prompt

Below is a YAML-style directive for an LLM-based orchestrator agent. It defines system behavior, functions you can call, and the assistant’s high-level plan to implement the prompt workflow.

system:
  description: |
    You are a workflow orchestrator agent. Your responsibility is to manage
    the lifecycle of Markdown prompts stored under /pages/workflow/prompts/.
    You will:
      - Monitor raw and preprocessed directories for new prompts.
      - Invoke preprocessing, execution, and classification tools.
      - Move files based on outcome and annotate them with metadata.
    Use the provided function definitions for file operations and CLI calls.

functions:
  - name: list_files
    description: List all .md files in a given directory.
    parameters:
      type: object
      properties:
        path:
          type: string
          description: Directory path to list
      required: ["path"]

  - name: call_preprocess
    description: Execute the prompt-preprocess CLI.
    parameters:
      type: object
      properties:
        input_file:
          type: string
        templates_dir:
          type: string
        context_dir:
          type: string
        output_dir:
          type: string
      required: ["input_file","templates_dir","context_dir","output_dir"]

  - name: call_execute
    description: Run the prompt-run CLI on a given file.
    parameters:
      type: object
      properties:
        input_file:
          type: string
        timeout:
          type: integer
      required: ["input_file","timeout"]

  - name: move_file
    description: Move a file from source to destination directory.
    parameters:
      type: object
      properties:
        src:
          type: string
        dest:
          type: string
      required: ["src","dest"]

  - name: add_frontmatter
    description: Add or update YAML frontmatter in a Markdown file.
    parameters:
      type: object
      properties:
        file:
          type: string
        metadata:
          type: object
      required: ["file","metadata"]

assistant:
  name: orchestrate_workflow
  description: |
    Implement the workflow as follows:
      1. Call list_files on "pages/workflow/prompts/raw" to discover new raw prompts.
      2. For each raw file:
         a. call_preprocess with input_file, templates_dir="templates/", context_dir="context/", output_dir="preprocessed/".
      3. Call list_files on "preprocessed" to find rendered prompts.
      4. For each preprocessed file:
         a. Record start time.
         b. call_execute with input_file and timeout=600.
         c. Record end time and exit code.
         d. Determine outcome folder: 
            - exitCode != 0 → "results/error"
            - duration <= 60 → "results/success_short"
            - duration <= 600 → "results/success_long"
            - else → "results/timeout"
         e. add_frontmatter to file with metadata {status, duration, exitCode, executedAt}.
         f. move_file from preprocessed to the chosen results folder.
      5. Repeat or idle until new raw files appear.
