package com.dayflow.productivity

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.getcapacitor.*
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(name = "DayflowAlarm", permissions = [Permission(alias = "notifications", strings = ["android.permission.POST_NOTIFICATIONS"])])
class DayflowAlarmPlugin : Plugin() {
    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback")
        } else call.resolve(JSObject().put("granted", true))
    }

    @PermissionCallback
    private fun notificationPermissionCallback(call: PluginCall) {
        call.resolve(JSObject().put("granted", getPermissionState("notifications") == PermissionState.GRANTED))
    }

    @PluginMethod
    fun requestExactAlarmAccess(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            if (!manager.canScheduleExactAlarms()) {
                val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply { data = Uri.parse("package:${context.packageName}") }
                activity.startActivity(intent)
                call.resolve(JSObject().put("granted", false).put("settingsOpened", true))
                return
            }
        }
        call.resolve(JSObject().put("granted", true))
    }

    @PluginMethod
    fun syncSchedules(call: PluginCall) {
        val schedules = call.getArray("schedules") ?: JSArray()
        val prefs = context.getSharedPreferences("dayflow_alarms", Context.MODE_PRIVATE)
        val old = prefs.getString("items", "[]") ?: "[]"
        try {
            val oldItems = JSONArray(old)
            for (i in 0 until oldItems.length()) cancel(oldItems.getJSONObject(i).optString("id"))
        } catch (_: Exception) {}
        val saved = JSONArray()
        val now = System.currentTimeMillis()
        for (i in 0 until schedules.length()) {
            val item = schedules.optJSONObject(i) ?: continue
            val id = item.optString("id")
            val at = item.optLong("at")
            if (id.isBlank() || at <= now) continue
            val clean = JSONObject().put("id", id).put("at", at)
                .put("title", item.optString("title", "DAYFLOW reminder"))
                .put("body", item.optString("body", "You have a scheduled reminder."))
            try {
                schedule(clean)
                saved.put(clean)
            } catch (_: SecurityException) {
                // Exact-alarm access is unavailable; skip this schedule safely.
            }
        }
        prefs.edit().putString("items", saved.toString()).apply()
        call.resolve(JSObject().put("scheduled", saved.length()))
    }

    private fun schedule(item: JSONObject) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, DayflowAlarmReceiver::class.java).apply {
            putExtra("id", item.optString("id")); putExtra("title", item.optString("title")); putExtra("body", item.optString("body"))
        }
        val pending = android.app.PendingIntent.getBroadcast(context, item.optString("id").hashCode(), intent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
        val at = item.optLong("at")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
        else manager.setExact(AlarmManager.RTC_WAKEUP, at, pending)
    }

    private fun cancel(id: String) {
        if (id.isBlank()) return
        val intent = Intent(context, DayflowAlarmReceiver::class.java)
        val pending = android.app.PendingIntent.getBroadcast(context, id.hashCode(), intent,
            android.app.PendingIntent.FLAG_NO_CREATE or android.app.PendingIntent.FLAG_IMMUTABLE)
        pending?.let { (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(it); it.cancel() }
    }

    companion object {
        fun reschedule(context: Context) {
            val prefs = context.getSharedPreferences("dayflow_alarms", Context.MODE_PRIVATE)
            val items = try { JSONArray(prefs.getString("items", "[]") ?: "[]") } catch (_: Exception) { JSONArray() }
            val now = System.currentTimeMillis(); val kept = JSONArray()
            val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            for (i in 0 until items.length()) {
                val item = items.optJSONObject(i) ?: continue
                if (item.optLong("at") <= now) continue
                val intent = Intent(context, DayflowAlarmReceiver::class.java).apply {
                    putExtra("id", item.optString("id")); putExtra("title", item.optString("title")); putExtra("body", item.optString("body"))
                }
                val pending = android.app.PendingIntent.getBroadcast(context, item.optString("id").hashCode(), intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
                try { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, item.optLong("at"), pending) else manager.setExact(AlarmManager.RTC_WAKEUP, item.optLong("at"), pending); kept.put(item) } catch (_: SecurityException) {}
            }
            prefs.edit().putString("items", kept.toString()).apply()
        }
    }
}
