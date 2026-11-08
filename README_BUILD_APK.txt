DAYFLOW 3.2 — ANDROID APK PROJECT

This is the Android project for the DAYFLOW app. It packages the existing app in a local Android WebView and adds native Android alarm/notification scheduling. This ZIP is the source project, not the finished APK.

BUILD THE APK WITH GITHUB ACTIONS
1. Download and extract this ZIP.
2. Create a new repository on https://github.com/ (for example, DAYFLOW-Android).
3. Upload the CONTENTS of the extracted folder to the repository. Include the hidden .github folder and its workflow file.
4. Open the repository's Actions tab.
5. Select "Build DAYFLOW APK" and tap "Run workflow" (or wait for the build triggered by your upload).
6. When the workflow succeeds, open the completed run and find Artifacts.
7. Download "DAYFLOW-debug-apk", extract that ZIP, and install app-debug.apk on your Android phone.
8. If Android blocks installation, allow "Install unknown apps" for the browser or file manager you used.

FIRST-TIME ALARM SETUP
1. Open DAYFLOW and go to Settings & backup.
2. Tap Enable notifications.
3. Allow notifications when Android asks.
4. If Android opens the Alarms & reminders / exact alarm settings page, allow DAYFLOW there too.
5. Save your Sleep & wake-up plan in Wellness. The app will schedule your wake-up and wind-down notifications.
6. For routine reminders, add an activity with a time and reminder lead-time. Keep it on today's date.

ALARM / NOTIFICATION NOTES
- Sleep wake-up and wind-down alerts are scheduled by Android AlarmManager, not by a browser timer. They can be delivered when DAYFLOW is closed, and the sleep reminders are restored after a phone restart.
- Alerts use a high-priority Android notification channel with alarm sound and vibration. Check Android Settings > Apps > DAYFLOW > Notifications if alerts are silent or blocked. Android notification channel sound can be changed by the user.
- Exact timing depends on granting the Android exact-alarm access when offered. Without it, Android may deliver reminders later to save battery.
- Some phone manufacturers' battery saver settings can still delay background alarms. Exempt DAYFLOW from aggressive battery optimization if reminders are being delayed.
- Routine activity reminders are scheduled for the current day when DAYFLOW is open or when data is saved. They are not restored after a reboot; the sleep plan is.
- This is a reminder notification, not a full-screen alarm-clock interface that rings continuously until dismissed.

DATA AND PRIVACY
- DAYFLOW stores its profile, routines, habits, and check-ins locally in the app's WebView storage on this phone.
- It does not need the Termux server or an internet connection to open.
- Existing Chrome PWA/browser data does not automatically transfer into the APK. Export a backup from the old app and import it in the new app if needed.

The project is configured to build a debug APK. It has not yet been installed or runtime-tested on your specific phone; test notification permission and alarm delivery after building.
