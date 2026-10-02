# pi harness

My personal configuration for the [pi](https://github.com/earendil-works/pi) coding agent: skills, extensions, and subagents.

## Layout

| Path | What |
|---|---|
| `settings.json` | Global pi settings (default model, installed packages) |
| `mcp.json` | MCP servers (Context7 for current library docs) |
| `extensions/` | Global extensions |
| `skills/` | Global skills |
| `agents/` | Subagent definitions (for [pi-interactive-subagents](https://github.com/amosblomqvist/pi-interactive-subagents)) |
| `learn/` | Learning system, loaded as a local pi package. Based on [amosblomqvist/learn](https://github.com/amosblomqvist/learn) |

## Skills

| Skill | What |
|---|---|
| `teach` | Teach any topic: probe, plan, then build understanding node by node |
| `code-coach` | Learn to code by building a project you write yourself; the agent probes, plans milestones, hints, reviews, and quizzes |
| `drill` | Re-test what was already taught |
| `notes` | Write lesson notes to Trilium and a local markdown file |
| `visualize` | Add diagrams to lessons |

`code-coach` is backed by the `coach-guard` extension: in any project with a `.coach/` folder, the agent can only write inside `.coach/` and run read or check commands. `/coach on|off` toggles it.

## Install

```bash
git clone <this-repo> ~/.pi/agent
```

Then add your provider key with pi (it is stored in `auth.json`, which is never committed).

## Not tracked

`auth.json`, `sessions/`, `trust.json`, `models-store.json`, and installed packages (`git/`, `npm/`) are excluded by `.gitignore`.
