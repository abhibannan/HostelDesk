import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dashboard, Fee, Hostel, Payment, Renter, Tab } from "../types";
import { money, statusLabel } from "../utils/formatters";
import { Header, StatCard, SectionTitle, EmptyState } from "../components/common";
import { DonutChart, BarChart } from "../components/charts";
import { COLORS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DashboardScreenProps {
  dashboard: Dashboard;
  selectedHostel?: Hostel;
  payments: Payment[];
  fees?: Fee[];
  renters?: Renter[];
  paymentProofStats: { submitted: number; approved: number; rejected: number };
  recentPayments: Payment[];
  monthlyPaymentBars: { key: string; label: string; value: number }[];
  onRefresh: () => void;
  onNavigate?: (page: Tab) => void;
  onNavigateToExpenses?: () => void;
}

export function DashboardScreen({
  dashboard,
  selectedHostel,
  payments,
  fees = [],
  renters = [],
  paymentProofStats,
  recentPayments,
  monthlyPaymentBars,
  onRefresh,
  onNavigate,
  onNavigateToExpenses,
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

  // 4 Top Hero Action Cards (MakeMyTrip style)
  const heroActions = [
    {
      id: "rooms",
      title: "Rooms",
      icon: "bed-outline" as const,
      color: colors.primary,
      bg: isDark ? "#1E1B4B" : "#EEF2FF",
      onPress: () => onNavigate?.("rooms"),
    },
    {
      id: "renters",
      title: "Renters",
      icon: "people-outline" as const,
      color: "#059669",
      bg: isDark ? "#064E3B" : "#ECFDF5",
      onPress: () => onNavigate?.("renters"),
    },
    {
      id: "payments",
      title: "Payments",
      icon: "card-outline" as const,
      color: "#D97706",
      bg: isDark ? "#451A03" : "#FEF3C7",
      onPress: () => onNavigate?.("payments"),
    },
    {
      id: "repairs",
      title: "Repairs",
      icon: "construct-outline" as const,
      color: "#E11D48",
      bg: isDark ? "#4C0519" : "#FFE4E6",
      onPress: () => onNavigate?.("repairs"),
    },
  ];

  // 4 Core Module Services: Distinct, high-utility modules with zero duplicate routes
  const baseServices = [
    {
      id: "hostels",
      title: "Properties",
      icon: "business-outline" as const,
      color: "#4F46E5",
      bg: isDark ? "#1E1B4B" : "#EEF2FF",
      onPress: () => onNavigate?.("hostels"),
    },
    {
      id: "notices",
      title: "Notices",
      icon: "megaphone-outline" as const,
      color: "#D97706",
      bg: isDark ? "#451A03" : "#FEF3C7",
      onPress: () => onNavigate?.("notifications"),
    },
    {
      id: "expenses",
      title: "Expenses",
      icon: "pie-chart-outline" as const,
      color: "#059669",
      bg: isDark ? "#064E3B" : "#ECFDF5",
      onPress: () => (onNavigateToExpenses ? onNavigateToExpenses() : onNavigate?.("payments")),
    },
    {
      id: "settings",
      title: "Settings",
      icon: "settings-outline" as const,
      color: "#475569",
      bg: isDark ? "#1E293B" : "#F1F5F9",
      onPress: () => onNavigate?.("more"),
    },
  ];

  return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      <Header
        title="Dashboard"
        subtitle="Live overview of your StayNexa operations."
        onRefresh={onRefresh}
      />

      {selectedHostel ? (
        <View style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.propertyIcon, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="business" size={23} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.propertyLabel, { color: colors.secondary }]}>ACTIVE PROPERTY</Text>
            </View>
            <Text style={[styles.propertyName, { color: colors.text }]} numberOfLines={1}>{selectedHostel.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
              <Ionicons name="location-outline" size={13} color={colors.secondary} />
              <Text style={[styles.propertyLocation, { color: colors.secondary }]} numberOfLines={1}>
                {selectedHostel.city || ""}
                {selectedHostel.city && selectedHostel.state ? ", " : ""}
                {selectedHostel.state || selectedHostel.address || "Property"}
              </Text>
            </View>
          </View>
          <View style={[styles.activeLivePill, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.activeLiveText, { color: colors.success }]}>Live</Text>
          </View>
        </View>
      ) : null}

      {/* ── Bento Services Menu ── */}
      <View style={styles.bentoSection}>
        {/* Top 4 Elevated Hero Action Cards */}
        <View style={styles.heroRow}>
          {heroActions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.heroCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              activeOpacity={0.75}
              onPress={item.onPress}
            >
              <View style={[styles.heroIconBox, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text
                style={[styles.heroTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom Unified Bento Services Card: Core Modules */}
        <View
          style={[
            styles.bentoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.bentoGrid}>
            {baseServices.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                style={styles.bentoCell}
                activeOpacity={0.7}
                onPress={svc.onPress}
              >
                <View style={[styles.bentoIconBox, { backgroundColor: svc.bg }]}>
                  <Ionicons name={svc.icon} size={22} color={svc.color} />
                </View>
                <Text
                  style={[styles.bentoLabel, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {svc.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

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
        <DonutChart
          data={feeChart}
          centerText={String(dashboard.paidFees + dashboard.pendingFees + dashboard.partiallyPaidFees + dashboard.overdueFees)}
          centerSub="fees"
        />
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

      <View
        style={[
          styles.liveUpdateCard,
          {
            backgroundColor: isDark ? colors.card : colors.primaryLight,
            borderColor: colors.border,
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
  screenContent: { padding: 20, paddingBottom: 110 },
  propertyCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bentoSection: {
    marginBottom: 18,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 16,
  },
  heroCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  bentoCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 2,
    paddingHorizontal: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bentoCell: {
    width: "25%",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  bentoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
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
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeLivePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeLiveText: {
    fontSize: 11,
    fontWeight: "800",
  },
  propertyLabel: { fontSize: 10, fontWeight: "800", color: COLORS.secondary, letterSpacing: 1 },
  propertyName: { marginTop: 4, fontSize: 16, fontWeight: "800", color: COLORS.text },
  propertyLocation: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  chartCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chartCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  chartTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  chartSubtitle: { marginTop: 4, fontSize: 12, color: COLORS.secondary },
  rateBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 13, paddingVertical: 7, paddingHorizontal: 10, alignItems: "center" },
  rateValue: { color: COLORS.primary, fontSize: 16, fontWeight: "800" },
  rateLabel: { color: COLORS.secondary, fontSize: 9, marginTop: 1 },
  outstandingBox: { borderRadius: 13, backgroundColor: COLORS.dangerLight, padding: 12, marginTop: 7 },
  outstandingLabel: { fontSize: 11, color: COLORS.danger },
  outstandingAmount: { marginTop: 3, fontSize: 18, fontWeight: "800", color: COLORS.danger },
  liveUpdateCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 16,
    padding: 14,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  liveUpdateText: { flex: 1, marginLeft: 10, color: COLORS.primaryDark, fontSize: 12, lineHeight: 18 },
});
