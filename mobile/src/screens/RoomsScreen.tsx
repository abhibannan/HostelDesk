/**
 * RoomsScreen.tsx
 *
 * Rich room management screen for StayNexa admins.
 * Features:
 *  - Grid view of all rooms with occupancy indicators
 *  - Tap a room → full detail bottom-sheet with:
 *      • Live occupant list (fetched from /rooms/:id/occupants)
 *      • Capacity control (+/− max-occupants)
 *      • Transfer any occupant to another room via dropdown
 *  - Add room modal
 *  - Delete room (blocked if occupied)
 */

import React, { useCallback, useState } from "react";
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
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Hostel, Room, Renter } from "../types";
import { Header, EmptyState } from "../components/common";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Occupant {
  id: string;
  userId?: string | null;
  status?: string;
  joiningDate?: string | null;
  monthlyFee?: number | null;
  securityDeposit?: number | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface RoomsScreenProps {
  rooms: Room[];
  renters: Renter[];
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
  request: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  selectedHostelId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getOccupantName(o: Occupant): string {
  const fn = o.user?.firstName ?? "";
  const ln = o.user?.lastName ?? "";
  const full = [fn, ln].filter(Boolean).join(" ");
  return full || o.user?.email || "Unnamed Renter";
}

function roomStatusColor(room: Room, occupantCount: number): { bg: string; fg: string; label: string } {
  const max = room.maxOccupants ?? 0;
  const status = String(room.status ?? "ACTIVE").toUpperCase();
  if (occupantCount > 0 && max > 0 && occupantCount >= max) {
    return { bg: COLORS.dangerLight, fg: COLORS.danger, label: "Full" };
  }
  if (occupantCount > 0) {
    return { bg: COLORS.warningLight, fg: COLORS.warning, label: "Occupied" };
  }
  if (status === "INACTIVE") {
    return { bg: COLORS.grayFill, fg: COLORS.secondary, label: "Inactive" };
  }
  return { bg: COLORS.successLight, fg: COLORS.success, label: "Available" };
}

// ─── RoomsScreen ──────────────────────────────────────────────────────────────
export function RoomsScreen({
  rooms,
  renters,
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
  request,
  selectedHostelId,
}: RoomsScreenProps) {
  // ── Detail sheet state ─────────────────────────────────────────────────────
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [occupantsLoading, setOccupantsLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  // ── Capacity state ─────────────────────────────────────────────────────────
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [localMaxOccupants, setLocalMaxOccupants] = useState(1);

  // ── Transfer state ─────────────────────────────────────────────────────────
  const [transferOccupant, setTransferOccupant] = useState<Occupant | null>(null);
  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [showTransferPicker, setShowTransferPicker] = useState(false);

  // ── refreshing ─────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);

  // ── Derived occupant counts from renters list ─────────────────────────────
  const occupantCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of renters) {
      if (r.roomId && String(r.status ?? "ACTIVE").toUpperCase() === "ACTIVE") {
        map[r.roomId] = (map[r.roomId] ?? 0) + 1;
      }
    }
    return map;
  }, [renters]);

  // ── Fetch occupants for a room ─────────────────────────────────────────────
  const loadOccupants = useCallback(
    async (room: Room) => {
      setOccupantsLoading(true);
      try {
        const res = await request<{ occupants: Occupant[] }>(
          `/hostels/${selectedHostelId}/rooms/${room.id}/occupants`
        );
        setOccupants(res?.occupants ?? []);
      } catch {
        setOccupants([]);
      } finally {
        setOccupantsLoading(false);
      }
    },
    [request, selectedHostelId]
  );

  function openRoomDetail(room: Room) {
    setSelectedRoom(room);
    setLocalMaxOccupants(room.maxOccupants ?? 1);
    setOccupants([]);
    setTransferOccupant(null);
    setTransferTargetId("");
    setDetailVisible(true);
    void loadOccupants(room);
  }

  // ── Update capacity ────────────────────────────────────────────────────────
  async function saveCapacity(newMax: number) {
    if (!selectedRoom) return;
    setCapacitySaving(true);
    try {
      await request(`/hostels/${selectedHostelId}/rooms/${selectedRoom.id}/capacity`, {
        method: "PATCH",
        body: JSON.stringify({ maxOccupants: newMax }),
      });
      setLocalMaxOccupants(newMax);
      // Patch the room in-memory so grid updates
      selectedRoom.maxOccupants = newMax;
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update capacity.");
    } finally {
      setCapacitySaving(false);
    }
  }

  function adjustCapacity(delta: number) {
    const next = Math.max(1, localMaxOccupants + delta);
    setLocalMaxOccupants(next);
    void saveCapacity(next);
  }

  // ── Transfer renter ────────────────────────────────────────────────────────
  async function doTransfer() {
    if (!selectedRoom || !transferOccupant || !transferTargetId) return;
    setTransferSaving(true);
    try {
      await request(`/hostels/${selectedHostelId}/rooms/${selectedRoom.id}/transfer`, {
        method: "PATCH",
        body: JSON.stringify({
          renterId: transferOccupant.id,
          targetRoomId: transferTargetId,
        }),
      });
      Alert.alert(
        "Transferred ✓",
        `${getOccupantName(transferOccupant)} has been moved to Room ${
          rooms.find((r) => r.id === transferTargetId)?.roomNumber ?? ""
        }.`
      );
      setTransferOccupant(null);
      setTransferTargetId("");
      setShowTransferPicker(false);
      await loadOccupants(selectedRoom);
      onRefresh();
    } catch (err) {
      Alert.alert("Transfer failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setTransferSaving(false);
    }
  }

  // ── Pull-to-refresh on detail ─────────────────────────────────────────────
  async function handleDetailRefresh() {
    if (!selectedRoom) return;
    setRefreshing(true);
    await loadOccupants(selectedRoom);
    onRefresh();
    setRefreshing(false);
  }

  // ── Grid stats ─────────────────────────────────────────────────────────────
  const availableCount = rooms.filter((r) => (occupantCountMap[r.id] ?? 0) === 0).length;
  const occupiedCount = rooms.filter((r) => (occupantCountMap[r.id] ?? 0) > 0).length;

  const transferableRooms = rooms.filter((r) => r.id !== selectedRoom?.id);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header
          title="Rooms"
          subtitle={selectedHostel?.name || "Select a hostel"}
          onRefresh={onRefresh}
        />

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statChip}>
            <Ionicons name="grid-outline" size={15} color={COLORS.primary} />
            <Text style={[styles.statChipText, { color: COLORS.primary }]}>
              {rooms.length} Total
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="checkmark-circle-outline" size={15} color={COLORS.success} />
            <Text style={[styles.statChipText, { color: COLORS.success }]}>
              {availableCount} Available
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: COLORS.warningLight }]}>
            <Ionicons name="people-outline" size={15} color={COLORS.warning} />
            <Text style={[styles.statChipText, { color: COLORS.warning }]}>
              {occupiedCount} Occupied
            </Text>
          </View>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <Text style={styles.sectionTitle}>Room Management</Text>
          <TouchableOpacity style={styles.smallPrimaryButton} onPress={() => setShowRoomModal(true)}>
            <Ionicons name="add" size={19} color="#FFFFFF" />
            <Text style={styles.smallPrimaryText}>Add Room</Text>
          </TouchableOpacity>
        </View>

        {/* Room grid */}
        {rooms.length === 0 ? (
          <EmptyState
            icon="grid-outline"
            title="No rooms found"
            description="Add your first room to start managing occupancy."
          />
        ) : (
          <View style={styles.roomGrid}>
            {rooms.map((room) => {
              const count = occupantCountMap[room.id] ?? 0;
              const max = room.maxOccupants ?? 0;
              const statusInfo = roomStatusColor(room, count);
              const occupancyFraction = max > 0 ? Math.min(count / max, 1) : 0;

              return (
                <TouchableOpacity
                  key={room.id}
                  style={styles.roomCard}
                  onPress={() => openRoomDetail(room)}
                  activeOpacity={0.78}
                >
                  {/* Header strip */}
                  <View style={[styles.roomCardStrip, { backgroundColor: statusInfo.bg }]}>
                    <Ionicons name="home" size={18} color={statusInfo.fg} />
                    <View style={[styles.statusDot, { backgroundColor: statusInfo.fg }]} />
                  </View>

                  <View style={styles.roomCardBody}>
                    <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
                    <Text style={styles.roomFloor}>
                      {room.floor !== undefined && room.floor !== null
                        ? `Floor ${room.floor}`
                        : "No floor"}
                    </Text>

                    {/* Occupancy bar */}
                    {max > 0 && (
                      <View style={styles.occupancyBarBg}>
                        <View
                          style={[
                            styles.occupancyBarFill,
                            {
                              width: `${occupancyFraction * 100}%`,
                              backgroundColor: statusInfo.fg,
                            },
                          ]}
                        />
                      </View>
                    )}

                    <View style={styles.roomCardFooter}>
                      <Text style={[styles.occupantCount, { color: statusInfo.fg }]}>
                        {count}
                        {max > 0 ? `/${max}` : ""} {count === 1 ? "occupant" : "occupants"}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusInfo.fg }]}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Delete button */}
                  <TouchableOpacity
                    style={styles.roomDeleteBtn}
                    onPress={() => onDeleteRoom(room)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={15} color={COLORS.danger} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Add room modal ───────────────────────────────────────────────────── */}
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
                  <Text style={styles.modalSubtitle}>{selectedHostel?.name || "Selected hostel"}</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowRoomModal(false)}
                >
                  <Ionicons name="close" size={22} color={COLORS.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Room number *</Text>
              <TextInput
                style={styles.input}
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="e.g. 101"
                placeholderTextColor="#94A3B8"
                keyboardType="default"
              />

              <Text style={styles.label}>Floor</Text>
              <TextInput
                style={styles.input}
                value={roomFloor}
                onChangeText={setRoomFloor}
                placeholder="e.g. 1"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.primaryButton, roomSaving && { opacity: 0.6 }]}
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

      {/* ── Room detail bottom-sheet ─────────────────────────────────────────── */}
      <Modal
        visible={detailVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.detailBackdrop}>
          <TouchableOpacity
            style={styles.detailDismissArea}
            activeOpacity={1}
            onPress={() => setDetailVisible(false)}
          />
          <View style={styles.detailSheet}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.detailHeader}>
              <View>
                <Text style={styles.detailTitle}>
                  Room {selectedRoom?.roomNumber}
                </Text>
                <Text style={styles.detailSubtitle}>
                  {selectedRoom?.floor !== undefined && selectedRoom.floor !== null
                    ? `Floor ${selectedRoom.floor}`
                    : "No floor set"}{" "}
                  •{" "}
                  {selectedRoom
                    ? (() => {
                        const c = occupantCountMap[selectedRoom.id] ?? 0;
                        const m = localMaxOccupants;
                        return `${c}/${m} occupants`;
                      })()
                    : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDetailVisible(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.detailContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleDetailRefresh} />
              }
            >
              {/* ── Capacity control ─────────────────────────────────────── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionBoxHeader}>
                  <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.sectionBoxTitle}>Maximum Capacity</Text>
                  {capacitySaving && (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 6 }} />
                  )}
                </View>
                <View style={styles.capacityRow}>
                  <TouchableOpacity
                    style={[styles.capacityBtn, localMaxOccupants <= 1 && styles.capacityBtnDisabled]}
                    onPress={() => adjustCapacity(-1)}
                    disabled={localMaxOccupants <= 1 || capacitySaving}
                  >
                    <Ionicons
                      name="remove"
                      size={20}
                      color={localMaxOccupants <= 1 ? COLORS.secondary : COLORS.text}
                    />
                  </TouchableOpacity>
                  <View style={styles.capacityValueBox}>
                    <Text style={styles.capacityValue}>{localMaxOccupants}</Text>
                    <Text style={styles.capacityLabel}>max occupants</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.capacityBtn}
                    onPress={() => adjustCapacity(1)}
                    disabled={capacitySaving}
                  >
                    <Ionicons name="add" size={20} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {/* Visual fill bar */}
                <View style={styles.capacityBarBg}>
                  <View
                    style={[
                      styles.capacityBarFill,
                      {
                        width:
                          localMaxOccupants > 0
                            ? `${Math.min(
                                ((occupantCountMap[selectedRoom?.id ?? ""] ?? 0) /
                                  localMaxOccupants) *
                                  100,
                                100
                              )}%`
                            : "0%",
                        backgroundColor:
                          (occupantCountMap[selectedRoom?.id ?? ""] ?? 0) >= localMaxOccupants
                            ? COLORS.danger
                            : COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.capacityHint}>
                  {occupantCountMap[selectedRoom?.id ?? ""] ?? 0} of {localMaxOccupants} slots used
                </Text>
              </View>

              {/* ── Occupants list ────────────────────────────────────────── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionBoxHeader}>
                  <Ionicons name="person-outline" size={16} color={COLORS.purple} />
                  <Text style={styles.sectionBoxTitle}>Current Occupants</Text>
                </View>

                {occupantsLoading ? (
                  <View style={styles.occupantsLoader}>
                    <ActivityIndicator color={COLORS.primary} />
                    <Text style={styles.occupantsLoaderText}>Loading occupants…</Text>
                  </View>
                ) : occupants.length === 0 ? (
                  <View style={styles.emptyOccupants}>
                    <Ionicons name="home-outline" size={30} color={COLORS.border} />
                    <Text style={styles.emptyOccupantsText}>No active occupants</Text>
                  </View>
                ) : (
                  occupants.map((occ, idx) => (
                    <View
                      key={occ.id}
                      style={[
                        styles.occupantRow,
                        idx < occupants.length - 1 && styles.occupantRowBorder,
                      ]}
                    >
                      <View style={styles.occupantAvatar}>
                        <Text style={styles.occupantAvatarText}>
                          {(occ.user?.firstName?.[0] || occ.user?.email?.[0] || "?").toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.occupantName}>{getOccupantName(occ)}</Text>
                        <Text style={styles.occupantMeta}>
                          {occ.user?.email || "No email"} • Joined {occ.joiningDate ?? "–"}
                        </Text>
                        {occ.monthlyFee !== null && occ.monthlyFee !== undefined && (
                          <Text style={styles.occupantFee}>
                            ₹{Number(occ.monthlyFee).toLocaleString()}/mo
                          </Text>
                        )}
                      </View>
                      {/* Transfer button */}
                      <TouchableOpacity
                        style={styles.transferBtn}
                        onPress={() => {
                          setTransferOccupant(occ);
                          setTransferTargetId("");
                          setShowTransferPicker(true);
                        }}
                      >
                        <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.transferBtnText}>Move</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* ── Transfer picker modal ─────────────────────────────────── */}
              {showTransferPicker && transferOccupant && (
                <View style={styles.transferPanel}>
                  <View style={styles.transferPanelHeader}>
                    <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
                    <Text style={styles.transferPanelTitle}>
                      Move {getOccupantName(transferOccupant)}
                    </Text>
                    <TouchableOpacity onPress={() => setShowTransferPicker(false)}>
                      <Ionicons name="close-circle" size={20} color={COLORS.secondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.transferPanelSub}>Select destination room:</Text>

                  <ScrollView
                    style={styles.roomPickerList}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {transferableRooms.map((r) => {
                      const cnt = occupantCountMap[r.id] ?? 0;
                      const max = r.maxOccupants ?? 0;
                      const isFull = max > 0 && cnt >= max;
                      const isSelected = transferTargetId === r.id;
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={[
                            styles.roomPickerItem,
                            isSelected && styles.roomPickerItemSelected,
                            isFull && styles.roomPickerItemFull,
                          ]}
                          onPress={() => !isFull && setTransferTargetId(r.id)}
                          disabled={isFull}
                        >
                          <Ionicons
                            name="home-outline"
                            size={16}
                            color={
                              isFull
                                ? COLORS.secondary
                                : isSelected
                                ? COLORS.primary
                                : COLORS.text
                            }
                          />
                          <Text
                            style={[
                              styles.roomPickerItemText,
                              isSelected && { color: COLORS.primary, fontWeight: "800" },
                              isFull && { color: COLORS.secondary },
                            ]}
                          >
                            Room {r.roomNumber}
                            {r.floor !== null && r.floor !== undefined
                              ? ` (F${r.floor})`
                              : ""}
                          </Text>
                          <Text
                            style={[
                              styles.roomPickerOccupancy,
                              isFull && { color: COLORS.danger },
                            ]}
                          >
                            {cnt}
                            {max > 0 ? `/${max}` : ""}{" "}
                            {isFull ? "• Full" : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TouchableOpacity
                    style={[
                      styles.transferConfirmBtn,
                      (!transferTargetId || transferSaving) && { opacity: 0.5 },
                    ]}
                    disabled={!transferTargetId || transferSaving}
                    onPress={doTransfer}
                  >
                    {transferSaving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                        <Text style={styles.transferConfirmText}>Confirm Transfer</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Room info / delete ────────────────────────────────────── */}
              <View style={styles.sectionBox}>
                <View style={styles.sectionBoxHeader}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.orange} />
                  <Text style={styles.sectionBoxTitle}>Room Info</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Room Number</Text>
                  <Text style={styles.infoVal}>{selectedRoom?.roomNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Floor</Text>
                  <Text style={styles.infoVal}>
                    {selectedRoom?.floor !== undefined && selectedRoom.floor !== null
                      ? `Floor ${selectedRoom.floor}`
                      : "—"}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoKey}>Status</Text>
                  <Text style={styles.infoVal}>{selectedRoom?.status ?? "ACTIVE"}</Text>
                </View>

                <TouchableOpacity
                  style={styles.deleteRoomBtn}
                  onPress={() => {
                    setDetailVisible(false);
                    setTimeout(() => selectedRoom && onDeleteRoom(selectedRoom), 300);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.deleteRoomBtnText}>Delete This Room</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 40 },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  statChipText: { fontSize: 12, fontWeight: "700" },

  // Action row
  actionRow: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  smallPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  // Room grid
  roomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  roomCard: {
    width: "47%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  roomCardStrip: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roomCardBody: {
    padding: 12,
    gap: 4,
  },
  roomNumber: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  roomFloor: { fontSize: 11, color: COLORS.secondary },
  occupancyBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grayFill,
    marginTop: 6,
    overflow: "hidden",
  },
  occupancyBarFill: {
    height: 4,
    borderRadius: 2,
  },
  roomCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  occupantCount: { fontSize: 11, fontWeight: "700" },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 9, fontWeight: "800" },
  roomDeleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: COLORS.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },

  // Add room modal
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

  // Detail sheet
  detailBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)" },
  detailDismissArea: { flex: 1 },
  detailSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 12,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  detailSubtitle: { fontSize: 12, color: COLORS.secondary, marginTop: 3 },
  detailContent: { padding: 20, paddingBottom: 40, gap: 14 },

  // Section box
  sectionBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    backgroundColor: COLORS.card,
    gap: 10,
  },
  sectionBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionBoxTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text, flex: 1 },

  // Capacity
  capacityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  capacityBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.grayFill,
    alignItems: "center",
    justifyContent: "center",
  },
  capacityBtnDisabled: { opacity: 0.4 },
  capacityValueBox: { alignItems: "center" },
  capacityValue: { fontSize: 28, fontWeight: "900", color: COLORS.text },
  capacityLabel: { fontSize: 11, color: COLORS.secondary, marginTop: 2 },
  capacityBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.grayFill,
    overflow: "hidden",
  },
  capacityBarFill: {
    height: 6,
    borderRadius: 3,
  },
  capacityHint: { fontSize: 11, color: COLORS.secondary, textAlign: "center" },

  // Occupants
  occupantsLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  occupantsLoaderText: { color: COLORS.secondary, fontSize: 13 },
  emptyOccupants: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyOccupantsText: { color: COLORS.secondary, fontSize: 13 },
  occupantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  occupantRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  occupantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  occupantAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },
  occupantName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  occupantMeta: { fontSize: 11, color: COLORS.secondary, marginTop: 2 },
  occupantFee: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: "700",
    marginTop: 2,
  },
  transferBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  transferBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },

  // Transfer panel
  transferPanel: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 18,
    padding: 14,
    backgroundColor: COLORS.primaryLight,
    gap: 10,
  },
  transferPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  transferPanelTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
    flex: 1,
  },
  transferPanelSub: {
    fontSize: 12,
    color: COLORS.primaryDark,
  },
  roomPickerList: { maxHeight: 180 },
  roomPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    marginBottom: 6,
  },
  roomPickerItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#EFF6FF",
  },
  roomPickerItemFull: {
    opacity: 0.5,
  },
  roomPickerItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  roomPickerOccupancy: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: "600",
  },
  transferConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 13,
    paddingVertical: 12,
  },
  transferConfirmText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  // Room info
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoKey: { fontSize: 13, color: COLORS.secondary },
  infoVal: { fontSize: 13, fontWeight: "700", color: COLORS.text },
  deleteRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 4,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 12,
    paddingVertical: 11,
  },
  deleteRoomBtnText: { color: COLORS.danger, fontWeight: "700", fontSize: 14 },
});
