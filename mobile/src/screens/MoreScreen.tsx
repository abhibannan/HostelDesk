import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Header } from "../components/common";
import { User } from "../types";

interface MoreScreenProps {
  currentUser?: User | null;
  onNavigateToFees: () => void;
  onNavigateToPayments: () => void;
  onNavigateToRepairs: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToDashboard: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

function MoreRow({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.moreRow} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.moreIcon,
          { backgroundColor: danger ? COLORS.dangerLight : COLORS.primaryLight },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={danger ? COLORS.danger : COLORS.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.moreTitle, danger && { color: COLORS.danger }]}>{title}</Text>
        <Text style={styles.moreSubtitle}>{subtitle}</Text>
      </View>
      {badge !== undefined && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
      )}
    </TouchableOpacity>
  );
}

export function MoreScreen({
  currentUser,
  onNavigateToFees,
  onNavigateToPayments,
  onNavigateToRepairs,
  onNavigateToNotifications,
  onNavigateToDashboard,
  onRefresh,
  onLogout,
}: MoreScreenProps) {
  function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: onLogout },
    ]);
  }

  const initials = currentUser
    ? `${currentUser.firstName?.[0] || ""}${currentUser.lastName?.[0] || ""}`.toUpperCase() ||
      (currentUser.email?.[0] || "A").toUpperCase()
    : "A";

  const displayName = currentUser
    ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") ||
      currentUser.email
    : "Admin";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Header title="More" subtitle="Additional StayNexa modules." onRefresh={onRefresh} />

      {/* Admin profile card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitials}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{currentUser?.email || ""}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark-outline" size={11} color={COLORS.primary} />
            <Text style={styles.roleText}>Admin</Text>
          </View>
        </View>
      </View>

      {/* Section label */}
      <Text style={styles.sectionLabel}>MODULES</Text>

      <MoreRow
        icon="receipt-outline"
        title="Fees & Rent Reminders"
        subtitle="Create fees, send rent reminders to unpaid residents"
        onPress={onNavigateToFees}
      />
      <MoreRow
        icon="card-outline"
        title="Payment Proofs"
        subtitle="Review and approve renter payment receipts"
        onPress={onNavigateToPayments}
      />
      <MoreRow
        icon="construct-outline"
        title="Maintenance & Repairs"
        subtitle="Track complaints, update status and warden notes"
        onPress={onNavigateToRepairs}
      />
      <MoreRow
        icon="notifications-outline"
        title="Broadcasts & Announcements"
        subtitle="Send announcements, alerts and notices to residents"
        onPress={onNavigateToNotifications}
      />

      {/* Section label */}
      <Text style={[styles.sectionLabel, { marginTop: 8 }]}>ACCOUNT</Text>

      <MoreRow
        icon="log-out-outline"
        title="Logout"
        subtitle="Sign out from StayNexa"
        danger
        onPress={handleLogout}
      />

      <Text style={styles.versionText}>StayNexa v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 40 },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInitials: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Row
  moreRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
    backgroundColor: COLORS.background,
  },
  moreIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  moreTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  moreSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },

  // Badge
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  // Version
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 20,
  },
});
