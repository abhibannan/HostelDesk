import { useState } from "react";
import { Alert } from "react-native";
import { MaintenanceTask, Repair } from "../types";

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

  async function deleteRepair(repairId: string, title?: string) {
    if (!cb.selectedHostelId) return;
    Alert.alert(
      "Delete Repair Request",
      `Are you sure you want to permanently delete this repair request${title ? ` "${title}"` : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await cb.request(`/hostels/${cb.selectedHostelId}/repairs/${repairId}`, {
                method: "DELETE",
              });
              await cb.onRefresh();
              Alert.alert("Deleted", "Repair request deleted successfully.");
            } catch (err) {
              Alert.alert(
                "Failed to delete repair",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  // Repair Personnel Management
  const [repairPersons, setRepairPersons] = useState<import("../types").RepairPerson[]>([]);
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [personSaving, setPersonSaving] = useState(false);

  async function loadRepairPersons() {
    if (!cb.selectedHostelId) return;
    try {
      const res = await cb.request<{ repairPersons?: import("../types").RepairPerson[] }>(
        `/hostels/${cb.selectedHostelId}/repair-persons`,
      );
      setRepairPersons(res.repairPersons || []);
    } catch {
      // Quiet fail if offline
    }
  }

  async function addRepairPerson(params: {
    name: string;
    email: string;
    phone: string;
    specialty: string;
    password?: string;
  }) {
    if (!params.name.trim() || !params.email.trim() || !params.phone.trim()) {
      return Alert.alert("Missing Fields", "Name, email, and mobile number are required.");
    }
    if (!cb.selectedHostelId) {
      return Alert.alert("Select Hostel", "Please select a hostel first.");
    }

    setPersonSaving(true);
    try {
      await cb.request(`/hostels/${cb.selectedHostelId}/repair-persons`, {
        method: "POST",
        body: JSON.stringify({
          name: params.name.trim(),
          email: params.email.trim(),
          phone: params.phone.trim(),
          specialty: params.specialty || "General Maintenance",
          password: params.password?.trim() || "Repair@123",
        }),
      });
      setShowAddPersonModal(false);
      await loadRepairPersons();
      Alert.alert(
        "Repair Person Added",
        `${params.name} has been registered. They can now log in using either their Email or Mobile Number to access the Repairs Portal.`,
      );
    } catch (err) {
      Alert.alert("Unable to add technician", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setPersonSaving(false);
    }
  }

  async function removeRepairPerson(personId: string, name: string) {
    if (!cb.selectedHostelId) return;
    Alert.alert(
      "Remove Technician",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await cb.request(`/hostels/${cb.selectedHostelId}/repair-persons/${personId}`, {
                method: "DELETE",
              });
              await loadRepairPersons();
              Alert.alert("Removed", `${name} has been removed.`);
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Could not remove technician.");
            }
          },
        },
      ],
    );
  }

  // Maintenance Tasks (Preventative Servicing)
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>([]);
  const [showAddMaintenanceModal, setShowAddMaintenanceModal] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  async function loadMaintenanceTasks() {
    if (!cb.selectedHostelId) return;
    try {
      const res = await cb.request<{ maintenanceTasks?: MaintenanceTask[] }>(
        `/hostels/${cb.selectedHostelId}/maintenance-tasks`,
      );
      setMaintenanceTasks(res.maintenanceTasks || []);
    } catch {
      // Quiet fail if offline
    }
  }

  async function addMaintenanceTask(task: {
    title: string;
    description?: string;
    category?: string;
    frequency: "ONE_TIME" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL";
    scheduledDate: string;
    assignedTo?: string;
    assignedPersonName?: string;
    notes?: string;
  }) {
    if (!task.title.trim()) {
      return Alert.alert("Title Required", "Please enter a task title.");
    }
    if (!cb.selectedHostelId) {
      return Alert.alert("Select Hostel", "Please select a hostel first.");
    }

    setMaintenanceSaving(true);
    try {
      await cb.request(`/hostels/${cb.selectedHostelId}/maintenance-tasks`, {
        method: "POST",
        body: JSON.stringify(task),
      });
      setShowAddMaintenanceModal(false);
      await loadMaintenanceTasks();
      Alert.alert("Success", "Maintenance task scheduled.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setMaintenanceSaving(false);
    }
  }

  async function updateMaintenanceTaskStatus(
    taskId: string,
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED",
    notes?: string,
  ) {
    if (!cb.selectedHostelId) return;
    setMaintenanceSaving(true);
    try {
      await cb.request(`/hostels/${cb.selectedHostelId}/maintenance-tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(notes ? { notes } : {}) }),
      });
      await loadMaintenanceTasks();
      Alert.alert("Updated", `Maintenance task marked as ${status.replace("_", " ")}.`);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setMaintenanceSaving(false);
    }
  }

  async function deleteMaintenanceTask(taskId: string, title: string) {
    if (!cb.selectedHostelId) return;
    Alert.alert("Delete Task", `Remove maintenance task "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await cb.request(`/hostels/${cb.selectedHostelId}/maintenance-tasks/${taskId}`, {
              method: "DELETE",
            });
            await loadMaintenanceTasks();
            Alert.alert("Deleted", "Maintenance task removed.");
          } catch (err) {
            Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete task.");
          }
        },
      },
    ]);
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
    deleteRepair,
    repairPersons,
    showAddPersonModal,
    setShowAddPersonModal,
    personSaving,
    loadRepairPersons,
    addRepairPerson,
    removeRepairPerson,
    // Maintenance
    maintenanceTasks,
    showAddMaintenanceModal,
    setShowAddMaintenanceModal,
    maintenanceSaving,
    loadMaintenanceTasks,
    addMaintenanceTask,
    updateMaintenanceTaskStatus,
    deleteMaintenanceTask,
  };
}

