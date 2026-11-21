import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, createHash } from "node:crypto";

const DAY = 86_400_000;
const REVIEW_DAYS = [1, 3, 7, 14, 30, 60, 120];

function normalized(value, limit = 120) {
  const s = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!s || s.length > limit) throw new Error("Missing or too-long topic/concept");
  return s;
}
function slug(text) {
  return text.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 70)
    || createHash("sha256").update(text).digest("hex").slice(0, 16);
}
export function conceptId(topic, title) {
  return slug(normalized(topic)) + "/" + slug(normalized(title));
}

export class LearningStore {
  constructor(path) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    this.db.exec([
      "CREATE TABLE IF NOT EXISTS concepts (id TEXT PRIMARY KEY, topic TEXT NOT NULL, title TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'user', mastery INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, interval_days REAL NOT NULL DEFAULT 0, next_due INTEGER NOT NULL DEFAULT 0, last_review INTEGER, last_error TEXT)",
      "CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, concept_id TEXT NOT NULL REFERENCES concepts(id), at INTEGER NOT NULL, kind TEXT NOT NULL, correct INTEGER NOT NULL, hinted INTEGER NOT NULL DEFAULT 0, response TEXT, feedback TEXT)",
      "CREATE TABLE IF NOT EXISTS pending (chat_id TEXT PRIMARY KEY, token TEXT NOT NULL, concept_id TEXT NOT NULL REFERENCES concepts(id), format TEXT NOT NULL, payload TEXT NOT NULL, hints INTEGER NOT NULL DEFAULT 0)",
      "CREATE TABLE IF NOT EXISTS profiles (chat_id TEXT PRIMARY KEY, topic TEXT NOT NULL DEFAULT 'JavaScript')",
      "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
      "CREATE INDEX IF NOT EXISTS concepts_due ON concepts(next_due)",
      "CREATE INDEX IF NOT EXISTS attempts_concept ON attempts(concept_id, at)"
    ].join(";\n") + ";");
  }

  close() { this.db.close(); }
  meta(key, fallback = null) {
    return this.db.prepare("SELECT value FROM meta WHERE key=?").get(key)?.value ?? fallback;
  }
  setMeta(key, value) {
    this.db.prepare("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(key, String(value));
  }
  profile(chatId) {
    const id = String(chatId);
    this.db.prepare("INSERT OR IGNORE INTO profiles(chat_id) VALUES(?)").run(id);
    return this.db.prepare("SELECT * FROM profiles WHERE chat_id=?").get(id);
  }
  setTopic(chatId, topic) {
    this.profile(chatId);
    this.db.prepare("UPDATE profiles SET topic=? WHERE chat_id=?").run(normalized(topic), String(chatId));
  }
  addConcept(topic, title, source = "user") {
    topic = normalized(topic); title = normalized(title);
    const id = conceptId(topic, title);
    this.db.prepare("INSERT OR IGNORE INTO concepts(id,topic,title,source) VALUES(?,?,?,?)").run(id, topic, title, source);
    return this.getConcept(id);
  }
  getConcept(id) { return this.db.prepare("SELECT * FROM concepts WHERE id=?").get(id) ?? null; }
  all(topic = null) {
    return topic
      ? this.db.prepare("SELECT * FROM concepts WHERE topic=? ORDER BY next_due, title").all(topic)
      : this.db.prepare("SELECT * FROM concepts ORDER BY next_due, title").all();
  }
  due(now = Date.now(), topic = null) {
    return topic
      ? this.db.prepare("SELECT * FROM concepts WHERE next_due<=? AND topic=? ORDER BY next_due LIMIT 50").all(now,topic)
      : this.db.prepare("SELECT * FROM concepts WHERE next_due<=? ORDER BY next_due LIMIT 50").all(now);
  }
  status(now = Date.now()) {
    return {
      concepts: this.db.prepare("SELECT COUNT(*) n FROM concepts").get().n,
      due: this.db.prepare("SELECT COUNT(*) n FROM concepts WHERE next_due<=?").get(now).n,
      attempts: this.db.prepare("SELECT COUNT(*) n FROM attempts").get().n,
      recentlyPracticed: this.db.prepare("SELECT COUNT(DISTINCT concept_id) n FROM attempts WHERE at>=?").get(now - 7*DAY).n,
    };
  }
  history(id, limit = 6) {
    return this.db.prepare("SELECT at,kind,correct,hinted,response,feedback FROM attempts WHERE concept_id=? ORDER BY id DESC LIMIT ?")
      .all(id, Math.min(20, Math.max(1, limit)));
  }
  pending(chatId) {
    const r = this.db.prepare("SELECT * FROM pending WHERE chat_id=?").get(String(chatId));
    return r ? { ...r, ...JSON.parse(r.payload) } : null;
  }
  setPending(chatId, conceptId, question) {
    if (!this.getConcept(conceptId)) throw new Error("Unknown concept");
    const format = question.format;
    if (!["choice","recall"].includes(format)) throw new Error("Invalid question format");
    if (typeof question.question !== "string" || question.question.trim().length < 10) throw new Error("Invalid question");
    if (format === "choice" && (
      !Array.isArray(question.options) || question.options.length < 2 || question.options.length > 4 ||
      question.options.some(v => typeof v !== "string" || !v.trim() || v.length > 250) ||
      !Number.isInteger(question.correct_index) || question.correct_index < 0 ||
      question.correct_index >= question.options.length
    )) throw new Error("Invalid options");
    if (format === "recall" && (!question.rubric || typeof question.rubric !== "string")) throw new Error("Missing rubric");
    const token = randomBytes(6).toString("hex");
    const safe = {
      question: question.question.slice(0, 1800),
      intro: String(question.intro || "").slice(0, 700),
      format, options: format === "choice" ? question.options : [],
      correct_index: format === "choice" ? question.correct_index : null,
      rubric: format === "recall" ? question.rubric.slice(0, 1200) : "",
      explanation: String(question.explanation || "").slice(0, 1600),
      hint: String(question.hint || "").slice(0, 600),
    };
    this.db.prepare("INSERT INTO pending(chat_id,token,concept_id,format,payload,hints) VALUES(?,?,?,?,?,0) ON CONFLICT(chat_id) DO UPDATE SET token=excluded.token,concept_id=excluded.concept_id,format=excluded.format,payload=excluded.payload,hints=0")
      .run(String(chatId),token,conceptId,format,JSON.stringify(safe));
    return this.pending(chatId);
  }
  hint(chatId) {
    this.db.prepare("UPDATE pending SET hints=hints+1 WHERE chat_id=?").run(String(chatId));
    return this.pending(chatId);
  }
  clearPending(chatId) { this.db.prepare("DELETE FROM pending WHERE chat_id=?").run(String(chatId)); }
  record(chatId, { token, correct, kind, response, feedback }, now = Date.now()) {
    const p = this.pending(chatId);
    if (!p || p.token !== token) throw new Error("Question expired. Use /review or /learn.");
    if (typeof correct !== "boolean") throw new Error("Missing grade");
    if (!["choice","recall"].includes(kind) || kind !== p.format) throw new Error("Invalid answer kind");
    const c = this.getConcept(p.concept_id);
    const streak = correct ? c.streak + 1 : 0;
    const days = correct ? REVIEW_DAYS[Math.min(streak - 1, REVIEW_DAYS.length - 1)] : 0.25;
    const mastery = correct && p.hints === 0 ? Math.max(c.mastery, kind === "recall" ? 2 : 1) : c.mastery;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("INSERT INTO attempts(concept_id,at,kind,correct,hinted,response,feedback) VALUES(?,?,?,?,?,?,?)")
        .run(c.id, now, kind, correct ? 1 : 0, p.hints, String(response).slice(0,1500), String(feedback).slice(0,1500));
      this.db.prepare("UPDATE concepts SET mastery=?,streak=?,interval_days=?,next_due=?,last_review=?,last_error=? WHERE id=?")
        .run(mastery, streak, days, now + days*DAY, now, correct ? null : String(feedback).slice(0,500), c.id);
      this.clearPending(chatId);
      this.db.exec("COMMIT");
    } catch (err) { this.db.exec("ROLLBACK"); throw err; }
    return { concept:this.getConcept(c.id), correct, next: now + days*DAY, hints:p.hints };
  }
}
