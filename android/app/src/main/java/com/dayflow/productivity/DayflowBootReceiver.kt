package com.dayflow.productivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class DayflowBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            DayflowAlarmPlugin.reschedule(context)
        }
    }
}
