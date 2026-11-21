import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LearningStore } from "../src/store.mjs";
import { parseJson } from "../src/pi.mjs";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(),"learn-bot-"));
  const store = new LearningStore(join(dir,"learning.sqlite"));
  t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  return store;
}
const question = {
  format:"recall",question:"Explain what a JavaScript promise represents.",
  rubric:"It represents the future result of an asynchronous operation.",
  hint:"Think about asynchronous code."
};
test("concepts deduplicate and due selection respects topics",t=>{
  const s=fixture(t);
  const a=s.addConcept("JavaScript","Promises");
  assert.equal(a.id,s.addConcept("JavaScript","Promises").id);
  s.addConcept("React","useEffect");
  assert.equal(s.status().concepts,2);
  assert.deepEqual(s.due(1,"JavaScript").map(x=>x.title),["Promises"]);
});
test("reviews persist with explicit timestamps and spaced intervals",t=>{
  const s=fixture(t);
  const c=s.addConcept("JavaScript","Promises");
  const p=s.setPending("chat",c.id,question);
  const now=1_800_000_000_000;
  const result=s.record("chat",{token:p.token,correct:true,kind:"recall",response:"future async result",feedback:"Pass"},now);
  assert.equal(result.concept.streak,1);
  assert.equal(result.concept.mastery,2);
  assert.equal(result.concept.interval_days,1);
  assert.equal(s.due(now).length,0);
  assert.equal(s.due(now+86_400_000).length,1);
  assert.equal(s.history(c.id).length,1);
  assert.throws(()=>s.record("chat",{token:p.token,correct:true,kind:"recall",response:"again",feedback:"duplicate"}),/expired/);
  const next=s.setPending("chat",c.id,question);
  const second=s.record("chat",{token:next.token,correct:true,kind:"recall",response:"",feedback:""},now+86_400_000);
  assert.equal(second.concept.interval_days,3);
});
test("misses and hints reset streak without increasing mastery",t=>{
  const s=fixture(t);
  const c=s.addConcept("JS","Closure");
  let p=s.setPending("one",c.id,question);
  s.hint("one");
  const passed=s.record("one",{token:p.token,correct:true,kind:"recall",response:"answer",feedback:""},100);
  assert.equal(passed.concept.mastery,0);
  p=s.setPending("one",c.id,question);
  const missed=s.record("one",{token:p.token,correct:false,kind:"recall",response:"wrong",feedback:"incorrect model"},200);
  assert.equal(missed.concept.streak,0);
  assert.equal(missed.concept.interval_days,0.25);
  assert.equal(missed.concept.last_error,"incorrect model");
});
test("pending survives state reopen and rejects old callbacks",t=>{
  const s=fixture(t);
  const c=s.addConcept("JS","Scope");
  const first=s.setPending("one",c.id,{format:"choice",question:"Which scope contains a function local variable?",options:["Function","Global","Module"],correct_index:0});
  const second=s.setPending("one",c.id,{format:"choice",question:"Which scope contains a function local variable?",options:["Function","Global","Module"],correct_index:0});
  assert.notEqual(first.token,second.token);
  assert.throws(()=>s.record("one",{token:first.token,correct:true,kind:"choice",response:"Function",feedback:""}),/expired/);
  assert.equal(s.pending("one").token,second.token);
});
test("reject malformed and ungradeable questions",t=>{
  const s=fixture(t);
  const c=s.addConcept("JS","Promise");
  assert.throws(()=>s.setPending("a",c.id,{format:"choice",question:"Which of these statements is true?",options:["A","B"],correct_index:2}),/Invalid options/);
  assert.throws(()=>s.setPending("a",c.id,{format:"recall",question:"Explain this function in your own words."}),/Missing rubric/);
});
test("parse JSON from text or fenced response",()=>{
  assert.deepEqual(parseJson('{"correct":true}'),{correct:true});
  assert.deepEqual(parseJson("Here is the result:\n" + String.fromCharCode(96).repeat(3) + "json\n{\"correct\":false}\n" + String.fromCharCode(96).repeat(3)),{correct:false});
});
