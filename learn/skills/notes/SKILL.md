---
name: notes
description: Write lesson notes to a local markdown file and Trilium at once. Use at the very start of any lesson, and after every question, answer and explanation. Also use to find what was covered in earlier lessons.
---
# Notes

Every lesson is written to two places at once: a local markdown file (which
renders LaTeX and mermaid) and a Trilium note (which syncs to his phone). The
`lesson` command writes both in one call, so they never drift. Never write to
one without the other, and never write lesson content with `cat >` or an editor.

Both commands are on PATH and already configured. Never ask the user for a
file path, URL, token or note ID.

## Before anything else

Search for earlier work on the topic. If a note exists, read it: it tells you
where he got to last time, which sharpens the probe.

```bash
trilium search "networking"
trilium get ApAzw8gwqf4O
```

`search` prints one line per hit: noteId, then title.

## Open the lesson — first action of every session

Do this **before** the probe, not after the plan. The probe is the most
valuable record in the whole session and it must not be lost.

```bash
lesson start "Networking" <<'EOF'
Started: 2026-09-18

## Probe
EOF
```

It prints the file path and the noteId, and remembers both. Every later
`lesson log` goes to that lesson until the next `lesson start`.

The title is the topic, in plain words. The filename is derived from it.

## Log as you go

Everything worth keeping goes through `lesson log`, as it happens.

**Every probe question, with his answer.** This is not optional and it is not
a summary at the end. After each quiz, immediately:

```bash
lesson log <<'EOF'
**Q.** What does a DNS resolver return for a CNAME record?

- His answer: the IP address
- Correct: another domain name, which then needs its own lookup
- Reading: he is collapsing the two-step resolution into one
EOF
```

Write the misses in full, including what the wrong answer reveals about his
model. Write the correct answers too, in one line each, since the floor
matters as much as the ceiling.

**The plan**, once he approves it.

**Each node**, as it finishes its loop: why it was needed, what it
establishes, what it hangs off.

## Diagrams

The local file renders fenced mermaid, the Trilium note does not, since it
holds markdown source. So put the diagram in the lesson with `lesson log` as a
fenced block, and additionally create it as its own rendering note in Trilium:

```bash
TRILIUM_NOTE_TYPE=mermaid TRILIUM_NOTE_MIME=text/mermaid \
  trilium new "Networking - map" <<'EOF'
graph TD
  A[all communication is packets] --> B[addressing]
EOF
```

## Commands

    lesson start "Topic"  < intro    create local file + Trilium note
    lesson log            < text     append to both
    lesson where                     print current file and noteId
    trilium search "query"           search earlier lessons
    trilium get <noteId>             read an earlier lesson
    trilium new "Title"   < body     create a standalone note (diagrams)

Content always comes in on stdin.

## Rules

- Use heredocs with quoted `'EOF'` so backticks, `$` and LaTeX survive.
- One lesson per topic, not one per session. Returning to a topic means
  `lesson start` with the same title, which appends to the same file.
- Write for him, not for yourself. No session logs, no narration of what you
  are about to do.
- Do not announce saving. Write and keep teaching.
- If `lesson` exits non-zero, tell him once, plainly, and continue teaching.
  Do not retry in a loop.
