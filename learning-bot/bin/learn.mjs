#!/usr/bin/env node
import { LearningStore } from "../src/store.mjs";

const db = process.env.LEARNING_DB || "./data/learning.sqlite";
const store = new LearningStore(db);
const [cmd,...args] = process.argv.slice(2);
function usage() {
  console.log("Usage: learn status | topics | due [topic] | add <topic> <concept> | history <topic> <concept> | assess <topic> <concept> <pass|fail> [feedback]");
}
try {
  switch(cmd) {
    case "status": console.log(JSON.stringify(store.status(),null,2)); break;
    case "topics": console.log([...new Set(store.all().map(c=>c.topic))].join("\n") || "No topics yet"); break;
    case "due": console.log(JSON.stringify(store.due(Date.now(),args.length?args.join(" "):null),null,2)); break;
    case "add": {
      if(args.length<2) throw new Error("Expected topic and concept as separate quoted arguments");
      console.log(JSON.stringify(store.addConcept(args[0],args.slice(1).join(" ")),null,2)); break;
    }
    case "history": {
      if(args.length<2) throw new Error("Expected topic and concept");
      const c=store.addConcept(args[0],args.slice(1).join(" "));
      console.log(JSON.stringify(store.history(c.id),null,2)); break;
    }
    case "assess": {
      if(args.length<3 || !["pass","fail"].includes(args[2])) throw new Error("Usage: assess <topic> <concept> <pass|fail> [feedback]");
      const c=store.addConcept(args[0],args[1]);
      const chat="cli:"+process.pid;
      const p=store.setPending(chat,c.id,{format:"recall",question:"Demonstrate understanding of "+c.title, rubric:"Evaluated by the user and Pi",hint:""});
      console.log(JSON.stringify(store.record(chat,{token:p.token,correct:args[2]==="pass",kind:"recall",response:"Desktop assessment",feedback:args.slice(3).join(" ")||"Desktop review"}),null,2));
      break;
    }
    default: usage(); if(cmd) process.exitCode=2;
  }
} catch(err) {console.error(err.message);process.exitCode=1;}
finally {store.close();}
