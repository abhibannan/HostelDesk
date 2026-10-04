import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

interface SkeletonProps {
  width?: number | `${number}%` | "auto";
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  const baseBg = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: baseBg,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

/** Pre-composed Skeleton for Dashboard Statistics cards */
export function DashboardSkeleton() {
  const { colors, isDark } = useTheme();
  const cardBg = isDark ? "rgba(255, 255, 255, 0.03)" : colors.card;

  return (
    <View style={skeletonStyles.container}>
      {/* Top Banner Skeleton */}
      <View style={[skeletonStyles.card, { backgroundColor: cardBg }]}>
        <Skeleton width="40%" height={16} borderRadius={6} />
        <View style={{ height: 10 }} />
        <Skeleton width="70%" height={28} borderRadius={8} />
        <View style={{ height: 14 }} />
        <Skeleton width="100%" height={44} borderRadius={10} />
      </View>

      {/* 2x2 Stats Grid Skeleton */}
      <View style={skeletonStyles.grid}>
        {[1, 2, 3, 4].map((key) => (
          <View key={key} style={[skeletonStyles.statCard, { backgroundColor: cardBg }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Skeleton width={36} height={36} borderRadius={18} />
              <Skeleton width={40} height={14} borderRadius={6} />
            </View>
            <View style={{ height: 14 }} />
            <Skeleton width="50%" height={24} borderRadius={6} />
            <View style={{ height: 8 }} />
            <Skeleton width="75%" height={14} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Chart Skeleton */}
      <View style={[skeletonStyles.card, { backgroundColor: cardBg, marginTop: 14 }]}>
        <Skeleton width="55%" height={18} borderRadius={6} />
        <View style={{ height: 16 }} />
        <Skeleton width="100%" height={140} borderRadius={12} />
      </View>
    </View>
  );
}

/** Pre-composed Skeleton for Renters / Proofs / Fees list screens */
export function ListSkeleton({ count = 4 }: { count?: number }) {
  const { colors, isDark } = useTheme();
  const cardBg = isDark ? "rgba(255, 255, 255, 0.03)" : colors.card;

  return (
    <View style={skeletonStyles.container}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={[skeletonStyles.listCard, { backgroundColor: cardBg }]}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="60%" height={16} borderRadius={6} />
            <Skeleton width="40%" height={12} borderRadius={4} />
            <Skeleton width="80%" height={10} borderRadius={4} />
          </View>
          <Skeleton width={60} height={26} borderRadius={13} />
        </View>
      ))}
    </View>
  );
}

/** Pre-composed Skeleton for Rooms Grid */
export function RoomsSkeleton({ count = 6 }: { count?: number }) {
  const { colors, isDark } = useTheme();
  const cardBg = isDark ? "rgba(255, 255, 255, 0.03)" : colors.card;

  return (
    <View style={[skeletonStyles.grid, { padding: 16 }]}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={[skeletonStyles.roomCard, { backgroundColor: cardBg }]}>
          <Skeleton width="50%" height={20} borderRadius={6} />
          <View style={{ height: 10 }} />
          <Skeleton width="80%" height={14} borderRadius={4} />
          <View style={{ height: 12 }} />
          <Skeleton width="100%" height={8} borderRadius={4} />
          <View style={{ height: 12 }} />
          <Skeleton width="60%" height={20} borderRadius={10} />
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.12)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.12)",
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.12)",
    marginBottom: 10,
  },
  roomCard: {
    width: "48%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.12)",
  },
});
