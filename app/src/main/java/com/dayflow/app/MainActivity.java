package com.dayflow.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import android.view.Window;

public class MainActivity extends Activity {
    private WebView webView;
    private static final int NOTIFICATION_REQUEST = 4101;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(17, 20, 32));
        getWindow().setNavigationBarColor(Color.rgb(17, 20, 32));
        AlarmReceiver.createChannel(this);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(17, 20, 32));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        webView.addJavascriptInterface(new DayflowBridge(this), "DayflowAndroid");
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private class DayflowBridge {
        private final Context context;
        DayflowBridge(Context c) { context = c; }

        @JavascriptInterface public void enableNotifications() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_REQUEST);
                if (Build.VERSION.SDK_INT >= 31) {
                    android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(ALARM_SERVICE);
                    if (am != null && !am.canScheduleExactAlarms()) {
                        try { startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName()))); }
                        catch (Exception ignored) { }
                    }
                }
            });
        }

        @JavascriptInterface public void scheduleSleepPlan(String wake, String bedtime, int windDown, boolean wakeEnabled) {
            try {
                String[] w = wake.split(":"); String[] b = bedtime.split(":");
                int wh = Integer.parseInt(w[0]), wm = Integer.parseInt(w[1]);
                int bh = Integer.parseInt(b[0]), bm = Integer.parseInt(b[1]);
                int windTotal = bh * 60 + bm - windDown;
                windTotal = (windTotal + 1440) % 1440;
                int dh = windTotal / 60, dm = windTotal % 60;
                android.content.SharedPreferences.Editor e = getSharedPreferences("dayflow_alarm", MODE_PRIVATE).edit();
                e.putBoolean("enabled", true).putBoolean("wakeEnabled", wakeEnabled).putBoolean("bedEnabled", windDown > 0)
                        .putInt("wakeHour", wh).putInt("wakeMinute", wm).putInt("bedHour", dh).putInt("bedMinute", dm).apply();
                if (wakeEnabled) AlarmHelper.scheduleNextDaily(context, wh, wm, "DAYFLOW · Good morning", "It's your planned wake-up time. Start gently.", 1001);
                else AlarmHelper.cancel(context, 1001);
                if (windDown > 0) AlarmHelper.scheduleNextDaily(context, dh, dm, "DAYFLOW · Wind down", "Your planned bedtime is coming. Start getting ready to rest.", 1002);
                else AlarmHelper.cancel(context, 1002);
            } catch (Exception ignored) { }
        }

        @JavascriptInterface public void scheduleAt(long timestamp, String title, String body, int id) {
            AlarmHelper.scheduleAt(context, timestamp, title, body, id);
        }
        @JavascriptInterface public void cancelReminder(int id) { AlarmHelper.cancel(context, id); }
    }

    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (webView != null) { webView.stopLoading(); webView.destroy(); }
        super.onDestroy();
    }
}
