import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { COLORS } from "../constants/theme";
import { haptic } from "../utils/haptics";

export function Skeleton({ width, height, borderRadius = 8, style }: any) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: colors.border, opacity: anim }, style]} />
  );
}

export function AnimatedPressable({ children, onPress, style }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => {
        haptic.cardPress();
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
      }}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: "blue" | "green" | "orange" | "purple" | "red";
  onPress?: () => void;
}

export function StatCard({ title, value, icon, tone, onPress }: StatCardProps) {
  const { colors: themeColors } = useTheme();
  const toneMap = {
    blue: { bg: themeColors.primaryLight, icon: themeColors.primary },
    green: { bg: themeColors.successLight, icon: themeColors.success },
    orange: { bg: themeColors.orangeLight, icon: themeColors.orange },
    purple: { bg: themeColors.purpleLight, icon: themeColors.purple },
    red: { bg: themeColors.dangerLight, icon: themeColors.danger },
  } as const;
  const toneStyle = toneMap[tone];

  const content = (
    <View style={[styles.statCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: toneStyle.bg }]}>
        <Ionicons name={icon} size={21} color={toneStyle.icon} />
      </View>
      <Text style={[styles.statTitle, { color: themeColors.secondary }]}>{title}</Text>
      <Text style={[styles.statValue, { color: themeColors.text }]}>{value}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          haptic.cardPress();
          onPress();
        }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.12)" : colors.primaryLight,
            borderColor: isDark ? "rgba(59, 130, 246, 0.25)" : "rgba(37, 99, 235, 0.18)",
            borderWidth: 1,
          },
        ]}
      >
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
  badge?: number | string;
}

export function BottomTab({ icon, activeIcon, label, active, onPress, badge }: BottomTabProps) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      style={styles.bottomTab}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.tabIconWrapper,
          active && {
            backgroundColor: isDark ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.10)",
          },
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={22}
          color={active ? colors.primary : colors.secondary}
        />
        {Boolean(badge) && (
          <View style={[styles.tabBadge, { backgroundColor: COLORS.danger }]}>
            <Text style={styles.tabBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
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
    width: "48%",
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
  bottomTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  tabIconWrapper: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    position: "relative",
  },
  bottomLabel: { fontSize: 11, marginTop: 2, fontWeight: "600" },
  bottomLabelActive: { fontWeight: "800" },
  tabBadge: {
    position: "absolute",
    right: -10,
    top: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});
