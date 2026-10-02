import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Hostel } from "../types";
import { Header, EmptyState } from "../components/common";
import { COLORS } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";

interface HostelsScreenProps {
  hostels: Hostel[];
  selectedHostelId: string;
  onSelectHostel: (hostelId: string) => void;
  onRefresh: () => void;
}

export function HostelsScreen({
  hostels,
  selectedHostelId,
  onSelectHostel,
  onRefresh,
}: HostelsScreenProps) {
  const { colors, isDark } = useTheme();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="Hostels"
        subtitle="Choose the hostel you want to manage."
        onRefresh={onRefresh}
      />
      {hostels.length === 0 ? (
        <EmptyState
          icon="business-outline"
          title="No hostels found"
          description="No hostels are assigned to this admin account."
        />
      ) : (
        hostels.map((hostel) => {
          const isSelected = hostel.id === selectedHostelId;
          return (
            <TouchableOpacity
              key={hostel.id}
              style={[
                styles.hostelCard,
                {
                  backgroundColor: isSelected
                    ? (isDark ? colors.surfaceSecondary : colors.primaryLight)
                    : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectHostel(hostel.id)}
            >
              <View style={[styles.hostelIcon, { backgroundColor: isSelected ? colors.primary : colors.primaryLight }]}>
                <Ionicons name="business" size={22} color={isSelected ? "#FFFFFF" : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.hostelName, { color: colors.text }]}>{hostel.name}</Text>
                <Text style={[styles.hostelLocation, { color: colors.secondary }]}>{hostel.address || "Address not set"}</Text>
                <Text style={[styles.hostelLocation, { color: colors.secondary }]}>
                  {hostel.city || ""}
                  {hostel.city && hostel.state ? ", " : ""}
                  {hostel.state || ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.secondary} />
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 34 },
  hostelCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  hostelSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  hostelIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  hostelName: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  hostelLocation: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
});
