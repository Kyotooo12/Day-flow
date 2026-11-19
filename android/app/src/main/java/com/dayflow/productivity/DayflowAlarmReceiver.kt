package com.dayflow.productivity

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat

class DayflowAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "dayflow_alarms"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(channelId) == null) {
            val channel = NotificationChannel(channelId, "DAYFLOW alarms and reminders", NotificationManager.IMPORTANCE_HIGH)
            channel.description = "Scheduled routine reminders and wake-up alerts"
            channel.enableVibration(true)
            channel.vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 700)
            channel.setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
            )
            manager.createNotificationChannel(channel)
        }

        val id = intent.getStringExtra("id") ?: "dayflow"
        val title = intent.getStringExtra("title") ?: "DAYFLOW"
        val body = intent.getStringExtra("body") ?: "You have a reminder."
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val content = launch?.let {
            PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 500, 250, 500, 250, 700))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
            .setContentIntent(content)
            .build()
        manager.notify(id.hashCode(), notification)

        if (id == "sleep_wake" || id == "sleep_winddown") repeatSleepAlarm(context, id)
    }

    private fun repeatSleepAlarm(context: Context, id: String) {
        val prefs = context.getSharedPreferences("dayflow_alarms", Context.MODE_PRIVATE)
        val items = try { org.json.JSONArray(prefs.getString("items", "[]") ?: "[]") }
            catch (_: Exception) { org.json.JSONArray() }
        val updated = org.json.JSONArray()
        val now = System.currentTimeMillis()
        val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            if (item.optString("id") == id) {
                var nextAt = item.optLong("at") + 86400000L
                while (nextAt <= now) nextAt += 86400000L
                item.put("at", nextAt)
                val alarmIntent = Intent(context, DayflowAlarmReceiver::class.java).apply {
                    putExtra("id", id)
                    putExtra("title", item.optString("title"))
                    putExtra("body", item.optString("body"))
                }
                val pending = PendingIntent.getBroadcast(
                    context, id.hashCode(), alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarms.canScheduleExactAlarms()) {
                        // Exact-alarm permission is currently unavailable.
                    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextAt, pending)
                    } else {
                        alarms.setExact(AlarmManager.RTC_WAKEUP, nextAt, pending)
                    }
                } catch (_: SecurityException) { }
            }
            updated.put(item)
        }
        prefs.edit().putString("items", updated.toString()).apply()
    }
}
