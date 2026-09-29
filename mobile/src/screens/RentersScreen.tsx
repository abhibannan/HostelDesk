import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Hostel, Renter, Room } from "../types";
import { getName, getEmail, money } from "../utils/formatters";
import { Header, EmptyState } from "../components/common";
import { CalendarPickerModal } from "../components/CalendarPickerModal";

interface RentersScreenProps {
  renters: Renter[];
  activeRenters: Renter[];
  rooms: Room[];
  activeRooms: Room[];
  selectedHostel?: Hostel;
  renterSearch: string;
  setRenterSearch: (text: string) => void;
  // Detail Modal
  showRenterDetailsModal: boolean;
  setShowRenterDetailsModal: (show: boolean) => void;
  selectedRenter: Renter | null;
  renterDetailsLoading: boolean;
  onOpenRenterDetails: (renter: Renter) => void;
  onOpenEditRenter: (renter: Renter) => void;
  onRemoveRenter: (renter: Renter) => void;
  // Add Renter Modal
  showRenterModal: boolean;
  setShowRenterModal: (show: boolean) => void;
  onOpenRenterModal: () => void;
  firstName: string;
  setFirstName: (text: string) => void;
  lastName: string;
  setLastName: (text: string) => void;
  renterEmail: string;
  setRenterEmail: (text: string) => void;
  renterPhone: string;
  setRenterPhone: (text: string) => void;
  guardianName: string;
  setGuardianName: (text: string) => void;
  guardianPhone: string;
  setGuardianPhone: (text: string) => void;
  address: string;
  setAddress: (text: string) => void;
  city: string;
  setCity: (text: string) => void;
  state: string;
  setState: (text: string) => void;
  pincode: string;
  setPincode: (text: string) => void;
  renterPassword: string;
  setRenterPassword: (text: string) => void;
  showRenterPassword: boolean;
  setShowRenterPassword: (show: boolean | ((v: boolean) => boolean)) => void;
  renterRoomId: string;
  setRenterRoomId: (id: string) => void;
  joiningDate: string;
  setJoiningDate: (date: string) => void;
  monthlyFee: string;
  setMonthlyFee: (fee: string) => void;
  securityDeposit: string;
  setSecurityDeposit: (deposit: string) => void;
  renterSaving: boolean;
  onAddRenter: () => void;
  renterRoomPickerOpen: boolean;
  setRenterRoomPickerOpen: (open: boolean) => void;
  // Edit Renter Modal
  showEditRenterModal: boolean;
  setShowEditRenterModal: (show: boolean) => void;
  editingRenterId: string;
  editFirstName: string;
  setEditFirstName: (text: string) => void;
  editLastName: string;
  setEditLastName: (text: string) => void;
  editPhone: string;
  setEditPhone: (text: string) => void;
  editGuardianName: string;
  setEditGuardianName: (text: string) => void;
  editGuardianPhone: string;
  setEditGuardianPhone: (phone: string) => void;
  editAddress: string;
  setEditAddress: (text: string) => void;
  editCity: string;
  setEditCity: (text: string) => void;
  editState: string;
  setEditState: (text: string) => void;
  editPincode: string;
  setEditPincode: (text: string) => void;
  editRenterRoomId: string;
  setEditRenterRoomId: (id: string) => void;
  editJoiningDate: string;
  setEditJoiningDate: (date: string) => void;
  editMonthlyFee: string;
  setEditMonthlyFee: (fee: string) => void;
  editSecurityDeposit: string;
  setEditSecurityDeposit: (deposit: string) => void;
  editRenterStatus: string;
  setEditRenterStatus: (status: string) => void;
  editRenterSaving: boolean;
  onUpdateRenter: () => void;
  editRenterRoomPickerOpen: boolean;
  setEditRenterRoomPickerOpen: (open: boolean) => void;
  onRefresh: () => void;
}

function RenterDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "-"}</Text>
    </View>
  );
}

