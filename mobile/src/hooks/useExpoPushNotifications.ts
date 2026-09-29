/**
 * useExpoPushNotifications.ts
 *
 * Safe wrapper around expo-notifications that gracefully no-ops in Expo Go.
 * Full OS notifications only work in a standalone/dev-client build.
 *
 * In Expo Go → all calls silently succeed without doing anything.
 * In a real build → full OS notification channel + permissions + scheduling.
 */

import { useCallback } from "react";
import Constants from "expo-constants";

/** True when running inside Expo Go (not a standalone build or dev client) */
const IS_EXPO_GO =
  Constants.appOwnership === "expo" ||
  (Constants.executionEnvironment !== "standalone" &&
    Constants.executionEnvironment !== "storeClient");

// Only import Notifications if we're NOT in Expo Go to avoid module errors
let Notifications: typeof import("expo-notifications") | null = null;
if (!IS_EXPO_GO) {
  try {
    // Dynamic require so bundler doesn't crash in Expo Go
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require("expo-notifications") as typeof import("expo-notifications");

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

  } catch {
    Notifications = null;
  }
}

async function _requestPermissions() {
  if (!Notifications) return;
  try {
    const { Platform } = await import("react-native");
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("staynex-default", {
        name: "StayNexa Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563EB",
        sound: "default",
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  } catch {
    // Ignore — Expo Go or permission denied
  }
}

// Kick off permission request eagerly (non-blocking)
void _requestPermissions();

export function useExpoPushNotifications() {
  /**
   * Fire an immediate local notification.
   * Silently no-ops in Expo Go or if permissions not granted.
   */
  const scheduleLocalNotification = useCallback(
    async (title: string, body: string, data?: Record<string, unknown>) => {
      if (!Notifications) return; // Expo Go — skip silently
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data ?? {},
            sound: "default",
          },
          trigger: null, // fire immediately
        });
      } catch (err) {
        console.warn("[PushNotif] Could not send notification:", err);
      }
    },
    []
  );

  return { scheduleLocalNotification };
}
