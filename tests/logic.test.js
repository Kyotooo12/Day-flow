/* Run with:  node tests/logic.test.js
   Loads app.js / features.js in a stubbed DOM and checks the core logic. */
const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.join(__dirname, "..");

function stubEl(){
  const el = new Proxy(function(){}, {
    get(t, k){
      if(k === "classList") return { add(){}, remove(){}, toggle(){}, contains(){ return false; } };
      if(k === "style" || k === "dataset") return {};
      if(k === "querySelector" || k === "closest") return () => stubEl();
      if(k === "querySelectorAll") return () => [];
      if(k === "addEventListener") return () => {};
      if(k === Symbol.toPrimitive) return () => "";
      if(k === "value") return "";
      return t[k];
    },
    set(t, k, v){ t[k] = v; return true; },
    apply(){ return stubEl(); }
  });
  return el;
}
const store = {};
const sandbox = {
  console, setInterval(){}, setTimeout(){}, clearTimeout(){}, requestAnimationFrame(){},
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } },
  sessionStorage: { getItem(){ return null; }, setItem(){} },
  crypto: { randomUUID: () => Math.random().toString(36).slice(2) + Date.now().toString(36) },
  navigator: {}, location: { protocol: "http:" },
  document: { getElementById: () => stubEl(), querySelectorAll: () => [], querySelector: () => null, addEventListener(){}, createElement: () => stubEl(), documentElement: stubEl(), body: stubEl() },
  matchMedia: () => ({ matches: false, addEventListener(){} }),
  addEventListener(){}, scrollTo(){}, confirm: () => true, innerWidth: 1000, innerHeight: 800
};
sandbox.window = sandbox;
vm.createContext(sandbox);
const load = f => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), sandbox, { filename: f });
load("app.js");
vm.runInContext(fs.readFileSync(path.join(root, "features.js"), "utf8").split("(function(){")[0], sandbox); // parser only
const run = code => vm.runInContext(code, sandbox);

let passed = 0;
function test(name, fn){ try{ fn(); passed++; console.log("  ✓", name); }catch(e){ console.error("  ✗", name, "\n   ", e.message); process.exitCode = 1; } }

/* helpers inside the sandbox */
run(`var __setHabits=(h,logs)=>{data.habits=h;data.habitLogs=logs||{}};`);
const D = n => run(`dateOffset(${n})`);

console.log("Habit scheduling");
test("daily habit is always eligible", () => {
  assert.strictEqual(run(`eligibleHabit({id:"a",target:"daily"},today())`), true);
});
test("weekday habit is skipped on a Sunday", () => {
  assert.strictEqual(run(`eligibleHabit({id:"a",target:"weekdays"},"2026-11-22")`), false); // Sunday
  assert.strictEqual(run(`eligibleHabit({id:"a",target:"weekdays"},"2026-11-23")`), true);  // Monday
});
test("3x/week habit stops being required once 3 check-ins are done that week", () => {
  run(`__setHabits([{id:"w",target:"weekly3"}],{"2026-11-16":{w:true},"2026-11-17":{w:true},"2026-11-18":{w:true}})`);
  assert.strictEqual(run(`eligibleHabit(data.habits[0],"2026-11-19")`), false);
  assert.strictEqual(run(`eligibleHabit(data.habits[0],"2026-11-18")`), true); // it was done that day
});
test("3x/week habit is required while fewer than 3 are done", () => {
  run(`__setHabits([{id:"w",target:"weekly3"}],{"2026-11-16":{w:true}})`);
  assert.strictEqual(run(`eligibleHabit(data.habits[0],"2026-11-19")`), true);
});
test("weekKey returns the Monday of the week", () => {
  assert.strictEqual(run(`weekKey("2026-11-22")`), "2026-11-16");
  assert.strictEqual(run(`weekKey("2026-11-16")`), "2026-11-16");
});

