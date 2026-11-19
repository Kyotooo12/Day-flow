# DAYFLOW Android build (Capacitor)

## Requirements
- Node.js 20+
- Android Studio with Android SDK (API 35)
- JDK 17

## Generate the Android project
1. Extract this folder.
2. In the `DAYFLOW` folder run `npm install`.
3. Run `npx cap add android` (first time only).
4. Copy the native alarm integration files from `android-native/` into the generated `android/` folder, preserving paths. The included files are the custom plugin and manifest additions; see `android-native/README.md`.
5. Run `npx cap sync android` then `npx cap open android`.
6. Build > Build Bundle(s) / APK(s) > Build APK(s).

## Alarm behavior
The Android plugin schedules reminders with `AlarmManager.setExactAndAllowWhileIdle` and posts a high-importance notification with sound and vibration. It stores pending alarms and reschedules them after reboot. Android 12+ may require the user to allow **Alarms & reminders** (exact alarm access); Android 13+ requires notification permission. The app requests these permissions from Settings > Enable notifications.

Exact-alarm access and notification permission are controlled by Android and cannot be silently granted by the app. Do not disable battery restrictions if Android's manufacturer firmware still restricts background delivery. Test with the screen locked and the app swiped away before relying on it.

## Data and compatibility
DAYFLOW's existing LocalStorage data model and UI are retained. Browser/PWA behavior remains as a fallback; native Android uses OS-scheduled notifications. Export a JSON backup before upgrading. This package is a prepared source project, not a signed APK; signing requires your own keystore.
