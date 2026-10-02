import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Hostel, MaintenanceTask, Renter, Repair, RepairPerson, Room } from "../types";
import { Header, EmptyState } from "../components/common";
import { getName } from "../utils/formatters";
import { useTheme } from "../contexts/ThemeContext";

interface RepairsScreenProps {
  repairs: Repair[];
  renters: Renter[];
  rooms: Room[];
  selectedHostel?: Hostel;
  showStatusModal: boolean;
  setShowStatusModal: (v: boolean) => void;
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  selectedRepair: Repair | null;
  repairStatus: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED";
  setRepairStatus: (s: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED") => void;
  adminNotes: string;
  setAdminNotes: (n: string) => void;
  repairSaving: boolean;
  onOpenStatusModal: (repair: Repair) => void;
  onUpdateStatus: (repairId?: string, overrideStatus?: "SUBMITTED" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED", notes?: string) => Promise<void>;
  // Create repair form
  newTitle: string;
  setNewTitle: (t: string) => void;
  newDescription: string;
  setNewDescription: (d: string) => void;
  newPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  setNewPriority: (p: "LOW" | "MEDIUM" | "HIGH" | "URGENT") => void;
  newRenterId: string;
  setNewRenterId: (id: string) => void;
  newRoomId: string;
  setNewRoomId: (id: string) => void;
  repairPersons?: RepairPerson[];
  showAddPersonModal?: boolean;
  setShowAddPersonModal?: (v: boolean) => void;
  personSaving?: boolean;
  onAddRepairPerson?: (data: { name: string; email: string; phone: string; specialty: string; password?: string }) => Promise<void>;
  onRemoveRepairPerson?: (personId: string, name: string) => Promise<void>;
  onLoadRepairPersons?: () => void;
  // Maintenance Tasks
  maintenanceTasks?: MaintenanceTask[];
  onAddMaintenanceTask?: (task: {
    title: string;
    description?: string;
    category?: string;
    frequency: "ONE_TIME" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL";
    scheduledDate: string;
    assignedTo?: string;
    assignedPersonName?: string;
    notes?: string;
  }) => Promise<void>;
  onUpdateMaintenanceTaskStatus?: (taskId: string, status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED", notes?: string) => Promise<void>;
  onDeleteMaintenanceTask?: (taskId: string, title: string) => Promise<void>;
  onLoadMaintenanceTasks?: () => void;
  maintenanceSaving?: boolean;
  onAddRepair: () => Promise<void>;
  onDeleteRepair?: (repairId: string, title?: string) => Promise<void> | void;
  onRefresh: () => void;
  onBack?: () => void;
}

export function RepairsScreen({
  repairs,
  renters,
  rooms,
  selectedHostel,
  showStatusModal,
  setShowStatusModal,
  showCreateModal,
  setShowCreateModal,
  selectedRepair,
  repairStatus,
  setRepairStatus,
  adminNotes,
  setAdminNotes,
  repairSaving,
  onOpenStatusModal,
  onUpdateStatus,
  newTitle,
  setNewTitle,
  newDescription,
  setNewDescription,
  newPriority,
  setNewPriority,
  repairPersons = [],
  showAddPersonModal = false,
  setShowAddPersonModal,
  personSaving = false,
  onAddRepairPerson,
  onRemoveRepairPerson,
  onLoadRepairPersons,
  maintenanceTasks = [],
  onAddMaintenanceTask,
  onUpdateMaintenanceTaskStatus,
  onDeleteMaintenanceTask,
  onLoadMaintenanceTasks,
  maintenanceSaving = false,
  onAddRepair,
  onDeleteRepair,
  onRefresh,
  onBack,
}: RepairsScreenProps) {
  const { colors, isDark } = useTheme();
  const [activeOption, setActiveOption] = useState<"menu" | "repairs" | "maintenance" | "personnel">("menu");
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [maintenanceFilter, setMaintenanceFilter] = useState<string>("ALL");

  // Local add repair person state
  const [localAddPersonModal, setLocalAddPersonModal] = useState(false);
  const [personName, setPersonName] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personPhone, setPersonPhone] = useState("");
  const [personSpecialty, setPersonSpecialty] = useState("General Maintenance");
  const [personPassword, setPersonPassword] = useState("Repair@123");

  // Local schedule maintenance task state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskCategory, setTaskCategory] = useState("General Upkeep");
  const [taskFrequency, setTaskFrequency] = useState<"ONE_TIME" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "BIANNUAL" | "ANNUAL">("MONTHLY");
  const [taskDate, setTaskDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taskAssignedId, setTaskAssignedId] = useState("");

  const isAddPersonVisible = showAddPersonModal || localAddPersonModal;
  const setAddPersonVisible = (v: boolean) => {
    setLocalAddPersonModal(v);
    setShowAddPersonModal?.(v);
  };

  const SPECIALTIES = [
    "General Maintenance",
    "Plumbing",
    "Electrical",
    "Carpentry",
    "Painting",
    "Appliance / AC",
    "Masonry",
  ];

  const MAINTENANCE_CATEGORIES = [
    "General Upkeep",
    "AC / HVAC Servicing",
    "Water Tank Cleaning",
    "Pest Control",
    "Electrical Inspection",
    "Fire Safety Check",
    "Deep Cleaning",
  ];

  const filteredRepairs = repairs.filter((r) => {
    if (filterStatus === "ALL") return true;
    return (r.status || "SUBMITTED").toUpperCase() === filterStatus;
  });

  const filteredMaintenance = maintenanceTasks.filter((m) => {
    if (maintenanceFilter === "ALL") return true;
    return (m.status || "SCHEDULED").toUpperCase() === maintenanceFilter;
  });

  const countSubmitted = repairs.filter((r) => (r.status || "SUBMITTED") === "SUBMITTED").length;
  const countInProgress = repairs.filter((r) => r.status === "IN_PROGRESS").length;
  const countResolved = repairs.filter((r) => r.status === "RESOLVED").length;

  const countScheduledMaint = maintenanceTasks.filter((m) => (m.status || "SCHEDULED") === "SCHEDULED").length;
  const countInProgressMaint = maintenanceTasks.filter((m) => m.status === "IN_PROGRESS").length;
  const countCompletedMaint = maintenanceTasks.filter((m) => m.status === "COMPLETED").length;

  function getPriorityColor(priority?: string) {
    switch (priority) {
      case "URGENT":
        return { bg: isDark ? "rgba(239,68,68,0.2)" : COLORS.dangerLight, text: COLORS.danger, border: isDark ? "rgba(239,68,68,0.35)" : "#FECACA" };
      case "HIGH":
        return { bg: isDark ? "rgba(249,115,22,0.2)" : COLORS.orangeLight, text: COLORS.orange, border: isDark ? "rgba(249,115,22,0.35)" : "#FED7AA" };
      case "LOW":
        return { bg: isDark ? colors.surfaceSecondary : COLORS.grayFill, text: colors.secondary, border: colors.border };
      default:
        return { bg: isDark ? "rgba(59,130,246,0.2)" : COLORS.primaryLight, text: COLORS.primary, border: isDark ? "rgba(59,130,246,0.35)" : "#BFDBFE" };
    }
  }

  function getStatusColor(status?: string) {
    switch (status) {
      case "RESOLVED":
      case "COMPLETED":
        return { bg: isDark ? "rgba(16,185,129,0.2)" : COLORS.successLight, text: COLORS.success, border: isDark ? "rgba(16,185,129,0.35)" : "#BBF7D0", label: "Resolved" };
      case "IN_PROGRESS":
        return { bg: isDark ? "rgba(139,92,246,0.2)" : COLORS.purpleLight, text: COLORS.purple, border: isDark ? "rgba(139,92,246,0.35)" : "#DDD6FE", label: "In Progress" };
      case "CANCELLED":
      case "SKIPPED":
        return { bg: isDark ? colors.surfaceSecondary : COLORS.grayFill, text: colors.secondary, border: colors.border, label: "Cancelled" };
      default:
        return { bg: isDark ? "rgba(245,158,11,0.2)" : COLORS.warningLight, text: COLORS.warning, border: isDark ? "rgba(245,158,11,0.35)" : "#FDE68A", label: "Scheduled" };
    }
  }

  async function handleAddPersonSubmit() {
    if (onAddRepairPerson) {
      await onAddRepairPerson({
        name: personName,
        email: personEmail,
        phone: personPhone,
        specialty: personSpecialty,
        password: personPassword,
      });
      setPersonName("");
      setPersonEmail("");
      setPersonPhone("");
      setPersonSpecialty("General Maintenance");
      setPersonPassword("Repair@123");
      setAddPersonVisible(false);
    }
  }

  async function handleScheduleTaskSubmit() {
    if (onAddMaintenanceTask) {
      const selectedPerson = repairPersons.find((p) => p.id === taskAssignedId);
      await onAddMaintenanceTask({
        title: taskTitle,
        description: taskDescription,
        category: taskCategory,
        frequency: taskFrequency,
        scheduledDate: taskDate,
        assignedTo: taskAssignedId || undefined,
        assignedPersonName: selectedPerson?.name || undefined,
      });
      setTaskTitle("");
      setTaskDescription("");
      setShowScheduleModal(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topNavRow}>
          {onBack && (
            <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Header
              title="Maintenance & Care"
              subtitle={selectedHostel?.name || "Repairs, routine maintenance & technicians"}
              onRefresh={onRefresh}
            />
          </View>
        </View>

        {/* ── Care & Operations Menu Hub (When in Menu Mode) ── */}
        {activeOption === "menu" ? (
          <View style={styles.menuContainer}>
            {/* Quick Operational Metrics */}
            <View style={[styles.kpiContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiLabel, { color: colors.secondary }]}>Open Repairs</Text>
                <Text style={[styles.kpiValue, { color: countSubmitted + countInProgress > 0 ? COLORS.danger : COLORS.success }]}>
                  {countSubmitted + countInProgress}
                </Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiLabel, { color: colors.secondary }]}>Maintenance</Text>
                <Text style={[styles.kpiValue, { color: countScheduledMaint > 0 ? COLORS.warning : colors.secondary }]}>
                  {countScheduledMaint}
                </Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiLabel, { color: colors.secondary }]}>Technicians</Text>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{repairPersons.length}</Text>
              </View>
            </View>

            <View style={styles.menuHeaderRow}>
              <Text style={[styles.menuHeaderTitle, { color: colors.text }]}>OPERATIONS & CARE MENU</Text>
              <Text style={[styles.menuHeaderSub, { color: colors.secondary }]}>Select an operational module or action</Text>
            </View>

            <View style={styles.menuCardsList}>
              {/* Option 1: Repairs */}
              <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setActiveOption("repairs")}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: isDark ? "rgba(239,68,68,0.18)" : COLORS.dangerLight }]}>
                  <Ionicons name="build-outline" size={22} color={COLORS.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuCardTitle, { color: colors.text }]}>Repair Complaints</Text>
                  <Text style={[styles.menuCardDesc, { color: colors.secondary }]}>
                    Resident tickets, breakdown fixes, plumbing & electrical
                  </Text>
                </View>
                <View style={[styles.menuCounterBadge, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : COLORS.dangerLight }]}>
                  <Text style={[styles.menuCounterBadgeText, { color: COLORS.danger }]}>{repairs.length} Tickets</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </TouchableOpacity>

              {/* Option 2: Maintenance */}
              <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setActiveOption("maintenance");
                  onLoadMaintenanceTasks?.();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: isDark ? "rgba(245,158,11,0.18)" : COLORS.warningLight }]}>
                  <Ionicons name="calendar-outline" size={22} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuCardTitle, { color: colors.text }]}>Scheduled Maintenance</Text>
                  <Text style={[styles.menuCardDesc, { color: colors.secondary }]}>
                    Routine servicing, water tank cleaning, pest control & checks
                  </Text>
                </View>
                <View style={[styles.menuCounterBadge, { backgroundColor: isDark ? "rgba(245,158,11,0.25)" : COLORS.warningLight }]}>
                  <Text style={[styles.menuCounterBadgeText, { color: COLORS.warning }]}>{maintenanceTasks.length} Tasks</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </TouchableOpacity>

              {/* Option 3: Personnel */}
              <TouchableOpacity
                style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setActiveOption("personnel");
                  onLoadRepairPersons?.();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: isDark ? "rgba(59,130,246,0.18)" : COLORS.primaryLight }]}>
                  <Ionicons name="people-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuCardTitle, { color: colors.text }]}>Technicians & Personnel</Text>
                  <Text style={[styles.menuCardDesc, { color: colors.secondary }]}>
                    Contact directory of electricians, plumbers & workers
                  </Text>
                </View>
                <View style={[styles.menuCounterBadge, { backgroundColor: isDark ? colors.surfaceSecondary : COLORS.grayFill }]}>
                  <Text style={[styles.menuCounterBadgeText, { color: colors.text }]}>{repairPersons.length} Staff</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </TouchableOpacity>

              {/* Quick Actions Section */}
              <Text style={[styles.menuSectionDividerText, { color: colors.secondary }]}>QUICK ACTIONS</Text>

              {/* Action 1: Log Repair */}
              <TouchableOpacity
                style={[styles.menuActionCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => { setShowCreateModal(true); setActiveOption("repairs"); }}
                activeOpacity={0.75}
              >
                <View style={[styles.menuActionIconBox, { backgroundColor: COLORS.dangerLight }]}>
                  <Ionicons name="add-circle" size={18} color={COLORS.danger} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.menuActionTitle, { color: colors.text }]}>Log Repair Complaint</Text>
                  <Text style={[styles.menuActionDesc, { color: colors.secondary }]}>
                    Create a new repair ticket for a room or resident
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </TouchableOpacity>

              {/* Action 2: Schedule Maintenance */}
              <TouchableOpacity
                style={[styles.menuActionCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setShowScheduleModal(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.menuActionIconBox, { backgroundColor: COLORS.warningLight }]}>
                  <Ionicons name="calendar" size={18} color={COLORS.warning} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.menuActionTitle, { color: colors.text }]}>Schedule Routine Maintenance</Text>
                  <Text style={[styles.menuActionDesc, { color: colors.secondary }]}>
                    Plan recurring servicing or preventive facility checks
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </TouchableOpacity>

              {/* Action 3: Add Technician */}
              <TouchableOpacity
                style={[styles.menuActionCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                onPress={() => setAddPersonVisible(true)}
                activeOpacity={0.75}
              >
                <View style={[styles.menuActionIconBox, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="person-add" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.menuActionTitle, { color: colors.text }]}>Register Technician</Text>
                  <Text style={[styles.menuActionDesc, { color: colors.secondary }]}>
                    Add an electrician, plumber or contractor profile
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── In-Section Top Navigation Bar (When an option is open) ── */
          <View style={[styles.menuActiveNavRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.menuBackToMenuBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => setActiveOption("menu")}
            >
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={[styles.menuBackToMenuText, { color: colors.primary }]}>Care Menu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOptionSelectorBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              onPress={() => setShowMenuSheet(true)}
            >
              <Ionicons name="options-outline" size={14} color={colors.text} />
              <Text style={[styles.menuOptionSelectorText, { color: colors.text }]} numberOfLines={1}>
                {activeOption === "repairs" && "Repairs"}
                {activeOption === "maintenance" && "Maintenance"}
                {activeOption === "personnel" && "Personnel"}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
           TAB 1: REPAIRS ONLY (Complaints & Breakage tickets)
           ───────────────────────────────────────────────────────────── */}
        {activeOption === "repairs" && (
          <View>
            <View style={styles.actionRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Repair Complaints</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
                  {repairs.length} tickets • {countSubmitted} pending inspection
                </Text>
              </View>
              <TouchableOpacity
                style={styles.smallPrimaryButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.smallPrimaryText}>New Ticket</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {[
                { key: "ALL", label: `All (${repairs.length})` },
                { key: "SUBMITTED", label: `Reported (${countSubmitted})` },
                { key: "IN_PROGRESS", label: `In Progress (${countInProgress})` },
                { key: "RESOLVED", label: `Resolved (${countResolved})` },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterPill,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    filterStatus === item.key && {
                      backgroundColor: isDark ? "rgba(59,130,246,0.2)" : COLORS.primaryLight,
                      borderColor: COLORS.primary,
                    },
                  ]}
                  onPress={() => setFilterStatus(item.key)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: colors.secondary },
                      filterStatus === item.key && { color: isDark ? "#60A5FA" : COLORS.primary, fontWeight: "700" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Repairs List */}
            {filteredRepairs.length === 0 ? (
              <EmptyState
                icon="construct-outline"
                title="No repair requests"
                description={
                  filterStatus === "ALL"
                    ? "No room breakdown complaints registered in this hostel."
                    : `No complaints found with status ${filterStatus.toLowerCase()}.`
                }
              />
            ) : (
              filteredRepairs.map((repair) => {
                const renter = renters.find((r) => r.id === repair.renterId);
                const renterName = renter ? getName(renter) : "Resident";
                const room = rooms.find((rm) => rm.id === (repair.roomId || renter?.roomId));
                const priorityStyle = getPriorityColor(repair.priority);
                const statusStyle = getStatusColor(repair.status);

                return (
                  <View key={repair.id} style={[styles.repairCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.repairCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.repairTitle, { color: colors.text }]}>{repair.title}</Text>
                        <View style={styles.repairSubRow}>
                          <Ionicons name="person-outline" size={13} color={colors.secondary} />
                          <Text style={[styles.repairSubText, { color: colors.secondary }]}>{renterName}</Text>
                          {room && (
                            <>
                              <Text style={[styles.repairDot, { color: colors.secondary }]}>•</Text>
                              <Ionicons name="grid-outline" size={13} color={colors.secondary} />
                              <Text style={[styles.repairSubText, { color: colors.secondary }]}>Room {room.roomNumber}</Text>
                            </>
                          )}
                        </View>
                      </View>
                      <View style={styles.badgeCol}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: priorityStyle.bg,
                              borderColor: priorityStyle.border,
                            },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: priorityStyle.text }]}>
                            {repair.priority || "MEDIUM"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: statusStyle.bg,
                              borderColor: statusStyle.border,
                              marginTop: 4,
                            },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.repairDescription, { color: colors.text }]}>{repair.description}</Text>

                    {repair.adminNotes ? (
                      <View style={[styles.adminNoteBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.primary} />
                        <Text style={[styles.adminNoteText, { color: colors.text }]}>
                          <Text style={{ fontWeight: "700" }}>Warden Note: </Text>
                          {repair.adminNotes}
                        </Text>
                      </View>
                    ) : null}

                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <Text style={[styles.dateText, { color: colors.secondary }]}>
                        {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : ""}
                      </Text>
                      <View style={styles.footerActions}>
                        {(repair.status || "SUBMITTED") === "SUBMITTED" && (
                          <TouchableOpacity
                            style={[styles.actionBtnOutline, isDark && { backgroundColor: "rgba(139,92,246,0.18)", borderColor: "rgba(139,92,246,0.35)" }]}
                            onPress={() => onUpdateStatus(repair.id, "IN_PROGRESS")}
                          >
                            <Ionicons name="play-outline" size={14} color={COLORS.purple} />
                            <Text style={[styles.actionBtnText, { color: COLORS.purple }]}>
                              Start Work
                            </Text>
                          </TouchableOpacity>
                        )}
                        {repair.status !== "RESOLVED" && (
                          <TouchableOpacity
                            style={[styles.actionBtnGreen, isDark && { backgroundColor: "rgba(16,185,129,0.18)", borderColor: "rgba(16,185,129,0.35)" }]}
                            onPress={() => onUpdateStatus(repair.id, "RESOLVED")}
                          >
                            <Ionicons name="checkmark-done-outline" size={14} color={COLORS.success} />
                            <Text style={[styles.actionBtnText, { color: COLORS.success }]}>
                              Resolve
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.manageBtn, { backgroundColor: colors.surfaceSecondary }]}
                          onPress={() => onOpenStatusModal(repair)}
                        >
                          <Ionicons name="ellipsis-horizontal" size={16} color={colors.secondary} />
                        </TouchableOpacity>
                        {onDeleteRepair ? (
                          <TouchableOpacity
                            style={[styles.cardDeleteBtn, isDark && { backgroundColor: "rgba(239,68,68,0.18)" }]}
                            onPress={() => onDeleteRepair(repair.id, repair.title)}
                          >
                            <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
           TAB 2: MAINTENANCE ONLY (Preventative & Scheduled Servicing)
           ───────────────────────────────────────────────────────────── */}
        {activeOption === "maintenance" && (
          <View>
            <View style={styles.actionRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Preventative Maintenance</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
                  {maintenanceTasks.length} cycles • {countScheduledMaint} scheduled
                </Text>
              </View>
              <TouchableOpacity
                style={styles.smallPrimaryButton}
                onPress={() => setShowScheduleModal(true)}
              >
                <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                <Text style={styles.smallPrimaryText}>Schedule Task</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {[
                { key: "ALL", label: `All (${maintenanceTasks.length})` },
                { key: "SCHEDULED", label: `Scheduled (${countScheduledMaint})` },
                { key: "IN_PROGRESS", label: `In Progress (${countInProgressMaint})` },
                { key: "COMPLETED", label: `Completed (${countCompletedMaint})` },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterPill,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    maintenanceFilter === item.key && {
                      backgroundColor: isDark ? "rgba(59,130,246,0.2)" : COLORS.primaryLight,
                      borderColor: COLORS.primary,
                    },
                  ]}
                  onPress={() => setMaintenanceFilter(item.key)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: colors.secondary },
                      maintenanceFilter === item.key && { color: isDark ? "#60A5FA" : COLORS.primary, fontWeight: "700" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredMaintenance.length === 0 ? (
              <EmptyState
                icon="calendar-outline"
                title="No maintenance scheduled"
                description="Keep your hostel running smoothly by scheduling recurring maintenance like AC filter checks, water tank cleaning, or pest control."
              />
            ) : (
              filteredMaintenance.map((task) => {
                const isCompleted = task.status === "COMPLETED";
                const isInProgress = task.status === "IN_PROGRESS";

                return (
                  <View key={task.id} style={[styles.repairCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.repairCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.repairTitle, { color: colors.text }]}>{task.title}</Text>
                        <View style={styles.repairSubRow}>
                          <Ionicons name="time-outline" size={13} color={colors.secondary} />
                          <Text style={[styles.repairSubText, { color: colors.secondary }]}>
                            Due: {task.scheduledDate}
                          </Text>
                          <Text style={[styles.repairDot, { color: colors.secondary }]}>•</Text>
                          <Ionicons name="sync-outline" size={13} color={colors.secondary} />
                          <Text style={[styles.repairSubText, { color: colors.secondary }]}>{task.frequency}</Text>
                        </View>
                      </View>
                      <View style={styles.badgeCol}>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: isDark ? "rgba(59,130,246,0.2)" : COLORS.primaryLight,
                              borderColor: isDark ? "rgba(59,130,246,0.35)" : "#BFDBFE",
                            },
                          ]}
                        >
                          <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                            {task.category || "General"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: isDark
                                ? isCompleted ? "rgba(16,185,129,0.2)" : isInProgress ? "rgba(139,92,246,0.2)" : "rgba(245,158,11,0.2)"
                                : isCompleted ? COLORS.successLight : isInProgress ? COLORS.purpleLight : COLORS.warningLight,
                              borderColor: isDark
                                ? isCompleted ? "rgba(16,185,129,0.35)" : isInProgress ? "rgba(139,92,246,0.35)" : "rgba(245,158,11,0.35)"
                                : isCompleted ? "#BBF7D0" : isInProgress ? "#DDD6FE" : "#FDE68A",
                              marginTop: 4,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color: isCompleted ? COLORS.success : isInProgress ? COLORS.purple : COLORS.warning,
                              },
                            ]}
                          >
                            {task.status || "SCHEDULED"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {task.description ? (
                      <Text style={[styles.repairDescription, { color: colors.text }]}>{task.description}</Text>
                    ) : null}

                    {task.assignedPersonName ? (
                      <View style={[styles.adminNoteBox, { backgroundColor: isDark ? colors.surfaceSecondary : "#F0FDF4", borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                        <Ionicons name="person" size={13} color={COLORS.success} />
                        <Text style={[styles.adminNoteText, { color: isDark ? colors.text : "#166534" }]}>
                          <Text style={{ fontWeight: "700" }}>Assigned Tech: </Text>
                          {task.assignedPersonName}
                        </Text>
                      </View>
                    ) : null}

                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        onPress={() => onDeleteMaintenanceTask?.(task.id, task.title)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                      >
                        <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                        <Text style={{ fontSize: 12, color: COLORS.danger, fontWeight: "600" }}>Remove</Text>
                      </TouchableOpacity>

                      <View style={styles.footerActions}>
                        {!isCompleted && !isInProgress && (
                          <TouchableOpacity
                            style={[styles.actionBtnOutline, isDark && { backgroundColor: "rgba(139,92,246,0.18)", borderColor: "rgba(139,92,246,0.35)" }]}
                            onPress={() => onUpdateMaintenanceTaskStatus?.(task.id, "IN_PROGRESS")}
                          >
                            <Ionicons name="play-outline" size={14} color={COLORS.purple} />
                            <Text style={[styles.actionBtnText, { color: COLORS.purple }]}>Start</Text>
                          </TouchableOpacity>
                        )}
                        {!isCompleted && (
                          <TouchableOpacity
                            style={[styles.actionBtnGreen, isDark && { backgroundColor: "rgba(16,185,129,0.18)", borderColor: "rgba(16,185,129,0.35)" }]}
                            onPress={() => onUpdateMaintenanceTaskStatus?.(task.id, "COMPLETED")}
                          >
                            <Ionicons name="checkmark-done-outline" size={14} color={COLORS.success} />
                            <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Complete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
           TAB 3: PERSONNEL ONLY (Technicians & Crew)
           ───────────────────────────────────────────────────────────── */}
        {activeOption === "personnel" && (
          <View>
            <View style={styles.actionRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Repair Personnel</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
                  {repairPersons.length} technicians registered for this hostel
                </Text>
              </View>
              <TouchableOpacity
                style={styles.smallPrimaryButton}
                onPress={() => setAddPersonVisible(true)}
              >
                <Ionicons name="person-add" size={17} color="#FFFFFF" />
                <Text style={styles.smallPrimaryText}>Add Technician</Text>
              </TouchableOpacity>
            </View>

            {repairPersons.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No repair personnel added"
                description="Add your plumbers, electricians, or carpenters so they can log in to view and resolve repair tickets."
              />
            ) : (
              repairPersons.map((p) => (
                <View key={p.id} style={[styles.personCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.personCardHeader}>
                    <View style={[styles.personAvatar, { backgroundColor: isDark ? colors.surfaceSecondary : COLORS.primaryLight }]}>
                      <Text style={styles.personAvatarText}>
                        {(p.name || "T").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.personName, { color: colors.text }]}>{p.name}</Text>
                      <View style={[styles.specialtyBadge, { backgroundColor: colors.surfaceSecondary }]}>
                        <Text style={[styles.specialtyText, { color: isDark ? "#60A5FA" : COLORS.primary }]}>
                          {p.specialty || "General Maintenance"}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRemoveRepairPerson?.(p.id, p.name)}
                      style={[styles.removeBtn, isDark && { backgroundColor: "rgba(239,68,68,0.18)" }]}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.personDetailsRow, { borderTopColor: colors.border }]}>
                    <View style={styles.detailItem}>
                      <Ionicons name="mail-outline" size={13} color={colors.secondary} />
                      <Text style={[styles.detailText, { color: colors.secondary }]}>{p.email}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="call-outline" size={13} color={colors.secondary} />
                      <Text style={[styles.detailText, { color: colors.secondary }]}>{p.phone}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Status & Notes Modal ── */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Update Repair Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.secondary }]}>{selectedRepair?.title}</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Status</Text>
            <View style={styles.statusPickerRow}>
              {[
                { key: "SUBMITTED", label: "Reported" },
                { key: "IN_PROGRESS", label: "In Progress" },
                { key: "RESOLVED", label: "Resolved" },
                { key: "CANCELLED", label: "Cancelled" },
              ].map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.statusChoice,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    repairStatus === s.key && styles.statusChoiceActive,
                  ]}
                  onPress={() => setRepairStatus(s.key as any)}
                >
                  <Text
                    style={[
                      styles.statusChoiceText,
                      { color: colors.secondary },
                      repairStatus === s.key && styles.statusChoiceTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Warden / Technician Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
              value={adminNotes}
              onChangeText={setAdminNotes}
              placeholder="e.g. Plumber inspected, parts ordered..."
              placeholderTextColor={colors.secondary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowStatusModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, repairSaving && styles.btnDisabled]}
                disabled={repairSaving}
                onPress={() => onUpdateStatus()}
              >
                {repairSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Create Repair Modal ── */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>File Repair Ticket</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Breakage / Issue Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Water leak in washroom"
                placeholderTextColor={colors.secondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Details & Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Describe what needs repair..."
                placeholderTextColor={colors.secondary}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Priority Level</Text>
              <View style={styles.statusPickerRow}>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.statusChoice,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      newPriority === p && styles.statusChoiceActive,
                    ]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text
                      style={[
                        styles.statusChoiceText,
                        { color: colors.secondary },
                        newPriority === p && styles.statusChoiceTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, repairSaving && styles.btnDisabled]}
                  disabled={repairSaving}
                  onPress={onAddRepair}
                >
                  {repairSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Submit Ticket</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Schedule Maintenance Modal ── */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Maintenance</Text>
                <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Task Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={taskTitle}
                onChangeText={setTaskTitle}
                placeholder="e.g. Overhead Tank Cleaning"
                placeholderTextColor={colors.secondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
              <View style={styles.statusPickerRow}>
                {MAINTENANCE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.statusChoice,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      taskCategory === cat && styles.statusChoiceActive,
                    ]}
                    onPress={() => setTaskCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.statusChoiceText,
                        { color: colors.secondary },
                        taskCategory === cat && styles.statusChoiceTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Frequency</Text>
              <View style={styles.statusPickerRow}>
                {(["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.statusChoice,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      taskFrequency === freq && styles.statusChoiceActive,
                    ]}
                    onPress={() => setTaskFrequency(freq)}
                  >
                    <Text
                      style={[
                        styles.statusChoiceText,
                        { color: colors.secondary },
                        taskFrequency === freq && styles.statusChoiceTextActive,
                      ]}
                    >
                      {freq.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Scheduled Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={taskDate}
                onChangeText={setTaskDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.secondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Assign Technician (Optional)</Text>
              <View style={styles.statusPickerRow}>
                <TouchableOpacity
                  style={[
                    styles.statusChoice,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                    !taskAssignedId && styles.statusChoiceActive,
                  ]}
                  onPress={() => setTaskAssignedId("")}
                >
                  <Text style={[styles.statusChoiceText, { color: colors.secondary }, !taskAssignedId && styles.statusChoiceTextActive]}>
                    Unassigned
                  </Text>
                </TouchableOpacity>
                {repairPersons.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.statusChoice,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      taskAssignedId === p.id && styles.statusChoiceActive,
                    ]}
                    onPress={() => setTaskAssignedId(p.id)}
                  >
                    <Text style={[styles.statusChoiceText, { color: colors.secondary }, taskAssignedId === p.id && styles.statusChoiceTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowScheduleModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, maintenanceSaving && styles.btnDisabled]}
                  disabled={maintenanceSaving}
                  onPress={handleScheduleTaskSubmit}
                >
                  {maintenanceSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Task</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Add Repair Person Modal ── */}
      <Modal visible={isAddPersonVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Repair Person</Text>
                <TouchableOpacity onPress={() => setAddPersonVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Technician Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={personName}
                onChangeText={setPersonName}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={colors.secondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Mobile Number * (Used for login)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={personPhone}
                onChangeText={setPersonPhone}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                placeholderTextColor={colors.secondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address * (Used for login)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={personEmail}
                onChangeText={setPersonEmail}
                placeholder="e.g. ramesh@repairs.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.secondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Trade / Specialty</Text>
              <View style={styles.statusPickerRow}>
                {SPECIALTIES.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    style={[
                      styles.statusChoice,
                      { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                      personSpecialty === spec && styles.statusChoiceActive,
                    ]}
                    onPress={() => setPersonSpecialty(spec)}
                  >
                    <Text
                      style={[
                        styles.statusChoiceText,
                        { color: colors.secondary },
                        personSpecialty === spec && styles.statusChoiceTextActive,
                      ]}
                    >
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Initial Password (Min 6 chars)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={personPassword}
                onChangeText={setPersonPassword}
                placeholder="Default: Repair@123"
                placeholderTextColor={colors.secondary}
                secureTextEntry
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setAddPersonVisible(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.secondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, personSaving && styles.btnDisabled]}
                  disabled={personSaving}
                  onPress={handleAddPersonSubmit}
                >
                  {personSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Technician</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 18, paddingBottom: 36 },
  topNavRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: COLORS.card,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.grayFill,
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  segmentBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoBarText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  smallPrimaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  filterScroll: { marginBottom: 12 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.grayFill,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterPillText: { fontSize: 11, fontWeight: "600", color: COLORS.secondary },
  filterPillTextActive: { color: COLORS.primary, fontWeight: "700" },
  repairCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  repairCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  repairTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  repairSubRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  repairSubText: { fontSize: 12, color: COLORS.secondary, fontWeight: "500" },
  repairDot: { fontSize: 12, color: COLORS.secondary },
  badgeCol: { alignItems: "flex-end" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  repairDescription: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginVertical: 6,
  },
  adminNoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 9,
    padding: 9,
    marginTop: 6,
    marginBottom: 4,
  },
  adminNoteText: { flex: 1, fontSize: 12, color: COLORS.primaryDark, lineHeight: 16 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateText: { fontSize: 11, color: COLORS.secondary },
  footerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: COLORS.purpleLight,
  },
  actionBtnGreen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: COLORS.successLight,
  },
  actionBtnText: { fontSize: 11, fontWeight: "700" },
  manageBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.grayFill,
  },
  personCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  personCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  personAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  personAvatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.primary,
  },
  personName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  specialtyBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.grayFill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
  },
  personDetailsRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.secondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalSub: { fontSize: 13, color: COLORS.secondary, marginBottom: 16 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: { minHeight: 70, textAlignVertical: "top" },
  statusPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 10,
  },
  statusChoice: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.grayFill,
  },
  statusChoiceActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  statusChoiceText: { fontSize: 12, fontWeight: "600", color: COLORS.secondary },
  statusChoiceTextActive: { color: COLORS.primary, fontWeight: "700" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.secondary },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  btnDisabled: { opacity: 0.6 },
  cardDeleteBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // Menu Hub Styles
  menuContainer: { marginTop: 14, marginBottom: 10 },
  menuHeaderRow: { marginBottom: 8 },
  menuHeaderTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5, marginBottom: 2 },
  menuHeaderSub: { fontSize: 12 },
  menuCardsList: { gap: 10 },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuCardTitle: { fontSize: 15, fontWeight: "700" },
  menuCardDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  menuCounterBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
  menuCounterBadgeText: { fontSize: 11, fontWeight: "700" },
  menuSectionDividerText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.5, marginTop: 14, marginBottom: 4 },
  menuActionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuActionIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuActionTitle: { fontSize: 14, fontWeight: "700" },
  menuActionDesc: { fontSize: 11, marginTop: 2 },
  menuActiveNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  menuBackToMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  menuBackToMenuText: { fontSize: 12, fontWeight: "700" },
  menuOptionSelectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  menuOptionSelectorText: { fontSize: 12, fontWeight: "700" },
  kpiContainer: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    alignItems: "center",
  },
  kpiItem: { flex: 1, alignItems: "center" },
  kpiLabel: { fontSize: 11, fontWeight: "600" },
  kpiValue: { fontSize: 20, fontWeight: "800", marginTop: 3 },
  kpiDivider: { width: 1, height: 34, marginHorizontal: 8 },
});
