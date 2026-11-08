package com.dayflow.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        android.content.SharedPreferences p = context.getSharedPreferences("dayflow_alarm", Context.MODE_PRIVATE);
        if (p.getBoolean("enabled", false)) {
            if (p.getBoolean("wakeEnabled", true))
                AlarmHelper.scheduleNextDaily(context, p.getInt("wakeHour", 7), p.getInt("wakeMinute", 0), "DAYFLOW · Good morning", "It's your planned wake-up time. Start gently.", 1001);
            if (p.getBoolean("bedEnabled", true))
                AlarmHelper.scheduleNextDaily(context, p.getInt("bedHour", 23), p.getInt("bedMinute", 0), "DAYFLOW · Wind down", "Your planned bedtime is here. Start getting ready to rest.", 1002);
        }
    }
}
