/* DAYFLOW v2.0 feature pack: calendar, focus, wellness, journal, time audit and adaptive suggestions. */
const renderAllBase = renderAll;
renderAll = function(){
  renderAllBase();
  renderCalendar();
  renderWellness();
  renderJournal();
  renderFocus();
  renderTimeAudit();
};

let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let calendarSelected = today();
let focusMode = "focus";
let focusRemaining = 25 * 60;
let focusInterval = null;
let focusRunning = false;

const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const safeNumber = (v, max=9999) => Math.max(0, Math.min(max, Number(v)||0));

function renderCalendar(){
  const grid=document.getElementById("calendarGrid"); if(!grid)return;
  const year=calendarCursor.getFullYear(), month=calendarCursor.getMonth();
  document.getElementById("calendarMonth").textContent=calendarCursor.toLocaleDateString(undefined,{month:"long",year:"numeric"});
  const first=new Date(year,month,1), start=(first.getDay()+6)%7, days=new Date(year,month+1,0).getDate();
  const labels=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let html=labels.map(x=>`<div class="calendar-weekday">${x}</div>`).join("");
  for(let i=0;i<start;i++)html+=`<div class="calendar-cell muted-cell"></div>`;
  for(let day=1;day<=days;day++){
    const d=dateKey(new Date(year,month,day)),items=activitiesFor(d),done=completedCount(items);
    html+=`<button class="calendar-cell ${d===today()?"is-today":""} ${d===calendarSelected?"is-selected":""}" data-calendar-date="${d}"><span>${day}</span>${items.length?`<i class="calendar-dot ${done===items.length?"all-done":""}"></i><small>${done}/${items.length}</small>`:""}</button>`;
  }
  grid.innerHTML=html;
  document.getElementById("calendarSelectedDate").textContent=formatDate(calendarSelected);
  const items=activitiesFor(calendarSelected);
  document.getElementById("calendarDayList").innerHTML=items.map(activityHTML).join("")||`<div class="empty-state compact-empty"><b>No activities planned</b><p>This day is still open.</p></div>`;
}

