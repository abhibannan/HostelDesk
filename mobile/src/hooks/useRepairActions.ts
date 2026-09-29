import { useState } from "react";
import { Alert } from "react-native";
import { Repair } from "../types";

export interface RepairActionsCallbacks {
  selectedHostelId: string;
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => Promise<void>;
}

export function useRepairActions(cb: RepairActionsCallbacks) {
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [repairStatus, setRepairStatus] = useState<"SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED">("IN_PROGRESS");
  const [adminNotes, setAdminNotes] = useState("");
  const [repairSaving, setRepairSaving] = useState(false);

  // New repair form
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [newRenterId, setNewRenterId] = useState("");
  const [newRoomId, setNewRoomId] = useState("");

  function openStatusModal(repair: Repair) {
    setSelectedRepair(repair);
    setRepairStatus(repair.status || "IN_PROGRESS");
    setAdminNotes(repair.adminNotes || "");
    setShowStatusModal(true);
  }

  async function updateRepairStatus(repairId?: string, overrideStatus?: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED", notes?: string) {
    const id = repairId || selectedRepair?.id;
    if (!id || !cb.selectedHostelId) return;

    const statusToSet = overrideStatus || repairStatus;
    const notesToSet = notes !== undefined ? notes : adminNotes;

    setRepairSaving(true);
    try {
      await cb.request(`/hostels/${cb.selectedHostelId}/repairs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: statusToSet,
          adminNotes: notesToSet.trim() || undefined,
        }),
      });
      setShowStatusModal(false);
      setSelectedRepair(null);
      await cb.onRefresh();
      Alert.alert("Success", `Repair marked as ${statusToSet.replace("_", " ")}.`);
    } catch (err) {
      Alert.alert(
        "Failed to update repair",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setRepairSaving(false);
    }
  }

  async function addRepair() {
    if (!newTitle.trim()) {
      return Alert.alert("Title required", "Please enter a repair title.");
    }
    if (!newDescription.trim()) {
      return Alert.alert("Description required", "Please enter the repair details.");
    }
    if (!cb.selectedHostelId) {
      return Alert.alert("Select Hostel", "Please select a hostel first.");
    }

    setRepairSaving(true);
    try {
      await cb.request(`/hostels/${cb.selectedHostelId}/repairs`, {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          priority: newPriority,
          renterId: newRenterId || undefined,
          roomId: newRoomId || undefined,
        }),
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("MEDIUM");
      setNewRenterId("");
      setNewRoomId("");
      await cb.onRefresh();
      Alert.alert("Created", "Repair ticket has been created.");
    } catch (err) {
      Alert.alert(
        "Failed to create repair",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setRepairSaving(false);
    }
  }

  return {
    selectedRepair,
    setSelectedRepair,
    showStatusModal,
    setShowStatusModal,
    showCreateModal,
    setShowCreateModal,
    repairStatus,
    setRepairStatus,
    adminNotes,
    setAdminNotes,
    repairSaving,
    openStatusModal,
    updateRepairStatus,
    newTitle,
    setNewTitle,
    newDescription,
    setNewDescription,
    newPriority,
    setNewPriority,
    newRenterId,
    setNewRenterId,
    newRoomId,
    setNewRoomId,
    addRepair,
  };
}
