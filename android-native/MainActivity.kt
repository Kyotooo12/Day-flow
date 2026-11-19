package com.dayflow.productivity

import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        registerPlugin(DayflowAlarmPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
