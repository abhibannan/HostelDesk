import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../contexts/ThemeContext";
import { API_URL, parseJsonResponse } from "../services/api";
import { Fee, Hostel, Notification, Payment, Repair, Renter, User } from "../types";
import { money, today } from "../utils/formatters";
import { EmptyState } from "../components/common";

interface RenterPortalScreenProps {
  user: User;
  renter: Renter | null;
  hostel: Hostel | null;
  fees: Fee[];
  payments: Payment[];
  repairs: Repair[];
  notifications: Notification[];
  token?: string | null;
  request?: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  onRefresh: () => void;
  onLogout: () => void;
  onSubmitProof: (params: {
    feeId: string;
    amount: number;
    paymentDate: string;
    proofUri: string;
    proofMimeType?: string | null;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
  onSubmitRepair: (params: {
    title: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }) => Promise<void>;
  scheduleLocalNotification?: (title: string, body: string, data?: Record<string, unknown>) => Promise<void>;
}

const RENTER_TABS = ["details", "fees", "repairs", "notices", "settings"] as const;
type RenterTab = typeof RENTER_TABS[number];

export function RenterPortalScreen({
  user,
  renter,
  hostel,
  fees,
  payments,
  repairs,
  notifications,
  token,
  request,
  onRefresh,
  onLogout,
  onSubmitProof,
  onSubmitRepair,
}: RenterPortalScreenProps) {
  const [activeTab, setActiveTab] = useState<RenterTab>("details");
  const { colors: theme, setTheme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth || Dimensions.get("window").width);
  const pagerRef = useRef<ScrollView>(null);

  // Automatically clean up resolved maintenance notifications from the renter's feed
  React.useEffect(() => {
    const resolvedRepairIds = new Set(
      repairs
        .filter((r) => String(r.status).toUpperCase() === "RESOLVED")
        .map((r) => r.id),
    );

    const staleMaintenanceNotifs = notifications.filter((n) => {
      if (n.entityType === "REPAIR" && n.entityId && resolvedRepairIds.has(n.entityId)) {
        return true;
      }
      return false;
    });

    if (staleMaintenanceNotifs.length > 0) {
      staleMaintenanceNotifs.forEach((n) => {
        if (request) {
          request(`/notifications/${n.id}`, { method: "DELETE" }).catch(() => {});
        } else if (token) {
          fetch(`${API_URL}/notifications/${n.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      });
    }
  }, [notifications, repairs, request, token]);

  const visibleNotifications = notifications.filter((notif) => {
    if (notif.entityType === "REPAIR" && notif.entityId) {
      const isResolved = repairs.some(
        (r) => r.id === notif.entityId && String(r.status).toUpperCase() === "RESOLVED",
      );
      if (isResolved) return false;
    }
    return true;
  });

  // ── Tab switching with horizontal slide ────────────────────────────────────
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - containerWidth) > 1) {
      setContainerWidth(w);
    }
  }, [containerWidth]);

  const handleTabPress = useCallback((tab: RenterTab) => {
    setActiveTab(tab);
    const idx = RENTER_TABS.indexOf(tab);
    if (idx >= 0 && containerWidth > 0) {
      pagerRef.current?.scrollTo({ x: idx * containerWidth, animated: true });
    }
  }, [containerWidth]);

  const onPagerScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (containerWidth > 0) {
      const idx = Math.round(x / containerWidth);
      if (idx >= 0 && idx < RENTER_TABS.length) {
        setActiveTab(RENTER_TABS[idx]);
      }
    }
  }, [containerWidth]);

  // ── Edit Profile State ─────────────────────────────────────────────────────
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGuardianName, setEditGuardianName] = useState("");
  const [editGuardianPhone, setEditGuardianPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPincode, setEditPincode] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  function openEditProfile() {
    setEditFirstName(user.firstName || renter?.user?.firstName || "");
    setEditLastName(user.lastName || renter?.user?.lastName || "");
    setEditPhone(user.phone || renter?.phone || renter?.user?.phone || "");
    setEditGuardianName(renter?.guardianName || "");
    setEditGuardianPhone(renter?.guardianPhone || "");
    setEditAddress(user.address || renter?.user?.address || "");
    setEditCity(user.city || renter?.user?.city || "");
    setEditState(user.state || renter?.user?.state || "");
    setEditPincode(user.pincode || renter?.user?.pincode || "");
    setEditEmergencyName(user.emergencyContactName || renter?.user?.emergencyContactName || "");
    setEditEmergencyPhone(user.emergencyContactPhone || renter?.user?.emergencyContactPhone || "");
    setShowEditProfileModal(true);
  }

  async function handleSaveProfile() {
    if (!editFirstName.trim()) {
      return Alert.alert("First Name Required", "Please enter your first name.");
    }
    setSavingProfile(true);
    try {
      if (request) {
        await request("/auth/me", {
          method: "PATCH",
          body: JSON.stringify({
            firstName: editFirstName.trim(),
            lastName: editLastName.trim() || undefined,
            phone: editPhone.trim() || undefined,
            guardianName: editGuardianName.trim() || undefined,
            guardianPhone: editGuardianPhone.trim() || undefined,
            address: editAddress.trim() || undefined,
            city: editCity.trim() || undefined,
            state: editState.trim() || undefined,
            pincode: editPincode.trim() || undefined,
            emergencyContactName: editEmergencyName.trim() || undefined,
            emergencyContactPhone: editEmergencyPhone.trim() || undefined,
          }),
        });
      } else if (token) {
        const resp = await fetch(`${API_URL}/auth/me`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: editFirstName.trim(),
            lastName: editLastName.trim() || undefined,
            phone: editPhone.trim() || undefined,
            guardianName: editGuardianName.trim() || undefined,
            guardianPhone: editGuardianPhone.trim() || undefined,
            address: editAddress.trim() || undefined,
            city: editCity.trim() || undefined,
            state: editState.trim() || undefined,
            pincode: editPincode.trim() || undefined,
            emergencyContactName: editEmergencyName.trim() || undefined,
            emergencyContactPhone: editEmergencyPhone.trim() || undefined,
          }),
        });
        if (!resp.ok) {
          const d = await parseJsonResponse(resp);
          throw new Error(String((d as any)?.message || "Failed to update profile."));
        }
      }
      setShowEditProfileModal(false);
      await onRefresh();
      Alert.alert("Profile Updated", "Your personal details have been updated successfully.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Password Management State ──────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function handleChangePassword() {
    setPasswordMsg(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "Passwords do not match.", type: "error" });
      return;
    }

    setSavingPassword(true);
    try {
      if (request) {
        await request("/auth/change-password", {
          method: "POST",
          body: JSON.stringify({ password: newPassword }),
        });
      } else if (token) {
        const response = await fetch(`${API_URL}/auth/change-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: newPassword }),
        });
        const data = await parseJsonResponse(response);
        if (!response.ok) {
          throw new Error(String((data as any)?.message || "Failed to update password."));
        }
      } else {
        throw new Error("You are not signed in.");
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({
        text: "Password saved successfully! You can now use this password to sign in.",
        type: "success",
      });
      Alert.alert(
        "Password Saved",
        "Your password has been updated. You can now log into the Resident Portal anytime using your email and password.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      setPasswordMsg({ text: msg, type: "error" });
      Alert.alert("Password Error", msg);
    } finally {
      setSavingPassword(false);
    }
  }

  // ── Delete Payment Proof ───────────────────────────────────────────────────
  async function handleDeletePaymentProof(paymentId: string) {
    const hostelId = hostel?.id || renter?.hostelId;
    if (!hostelId) {
      Alert.alert("Error", "Hostel profile missing.");
      return;
    }

    const executeDelete = async () => {
      try {
        if (request) {
          await request(`/hostels/${hostelId}/payments/${paymentId}`, {
            method: "DELETE",
          });
        } else if (token) {
          const res = await fetch(`${API_URL}/hostels/${hostelId}/payments/${paymentId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const data = await parseJsonResponse(res);
            throw new Error(String((data as any)?.message || "Failed to delete payment proof."));
          }
        }
        await onRefresh();
        Alert.alert("Withdrawn", "Your payment proof submission has been removed. You can now submit a fresh screenshot.");
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : "Failed to withdraw payment proof.");
      }
    };

    Alert.alert(
      "Withdraw Payment Proof",
      "Are you sure you want to withdraw this payment proof? You can submit a fresh screenshot after withdrawal.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Withdraw", style: "destructive", onPress: () => void executeDelete() },
      ],
    );
  }

  // ── Delete Notification ────────────────────────────────────────────────────
  async function handleDeleteNotification(notifId: string) {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to remove this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (request) {
                await request(`/notifications/${notifId}`, { method: "DELETE" });
              } else if (token) {
                await fetch(`${API_URL}/notifications/${notifId}`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
              }
              onRefresh();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete notification.");
            }
          },
        },
      ],
    );
  }

  async function handleClearAllNotifications() {
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all notifications from your feed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              if (request) {
                await request("/notifications/me/clear-all", { method: "DELETE" });
              } else if (token) {
                await fetch(`${API_URL}/notifications/me/clear-all`, {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                });
              }
              onRefresh();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to clear notifications.");
            }
          },
        },
      ],
    );
  }

  // ── Proof Upload Modal State ───────────────────────────────────────────────
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [proofAmount, setProofAmount] = useState("");
  const [proofDate, setProofDate] = useState(today());
  const [proofReference, setProofReference] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [proofMimeType, setProofMimeType] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // ── Repair Complaint Modal State ───────────────────────────────────────────
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairTitle, setRepairTitle] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPriority, setRepairPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [submittingRepair, setSubmittingRepair] = useState(false);

  // ── Image preview modal ────────────────────────────────────────────────────
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Totals
  const totalDue = fees.reduce((acc, fee) => {
    const feeAmt = Number(fee.amount || 0);
    const paidAmt = Number(fee.paidAmount || 0);
    return acc + Math.max(0, feeAmt - paidAmt);
  }, 0);

  const totalPaid = payments
    .filter((p) => String(p.status).toUpperCase() === "APPROVED")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  async function pickImageFromGallery() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow access to photos to upload payment proof.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setProofImageUri(asset.uri);
        setProofMimeType(asset.mimeType ?? null);
      }
    } catch {
      Alert.alert("Error", "Could not pick image from gallery.");
    }
  }

  async function takePhotoWithCamera() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow camera access to capture payment proof.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setProofImageUri(asset.uri);
        setProofMimeType(asset.mimeType ?? null);
      }
    } catch {
      Alert.alert("Error", "Could not open camera.");
    }
  }

  function openProofForFee(fee: Fee) {
    const remaining = Math.max(0, Number(fee.amount || 0) - Number(fee.paidAmount || 0));
    setSelectedFeeId(fee.id);
    setProofAmount(String(remaining > 0 ? remaining : fee.amount));
    setProofDate(today());
    setProofReference("");
    setProofNotes("");
    setProofImageUri(null);
    setProofMimeType(null);
    setShowProofModal(true);
  }

  async function handleSendProof() {
    if (!selectedFeeId) {
      Alert.alert("Missing Fee", "Please choose which month fee you are paying for.");
      return;
    }
    const amt = parseFloat(proofAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid payment amount.");
      return;
    }
    if (!proofImageUri) {
      Alert.alert("Missing Proof", "Please attach a photo or screenshot of your payment receipt/UPI.");
      return;
    }

    setSubmittingProof(true);
    try {
      await onSubmitProof({
        feeId: selectedFeeId,
        amount: amt,
        paymentDate: proofDate || today(),
        proofUri: proofImageUri,
        proofMimeType,
        reference: proofReference.trim() || undefined,
        notes: proofNotes.trim() || undefined,
      });
      setShowProofModal(false);
      Alert.alert("Submitted!", "Your payment proof has been sent for admin verification.");
    } catch (err) {
      Alert.alert("Submission Failed", err instanceof Error ? err.message : "Unable to submit proof.");
    } finally {
      setSubmittingProof(false);
    }
  }

  async function handleSendRepair() {
    if (!repairTitle.trim()) {
      Alert.alert("Title Required", "Please enter a short title for the complaint (e.g., Leaking Tap).");
      return;
    }
    if (!repairDescription.trim()) {
      Alert.alert("Description Required", "Please describe the repair needed.");
      return;
    }

    setSubmittingRepair(true);
    try {
      await onSubmitRepair({
        title: repairTitle.trim(),
        description: repairDescription.trim(),
        priority: repairPriority,
      });
      setShowRepairModal(false);
      setRepairTitle("");
      setRepairDescription("");
      setRepairPriority("MEDIUM");
      Alert.alert("Complaint Registered", "Your repair complaint has been logged. The warden/admin will inspect it.");
    } catch (err) {
      Alert.alert("Submission Failed", err instanceof Error ? err.message : "Unable to file repair complaint.");
    } finally {
      setSubmittingRepair(false);
    }
  }

  const renterName =
    user.firstName || renter?.name || renter?.user?.firstName
      ? `${user.firstName || renter?.user?.firstName || ""} ${user.lastName || renter?.user?.lastName || ""}`.trim()
      : user.email;

  const roomDisplay = renter?.room?.roomNumber
    ? `Room ${renter.room.roomNumber}${renter.room.floor !== undefined ? ` • Floor ${renter.room.floor}` : ""}`
    : "Room Assigned";

  // Dynamic Theme-Aware Styles
  const s = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {/* Top Renter Bar */}
      <View style={[s.topBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={s.topBarInfo}>
          <Text style={[s.topGreeting, { color: theme.secondary }]}>Welcome,</Text>
          <Text style={[s.topName, { color: theme.text }]} numberOfLines={1}>
            {renterName}
          </Text>
          <View style={[s.hostelBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="business" size={13} color={theme.primary} />
            <Text style={[s.hostelBadgeText, { color: theme.primary }]} numberOfLines={1}>
              {hostel?.name || "StayNexa Hostel"}
            </Text>
          </View>
        </View>

        <View style={s.topActions}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: isDark ? theme.surfaceSecondary : theme.primaryLight }]}
            onPress={() => setTheme(isDark ? "light" : "dark")}
            accessibilityLabel="Toggle Theme"
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={19}
              color={theme.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: isDark ? theme.surfaceSecondary : theme.primaryLight }]}
            onPress={onRefresh}
            accessibilityLabel="Refresh"
          >
            <Ionicons name="refresh-outline" size={19} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: theme.dangerLight }]}
            onPress={onLogout}
            accessibilityLabel="Logout"
          >
            <Ionicons name="log-out-outline" size={19} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Renter Segment Tabs with Active Indicator */}
      <View style={[s.tabNav, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[s.tabNavItem, activeTab === "details" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabPress("details")}
        >
          <Ionicons
            name={activeTab === "details" ? "person" : "person-outline"}
            size={18}
            color={activeTab === "details" ? theme.primary : theme.secondary}
          />
          <Text
            style={[
              s.tabNavLabel,
              { color: activeTab === "details" ? theme.primary : theme.secondary },
              activeTab === "details" && s.tabNavLabelActive,
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabNavItem, activeTab === "fees" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabPress("fees")}
        >
          <Ionicons
            name={activeTab === "fees" ? "wallet" : "wallet-outline"}
            size={18}
            color={activeTab === "fees" ? theme.primary : theme.secondary}
          />
          <Text
            style={[
              s.tabNavLabel,
              { color: activeTab === "fees" ? theme.primary : theme.secondary },
              activeTab === "fees" && s.tabNavLabelActive,
            ]}
          >
            Fees
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabNavItem, activeTab === "repairs" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabPress("repairs")}
        >
          <Ionicons
            name={activeTab === "repairs" ? "construct" : "construct-outline"}
            size={18}
            color={activeTab === "repairs" ? theme.primary : theme.secondary}
          />
          <Text
            style={[
              s.tabNavLabel,
              { color: activeTab === "repairs" ? theme.primary : theme.secondary },
              activeTab === "repairs" && s.tabNavLabelActive,
            ]}
          >
            Repairs{repairs.length > 0 ? ` (${repairs.length})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabNavItem, activeTab === "notices" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabPress("notices")}
        >
          <Ionicons
            name={activeTab === "notices" ? "notifications" : "notifications-outline"}
            size={18}
            color={activeTab === "notices" ? theme.primary : theme.secondary}
          />
          <Text
            style={[
              s.tabNavLabel,
              { color: activeTab === "notices" ? theme.primary : theme.secondary },
              activeTab === "notices" && s.tabNavLabelActive,
            ]}
          >
            Notices{visibleNotifications.length > 0 ? ` (${visibleNotifications.length})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.tabNavItem, activeTab === "settings" && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabPress("settings")}
        >
          <Ionicons
            name={activeTab === "settings" ? "settings" : "settings-outline"}
            size={18}
            color={activeTab === "settings" ? theme.primary : theme.secondary}
          />
          <Text
            style={[
              s.tabNavLabel,
              { color: activeTab === "settings" ? theme.primary : theme.secondary },
              activeTab === "settings" && s.tabNavLabelActive,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area with Native Horizontal Sliding Feature */}
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onPagerScrollEnd}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ================= TAB 1: DETAILS ================= */}
          <View style={{ width: containerWidth, flex: 1 }}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Quick Hero Banner Card */}
              <View style={[s.welcomeBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[s.bannerAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={s.bannerAvatarText}>
                    {(renterName.charAt(0) || "R").toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.bannerName, { color: theme.text }]}>{renterName}</Text>
                  <Text style={[s.bannerSub, { color: theme.secondary }]}>{roomDisplay}</Text>
                  <View style={[s.activeTag, { backgroundColor: theme.successLight }]}>
                    <View style={[s.activeDot, { backgroundColor: theme.success }]} />
                    <Text style={[s.activeTagText, { color: theme.success }]}>Active Resident</Text>
                  </View>
                </View>
              </View>

              {/* Quick Stats Grid */}
              <View style={s.statsRow}>
                <View
                  style={[
                    s.statBox,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      borderLeftColor: totalDue > 0 ? theme.danger : theme.success,
                    },
                  ]}
                >
                  <Text style={[s.statBoxLabel, { color: theme.secondary }]}>Outstanding Due</Text>
                  <Text style={[s.statBoxVal, { color: totalDue > 0 ? theme.danger : theme.success }]}>
                    {money(totalDue)}
                  </Text>
                </View>
                <View
                  style={[
                    s.statBox,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      borderLeftColor: theme.primary,
                    },
                  ]}
                >
                  <Text style={[s.statBoxLabel, { color: theme.secondary }]}>Monthly Rent</Text>
                  <Text style={[s.statBoxVal, { color: theme.text }]}>
                    {money(renter?.monthlyFee || 0)}
                  </Text>
                </View>
              </View>

              {/* Personal Details Card with Edit Action */}
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[s.cardHeader, { borderBottomColor: theme.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons name="id-card-outline" size={20} color={theme.primary} />
                    <Text style={[s.cardTitle, { color: theme.text }]}>Personal Information</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.editProfileBtn, { backgroundColor: theme.primaryLight }]}
                    onPress={openEditProfile}
                  >
                    <Ionicons name="pencil-outline" size={14} color={theme.primary} />
                    <Text style={[s.editProfileBtnText, { color: theme.primary }]}>Edit Details</Text>
                  </TouchableOpacity>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Full Name</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{renterName}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Email Address</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{user.email || renter?.email || "—"}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Phone Number</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>
                    {user.phone || renter?.phone || renter?.user?.phone || "—"}
                  </Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Guardian Name</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{renter?.guardianName || "—"}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Guardian Phone</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{renter?.guardianPhone || "—"}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Permanent Address</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>
                    {user.address || renter?.user?.address || "—"}
                  </Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>City / State / PIN</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>
                    {[
                      user.city || renter?.user?.city,
                      user.state || renter?.user?.state,
                      user.pincode || renter?.user?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border, borderBottomWidth: 0 }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Emergency Contact</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>
                    {user.emergencyContactName
                      ? `${user.emergencyContactName} (${user.emergencyContactPhone || "No Phone"})`
                      : "—"}
                  </Text>
                </View>
              </View>

              {/* Stay & Room Details Card */}
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[s.cardHeader, { borderBottomColor: theme.border }]}>
                  <Ionicons name="bed-outline" size={20} color={theme.primary} />
                  <Text style={[s.cardTitle, { color: theme.text }]}>Hostel & Room Details</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Hostel Name</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{hostel?.name || "StayNexa"}</Text>
                </View>

                {hostel?.address ? (
                  <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                    <Text style={[s.detailKey, { color: theme.secondary }]}>Address</Text>
                    <Text style={[s.detailVal, { color: theme.text }]}>{hostel.address}</Text>
                  </View>
                ) : null}

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Room Assigned</Text>
                  <Text style={[s.detailVal, { fontWeight: "700", color: theme.primary }]}>
                    {roomDisplay}
                  </Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Joining Date</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{renter?.joiningDate || "—"}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Monthly Fee</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{money(renter?.monthlyFee || 0)}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border, borderBottomWidth: 0 }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Security Deposit</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{money(renter?.securityDeposit || 0)}</Text>
                </View>
              </View>

              {/* Quick Action Shortcuts */}
              <View style={s.shortcutsRow}>
                <TouchableOpacity
                  style={[s.shortcutBtn, { backgroundColor: theme.primary }]}
                  onPress={() => handleTabPress("fees")}
                >
                  <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                  <Text style={s.shortcutBtnText}>View & Pay Fees</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.shortcutBtn, { backgroundColor: theme.purple || "#8B5CF6" }]}
                  onPress={() => {
                    handleTabPress("repairs");
                    setShowRepairModal(true);
                  }}
                >
                  <Ionicons name="construct-outline" size={20} color="#FFFFFF" />
                  <Text style={s.shortcutBtnText}>Lodge Complaint</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          {/* ================= TAB 2: PAYMENTS & FEES ================= */}
          <View style={{ width: containerWidth, flex: 1 }}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Pay Rent Banner */}
              <View
                style={[
                  s.feeBanner,
                  {
                    backgroundColor: isDark ? theme.surfaceSecondary : theme.primaryLight,
                    borderColor: isDark ? theme.border : "#BFDBFE",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.feeBannerTitle, { color: isDark ? theme.text : theme.primaryDark }]}>
                    Rent Payment Status
                  </Text>
                  <Text style={[s.feeBannerSub, { color: theme.secondary }]}>
                    {totalDue > 0
                      ? `You have ₹${totalDue.toLocaleString()} pending to pay.`
                      : "All dues cleared for this term!"}
                  </Text>
                </View>

                {fees.length > 0 ? (
                  <TouchableOpacity
                    style={[s.payProofBtn, { backgroundColor: theme.primary }]}
                    onPress={() => openProofForFee(fees[0])}
                  >
                    <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
                    <Text style={s.payProofBtnText}>Upload Proof</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Text style={[s.sectionHeading, { color: theme.text }]}>Fee Breakdown</Text>

              {fees.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="No fees generated yet"
                  description="Your hostel fees will be displayed here once generated by the administrator."
                />
              ) : (
                fees.map((fee) => {
                  const remaining = Math.max(0, Number(fee.amount || 0) - Number(fee.paidAmount || 0));
                  const isPaid = String(fee.status).toUpperCase() === "PAID" || remaining === 0;

                  return (
                    <View
                      key={fee.id}
                      style={[
                        s.feeCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <View style={s.feeCardHeader}>
                        <View>
                          <Text style={[s.feeMonthText, { color: theme.text }]}>{fee.month}</Text>
                          <Text style={[s.feeDueDate, { color: theme.secondary }]}>
                            Due: {fee.dueDate}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.badge,
                            {
                              backgroundColor: isPaid ? theme.successLight : theme.dangerLight,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.badgeText,
                              { color: isPaid ? theme.success : theme.danger },
                            ]}
                          >
                            {isPaid ? "PAID" : fee.status || "UNPAID"}
                          </Text>
                        </View>
                      </View>

                      <View style={[s.feeDivider, { backgroundColor: theme.border }]} />

                      <View style={s.feeAmountsRow}>
                        <View>
                          <Text style={[s.feeLabel, { color: theme.secondary }]}>Total Amount</Text>
                          <Text style={[s.feeVal, { color: theme.text }]}>{money(fee.amount)}</Text>
                        </View>
                        <View>
                          <Text style={[s.feeLabel, { color: theme.secondary }]}>Paid Amount</Text>
                          <Text style={[s.feeVal, { color: theme.success }]}>
                            {money(fee.paidAmount || 0)}
                          </Text>
                        </View>
                        <View>
                          <Text style={[s.feeLabel, { color: theme.secondary }]}>Remaining</Text>
                          <Text style={[s.feeVal, { color: remaining > 0 ? theme.danger : theme.success }]}>
                            {money(remaining)}
                          </Text>
                        </View>
                      </View>

                      {!isPaid ? (
                        <TouchableOpacity
                          style={[s.feeActionBtn, { backgroundColor: theme.primaryLight }]}
                          onPress={() => openProofForFee(fee)}
                        >
                          <Ionicons name="cloud-upload-outline" size={16} color={theme.primary} />
                          <Text style={[s.feeActionBtnText, { color: theme.primary }]}>
                            Submit Payment Proof
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  );
                })
              )}

              {/* Payment Proof History */}
              <Text style={[s.sectionHeading, { marginTop: 24, color: theme.text }]}>
                Payment Submissions ({payments.length})
              </Text>

              {payments.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="No payment proofs uploaded"
                  description="When you pay via UPI/bank and upload screenshots, their verification status will appear here."
                />
              ) : (
                payments.map((p) => {
                  const status = String(p.status || "SUBMITTED").toUpperCase();
                  const isApproved = status === "APPROVED" || status === "PAID";
                  const isRejected = status === "REJECTED";

                  return (
                    <View
                      key={p.id}
                      style={[
                        s.paymentHistoryCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <View style={s.paymentHistoryTop}>
                        <View>
                          <Text style={[s.paymentAmt, { color: theme.text }]}>
                            ₹{Number(p.amount || 0).toLocaleString()}
                          </Text>
                          <Text style={[s.paymentDate, { color: theme.secondary }]}>
                            {p.paymentDate || p.submittedAt?.slice(0, 10) || today()}
                          </Text>
                        </View>
                        <View
                          style={[
                            s.badge,
                            {
                              backgroundColor: isApproved
                                ? theme.successLight
                                : isRejected
                                ? theme.dangerLight
                                : theme.warningLight,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.badgeText,
                              {
                                color: isApproved
                                  ? theme.success
                                  : isRejected
                                  ? theme.danger
                                  : theme.warning,
                              },
                            ]}
                          >
                            {status}
                          </Text>
                        </View>
                      </View>

                      {p.reference ? (
                        <Text style={[s.paymentRef, { color: theme.secondary }]}>
                          Ref / UTR: {p.reference}
                        </Text>
                      ) : null}

                      {p.notes ? (
                        <Text style={[s.paymentNotes, { color: theme.secondary }]}>
                          Notes: {p.notes}
                        </Text>
                      ) : null}

                      {p.reviewNote ? (
                        <View
                          style={[
                            s.adminReviewBox,
                            {
                              backgroundColor: isApproved
                                ? theme.successLight
                                : theme.dangerLight,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.adminReviewText,
                              { color: isApproved ? theme.success : theme.danger },
                            ]}
                          >
                            Admin note: {p.reviewNote}
                          </Text>
                        </View>
                      ) : null}

                      <View style={s.paymentActionRow}>
                        {p.proofUrl ? (
                          <TouchableOpacity
                            style={[s.viewProofBtn, { backgroundColor: theme.primaryLight }]}
                            onPress={() => setPreviewImageUrl(p.proofUrl || null)}
                          >
                            <Ionicons name="image-outline" size={14} color={theme.primary} />
                            <Text style={[s.viewProofBtnText, { color: theme.primary }]}>
                              View Screenshot
                            </Text>
                          </TouchableOpacity>
                        ) : null}

                        {!isApproved ? (
                          <TouchableOpacity
                            style={[s.deleteProofBtn, { backgroundColor: theme.dangerLight }]}
                            onPress={() => handleDeletePaymentProof(p.id)}
                          >
                            <Ionicons name="trash-outline" size={14} color={theme.danger} />
                            <Text style={[s.deleteProofBtnText, { color: theme.danger }]}>
                              Withdraw
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* ================= TAB 3: REPAIRS ================= */}
          <View style={{ width: containerWidth, flex: 1 }}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={s.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectionTitle, { color: theme.text }]}>Maintenance Requests</Text>
                  <Text style={[s.sectionSubtitle, { color: theme.secondary }]}>
                    Report room or hostel issues for fast admin & technician resolution.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.addRepairBtn, { backgroundColor: theme.primary }]}
                  onPress={() => setShowRepairModal(true)}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={s.addRepairBtnText}>New Issue</Text>
                </TouchableOpacity>
              </View>

              {repairs.length === 0 ? (
                <EmptyState
                  icon="construct-outline"
                  title="No maintenance complaints"
                  description="Everything running smoothly! Tap 'New Issue' above if you need anything fixed."
                />
              ) : (
                repairs.map((r) => {
                  const status = String(r.status || "SUBMITTED").toUpperCase();
                  const isResolved = status === "RESOLVED";
                  const isInProgress = status === "IN_PROGRESS";

                  return (
                    <View
                      key={r.id}
                      style={[
                        s.repairCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <View style={s.repairCardTop}>
                        <Text style={[s.repairTitle, { color: theme.text }]}>{r.title}</Text>
                        <View
                          style={[
                            s.badge,
                            {
                              backgroundColor: isResolved
                                ? theme.successLight
                                : isInProgress
                                ? theme.warningLight
                                : theme.primaryLight,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.badgeText,
                              {
                                color: isResolved
                                  ? theme.success
                                  : isInProgress
                                  ? theme.warning
                                  : theme.primary,
                              },
                            ]}
                          >
                            {status.replace("_", " ")}
                          </Text>
                        </View>
                      </View>

                      <Text style={[s.repairDesc, { color: theme.secondary }]}>{r.description}</Text>

                      {/* Visual 3-Stage Progress Tracker */}
                      <View style={s.progressTrackRow}>
                        <View
                          style={[
                            s.progressStep,
                            { backgroundColor: theme.primary },
                          ]}
                        >
                          <Text style={s.progressStepText}>1. Logged</Text>
                        </View>
                        <View
                          style={[
                            s.progressStep,
                            {
                              backgroundColor:
                                isInProgress || isResolved ? theme.warning : theme.surfaceSecondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.progressStepText,
                              {
                                color:
                                  isInProgress || isResolved
                                    ? "#FFFFFF"
                                    : theme.secondary,
                              },
                            ]}
                          >
                            2. In Progress
                          </Text>
                        </View>
                        <View
                          style={[
                            s.progressStep,
                            {
                              backgroundColor: isResolved ? theme.success : theme.surfaceSecondary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.progressStepText,
                              {
                                color: isResolved ? "#FFFFFF" : theme.secondary,
                              },
                            ]}
                          >
                            3. Resolved
                          </Text>
                        </View>
                      </View>

                      {r.adminNotes ? (
                        <View
                          style={[
                            s.adminNotesBox,
                            {
                              backgroundColor: isDark ? theme.surfaceSecondary : "#F8FAFC",
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Text style={[s.adminNotesLabel, { color: theme.primary }]}>
                            Warden / Technician Update:
                          </Text>
                          <Text style={[s.adminNotesText, { color: theme.text }]}>
                            {r.adminNotes}
                          </Text>
                        </View>
                      ) : null}

                      <View style={s.repairCardFooter}>
                        <Text style={[s.repairDate, { color: theme.secondary }]}>
                          Reported: {r.createdAt?.slice(0, 10) || today()}
                        </Text>
                        {r.priority ? (
                          <Text style={[s.repairPriority, { color: theme.primary }]}>
                            Priority: {r.priority}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* ================= TAB 4: NOTICES & ANNOUNCEMENTS ================= */}
          <View style={{ width: containerWidth, flex: 1 }}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={s.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectionTitle, { color: theme.text }]}>Announcements & Notices</Text>
                  <Text style={[s.sectionSubtitle, { color: theme.secondary }]}>
                    Important alerts, reminders, and updates from your hostel management.
                  </Text>
                </View>
                {visibleNotifications.length > 0 ? (
                  <TouchableOpacity
                    style={[s.clearAllBtn, { backgroundColor: theme.dangerLight }]}
                    onPress={handleClearAllNotifications}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.danger} />
                    <Text style={[s.clearAllBtnText, { color: theme.danger }]}>Clear All</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {visibleNotifications.length === 0 ? (
                <EmptyState
                  icon="notifications-outline"
                  title="No new notices"
                  description="You are completely caught up! New hostel announcements will be delivered here."
                />
              ) : (
                visibleNotifications.map((notif) => {
                  const isUrgent =
                    notif.type === "URGENT" ||
                    notif.type === "ALERT" ||
                    notif.type === "FEE_OVERDUE";
                  const isMaintenance = notif.type === "MAINTENANCE" || notif.entityType === "REPAIR";

                  return (
                    <View
                      key={notif.id}
                      style={[
                        s.noticeCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          borderLeftColor: isUrgent
                            ? theme.danger
                            : isMaintenance
                            ? theme.orange || "#F97316"
                            : theme.primary,
                        },
                      ]}
                    >
                      <View style={s.noticeCardHeader}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                          <Ionicons
                            name={
                              isUrgent
                                ? "alert-circle"
                                : isMaintenance
                                ? "construct"
                                : "megaphone"
                            }
                            size={18}
                            color={
                              isUrgent
                                ? theme.danger
                                : isMaintenance
                                ? theme.orange || "#F97316"
                                : theme.primary
                            }
                          />
                          <Text style={[s.noticeTitle, { color: theme.text }]}>
                            {notif.title}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteNotification(notif.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle-outline" size={18} color={theme.secondary} />
                        </TouchableOpacity>
                      </View>

                      <Text style={[s.noticeMsg, { color: theme.text }]}>{notif.message}</Text>

                      <Text style={[s.noticeDate, { color: theme.secondary }]}>
                        {notif.createdAt?.slice(0, 10) || today()}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>

          {/* ================= TAB 5: SETTINGS ================= */}
          <View style={{ width: containerWidth, flex: 1 }}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={s.sectionHeaderRow}>
                <View>
                  <Text style={[s.sectionTitle, { color: theme.text }]}>Settings & Security</Text>
                  <Text style={[s.sectionSubtitle, { color: theme.secondary }]}>
                    Customize app appearance and update your resident account credentials.
                  </Text>
                </View>
              </View>

              {/* 1. Appearance & Theme Selection Card */}
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[s.cardHeader, { borderBottomColor: theme.border }]}>
                  <Ionicons name="color-palette-outline" size={20} color={theme.primary} />
                  <Text style={[s.cardTitle, { color: theme.text }]}>Appearance & Theme</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 14 }}>
                  Switch between light and dark mode for a comfortable viewing experience.
                </Text>

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <TouchableOpacity
                    style={[
                      s.themeOptionBtn,
                      {
                        borderColor: !isDark ? theme.primary : theme.border,
                        backgroundColor: !isDark ? theme.primaryLight : theme.surfaceSecondary,
                      },
                    ]}
                    onPress={() => setTheme("light")}
                  >
                    <Ionicons
                      name="sunny"
                      size={22}
                      color={!isDark ? theme.primary : theme.secondary}
                    />
                    <Text
                      style={[
                        s.themeOptionText,
                        {
                          color: !isDark ? theme.primary : theme.secondary,
                          fontWeight: !isDark ? "700" : "500",
                        },
                      ]}
                    >
                      Light Mode
                    </Text>
                    {!isDark ? (
                      <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                    ) : null}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      s.themeOptionBtn,
                      {
                        borderColor: isDark ? theme.primary : theme.border,
                        backgroundColor: isDark ? theme.primaryLight : theme.surfaceSecondary,
                      },
                    ]}
                    onPress={() => setTheme("dark")}
                  >
                    <Ionicons
                      name="moon"
                      size={22}
                      color={isDark ? theme.primary : theme.secondary}
                    />
                    <Text
                      style={[
                        s.themeOptionText,
                        {
                          color: isDark ? theme.primary : theme.secondary,
                          fontWeight: isDark ? "700" : "500",
                        },
                      ]}
                    >
                      Dark Mode
                    </Text>
                    {isDark ? (
                      <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Create / Change Password Card */}
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[s.cardHeader, { borderBottomColor: theme.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.primary} />
                  <Text style={[s.cardTitle, { color: theme.text }]}>Make / Change Password</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.secondary, marginBottom: 14, lineHeight: 19 }}>
                  Set your personal password so you can sign in directly with your email (
                  {user.email || renter?.email || "your registered email"}) without relying on an administrator.
                </Text>

                {passwordMsg ? (
                  <View
                    style={[
                      s.feedbackBanner,
                      {
                        backgroundColor:
                          passwordMsg.type === "success" ? theme.successLight : theme.dangerLight,
                        borderColor:
                          passwordMsg.type === "success" ? theme.success : theme.danger,
                      },
                    ]}
                  >
                    <Ionicons
                      name={passwordMsg.type === "success" ? "checkmark-circle" : "alert-circle"}
                      size={18}
                      color={passwordMsg.type === "success" ? theme.success : theme.danger}
                    />
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: passwordMsg.type === "success" ? theme.success : theme.danger,
                        fontWeight: "600",
                      }}
                    >
                      {passwordMsg.text}
                    </Text>
                  </View>
                ) : null}

                <Text style={[s.inputLabel, { color: theme.text }]}>New Password *</Text>
                <View
                  style={[
                    s.passwordInputWrap,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    style={[s.passwordInputText, { color: theme.text }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={theme.secondary}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword((v) => !v)}>
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.secondary}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[s.inputLabel, { color: theme.text }]}>Confirm Password *</Text>
                <View
                  style={[
                    s.passwordInputWrap,
                    { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    style={[s.passwordInputText, { color: theme.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter password"
                    placeholderTextColor={theme.secondary}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)}>
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.secondary}
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[s.primaryButton, { backgroundColor: theme.primary }, savingPassword && s.btnDisabled]}
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={18} color="#FFFFFF" />
                      <Text style={s.primaryButtonText}>Save Password</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* 3. Account Actions Card */}
              <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[s.cardHeader, { borderBottomColor: theme.border }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={theme.primary} />
                  <Text style={[s.cardTitle, { color: theme.text }]}>Account Information</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Registered Email</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{user.email || "—"}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Resident ID</Text>
                  <Text style={[s.detailVal, { color: theme.text }]}>{renter?.id || user.id}</Text>
                </View>

                <View style={[s.detailRow, { borderBottomColor: theme.border, borderBottomWidth: 0 }]}>
                  <Text style={[s.detailKey, { color: theme.secondary }]}>Hostel Assigned</Text>
                  <Text style={[s.detailVal, { color: theme.primary, fontWeight: "700" }]}>
                    {hostel?.name || "StayNexa"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.dangerOutlineBtn, { borderColor: theme.danger }]}
                  onPress={onLogout}
                >
                  <Ionicons name="log-out-outline" size={18} color={theme.danger} />
                  <Text style={[s.dangerOutlineBtnText, { color: theme.danger }]}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* ================= MODAL: EDIT PERSONAL PROFILE ================= */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalOverlay}
        >
          <View style={[s.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Edit Personal Details</Text>
              <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.inputLabel, { color: theme.text }]}>First Name *</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editFirstName}
                onChangeText={setEditFirstName}
                placeholder="First Name"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Last Name</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editLastName}
                onChangeText={setEditLastName}
                placeholder="Last Name"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Mobile Phone Number</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+91 Mobile Number"
                placeholderTextColor={theme.secondary}
                keyboardType="phone-pad"
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Guardian Name</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editGuardianName}
                onChangeText={setEditGuardianName}
                placeholder="Parent / Guardian Name"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Guardian Phone Number</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editGuardianPhone}
                onChangeText={setEditGuardianPhone}
                placeholder="+91 Guardian Phone"
                placeholderTextColor={theme.secondary}
                keyboardType="phone-pad"
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Permanent Address</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="House / Street / Area"
                placeholderTextColor={theme.secondary}
                multiline
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: theme.text }]}>City</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                    value={editCity}
                    onChangeText={setEditCity}
                    placeholder="City"
                    placeholderTextColor={theme.secondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.inputLabel, { color: theme.text }]}>State</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                    value={editState}
                    onChangeText={setEditState}
                    placeholder="State"
                    placeholderTextColor={theme.secondary}
                  />
                </View>
              </View>

              <Text style={[s.inputLabel, { color: theme.text }]}>Pincode</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editPincode}
                onChangeText={setEditPincode}
                placeholder="PIN Code"
                placeholderTextColor={theme.secondary}
                keyboardType="numeric"
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Emergency Contact Name</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editEmergencyName}
                onChangeText={setEditEmergencyName}
                placeholder="Emergency Contact Name"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Emergency Contact Phone</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={editEmergencyPhone}
                onChangeText={setEditEmergencyPhone}
                placeholder="+91 Emergency Phone"
                placeholderTextColor={theme.secondary}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[s.submitModalBtn, { backgroundColor: theme.primary }, savingProfile && s.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitModalBtnText}>Save Personal Details</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL: SUBMIT PROOF ================= */}
      <Modal
        visible={showProofModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProofModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalOverlay}
        >
          <View style={[s.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Upload Payment Proof</Text>
              <TouchableOpacity onPress={() => setShowProofModal(false)}>
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.inputLabel, { color: theme.text }]}>Select Fee Month *</Text>
              <View style={s.feeSelectorRow}>
                {fees.map((fee) => (
                  <TouchableOpacity
                    key={fee.id}
                    style={[
                      s.feeSelectChip,
                      { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                      selectedFeeId === fee.id && {
                        backgroundColor: theme.primaryLight,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => {
                      setSelectedFeeId(fee.id);
                      const rem = Math.max(0, Number(fee.amount || 0) - Number(fee.paidAmount || 0));
                      setProofAmount(String(rem > 0 ? rem : fee.amount));
                    }}
                  >
                    <Text
                      style={[
                        s.feeSelectChipText,
                        { color: theme.secondary },
                        selectedFeeId === fee.id && { color: theme.primary },
                      ]}
                    >
                      {fee.month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.inputLabel, { color: theme.text }]}>Amount Paid (₹) *</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                keyboardType="numeric"
                value={proofAmount}
                onChangeText={setProofAmount}
                placeholder="e.g. 5000"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Payment Date (YYYY-MM-DD)</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={proofDate}
                onChangeText={setProofDate}
                placeholder="2026-10-03"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>UPI / Bank Reference / UTR Number</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={proofReference}
                onChangeText={setProofReference}
                placeholder="e.g. UPI Ref / 12-digit UTR"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Notes (Optional)</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={proofNotes}
                onChangeText={setProofNotes}
                placeholder="Any special transaction note"
                placeholderTextColor={theme.secondary}
                multiline
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Screenshot / Photo Proof *</Text>
              <View style={s.imagePickerOptions}>
                <TouchableOpacity
                  style={[s.pickerOptionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                  onPress={pickImageFromGallery}
                >
                  <Ionicons name="images-outline" size={20} color={theme.primary} />
                  <Text style={[s.pickerOptionText, { color: theme.primary }]}>Pick from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.pickerOptionBtn, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}
                  onPress={takePhotoWithCamera}
                >
                  <Ionicons name="camera-outline" size={20} color={theme.primary} />
                  <Text style={[s.pickerOptionText, { color: theme.primary }]}>Take Photo</Text>
                </TouchableOpacity>
              </View>

              {proofImageUri ? (
                <View style={[s.previewContainer, { borderColor: theme.border }]}>
                  <Image source={{ uri: proofImageUri }} style={s.previewImage} resizeMode="contain" />
                  <TouchableOpacity
                    style={[s.removeImageBtn, { backgroundColor: theme.danger }]}
                    onPress={() => {
                      setProofImageUri(null);
                      setProofMimeType(null);
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                    <Text style={s.removeImageText}>Remove Screenshot</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.submitModalBtn, { backgroundColor: theme.primary }, submittingProof && s.btnDisabled]}
                onPress={handleSendProof}
                disabled={submittingProof}
              >
                {submittingProof ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitModalBtnText}>Send to Admin for Review</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL: NEW REPAIR COMPLAINT ================= */}
      <Modal
        visible={showRepairModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRepairModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.modalOverlay}
        >
          <View style={[s.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Lodge Repair Complaint</Text>
              <TouchableOpacity onPress={() => setShowRepairModal(false)}>
                <Ionicons name="close" size={24} color={theme.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[s.inputLabel, { color: theme.text }]}>Issue Title *</Text>
              <TextInput
                style={[s.input, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={repairTitle}
                onChangeText={setRepairTitle}
                placeholder="e.g. Geyser not heating / Tap leakage"
                placeholderTextColor={theme.secondary}
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Description & Details *</Text>
              <TextInput
                style={[s.input, s.textArea, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, color: theme.text }]}
                value={repairDescription}
                onChangeText={setRepairDescription}
                placeholder="Describe what is broken and when it started"
                placeholderTextColor={theme.secondary}
                multiline
              />

              <Text style={[s.inputLabel, { color: theme.text }]}>Priority Level</Text>
              <View style={s.prioritySelectorRow}>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      s.priorityChip,
                      { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                      repairPriority === p && {
                        backgroundColor: theme.primaryLight,
                        borderColor: theme.primary,
                      },
                    ]}
                    onPress={() => setRepairPriority(p)}
                  >
                    <Text
                      style={[
                        s.priorityChipText,
                        { color: theme.secondary },
                        repairPriority === p && { color: theme.primary },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.submitModalBtn, { backgroundColor: theme.primary }, submittingRepair && s.btnDisabled]}
                onPress={handleSendRepair}
                disabled={submittingRepair}
              >
                {submittingRepair ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.submitModalBtnText}>Register Complaint</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL: IMAGE PREVIEW ================= */}
      <Modal
        visible={!!previewImageUrl}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={s.previewModalOverlay}>
          <TouchableOpacity
            style={s.closePreviewBtn}
            onPress={() => setPreviewImageUrl(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={s.fullPreviewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ── Theme-Aware Stylesheet Factory ───────────────────────────────────────────
function createStyles(theme: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "ios" ? 54 : 44,
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    topBarInfo: {
      flex: 1,
      marginRight: 12,
    },
    topGreeting: {
      fontSize: 12,
      fontWeight: "500",
    },
    topName: {
      fontSize: 19,
      fontWeight: "800",
      letterSpacing: -0.3,
      marginTop: 1,
    },
    hostelBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginTop: 4,
      gap: 4,
    },
    hostelBadgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    topActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    tabNav: {
      flexDirection: "row",
      borderBottomWidth: 1,
    },
    tabNavItem: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
      gap: 3,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabNavLabel: {
      fontSize: 11,
      fontWeight: "600",
    },
    tabNavLabelActive: {
      fontWeight: "700",
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    welcomeBanner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      gap: 14,
      marginBottom: 16,
    },
    bannerAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    bannerAvatarText: {
      color: "#FFFFFF",
      fontSize: 22,
      fontWeight: "700",
    },
    bannerName: {
      fontSize: 17,
      fontWeight: "700",
    },
    bannerSub: {
      fontSize: 13,
      marginTop: 2,
    },
    activeTag: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      marginTop: 6,
      gap: 5,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    activeTagText: {
      fontSize: 11,
      fontWeight: "600",
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    statBox: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderWidth: 1,
    },
    statBoxLabel: {
      fontSize: 12,
      fontWeight: "500",
    },
    statBoxVal: {
      fontSize: 18,
      fontWeight: "800",
      marginTop: 4,
    },
    card: {
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      marginBottom: 16,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      borderBottomWidth: 1,
      paddingBottom: 10,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "700",
      flex: 1,
    },
    editProfileBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    editProfileBtnText: {
      fontSize: 12,
      fontWeight: "700",
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    detailKey: {
      fontSize: 13,
    },
    detailVal: {
      fontSize: 13,
      fontWeight: "600",
      maxWidth: "60%",
      textAlign: "right",
    },
    shortcutsRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 4,
    },
    shortcutBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    shortcutBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },
    feeBanner: {
      padding: 16,
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      gap: 12,
      marginBottom: 16,
    },
    feeBannerTitle: {
      fontSize: 16,
      fontWeight: "700",
    },
    feeBannerSub: {
      fontSize: 13,
      marginTop: 3,
    },
    payProofBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      gap: 6,
    },
    payProofBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    sectionHeading: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 10,
    },
    feeCard: {
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      marginBottom: 12,
    },
    feeCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    feeMonthText: {
      fontSize: 16,
      fontWeight: "700",
    },
    feeDueDate: {
      fontSize: 12,
      marginTop: 2,
    },
    feeDivider: {
      height: 1,
      marginVertical: 12,
    },
    feeAmountsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    feeLabel: {
      fontSize: 11,
      fontWeight: "500",
    },
    feeVal: {
      fontSize: 14,
      fontWeight: "700",
      marginTop: 2,
    },
    feeActionBtn: {
      marginTop: 14,
      paddingVertical: 10,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    feeActionBtnText: {
      fontSize: 13,
      fontWeight: "600",
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: "700",
    },
    paymentHistoryCard: {
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      marginBottom: 10,
    },
    paymentHistoryTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    paymentAmt: {
      fontSize: 16,
      fontWeight: "700",
    },
    paymentDate: {
      fontSize: 12,
      marginTop: 2,
    },
    paymentRef: {
      fontSize: 12,
      marginTop: 6,
    },
    paymentNotes: {
      fontSize: 12,
      marginTop: 4,
    },
    adminReviewBox: {
      padding: 8,
      borderRadius: 6,
      marginTop: 8,
    },
    adminReviewText: {
      fontSize: 12,
      fontWeight: "600",
    },
    paymentActionRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    viewProofBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    viewProofBtnText: {
      fontSize: 12,
      fontWeight: "600",
    },
    deleteProofBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    deleteProofBtnText: {
      fontSize: 12,
      fontWeight: "600",
    },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    sectionSubtitle: {
      fontSize: 13,
      marginTop: 2,
      lineHeight: 18,
    },
    addRepairBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      gap: 4,
    },
    addRepairBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    repairCard: {
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      marginBottom: 12,
    },
    repairCardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    repairTitle: {
      fontSize: 15,
      fontWeight: "700",
      flex: 1,
      marginRight: 8,
    },
    repairDesc: {
      fontSize: 13,
      lineHeight: 18,
      marginBottom: 12,
    },
    progressTrackRow: {
      flexDirection: "row",
      gap: 6,
      marginBottom: 12,
    },
    progressStep: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    progressStepText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
    },
    adminNotesBox: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 10,
    },
    adminNotesLabel: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 3,
    },
    adminNotesText: {
      fontSize: 13,
      lineHeight: 17,
    },
    repairCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    repairDate: {
      fontSize: 11,
    },
    repairPriority: {
      fontSize: 11,
      fontWeight: "700",
    },
    clearAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      gap: 4,
    },
    clearAllBtnText: {
      fontSize: 12,
      fontWeight: "600",
    },
    noticeCard: {
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderLeftWidth: 4,
      marginBottom: 10,
    },
    noticeCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    noticeTitle: {
      fontSize: 15,
      fontWeight: "700",
    },
    noticeMsg: {
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 8,
    },
    noticeDate: {
      fontSize: 11,
    },
    themeOptionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    themeOptionText: {
      fontSize: 14,
    },
    passwordInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      minHeight: 48,
      marginBottom: 14,
    },
    passwordInputText: {
      flex: 1,
      fontSize: 15,
      minHeight: 46,
    },
    feedbackBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 14,
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
    },
    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    dangerOutlineBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      marginTop: 8,
      backgroundColor: "transparent",
    },
    dangerOutlineBtnText: {
      fontSize: 15,
      fontWeight: "700",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalBox: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: "88%",
      borderWidth: 1,
      borderBottomWidth: 0,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: "600",
      marginTop: 12,
      marginBottom: 6,
    },
    input: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      borderWidth: 1,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: "top",
    },
    feeSelectorRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    feeSelectChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    feeSelectChipText: {
      fontSize: 13,
      fontWeight: "600",
    },
    imagePickerOptions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 4,
    },
    pickerOptionBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
    },
    pickerOptionText: {
      fontSize: 13,
      fontWeight: "600",
    },
    previewContainer: {
      marginTop: 8,
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
    },
    previewImage: {
      width: "100%",
      height: 180,
    },
    removeImageBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
      gap: 4,
    },
    removeImageText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700",
    },
    prioritySelectorRow: {
      flexDirection: "row",
      gap: 8,
    },
    priorityChip: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 8,
      borderWidth: 1,
    },
    priorityChipText: {
      fontSize: 11,
      fontWeight: "700",
    },
    submitModalBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 10,
      gap: 8,
      marginTop: 20,
      marginBottom: 10,
    },
    submitModalBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
    btnDisabled: {
      opacity: 0.6,
    },
    previewModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    closePreviewBtn: {
      position: "absolute",
      top: 50,
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    fullPreviewImage: {
      width: "92%",
      height: "80%",
    },
  });
}
