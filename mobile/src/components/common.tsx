import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, onRefresh }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {onRefresh ? (
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={21} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "blue" | "green" | "orange" | "purple" | "red";
}

export function StatCard({ title, value, icon, tone }: StatCardProps) {
  const toneMap = {
    blue: { bg: COLORS.primaryLight, icon: COLORS.primary },
    green: { bg: COLORS.successLight, icon: COLORS.success },
    orange: { bg: COLORS.orangeLight, icon: COLORS.orange },
    purple: { bg: COLORS.purpleLight, icon: COLORS.purple },
    red: { bg: COLORS.dangerLight, icon: COLORS.danger },
  } as const;
  const colors = toneMap[tone];

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon} size={21} color={colors.icon} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

interface SectionTitleProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, action, onAction }: SectionTitleProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

interface BottomTabProps {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}

export function BottomTab({ icon, activeIcon, label, active, onPress }: BottomTabProps) {
  return (
    <TouchableOpacity style={styles.bottomTab} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={active ? activeIcon : icon} size={23} color={active ? COLORS.primary : COLORS.secondary} />
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 18, paddingTop: 4 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  headerSubtitle: { marginTop: 5, color: COLORS.secondary, fontSize: 14, lineHeight: 20 },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  statCard: { width: "48%", borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 15 },
  statIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  statTitle: { fontSize: 12, color: COLORS.secondary, fontWeight: "600" },
  statValue: { marginTop: 5, fontSize: 22, fontWeight: "800", color: COLORS.text },
  sectionHeader: { marginTop: 23, marginBottom: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  sectionAction: { fontSize: 13, fontWeight: "800", color: COLORS.primary },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 45, paddingHorizontal: 20 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  emptyDescription: { fontSize: 13, color: COLORS.secondary, textAlign: "center", lineHeight: 19 },
  bottomTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  bottomLabel: { fontSize: 11, color: COLORS.secondary, marginTop: 4, fontWeight: "600" },
  bottomLabelActive: { color: COLORS.primary, fontWeight: "800" },
});
