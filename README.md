# pi harness

My personal configuration for the [pi](https://github.com/earendil-works/pi) coding agent: skills, extensions, and subagents.

## Layout

| Path | What |
|---|---|
| `settings.json` | Global pi settings (default model, installed packages) |
| `extensions/` | Global extensions |
| `skills/` | Global skills |
| `agents/` | Subagent definitions (for [pi-interactive-subagents](https://github.com/amosblomqvist/pi-interactive-subagents)) |
| `learn/` | Learning system, loaded as a local pi package. Based on [amosblomqvist/learn](https://github.com/amosblomqvist/learn) |

## Install

```bash
git clone <this-repo> ~/.pi/agent
```

Then add your provider key with pi (it is stored in `auth.json`, which is never committed).

## Not tracked

`auth.json`, `sessions/`, `trust.json`, `models-store.json`, and installed packages (`git/`, `npm/`) are excluded by `.gitignore`.
