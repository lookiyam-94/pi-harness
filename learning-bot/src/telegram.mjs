import { LearningStore } from "./store.mjs";
import { questionFor, lessonFor, gradeRecall } from "./pi.mjs";

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowed = process.env.TELEGRAM_CHAT_ID;
const dataFile = process.env.LEARNING_DB || "./data/learning.sqlite";
if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) throw new Error("Set TELEGRAM_BOT_TOKEN");
if (!allowed || !/^-?\d+$/.test(allowed)) throw new Error("Set TELEGRAM_CHAT_ID (private owner allowlist)");

const store = new LearningStore(dataFile);
const base = "https://api.telegram.org/bot" + token + "/";
const chat = String(allowed);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(method, params = {}) {
  const res = await fetch(base + method, {
    method:"POST", headers:{"content-type":"application/json"},
    body:JSON.stringify(params), signal:AbortSignal.timeout(45000)
  });
  const body = await res.json();
  if (!res.ok || !body.ok) throw new Error("Telegram " + method + ": " + (body.description || res.status));
  return body.result;
}
function owner(id) { return String(id) === chat; }
async function send(text, extra = {}) {
  return api("sendMessage", {chat_id:chat, text:String(text).slice(0,4000), ...extra});
}
function plain(p) {
  return String(p.question) + (p.format === "recall" ? "\n\nReply in your own words. /hint if you need a clue." : "\n\nChoose one answer.");
}
async function show(p) {
  const extra = p.format === "choice" ? {
    reply_markup:{inline_keyboard:p.options.map((label,i)=>[{text:label.slice(0,60),callback_data:"a:" + p.token + ":" + i}])}
  } : {};
  if (p.intro) await send(p.intro);
  await send(plain(p), extra);
}
async function nextQuestion({format = "recall"} = {}) {
  const prior = store.pending(chat);
  if (prior) return show(prior);
  const topic = store.profile(chat).topic;
  const concepts = store.due(Date.now(), topic);
  if (!concepts.length) {
    const all = store.all(topic);
    return send(all.length
      ? "Nothing is due for " + topic + ". Try /topic OtherSubject or return tomorrow."
      : "No concepts in " + topic + " yet. Add one using /add promises");
  }
  const concept = concepts[0];
  await send("Reviewing: " + concept.topic + " / " + concept.title);
  const question = await questionFor(store,concept,{format});
  const pending = store.setPending(chat,concept.id,question);
  return show(pending);
}
async function teachConcept(name) {
  const topic = store.profile(chat).topic;
  const title = name || store.due(Date.now(),topic)[0]?.title;
  if (!title) return send("No concept is due. Choose one with /teach Promises.");
  const c = store.addConcept(topic,title);
  const q = await lessonFor(store,c);
  const pending = store.setPending(chat,c.id,q);
  return show(pending);
}
async function choiceAnswer(payload) {
  const [, token, index] = payload.split(":");
  const p = store.pending(chat);
  if (!p || p.format !== "choice" || p.token !== token) return send("This question is no longer active. Use /review.");
  const n = Number(index);
  if (!Number.isSafeInteger(n) || n < 0 || n >= p.options.length) return;
  const correct = n === p.correct_index;
  const result = store.record(chat, { token:p.token,correct,kind:"choice",response:p.options[n],feedback:p.explanation });
  await send((correct ? "Correct. " : "Not quite. ") + (p.explanation || "") +
    "\nNext review: " + new Date(result.next).toLocaleDateString("en-GB",{timeZone:"Europe/Malta"}) +
    "\nUse /review to continue.");
}
async function recallAnswer(answer) {
  const p = store.pending(chat);
  if (!p || p.format !== "recall") return send("No active question. Use /review, or /add <concept> first.");
  const grade = await gradeRecall(p,answer);
  const result = store.record(chat,{token:p.token,correct:grade.correct,kind:"recall",response:answer,feedback:grade.feedback});
  await send((grade.correct ? "Good explanation. " : "Needs another pass. ") + grade.feedback +
    "\nNext review: " + new Date(result.next).toLocaleDateString("en-GB",{timeZone:"Europe/Malta"}) +
    "\nUse /review to continue.");
}
async function handleMessage(msg) {
  if (!owner(msg.chat?.id) || msg.chat?.type !== "private") return;
  if (!msg.text) return send("For now, I support text only.");
  const input = msg.text.trim(), space = input.indexOf(" ");
  const cmd = (space < 0 ? input : input.slice(0, space)).split("@")[0].toLowerCase();
  const value = space < 0 ? "" : input.slice(space + 1).trim();
  switch (cmd) {
    case "/start": case "/help":
      return send("Learning bot\n/topic <subject> — choose an active subject\n/add <concept> — track something to learn\n/review — recall something due\n/teach <concept> — short guided lesson\n/quiz — multiple choice\n/hint — clue for current question\n/skip — skip current question without scoring\n/status — progress overview\n/pause — clear active question\n\nAnswers are saved after grading. Desktop Pi remains available separately.");
    case "/topic":
      if (!value) return send("Active topic: " + store.profile(chat).topic + "\nUsage: /topic JavaScript");
      store.clearPending(chat); store.setTopic(chat,value);
      return send("Active topic: " + store.profile(chat).topic);
    case "/add":
      if (!value) return send("Usage: /add Promises");
      const concept = store.addConcept(store.profile(chat).topic,value);
      return send("Tracked: " + concept.topic + " / " + concept.title + "\nUse /review to test it.");
    case "/review": return nextQuestion({format:"recall"});
    case "/learn": case "/teach": return teachConcept(value);
    case "/quiz": return nextQuestion({format:"choice"});
    case "/hint": {
      const p = store.pending(chat);
      if (!p) return send("No active question.");
      store.hint(chat);
      return send(p.hint || "Try explaining the simplest concrete example you can think of.");
    }
    case "/pause": case "/skip":
      store.clearPending(chat);
      return send("Question cleared. No attempt recorded.");
    case "/status": {
      const s = store.status();
      const topic = store.profile(chat).topic;
      return send("Current topic: " + topic + "\nConcepts: " + s.concepts +
        "\nDue across all topics: " + s.due + "\nAttempts: " + s.attempts +
        "\nConcepts practiced this week: " + s.recentlyPracticed);
    }
    default: return recallAnswer(input);
  }
}
async function processUpdate(u) {
  if (u.callback_query) {
    const q = u.callback_query;
    await api("answerCallbackQuery",{callback_query_id:q.id});
    if (owner(q.message?.chat?.id) && q.message?.chat?.type === "private" && /^a:[a-f0-9]{12}:[0-3]$/.test(q.data || ""))
      await choiceAnswer(q.data);
  } else if (u.message) await handleMessage(u.message);
}
function notifyOnceDaily() {
  const today = new Date().toLocaleDateString("en-CA",{timeZone:"Europe/Malta"});
  if (store.meta("notification-date") === today) return;
  const count = store.due().length;
  if (!count) return;
  return send("You have " + count + " learning concept(s) due. Send /review for a short session.")
    .then(()=>store.setMeta("notification-date",today));
}
let stopped = false;
process.on("SIGINT",()=>{stopped=true;});
process.on("SIGTERM",()=>{stopped=true;});
let offset = Number(store.meta("telegram-offset","0")) || 0;
console.log("Learning bot running for one allowed private chat.");
while (!stopped) {
  try {
    const updates = await api("getUpdates",{offset,timeout:25,allowed_updates:["message","callback_query"]});
    for (const update of updates) {
      try { await processUpdate(update); }
      catch (err) {
        console.error("Update error:",err.message);
        try { if (owner(update.message?.chat?.id || update.callback_query?.message?.chat?.id)) await send("Something failed; the last question remains available. Try again."); }
        catch {}
      }
      offset=update.update_id+1; store.setMeta("telegram-offset",String(offset));
    }
    await notifyOnceDaily();
  } catch(err) {
    if (!stopped) { console.error("Polling error:",err.message); await sleep(5000); }
  }
}
store.close();
