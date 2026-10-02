/**
 * coach-guard — the learner writes the code, the agent never does.
 *
 * Active whenever the working directory or one of its parents contains a
 * `.coach/` folder (the code-coach skill creates it first thing). While active:
 *   - write / edit are allowed only inside `.coach/`
 *   - bash runs only allowlisted read and check commands (cat, git diff,
 *     tsc --noEmit, eslint, npm run lint/build/test, lesson, trilium, ...)
 *   - output redirection is allowed only into `.coach/` or /dev/null
 *
 * This catches the agent "helpfully" fixing code. It is a guard rail, not a
 * sandbox: anything not recognised is blocked, so the safe failure is the
 * agent asking the learner to run the command.
 *
 * Commands (user only — the model cannot run them):
 *   /coach         — show status
 *   /coach on      — create `.coach/` here, turning the guard on
 *   /coach off     — disable the guard for this session
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const COACH_DIR = ".coach";

const BLOCK_HINT =
	"Coach mode: the learner writes all code and runs every command that changes the project. " +
	"Do not try another way. Tell them what to do or give a hint instead.";

type Check = { ok: true } | { ok: false; reason: string };

// Read-only and check commands, matched against each command segment.
const ALLOWED: RegExp[] = [
	/^(cat|head|tail|grep|rg|ls|tree|wc|sort|uniq|diff|file|stat|pwd|echo|printf|which|cd|jq|nl|cut|true)\b/,
	/^sed\s+-n\b/,
	/^find\b/,
	/^git\s+(status|log|diff|show|blame|ls-files|rev-parse|shortlog)\b/,
	/^git\s+branch\s*$/,
	/^git\s+branch\s+(-a|-r|-v|-vv|--list|--show-current)\b/,
	/^(lesson|trilium)\b/,
	/^(npx\s+)?tsc\b.*--noEmit\b/,
	/^(npx\s+)?(eslint|vitest\s+run|jest)\b/,
	/^(npx\s+)?prettier\s+(--check|-c)\b/,
	/^npm\s+(run\s+(lint|build|test|typecheck|type-check|check)|test|ls|outdated|view)\b/,
	/^(pnpm|yarn)\s+(lint|build|test|typecheck)\b/,
	/^node\s+(--version|-v)\b/,
	/^node\s+[^-\s]/,
	/^npx\s+tsx\s+[^-\s]/,
	/^curl\b/,
	/^mkdir\s+(-p\s+)?(\.coach(\/\S*)?\s*)+$/,
];

// Flags that turn an allowed command into one that writes or executes code.
const DENIED: RegExp[] = [
	/^find\b.*\s-(delete|exec|execdir|ok|okdir|fprint\w*|fls)\b/,
	/^(npx\s+)?(eslint)\b.*\s--fix\b/,
	/^(npx\s+)?prettier\b.*\s(--write|-w)\b/,
	/^curl\b.*\s(-[a-zA-Z]*[oOT](\s|$)|--output\b|--remote-name|--upload-file\b)/,
	/^git\b.*\s--output\b/,
	/^mkdir\b.*\.\./,
	/^(npm\s+(run\s+)?test|(npx\s+)?(vitest|jest))\b.*\s(-u|--update\w*)\b/,
	// Scripts in .coach/ are the agent's own code: running them could write files.
	/^(node|npx\s+tsx)\s+(\.\/)?\.coach\b/,
];

/** Remove heredoc bodies: their text is data, not commands. */
function stripHeredocs(command: string): string {
	const lines = command.split("\n");
	const out: string[] = [];
	let terminator: string | null = null;
	for (const line of lines) {
		if (terminator !== null) {
			if (line.trim() === terminator) terminator = null;
			continue;
		}
		out.push(line);
		const match = line.match(/<<-?\s*(['"]?)(\w+)\1/);
		if (match) terminator = match[2];
	}
	return out.join("\n");
}

/** Blank out quoted strings so `;`, `|`, `>` inside them aren't parsed. */
function stripQuotes(command: string): string {
	return command.replace(/'[^']*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

/** The nearest `.coach/` in `cwd` or one of its parents, or null. */
export function findCoachDir(cwd: string): string | null {
	let dir = path.resolve(cwd);
	while (true) {
		const candidate = path.join(dir, COACH_DIR);
		if (fs.existsSync(candidate)) return candidate;
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function isInsideCoach(target: string, cwd: string, coach: string): boolean {
	const resolved = path.resolve(cwd, target);
	return resolved === coach || resolved.startsWith(coach + path.sep);
}

export function checkBash(command: string, cwd: string, coach = path.join(cwd, COACH_DIR)): Check {
	const raw = stripHeredocs(command);
	const text = stripQuotes(raw);

	if (/\$\(|`/.test(text)) {
		return { ok: false, reason: "command substitution is not allowed" };
	}

	// Redirections: `>`, `>>`, `&>`, `2>` (but not `>&1` style fd duplication).
	const redirect = /(?:\d|&)?>>?(?!&)\s*([^\s;&|<>]*)/g;
	for (const match of text.matchAll(redirect)) {
		const target = match[1];
		if (target === "/dev/null") continue;
		if (target && isInsideCoach(target, cwd, coach)) continue;
		return { ok: false, reason: `redirecting output to "${target || "?"}" is not allowed` };
	}

	// Drop the (already checked) redirections and fd duplications like `2>&1`
	// so their `&` doesn't split a command in two.
	const segments = text
		.replace(/\d*>&\d*-?/g, " ")
		.replace(redirect, " ")
		.split(/&&|\|\||[;|&\n]/)
		.map((s) => s.trim().replace(/^(\w+=\S*\s+)+/, ""))
		.filter((s) => s.length > 0);

	for (const segment of segments) {
		if (!ALLOWED.some((re) => re.test(segment))) {
			return { ok: false, reason: `"${segment.split(/\s+/).slice(0, 3).join(" ")}" is not a read or check command` };
		}
		if (DENIED.some((re) => re.test(segment))) {
			return { ok: false, reason: `"${segment}" would change files` };
		}
	}
	return { ok: true };
}

export default function coachGuard(pi: ExtensionAPI) {
	let disabled = false;

	const activeCoachDir = (cwd: string) => (disabled ? null : findCoachDir(cwd));

	function updateStatus(ctx: any) {
		if (!ctx.hasUI) return;
		const theme = ctx.ui.theme;
		ctx.ui.setStatus("coach-guard", activeCoachDir(ctx.cwd) ? theme.fg("accent", "✎ coach") : undefined);
	}

	pi.on("session_start", async (_event, ctx) => {
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type === "custom" && entry.customType === "coach-guard") {
				disabled = (entry.data as { disabled?: boolean } | undefined)?.disabled === true;
			}
		}
		updateStatus(ctx);
	});

	pi.on("tool_call", async (event, ctx) => {
		const coach = activeCoachDir(ctx.cwd);
		if (!coach) {
			// The skill may have just created .coach/: refresh the status line.
			updateStatus(ctx);
			return undefined;
		}

		let check: Check = { ok: true };
		if (event.toolName === "write" || event.toolName === "edit") {
			const target = String(event.input.path ?? "");
			if (!isInsideCoach(target, ctx.cwd, coach)) {
				check = { ok: false, reason: `${event.toolName} to "${target}" (only .coach/ is writable)` };
			}
		} else if (event.toolName === "bash") {
			check = checkBash(String(event.input.command ?? ""), ctx.cwd, coach);
		} else if (event.toolName === "powershell") {
			check = { ok: false, reason: "powershell is not available in coach mode" };
		}

		updateStatus(ctx);
		if (check.ok) return undefined;
		if (ctx.hasUI) ctx.ui.notify(`coach-guard blocked: ${check.reason}`, "warning");
		return { block: true, reason: `Blocked: ${check.reason}. ${BLOCK_HINT}` };
	});

	pi.registerCommand("coach", {
		description: "Coach mode guard: /coach [on|off]",
		handler: async (args, ctx) => {
			const arg = (args ?? "").trim();
			if (arg === "on") {
				fs.mkdirSync(path.join(ctx.cwd, COACH_DIR), { recursive: true });
				disabled = false;
				pi.appendEntry("coach-guard", { disabled });
			} else if (arg === "off") {
				disabled = true;
				pi.appendEntry("coach-guard", { disabled });
			} else if (arg !== "") {
				ctx.ui.notify("Usage: /coach [on|off]", "warning");
				return;
			}
			updateStatus(ctx);
			const state = activeCoachDir(ctx.cwd)
				? "on: the agent can only write inside .coach/"
				: disabled
					? "off for this session (/coach on to re-enable)"
					: "off: no .coach/ folder here (/coach on to create it)";
			ctx.ui.notify(`Coach guard ${state}`, "info");
		},
	});
}
