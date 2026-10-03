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
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import { Fee, Hostel, Renter } from "../types";
import { getName, getEmail, money, statusLabel } from "../utils/formatters";
import { Header, EmptyState } from "../components/common";

interface FeesScreenProps {
  fees: Fee[];
  renters: Renter[];
  activeRenters: Renter[];
  selectedHostel?: Hostel;
  showFeeModal: boolean;
  setShowFeeModal: (show: boolean) => void;
  feeRenterId: string;
  setFeeRenterId: (id: string) => void;
  feeMonth: string;
  setFeeMonth: (month: string) => void;
  feeAmount: string;
  setFeeAmount: (amount: string) => void;
  feeDueDate: string;
  setFeeDueDate: (date: string) => void;
  feeDescription: string;
  setFeeDescription: (desc: string) => void;
  feeSaving: boolean;
  feeRenterPickerOpen: boolean;
  setFeeRenterPickerOpen: (open: boolean) => void;
  onOpenFeeModal: () => void;
  onAddFee: () => void;
  onRefresh: () => void;
  onRemindFee?: (feeId: string, renterName: string) => void;
  onRemindAllUnpaid?: () => void;
  onDeleteFee?: (feeId: string) => void;
  // Recurring fee generation & overdue scan
  showGenerateModal?: boolean;
  setShowGenerateModal?: (v: boolean) => void;
  generateMonth?: string;
  setGenerateMonth?: (m: string) => void;
  generateDueDate?: string;
  setGenerateDueDate?: (d: string) => void;
  generateSaving?: boolean;
  onGenerateMonthlyFees?: () => void;
  onMarkOverdue?: () => void;
}

