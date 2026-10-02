import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { ThemeMode } from "../constants/theme";
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
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

function MoreRow({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  danger = false,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  badge?: number;
  onPress: () => void;
  danger?: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <TouchableOpacity
      style={[styles.moreRow, { borderColor: colors.border, backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.moreIcon,
          { backgroundColor: danger ? colors.dangerLight : colors.primaryLight },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={danger ? colors.danger : colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.moreTitle, { color: danger ? colors.danger : colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.moreSubtitle, { color: colors.secondary }]}>{subtitle}</Text>
      </View>
      {badge !== undefined && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
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
  themeMode,
  onToggleTheme,
}: MoreScreenProps) {
  const { colors } = useTheme();
  const isDark = themeMode === "dark";

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
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.screenContent}
    >
      <Header title="More" subtitle="Additional StayNexa modules." onRefresh={onRefresh} />

      {/* Admin profile card */}
      <View style={[styles.profileCard, { backgroundColor: colors.primaryLight }]}>
        <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.profileInitials}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.profileEmail, { color: colors.secondary }]}>
            {currentUser?.email || ""}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.card }]}>
            <Ionicons name="shield-checkmark-outline" size={11} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>Admin</Text>
          </View>
        </View>
      </View>

      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: colors.secondary }]}>MODULES</Text>

      <MoreRow
        icon="wallet-outline"
        title="Payments & Invoicing"
        subtitle="Manage fees, verify payment receipts, and send reminders"
        onPress={onNavigateToPayments}
        colors={colors}
      />
      <MoreRow
        icon="construct-outline"
        title="Maintenance & Repairs"
        subtitle="Track complaints, update status and warden notes"
        onPress={onNavigateToRepairs}
        colors={colors}
      />
      <MoreRow
        icon="notifications-outline"
        title="Broadcasts & Announcements"
        subtitle="Send announcements, alerts and notices to residents"
        onPress={onNavigateToNotifications}
        colors={colors}
      />

      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: colors.secondary, marginTop: 8 }]}>
        APPEARANCE
      </Text>

      {/* Dark / Light mode toggle row */}
      <View
        style={[styles.moreRow, styles.themeRow, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <View
          style={[styles.moreIcon, { backgroundColor: isDark ? colors.purpleLight : colors.warningLight }]}
        >
          <Ionicons
            name={isDark ? "moon" : "sunny"}
            size={22}
            color={isDark ? colors.purple : colors.warning}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.moreTitle, { color: colors.text }]}>
            {isDark ? "Dark Mode" : "Light Mode"}
          </Text>
          <Text style={[styles.moreSubtitle, { color: colors.secondary }]}>
            {isDark ? "Switch to light theme" : "Switch to dark theme"}
          </Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={onToggleTheme}
          trackColor={{ false: colors.grayFill, true: colors.primary }}
          thumbColor={isDark ? "#FFFFFF" : "#FFFFFF"}
        />
      </View>

      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: colors.secondary, marginTop: 8 }]}>
        ACCOUNT
      </Text>

      <MoreRow
        icon="log-out-outline"
        title="Logout"
        subtitle="Sign out from StayNexa"
        danger
        onPress={handleLogout}
        colors={colors}
      />

      <Text style={[styles.versionText, { color: colors.secondary }]}>StayNexa v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { padding: 20, paddingBottom: 40 },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Row
  moreRow: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },
  themeRow: {
    paddingVertical: 12,
  },
  moreIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  moreTitle: { fontSize: 15, fontWeight: "800" },
  moreSubtitle: { marginTop: 3, fontSize: 12 },

  // Badge
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  // Version
  versionText: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 20,
  },
});
