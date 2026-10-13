---
name: notes
description: Write lesson notes into his Obsidian vault as the lesson happens. Use at the very start of any lesson, and after every question, answer and explanation. Also use to find what was covered in earlier lessons.
---
# Notes

Every lesson is written into his Obsidian vault, which renders markdown,
LaTeX and mermaid. The `lesson` command does the writing and `vault` reads
earlier notes. Never write lesson content with `cat >` or an editor: `lesson`
keeps the folder layout and links consistent.

Both commands are on PATH and already configured. Never ask the user for a
vault path or file name.

## Before anything else

Search for earlier work on the topic. If a note exists, read it: it tells you
where he got to last time, which sharpens the probe.

```bash
vault search "networking"
vault list "Learn/Networking"
vault get "Learn/Networking/Networking 2026-09-18"
```

`search`, `list` and `find` print one note path per line, relative to the
vault. Pass those paths straight to `vault get`. A topic's main note links
its sessions; read the latest ones. The vault holds his other notes too
(homelab, Docker, Linux...); they can tell you what he already knows.

## Open the lesson — first action of every session

Do this **before** the probe, not after the plan. The probe is the most
valuable record in the whole session and it must not be lost.

```bash
lesson start "Networking" <<'EOF'
## Probe
EOF
```

Each topic is a folder under `Learn/` in the vault:

```text
Learn/Networking/
├── Networking.md              ← main note: embeds diagrams, links sessions
├── Networking - map.md        ← kept up to date by `lesson diagram`
├── Networking 2026-09-18.md
└── Networking 2026-10-10.md   ← today's `lesson log` lands here
```

`lesson start` creates the folder and main note if needed, links today's
session from the main note, and opens today's session note (a second start
on the same day continues that note). It prints the note paths and remembers
them. Every later `lesson log` goes to that session until the next
`lesson start`.

The title is the topic, in plain words. Characters Obsidian forbids in
file names (`/ : ? # [ ]` ...) are replaced in the file name; the heading
keeps the title as written. Don't put a session heading or date in the
intro; `lesson start` adds them.

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

Obsidian renders LaTeX (`$...$`, `$$...$$`) and fenced mermaid, so write
notation and diagrams normally. Use `[[wikilinks]]` to point at other notes
in the vault when a lesson builds on one.

## Diagrams

`lesson diagram` logs the diagram into today's session as a fenced mermaid
block, and also keeps it as its own note, `<Topic> - <name>`, embedded in the
topic's main note. Running it again with the same name replaces that note, so
the main note always shows the latest version (a dependency map that grows
over sessions, for example).

```bash
lesson diagram "map" <<'EOF'
graph TD
  A[all communication is packets] --> B[addressing]
EOF
```

## Commands

    lesson start "Topic"   < intro    open today's session note
    lesson log             < text     append to it
    lesson diagram "Name"  < mermaid  log it + keep it as its own note
    lesson where                      print current note paths
    vault search "query"              find notes by title or text
    vault find "Title"                path of the note with this exact title
    vault list "Learn/Topic"          notes in a folder
    vault get "<path>"                read a note
    vault new "<path>"     < body     create a standalone note

Content always comes in on stdin.

## Rules

- Use heredocs with quoted `'EOF'` so backticks, `$` and LaTeX survive.
- One lesson per topic, not one per session. Returning to a topic means
  `lesson start` with the same title: same folder, same main note, a new
  session note.
- Write for him, not for yourself. No session logs, no narration of what you
  are about to do.
- Do not announce saving. Write and keep teaching.
- Never edit or delete his other notes in the vault. Read them, link them.
- If `lesson` exits non-zero, tell him once, plainly, and continue teaching.
  Do not retry in a loop.
