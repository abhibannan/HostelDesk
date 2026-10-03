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
import { useTheme } from "../contexts/ThemeContext";

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

function RenterDetail({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors?: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View style={styles.detailItem}>
      <Text style={[styles.detailLabel, colors && { color: colors.secondary }]}>{label}</Text>
      <Text style={[styles.detailValue, colors && { color: colors.text }]}>{value || "-"}</Text>
    </View>
  );
}

export function RentersScreen(props: RentersScreenProps) {
  const { colors, isDark } = useTheme();
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

  const currentHostelRenters = selectedHostel?.id
    ? renters.filter((r) => !r.hostelId || r.hostelId === selectedHostel.id)
    : renters;

  const currentHostelRooms = selectedHostel?.id
    ? rooms.filter((r) => !r.hostelId || r.hostelId === selectedHostel.id)
    : rooms;

  const currentActiveRenters = currentHostelRenters.filter(
    (r) => String(r.status || "ACTIVE").toUpperCase() === "ACTIVE"
  );

  const [calendarTarget, setCalendarTarget] = useState<"add" | "edit" | null>(null);
  const selectedRoom = currentHostelRooms.find((room) => room.id === renterRoomId);
  const editSelectedRoom = currentHostelRooms.find((room) => room.id === editRenterRoomId);
  const normalizedSearch = renterSearch.trim().toLowerCase();

  const filteredRenters = normalizedSearch
    ? currentHostelRenters.filter((renter) => {
        const roomNumber =
          renter.room?.roomNumber ||
          currentHostelRooms.find((room) => room.id === renter.roomId)?.roomNumber ||
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
    : currentHostelRenters;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header
          title="Renters"
          subtitle={selectedHostel?.name || "Select a hostel"}
          onRefresh={onRefresh}
        />

        <View style={styles.actionRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Renter management</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>
              {currentActiveRenters.length} active renter{currentActiveRenters.length === 1 ? "" : "s"}
            </Text>
          </View>
          <TouchableOpacity style={[styles.smallPrimaryButton, { backgroundColor: colors.primary }]} onPress={onOpenRenterModal}>
            <Ionicons name="person-add-outline" size={19} color="#FFFFFF" />
            <Text style={styles.smallPrimaryText}>Add Renter</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.renterSearchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.secondary} />
          <TextInput
            style={[styles.renterSearchInput, { color: colors.text }]}
            value={renterSearch}
            onChangeText={setRenterSearch}
            placeholder="Search name, email, phone, guardian or room"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {renterSearch.length > 0 ? (
            <TouchableOpacity onPress={() => setRenterSearch("")}>
              <Ionicons name="close-circle" size={20} color={colors.secondary} />
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
                style={[styles.renterCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => onOpenRenterDetails(renter)}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {getName(renter).charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{getName(renter)}</Text>
                  {getEmail(renter) ? (
                    <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>{getEmail(renter)}</Text>
                  ) : null}
                  {renter.phone || renter.user?.phone ? (
                    <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
                      Phone: {renter.phone || renter.user?.phone}
                    </Text>
                  ) : null}
                  {renter.guardianPhone ? (
                    <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>Guardian: {renter.guardianPhone}</Text>
                  ) : null}
                  <Text style={[styles.roomTag, { backgroundColor: colors.surfaceSecondary, color: colors.primary, borderColor: colors.border, borderWidth: 1 }]}>Room {roomNumber}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: active ? colors.successLight : colors.dangerLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: active ? colors.success : colors.danger },
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
            <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Renter Details</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>
                      Complete renter account, room and financial information.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: colors.grayFill }]}
                    onPress={() => setShowRenterDetailsModal(false)}
                  >
                    <Ionicons name="close" size={22} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                {renterDetailsLoading ? (
                  <View style={styles.renterDetailsLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>Loading latest renter details…</Text>
                  </View>
                ) : null}

                {selectedRenter ? (
                  <>
                    <View style={[styles.renterDetailsHero, { borderBottomColor: colors.border }]}>
                      <View style={[styles.avatarLarge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.avatarLargeText, { color: colors.primary }]}>
                          {getName(selectedRenter).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.renterDetailsName, { color: colors.text }]}>{getName(selectedRenter)}</Text>
                        <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
                          {getEmail(selectedRenter) || "No email"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              String(selectedRenter.status || "ACTIVE").toUpperCase() === "ACTIVE"
                                ? colors.successLight
                                : colors.dangerLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                String(selectedRenter.status || "ACTIVE").toUpperCase() === "ACTIVE"
                                ? colors.success
                                : colors.danger,
                            },
                          ]}
                        >
                          {String(selectedRenter.status || "ACTIVE").toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Section 1: Contact */}
                    <View style={[styles.detailSectionPanel, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 }]}>
                      <Text style={[styles.renterDetailSectionTitle, { color: colors.primary, marginTop: 0 }]}>Contact</Text>
                      <View style={styles.renterDetailsGrid}>
                        <RenterDetail label="First name" value={selectedRenter.user?.firstName || "-"} colors={colors} />
                        <RenterDetail label="Last name" value={selectedRenter.user?.lastName || "-"} colors={colors} />
                        <RenterDetail label="Email" value={getEmail(selectedRenter) || "-"} colors={colors} />
                        <RenterDetail label="Phone" value={selectedRenter.phone || selectedRenter.user?.phone || "-"} colors={colors} />
                        <RenterDetail label="Guardian number" value={selectedRenter.guardianPhone || "-"} colors={colors} />
                        <RenterDetail label="Gender" value={selectedRenter.user?.gender || "-"} colors={colors} />
                        <RenterDetail label="Date of birth" value={selectedRenter.user?.dateOfBirth || "-"} colors={colors} />
                        <RenterDetail label="Emergency contact" value={selectedRenter.user?.emergencyContactName || "-"} colors={colors} />
                        <RenterDetail label="Emergency phone" value={selectedRenter.user?.emergencyContactPhone || "-"} colors={colors} />
                      </View>
                    </View>

                    {/* Section 2: Address */}
                    <View style={[styles.detailSectionPanel, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 }]}>
                      <Text style={[styles.renterDetailSectionTitle, { color: colors.primary, marginTop: 0 }]}>Address</Text>
                      <View style={styles.renterDetailsGrid}>
                        <RenterDetail label="Address" value={selectedRenter.user?.address || "-"} colors={colors} />
                        <RenterDetail label="City" value={selectedRenter.user?.city || "-"} colors={colors} />
                        <RenterDetail label="State" value={selectedRenter.user?.state || "-"} colors={colors} />
                        <RenterDetail label="Pincode" value={selectedRenter.user?.pincode || "-"} colors={colors} />
                      </View>
                    </View>

                    {/* Section 3: Stay & Financial */}
                    <View style={[styles.detailSectionPanel, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 }]}>
                      <Text style={[styles.renterDetailSectionTitle, { color: colors.primary, marginTop: 0 }]}>Stay & Financial</Text>
                      <View style={styles.renterDetailsGrid}>
                        <RenterDetail
                          label="Room"
                          value={
                            selectedRenter.room?.roomNumber
                              ? `Room ${selectedRenter.room.roomNumber}`
                              : "-"
                          }
                          colors={colors}
                        />
                        <RenterDetail
                          label="Floor"
                          value={
                            selectedRenter.room?.floor !== null && selectedRenter.room?.floor !== undefined
                              ? String(selectedRenter.room.floor)
                              : "-"
                          }
                          colors={colors}
                        />
                        <RenterDetail label="Joining date" value={selectedRenter.joiningDate || "-"} colors={colors} />
                        <RenterDetail label="Monthly fee" value={money(Number(selectedRenter.monthlyFee || 0))} colors={colors} />
                        <RenterDetail label="Security deposit" value={money(Number(selectedRenter.securityDeposit || 0))} colors={colors} />
                        {(() => {
                          const roommates = selectedRenter?.roomId
                            ? activeRenters.filter(
                                (r) =>
                                  r.id !== selectedRenter.id &&
                                  r.roomId === selectedRenter.roomId,
                              )
                            : [];
                          if (roommates.length === 0) return null;
                          return (
                            <RenterDetail
                              label="Roommates"
                              value={roommates.map((r) => getName(r)).join(", ")}
                              colors={colors}
                            />
                          );
                        })()}
                        <RenterDetail label="Renter ID" value={selectedRenter.id} colors={colors} />
                        <RenterDetail label="User ID" value={selectedRenter.user?.id || "-"} colors={colors} />
                      </View>
                    </View>

                    <View style={styles.renterDetailsActions}>
                      <TouchableOpacity
                        style={[styles.editButton, { flex: 1, justifyContent: "center", paddingVertical: 12, borderColor: colors.primary }]}
                        onPress={() => onOpenEditRenter(selectedRenter)}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                        <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit renter</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.removeButton, { flex: 1, justifyContent: "center", paddingVertical: 12, backgroundColor: colors.dangerLight, borderColor: colors.danger }]}
                        onPress={() => onRemoveRenter(selectedRenter)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        <Text style={[styles.removeButtonText, { color: colors.danger }]}>Delete renter</Text>
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
            <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Add Renter</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>Create login, assign a room and save renter details.</Text>
                  </View>
                  <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.grayFill }]} onPress={() => setShowRenterModal(false)}>
                    <Ionicons name="close" size={22} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>First name *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor={colors.secondary} />

                <Text style={[styles.label, { color: colors.text }]}>Last name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor={colors.secondary} />

                <Text style={[styles.label, { color: colors.text }]}>Email *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={renterEmail} onChangeText={setRenterEmail} placeholder="renter@example.com" placeholderTextColor={colors.secondary} keyboardType="email-address" autoCapitalize="none" />

                <Text style={[styles.label, { color: colors.text }]}>Phone (optional for first time)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={renterPhone} onChangeText={setRenterPhone} placeholder="Renter phone number (optional)" placeholderTextColor={colors.secondary} keyboardType="phone-pad" />

                <Text style={[styles.label, { color: colors.text }]}>Guardian name (optional)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={guardianName} onChangeText={setGuardianName} placeholder="Guardian full name (optional)" placeholderTextColor={colors.secondary} />

                <Text style={[styles.label, { color: colors.text }]}>Guardian number (optional)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={guardianPhone} onChangeText={setGuardianPhone} placeholder="Guardian phone number (optional)" placeholderTextColor={colors.secondary} keyboardType="phone-pad" />

                <Text style={[styles.label, { color: colors.text }]}>Initial Password (Optional)</Text>
                <View style={[styles.inputWithIcon, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.inputWithIconText, { color: colors.text }]}
                    value={renterPassword}
                    onChangeText={setRenterPassword}
                    placeholder="Leave blank or min 6 characters"
                    placeholderTextColor={colors.secondary}
                    secureTextEntry={!showRenterPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowRenterPassword((v) => !v)}>
                    <Ionicons name={showRenterPassword ? "eye-off-outline" : "eye-outline"} size={21} color={colors.secondary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.passwordHint, { color: colors.secondary }]}>
                  Optional. The resident can log in via Google or set/create their own password anytime.
                </Text>

                <Text style={[styles.label, { color: colors.text }]}>Room *</Text>
                <TouchableOpacity style={[styles.selector, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} onPress={() => setRenterRoomPickerOpen(true)}>
                  <Text style={[styles.selectorText, { color: colors.text }, !selectedRoom && { color: colors.secondary }]}>
                    {selectedRoom ? `Room ${selectedRoom.roomNumber}` : "Select active room"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.secondary} />
                </TouchableOpacity>

                <Text style={[styles.label, { color: colors.text }]}>Joining & Recurring Due Date *</Text>
                <TouchableOpacity
                  style={[styles.dateSelector, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  onPress={() => setCalendarTarget("add")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.dateSelectorText, { color: colors.text }]}>
                      {joiningDate || "Select recurring date"}
                    </Text>
                  </View>
                  <View style={[styles.dateBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.dateBadgeText, { color: colors.primary }]}>
                      {joiningDate ? `Day ${parseInt(joiningDate.slice(8, 10), 10) || 1} monthly` : "Pick Date"}
                    </Text>
                  </View>
                </TouchableOpacity>
                {joiningDate ? (
                  <View style={[styles.recurringHintBox, { backgroundColor: isDark ? "#064E3B" : "#F0FDF4", borderColor: isDark ? "#047857" : "#BBF7D0" }]}>
                    <Ionicons name="notifications-outline" size={15} color={colors.primary} />
                    <Text style={[styles.recurringHintText, { color: isDark ? "#A7F3D0" : "#166534" }]}>
                      Rent will automatically recur on Day {parseInt(joiningDate.slice(8, 10), 10) || 1} of every month with auto-notifications.
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.label, { color: colors.text }]}>Monthly fee *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={monthlyFee} onChangeText={setMonthlyFee} placeholder="Example: 8000" placeholderTextColor={colors.secondary} keyboardType="decimal-pad" />

                <Text style={[styles.label, { color: colors.text }]}>Security deposit</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={securityDeposit} onChangeText={setSecurityDeposit} placeholder="Example: 8000" placeholderTextColor={colors.secondary} keyboardType="decimal-pad" />

                <Text style={[styles.label, { color: colors.text, marginTop: 16, fontWeight: "700" }]}>Resident Address (Optional)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={address} onChangeText={setAddress} placeholder="Street address (optional)" placeholderTextColor={colors.secondary} />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>City (optional)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>State (optional)</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={state} onChangeText={setState} placeholder="State" placeholderTextColor={colors.secondary} />
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Pincode (optional)</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={pincode} onChangeText={setPincode} placeholder="Pincode" placeholderTextColor={colors.secondary} keyboardType="numeric" />

                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} disabled={renterSaving} onPress={onAddRenter}>
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
          <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select room</Text>
                <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>Active rooms in this hostel</Text>
              </View>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.grayFill }]} onPress={() => setRenterRoomPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            {activeRooms.length === 0 ? (
              <EmptyState icon="grid-outline" title="No active rooms" description="Add an active room before creating a renter." />
            ) : (
              activeRooms.map((room) => {
                const occupantsCount = activeRenters.filter((r) => r.roomId === room.id).length;
                const max = Number(room.maxOccupants) || 2;
                const isFull = occupantsCount >= max;
                const isSelected = room.id === renterRoomId;
                return (
                  <Pressable
                    key={room.id}
                    disabled={isFull}
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: colors.border },
                      isSelected && [styles.pickerSelected, { backgroundColor: isDark ? "#1E2A4A" : colors.primaryLight }],
                      isFull && { opacity: 0.45 },
                    ]}
                    onPress={() => {
                      setRenterRoomId(room.id);
                      setRenterRoomPickerOpen(false);
                    }}
                  >
                    <View style={[styles.pickerIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="home-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>Room {room.roomNumber}</Text>
                      <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
                        {isFull
                          ? `Full (${occupantsCount}/${max} beds)`
                          : `${occupantsCount}/${max} beds • ${room.floor !== undefined && room.floor !== null ? `Floor ${room.floor}` : "Floor not set"}`}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
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
            <View style={[styles.modalCardLarge, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Renter</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>Update assignment and renter details.</Text>
                  </View>
                  <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.grayFill }]} onPress={() => setShowEditRenterModal(false)}>
                    <Ionicons name="close" size={22} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Room *</Text>
                <TouchableOpacity style={[styles.selector, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]} onPress={() => setEditRenterRoomPickerOpen(true)}>
                  <Text style={[styles.selectorText, { color: colors.text }, !editSelectedRoom && { color: colors.secondary }]}>
                    {editSelectedRoom ? `Room ${editSelectedRoom.roomNumber}` : "Select active room"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.secondary} />
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>First name</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editFirstName} onChangeText={setEditFirstName} placeholder="First name" placeholderTextColor={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>Last name</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editLastName} onChangeText={setEditLastName} placeholder="Last name" placeholderTextColor={colors.secondary} />
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Phone number</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editPhone} onChangeText={setEditPhone} placeholder="Renter phone number" placeholderTextColor={colors.secondary} keyboardType="phone-pad" />

                <Text style={[styles.label, { color: colors.text }]}>Guardian name</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editGuardianName} onChangeText={setEditGuardianName} placeholder="Guardian full name" placeholderTextColor={colors.secondary} />

                <Text style={[styles.label, { color: colors.text }]}>Guardian number</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editGuardianPhone} onChangeText={setEditGuardianPhone} placeholder="Guardian phone number" placeholderTextColor={colors.secondary} keyboardType="phone-pad" />

                <Text style={[styles.label, { color: colors.text, marginTop: 14, fontWeight: "700" }]}>Resident Address</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editAddress} onChangeText={setEditAddress} placeholder="Street address" placeholderTextColor={colors.secondary} />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>City</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editCity} onChangeText={setEditCity} placeholder="City" placeholderTextColor={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.text }]}>State</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editState} onChangeText={setEditState} placeholder="State" placeholderTextColor={colors.secondary} />
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.text }]}>Pincode</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editPincode} onChangeText={setEditPincode} placeholder="Pincode" placeholderTextColor={colors.secondary} keyboardType="numeric" />

                <Text style={[styles.label, { color: colors.text }]}>Joining & Recurring Due Date *</Text>
                <TouchableOpacity
                  style={[styles.dateSelector, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                  onPress={() => setCalendarTarget("edit")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.dateSelectorText, { color: colors.text }]}>
                      {editJoiningDate || "Select recurring date"}
                    </Text>
                  </View>
                  <View style={[styles.dateBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.dateBadgeText, { color: colors.primary }]}>
                      {editJoiningDate ? `Day ${parseInt(editJoiningDate.slice(8, 10), 10) || 1} monthly` : "Pick Date"}
                    </Text>
                  </View>
                </TouchableOpacity>
                {editJoiningDate ? (
                  <View style={[styles.recurringHintBox, { backgroundColor: isDark ? "#064E3B" : "#F0FDF4", borderColor: isDark ? "#047857" : "#BBF7D0" }]}>
                    <Ionicons name="notifications-outline" size={15} color={colors.primary} />
                    <Text style={[styles.recurringHintText, { color: isDark ? "#A7F3D0" : "#166534" }]}>
                      Rent will automatically recur on Day {parseInt(editJoiningDate.slice(8, 10), 10) || 1} of every month with auto-notifications.
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.label, { color: colors.text }]}>Monthly fee *</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editMonthlyFee} onChangeText={setEditMonthlyFee} placeholder="Monthly fee" placeholderTextColor={colors.secondary} keyboardType="decimal-pad" />

                <Text style={[styles.label, { color: colors.text }]}>Security deposit</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.text }]} value={editSecurityDeposit} onChangeText={setEditSecurityDeposit} placeholder="Security deposit" placeholderTextColor={colors.secondary} keyboardType="decimal-pad" />

                <Text style={[styles.label, { color: colors.text }]}>Status</Text>
                <View style={styles.statusSelectorRow}>
                  {["ACTIVE", "INACTIVE", "LEFT"].map((status) => (
                    <TouchableOpacity key={status} style={[styles.statusSelectorButton, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }, editRenterStatus === status && styles.statusSelectorButtonActive]} onPress={() => setEditRenterStatus(status)}>
                      <Text style={[styles.statusSelectorText, { color: colors.secondary }, editRenterStatus === status && styles.statusSelectorTextActive]}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} disabled={editRenterSaving} onPress={onUpdateRenter}>
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
          <View style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select room</Text>
                <Text style={[styles.modalSubtitle, { color: colors.secondary }]}>Select an active room with available beds.</Text>
              </View>
              <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.grayFill }]} onPress={() => setEditRenterRoomPickerOpen(false)}>
                <Ionicons name="close" size={22} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            {activeRooms.length === 0 ? (
              <EmptyState icon="grid-outline" title="No active rooms" description="There are no active rooms available." />
            ) : (
              activeRooms.map((room) => {
                const otherOccupants = activeRenters.filter((r) => r.id !== editingRenterId && r.roomId === room.id).length;
                const max = Number(room.maxOccupants) || 2;
                const isFull = otherOccupants >= max;
                const selected = room.id === editRenterRoomId;
                return (
                  <Pressable
                    key={room.id}
                    disabled={isFull}
                    style={[
                      styles.pickerRow,
                      { borderBottomColor: colors.border },
                      selected && [styles.pickerSelected, { backgroundColor: isDark ? "#1E2A4A" : colors.primaryLight }],
                      isFull && { opacity: 0.45 },
                    ]}
                    onPress={() => {
                      setEditRenterRoomId(room.id);
                      setEditRenterRoomPickerOpen(false);
                    }}
                  >
                    <View style={[styles.pickerIcon, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="home-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>Room {room.roomNumber}</Text>
                      <Text style={[styles.itemSubtitle, { color: colors.secondary }]}>
                        {isFull
                          ? `Full (${otherOccupants}/${max} beds)`
                          : `${otherOccupants}/${max} beds • ${room.floor !== undefined && room.floor !== null ? `Floor ${room.floor}` : "Floor not set"}`}
                      </Text>
                    </View>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
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
  screenContent: { padding: 20, paddingBottom: 110 },
  actionRow: { marginTop: 6, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 12 },
  smallPrimaryButton: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 12 },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13, marginLeft: 4 },
  renterSearchBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, marginBottom: 16 },
  renterSearchInput: { flex: 1, marginLeft: 9, color: COLORS.text, fontSize: 13 },
  renterCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { color: COLORS.primary, fontWeight: "800", fontSize: 16 },
  avatarLarge: { width: 50, height: 50, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 13 },
  avatarLargeText: { color: COLORS.primary, fontWeight: "800", fontSize: 19 },
  itemTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  itemSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  roomTag: { marginTop: 5, alignSelf: "flex-start", backgroundColor: COLORS.grayFill, color: COLORS.primaryDark, fontSize: 11, fontWeight: "800", borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  detailSectionPanel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    backgroundColor: COLORS.card,
  },
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