console.log("Streaks");
test("today not yet done does not zero an existing streak", () => {
  const logs = {}; logs[D(-1)] = { h: true }; logs[D(-2)] = { h: true };
  run(`__setHabits([{id:"h",target:"daily"}],${JSON.stringify(logs)})`);
  assert.strictEqual(run(`currentStreak()`), 2);
  assert.strictEqual(run(`habitStreak("h")`), 2);
});
test("completing today extends the streak", () => {
  const logs = {}; logs[D(0)] = { h: true }; logs[D(-1)] = { h: true };
  run(`__setHabits([{id:"h",target:"daily"}],${JSON.stringify(logs)})`);
  assert.strictEqual(run(`currentStreak()`), 2);
});
test("a missed day breaks the streak", () => {
  const logs = {}; logs[D(-1)] = { h: true }; logs[D(-3)] = { h: true };
  run(`__setHabits([{id:"h",target:"daily"}],${JSON.stringify(logs)})`);
  assert.strictEqual(run(`habitStreak("h")`), 1);
});
test("3x/week streak counts consecutive weeks that met the target", () => {
  const logs = {};
  [-7, -8, -9, -14, -15, -16].forEach(n => { logs[D(n)] = { w: true }; });
  run(`__setHabits([{id:"w",target:"weekly3"}],${JSON.stringify(logs)})`);
  const s = run(`habitStreak("w")`);
  assert.ok(s >= 0 && s <= 3, "got " + s);
});

console.log("Repeating activities");
test("daily repeat adds 30 more copies on consecutive days", () => {
  run(`data.activities=[];var __a={id:"x",name:"Run",date:"2026-11-19",category:"Exercise",time:"07:00",duration:30,priority:"normal",reminder:"none",notes:"",done:true};data.activities.push(__a);var __n=addRepeats(__a,"daily")`);
  assert.strictEqual(run(`__n`), 30);
  assert.strictEqual(run(`data.activities.length`), 31);
  assert.strictEqual(run(`data.activities[1].date`), "2026-11-20");
  assert.strictEqual(run(`data.activities[1].done`), false);
  assert.strictEqual(run(`new Set(data.activities.map(a=>a.seriesId)).size`), 1);
});
test("weekdays repeat never lands on a weekend", () => {
  run(`data.activities=[];var __b={id:"y",name:"Study",date:"2026-11-19",category:"Study",time:"",duration:30,priority:"normal",reminder:"none",notes:"",done:false};data.activities.push(__b);addRepeats(__b,"weekdays")`);
  assert.strictEqual(run(`data.activities.every(a=>{const d=new Date(a.date+"T12:00:00").getDay();return d>0&&d<6})`), true);
});
test("weekly repeat adds 12 copies 7 days apart", () => {
  run(`data.activities=[];var __c={id:"z",name:"Call",date:"2026-11-19",category:"Personal",time:"",duration:30,priority:"normal",reminder:"none",notes:"",done:false};data.activities.push(__c);var __w=addRepeats(__c,"weekly")`);
  assert.strictEqual(run(`__w`), 12);
  assert.strictEqual(run(`data.activities[1].date`), "2026-11-26");
});
test("no repeat adds nothing", () => assert.strictEqual(run(`addRepeats({date:"2026-11-19"},"none")`), 0));

console.log("Quick-add parser");
const P = t => run(`parseQuickAdd(${JSON.stringify(t)},"2026-11-19","2026-11-20")`);
test("name + 12h time + duration", () => {
  const r = P("Gym 6pm 45min");
  assert.deepStrictEqual([r.name, r.time, r.duration, r.category, r.date], ["Gym", "18:00", 45, "Exercise", "2026-11-19"]);
});
test("tomorrow, minutes in time, importance", () => {
  const r = P("Call mom tomorrow at 5:30 pm !");
  assert.deepStrictEqual([r.name, r.time, r.date, r.priority], ["Call mom", "17:30", "2026-11-20", "high"]);
});
test("24h time and hours", () => {
  const r = P("Study maths 14:00 for 1.5h");
  assert.deepStrictEqual([r.name, r.time, r.duration, r.category], ["Study maths", "14:00", 90, "Study"]);
});
test("plain name uses defaults", () => {
  const r = P("Water the plants");
  assert.deepStrictEqual([r.name, r.time, r.duration, r.priority], ["Water the plants", "", 30, "normal"]);
});
test("12am/12pm edge cases", () => {
  assert.strictEqual(P("Lunch 12pm").time, "12:00");
  assert.strictEqual(P("Sleep 12am").time, "00:00");
});
test("empty input returns null", () => { assert.strictEqual(P("   "), null); assert.strictEqual(P("6pm 30min"), null); });

console.log(`\n${passed} passed`);
