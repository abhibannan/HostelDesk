import { Alert } from "react-native";

export interface NotificationActionsCallbacks {
  selectedHostelId: string;
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

export function useNotificationActions(cb: NotificationActionsCallbacks) {
  async function remindFee(feeId: string, renterName: string, customMessage?: string) {
    try {
      const res = await cb.request<{ message: string }>("/notifications/remind-fee", {
        method: "POST",
        body: JSON.stringify({ feeId, customMessage }),
      });
      Alert.alert(
        "Fee Reminder Sent",
        res.message || `Reminder successfully sent to ${renterName}.`,
      );
    } catch (err) {
      Alert.alert(
        "Failed to send reminder",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  function remindAllUnpaid() {
    if (!cb.selectedHostelId) {
      return Alert.alert("Select Hostel", "Please select a hostel first.");
    }
    Alert.alert(
      "Send Reminders to All Unpaid",
      "Send rent due reminders to all residents who currently have pending or overdue fees?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Reminders",
          onPress: async () => {
            try {
              const res = await cb.request<{ message: string; count: number }>(
                "/notifications/remind-all-unpaid",
                {
                  method: "POST",
                  body: JSON.stringify({ hostelId: cb.selectedHostelId }),
                },
              );
              Alert.alert(
                "Reminders Sent",
                res.message || `Reminders sent to ${res.count} residents.`,
              );
            } catch (err) {
              Alert.alert(
                "Failed to send reminders",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  async function sendBroadcast(
    title: string,
    message: string,
    type: string,
    scope: "CURRENT" | "ALL" = "CURRENT",
  ) {
    try {
      const targetHostelId = scope === "ALL" ? "ALL" : cb.selectedHostelId || "ALL";
      const res = await cb.request<{ message: string; count: number }>(
        "/notifications/broadcast",
        {
          method: "POST",
          body: JSON.stringify({
            hostelId: targetHostelId,
            title,
            message,
            type,
          }),
        },
      );
      Alert.alert(
        "Broadcast Sent",
        res.message || `Broadcast notification sent to ${res.count} residents.`,
      );
      await cb.onRefresh();
    } catch (err) {
      Alert.alert(
        "Failed to send broadcast",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  async function deleteNotification(id: string) {
    try {
      await cb.request(`/notifications/${id}`, {
        method: "DELETE",
      });
      await cb.onRefresh();
    } catch (err) {
      Alert.alert(
        "Failed to delete notification",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  async function clearAllNotifications() {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              const clearPath = cb.selectedHostelId
                ? `/notifications/me/clear-all?hostelId=${encodeURIComponent(cb.selectedHostelId)}`
                : "/notifications/me/clear-all";
              await cb.request(clearPath, {
                method: "DELETE",
              });
              await cb.onRefresh();
              Alert.alert("Cleared", "All notifications cleared.");
            } catch (err) {
              Alert.alert(
                "Failed to clear notifications",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  return { remindFee, remindAllUnpaid, sendBroadcast, deleteNotification, clearAllNotifications };
}
