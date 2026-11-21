---
name: learning-state
description: Keep desktop Pi and the mobile learning bot in sync. Use at the beginning and end of teach, drill, or code-coach sessions when LEARNING_DB is configured.
---
# Shared learning state

The learning bot has a single authoritative SQLite store, accessed through
the dependency-free CLI in the repository. Keep detailed lesson notes in Obsidian
as before. The database stores **which concepts need review, when, and evidence
from practice**; it is not a duplicate of the notes.

## Before starting to teach

From the repository root:

    node learning-bot/bin/learn.mjs status
    node learning-bot/bin/learn.mjs due

Read any relevant due concepts and attempt history. Prefer reviewing genuinely
due prerequisites before adding new material; do not block a requested lesson.

## After teaching a concept

Register it once with a stable name:

    node learning-bot/bin/learn.mjs add "JavaScript" "Promise resolution"

Concept titles should be precise enough to test independently, and consistent
across sessions. Never add a vague topic such as "all of React" as one concept.

## After an observed, independent assessment

Assess only if you actually observed an answer or implementation. Do not mark a
topic as passing merely because you explained it. Use:

    node learning-bot/bin/learn.mjs assess "JavaScript" "Promise resolution" pass "Independently explained thenable resolution"
    node learning-bot/bin/learn.mjs assess "JavaScript" "Promise resolution" fail "Confused resolution with fulfillment"

Each assessment schedules the next review. A hinted answer should not be
recorded as independent success; prefer fail or simply register without
scoring. The current CLI accepts pass/fail, not finer-grained evidence.

## Boundaries

- Do not run assess for simulated or guessed performance.
- Do not put secrets, personal identifying details, or full session transcripts
  in concept names or feedback.
- Do not read/write SQLite using ad hoc SQL; use the CLI.
- The old Obsidian drill scoreboard remains separate; it is not automatically
  migrated. Avoid using both schedulers for the same concept until migration.
- The phone bot's question-generation prompts follow the teaching philosophy,
  but full multi-node lesson planning and live project code reviews still run
  through desktop Pi.
- LEARNING_DB must point at the *same absolute path* in both processes. On
  separate computers, run the bot on the host that owns the database; do not
  sync a live SQLite file through Nextcloud.
