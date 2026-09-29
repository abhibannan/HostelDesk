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

interface MoreScreenProps {
  onNavigateToFees: () => void;
  onNavigateToPayments: () => void;
  onNavigateToDashboard: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

function MoreRow({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
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
      <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
    </TouchableOpacity>
  );
}

export function MoreScreen({
  onNavigateToFees,
  onNavigateToPayments,
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Header title="More" subtitle="Additional StayNexa modules." onRefresh={onRefresh} />
      <MoreRow
        icon="receipt-outline"
        title="Fees"
        subtitle="Create and manage fee records"
        onPress={onNavigateToFees}
      />
      <MoreRow
        icon="card-outline"
        title="Payments"
        subtitle="Read-only payment history from the backend"
        onPress={onNavigateToPayments}
      />
      <MoreRow
        icon="construct-outline"
        title="Repairs"
        subtitle="Repair information is included on the dashboard"
        onPress={onNavigateToDashboard}
      />
      <MoreRow
        icon="notifications-outline"
        title="Notifications"
        subtitle="Notification center will be connected next"
        onPress={() =>
          Alert.alert("Notifications", "Notification center is the next module.")
        }
      />
      <MoreRow
        icon="log-out-outline"
        title="Logout"
        subtitle="Sign out from StayNexa"
        danger
        onPress={handleLogout}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 34 },
  moreRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
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
});
