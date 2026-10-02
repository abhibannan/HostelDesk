import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function Header({ title, subtitle, onRefresh }: HeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>{subtitle}</Text> : null}
      </View>
      {onRefresh ? (
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.refreshButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
        >
          <Ionicons name="refresh-outline" size={21} color={colors.primary} />
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
  const { colors: themeColors } = useTheme();
  const toneMap = {
    blue: { bg: themeColors.primaryLight, icon: themeColors.primary },
    green: { bg: themeColors.successLight, icon: themeColors.success },
    orange: { bg: themeColors.orangeLight, icon: themeColors.orange },
    purple: { bg: themeColors.purpleLight, icon: themeColors.purple },
    red: { bg: themeColors.dangerLight, icon: themeColors.danger },
  } as const;
  const toneStyle = toneMap[tone];

  return (
    <View style={[styles.statCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: toneStyle.bg }]}>
        <Ionicons name={icon} size={21} color={toneStyle.icon} />
      </View>
      <Text style={[styles.statTitle, { color: themeColors.secondary }]}>{title}</Text>
      <Text style={[styles.statValue, { color: themeColors.text }]}>{value}</Text>
    </View>
  );
}

interface SectionTitleProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, action, onAction }: SectionTitleProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
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
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.secondary }]}>{description}</Text>
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
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.bottomTab} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={active ? activeIcon : icon} size={23} color={active ? colors.primary : colors.secondary} />
      <Text
        style={[
          styles.bottomLabel,
          { color: active ? colors.primary : colors.secondary },
          active && styles.bottomLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 18, paddingTop: 4 },
  headerTitle: { fontSize: 28, fontWeight: "800" },
  headerSubtitle: { marginTop: 5, fontSize: 14, lineHeight: 20 },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  statCard: {
    width: "47%",
    flexGrow: 1,
    minWidth: 140,
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
  },
  statIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  statTitle: { fontSize: 12, fontWeight: "600" },
  statValue: { marginTop: 5, fontSize: 22, fontWeight: "800" },
  sectionHeader: { marginTop: 23, marginBottom: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  sectionAction: { fontSize: 13, fontWeight: "800" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 45, paddingHorizontal: 20 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  emptyDescription: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  bottomTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  bottomLabel: { fontSize: 11, marginTop: 4, fontWeight: "600" },
  bottomLabelActive: { fontWeight: "800" },
});
