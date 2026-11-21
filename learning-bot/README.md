# Pi learning bot — experimental mobile MVP

**Desktop UI:** existing Pi terminal with teach / code-coach skills.
**Phone UI:** a private Telegram bot with buttons and open-ended questions.
**Model:** one-shot Pi CLI calls for question generation and recall grading.
**Progress:** SQLite for learning evidence and review dates; Obsidian remains the lesson notebook.

This is not yet the full Pi teaching UI on a phone. The first version
supports short guided lessons, concept registration, due reviews, choices, free-text recall, hints
and progress. Desktop Pi continues to handle dependency maps and code coaching.

## Requirements

- Node.js 22.13+ (built-in node:sqlite)
- Working authenticated Pi executable on the host; verify with pi -p
- Telegram token created using @BotFather and your numeric private chat ID
- Always-on Linux host (for example, a Proxmox VM or container)

No npm package dependencies.

## Setup

1. Set up Pi with your model provider on the same Linux host as the bot.
2. Create a bot with Telegram @BotFather. Disable group use if unneeded.
3. Open a private chat with it and send /start. To discover your chat ID,
   set TELEGRAM_BOT_TOKEN locally and inspect getUpdates by running:

       curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates"

   Find message.chat.id. Keep the token secret.
4. Set environment variables (prefer a protected systemd EnvironmentFile):

       export TELEGRAM_BOT_TOKEN="YOUR_SECRET_BOT_TOKEN"
       export TELEGRAM_CHAT_ID="YOUR_NUMERIC_PRIVATE_CHAT_ID"
       export LEARNING_DB="$HOME/.local/share/pi-learning/learning.sqlite"
       export PI_BIN="pi"

5. Start:

       cd learning-bot
       npm test
       npm start

   For an always-on service, use systemd with Restart=on-failure. Telegram
   long polling requires outbound HTTPS only. Run exactly one process per
   Telegram token.
6. Use the same LEARNING_DB from desktop Pi:

       node learning-bot/bin/learn.mjs add "JavaScript" "Promises"
       node learning-bot/bin/learn.mjs due
       node learning-bot/bin/learn.mjs status

   The learning-state skill explains how Pi should register genuine learning
   evidence. Do not point different machines at the same live SQLite file
   through Nextcloud.

## Commands

- /topic JavaScript — switch active topic
- /add Promises — add a concept to that topic
- /teach Promises — introduce one idea with a motivated explanation and application check
- /review — free-form recall of a due concept
- /quiz — multiple choice with Telegram buttons
- /hint — reveal a clue without granting a mastery upgrade
- /skip — abandon a question without recording a result
- /status — progress overview
- /help — command reference

When a free-form question is open, reply in your own words. The answer is
graded and the next due date is scheduled. Further questions require another
/review or /quiz command.

## Learning model

Successive correct reviews increase the interval to 1, 3, 7, 14, 30, 60,
120 days. A miss resets the streak and schedules a retry after six hours.
This is a simple deterministic baseline, not a tuned FSRS model.

Mastery values are intentionally modest: 0 = unverified, 1 = correct
unhinted recognition, 2 = correct unhinted recall. They do not imply
independent coding or transfer mastery. A daily notification is sent at most
once per Malta calendar date if at least one concept is due.

## Security and privacy

- Only the configured private TELEGRAM_CHAT_ID can use commands.
- The service exposes no inbound HTTP endpoint.
- Bot Pi subprocesses run with extensions, skills and tools disabled,
  preventing learner messages from making tool calls or editing the vault.
- Pi model providers and Telegram process the question/answer text.
- SQLite stores answers and grading feedback. Protect the DB and backups.
- No secrets should appear in user answers, concepts, or feedback.
- Backup via SQLite's backup API or stop the process before copying the DB.
- Never commit credentials or the learning database.

## Limitations

- This MVP does not yet migrate existing Obsidian drill scoreboards. It also
  does not automatically import concepts from old lesson notes.
- Existing terminal-only interactive tools have not been ported to Telegram:
  the mobile bot uses its own question renderer.
- The full multi-node probe → plan → teach and project diff-review loops remain in
  terminal Pi. They are future mobile features.
- Language-model grading may be wrong. The bot is not an exam proctor.
- There is no code-execution sandbox for learner submissions.
- Shared state works only if both Pi and the Telegram service can access
  the same local SQLite file. Multi-host use needs an authenticated API.
- After Pi CLI upgrades, recheck compatibility of its print-mode flags.

## Testing

    cd learning-bot
    npm test

Tests cover the persistence and scheduling engine without requiring Pi or
a Telegram token. A real provider and Telegram integration test are still
needed before production use.
