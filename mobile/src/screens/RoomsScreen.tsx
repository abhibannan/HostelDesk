import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Hostel, Room } from "../types";
import { Header, EmptyState } from "../components/common";

interface RoomsScreenProps {
  rooms: Room[];
  selectedHostel?: Hostel;
  showRoomModal: boolean;
  setShowRoomModal: (show: boolean) => void;
  roomNumber: string;
  setRoomNumber: (num: string) => void;
  roomFloor: string;
  setRoomFloor: (floor: string) => void;
  roomSaving: boolean;
  onAddRoom: () => void;
  onDeleteRoom: (room: Room) => void;
  onRefresh: () => void;
}

export function RoomsScreen({
  rooms,
  selectedHostel,
  showRoomModal,
  setShowRoomModal,
  roomNumber,
  setRoomNumber,
  roomFloor,
  setRoomFloor,
  roomSaving,
  onAddRoom,
  onDeleteRoom,
  onRefresh,
}: RoomsScreenProps) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header
          title="Rooms"
          subtitle={selectedHostel?.name || "Select a hostel"}
          onRefresh={onRefresh}
        />
        <View style={styles.actionRow}>
          <View>
            <Text style={styles.sectionTitle}>Room management</Text>
            <Text style={styles.sectionSubtitle}>
              {rooms.length} room{rooms.length === 1 ? "" : "s"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.smallPrimaryButton}
            onPress={() => setShowRoomModal(true)}
          >
            <Ionicons name="add" size={19} color="#FFFFFF" />
            <Text style={styles.smallPrimaryText}>Add Room</Text>
          </TouchableOpacity>
        </View>

        {rooms.length === 0 ? (
          <EmptyState
            icon="grid-outline"
            title="No rooms found"
            description="Add your first room to start managing occupancy."
          />
        ) : (
          rooms.map((room) => (
            <View key={room.id} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                <Ionicons name="home-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Room {room.roomNumber}</Text>
                <Text style={styles.itemSubtitle}>
                  {room.floor !== undefined ? `Floor ${room.floor}` : "Floor not set"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => onDeleteRoom(room)}
              >
                <Ionicons name="trash-outline" size={19} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showRoomModal}
        transparent
        animationType="slide"
        onRequestClose={() => !roomSaving && setShowRoomModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Add Room</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedHostel?.name || "Selected hostel"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowRoomModal(false)}
                >
                  <Ionicons name="close" size={22} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Room number</Text>
              <TextInput
                style={styles.input}
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="Example: 101"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.label}>Floor</Text>
              <TextInput
                style={styles.input}
                value={roomFloor}
                onChangeText={setRoomFloor}
                placeholder="Example: 1"
                placeholderTextColor="#94A3B8"
              />

              <TouchableOpacity
                style={styles.primaryButton}
                disabled={roomSaving}
                onPress={onAddRoom}
              >
                {roomSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Add Room</Text>
                    <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 34 },
  actionRow: {
    marginTop: 6,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 12 },
  smallPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
  },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 4 },
  itemCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  itemSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  modalKeyboard: { width: "100%" },
  modalCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  modalSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayFill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.text, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
