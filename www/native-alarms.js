/* DAYFLOW native Android alarm adapter. Browser/PWA fallback remains available. */
(function (global) {
  "use strict";
  const plugin = () => global.Capacitor?.Plugins?.DayflowAlarm || null;
  const isNative = () => !!global.Capacitor?.isNativePlatform?.() && !!plugin();
  const toEpoch = (date, time) => {
    if (!date || !time) return 0;
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
  };
  function collectSchedules(data) {
    const now = Date.now(), items = [];
    (data.activities || []).forEach(activity => {
      if (activity.done || !activity.time || activity.reminder === "none" || !activity.date) return;
      const minutes = Math.max(0, Number(activity.reminder) || 0);
      const at = toEpoch(activity.date, activity.time) - minutes * 60000;
      if (at > now) items.push({ id: `activity_${activity.id}`, at, title: "DAYFLOW reminder", body: `${activity.name} starts in ${minutes} minutes.` });
    });
    const plan = data.sleepPlan;
    if (plan?.wake) {
      const today = new Date();
      const date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      const [wh, wm] = plan.wake.split(":").map(Number);
      if (plan.wakeReminder !== false) {
        let at = toEpoch(date, plan.wake); if (at <= now) at += 86400000;
        items.push({ id: "sleep_wake", at, title: "DAYFLOW · Good morning", body: `It's your planned wake-up time (${plan.wake}). Start gently.` });
      }
      if (plan.bedtime) {
        const [bh, bm] = plan.bedtime.split(":").map(Number);
        const wind = Math.max(0, Number(plan.windDown) || 0);
        let at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), bh, bm - wind).getTime();
        if (at <= now) at += 86400000;
        items.push({ id: "sleep_winddown", at, title: "DAYFLOW · Wind down", body: `Your planned bedtime is ${plan.bedtime}. Start getting ready to rest.` });
      }
    }
    return items.filter(item => item.at > now && item.at < now + 31 * 86400000);
  }
  async function sync(data) {
    const native = plugin();
    if (!isNative() || !native) return { native: false };
    try { await native.syncSchedules({ schedules: collectSchedules(data) }); return { native: true }; }
    catch (error) { console.warn("DAYFLOW alarm sync failed", error); return { native: true, error: String(error) }; }
  }
  async function requestPermissions() {
    const native = plugin();
    if (!isNative() || !native) return { native: false };
    return native.requestNotificationPermission();
  }
  async function requestExactAlarmAccess() {
    const native = plugin();
    if (!isNative() || !native) return { native: false };
    return native.requestExactAlarmAccess();
  }
  global.DayflowNative = { isNative, sync, requestPermissions, requestExactAlarmAccess, collectSchedules };
})(window);