function renderWellness(){
  const box=document.getElementById("wellnessHistory");if(!box)return;
  const entry=data.wellness?.[today()]||{};
  document.getElementById("wellnessDateLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}).toUpperCase();
  document.getElementById("sleepHours").value=entry.sleep??"";
  document.getElementById("waterGlasses").value=entry.water??"";
  document.getElementById("exerciseMinutes").value=entry.exercise??"";
  document.getElementById("energyLevel").value=entry.energy??"";
  document.getElementById("wellnessNote").value=entry.note??"";
  const rows=Object.entries(data.wellness||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,7);
  box.innerHTML=rows.length?rows.map(([d,v])=>`<div class="wellness-row"><b>${escapeHTML(formatDate(d))}</b><span>${v.sleep!=null?`${v.sleep}h sleep`:"No sleep entry"}</span><span>${v.water!=null?`${v.water} glasses`:"—"}</span><span>${v.exercise!=null?`${v.exercise} min exercise`:"—"}</span><span>${v.energy?`Energy ${v.energy}/5`:"—"}</span></div>`).join(""):`<p class="muted">Your saved check-ins will appear here.</p>`;
}

function renderJournal(){
  const dateInput=document.getElementById("journalDate");if(!dateInput)return;
  if(!dateInput.value)dateInput.value=today();
  const entry=data.journal?.[dateInput.value];
  document.getElementById("journalText").value=entry?.text||"";
  document.getElementById("journalSavedAt").textContent=entry?.savedAt?`Last saved ${new Date(entry.savedAt).toLocaleString()}`:"Not saved yet";
  const entries=Object.entries(data.journal||{}).filter(([,v])=>v?.text?.trim()).sort((a,b)=>b[0].localeCompare(a[0]));
  document.getElementById("journalHistory").innerHTML=entries.length?entries.slice(0,12).map(([d,v])=>`<button class="journal-entry" data-journal-open="${d}"><b>${escapeHTML(formatDate(d))}</b><span>${escapeHTML(v.text.slice(0,150))}${v.text.length>150?"…":""}</span></button>`).join(""):`<p class="muted">Your saved reflections will appear here.</p>`;
}

function focusLength(){
  if(focusMode==="focus")return safeNumber(document.getElementById("focusMinutes")?.value,180)||25;
  if(focusMode==="short")return safeNumber(document.getElementById("breakMinutes")?.value,60)||5;
  return Math.max(1,(safeNumber(document.getElementById("breakMinutes")?.value,60)||5)*3);
}
function stopFocus(){if(focusInterval){clearInterval(focusInterval);focusInterval=null;}focusRunning=false;}
function setFocusMode(mode){stopFocus();focusMode=mode;focusRemaining=focusLength()*60;document.querySelectorAll("[data-focus-mode]").forEach(b=>b.classList.toggle("active",b.dataset.focusMode===mode));renderFocus();}
function renderFocus(){
  const clock=document.getElementById("focusClock");if(!clock)return;
  const mins=Math.floor(focusRemaining/60),secs=focusRemaining%60;
  clock.textContent=`${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
  document.getElementById("focusStatus").textContent=focusRunning?"Stay with one task. You can do this.":focusMode==="focus"?"Ready when you are.":"Take a breath and recharge.";
  document.getElementById("focusStart").textContent=focusRunning?"Pause":"Start "+(focusMode==="focus"?"focus":"break");
  const sessions=(data.focusSessions||[]).filter(x=>x.date===today()&&x.mode==="focus");
  document.getElementById("focusSessions").textContent=sessions.length;
  const history=(data.focusSessions||[]).slice().reverse().slice(0,8);
  document.getElementById("focusHistory").innerHTML=history.length?history.map(x=>`<div class="insight-note"><span>◷</span><p><b>${escapeHTML(x.mode=== "focus"?"Focus session":"Break")}</b> · ${x.minutes} minutes · ${escapeHTML(new Date(x.completedAt).toLocaleString())}</p></div>`).join(""):`<p class="muted">Completed focus sessions will show here.</p>`;
}
function startFocus(){
  if(focusRunning){stopFocus();renderFocus();return;}
  if(focusRemaining<=0)focusRemaining=focusLength()*60;
  focusRunning=true;
  focusInterval=setInterval(()=>{
    focusRemaining=Math.max(0,focusRemaining-1);
    if(focusRemaining===0){
      stopFocus();
      const minutes=focusLength();
      data.focusSessions??=[];
      data.focusSessions.push({id:uid(),date:today(),mode:focusMode,minutes,completedAt:new Date().toISOString()});
      save();
      showToast(focusMode==="focus"?"Focus session completed. Nice work!":"Break completed. Ready for the next step?");
      if("Notification" in window&&Notification.permission==="granted")new Notification("DAYFLOW",{body:focusMode==="focus"?"Focus session complete. Take a short break.":"Break finished. You can start another session."});
      if(focusMode==="focus")setFocusMode("short");
    }else renderFocus();
  },1000);
  renderFocus();
}

function renderTimeAudit(){
  const el=document.getElementById("timeAudit");if(!el)return;
  const week=weekData(),items=week.flatMap(x=>activitiesFor(x.date));
  const cats={};items.forEach(a=>{const c=a.category||"Other";cats[c]??={planned:0,tracked:0};cats[c].planned+=Number(a.duration)||0;cats[c].tracked+=Number(a.actualMinutes)||0;});
  const rows=Object.entries(cats).sort((a,b)=>b[1].tracked-a[1].tracked||b[1].planned-a[1].planned);
  const totalPlanned=items.reduce((n,a)=>n+(Number(a.duration)||0),0),totalTracked=items.reduce((n,a)=>n+(Number(a.actualMinutes)||0),0);
  el.innerHTML=`<div class="audit-total"><strong>${totalPlanned}</strong><small>planned minutes</small></div><div class="audit-total"><strong>${totalTracked}</strong><small>tracked minutes</small></div><div class="audit-total"><strong>${items.filter(a=>a.done).length}</strong><small>completed activities</small></div>`+(rows.length?`<div class="audit-breakdown">${rows.map(([c,v])=>`<div class="audit-line"><span>${escapeHTML(c)}</span><div><i style="width:${totalTracked?Math.min(100,v.tracked/totalTracked*100):0}%"></i></div><small>${v.tracked} / ${v.planned} min</small></div>`).join("")}</div>`:`<p class="muted">Add and track activities to see where your time goes.</p>`);
  const repeated=items.filter(a=>(a.rescheduleCount||0)>=2),overdue=data.activities.filter(a=>a.date<today()&&!a.done);
  const notes=[];
  if(repeated.length)notes.push(`${repeated.length} activity/activities have been moved more than once. Try splitting them into smaller steps or choosing a more realistic time.`);
  if(overdue.length)notes.push(`${overdue.length} unfinished activity/activities are from previous days. Move them forward, edit them, or remove plans you no longer need.`);
  if(!repeated.length&&!overdue.length)notes.push("No repeated postponement pattern stands out yet. Keep recording honestly; this section becomes more useful over time.");
  document.getElementById("procrastinationNotes").innerHTML=notes.map(n=>`<div class="insight-note"><span>↻</span><p>${escapeHTML(n)}</p></div>`).join("");
}

const templatePlans={
  balanced:[ ["Plan the day","Personal","08:00",10], ["Focused work or study","Study","09:00",60], ["Take a short break","Rest","10:00",15], ["Move your body","Exercise","16:00",30], ["Personal time","Personal","19:00",45] ],
  study:[ ["Review notes","Study","08:30",30], ["Main study session","Study","09:00",60], ["Short break","Rest","10:00",15], ["Practice or assignment","Study","10:15",60], ["Review what I learned","Study","19:00",20] ],
  morning:[ ["Wake up and make the bed","Personal","07:00",10], ["Drink water","Health","07:10",5], ["Light movement","Exercise","07:20",15], ["Breakfast","Health","07:40",20], ["Plan the day","Personal","08:00",10] ],
  recovery:[ ["Easy morning reset","Personal","09:00",15], ["One important task","Personal","11:00",30], ["Take a proper break","Rest","13:00",30], ["Gentle walk or stretch","Exercise","17:00",15] ]
};
function applyTemplate(name){
  const plan=templatePlans[name];if(!plan)return;
  const date=today(),existing=activitiesFor(date).length;
  if(existing&&!confirm("Add this template alongside your existing activities?"))return;
  plan.forEach(([name,category,time,duration])=>data.activities.push({id:uid(),name,category,time,duration,date,priority:"normal",reminder:"none",notes:"",done:false,rescheduleCount:0}));
  activeRoutineDate=date;save();nav("routine");showToast("Routine template added");
}

// Add adaptive, history-based coaching without pretending this is an AI diagnosis.
const makeSuggestionsBase=makeSuggestions;
makeSuggestions=function(){
  const out=makeSuggestionsBase();
  const wellness=data.wellness?.[today()];
  const postponed=data.activities.filter(a=>(a.rescheduleCount||0)>=2&&!a.done);
  if(data.dayTypes[today()]==="recovery"||Number(wellness?.energy)<=2){
    out.unshift(["ADAPT YOUR DAY","Keep today's plan lighter","Your selected day mode or energy check-in suggests keeping the plan manageable. Consider doing one important task and allowing more recovery time."]);
  }
  if(postponed.length){
    out.unshift(["MAKE IT SMALLER","Break down a task you're postponing",`You have moved "${postponed[0].name}" more than once. Try turning it into a first step that takes 10 minutes or less.`]);
  }
  if(wellness?.sleep!==undefined&&Number(wellness.sleep)>0&&Number(wellness.sleep)<6){
    out.push(["REST CHECK","Your sleep entry was under 6 hours","If possible, avoid overloading today. Consider a lighter schedule and a consistent wind-down routine."]);
  }
  return out.slice(0,6);
};

// Shared interactions for the added sections.
document.addEventListener("click",e=>{
  const cal=e.target.closest("[data-calendar-date]");if(cal){calendarSelected=cal.dataset.calendarDate;renderCalendar();return;}
  const tpl=e.target.closest("[data-template]");if(tpl){applyTemplate(tpl.dataset.template);return;}
  const fm=e.target.closest("[data-focus-mode]");if(fm){setFocusMode(fm.dataset.focusMode);return;}
  const j=e.target.closest("[data-journal-open]");if(j){document.getElementById("journalDate").value=j.dataset.journalOpen;renderJournal();nav("journal");return;}
});

document.getElementById("calendarPrev").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar();});
document.getElementById("calendarNext").addEventListener("click",()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar();});
document.getElementById("calendarToday").addEventListener("click",()=>{calendarCursor=new Date(new Date().getFullYear(),new Date().getMonth(),1);calendarSelected=today();renderCalendar();});
document.getElementById("calendarAdd").addEventListener("click",()=>{activeRoutineDate=calendarSelected;document.getElementById("routineForm").reset();document.getElementById("activityId").value="";document.getElementById("activityDate").value=calendarSelected;document.getElementById("routineModalTitle").textContent="Add activity";openModal("routineModal");});
document.getElementById("saveWellness").addEventListener("click",()=>{
  data.wellness??={};data.wellness[today()]={sleep:document.getElementById("sleepHours").value===""?null:safeNumber(document.getElementById("sleepHours").value,24),water:document.getElementById("waterGlasses").value===""?null:safeNumber(document.getElementById("waterGlasses").value,30),exercise:document.getElementById("exerciseMinutes").value===""?null:safeNumber(document.getElementById("exerciseMinutes").value,1440),energy:document.getElementById("energyLevel").value||null,note:document.getElementById("wellnessNote").value.trim()};save();showToast("Wellness check-in saved");
});
document.getElementById("journalDate").addEventListener("change",renderJournal);
document.getElementById("saveJournal").addEventListener("click",()=>{
  const date=document.getElementById("journalDate").value||today(),textValue=document.getElementById("journalText").value.trim();data.journal??={};
  if(!textValue){if(data.journal[date])delete data.journal[date];showToast("Empty journal entry cleared");}
  else{data.journal[date]={text:textValue,savedAt:new Date().toISOString()};showToast("Journal entry saved");}
  save();
});
document.getElementById("focusStart").addEventListener("click",startFocus);
document.getElementById("focusReset").addEventListener("click",()=>{stopFocus();focusRemaining=focusLength()*60;renderFocus();});
document.getElementById("focusMinutes").addEventListener("change",()=>{if(focusMode==="focus"&&!focusRunning){focusRemaining=focusLength()*60;renderFocus();}});
document.getElementById("breakMinutes").addEventListener("change",()=>{if(focusMode!=="focus"&&!focusRunning){focusRemaining=focusLength()*60;renderFocus();}});

// Wrap navigation so newly added pages refresh when opened.
const navBase=nav;
nav=function(page){navBase(page);if(page==="calendar")renderCalendar();if(page==="wellness")renderWellness();if(page==="journal")renderJournal();if(page==="focus")renderFocus();if(page==="insights")renderTimeAudit();};

// Add safe defaults for backups created by older versions.
data.wellness??={};data.journal??={};data.focusSessions??=[];
renderAll();


/* DAYFLOW v3.0: personal onboarding, sleep plan and motion design */
data.profile ??= null;
data.sleepPlan ??= null;
const originalCheckReminders = checkReminders;
checkReminders = function(){
  originalCheckReminders();
  const plan=data.sleepPlan;
  if(!plan || !("Notification" in window) || Notification.permission!=="granted") return;
  const now=new Date(), todayKey=today(), current=now.getHours()*60+now.getMinutes();
  const [wh,wm]=(plan.wake||"07:00").split(":").map(Number);
  const [bh,bm]=(plan.bedtime||"23:00").split(":").map(Number);
  const wakeAt=wh*60+wm, bedAt=bh*60+bm;
  const wind=Number(plan.windDown)||0;
  const fire=(key,title,body,minute)=>{
    if(current===minute && !sessionStorage.getItem(`df_${key}_${todayKey}`)){
      new Notification(title,{body});sessionStorage.setItem(`df_${key}_${todayKey}`,"1");
    }
  };
  fire("winddown","DAYFLOW · Wind down",`Your planned bedtime is ${formatClock(plan.bedtime)}. Start getting ready to rest.`,(bedAt-wind+1440)%1440);
  if(plan.wakeReminder!==false) fire("wake","DAYFLOW · Good morning",`It's your planned wake-up time (${formatClock(plan.wake)}). Start gently.`,wakeAt);
};
function formatClock(value){if(!value)return "";const [h,m]=value.split(":").map(Number);return new Date(2000,0,1,h,m).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"});}
function suggestedBedtime(wake,hours){const [h,m]=wake.split(":").map(Number);let total=(h*60+m-Math.round(Number(hours)*60)+1440)%1440;return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;}
function renderSleepPlan(){
 const plan=data.sleepPlan||{wake:"07:00",hours:"8",windDown:30,wakeReminder:true};
 const wake=document.getElementById("wakeTime");if(!wake)return;
 wake.value=plan.wake||"07:00";document.getElementById("sleepTarget").value=String(plan.hours||8);
 document.getElementById("windDown").value=String(plan.windDown??30);document.getElementById("wakeReminder").checked=plan.wakeReminder!==false;
 updateSleepResult();
}
function updateSleepResult(){const wake=document.getElementById("wakeTime")?.value||"07:00",hours=document.getElementById("sleepTarget")?.value||8,bed=suggestedBedtime(wake,hours);const out=document.getElementById("sleepResult");if(out)out.textContent=`Suggested bedtime: ${formatClock(bed)}  ·  ${hours} hours of sleep`;}
function profileGreeting(){const name=data.profile?.name?.trim();return name?`WELCOME BACK, ${name.toUpperCase()}`:"YOUR DAY, YOUR PACE";}
function openProfile(isFirst=false){
 const p=data.profile||{};document.getElementById("profileModalTitle").textContent=isFirst?"Welcome to DAYFLOW":"Edit your profile";
 document.getElementById("profileName").value=p.name||"";document.getElementById("profileBirthday").value=p.birthday||"";document.getElementById("profileGender").value=p.gender||"";document.getElementById("profileHobbies").value=p.hobbies||"";document.getElementById("profileHabits").value=p.habits||"";document.getElementById("profileGoals").value=p.goals||"";document.getElementById("profileFocus").value=p.focus||"balanced";
 document.getElementById("profileModal").classList.remove("hidden");document.body.classList.add("modal-open");
}
function closeProfile(){document.getElementById("profileModal").classList.add("hidden");document.body.classList.remove("modal-open");}
function renderProfile(){const p=data.profile||{};const avatar=document.getElementById("profileBtn");if(avatar)avatar.textContent=(p.name||"Y").trim().charAt(0).toUpperCase()||"Y";const greeting=document.getElementById("greeting");if(greeting)greeting.textContent=profileGreeting();}
function addProfileSuggestions(){
 const p=data.profile;if(!p)return;
 const interests=(p.hobbies||"").split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
 const wanted=(p.goals||"").split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
 const box=document.getElementById("homeSuggestion");if(!box)return;
 if(interests.length||wanted.length){const pick=wanted[0]||interests[0];box.innerHTML=`<div class="suggestion-icon">✦</div><div><b>A small idea for you</b><p>Make a little time for ${escapeHTML(pick)} today. Keep it easy to start—even 10 minutes counts.</p></div>`;}
}
// Extend existing rendering without changing the original v2 features.
const renderAllV3Base=renderAll;
renderAll=function(){renderAllV3Base();renderSleepPlan();renderProfile();addProfileSuggestions();};
const renderWellnessV3Base=renderWellness;
renderWellness=function(){renderWellnessV3Base();renderSleepPlan();};

document.getElementById("profileBtn").addEventListener("click",()=>openProfile(false));
document.getElementById("editProfileBtn").addEventListener("click",()=>openProfile(false));
document.querySelectorAll("[data-profile-close]").forEach(b=>b.addEventListener("click",closeProfile));
document.getElementById("skipProfileBtn").addEventListener("click",()=>{data.profile={...(data.profile||{}),completed:true};save();closeProfile();showToast("You can personalize DAYFLOW anytime in Settings.");});
document.getElementById("profileForm").addEventListener("submit",e=>{
 e.preventDefault();data.profile={name:document.getElementById("profileName").value.trim(),birthday:document.getElementById("profileBirthday").value,gender:document.getElementById("profileGender").value,hobbies:document.getElementById("profileHobbies").value.trim(),habits:document.getElementById("profileHabits").value.trim(),goals:document.getElementById("profileGoals").value.trim(),focus:document.getElementById("profileFocus").value,completed:true};save();closeProfile();showToast("Your profile has been saved.");
});
document.getElementById("wakeTime").addEventListener("input",updateSleepResult);
document.getElementById("sleepTarget").addEventListener("change",updateSleepResult);
document.getElementById("saveSleepPlan").addEventListener("click",()=>{
 const wake=document.getElementById("wakeTime").value||"07:00",hours=document.getElementById("sleepTarget").value||"8";
 data.sleepPlan={wake,hours,bedtime:suggestedBedtime(wake,hours),windDown:Number(document.getElementById("windDown").value)||0,wakeReminder:document.getElementById("wakeReminder").checked};
 save();showToast(`Sleep plan saved. Bedtime: ${formatClock(data.sleepPlan.bedtime)}.`);
});
// First-run welcome: optional profile details, with a clear skip button.
if(!data.profile?.completed){setTimeout(()=>openProfile(true),450);}
// Remove the launch screen after the initial interface has rendered.
window.addEventListener("load",()=>setTimeout(()=>document.getElementById("launchScreen")?.classList.add("launch-hidden"),650));


/* DAYFLOW v3.1 theme preference */
(function(){
 const root=document.documentElement,button=document.getElementById("themeToggle");
 if(!button)return;
 let theme="dark";
 try{theme=localStorage.getItem("dayflow_theme")||"dark";}catch(e){}
 function applyTheme(next){
   theme=next;root.dataset.theme=theme;
   const light=theme==="light";
   button.setAttribute("aria-pressed",String(light));
   button.setAttribute("aria-label",light?"Switch to dark mode":"Switch to light mode");
   button.title=light?"Switch to dark mode":"Switch to light mode";
   button.querySelector(".theme-glyph").textContent=light?"☾":"☼";
   const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=light?"#f3f5fb":"#10131c";
   try{localStorage.setItem("dayflow_theme",theme);}catch(e){}
 }
 button.addEventListener("click",()=>applyTheme(theme==="dark"?"light":"dark"));
 applyTheme(theme);
})();


/* DAYFLOW Android native alarm and notification bridge */
(function(){
  const native = window.DayflowAndroid;
  const oldAsk = askNotifications;
  askNotifications = function(){
    if(native && typeof native.enableNotifications === "function"){
      native.enableNotifications();
      showToast("Allow DAYFLOW notifications and alarms in the phone settings.");
      setTimeout(renderNotificationStatus, 900);
      return;
    }
    oldAsk();
  };
  renderNotificationStatus = function(){
    const el=document.getElementById("notificationStatus");
    if(el) el.textContent=native ? "Phone alarms and notifications are ready to be enabled." : ("Notification" in window ? (Notification.permission==="granted"?"Notifications are enabled.":Notification.permission==="denied"?"Notifications are blocked in browser settings.":"Permission not requested") : "Notifications are not supported here.");
  };
  function syncSleep(){
    if(!native || !data.sleepPlan) return;
    const p=data.sleepPlan;
    try{native.scheduleSleepPlan(p.wake||"07:00",p.bedtime||suggestedBedtime(p.wake||"07:00",p.hours||8),Number(p.windDown)||0,p.wakeReminder!==false);}catch(e){}
  }
  function syncActivities(){
    if(!native) return;
    const now=Date.now(), date=today();
    let previous=[];
    try{previous=JSON.parse(localStorage.getItem("dayflow_native_alarm_ids")||"[]");}catch(e){}
    const nextIds=[];
    (data.activities||[]).forEach(a=>{
      if(a.date!==date || a.done || !a.time || a.reminder==="none" || a.reminder==null) return;
      const parts=a.time.split(":").map(Number);
      const at=new Date();at.setHours(parts[0],parts[1]-(Number(a.reminder)||0),0,0);
      const id=2000+(String(a.id).split("").reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7)%1000000);
      if(at.getTime()>now+5000){
        try{native.scheduleAt(at.getTime(),"DAYFLOW · Upcoming activity",`${a.name} starts in ${a.reminder} minutes.`,id);nextIds.push(id);}catch(e){}
      }
    });
    previous.filter(id=>!nextIds.includes(id)).forEach(id=>{try{native.cancelReminder(id);}catch(e){}});
    try{localStorage.setItem("dayflow_native_alarm_ids",JSON.stringify(nextIds));}catch(e){}
  }
  const saveBase=save;
  save=function(){saveBase();syncSleep();syncActivities();};
  const checkBase=checkReminders;
  checkReminders=function(){
    if(native){syncActivities();return;}
    checkBase();
  };
  syncSleep();syncActivities();renderNotificationStatus();
})();
