import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Dashboard, Hostel, Payment } from "../types";
import { money, statusLabel } from "../utils/formatters";
import { Header, StatCard, SectionTitle, EmptyState } from "../components/common";
import { DonutChart, BarChart } from "../components/charts";

interface DashboardScreenProps {
  dashboard: Dashboard;
  selectedHostel?: Hostel;
  payments: Payment[];
  paymentProofStats: { submitted: number; approved: number; rejected: number };
  recentPayments: Payment[];
  monthlyPaymentBars: { key: string; label: string; value: number }[];
  onRefresh: () => void;
}

export function DashboardScreen({
  dashboard,
  selectedHostel,
  payments,
  paymentProofStats,
  recentPayments,
  monthlyPaymentBars,
  onRefresh,
}: DashboardScreenProps) {
  const occupancyRate =
    dashboard.totalRooms > 0
      ? Math.round((dashboard.occupiedRooms / dashboard.totalRooms) * 100)
      : 0;

  const roomChart = [
    { label: "Occupied", value: dashboard.occupiedRooms, color: COLORS.primary },
    { label: "Available", value: dashboard.availableRooms, color: COLORS.success },
  ];

  const feeChart = [
    { label: "Paid", value: dashboard.paidFees, color: COLORS.success },
    { label: "Pending", value: dashboard.pendingFees, color: COLORS.primary },
    { label: "Partial", value: dashboard.partiallyPaidFees, color: COLORS.warning },
    { label: "Overdue", value: dashboard.overdueFees, color: COLORS.danger },
  ];

  const repairChart = [
    { label: "Submitted", value: dashboard.submittedRepairs, color: COLORS.primary },
    { label: "Progress", value: dashboard.inProgressRepairs, color: COLORS.warning },
    { label: "Resolved", value: dashboard.resolvedRepairs, color: COLORS.success },
    { label: "Cancelled", value: dashboard.cancelledRepairs, color: COLORS.secondary },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="Dashboard"
        subtitle="Live overview of your StayNexa operations."
        onRefresh={onRefresh}
      />

      {selectedHostel ? (
        <View style={styles.propertyCard}>
          <View style={styles.propertyIcon}>
            <Ionicons name="business-outline" size={22} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.propertyLabel}>MANAGING HOSTEL</Text>
            <Text style={styles.propertyName}>{selectedHostel.name}</Text>
            <Text style={styles.propertyLocation}>
              {selectedHostel.city || ""}
              {selectedHostel.city && selectedHostel.state ? ", " : ""}
              {selectedHostel.state || ""}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.statsGrid}>
        <StatCard title="Total Rooms" value={dashboard.totalRooms} icon="grid-outline" tone="blue" />
        <StatCard title="Available Rooms" value={dashboard.availableRooms} icon="checkmark-circle-outline" tone="green" />
        <StatCard title="Occupied Rooms" value={dashboard.occupiedRooms} icon="people-outline" tone="blue" />
        <StatCard title="Active Renters" value={dashboard.activeRenters} icon="person-outline" tone="orange" />
        <StatCard title="Outstanding Fees" value={money(dashboard.outstandingFees)} icon="wallet-outline" tone="red" />
        <StatCard title="Payments" value={dashboard.totalPayments} icon="card-outline" tone="purple" />
      </View>

      <SectionTitle title="Room occupancy" />
      <View style={styles.chartCard}>
        <View style={styles.chartCardHeader}>
          <View>
            <Text style={styles.chartTitle}>Occupancy distribution</Text>
            <Text style={styles.chartSubtitle}>Occupied rooms versus available rooms</Text>
          </View>
          <View style={styles.rateBadge}>
            <Text style={styles.rateValue}>{occupancyRate}%</Text>
            <Text style={styles.rateLabel}>occupied</Text>
          </View>
        </View>
        <DonutChart data={roomChart} centerText={`${occupancyRate}%`} centerSub="occupied" />
      </View>

      <SectionTitle title="Fee status" />
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Current fee collection</Text>
        <Text style={styles.chartSubtitle}>Live totals from the backend</Text>
        <DonutChart data={feeChart} centerText={String(dashboard.totalFees)} centerSub="fees" />
        <View style={styles.outstandingBox}>
          <Text style={styles.outstandingLabel}>Outstanding amount</Text>
          <Text style={styles.outstandingAmount}>{money(dashboard.outstandingFees)}</Text>
        </View>
      </View>

      <SectionTitle title="Repair requests" />
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Repair status</Text>
        <Text style={styles.chartSubtitle}>Current request workflow</Text>
        <DonutChart data={repairChart} centerText={String(dashboard.totalRepairRequests)} centerSub="requests" />
      </View>

      <SectionTitle title="Payment proof review" />
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Proof status</Text>
        <Text style={styles.chartSubtitle}>
          Payments are made outside StayNexa; this dashboard reviews submitted proof.
        </Text>
        <DonutChart
          data={[
            { label: "Submitted", value: paymentProofStats.submitted, color: COLORS.warning },
            { label: "Approved", value: paymentProofStats.approved, color: COLORS.success },
            { label: "Rejected", value: paymentProofStats.rejected, color: COLORS.danger },
          ]}
          centerText={String(payments.length)}
          centerSub="proofs"
        />
      </View>

      <SectionTitle title="Approved payment activity" />
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Approved payments by month</Text>
        <Text style={styles.chartSubtitle}>Only approved payment proofs are included.</Text>
        {monthlyPaymentBars.some((item) => item.value > 0) ? (
          <BarChart
            data={monthlyPaymentBars.map((item) => ({
              label: item.label,
              value: Math.round(item.value),
              color: COLORS.primary,
            }))}
          />
        ) : (
          <EmptyState
            icon="bar-chart-outline"
            title="No approved payment activity"
            description="Approved payment proofs will appear here."
          />
        )}
      </View>

      <SectionTitle title="Recent payment proofs" />
      <View style={styles.chartCard}>
        {recentPayments.length === 0 ? (
          <Text style={styles.noDataText}>No payment proofs have been submitted.</Text>
        ) : (
          recentPayments.map((payment) => {
            const status = String(payment.status || "APPROVED").toUpperCase();
            const proofStatus =
              status === "SUBMITTED" || status === "PENDING" ? "SUBMITTED" : status;
            const statusStyle =
              proofStatus === "APPROVED"
                ? { bg: COLORS.successLight, fg: COLORS.success }
                : proofStatus === "REJECTED"
                  ? { bg: COLORS.dangerLight, fg: COLORS.danger }
                  : { bg: COLORS.warningLight, fg: COLORS.warning };

            return (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentIcon}>
                  <Ionicons name="image-outline" size={19} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentAmount}>
                    {money(Number(payment.amount || 0))}
                  </Text>
                  <Text style={styles.paymentMeta}>
                    {payment.paymentDate || payment.submittedAt || payment.createdAt || "-"}
                  </Text>
                </View>
                <View style={[styles.paymentStatusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.paymentStatusText, { color: statusStyle.fg }]}>
                    {statusLabel(proofStatus)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.liveUpdateCard}>
        <Ionicons name="sync-outline" size={19} color={COLORS.primary} />
        <Text style={styles.liveUpdateText}>
          Dashboard auto-refreshes every 4 seconds and also refreshes immediately after changes.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 34 },
  propertyCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  propertyIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  propertyLabel: { fontSize: 10, fontWeight: "800", color: COLORS.secondary, letterSpacing: 1 },
  propertyName: { marginTop: 4, fontSize: 16, fontWeight: "800", color: COLORS.text },
  propertyLocation: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  chartCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginBottom: 3 },
  chartCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  chartTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  chartSubtitle: { marginTop: 4, fontSize: 12, color: COLORS.secondary },
  rateBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 13, paddingVertical: 7, paddingHorizontal: 10, alignItems: "center" },
  rateValue: { color: COLORS.primary, fontSize: 16, fontWeight: "800" },
  rateLabel: { color: COLORS.secondary, fontSize: 9, marginTop: 1 },
  outstandingBox: { borderRadius: 13, backgroundColor: COLORS.dangerLight, padding: 12, marginTop: 7 },
  outstandingLabel: { fontSize: 11, color: COLORS.danger },
  outstandingAmount: { marginTop: 3, fontSize: 18, fontWeight: "800", color: COLORS.danger },
  noDataText: { color: COLORS.secondary, fontSize: 13, lineHeight: 20, paddingVertical: 10 },
  paymentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paymentIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 10 },
  paymentAmount: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  paymentMeta: { marginTop: 3, fontSize: 11, color: COLORS.secondary },
  paymentStatusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  paymentStatusText: { fontSize: 10, fontWeight: "800" },
  liveUpdateCard: {
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  liveUpdateText: { flex: 1, marginLeft: 10, color: COLORS.primaryDark, fontSize: 12, lineHeight: 18 },
});
