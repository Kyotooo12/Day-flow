/* DAYFLOW v4.1 — feature layer.
   Quick-add, "up next", focus linking, 30-day insights, weekly summary,
   coach explanations, shortcuts, welcome tour and completion celebration.
   Loaded after app.js / app-extra.js / ui.js and builds on their globals. */

/* ---------- Quick-add parser (pure, unit-tested) ---------- */
function parseQuickAdd(text, todayStr, tomorrowStr){
  let s = " " + String(text || "").trim() + " ";
  let time = "", duration = 30, date = todayStr, priority = "normal", category = "Personal", m;

  if(/(^|\s)(!|important)(?=\s)/i.test(s)){ priority = "high"; s = s.replace(/(^|\s)(!|important)(?=\s)/ig, " "); }
  if(/\b(tomorrow|tmrw|tmr)\b/i.test(s)){ date = tomorrowStr; s = s.replace(/\b(tomorrow|tmrw|tmr)\b/ig, " "); }
  else if(/\btoday\b/i.test(s)){ s = s.replace(/\btoday\b/ig, " "); }

  if((m = s.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i))){
    let h = parseInt(m[1], 10), min = m[2] ? parseInt(m[2], 10) : 0;
    if(h >= 1 && h <= 12 && min < 60){
      h = (h % 12) + (m[3].toLowerCase() === "pm" ? 12 : 0);
      time = String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0");
      s = s.replace(m[0], " ");
    }
  } else if((m = s.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/))){
    time = m[1].padStart(2, "0") + ":" + m[2];
    s = s.replace(m[0], " ");
  }

  if((m = s.match(/\b(?:for\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i))){
    const n = parseFloat(m[1]), hours = /^h/i.test(m[2]);
    duration = Math.max(0, Math.min(1440, Math.round(hours ? n * 60 : n)));
    s = s.replace(m[0], " ");
  }

  const name = s.replace(/\s+/g, " ").replace(/\b(at|on|for)\s*$/i, "").trim();
  if(!name) return null;

  const words = name.toLowerCase().split(/[^a-z]+/);
  const map = {
    Study: ["study", "homework", "class", "learn", "revise", "read", "assignment"],
    Work: ["work", "meeting", "email", "report", "project"],
    Exercise: ["gym", "run", "workout", "exercise", "walk", "yoga", "swim", "jog"],
    Health: ["water", "meds", "medicine", "doctor", "vitamin", "dentist"],
    Rest: ["nap", "rest", "sleep", "relax", "break"]
  };
  for(const [cat, keys] of Object.entries(map)){ if(keys.some(k => words.includes(k))){ category = cat; break; } }

  return { name: name.charAt(0).toUpperCase() + name.slice(1), time, duration, date, priority, category };
}

