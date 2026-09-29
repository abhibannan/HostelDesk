import { useState } from "react";
import { Alert } from "react-native";
import { Fee } from "../types";
import { currentMonth } from "../utils/formatters";

export interface FeeActionsCallbacks {
  selectedHostelId: string;
  fees: Fee[];
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

export function useFeeActions(cb: FeeActionsCallbacks) {
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeRenterId, setFeeRenterId] = useState("");
  const [feeMonth, setFeeMonth] = useState(currentMonth());
  const [feeAmount, setFeeAmount] = useState("");
  const [feeDueDate, setFeeDueDate] = useState("");
  const [feeDescription, setFeeDescription] = useState("");
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeRenterPickerOpen, setFeeRenterPickerOpen] = useState(false);

  // Automated monthly generation modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(currentMonth());
  const [generateDueDate, setGenerateDueDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-10`;
  });
  const [generateSaving, setGenerateSaving] = useState(false);

  function openFeeModal() {
    setFeeRenterId("");
    setFeeMonth(currentMonth());
    setFeeAmount("");
    setFeeDueDate("");
    setFeeDescription("");
    setShowFeeModal(true);
  }

  async function addFee() {
    if (!feeRenterId) return Alert.alert("Select renter", "Choose an active renter.");
    if (!/^\d{4}-\d{2}$/.test(feeMonth.trim())) {
      return Alert.alert("Invalid month", "Use YYYY-MM format.");
    }

    const existingFee = cb.fees.find(
      (fee) => fee.renterId === feeRenterId && fee.month === feeMonth.trim(),
    );
    if (existingFee) {
      return Alert.alert(
        "Fee already exists",
        "This renter already has a fee for the selected month.",
      );
    }

    const amount = Number(feeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return Alert.alert("Invalid amount", "Enter a positive fee amount.");
    }
    if (!feeDueDate.trim()) return Alert.alert("Due date required", "Enter the due date.");

    setFeeSaving(true);
    try {
      await cb.request(`/hostels/${cb.selectedHostelId}/fees`, {
        method: "POST",
        body: JSON.stringify({
          renterId: feeRenterId,
          month: feeMonth.trim(),
          amount,
          dueDate: feeDueDate.trim(),
          description: feeDescription.trim() || undefined,
        }),
      });
      setShowFeeModal(false);
      await cb.onRefresh();
      Alert.alert("Fee created", "The fee was created successfully.");
    } catch (err) {
      Alert.alert(
        "Unable to create fee",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setFeeSaving(false);
    }
  }

  async function generateMonthlyFees() {
    if (!generateMonth || !/^\d{4}-\d{2}$/.test(generateMonth.trim())) {
      return Alert.alert("Invalid Month", "Use YYYY-MM format (e.g. 2026-09).");
    }
    if (!generateDueDate.trim()) {
      return Alert.alert("Due Date Required", "Please specify the payment due date.");
    }

    setGenerateSaving(true);
    try {
      const res = await cb.request<{ message: string; generatedCount: number; skippedCount: number }>(
        `/hostels/${cb.selectedHostelId}/fees/generate-monthly`,
        {
          method: "POST",
          body: JSON.stringify({
            month: generateMonth.trim(),
            dueDate: generateDueDate.trim(),
          }),
        },
      );
      setShowGenerateModal(false);
      await cb.onRefresh();
      Alert.alert("Recurring Rent Generated", res.message || `Created ${res.generatedCount} monthly fees.`);
    } catch (err) {
      Alert.alert(
        "Failed to generate fees",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setGenerateSaving(false);
    }
  }

  async function markOverdueFees() {
    try {
      const res = await cb.request<{ message: string; overdueCount: number }>(
        `/hostels/${cb.selectedHostelId}/fees/mark-overdue`,
        { method: "POST" },
      );
      await cb.onRefresh();
      Alert.alert("Overdue Scan Completed", res.message || `Updated ${res.overdueCount} fees.`);
    } catch (err) {
      Alert.alert("Scan failed", err instanceof Error ? err.message : "Please try again.");
    }
  }

  return {
    showFeeModal, setShowFeeModal,
    feeRenterId, setFeeRenterId,
    feeMonth, setFeeMonth,
    feeAmount, setFeeAmount,
    feeDueDate, setFeeDueDate,
    feeDescription, setFeeDescription,
    feeSaving,
    feeRenterPickerOpen, setFeeRenterPickerOpen,
    openFeeModal,
    addFee,
    showGenerateModal, setShowGenerateModal,
    generateMonth, setGenerateMonth,
    generateDueDate, setGenerateDueDate,
    generateSaving,
    generateMonthlyFees,
    markOverdueFees,
  };
}