export function RentersScreen(props: RentersScreenProps) {
  const {
    renters,
    activeRenters,
    rooms,
    activeRooms,
    selectedHostel,
    renterSearch,
    setRenterSearch,
    showRenterDetailsModal,
    setShowRenterDetailsModal,
    selectedRenter,
    renterDetailsLoading,
    onOpenRenterDetails,
    onOpenEditRenter,
    onRemoveRenter,
    showRenterModal,
    setShowRenterModal,
    onOpenRenterModal,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    renterEmail,
    setRenterEmail,
    renterPhone,
    setRenterPhone,
    guardianName,
    setGuardianName,
    guardianPhone,
    setGuardianPhone,
    address,
    setAddress,
    city,
    setCity,
    state,
    setState,
    pincode,
    setPincode,
    renterPassword,
    setRenterPassword,
    showRenterPassword,
    setShowRenterPassword,
    renterRoomId,
    setRenterRoomId,
    joiningDate,
    setJoiningDate,
    monthlyFee,
    setMonthlyFee,
    securityDeposit,
    setSecurityDeposit,
    renterSaving,
    onAddRenter,
    renterRoomPickerOpen,
    setRenterRoomPickerOpen,
    showEditRenterModal,
    setShowEditRenterModal,
    editingRenterId,
    editFirstName,
    setEditFirstName,
    editLastName,
    setEditLastName,
    editPhone,
    setEditPhone,
    editGuardianName,
    setEditGuardianName,
    editGuardianPhone,
    setEditGuardianPhone,
    editAddress,
    setEditAddress,
    editCity,
    setEditCity,
    editState,
    setEditState,
    editPincode,
    setEditPincode,
    editRenterRoomId,
    setEditRenterRoomId,
    editJoiningDate,
    setEditJoiningDate,
    editMonthlyFee,
    setEditMonthlyFee,
    editSecurityDeposit,
    setEditSecurityDeposit,
    editRenterStatus,
    setEditRenterStatus,
    editRenterSaving,
    onUpdateRenter,
    editRenterRoomPickerOpen,
    setEditRenterRoomPickerOpen,
    onRefresh,
  } = props;

  const [calendarTarget, setCalendarTarget] = useState<"add" | "edit" | null>(null);
  const selectedRoom = rooms.find((room) => room.id === renterRoomId);
  const editSelectedRoom = rooms.find((room) => room.id === editRenterRoomId);
  const normalizedSearch = renterSearch.trim().toLowerCase();

  const filteredRenters = normalizedSearch
    ? renters.filter((renter) => {
        const roomNumber =
          renter.room?.roomNumber ||
          rooms.find((room) => room.id === renter.roomId)?.roomNumber ||
          "";

        const searchableText = [
          getName(renter),
          getEmail(renter),
          renter.phone,
          renter.user?.phone,
          renter.guardianPhone,
          roomNumber,
          renter.roomId,
          renter.joiningDate,
          renter.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
    : renters;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header
          title="Renters"
          subtitle={selectedHostel?.name || "Select a hostel"}
          onRefresh={onRefresh}
        />

        <View style={styles.actionRow}>
          <View>
            <Text style={styles.sectionTitle}>Renter management</Text>
            <Text style={styles.sectionSubtitle}>
              {activeRenters.length} active renter{activeRenters.length === 1 ? "" : "s"}
            </Text>
          </View>
          <TouchableOpacity style={styles.smallPrimaryButton} onPress={onOpenRenterModal}>
            <Ionicons name="person-add-outline" size={19} color="#FFFFFF" />
            <Text style={styles.smallPrimaryText}>Add Renter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.renterSearchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.secondary} />
          <TextInput
            style={styles.renterSearchInput}
            value={renterSearch}
            onChangeText={setRenterSearch}
            placeholder="Search name, email, phone, guardian or room"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {renterSearch.length > 0 ? (
            <TouchableOpacity onPress={() => setRenterSearch("")}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {renters.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No renters found"
            description="Add a renter account and assign a room."
          />
        ) : filteredRenters.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No matching renters"
            description="Try a different name, phone number, email, guardian number or room number."
          />
        ) : (
          filteredRenters.map((renter) => {
            const active = String(renter.status || "ACTIVE").toUpperCase() === "ACTIVE";
            const roomNumber =
              renter.room?.roomNumber ||
              rooms.find((room) => room.id === renter.roomId)?.roomNumber ||
              "-";

            return (
              <Pressable
                key={renter.id}
                style={styles.renterCard}
                onPress={() => onOpenRenterDetails(renter)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {getName(renter).charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{getName(renter)}</Text>
                  {getEmail(renter) ? (
                    <Text style={styles.itemSubtitle}>{getEmail(renter)}</Text>
                  ) : null}
                  {renter.phone || renter.user?.phone ? (
                    <Text style={styles.itemSubtitle}>
                      Phone: {renter.phone || renter.user?.phone}
                    </Text>
                  ) : null}
                  {renter.guardianPhone ? (
                    <Text style={styles.itemSubtitle}>Guardian: {renter.guardianPhone}</Text>
                  ) : null}
                  <Text style={styles.roomTag}>Room {roomNumber}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: active ? COLORS.successLight : COLORS.dangerLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: active ? COLORS.success : COLORS.danger },
                    ]}
                  >
                    {active ? "ACTIVE" : String(renter.status || "INACTIVE")}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* RENTER DETAILS MODAL */}
      <Modal
        visible={showRenterDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRenterDetailsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCardLarge}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.modalTitle}>Renter Details</Text>
                    <Text style={styles.modalSubtitle}>
                      Complete renter account, room and financial information.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowRenterDetailsModal(false)}
                  >
                    <Ionicons name="close" size={22} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>

                {renterDetailsLoading ? (
                  <View style={styles.renterDetailsLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.itemSubtitle}>Loading latest renter details…</Text>
                  </View>
                ) : null}

                {selectedRenter ? (
                  <>
                    <View style={styles.renterDetailsHero}>
                      <View style={styles.avatarLarge}>
                        <Text style={styles.avatarLargeText}>
                          {getName(selectedRenter).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.renterDetailsName}>{getName(selectedRenter)}</Text>
                        <Text style={styles.itemSubtitle}>
                          {getEmail(selectedRenter) || "No email"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              String(selectedRenter.status || "ACTIVE").toUpperCase() === "ACTIVE"
                                ? COLORS.successLight
                                : COLORS.dangerLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                String(selectedRenter.status || "ACTIVE").toUpperCase() === "ACTIVE"
                                ? COLORS.success
                                : COLORS.danger,
                            },
                          ]}
                        >
                          {String(selectedRenter.status || "ACTIVE").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.renterDetailSectionTitle}>Contact</Text>
                    <View style={styles.renterDetailsGrid}>
                      <RenterDetail label="First name" value={selectedRenter.user?.firstName || "-"} />
                      <RenterDetail label="Last name" value={selectedRenter.user?.lastName || "-"} />
                      <RenterDetail label="Email" value={getEmail(selectedRenter) || "-"} />
                      <RenterDetail label="Phone" value={selectedRenter.phone || selectedRenter.user?.phone || "-"} />
                      <RenterDetail label="Guardian number" value={selectedRenter.guardianPhone || "-"} />
                      <RenterDetail label="Gender" value={selectedRenter.user?.gender || "-"} />
                      <RenterDetail label="Date of birth" value={selectedRenter.user?.dateOfBirth || "-"} />
                      <RenterDetail label="Emergency contact" value={selectedRenter.user?.emergencyContactName || "-"} />
                      <RenterDetail label="Emergency phone" value={selectedRenter.user?.emergencyContactPhone || "-"} />
                    </View>

                    <Text style={styles.renterDetailSectionTitle}>Address</Text>
                    <View style={styles.renterDetailsGrid}>
                      <RenterDetail label="Address" value={selectedRenter.user?.address || "-"} />
                      <RenterDetail label="City" value={selectedRenter.user?.city || "-"} />
                      <RenterDetail label="State" value={selectedRenter.user?.state || "-"} />
                      <RenterDetail label="Pincode" value={selectedRenter.user?.pincode || "-"} />
                    </View>

                    <Text style={styles.renterDetailSectionTitle}>Stay & Financial</Text>
                    <View style={styles.renterDetailsGrid}>
                      <RenterDetail
                        label="Room"
                        value={
                          selectedRenter.room?.roomNumber
                            ? `Room ${selectedRenter.room.roomNumber}`
                            : "-"
                        }
                      />
                      <RenterDetail
                        label="Floor"
                        value={
                          selectedRenter.room?.floor !== null && selectedRenter.room?.floor !== undefined
                            ? String(selectedRenter.room.floor)
                            : "-"
                        }
                      />
                      <RenterDetail label="Joining date" value={selectedRenter.joiningDate || "-"} />
                      <RenterDetail label="Monthly fee" value={money(Number(selectedRenter.monthlyFee || 0))} />
                      <RenterDetail label="Security deposit" value={money(Number(selectedRenter.securityDeposit || 0))} />
                      <RenterDetail label="Renter ID" value={selectedRenter.id} />
                      <RenterDetail label="User ID" value={selectedRenter.user?.id || "-"} />
                    </View>

                    <View style={styles.renterDetailsActions}>
                      <TouchableOpacity
                        style={[styles.editButton, { flex: 1, justifyContent: "center", paddingVertical: 12 }]}
                        onPress={() => onOpenEditRenter(selectedRenter)}
                      >
                        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.editButtonText}>Edit renter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.removeButton, { flex: 1, justifyContent: "center", paddingVertical: 12 }]}
                        onPress={() => onRemoveRenter(selectedRenter)}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        <Text style={styles.removeButtonText}>Delete renter</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <EmptyState
                    icon="person-outline"
                    title="Renter details unavailable"
                    description="Close this window and try again."
                  />
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ADD RENTER MODAL */}
      <Modal
        visible={showRenterModal}
        transparent
        animationType="slide"
        onRequestClose={() => !renterSaving && setShowRenterModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCardLarge}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Add Renter</Text>
                    <Text style={styles.modalSubtitle}>Create login, assign a room and save renter details.</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowRenterModal(false)}>
                    <Ionicons name="close" size={22} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>First name *</Text>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#94A3B8" />

                <Text style={styles.label}>Last name</Text>
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#94A3B8" />

                <Text style={styles.label}>Email *</Text>
                <TextInput style={styles.input} value={renterEmail} onChangeText={setRenterEmail} placeholder="renter@example.com" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" />

                <Text style={styles.label}>Phone (optional for first time)</Text>
                <TextInput style={styles.input} value={renterPhone} onChangeText={setRenterPhone} placeholder="Renter phone number (optional)" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

                <Text style={styles.label}>Guardian name (optional)</Text>
                <TextInput style={styles.input} value={guardianName} onChangeText={setGuardianName} placeholder="Guardian full name (optional)" placeholderTextColor="#94A3B8" />

                <Text style={styles.label}>Guardian number (optional)</Text>
                <TextInput style={styles.input} value={guardianPhone} onChangeText={setGuardianPhone} placeholder="Guardian phone number (optional)" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

                <Text style={styles.label}>Initial Password (Optional)</Text>
                <View style={styles.inputWithIcon}>
                  <TextInput
                    style={styles.inputWithIconText}
                    value={renterPassword}
                    onChangeText={setRenterPassword}
                    placeholder="Leave blank or min 6 characters"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showRenterPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowRenterPassword((v) => !v)}>
                    <Ionicons name={showRenterPassword ? "eye-off-outline" : "eye-outline"} size={21} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.passwordHint}>
                  Optional. The resident can log in via Google or set/create their own password anytime.
                </Text>

                <Text style={styles.label}>Room *</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setRenterRoomPickerOpen(true)}>
                  <Text style={[styles.selectorText, !selectedRoom && { color: "#94A3B8" }]}>
                    {selectedRoom ? `Room ${selectedRoom.roomNumber}` : "Select active room"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                </TouchableOpacity>

                <Text style={styles.label}>Joining & Recurring Due Date *</Text>
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={() => setCalendarTarget("add")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateSelectorText}>
                      {joiningDate || "Select recurring date"}
                    </Text>
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>
                      {joiningDate ? `Day ${parseInt(joiningDate.slice(8, 10), 10) || 1} monthly` : "Pick Date"}
                    </Text>
                  </View>
                </TouchableOpacity>
                {joiningDate ? (
                  <View style={styles.recurringHintBox}>
                    <Ionicons name="notifications-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.recurringHintText}>
                      Rent will automatically recur on Day {parseInt(joiningDate.slice(8, 10), 10) || 1} of every month with auto-notifications.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Monthly fee *</Text>
                <TextInput style={styles.input} value={monthlyFee} onChangeText={setMonthlyFee} placeholder="Example: 8000" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" />

                <Text style={styles.label}>Security deposit</Text>
                <TextInput style={styles.input} value={securityDeposit} onChangeText={setSecurityDeposit} placeholder="Example: 8000" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" />

                <Text style={[styles.label, { marginTop: 16, fontWeight: "700" }]}>Resident Address (Optional)</Text>
                <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Street address (optional)" placeholderTextColor="#94A3B8" />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>City (optional)</Text>
                    <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor="#94A3B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>State (optional)</Text>
                    <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="State" placeholderTextColor="#94A3B8" />
                  </View>
                </View>

                <Text style={styles.label}>Pincode (optional)</Text>
                <TextInput style={styles.input} value={pincode} onChangeText={setPincode} placeholder="Pincode" placeholderTextColor="#94A3B8" keyboardType="numeric" />

                <TouchableOpacity style={styles.primaryButton} disabled={renterSaving} onPress={onAddRenter}>
                  {renterSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Create Renter</Text>
                      <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* RENTER ROOM PICKER */}
      <Modal visible={renterRoomPickerOpen} transparent animationType="slide" onRequestClose={() => setRenterRoomPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select room</Text>
                <Text style={styles.modalSubtitle}>Active rooms in this hostel</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setRenterRoomPickerOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            {activeRooms.length === 0 ? (
              <EmptyState icon="grid-outline" title="No active rooms" description="Add an active room before creating a renter." />
            ) : (
              activeRooms.map((room) => {
                const occupied = activeRenters.some((r) => r.roomId === room.id);
                return (
                  <Pressable
                    key={room.id}
                    disabled={occupied}
                    style={[styles.pickerRow, room.id === renterRoomId && styles.pickerSelected, occupied && { opacity: 0.45 }]}
                    onPress={() => {
                      setRenterRoomId(room.id);
                      setRenterRoomPickerOpen(false);
                    }}
                  >
                    <View style={styles.pickerIcon}>
                      <Ionicons name="home-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>Room {room.roomNumber}</Text>
                      <Text style={styles.itemSubtitle}>
                        {occupied ? "Occupied" : room.floor !== undefined ? `Floor ${room.floor}` : "Floor not set"}
                      </Text>
                    </View>
                    {room.id === renterRoomId ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : null}
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </Modal>

      {/* EDIT RENTER MODAL */}
      <Modal visible={showEditRenterModal} transparent animationType="slide" onRequestClose={() => !editRenterSaving && setShowEditRenterModal(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalCardLarge}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Edit Renter</Text>
                    <Text style={styles.modalSubtitle}>Update assignment and renter details.</Text>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowEditRenterModal(false)}>
                    <Ionicons name="close" size={22} color={COLORS.secondary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Room *</Text>
                <TouchableOpacity style={styles.selector} onPress={() => setEditRenterRoomPickerOpen(true)}>
                  <Text style={[styles.selectorText, !editSelectedRoom && { color: "#94A3B8" }]}>
                    {editSelectedRoom ? `Room ${editSelectedRoom.roomNumber}` : "Select active room"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>First name</Text>
                    <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} placeholder="First name" placeholderTextColor="#94A3B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Last name</Text>
                    <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} placeholder="Last name" placeholderTextColor="#94A3B8" />
                  </View>
                </View>

                <Text style={styles.label}>Phone number</Text>
                <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="Renter phone number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

                <Text style={styles.label}>Guardian name</Text>
                <TextInput style={styles.input} value={editGuardianName} onChangeText={setEditGuardianName} placeholder="Guardian full name" placeholderTextColor="#94A3B8" />

                <Text style={styles.label}>Guardian number</Text>
                <TextInput style={styles.input} value={editGuardianPhone} onChangeText={setEditGuardianPhone} placeholder="Guardian phone number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

                <Text style={[styles.label, { marginTop: 14, fontWeight: "700" }]}>Resident Address</Text>
                <TextInput style={styles.input} value={editAddress} onChangeText={setEditAddress} placeholder="Street address" placeholderTextColor="#94A3B8" />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>City</Text>
                    <TextInput style={styles.input} value={editCity} onChangeText={setEditCity} placeholder="City" placeholderTextColor="#94A3B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>State</Text>
                    <TextInput style={styles.input} value={editState} onChangeText={setEditState} placeholder="State" placeholderTextColor="#94A3B8" />
                  </View>
                </View>

                <Text style={styles.label}>Pincode</Text>
                <TextInput style={styles.input} value={editPincode} onChangeText={setEditPincode} placeholder="Pincode" placeholderTextColor="#94A3B8" keyboardType="numeric" />

                <Text style={styles.label}>Joining & Recurring Due Date *</Text>
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={() => setCalendarTarget("edit")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateSelectorText}>
                      {editJoiningDate || "Select recurring date"}
                    </Text>
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeText}>
                      {editJoiningDate ? `Day ${parseInt(editJoiningDate.slice(8, 10), 10) || 1} monthly` : "Pick Date"}
                    </Text>
                  </View>
                </TouchableOpacity>
                {editJoiningDate ? (
                  <View style={styles.recurringHintBox}>
                    <Ionicons name="notifications-outline" size={15} color={COLORS.primary} />
                    <Text style={styles.recurringHintText}>
                      Rent will automatically recur on Day {parseInt(editJoiningDate.slice(8, 10), 10) || 1} of every month with auto-notifications.
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.label}>Monthly fee *</Text>
                <TextInput style={styles.input} value={editMonthlyFee} onChangeText={setEditMonthlyFee} placeholder="Monthly fee" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" />

                <Text style={styles.label}>Security deposit</Text>
                <TextInput style={styles.input} value={editSecurityDeposit} onChangeText={setEditSecurityDeposit} placeholder="Security deposit" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" />

                <Text style={styles.label}>Status</Text>
                <View style={styles.statusSelectorRow}>
                  {["ACTIVE", "INACTIVE", "LEFT"].map((status) => (
                    <TouchableOpacity key={status} style={[styles.statusSelectorButton, editRenterStatus === status && styles.statusSelectorButtonActive]} onPress={() => setEditRenterStatus(status)}>
                      <Text style={[styles.statusSelectorText, editRenterStatus === status && styles.statusSelectorTextActive]}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.primaryButton} disabled={editRenterSaving} onPress={onUpdateRenter}>
                  {editRenterSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryButtonText}>Save Changes</Text><Ionicons name="checkmark" size={19} color="#FFFFFF" /></>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* EDIT RENTER ROOM PICKER */}
      <Modal visible={editRenterRoomPickerOpen} transparent animationType="slide" onRequestClose={() => setEditRenterRoomPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select room</Text>
                <Text style={styles.modalSubtitle}>Only unoccupied active rooms can be assigned.</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setEditRenterRoomPickerOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            {activeRooms.length === 0 ? (
              <EmptyState icon="grid-outline" title="No active rooms" description="There are no active rooms available." />
            ) : (
              activeRooms.map((room) => {
                const occupiedByAnother = activeRenters.some((r) => r.id !== editingRenterId && r.roomId === room.id);
                const selected = room.id === editRenterRoomId;
                return (
                  <Pressable
                    key={room.id}
                    disabled={occupiedByAnother}
                    style={[styles.pickerRow, selected && styles.pickerSelected, occupiedByAnother && { opacity: 0.45 }]}
                    onPress={() => {
                      setEditRenterRoomId(room.id);
                      setEditRenterRoomPickerOpen(false);
                    }}
                  >
                    <View style={styles.pickerIcon}>
                      <Ionicons name="home-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>Room {room.roomNumber}</Text>
                      <Text style={styles.itemSubtitle}>
                        {occupiedByAnother ? "Occupied" : room.floor !== undefined ? `Floor ${room.floor}` : "Floor not set"}
                      </Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : null}
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </Modal>

      {/* CALENDAR PICKER MODAL */}
      <CalendarPickerModal
        visible={calendarTarget !== null}
        initialDate={calendarTarget === "add" ? joiningDate : editJoiningDate}
        onSelectDate={(selectedDate) => {
          if (calendarTarget === "add") {
            setJoiningDate(selectedDate);
          } else if (calendarTarget === "edit") {
            setEditJoiningDate(selectedDate);
          }
          setCalendarTarget(null);
        }}
        onClose={() => setCalendarTarget(null)}
        title="Select Recurring Due Date"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 34 },
  actionRow: { marginTop: 6, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 12 },
  smallPrimaryButton: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12 },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 4 },
  renterSearchBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, marginBottom: 16 },
  renterSearchInput: { flex: 1, marginLeft: 9, color: COLORS.text, fontSize: 13 },
  renterCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 14, marginBottom: 11, flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { color: COLORS.primary, fontWeight: "800", fontSize: 16 },
  avatarLarge: { width: 50, height: 50, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 13 },
  avatarLargeText: { color: COLORS.primary, fontWeight: "800", fontSize: 19 },
  itemTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  itemSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  roomTag: { marginTop: 5, alignSelf: "flex-start", backgroundColor: COLORS.grayFill, color: COLORS.primaryDark, fontSize: 11, fontWeight: "800", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" },
  modalKeyboard: { width: "100%" },
  modalCardLarge: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  modalSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.grayFill, alignItems: "center", justifyContent: "center" },
  renterDetailsLoading: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 12 },
  renterDetailsHero: { flexDirection: "row", alignItems: "center", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 14 },
  renterDetailsName: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  renterDetailSectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark, marginTop: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  renterDetailsGrid: { gap: 10, marginBottom: 6 },
  detailItem: { paddingVertical: 4 },
  detailLabel: { fontSize: 11, color: COLORS.secondary, fontWeight: "600" },
  detailValue: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  renterDetailsActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  editButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: COLORS.primary, borderRadius: 12 },
  editButtonText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: COLORS.danger, borderRadius: 12, backgroundColor: COLORS.dangerLight },
  removeButtonText: { color: COLORS.danger, fontWeight: "700", fontSize: 13 },
  label: { fontSize: 12, fontWeight: "700", color: COLORS.text, marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.background },
  inputWithIcon: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background },
  inputWithIconText: { flex: 1, fontSize: 14, color: COLORS.text },
  selector: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.background },
  selectorText: { fontSize: 14, color: COLORS.text, fontWeight: "600" },
  primaryButton: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pickerCard: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36, maxHeight: "80%" },
  pickerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerSelected: { backgroundColor: COLORS.primaryLight, borderRadius: 12, paddingHorizontal: 8 },
  pickerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 11 },
  statusSelectorRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  statusSelectorButton: { flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  statusSelectorButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusSelectorText: { fontSize: 12, fontWeight: "700", color: COLORS.secondary },
  statusSelectorTextActive: { color: "#FFFFFF" },
  dateSelector: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
  },
  dateSelectorText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "600",
  },
  dateBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  recurringHintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 9,
    marginTop: 6,
  },
  recurringHintText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    fontWeight: "600",
    lineHeight: 15,
  },
  passwordHint: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: "500",
    marginTop: 5,
    marginBottom: 2,
    fontStyle: "italic",
  },
});
