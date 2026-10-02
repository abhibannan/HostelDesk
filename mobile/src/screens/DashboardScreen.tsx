import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dashboard, Hostel, Payment } from "../types";
import { money, statusLabel } from "../utils/formatters";
import { Header, StatCard, SectionTitle, EmptyState } from "../components/common";
import { DonutChart, BarChart } from "../components/charts";
import { COLORS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

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
  const { colors, isDark } = useTheme();

  const occupancyRate =
    dashboard.totalRooms > 0
      ? Math.round((dashboard.occupiedRooms / dashboard.totalRooms) * 100)
      : 0;

  const roomChart = [
    { label: "Occupied", value: dashboard.occupiedRooms, color: colors.primary },
    { label: "Available", value: dashboard.availableRooms, color: colors.success },
  ];

  const feeChart = [
    { label: "Paid", value: dashboard.paidFees, color: colors.success },
    { label: "Pending", value: dashboard.pendingFees, color: colors.primary },
    { label: "Partial", value: dashboard.partiallyPaidFees, color: colors.warning },
    { label: "Overdue", value: dashboard.overdueFees, color: colors.danger },
  ];

  const repairChart = [
    { label: "Submitted", value: dashboard.submittedRepairs, color: colors.primary },
    { label: "Progress", value: dashboard.inProgressRepairs, color: colors.warning },
    { label: "Resolved", value: dashboard.resolvedRepairs, color: colors.success },
    { label: "Cancelled", value: dashboard.cancelledRepairs, color: colors.secondary },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="Dashboard"
        subtitle="Live overview of your StayNexa operations."
        onRefresh={onRefresh}
      />

      {selectedHostel ? (
        <View style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.propertyIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="business-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.propertyLabel, { color: colors.secondary }]}>MANAGING HOSTEL</Text>
            <Text style={[styles.propertyName, { color: colors.text }]}>{selectedHostel.name}</Text>
            <Text style={[styles.propertyLocation, { color: colors.secondary }]}>
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
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartCardHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Occupancy distribution</Text>
            <Text style={[styles.chartSubtitle, { color: colors.secondary }]}>Occupied rooms versus available rooms</Text>
          </View>
          <View style={[styles.rateBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.rateValue, { color: colors.primary }]}>{occupancyRate}%</Text>
            <Text style={[styles.rateLabel, { color: colors.secondary }]}>occupied</Text>
          </View>
        </View>
        <DonutChart data={roomChart} centerText={`${occupancyRate}%`} centerSub="occupied" />
      </View>

      <SectionTitle title="Fee status" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Current fee collection</Text>
        <Text style={[styles.chartSubtitle, { color: colors.secondary }]}>Live totals from the backend</Text>
        <DonutChart data={feeChart} centerText={String(dashboard.totalFees)} centerSub="fees" />
        <View style={[styles.outstandingBox, { backgroundColor: colors.dangerLight }]}>
          <Text style={[styles.outstandingLabel, { color: colors.danger }]}>Outstanding amount</Text>
          <Text style={[styles.outstandingAmount, { color: colors.danger }]}>{money(dashboard.outstandingFees)}</Text>
        </View>
      </View>

      <SectionTitle title="Repair requests" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Repair status</Text>
        <Text style={[styles.chartSubtitle, { color: colors.secondary }]}>Current request workflow</Text>
        <DonutChart data={repairChart} centerText={String(dashboard.totalRepairRequests)} centerSub="requests" />
      </View>

      <SectionTitle title="Payment proof review" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Proof status</Text>
        <Text style={[styles.chartSubtitle, { color: colors.secondary }]}>
          Payments are made outside StayNexa; this dashboard reviews submitted proof.
        </Text>
        <DonutChart
          data={[
            { label: "Submitted", value: paymentProofStats.submitted, color: colors.warning },
            { label: "Approved", value: paymentProofStats.approved, color: colors.success },
            { label: "Rejected", value: paymentProofStats.rejected, color: colors.danger },
          ]}
          centerText={String(payments.length)}
          centerSub="proofs"
        />
      </View>

      <SectionTitle title="Approved payment activity" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>Approved payments by month</Text>
        <Text style={[styles.chartSubtitle, { color: colors.secondary }]}>Only approved payment proofs are included.</Text>
        {monthlyPaymentBars.some((item) => item.value > 0) ? (
          <BarChart
            data={monthlyPaymentBars.map((item) => ({
              label: item.label,
              value: Math.round(item.value),
              color: colors.primary,
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
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {recentPayments.length === 0 ? (
          <Text style={[styles.noDataText, { color: colors.secondary }]}>No payment proofs have been submitted.</Text>
        ) : (
          recentPayments.map((payment) => {
            const status = String(payment.status || "APPROVED").toUpperCase();
            const proofStatus =
              status === "SUBMITTED" || status === "PENDING" ? "SUBMITTED" : status;
            const statusStyle =
              proofStatus === "APPROVED"
                ? { bg: colors.successLight, fg: colors.success }
                : proofStatus === "REJECTED"
                  ? { bg: colors.dangerLight, fg: colors.danger }
                  : { bg: colors.warningLight, fg: colors.warning };

            return (
              <View key={payment.id} style={[styles.paymentRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.paymentIcon, { backgroundColor: colors.surfaceSecondary || colors.card }]}>
                  <Ionicons name="image-outline" size={19} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentAmount, { color: colors.text }]}>
                    {money(Number(payment.amount || 0))}
                  </Text>
                  <Text style={[styles.paymentMeta, { color: colors.secondary }]}>
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

      <View
        style={[
          styles.liveUpdateCard,
          {
            backgroundColor: isDark ? colors.card : colors.primaryLight,
            borderColor: isDark ? colors.border : "#BFDBFE",
          },
        ]}
      >
        <Ionicons name="sync-outline" size={19} color={colors.primary} />
        <Text style={[styles.liveUpdateText, { color: isDark ? colors.text : colors.primaryDark }]}>
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
