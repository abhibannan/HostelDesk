/**
 * useExpoPushNotifications.ts
 *
 * Handles:
 *  - Requesting notification permissions
 *  - Scheduling local (device-level) notifications so they appear in the OS notification bar
 *  - Listening for incoming notifications while the app is in the foreground
 */

import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Set foreground handler: show alert + play sound even when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useExpoPushNotifications() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Request permissions on first mount
  useEffect(() => {
    void requestPermissions();

    // Listen for incoming notifications in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Notification received while app is open — already displayed by handler above
      }
    );

    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (_response) => {
        // Could navigate to a specific screen here in the future
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  /** Request permission to send local notifications */
  async function requestPermissions() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("staynex-default", {
        name: "StayNexa Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563EB",
        sound: "default",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
  }

  /**
   * Schedule an immediate local notification that appears in the OS notification bar.
   */
  const scheduleLocalNotification = useCallback(
    async (title: string, body: string, data?: Record<string, unknown>) => {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: data ?? {},
            sound: "default",
          },
          trigger: null, // trigger immediately
        });
      } catch (err) {
        console.warn("[PushNotif] Failed to schedule local notification:", err);
      }
    },
    []
  );

  return { scheduleLocalNotification };
}
