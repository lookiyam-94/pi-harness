# pi harness

My personal configuration for the [pi](https://github.com/earendil-works/pi) coding agent. Most of it is a learning system: skills that turn pi into a tutor that finds what you already know, plans a lesson around it, and checks that each idea actually landed. It also includes a coding coach that never writes your code for you.

## Skills

### `teach` — learn any topic so it sticks

For when you want to understand something, not just memorize it. Built on two principles:

1. **Unconditional truths first.** Start from a few facts you can accept at face value, with no caveats, and build everything else on top of them.
2. **"How could I have discovered this?"** Every new idea is motivated, so it feels inevitable rather than arbitrary.

Every session follows the same shape:

- **Probe:** quizzes find the edge of what you know, going harder after each right answer until something breaks.
- **Plan:** the agent proposes a lesson plan with a dependency map, and waits for your approval.
- **Teach:** one idea at a time. Each idea gets a short quiz, then the agent asks whether anything is still unclear and re-explains what didn't land.

### `code-coach` — learn to code by building a project yourself

Project-based coding lessons for HTML, CSS, JavaScript, TypeScript, APIs, React, Tailwind and Next.js. **You write every line of code; the agent never does.**

1. You say what you want to learn and what you'd like to build.
2. The agent tests your level with concept quizzes, "what does this code do?" questions, and small tasks you write.
3. It plans the project as milestones, each adding one to three new concepts. Milestone 1 is setting up the project, done by you.
4. For each milestone:
   - **Brief:** what to build, why the project needs it, and how you'll know it's done.
   - **Predict:** you describe your approach before you start coding.
   - **Build:** you write the code. When you're stuck, hints come one step at a time, from a pointed question up to pseudocode, and never the solution.
   - **Review:** you commit, and the agent reads the diff, runs type-check, lint and build, and looks at the running app in a browser.
   - **Check:** you explain your own code, take a quiz, and say what's still unclear. Anything unclear is re-explained more simply.
5. Every few milestones there's a stress milestone: the API is slow, returns an error, or the screen is 320px wide, and you handle it.

Project state (the plan, milestone briefs and progress) lives in a `.coach/` folder inside the project, so you can stop and resume. What you learned goes into your lesson notes.

### `drill` — keep what you learned

Re-tests material you were already taught, starting with the questions you got wrong in past lessons. It keeps one scoreboard note per topic in Trilium, rewritten each session, so you can see what has held and what hasn't.

### `notes` — lesson notes in two places

Writes every lesson to a local markdown file (which shows code, LaTeX and mermaid diagrams properly) and a Trilium note (which syncs to your phone) in one command, so the two never disagree. It records each probe question, quiz miss, plan and explanation as the lesson happens, not as a summary at the end.

### `visualize` — diagrams that are correct

Adds a diagram to a lesson only when the idea is clearer as a picture: a dependency graph, a flow, a state machine, a geometric figure. A separate subagent (`svg-maker` or `mermaid-maker`) draws it, renders it and checks it by looking at the image before it's used.

## Extensions

| Extension | What |
|---|---|
| `quiz` | Multiple-choice questions with instant feedback: right or wrong, the correct answer, and an explanation |
| `ask-user-question` | Pop-up questions for choices with no right answer (goals, preferences, what's unclear) |
| `coach-guard` | Enforces `code-coach`: in any project with a `.coach/` folder, the agent can only write inside `.coach/` and run commands that read or check. `/coach on` / `/coach off` toggles it |
| `md-log` | Mirrors a session to a markdown file for easier reading |
| `visual-tools` | Write, edit and render tools for the diagram subagents |
| `omarchy-system-theme` | Switches pi between light and dark to match the current Omarchy theme |

## Subagents

Used through [pi-interactive-subagents](https://github.com/amosblomqvist/pi-interactive-subagents), which runs them in tmux.

| Agent | What |
|---|---|
| `researcher` | Checks facts on the web before they're taught |
| `svg-maker` | Draws and verifies SVG diagrams |
| `mermaid-maker` | Draws and verifies mermaid diagrams |

## MCP servers

| Server | What |
|---|---|
| `context7` | Up-to-date library docs, so advice about Next.js, React or Tailwind isn't based on old versions |
| `browser` | Chrome DevTools on Chromium with a throwaway profile: screenshots, console errors, network requests and CSS, for reviewing the running app |

## Layout

| Path | What |
|---|---|
| `settings.json` | Default model and installed packages |
| `mcp.json` | MCP servers |
| `learn/` | The learning system, loaded as a local pi package: `skills/`, `extensions/`, `agents/` |
| `agents/` | Links to `learn/agents/`, where pi-interactive-subagents looks for global agents |
| `extensions/` | Other global extensions |
| `bin/` | `lesson` and `trilium` command-line tools used by the `notes` and `drill` skills |

## Install

```bash
git clone https://github.com/lookiyam-94/pi-harness ~/.pi/agent
```

Then:

- Log in to a model provider with pi. Keys are stored in `auth.json`, which is never committed.
- The `notes` and `drill` skills use the `lesson` and `trilium` tools in `bin/` (they need `curl` and `jq`, and a [Trilium](https://github.com/TriliumNext/Trilium) server). Put them on your PATH and configure Trilium:

  ```bash
  ln -s ~/.pi/agent/bin/lesson ~/.pi/agent/bin/trilium ~/.local/bin/
  mkdir -p ~/.config/trilium
  cp ~/.pi/agent/bin/trilium.env.example ~/.config/trilium/env
  chmod 600 ~/.config/trilium/env   # then add your URL and ETAPI token
  trilium ping
  ```

  Local lesson files go to `~/Notes/Learn` unless you set `LESSON_DIR`.
- The `browser` MCP expects Chromium at `/usr/bin/chromium`. Change the path in `mcp.json` if yours is elsewhere.

## Not tracked

`.gitignore` is an allowlist: only the files above are shared. `auth.json`, `mcp-auth.json`, `sessions/`, `trust.json`, `models-store.json`, installed packages (`git/`, `npm/`), and the system-provided Omarchy skills stay local.

## Credits

The learning system started from [amosblomqvist/learn](https://github.com/amosblomqvist/learn) by Amos Blomqvist. `code-coach`, `drill` and `coach-guard` were added here.
