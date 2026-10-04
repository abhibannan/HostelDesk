import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Dashboard, Fee, Hostel, Payment, Renter, Tab } from "../types";
import { money, statusLabel } from "../utils/formatters";
import { Header, StatCard, SectionTitle, EmptyState } from "../components/common";
import {
  DonutChart,
  BarChart,
  RevenueTrendChart,
  OccupancyGauge,
  MonthOverMonthCard,
  MonthlyTrendData,
} from "../components/charts";
import { DashboardSkeleton } from "../components/Skeleton";
import { exportFinancialStatementPDF, exportToCSV } from "../services/exportService";
import { COLORS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { haptic } from "../utils/haptics";

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
  loading?: boolean;
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
  loading = false,
}: DashboardScreenProps) {
  const { colors, isDark } = useTheme();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    haptic.light();
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportFinancialReport = async () => {
    haptic.medium();
    try {
      toast.info("Generating financial statement...", "Exporting PDF");
      const totalBilled = fees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      const totalCollected = fees.reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);
      const totalOutstanding = Math.max(0, totalBilled - totalCollected);
      const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

      await exportFinancialStatementPDF(
        fees,
        { totalBilled, totalCollected, totalOutstanding, collectionRate },
        selectedHostel?.name || "StayNexa Property"
      );
      toast.success("Financial statement opened for download/sharing!", "Export Ready");
    } catch (e) {
      toast.error("Failed to generate financial statement.", "Export Error");
    }
  };

  // Month-over-month calculation
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  let thisMonthCollected = 0;
  let lastMonthCollected = 0;

  payments.forEach((p) => {
    if (String(p.status || "APPROVED").toUpperCase() !== "APPROVED") return;
    const key = String(p.paymentDate || p.submittedAt || p.createdAt || "").slice(0, 7);
    if (key === currentMonthKey) thisMonthCollected += Number(p.amount || 0);
    else if (key === lastMonthKey) lastMonthCollected += Number(p.amount || 0);
  });

  // Revenue trend: 6 months dual bars
  const revenueTrendData: MonthlyTrendData[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });

    let collected = 0;
    let outstanding = 0;

    payments.forEach((p) => {
      if (String(p.status || "APPROVED").toUpperCase() !== "APPROVED") return;
      if (String(p.paymentDate || p.submittedAt || p.createdAt || "").slice(0, 7) === key) {
        collected += Number(p.amount || 0);
      }
    });

    fees.forEach((f) => {
      if (String(f.dueDate || f.createdAt || "").slice(0, 7) === key) {
        const amt = Number(f.amount || 0);
        const paid = Number(f.paidAmount || 0);
        outstanding += Math.max(0, amt - paid);
      }
    });

    revenueTrendData.push({
      month: label,
      collected: Math.round(collected),
      outstanding: Math.round(outstanding),
    });
  }

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
      icon: "person-circle-outline" as const,
      color: "#059669",
      bg: isDark ? "#064E3B" : "#ECFDF5",
      onPress: () => onNavigate?.("renters"),
    },
    {
      id: "payments",
      title: "Payments",
      icon: "wallet-outline" as const,
      color: "#D97706",
      bg: isDark ? "#451A03" : "#FEF3C7",
      onPress: () => onNavigate?.("payments"),
    },
    {
      id: "repairs",
      title: "Repairs",
      icon: "build-outline" as const,
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

  if (loading) {
    return (
      <ScrollView
        style={[styles.screen, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.screenContent}
      >
        <Header
          title="Dashboard"
          subtitle="Live overview of your StayNexa operations."
          onRefresh={onRefresh}
        />
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Header
        title="Dashboard"
        subtitle="Live overview of your StayNexa operations."
        onRefresh={onRefresh}
      />

      {selectedHostel ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            haptic.cardPress();
            onNavigate?.("hostels");
          }}
          style={[styles.propertyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
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
        </TouchableOpacity>
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
              onPress={() => {
                haptic.cardPress();
                item.onPress();
              }}
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
                onPress={() => {
                  haptic.cardPress();
                  svc.onPress();
                }}
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
        <StatCard title="Total Rooms" value={dashboard.totalRooms} icon="bed-outline" tone="blue" onPress={() => onNavigate?.("rooms")} />
        <StatCard title="Available Rooms" value={dashboard.availableRooms} icon="key-outline" tone="green" onPress={() => onNavigate?.("rooms")} />
        <StatCard title="Occupied Rooms" value={dashboard.occupiedRooms} icon="people-outline" tone="blue" onPress={() => onNavigate?.("rooms")} />
        <StatCard title="Active Renters" value={dashboard.activeRenters} icon="person-circle-outline" tone="orange" onPress={() => onNavigate?.("renters")} />
        <StatCard title="Outstanding Fees" value={money(dashboard.outstandingFees)} icon="alert-circle-outline" tone="red" onPress={() => onNavigate?.("fees")} />
        <StatCard title="Payments" value={dashboard.totalPayments} icon="receipt-outline" tone="purple" onPress={() => onNavigate?.("payments")} />
      </View>

      {/* ── Visual Occupancy Gauge & Distribution ── */}
      <SectionTitle title="Occupancy overview" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chartCardHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Real-time Room Fill Gauge</Text>
            <Text style={[styles.chartSubtitle, { color: colors.secondary }]}>Current resident occupancy rate</Text>
          </View>
          <View style={[styles.rateBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.rateValue, { color: colors.primary }]}>{occupancyRate}%</Text>
            <Text style={[styles.rateLabel, { color: colors.secondary }]}>occupied</Text>
          </View>
        </View>
        <OccupancyGauge
          percentage={occupancyRate}
          occupiedBeds={dashboard.occupiedRooms}
          totalBeds={dashboard.totalRooms}
        />
        <View style={{ height: 10 }} />
        <DonutChart data={roomChart} centerText={`${occupancyRate}%`} centerSub="occupied" />
      </View>

      {/* ── Revenue Trends & Month-over-Month Growth ── */}
      <SectionTitle title="Revenue trends & Growth" />
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Collection vs Outstanding</Text>
            <Text style={[styles.chartSubtitle, { color: colors.secondary }]}>Monthly trajectory across past 6 months</Text>
          </View>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.primaryLight }]}
            onPress={handleExportFinancialReport}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={14} color={colors.primary} />
            <Text style={[styles.exportBtnText, { color: colors.primary }]}>Export PDF</Text>
          </TouchableOpacity>
        </View>

        <RevenueTrendChart data={revenueTrendData} />

        <MonthOverMonthCard
          thisMonthAmount={thisMonthCollected}
          lastMonthAmount={lastMonthCollected}
        />
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
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
