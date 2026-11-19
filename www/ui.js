/* DAYFLOW v4.0 — UI layer: theme, page transitions, navigation.
   Purely presentational. All data/business logic stays in app.js / app-extra.js. */
(function(){
  "use strict";
  var root=document.documentElement;
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme (saved preference) ---------- */
  var THEME_KEY="dayflow_theme";
  var themeBtn=document.getElementById("themeToggle");
  function storedTheme(){try{var t=localStorage.getItem(THEME_KEY);return t==="light"||t==="dark"?t:null}catch(e){return null}}
  function systemTheme(){return window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}
  var theme=storedTheme()||systemTheme();
  function applyTheme(next,persist,animate){
    theme=next;
    if(animate&&!reduce){root.classList.add("theme-anim");clearTimeout(applyTheme.t);applyTheme.t=setTimeout(function(){root.classList.remove("theme-anim")},520)}
    root.setAttribute("data-theme",theme);
    var light=theme==="light";
    if(themeBtn){
      themeBtn.setAttribute("aria-pressed",String(light));
      var label=light?"Switch to dark mode":"Switch to light mode";
      themeBtn.setAttribute("aria-label",label);themeBtn.title=label;
    }
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute("content",light?"#eef1fa":"#0b0e17");
    if(persist){try{localStorage.setItem(THEME_KEY,theme)}catch(e){}}
  }
  applyTheme(theme,false,false);
  if(themeBtn)themeBtn.addEventListener("click",function(){applyTheme(theme==="dark"?"light":"dark",true,true)});
  /* follow the OS only while the user hasn't chosen explicitly */
  if(window.matchMedia){
    var mq=matchMedia("(prefers-color-scheme: light)");
    var onSys=function(e){if(!storedTheme())applyTheme(e.matches?"light":"dark",false,true)};
    if(mq.addEventListener)mq.addEventListener("change",onSys);else if(mq.addListener)mq.addListener(onSys);
  }
  /* keep tabs in sync */
  window.addEventListener("storage",function(e){if(e.key===THEME_KEY&&(e.newValue==="light"||e.newValue==="dark"))applyTheme(e.newValue,false,true)});

  /* ---------- Page transitions (fade out -> fade in) ---------- */
  var TITLES={home:"Overview",routine:"My routine",habits:"Habits",calendar:"Calendar",focus:"Focus timer",wellness:"Wellness",journal:"Journal",insights:"Insights",coach:"Smart coach",settings:"Settings & backup"};
  var MORE=["focus","wellness","journal","insights","coach","settings"];
  var baseNav=window.nav;            // original router from app.js
  var busy=false,pending=null;

  function currentPage(){var p=document.querySelector(".page.active");return p?p.id.replace("page-",""):"home"}
  function markNav(page){
    document.querySelectorAll("[data-page]").forEach(function(b){
      var on=b.dataset.page===page;
      if(on)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
    });
    var more=document.getElementById("moreBtn");
    if(more)more.classList.toggle("active",MORE.indexOf(page)>-1);
    var t=document.getElementById("topPage");if(t)t.textContent=TITLES[page]||"";
    document.title=(TITLES[page]||"DAYFLOW")+" — DAYFLOW";
  }
  function enter(page){
    var el=document.getElementById("page-"+page);if(!el)return;
    if(reduce)return;
    el.classList.remove("is-entering");void el.offsetWidth;el.classList.add("is-entering");
    var done=function(){el.classList.remove("is-entering");el.removeEventListener("animationend",onEnd)};
    var onEnd=function(ev){if(ev.target===el)done()};
    el.addEventListener("animationend",onEnd);setTimeout(done,1100);
  }
  function go(page){
    if(!TITLES[page])return baseNav(page);
    var from=currentPage();
    if(page===from){window.scrollTo({top:0,behavior:reduce?"auto":"smooth"});return}
    if(busy){pending=page;return}
    var leaving=document.getElementById("page-"+from);
    var swap=function(){
      if(leaving)leaving.classList.remove("is-leaving");
      baseNav(page);markNav(page);enter(page);
      busy=false;
      if(pending&&pending!==page){var n=pending;pending=null;go(n)}else pending=null;
    };
    markNav(page);                         // instant feedback in the nav
    if(reduce||!leaving){swap();return}
    busy=true;leaving.classList.add("is-leaving");
    setTimeout(swap,190);
  }
  window.nav=go;                           // app.js & app-extra.js call nav(...) globally
  try{nav=go}catch(e){}
  markNav(currentPage());
  enter("home");

  /* ---------- "More" sheet (phones) ---------- */
  var moreBtn=document.getElementById("moreBtn"),sheet=document.getElementById("moreSheet"),back=document.getElementById("moreBackdrop");
  function setSheet(open){
    if(!sheet)return;
    sheet.hidden=!open;back.hidden=!open;
    if(moreBtn)moreBtn.setAttribute("aria-expanded",String(open));
  }
  if(moreBtn)moreBtn.addEventListener("click",function(){setSheet(sheet.hidden)});
  if(back)back.addEventListener("click",function(){setSheet(false)});
  document.addEventListener("click",function(e){
    if(sheet&&!sheet.hidden&&e.target.closest("#moreSheet [data-page]"))setSheet(false);
  });
  window.addEventListener("resize",function(){if(window.innerWidth>720)setSheet(false)});

  /* ---------- Keyboard: Esc closes dialogs ---------- */
  document.addEventListener("keydown",function(e){
    if(e.key!=="Escape")return;
    if(sheet&&!sheet.hidden){setSheet(false);return}
    var profile=document.getElementById("profileModal");
    if(profile&&!profile.classList.contains("hidden")){if(typeof closeProfile==="function")closeProfile();return}
    if(document.querySelector(".modal-backdrop:not(.hidden)")&&typeof closeModals==="function")closeModals();
  });
})();
