package com.dayflow.productivity

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
import com.dayflow.productivity.R

class DayflowAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "dayflow_alarms"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(channelId) == null) {
            val channel = NotificationChannel(channelId, "DAYFLOW alarms and reminders", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Scheduled routine reminders and wake-up alerts"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500, 250, 700)
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build())
            }
            manager.createNotificationChannel(channel)
        }
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val content = launch?.let { PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE) }
        val id = intent.getStringExtra("id") ?: "dayflow"
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(intent.getStringExtra("title") ?: "DAYFLOW")
            .setContentText(intent.getStringExtra("body") ?: "You have a reminder.")
            .setStyle(NotificationCompat.BigTextStyle().bigText(intent.getStringExtra("body") ?: "You have a reminder."))
            .setPriority(NotificationCompat.PRIORITY_MAX).setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true).setVibrate(longArrayOf(0, 500, 250, 500, 250, 700))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)).setContentIntent(content).build()
        manager.notify(id.hashCode(), notification)
        // Wake-up and wind-down alerts repeat daily. Routine activity reminders are one-shot.
        if (id == "sleep_wake" || id == "sleep_winddown") {
            val prefs = context.getSharedPreferences("dayflow_alarms", Context.MODE_PRIVATE)
            val items = try { org.json.JSONArray(prefs.getString("items", "[]") ?: "[]") } catch (_: Exception) { org.json.JSONArray() }
            val updated = org.json.JSONArray()
            for (i in 0 until items.length()) {
                val item = items.optJSONObject(i) ?: continue
                if (item.optString("id") == id) {
                    val nextAt = item.optLong("at") + 24L * 60L * 60L * 1000L
                    item.put("at", nextAt)
                    val alarmIntent = Intent(context, DayflowAlarmReceiver::class.java).apply {
                        putExtra("id", id); putExtra("title", item.optString("title")); putExtra("body", item.optString("body"))
                    }
                    val pending = PendingIntent.getBroadcast(context, id.hashCode(), alarmIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                    val alarms = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
                    try { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) alarms.setExactAndAllowWhileIdle(android.app.AlarmManager.RTC_WAKEUP, nextAt, pending) else alarms.setExact(android.app.AlarmManager.RTC_WAKEUP, nextAt, pending) } catch (_: SecurityException) {}
                }
                updated.put(item)
            }
            prefs.edit().putString("items", updated.toString()).apply()
        }
    }
}
