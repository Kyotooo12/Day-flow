package com.dayflow.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class AlarmHelper {
    private AlarmHelper() {}

    public static void cancel(Context context, int id) {
        Intent intent = new Intent(context, AlarmReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi != null) { ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE)).cancel(pi); pi.cancel(); }
    }

    public static void scheduleAt(Context context, long when, String title, String body, int id) {
        if (when <= System.currentTimeMillis()) return;
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("title", title);
        intent.putExtra("body", body);
        intent.putExtra("id", id);
        PendingIntent pi = PendingIntent.getBroadcast(context, id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager manager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (manager == null) return;
        if (Build.VERSION.SDK_INT >= 31 && manager.canScheduleExactAlarms()) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        } else if (Build.VERSION.SDK_INT >= 23) {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
        } else {
            manager.setExact(AlarmManager.RTC_WAKEUP, when, pi);
        }
    }

    public static void scheduleNextDaily(Context context, int hour, int minute, String title, String body, int id) {
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.set(java.util.Calendar.HOUR_OF_DAY, hour);
        cal.set(java.util.Calendar.MINUTE, minute);
        cal.set(java.util.Calendar.SECOND, 0);
        cal.set(java.util.Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) cal.add(java.util.Calendar.DAY_OF_YEAR, 1);
        scheduleAt(context, cal.getTimeInMillis(), title, body, id);
    }
}
