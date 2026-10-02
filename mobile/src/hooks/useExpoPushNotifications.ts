import { useCallback, useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";

const isExpoGo =
  Constants.appOwnership === "expo" ||
  (Constants.executionEnvironment !== "standalone" &&
    Constants.executionEnvironment !== "storeClient");

let Notifications: typeof import("expo-notifications") | null = null;
if (!isExpoGo) {
  try {
    // Keep Expo Go usable while enabling real push delivery in development and release builds.
    Notifications = require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    Notifications = null;
  }
}

export function useExpoPushNotifications() {
  useEffect(() => {
    if (!Notifications) return;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  const getExpoPushToken = useCallback(async (): Promise<string | null> => {
    if (!Notifications) return null;

    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("staynexa", {
          name: "StayNexa",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#2563EB",
          sound: "default",
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      const permission = existing.status === "granted"
        ? existing
        : await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") return null;

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) return null;

      return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error) {
      console.warn("Unable to register for push notifications:", error);
      return null;
    }
  }, []);

  const scheduleLocalNotification = useCallback(
    async (title: string, body: string, data?: Record<string, unknown>) => {
      if (!Notifications) return;
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title, body, data: data ?? {}, sound: "default" },
          trigger: null,
        });
      } catch (error) {
        console.warn("Unable to show local notification:", error);
      }
    },
    [],
  );

  return { getExpoPushToken, scheduleLocalNotification };
}
