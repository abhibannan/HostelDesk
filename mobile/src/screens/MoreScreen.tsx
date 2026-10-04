import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS, ThemeMode } from "../constants/theme";
import { Header } from "../components/common";
import { Hostel, User } from "../types";
import { haptic } from "../utils/haptics";

interface MoreScreenProps {
  currentUser?: User | null;
  token?: string | null;
  hostels?: Hostel[];
  onRefreshHostels?: () => void;
  onNavigateToFees: () => void;
  onNavigateToPayments: () => void;
  onNavigateToRepairs: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToDashboard: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  biometricLabel?: string;
  isBiometricsEnabled?: boolean;
  isBiometricsSupported?: boolean;
  onToggleBiometrics?: (enable: boolean) => Promise<boolean>;
  onOpenAuditLogs?: () => void;
}

function MoreRow({
  icon,
  title,
  badge,
  onPress,
  danger = false,
  iconColor,
  iconBg,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  badge?: number;
  onPress: () => void;
  danger?: boolean;
  iconColor?: string;
  iconBg?: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <TouchableOpacity
      style={[styles.moreRow, { borderColor: colors.border, backgroundColor: colors.card }]}
      onPress={() => {
        haptic.cardPress();
        onPress();
      }}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.moreIcon,
          {
            backgroundColor: danger
              ? colors.dangerLight
              : iconBg || colors.primaryLight,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={danger ? colors.danger : iconColor || colors.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.moreTitle, { color: danger ? colors.danger : colors.text }]}>
          {title}
        </Text>
      </View>
      {badge !== undefined && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
      )}
    </TouchableOpacity>
  );
}

export function MoreScreen({
  currentUser,
  token,
  hostels = [],
  onRefreshHostels,
  onNavigateToFees,
  onNavigateToPayments,
  onNavigateToRepairs,
  onNavigateToNotifications,
  onNavigateToDashboard,
  onRefresh,
  onLogout,
  themeMode,
  onToggleTheme,
  biometricLabel = "Biometric / Face Recognition",
  isBiometricsEnabled = false,
  isBiometricsSupported = false,
  onToggleBiometrics,
  onOpenAuditLogs,
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

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
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
            <Ionicons
              name="shield-checkmark-outline"
              size={11}
              color={colors.primary}
            />
            <Text style={[styles.roleText, { color: colors.primary }]}>
              Hostel Admin
            </Text>
          </View>
        </View>
      </View>



      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: colors.secondary }]}>MODULES</Text>

      <MoreRow
        icon="wallet-outline"
        title="Payments & Invoicing"
        iconColor="#10B981"
        iconBg={isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5"}
        onPress={onNavigateToPayments}
        colors={colors}
      />
      <MoreRow
        icon="build-outline"
        title="Maintenance & Repairs"
        iconColor="#F59E0B"
        iconBg={isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7"}
        onPress={onNavigateToRepairs}
        colors={colors}
      />
      <MoreRow
        icon="megaphone-outline"
        title="Broadcasts & Announcements"
        iconColor="#8B5CF6"
        iconBg={isDark ? "rgba(139, 92, 246, 0.16)" : "#F5F3FF"}
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
        SECURITY & BIOMETRICS
      </Text>

      {/* Biometric Unlock toggle row */}
      <View
        style={[styles.moreRow, styles.themeRow, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <View
          style={[styles.moreIcon, { backgroundColor: isBiometricsEnabled ? "rgba(16, 185, 129, 0.15)" : colors.primaryLight }]}
        >
          <Ionicons
            name={biometricLabel.toLowerCase().includes("face") ? "scan-outline" : "finger-print-outline"}
            size={22}
            color={isBiometricsEnabled ? COLORS.success : colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.moreTitle, { color: colors.text }]}>
            {biometricLabel} Unlock
          </Text>
          <Text style={{ fontSize: 11, color: colors.secondary, marginTop: 1 }}>
            {isBiometricsSupported
              ? "Instant unlock without typing passwords repeatedly"
              : "Not available or enrolled on this device"}
          </Text>
        </View>
        <Switch
          disabled={!isBiometricsSupported}
          value={Boolean(isBiometricsEnabled)}
          onValueChange={async (val) => {
            try {
              await onToggleBiometrics?.(val);
            } catch (err: any) {
              Alert.alert("Biometrics Error", err?.message || "Could not toggle biometrics.");
            }
          }}
          trackColor={{ false: colors.grayFill, true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {onOpenAuditLogs && (
        <MoreRow
          icon="shield-checkmark-outline"
          title="Security & Activity Audit Log"
          iconColor="#3B82F6"
          iconBg={isDark ? "rgba(59, 130, 246, 0.16)" : "#EFF6FF"}
          onPress={onOpenAuditLogs}
          colors={colors}
        />
      )}

      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: colors.secondary, marginTop: 8 }]}>
        ACCOUNT
      </Text>

      <MoreRow
        icon="log-out-outline"
        title="Logout"
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
  screenContent: { padding: 20, paddingBottom: 110 },

  // Profile card
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 22,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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

  // Super Admin Card
  superAdminCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  superAdminIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  superAdminTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  superBadge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  superBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  superAdminSub: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});