function FeeDetail({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.feeDetailItem}>
      <Text style={[styles.detailLabel, { color: colors.secondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function FeesScreen(props: FeesScreenProps) {
  const { colors, isDark } = useTheme();
  const {
    fees,
    renters,
    activeRenters,
    selectedHostel,
    showFeeModal,
    setShowFeeModal,
    feeRenterId,
    setFeeRenterId,
    feeMonth,
    setFeeMonth,
    feeAmount,
    setFeeAmount,
    feeDueDate,
    setFeeDueDate,
    feeDescription,
    setFeeDescription,
    feeSaving,
    feeRenterPickerOpen,
    setFeeRenterPickerOpen,
    onOpenFeeModal,
    onAddFee,
    onRefresh,
    onRemindFee,
    onRemindAllUnpaid,
    onDeleteFee,
    showGenerateModal = false,
    setShowGenerateModal,
    generateMonth = "",
    setGenerateMonth,
    generateDueDate = "",
    setGenerateDueDate,
    generateSaving = false,
    onGenerateMonthlyFees,
    onMarkOverdue,
  } = props;

  const feeRenter = renters.find((renter) => renter.id === feeRenterId);
  const unpaidCount = fees.filter((f) => String(f.status).toUpperCase() !== "PAID").length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header
          title="Fees"
          subtitle={selectedHostel?.name || "Select a hostel"}
          onRefresh={onRefresh}
        />
        <View style={[styles.infoBar, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={16} color={colors.primary} />
          <Text style={[styles.infoBarText, { color: colors.primaryDark }]}>
            Track resident rental dues, schedule recurring charges, and manage payments.
          </Text>
        </View>
        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fee records</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
              {fees.length} fee{fees.length === 1 ? "" : "s"} · {unpaidCount} unpaid
            </Text>
          </View>
          <View style={styles.headerBtnGroup}>
            {onGenerateMonthlyFees && (
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
                onPress={() => setShowGenerateModal?.(true)}
              >
                <Ionicons name="flash-outline" size={14} color={colors.primary} />
                <Text style={[styles.generateButtonText, { color: colors.primary }]}>Auto-Generate</Text>
              </TouchableOpacity>
            )}

            {unpaidCount > 0 ? (
              <TouchableOpacity
                style={[styles.remindAllButton, { backgroundColor: colors.warningLight, borderColor: colors.border }]}
                onPress={() => onRemindAllUnpaid?.()}
              >
                <Ionicons name="notifications-outline" size={14} color={colors.warning} />
                <Text style={[styles.remindAllButtonText, { color: colors.warning }]}>Remind ({unpaidCount})</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={[styles.smallPrimaryButton, { backgroundColor: colors.primary }]} onPress={onOpenFeeModal}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.smallPrimaryText}>Add Fee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {fees.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No fees found"
            description="Create the first fee for an active renter."
          />
        ) : (
          fees.map((fee) => {
            const renter = renters.find((item) => item.id === fee.renterId);
            const paid = Number(fee.paidAmount || 0);
            const remaining = Math.max(Number(fee.amount || 0) - paid, 0);
            const status = String(fee.status || "PENDING").toUpperCase();
            const isPaid = status === "PAID";
            const isOverdue = status === "OVERDUE";
            const isPartial = status === "PARTIALLY_PAID";
            const badgeBg = isPaid
              ? colors.successLight
              : isOverdue
                ? colors.dangerLight
                : isPartial
                  ? colors.warningLight
                  : colors.primaryLight;
            const badgeFg = isPaid
              ? colors.success
              : isOverdue
                ? colors.danger
                : isPartial
                  ? colors.warning
                  : colors.primary;

            return (
              <View key={fee.id} style={[styles.feeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.feeTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{renter ? getName(renter) : "Renter"}</Text>
                    <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
                      {fee.month} · Due {fee.dueDate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: badgeBg,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: badgeFg }]}>{statusLabel(status)}</Text>
                  </View>
                </View>

                <View style={[styles.feeDetailsRow, { borderTopColor: colors.border }]}>
                  <FeeDetail label="Amount" value={money(fee.amount)} colors={colors} />
                  <FeeDetail label="Paid" value={money(paid)} colors={colors} />
                  <FeeDetail label="Remaining" value={money(remaining)} colors={colors} />
                </View>

                <View style={styles.feeCardFooter}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    {fee.description ? (
                      <Text style={[styles.feeDescription, { color: colors.secondary }]}>{fee.description}</Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {remaining > 0 ? (
                      <TouchableOpacity
                        style={[styles.cardRemindBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
                        onPress={() => onRemindFee?.(fee.id, renter ? getName(renter) : "Renter")}
                      >
                        <Ionicons name="notifications-outline" size={14} color={colors.primary} />
                        <Text style={[styles.cardRemindBtnText, { color: colors.primary }]}>Remind</Text>
                      </TouchableOpacity>
                    ) : null}
                    {onDeleteFee ? (
                      <TouchableOpacity
                        style={[styles.cardDeleteBtn, { backgroundColor: colors.dangerLight }]}
                        onPress={() => onDeleteFee(fee.id)}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ADD FEE MODAL */}
      <Modal
        visible={showFeeModal}
        transparent
        animationType="slide"
        onRequestClose={() => !feeSaving && setShowFeeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Add Fee</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
                      Assign a fee schedule to an active resident.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: colors.grayFill }]}
                    onPress={() => setShowFeeModal(false)}
                  >
                    <Ionicons name="close" size={22} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Active renter *</Text>
                <TouchableOpacity
                  style={[styles.selector, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  onPress={() => setFeeRenterPickerOpen(true)}
                >
                  <Text style={[styles.selectorText, { color: feeRenter ? colors.text : colors.secondary }]}>
                    {feeRenter ? getName(feeRenter) : "Select active renter"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.secondary} />
                </TouchableOpacity>

                <Text style={[styles.label, { color: colors.text }]}>Month *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  value={feeMonth}
                  onChangeText={setFeeMonth}
                  placeholder="YYYY-MM"
                  placeholderTextColor={colors.secondary}
                />

                <Text style={[styles.label, { color: colors.text }]}>Amount *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  value={feeAmount}
                  onChangeText={setFeeAmount}
                  placeholder="Example: 8000"
                  placeholderTextColor={colors.secondary}
                  keyboardType="decimal-pad"
                />

                <Text style={[styles.label, { color: colors.text }]}>Due date *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                  value={feeDueDate}
                  onChangeText={setFeeDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.secondary}
                />

                <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text, minHeight: 90, textAlignVertical: "top" }]}
                  value={feeDescription}
                  onChangeText={setFeeDescription}
                  placeholder="Optional description"
                  placeholderTextColor={colors.secondary}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  disabled={feeSaving}
                  onPress={onAddFee}
                >
                  {feeSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Create Fee</Text>
                      <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ACTIVE RENTER PICKER MODAL */}
      <Modal
        visible={feeRenterPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFeeRenterPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select renter</Text>
                <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>Only active renters can receive a new fee.</Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.grayFill }]}
                onPress={() => setFeeRenterPickerOpen(false)}
              >
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            {activeRenters.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No active renters"
                description="Add a renter before creating a fee."
              />
            ) : (
              activeRenters.map((renter) => (
                <Pressable
                  key={renter.id}
                  style={[
                    styles.pickerRow,
                    { borderBottomColor: colors.border },
                    renter.id === feeRenterId && [styles.pickerSelected, { backgroundColor: colors.primaryLight }],
                  ]}
                  onPress={() => {
                    setFeeRenterId(renter.id);
                    setFeeRenterPickerOpen(false);
                  }}
                >
                  <View style={[styles.pickerIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{getName(renter)}</Text>
                    <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>{getEmail(renter) || "No email"}</Text>
                  </View>
                  {renter.id === feeRenterId ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </Pressable>
              ))
            )}
          </View>
        </View>
      </Modal>

      {/* AUTO-GENERATE MONTHLY RENT MODAL */}
      <Modal
        visible={showGenerateModal}
        transparent
        animationType="slide"
        onRequestClose={() => !generateSaving && setShowGenerateModal?.(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Auto-Generate Rent</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
                    Automatically create monthly rent fees for all active residents based on their assigned rent amount.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.grayFill }]}
                  onPress={() => !generateSaving && setShowGenerateModal?.(false)}
                >
                  <Ionicons name="close" size={22} color={colors.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Billing Month (YYYY-MM)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={generateMonth}
                onChangeText={setGenerateMonth}
                placeholder="2026-09"
                placeholderTextColor={colors.secondary}
              />

              <Text style={[styles.label, { color: colors.text }]}>Payment Due Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]}
                value={generateDueDate}
                onChangeText={setGenerateDueDate}
                placeholder="2026-09-10"
                placeholderTextColor={colors.secondary}
              />

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 22 }]}
                disabled={generateSaving}
                onPress={onGenerateMonthlyFees}
              >
                {generateSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={17} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Generate for All Residents</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 110 },
  actionRow: { marginTop: 6, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 12 },
  smallPrimaryButton: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12 },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 4 },
  feeCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 16, marginBottom: 12 },
  feeTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  feeDetailsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  feeDetailItem: { flex: 1 },
  detailLabel: { fontSize: 11, color: COLORS.secondary, fontWeight: "600" },
  detailValue: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  feeDescription: { marginTop: 8, fontSize: 12, color: COLORS.secondary, fontStyle: "italic" },
  itemTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  itemSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  modalKeyboard: { width: "100%" },
  modalCardLarge: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  modalSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayFill, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.text, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.background },
  selector: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.background },
  selectorText: { fontSize: 14, color: COLORS.text, fontWeight: "600" },
  primaryButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pickerCard: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36, maxHeight: "80%" },
  pickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerSelected: { backgroundColor: COLORS.primaryLight, borderRadius: 12, paddingHorizontal: 8 },
  pickerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 11 },
  headerBtnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  broadcastButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  broadcastButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 3,
  },
  remindAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  remindAllButtonText: {
    color: "#B45309",
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 3,
  },
  feeCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  cardRemindBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  cardRemindBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  generateButtonText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 11,
    marginLeft: 3,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 15,
    gap: 8,
  },
  infoBarText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primaryDark || "#1E40AF",
    fontWeight: "500",
  },
  cardDeleteBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
