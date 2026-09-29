import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Hostel } from "../types";
import { Header, EmptyState } from "../components/common";

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
  return (
    <ScrollView
      style={styles.screen}
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
        hostels.map((hostel) => (
          <TouchableOpacity
            key={hostel.id}
            style={[styles.hostelCard, hostel.id === selectedHostelId && styles.hostelSelected]}
            onPress={() => onSelectHostel(hostel.id)}
          >
            <View style={styles.hostelIcon}>
              <Ionicons name="business" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hostelName}>{hostel.name}</Text>
              <Text style={styles.hostelLocation}>{hostel.address || "Address not set"}</Text>
              <Text style={styles.hostelLocation}>
                {hostel.city || ""}
                {hostel.city && hostel.state ? ", " : ""}
                {hostel.state || ""}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        ))
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
