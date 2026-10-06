/**
 * backgroundNotificationTask.ts
 *
 * Registers a background task that processes incoming push notifications
 * even when the app is fully killed / not running.
 *
 * How it works:
 * - expo-notifications + expo-task-manager register a native headless task
 * - When a push notification arrives while the app is killed, the OS wakes
 *   up the JS engine just enough to run this task
 * - The task can update badge count, store data, etc.
 *
 * IMPORTANT: This file must be imported at the TOP LEVEL (index.ts / App.tsx)
 * before `registerRootComponent` so the task is registered before the app mounts.
 */

import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_NOTIFICATION_TASK = "STAYNEXA_BACKGROUND_NOTIFICATION";

/**
 * Define the background task that handles incoming notifications
 * when the app is killed or in background.
 *
 * This runs in a headless JS context — no React, no hooks, no UI.
 */
TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  ({ data, error }: TaskManager.TaskManagerTaskBody<{ notification: Notifications.Notification }>) => {
    if (error) {
      console.warn("[BackgroundNotif] Task error:", error);
      return;
    }

    if (data) {
      const { notification } = data;
      const content = notification?.request?.content;

      if (content) {
        console.log(
          "[BackgroundNotif] Received in background/killed state:",
          content.title,
          content.body,
        );

        // The OS will automatically display the notification because
        // the FCM payload includes a `notification` field.
        // This task handler is for any additional processing needed
        // (e.g., updating local storage, badge count, etc.)
      }
    }
  },
);

/**
 * Register the background notification task with expo-notifications.
 * This tells the system to wake up our JS engine when a push arrives.
 */
export async function registerBackgroundNotificationTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_NOTIFICATION_TASK,
    );

    if (!isRegistered) {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log("[BackgroundNotif] Background notification task registered ✓");
    }
  } catch (err) {
    // This will fail in Expo Go — only works in dev builds / standalone
    console.warn(
      "[BackgroundNotif] Could not register background task (expected in Expo Go):",
      err,
    );
  }
}