(function(){
  var $ = function(id){ return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CATS = ["Personal", "Study", "Work", "Exercise", "Health", "Rest", "Other"];

  function tomorrow(){ return dateOffset(1); }
  function slotOf(a){
    if(!a.time) return "Anytime";
    var h = parseInt(a.time.slice(0, 2), 10);
    return h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  }
  function fmtTime(t){
    if(!t) return "Anytime";
    var h = parseInt(t.slice(0, 2), 10), m = t.slice(3, 5);
    return ((h % 12) || 12) + ":" + m + " " + (h >= 12 ? "PM" : "AM");
  }

  /* ---------- Quick add ---------- */
  var qa = $("quickAdd");
  if(qa) qa.addEventListener("submit", function(e){
    e.preventDefault();
    var input = $("quickAddInput");
    var p = parseQuickAdd(input.value, today(), tomorrow());
    if(!p){ showToast("Type an activity first, e.g. Gym 6pm 45min"); return; }
    if(CATS.indexOf(p.category) < 0) p.category = "Other";
    data.activities.push({ id: uid(), name: p.name, date: p.date, category: p.category, time: p.time, duration: p.duration,
      priority: p.priority, reminder: "none", notes: "", done: false });
    input.value = "";
    if(p.date === today()) activeRoutineDate = p.date;
    save();
    showToast("Added “" + p.name + "”" + (p.time ? " at " + fmtTime(p.time) : "") + (p.date !== today() ? " for tomorrow" : ""));
  });

  /* ---------- Up next ---------- */
  function pickNext(){
    var pending = activitiesFor(today()).filter(function(a){ return !a.done; });
    var now = new Date().toTimeString().slice(0, 5);
    return { pending: pending, next: pending.find(function(a){ return a.time && a.time >= now; }) || pending.find(function(a){ return !a.time; }) || pending[0] };
  }
  function renderNextUp(){
    var el = $("nextUp"); if(!el) return;
    var r = pickNext(), all = activitiesFor(today());
    if(r.next){
      var a = r.next;
      el.innerHTML = '<div class="next-body"><p class="eyebrow">UP NEXT</p><h2>' + escapeHTML(a.name) + '</h2><p class="muted">' +
        escapeHTML(fmtTime(a.time)) + ' · ' + (a.duration || 0) + ' min · ' + escapeHTML(a.category) +
        (r.pending.length > 1 ? ' · ' + (r.pending.length - 1) + ' more today' : '') + '</p></div>' +
        '<div class="next-actions"><button class="primary-btn" data-nextup-focus="' + a.id + '">▶ Start focus</button>' +
        '<button class="outline-btn" data-nextup-done="' + a.id + '">✓ Mark done</button></div>';
    } else if(all.length){
      el.innerHTML = '<div class="next-body"><p class="eyebrow">ALL CLEAR</p><h2>Everything for today is done 🎉</h2><p class="muted">Enjoy the free time, or plan something for tomorrow.</p></div>';
    } else {
      el.innerHTML = '<div class="next-body"><p class="eyebrow">UP NEXT</p><h2>Nothing planned yet</h2><p class="muted">Use quick add above or press N to add your first activity.</p></div>';
    }
  }

  /* ---------- Focus ↔ activity link ---------- */
  function populateFocusSelect(){
    var sel = $("focusActivity"); if(!sel) return;
    var cur = sel.value;
    var items = activitiesFor(today()).filter(function(a){ return !a.done; });
    var html = '<option value="">No specific activity</option>' + items.map(function(a){
      return '<option value="' + a.id + '">' + escapeHTML(a.name) + '</option>'; }).join("");
    if(sel.dataset.sig !== html){
      sel.innerHTML = html; sel.dataset.sig = html;
      sel.value = items.some(function(a){ return a.id === cur; }) ? cur : "";
    }
  }
  function startFocusFor(id){
    populateFocusSelect();
    var sel = $("focusActivity"); if(sel) sel.value = id;
    nav("focus");
    setTimeout(function(){
      if(typeof setFocusMode === "function" && focusMode !== "focus") setFocusMode("focus");
      if(typeof focusRunning !== "undefined" && !focusRunning) startFocus();
    }, 420);
  }

  /* ---------- Weekly summary, 30-day trend, patterns ---------- */
  function rangeStats(fromOffset, toOffset){
    var done = 0, total = 0, focus = 0, habits = 0;
    for(var i = fromOffset; i <= toOffset; i++){
      var d = dateOffset(i), items = activitiesFor(d);
      total += items.length; done += completedCount(items);
      var log = (data.habitLogs || {})[d] || {};
      habits += Object.keys(log).filter(function(k){ return log[k]; }).length;
      (data.focusSessions || []).forEach(function(s){ if(s.date === d && s.mode === "focus") focus += Number(s.minutes) || 0; });
    }
    return { done: done, total: total, rate: total ? Math.round(done / total * 100) : 0, focus: focus, habits: habits };
  }
  function delta(cur, prev, unit){
    var d = cur - prev;
    if(!prev && !cur) return '<small class="delta flat">no data yet</small>';
    if(d === 0) return '<small class="delta flat">same as last week</small>';
    return '<small class="delta ' + (d > 0 ? "up" : "down") + '">' + (d > 0 ? "▲ +" : "▼ ") + d + (unit || "") + ' vs last week</small>';
  }
  function renderSummary(){
    var el = $("weeklySummary"); if(!el) return;
    var t = rangeStats(-6, 0), p = rangeStats(-13, -7);
    el.innerHTML = '<div class="panel-heading"><div><p class="eyebrow">WEEKLY SUMMARY</p><h2>This week vs last week</h2></div></div>' +
      '<div class="summary-grid">' +
      '<div class="summary-tile"><span>Completed</span><strong>' + t.done + '<small> / ' + t.total + '</small></strong>' + delta(t.done, p.done) + '</div>' +
      '<div class="summary-tile"><span>Completion rate</span><strong>' + t.rate + '%</strong>' + delta(t.rate, p.rate, "%") + '</div>' +
      '<div class="summary-tile"><span>Focus minutes</span><strong>' + t.focus + '</strong>' + delta(t.focus, p.focus) + '</div>' +
      '<div class="summary-tile"><span>Habit check-ins</span><strong>' + t.habits + '</strong>' + delta(t.habits, p.habits) + '</div></div>';
  }
  function renderTrend(){
    var el = $("trend30"); if(!el) return;
    var days = [], sum = 0, n = 0;
    for(var i = -29; i <= 0; i++){
      var d = dateOffset(i), items = activitiesFor(d), pct = items.length ? Math.round(completedCount(items) / items.length * 100) : null;
      days.push({ d: d, pct: pct, items: items.length });
      if(pct !== null){ sum += pct; n++; }
    }
    el.innerHTML = days.map(function(x){
      return '<i class="' + (x.pct === null ? "empty" : "") + '" style="height:' + (x.pct === null ? 6 : Math.max(8, x.pct)) + '%" title="' +
        escapeHTML(formatDate(x.d)) + ': ' + (x.pct === null ? "no activities" : x.pct + "% done") + '"></i>'; }).join("");
    var avg = $("trendAvg"); if(avg) avg.textContent = n ? "AVG " + Math.round(sum / n) + "% ON ACTIVE DAYS" : "NO DATA YET";

    var notes = [], slots = {};
    for(var k = -29; k <= 0; k++){
      activitiesFor(dateOffset(k)).forEach(function(a){
        var s = slotOf(a); slots[s] = slots[s] || { t: 0, d: 0 }; slots[s].t++; if(a.done) slots[s].d++;
      });
    }
    var ranked = Object.keys(slots).filter(function(s){ return slots[s].t >= 3 && s !== "Anytime"; })
      .sort(function(a, b){ return slots[b].d / slots[b].t - slots[a].d / slots[a].t; });
    if(ranked.length){
      var best = ranked[0], pctB = Math.round(slots[best].d / slots[best].t * 100);
      notes.push("Your best time of day is " + best.toLowerCase() + ": you finish " + pctB + "% of what you plan then.");
      if(ranked.length > 1){
        var worst = ranked[ranked.length - 1], pw = Math.round(slots[worst].d / slots[worst].t * 100);
        if(worst !== best && pw < pctB) notes.push("Your " + worst.toLowerCase() + " plans are finished " + pw + "% of the time. Try lighter plans then.");
      }
    } else notes.push("Plan at least a few timed activities and your best time of day will show here.");

    var moved = {};
    data.activities.forEach(function(a){ if(a.rescheduleCount) moved[a.category || "Other"] = (moved[a.category || "Other"] || 0) + a.rescheduleCount; });
    var topMoved = Object.keys(moved).sort(function(a, b){ return moved[b] - moved[a]; })[0];
    notes.push(topMoved ? "Most-postponed category: " + topMoved + " (moved " + moved[topMoved] + " time" + (moved[topMoved] > 1 ? "s" : "") + "). Consider a smaller or earlier version of it."
                        : "You haven't postponed anything lately. Nice.");
    $("patternNotes").innerHTML = notes.map(function(x){ return '<div class="insight-note"><span>✦</span><p>' + escapeHTML(x) + '</p></div>'; }).join("");
  }
  function renderWeeklyBanner(){
    var el = $("weeklyBanner"); if(!el) return;
    if(new Date().getDay() !== 0){ el.classList.add("hidden"); return; }
    var t = rangeStats(-6, 0);
    el.classList.remove("hidden");
    el.innerHTML = '<div><b>Your week in review</b><p class="muted">You completed ' + t.done + ' of ' + t.total + ' activities, ' + t.focus + ' focus minutes and ' + t.habits + ' habit check-ins.</p></div><button class="outline-btn" data-goto="insights">See summary</button>';
  }

  /* ---------- Coach: "why am I seeing this?" ---------- */
  var REASONS = {
    "REST DAY": "Today's mode is set to Rest day.",
    "RECOVERY DAY": "Today's mode is set to Recovery day.",
    "GET STARTED": "You have no activities planned for today.",
    "MAKE IT LIGHTER": "Less than half of today's plan is done and 3 or more activities are still pending.",
    "PRIORITY": "An activity marked Important is still pending today.",
    "FLEXIBLE SCHEDULE": "Some activities have start times that have already passed and aren't marked complete.",
    "HABITS": "You have habits, but none are checked off yet today.",
    "WEEKLY PATTERN": "You recorded 5 or more activities this week and completed fewer than half.",
    "MOOD CHECK-IN": "Your mood check-in for today was Low.",
    "CHECK IN": "You haven't saved a mood check-in for today.",
    "WELL DONE": "Every activity planned for today is complete.",
    "KEEP GOING": "No other rule matched today's data, so this is the default encouragement."
  };
  renderCoach = function(){
    var el = $("coachSuggestions"); if(!el) return;
    el.innerHTML = makeSuggestions().map(function(s){
      return '<article class="coach-item"><span class="coach-type">' + escapeHTML(s[0]) + '</span><h3>' + escapeHTML(s[1]) + '</h3><p>' + escapeHTML(s[2]) + '</p>' +
        '<details class="why"><summary>Why am I seeing this?</summary><p>' + escapeHTML(REASONS[s[0]] || "Based on your profile and recent activity saved on this device.") + ' Suggestions come from simple on-device rules, not an AI model.</p></details></article>';
    }).join("");
  };

  /* ---------- Small a11y + celebration hooks, run after each render ---------- */
  var lastAllDone = null;
  function renderExtras(){
    renderNextUp(); populateFocusSelect(); renderSummary(); renderTrend(); renderWeeklyBanner();
    document.querySelectorAll("[data-mood]").forEach(function(b){ b.setAttribute("aria-pressed", String(b.classList.contains("selected"))); });
    var items = activitiesFor(today()), all = items.length > 0 && completedCount(items) === items.length;
    if(lastAllDone === false && all) celebrate();
    lastAllDone = all;
  }
  var baseRenderAll = renderAll;
  renderAll = function(){ baseRenderAll(); renderExtras(); };
  renderExtras();

  function celebrate(){
    showToast("All done for today. Well done! 🎉");
    if(reduce) return;
    var c = document.createElement("canvas");
    c.className = "confetti"; c.setAttribute("aria-hidden", "true");
    c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
    var ctx = c.getContext("2d"), colors = ["#b3a6ff", "#5fd8cc", "#f0a6d6", "#6fd8a0", "#ffd479"];
    var ps = Array.from({ length: 90 }, function(){ return { x: Math.random() * c.width, y: -20 - Math.random() * c.height * .4, r: 4 + Math.random() * 5,
      vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, col: colors[Math.floor(Math.random() * colors.length)] }; });
    var start = performance.now();
    (function tick(now){
      var t = now - start; ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(function(p){ p.x += p.vx; p.y += p.vy; p.rot += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - t / 2600); ctx.fillStyle = p.col; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
      if(t < 2600) requestAnimationFrame(tick); else c.remove();
    })(start);
  }

  /* ---------- Delegated clicks ---------- */
  document.addEventListener("click", function(e){
    var f = e.target.closest("[data-nextup-focus]");
    if(f){ startFocusFor(f.dataset.nextupFocus); return; }
    var d = e.target.closest("[data-nextup-done]");
    if(d){
      var a = data.activities.find(function(x){ return x.id === d.dataset.nextupDone; });
      if(a){ a.done = true; a.completedAt = new Date().toISOString(); save(); showToast("Activity completed"); }
    }
  });

  /* ---------- Keyboard shortcuts ---------- */
  var PAGES = ["home", "routine", "calendar", "habits", "focus", "wellness", "journal", "insights", "coach"];
  document.addEventListener("keydown", function(e){
    if(e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target, tag = t && t.tagName;
    if(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
    if(document.querySelector(".modal-backdrop:not(.hidden)")) return;
    var k = e.key.toLowerCase();
    if(k === "n"){ e.preventDefault(); var b = document.querySelector('[data-open-modal="routineModal"]'); if(b) b.click(); }
    else if(k === "/" || k === "q"){ e.preventDefault(); nav("home"); setTimeout(function(){ var i = $("quickAddInput"); if(i) i.focus(); }, 260); }
    else if(k === "t"){ var tb = $("themeToggle"); if(tb) tb.click(); }
    else if(/^[1-9]$/.test(k)){ nav(PAGES[+k - 1]); }
    else if(k === "0"){ nav("settings"); }
  });

  /* ---------- Welcome tour ---------- */
  var TOUR_KEY = "dayflow_tour_done";
  var STEPS = [
    ["Plan your day", "Add activities with the + button, or type something like “Gym 6pm 45min” into quick add. Use Repeat to schedule it for the next days or weeks."],
    ["Build small habits", "Create habits and goals, then check them off each day. “3 times a week” habits count by week, so rest days don't break your streak."],
    ["Focus and track time", "Start the focus timer from the Up next card or the Focus page. Pick an activity and the minutes are added to it automatically."],
    ["Notice your patterns", "Insights shows weekly summaries and 30-day trends. The Smart coach explains why it suggests each tip. Switch light or dark mode any time with the sun/moon button."]
  ];
  function tourDone(){ try{ return localStorage.getItem(TOUR_KEY) === "1"; }catch(e){ return true; } }
  function markTour(){ try{ localStorage.setItem(TOUR_KEY, "1"); }catch(e){} }
  function showTour(){
    var i = 0, bd = document.createElement("div");
    bd.className = "modal-backdrop tour-backdrop";
    bd.innerHTML = '<div class="modal tour-modal" role="dialog" aria-modal="true" aria-labelledby="tourTitle"><p class="eyebrow" id="tourStep"></p><h2 id="tourTitle"></h2><p class="muted" id="tourText"></p><div class="tour-dots" id="tourDots"></div><div class="modal-actions"><button type="button" class="outline-btn" id="tourSkip">Skip</button><button type="button" class="outline-btn" id="tourBack">Back</button><button type="button" class="primary-btn" id="tourNext">Next</button></div></div>';
    document.body.appendChild(bd);
    function close(){ bd.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(e){ if(e.key === "Escape") close(); }
    document.addEventListener("keydown", onKey);
    function draw(){
      bd.querySelector("#tourStep").textContent = "WELCOME · " + (i + 1) + " OF " + STEPS.length;
      bd.querySelector("#tourTitle").textContent = STEPS[i][0];
      bd.querySelector("#tourText").textContent = STEPS[i][1];
      bd.querySelector("#tourDots").innerHTML = STEPS.map(function(_, n){ return '<i class="' + (n === i ? "on" : "") + '"></i>'; }).join("");
      bd.querySelector("#tourBack").style.visibility = i ? "visible" : "hidden";
      bd.querySelector("#tourNext").textContent = i === STEPS.length - 1 ? "Get started" : "Next";
    }
    bd.querySelector("#tourSkip").onclick = close;
    bd.querySelector("#tourBack").onclick = function(){ i = Math.max(0, i - 1); draw(); };
    bd.querySelector("#tourNext").onclick = function(){ if(i === STEPS.length - 1) close(); else { i++; draw(); } };
    draw(); bd.querySelector("#tourNext").focus();
  }
  var rt = $("replayTour"); if(rt) rt.addEventListener("click", showTour);
  if(!tourDone()){
    var waits = 0, iv = setInterval(function(){
      var pm = $("profileModal"), launch = $("launchScreen");
      var ready = pm && pm.classList.contains("hidden") && launch && launch.classList.contains("launch-hidden");
      if(ready){ clearInterval(iv); markTour(); setTimeout(showTour, 500); }
      else if(++waits > 120) clearInterval(iv);
    }, 1000);
  }

  window.DayflowFeatures = { parseQuickAdd: parseQuickAdd };
})();
