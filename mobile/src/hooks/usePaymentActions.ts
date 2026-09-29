import { useState } from "react";
import { Alert } from "react-native";

export interface PaymentActionsCallbacks {
  selectedHostelId: string;
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

export function usePaymentActions(cb: PaymentActionsCallbacks) {
  const [paymentActionId, setPaymentActionId] = useState("");

  function reviewPayment(paymentId: string, status: "APPROVED" | "REJECTED") {
    if (!cb.selectedHostelId) return;

    const action = status === "APPROVED" ? "approve" : "reject";

    Alert.alert(
      `${action.charAt(0).toUpperCase()}${action.slice(1)} payment proof`,
      `Are you sure you want to ${action} this payment proof?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "APPROVED" ? "Approve" : "Reject",
          style: status === "APPROVED" ? "default" : "destructive",
          onPress: async () => {
            setPaymentActionId(paymentId);
            try {
              await cb.request(
                `/hostels/${cb.selectedHostelId}/payments/${paymentId}/status`,
                {
                  method: "PATCH",
                  body: JSON.stringify({ status }),
                },
              );
              await cb.onRefresh();
              Alert.alert("Updated", `Payment proof ${status.toLowerCase()}.`);
            } catch (err) {
              Alert.alert(
                "Unable to update payment",
                err instanceof Error ? err.message : "Please try again.",
              );
            } finally {
              setPaymentActionId("");
            }
          },
        },
      ],
    );
  }

  return { paymentActionId, reviewPayment };
}
