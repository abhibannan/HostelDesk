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

function FeeDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.feeDetailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function FeesScreen(props: FeesScreenProps) {
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header
          title="Fees"
          subtitle={selectedHostel?.name || "Select a hostel"}
          onRefresh={onRefresh}
        />
        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Fee records</Text>
            <Text style={styles.sectionSubtitle}>
              {fees.length} fee{fees.length === 1 ? "" : "s"} · {unpaidCount} unpaid
            </Text>
          </View>
          <View style={styles.headerBtnGroup}>
            {onGenerateMonthlyFees && (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={() => setShowGenerateModal?.(true)}
              >
                <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
                <Text style={styles.generateButtonText}>Auto-Generate</Text>
              </TouchableOpacity>
            )}

            {unpaidCount > 0 ? (
              <TouchableOpacity
                style={styles.remindAllButton}
                onPress={() => onRemindAllUnpaid?.()}
              >
                <Ionicons name="notifications-outline" size={14} color="#B45309" />
                <Text style={styles.remindAllButtonText}>Remind ({unpaidCount})</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.smallPrimaryButton} onPress={onOpenFeeModal}>
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
            const color =
              status === "PAID"
                ? COLORS.success
                : status === "OVERDUE"
                  ? COLORS.danger
                  : status === "PARTIALLY_PAID"
                    ? COLORS.warning
                    : COLORS.primary;

            return (
              <View key={fee.id} style={styles.feeCard}>
                <View style={styles.feeTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{renter ? getName(renter) : "Renter"}</Text>
                    <Text style={styles.itemSubtitle}>
                      {fee.month} · Due {fee.dueDate}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          color === COLORS.success
                            ? COLORS.successLight
                            : color === COLORS.danger
                              ? COLORS.dangerLight
                              : color === COLORS.warning
                                ? COLORS.warningLight
                                : COLORS.primaryLight,
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color }]}>{statusLabel(status)}</Text>
                  </View>
                </View>

                <View style={styles.feeDetailsRow}>
                  <FeeDetail label="Amount" value={money(fee.amount)} />
                  <FeeDetail label="Paid" value={money(paid)} />
                  <FeeDetail label="Remaining" value={money(remaining)} />
                </View>

                <View style={styles.feeCardFooter}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    {fee.description ? (
                      <Text style={styles.feeDescription}>{fee.description}</Text>
                    ) : null}
                  </View>
                  {remaining > 0 ? (
                    <TouchableOpacity
                      style={styles.cardRemindBtn}
                      onPress={() => onRemindFee?.(fee.id, renter ? getName(renter) : "Renter")}
                    >
                      <Ionicons name="notifications-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.cardRemindBtnText}>Remind</Text>
                    </TouchableOpacity>
                  ) : null}
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
            <View style={styles.modalCardLarge}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Add Fee</Text>
                    <Text style={styles.modalSubtitle}>
                      Payment is intentionally not recorded here; this screen manages fee records only.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowFeeModal(false)}
                  >
                    <Ionicons name="close" size={22} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Active renter *</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setFeeRenterPickerOpen(true)}
                >
                  <Text style={[styles.selectorText, !feeRenter && { color: "#94A3B8" }]}>
                    {feeRenter ? getName(feeRenter) : "Select active renter"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                </TouchableOpacity>

                <Text style={styles.label}>Month *</Text>
                <TextInput
                  style={styles.input}
                  value={feeMonth}
                  onChangeText={setFeeMonth}
                  placeholder="YYYY-MM"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.label}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={feeAmount}
                  onChangeText={setFeeAmount}
                  placeholder="Example: 8000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Due date *</Text>
                <TextInput
                  style={styles.input}
                  value={feeDueDate}
                  onChangeText={setFeeDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]}
                  value={feeDescription}
                  onChangeText={setFeeDescription}
                  placeholder="Optional description"
                  placeholderTextColor="#94A3B8"
                  multiline
                />

                <TouchableOpacity
                  style={styles.primaryButton}
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
          <View style={styles.pickerCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select renter</Text>
                <Text style={styles.modalSubtitle}>Only active renters can receive a new fee.</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFeeRenterPickerOpen(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.secondary} />
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
                  style={[styles.pickerRow, renter.id === feeRenterId && styles.pickerSelected]}
                  onPress={() => {
                    setFeeRenterId(renter.id);
                    setFeeRenterPickerOpen(false);
                  }}
                >
                  <View style={styles.pickerIcon}>
                    <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{getName(renter)}</Text>
                    <Text style={styles.itemSubtitle}>{getEmail(renter) || "No email"}</Text>
                  </View>
                  {renter.id === feeRenterId ? (
                    <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
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
            <View style={styles.modalCardLarge}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.modalTitle}>Auto-Generate Rent</Text>
                  <Text style={styles.modalSubtitle}>
                    Automatically create monthly rent fees for all active residents based on their assigned rent amount.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => !generateSaving && setShowGenerateModal?.(false)}
                >
                  <Ionicons name="close" size={22} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Billing Month (YYYY-MM)</Text>
              <TextInput
                style={styles.input}
                value={generateMonth}
                onChangeText={setGenerateMonth}
                placeholder="2026-09"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Payment Due Date</Text>
              <TextInput
                style={styles.input}
                value={generateDueDate}
                onChangeText={setGenerateDueDate}
                placeholder="2026-09-10"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 22 }]}
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
  screenContent: { padding: 20, paddingBottom: 34 },
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
});
