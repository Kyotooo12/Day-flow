DAYFLOW v3.0 — QUICK START

WHAT'S INCLUDED
- Daily routine planner: add, edit, delete, complete, move to tomorrow, filter by status
- Routine templates: balanced day, study day, morning reset, recovery day
- Habit tracker with daily/weekday targets and streaks
- Personal goals and progress tracking
- Monthly calendar with daily activity overview
- Focus timer with focus, short break and long break modes
- Time tracking for routine activities
- Wellness check-ins: sleep, water, exercise, energy and notes
- Daily journal with saved entries
- Weekly analytics, category time audit and postponement observations
- Rule-based adaptive smart coach using recorded activity and check-in data
- Mood check-in and regular/rest/recovery day modes
- Browser notifications for activity reminders (best effort)
- Local data storage, JSON export/import
- Installable PWA and offline cache

RUN ON ANDROID
1. Extract the ZIP.
2. For PWA installation, serve the folder over HTTPS or localhost (not file://).
3. In Termux, open the folder and run: python -m http.server 8080
4. Open http://127.0.0.1:8080 in Chrome on the same phone.
5. Use Chrome menu > Add to Home screen / Install app if available.

RUN ON A COMPUTER
1. Extract the ZIP.
2. Open a terminal in the DAYFLOW folder.
3. Run: python -m http.server 8080
4. Open http://localhost:8080.

DATA & PRIVACY
- DAYFLOW stores records in browser LocalStorage on this device.
- Export a JSON backup regularly. Importing replaces current data.
- Clearing browser/site data can erase records.
- No account or cloud sync is included.
- Smart Coach uses local rules and your saved records; it is not a connected AI model.
- Wellness tracking is for personal organization, not medical advice.
- Browser notifications and timers are affected by device/browser restrictions. Do not rely on them as guaranteed alarm-clock alerts.

FILES
- index.html: app structure
- styles.css: dark glassmorphism interface
- app.js: core routine, habit, goals, analytics and backup features
- app-extra.js: calendar, focus, wellness, journal, time audit and adaptive coach
- manifest.webmanifest: PWA installation details
- sw.js: offline cache
- icon.svg: application icon

TIMER NOTE
- The focus timer counts while the app is open. Mobile operating systems may pause browser timers when the app is backgrounded or the phone is locked.


DAYFLOW v3.0 additions
- First-run personal profile (name, optional birthday/gender, interests, existing habits and goals).
- Profile can be edited later from the avatar or Settings. Skip is always available.
- Sleep planner calculates a suggested bedtime from wake-up time and target sleep hours.
- Optional wind-down and wake-up browser notifications. These are not guaranteed alarms; Android may pause browser activity.
- Animated launch screen, page transitions, subtle card motion and tap feedback. Animations respect reduced-motion settings.
- Profile and sleep settings are stored locally and included in JSON backups.

Privacy note: profile details are stored in this browser on this device. Birthday and gender are optional and are not used to infer interests or make assumptions.
