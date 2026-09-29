import { Alert } from "react-native";

export interface NotificationActionsCallbacks {
  selectedHostelId: string;
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

export function useNotificationActions(cb: NotificationActionsCallbacks) {
  async function remindFee(feeId: string, renterName: string) {
    try {
      const res = await cb.request<{ message: string }>("/notifications/remind-fee", {
        method: "POST",
        body: JSON.stringify({ feeId }),
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

  async function sendBroadcast(title: string, message: string, type: string) {
    try {
      const res = await cb.request<{ message: string; count: number }>(
        "/notifications/broadcast",
        {
          method: "POST",
          body: JSON.stringify({
            hostelId: cb.selectedHostelId || "ALL",
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

  return { remindFee, remindAllUnpaid, sendBroadcast };
}
