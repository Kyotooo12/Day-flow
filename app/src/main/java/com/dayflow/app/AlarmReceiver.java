package com.dayflow.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String CHANNEL_ID = "dayflow_reminders";

    @Override public void onReceive(Context context, Intent intent) {
        createChannel(context);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");
        int id = intent.getIntExtra("id", 1000);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(context, id, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(context, CHANNEL_ID)
                : new Notification.Builder(context).setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)).setVibrate(new long[]{0,500,250,500});
        Notification notification = builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title == null ? "DAYFLOW reminder" : title)
                .setContentText(body == null ? "It's time for your planned activity." : body)
                .setStyle(new Notification.BigTextStyle().bigText(body == null ? "It's time for your planned activity." : body))
                .setContentIntent(content).setAutoCancel(true).setCategory(Notification.CATEGORY_ALARM)
                .setPriority(Notification.PRIORITY_MAX).build();
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) { try { nm.notify(id, notification); } catch (SecurityException ignored) { } }

        if (id == 1001 || id == 1002) {
            android.content.SharedPreferences p = context.getSharedPreferences("dayflow_alarm", Context.MODE_PRIVATE);
            int hour = p.getInt(id == 1001 ? "wakeHour" : "bedHour", id == 1001 ? 7 : 23);
            int minute = p.getInt(id == 1001 ? "wakeMinute" : "bedMinute", 0);
            String nextTitle = id == 1001 ? "DAYFLOW · Good morning" : "DAYFLOW · Wind down";
            String nextBody = id == 1001 ? "It's your planned wake-up time. Start gently." : "Your planned bedtime is here. Start getting ready to rest.";
            AlarmHelper.scheduleNextDaily(context, hour, minute, nextTitle, nextBody, id);
        }
    }

    public static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null || nm.getNotificationChannel(CHANNEL_ID) != null) return;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "DAYFLOW alarms & reminders", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Sleep schedule and routine reminders");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0,500,250,500});
            channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            nm.createNotificationChannel(channel);
        }
    }
}
