import { useState } from "react";
import { Alert, Platform } from "react-native";

export interface PaymentActionsCallbacks {
  selectedHostelId: string;
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

export function usePaymentActions(cb: PaymentActionsCallbacks) {
  const [paymentActionId, setPaymentActionId] = useState("");

  function reviewPayment(paymentId: string, status: "APPROVED" | "REJECTED", hostelId?: string) {
    const targetHostelId = hostelId || cb.selectedHostelId;
    if (!targetHostelId) {
      Alert.alert("Error", "Please select a hostel first.");
      return;
    }

    const action = status === "APPROVED" ? "approve" : "reject";

    const executeReview = async () => {
      setPaymentActionId(paymentId);
      try {
        await cb.request(
          `/hostels/${targetHostelId}/payments/${paymentId}/status`,
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
    };

    Alert.alert(
      `${action.charAt(0).toUpperCase()}${action.slice(1)} payment proof`,
      `Are you sure you want to ${action} this payment proof?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "APPROVED" ? "Approve" : "Reject",
          style: status === "APPROVED" ? "default" : "destructive",
          onPress: () => void executeReview(),
        },
      ],
    );
  }

  function deletePayment(paymentId: string, hostelId?: string) {
    const targetHostelId = hostelId || cb.selectedHostelId;
    if (!targetHostelId) {
      Alert.alert("Error", "Please select a hostel first.");
      return;
    }

    const executeDelete = async () => {
      setPaymentActionId(paymentId);
      try {
        await cb.request(
          `/hostels/${targetHostelId}/payments/${paymentId}`,
          { method: "DELETE" },
        );
        await cb.onRefresh();
        Alert.alert("Deleted", "Payment record deleted successfully.");
      } catch (err) {
        Alert.alert(
          "Unable to delete payment",
          err instanceof Error ? err.message : "Please try again.",
        );
      } finally {
        setPaymentActionId("");
      }
    };

    Alert.alert(
      "Delete Payment Proof",
      "Are you sure you want to permanently delete this payment proof record? If approved, fee balances will adjust automatically.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void executeDelete(),
        },
      ],
    );
  }

  return { paymentActionId, reviewPayment, deletePayment };
}
