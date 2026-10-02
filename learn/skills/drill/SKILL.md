---
name: drill
description: Re-test him on things he has already been taught or already got wrong. Use when he asks to drill, review, revise, practise, or be quizzed on a topic, or when preparing for an exam. Not for teaching new material - that is the teach skill.
---
# Drill

Teaching builds understanding. Drilling keeps it. This is the second job, and
it is not the same as the first: here you are not explaining, you are testing
and recording what held.

Drill state lives in **Trilium only**, in one note per topic, titled
`Drill: <Topic>`. It is a scoreboard, not a transcript: one line per item, its
current status, rewritten each session. Never write a session log. Never write
drill state to a local file, because state that exists in two places
immediately disagrees with itself.

## Where items come from

Two sources, in this order:

1. **Past misses.** Search lesson notes for the topic and read them. Every
   quiz miss recorded there is already a known weak point, which makes it the
   highest-value thing to re-test. This is the main source.

   ```bash
   trilium search "networking"
   trilium get ApAzw8gwqf4O
   ```

2. **Material he points you at.** An exam blueprint, a note, a document. Fine
   to use, but see *Accuracy* below.

Do not invent items from your own recall of a subject. A drill deck full of
unverified facts trains him on your hallucinations, and unlike a lesson there
is no explanation step where an error would surface.

## The state note

Find or create it:

```bash
trilium search "Drill: Networking"
```

If it does not exist:

```bash
trilium new "Drill: Networking" <<'EOF'
# Drill: Networking

Status: new | shaky | ok | retired

## Items
EOF
```

Each item is one line, in this shape:

    - [shaky] 2026-09-18 | OSPF administrative distance is 110 | confuses it with EIGRP's 90

That is: status, date last drilled, the fact being tested, and a short note on
how he goes wrong when he does. The last field is the useful one. Keep it.

Status means:

- **new** — never drilled
- **shaky** — missed at least once recently
- **ok** — got it right last time
- **retired** — right three sessions running, stop asking

## A session

1. Read the state note with `trilium get`.
2. Pull in any new misses from lesson notes since the last drill, as `new`.
3. Pick **10 to 15 items**: every `shaky` one first, then `ok` items not seen
   in a week or more, then `new` ones to fill. Never drill `retired` items
   unless he asks.
4. Ask them one at a time with `quiz`, following the option-construction rules
   in the teach skill. Those rules apply here in full: bare parallel claims,
   distractors built by mutating the correct one, no asymmetric bolding.
5. Track results as you go, in your head, not in Trilium.
6. **At the end**, rewrite the state note once with `trilium set`, with every
   status and date updated. One write per session, not one per question.

```bash
trilium get ApAzw8gwqf4O > /tmp/drill.md
# ... edit ...
trilium set ApAzw8gwqf4O < /tmp/drill.md
```

Then tell him the score in one or two lines: how many right, and which items
are still shaky. Nothing longer.

## When he misses

Say what the right answer is and why, briefly. If the miss shows a genuine
misconception rather than a memory lapse, say so and offer to teach that piece
properly with the teach skill rather than drilling it again. Drilling a
misconception just rehearses it.

## Accuracy

Every item must be verifiable. If you are even slightly unsure of a fact,
check it with the `researcher` subagent before it goes in the deck. A wrong
item drilled repeatedly is worse than no drill at all, because repetition is
exactly what makes things stick.

## Understanding vs memorising

Some material is genuinely arbitrary: port numbers, default timers,
administrative distances. Nothing derives them, so drilling is the right tool.

Most material is not. If an item can be derived from something he already
understands, it does not belong in the deck: teach the derivation once and it
stops needing rehearsal. When you notice a deck filling up with things that
should be derivable, say so and propose a lesson instead.

## Rules

- Trilium only. No local files, no `lesson` command.
- One state note per topic, rewritten, never appended to.
- One write per session, at the end.
- No session transcripts. If he wants to know how he did, he asks.
- If `trilium` fails, tell him once and carry on drilling from memory for the
  rest of the session, then say plainly that the results were not saved.
