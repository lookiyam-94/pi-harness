---
name: notes
description: Write lesson notes to a local markdown file and Trilium at once. Use at the very start of any lesson, and after every question, answer and explanation. Also use to find what was covered in earlier lessons.
---
# Notes

Every lesson is written to two places at once: a local markdown file (which
renders LaTeX and mermaid) and Trilium (which syncs to his phone). The
`lesson` command writes both in one call, so they never drift. Never write to
one without the other, and never write lesson content with `cat >` or an editor.

Both commands are on PATH and already configured. Never ask the user for a
file path, URL, token or note ID.

## Before anything else

Search for earlier work on the topic. If a note exists, read it: it tells you
where he got to last time, which sharpens the probe.

```bash
trilium search "networking"
trilium children Kd82mPq0xLa1
trilium get Tz4nWb7cQe90
```

`search` and `children` print one line per note: noteId, then title. A
topic's main note lists its sessions; read the latest ones.

## Open the lesson — first action of every session

Do this **before** the probe, not after the plan. The probe is the most
valuable record in the whole session and it must not be lost.

```bash
lesson start "Networking" <<'EOF'
Started: 2026-09-18

## Probe
EOF
```

In Trilium each topic is a main note with one child note per session:

```text
Networking                ← main note, found by title, so he can move it
├── Networking - map      ← diagrams, as rendered mermaid notes
├── Session 2026-09-18
└── Session 2026-10-10    ← today's `lesson log` lands here
```

`lesson start` finds or creates the main note, then opens today's session
note under it (a second start on the same day continues that note). The local
file stays one growing file per topic, with a `## Session <date>` heading per
session. It prints the file path and the noteIds, and remembers them. Every
later `lesson log` goes to that session until the next `lesson start`.

The title is the topic, in plain words. The filename is derived from it.
Don't put a session heading in the intro; `lesson start` adds it.

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

**Each node**, as it finishes its loop, in two parts:

1. **The explanation, written in full.** Write it fresh for reading later,
   not copied from chat: chat leans on the back-and-forth, and the note has to
   stand alone. Cover the motivating problem, every reasoning step in order,
   the examples and analogies that made it click, and the re-explanation if
   the first pass missed. It should read like a textbook section he could
   re-learn the node from cold, months later. Do not summarize or compress.
2. **A bullet recap** under it: why it was needed, what it establishes, what
   it hangs off, and the quiz result (misses in full).

```bash
lesson log <<'EOF'
## Node 2 — FTP

Prose explanation here: the problem, each step, examples...

- Motivated by: ...
- Established: ...
- Hangs off: ...
- Quiz: ...
EOF
```

## Diagrams

The local file renders fenced mermaid, a markdown note in Trilium does not.
So `lesson diagram` does both: it logs the diagram as a fenced block, and
keeps it as a rendered mermaid note under the topic's main note, titled
`<Topic> - <name>`. Running it again with the same name updates that note.

```bash
lesson diagram "map" <<'EOF'
graph TD
  A[all communication is packets] --> B[addressing]
EOF
```

## Commands

    lesson start "Topic"   < intro    open today's session (file + Trilium)
    lesson log             < text     append to both
    lesson diagram "Name"  < mermaid  log it + keep it as a mermaid note
    lesson where                      print current file and noteIds
    trilium search "query"            search earlier lessons
    trilium children <noteId>         list a topic's sessions and diagrams
    trilium get <noteId>              read an earlier session
    trilium new "Title"    < body     create a standalone note

Content always comes in on stdin.

## Rules

- Use heredocs with quoted `'EOF'` so backticks, `$` and LaTeX survive.
- One lesson per topic, not one per session. Returning to a topic means
  `lesson start` with the same title: same file, same main note, a new
  session note.
- Write for him, not for yourself. No session logs, no narration of what you
  are about to do.
- Do not announce saving. Write and keep teaching.
- If `lesson` exits non-zero, tell him once, plainly, and continue teaching.
  Do not retry in a loop.
