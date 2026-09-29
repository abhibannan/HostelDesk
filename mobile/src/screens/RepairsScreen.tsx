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
import { Hostel, Renter, Repair, Room } from "../types";
import { Header, EmptyState } from "../components/common";
import { getName } from "../utils/formatters";

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
  onAddRepair: () => Promise<void>;
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
  newRenterId,
  setNewRenterId,
  newRoomId,
  setNewRoomId,
  onAddRepair,
  onRefresh,
  onBack,
}: RepairsScreenProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const filteredRepairs = repairs.filter((r) => {
    if (filterStatus === "ALL") return true;
    return (r.status || "SUBMITTED").toUpperCase() === filterStatus;
  });

  const countSubmitted = repairs.filter((r) => (r.status || "SUBMITTED") === "SUBMITTED").length;
  const countInProgress = repairs.filter((r) => r.status === "IN_PROGRESS").length;
  const countResolved = repairs.filter((r) => r.status === "RESOLVED").length;

  function getPriorityColor(priority?: string) {
    switch (priority) {
      case "URGENT":
        return { bg: COLORS.dangerLight, text: COLORS.danger, border: "#FECACA" };
      case "HIGH":
        return { bg: COLORS.orangeLight, text: COLORS.orange, border: "#FED7AA" };
      case "LOW":
        return { bg: COLORS.grayFill, text: COLORS.secondary, border: COLORS.border };
      default:
        return { bg: COLORS.primaryLight, text: COLORS.primary, border: "#BFDBFE" };
    }
  }

  function getStatusColor(status?: string) {
    switch (status) {
      case "RESOLVED":
        return { bg: COLORS.successLight, text: COLORS.success, border: "#BBF7D0", label: "Resolved" };
      case "IN_PROGRESS":
        return { bg: COLORS.purpleLight, text: COLORS.purple, border: "#DDD6FE", label: "In Progress" };
      case "CANCELLED":
        return { bg: COLORS.grayFill, text: COLORS.secondary, border: COLORS.border, label: "Cancelled" };
      default:
        return { bg: COLORS.warningLight, text: COLORS.warning, border: "#FDE68A", label: "Reported" };
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topNavRow}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Header
              title="Maintenance & Repairs"
              subtitle={selectedHostel?.name || "Manage room complaints & repairs"}
              onRefresh={onRefresh}
            />
          </View>
        </View>

        {/* Action Bar */}
        <View style={styles.actionRow}>
          <View>
            <Text style={styles.sectionTitle}>Repair Complaints</Text>
            <Text style={styles.sectionSubtitle}>
              {repairs.length} total • {countSubmitted} pending inspection
            </Text>
          </View>
          <TouchableOpacity
            style={styles.smallPrimaryButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={19} color="#FFFFFF" />
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
                filterStatus === item.key && styles.filterPillActive,
              ]}
              onPress={() => setFilterStatus(item.key)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterStatus === item.key && styles.filterPillTextActive,
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
                ? "No maintenance or repair requests registered in this hostel."
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
              <View key={repair.id} style={styles.repairCard}>
                {/* Header info */}
                <View style={styles.repairCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.repairTitle}>{repair.title}</Text>
                    <View style={styles.repairSubRow}>
                      <Ionicons name="person-outline" size={13} color={COLORS.secondary} />
                      <Text style={styles.repairSubText}>{renterName}</Text>
                      {room && (
                        <>
                          <Text style={styles.repairDot}>•</Text>
                          <Ionicons name="grid-outline" size={13} color={COLORS.secondary} />
                          <Text style={styles.repairSubText}>Room {room.roomNumber}</Text>
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

                {/* Description */}
                <Text style={styles.repairDescription}>{repair.description}</Text>

                {/* Admin notes if present */}
                {repair.adminNotes ? (
                  <View style={styles.adminNoteBox}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.adminNoteText}>
                      <Text style={{ fontWeight: "700" }}>Warden Note: </Text>
                      {repair.adminNotes}
                    </Text>
                  </View>
                ) : null}

                {/* Timestamp & actions */}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    {repair.createdAt ? new Date(repair.createdAt).toLocaleDateString() : ""}
                  </Text>
                  <View style={styles.footerActions}>
                    {(repair.status || "SUBMITTED") === "SUBMITTED" && (
                      <TouchableOpacity
                        style={styles.actionBtnOutline}
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
                        style={styles.actionBtnGreen}
                        onPress={() => onUpdateStatus(repair.id, "RESOLVED")}
                      >
                        <Ionicons name="checkmark-done-outline" size={14} color={COLORS.success} />
                        <Text style={[styles.actionBtnText, { color: COLORS.success }]}>
                          Resolve
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.manageBtn}
                      onPress={() => onOpenStatusModal(repair)}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={COLORS.secondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Status & Notes Modal ── */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Repair Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>{selectedRepair?.title}</Text>

            <Text style={styles.inputLabel}>Status</Text>
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
                    repairStatus === s.key && styles.statusChoiceActive,
                  ]}
                  onPress={() => setRepairStatus(s.key as any)}
                >
                  <Text
                    style={[
                      styles.statusChoiceText,
                      repairStatus === s.key && styles.statusChoiceTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Admin / Warden Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={adminNotes}
              onChangeText={setAdminNotes}
              placeholder="e.g. Electrician scheduled for 4 PM, parts replaced."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowStatusModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, repairSaving && styles.btnDisabled]}
                disabled={repairSaving}
                onPress={() => onUpdateStatus()}
              >
                {repairSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Update</Text>
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
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>File Maintenance Ticket</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Issue Title *</Text>
              <TextInput
                style={styles.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Water leak in washroom"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.inputLabel}>Details & Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Describe the repair issue..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.statusPickerRow}>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.statusChoice,
                      newPriority === p && styles.statusChoiceActive,
                    ]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text
                      style={[
                        styles.statusChoiceText,
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
                  style={styles.cancelBtn}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { fontSize: 13, color: COLORS.secondary, marginTop: 2 },
  smallPrimaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 5,
  },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  filterScroll: { marginBottom: 14 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.grayFill,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterPillText: { fontSize: 12, fontWeight: "600", color: COLORS.secondary },
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
  repairTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  repairSubRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  repairSubText: { fontSize: 12, color: COLORS.secondary, fontWeight: "500" },
  repairDot: { fontSize: 12, color: COLORS.secondary },
  badgeCol: { alignItems: "flex-end" },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  repairDescription: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 19,
    marginVertical: 6,
  },
  adminNoteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  adminNoteText: { flex: 1, fontSize: 12, color: COLORS.primaryDark, lineHeight: 17 },
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
  actionBtnText: { fontSize: 12, fontWeight: "700" },
  manageBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.grayFill,
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
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
});
