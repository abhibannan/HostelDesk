import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Payment, Hostel, Renter } from "../types";
import { getName, money, statusLabel } from "../utils/formatters";
import { Header, EmptyState } from "../components/common";

interface PaymentsScreenProps {
  payments: Payment[];
  renters: Renter[];
  selectedHostel?: Hostel;
  paymentActionId: string;
  onReviewPayment: (paymentId: string, status: "APPROVED" | "REJECTED") => void;
  onRefresh: () => void;
}

function FeeDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function PaymentsScreen({
  payments,
  renters,
  selectedHostel,
  paymentActionId,
  onReviewPayment,
  onRefresh,
}: PaymentsScreenProps) {
  const [proofPreviewUrl, setProofPreviewUrl] = useState("");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.screenContent}
        showsVerticalScrollIndicator={false}
      >
        <Header
          title="Payment Proofs"
          subtitle={selectedHostel?.name || "Review payment screenshots"}
          onRefresh={onRefresh}
        />

        <View style={styles.paymentNotice}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={COLORS.primary}
          />
          <Text style={styles.paymentNoticeText}>
            Payments are completed outside StayNexa. Renters submit a payment screenshot as proof. Admins review the screenshot and approve or reject the proof.
          </Text>
        </View>

        {payments.length === 0 ? (
          <EmptyState
            icon="image-outline"
            title="No payment proofs"
            description="Submitted payment screenshots will appear here for admin review."
          />
        ) : (
          payments.map((payment) => {
            const status = String(payment.status || "APPROVED").toUpperCase();
            const displayStatus = status === "PENDING" ? "SUBMITTED" : status;
            const linkedRenter = renters.find((r) => r.id === payment.renterId);

            const statusStyle =
              displayStatus === "APPROVED"
                ? { bg: COLORS.successLight, fg: COLORS.success }
                : displayStatus === "REJECTED"
                  ? { bg: COLORS.dangerLight, fg: COLORS.danger }
                  : { bg: COLORS.warningLight, fg: COLORS.warning };

            return (
              <View key={payment.id} style={styles.paymentReviewCard}>
                <View style={styles.paymentReviewTop}>
                  <View style={styles.paymentReviewIcon}>
                    <Ionicons name="receipt-outline" size={21} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentReviewAmount}>
                      {money(Number(payment.amount || 0))}
                    </Text>
                    <Text style={styles.paymentReviewRenter}>
                      {linkedRenter ? getName(linkedRenter) : "Renter"}
                    </Text>
                  </View>
                  <View style={[styles.paymentStatusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.paymentStatusText, { color: statusStyle.fg }]}>
                      {statusLabel(displayStatus)}
                    </Text>
                  </View>
                </View>

                <View style={styles.paymentReviewMetaGrid}>
                  <FeeDetail label="Payment date" value={payment.paymentDate || "-"} />
                  <FeeDetail label="Submitted" value={payment.submittedAt || payment.createdAt || "-"} />
                  <FeeDetail label="Reference" value={payment.reference || "-"} />
                  <FeeDetail label="Fee" value={payment.feeId || "-"} />
                </View>

                {payment.proofUrl ? (
                  <TouchableOpacity
                    style={styles.proofImageContainer}
                    onPress={() => setProofPreviewUrl(payment.proofUrl || "")}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: payment.proofUrl }}
                      style={styles.proofImage}
                      resizeMode="cover"
                    />
                    <View style={styles.proofOverlay}>
                      <Ionicons name="expand-outline" size={22} color="#FFFFFF" />
                      <Text style={styles.proofOverlayText}>View proof</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noProofBox}>
                    <Ionicons name="image-outline" size={19} color={COLORS.secondary} />
                    <Text style={styles.noProofText}>No payment proof image attached.</Text>
                  </View>
                )}

                {payment.reviewNote ? (
                  <View style={styles.reviewNoteBox}>
                    <Text style={styles.reviewNoteLabel}>Admin note</Text>
                    <Text style={styles.reviewNoteText}>{payment.reviewNote}</Text>
                  </View>
                ) : null}

                {displayStatus === "SUBMITTED" ? (
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={[styles.reviewButton, styles.rejectButton]}
                      disabled={paymentActionId === payment.id}
                      onPress={() => onReviewPayment(payment.id, "REJECTED")}
                    >
                      {paymentActionId === payment.id ? (
                        <ActivityIndicator color={COLORS.danger} />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.reviewButton, styles.approveButton]}
                      disabled={paymentActionId === payment.id}
                      onPress={() => onReviewPayment(payment.id, "APPROVED")}
                    >
                      {paymentActionId === payment.id ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={Boolean(proofPreviewUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setProofPreviewUrl("")}
      >
        <View style={styles.proofViewerBackdrop}>
          <TouchableOpacity
            style={styles.proofViewerClose}
            onPress={() => setProofPreviewUrl("")}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {proofPreviewUrl ? (
            <Image
              source={{ uri: proofPreviewUrl }}
              style={styles.proofViewerImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 34 },
  paymentNotice: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  paymentNoticeText: { flex: 1, marginLeft: 9, color: COLORS.text, fontSize: 12, lineHeight: 18 },
  paymentStatusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  paymentStatusText: { fontSize: 10, fontWeight: "800" },
  paymentReviewCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
    backgroundColor: COLORS.card,
  },
  paymentReviewTop: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  paymentReviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  paymentReviewAmount: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  paymentReviewRenter: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  paymentReviewMetaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  detailLabel: { fontSize: 10, color: COLORS.secondary },
  detailValue: { marginTop: 3, fontSize: 13, fontWeight: "800", color: COLORS.text },
  proofImageContainer: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COLORS.muted,
    marginTop: 3,
    position: "relative",
  },
  proofImage: { width: "100%", height: "100%" },
  proofOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 9,
    backgroundColor: "rgba(15, 23, 42, 0.62)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  proofOverlayText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  noProofBox: {
    borderRadius: 13,
    backgroundColor: COLORS.muted,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  noProofText: { marginLeft: 8, color: COLORS.secondary, fontSize: 12 },
  reviewNoteBox: { marginTop: 12, borderRadius: 12, backgroundColor: COLORS.muted, padding: 11 },
  reviewNoteLabel: { fontSize: 10, color: COLORS.secondary, fontWeight: "800", textTransform: "uppercase" },
  reviewNoteText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: COLORS.text },
  reviewActions: { flexDirection: "row", gap: 9, marginTop: 14 },
  reviewButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  rejectButton: { borderWidth: 1, borderColor: "#FECACA", backgroundColor: COLORS.dangerLight },
  approveButton: { backgroundColor: COLORS.success },
  rejectButtonText: { fontSize: 13, fontWeight: "800", color: COLORS.danger },
  approveButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  proofViewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  proofViewerClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 58 : 32,
    right: 18,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  proofViewerImage: { width: "100%", height: "78%" },
});
