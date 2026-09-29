import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import { COLORS } from "./src/constants/theme";
import {
  Tab,
  Hostel,
  Room,
  Renter,
  Fee,
  Payment,
  Repair,
  Dashboard,
  EMPTY_DASHBOARD,
} from "./src/types";
import {
  getName,
  listFrom,
  dashboardFrom,
  today,
  currentMonth,
} from "./src/utils/formatters";
import { API_URL, parseJsonResponse as jsonResponse } from "./src/services/api";




import { Header, BottomTab } from "./src/components/common";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { HostelsScreen } from "./src/screens/HostelsScreen";
import { RoomsScreen } from "./src/screens/RoomsScreen";
import { RentersScreen } from "./src/screens/RentersScreen";
import { FeesScreen } from "./src/screens/FeesScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { MoreScreen } from "./src/screens/MoreScreen";


function AppContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState<Tab>("dashboard");
  const [dashboard, setDashboard] = useState<Dashboard>(EMPTY_DASHBOARD);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostelId, setSelectedHostelId] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [renterSearch, setRenterSearch] = useState("");
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const refreshBusy = useRef(false);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomNumber, setRoomNumber] = useState("");
  const [roomFloor, setRoomFloor] = useState("");
  const [roomSaving, setRoomSaving] = useState(false);

  const [showRenterModal, setShowRenterModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [renterEmail, setRenterEmail] = useState("");
  const [renterPhone, setRenterPhone] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [renterPassword, setRenterPassword] = useState("");
  const [showRenterPassword, setShowRenterPassword] = useState(false);
  const [renterRoomId, setRenterRoomId] = useState("");
  const [joiningDate, setJoiningDate] = useState(today());
  const [monthlyFee, setMonthlyFee] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [renterSaving, setRenterSaving] = useState(false);
  const [renterRoomPickerOpen, setRenterRoomPickerOpen] = useState(false);

  const [showEditRenterModal, setShowEditRenterModal] = useState(false);
  const [editRenterRoomPickerOpen, setEditRenterRoomPickerOpen] = useState(false);
  const [editingRenterId, setEditingRenterId] = useState("");
  const [editRenterRoomId, setEditRenterRoomId] = useState("");
  const [editGuardianPhone, setEditGuardianPhone] = useState("");
  const [editJoiningDate, setEditJoiningDate] = useState(today());
  const [editMonthlyFee, setEditMonthlyFee] = useState("");
  const [editSecurityDeposit, setEditSecurityDeposit] = useState("");
  const [editRenterStatus, setEditRenterStatus] = useState("ACTIVE");
  const [editRenterSaving, setEditRenterSaving] = useState(false);

  const [showRenterDetailsModal, setShowRenterDetailsModal] = useState(false);
  const [selectedRenter, setSelectedRenter] = useState<Renter | null>(null);
  const [renterDetailsLoading, setRenterDetailsLoading] = useState(false);

  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeRenterId, setFeeRenterId] = useState("");
  const [feeMonth, setFeeMonth] = useState(currentMonth());
  const [feeAmount, setFeeAmount] = useState("");
  const [feeDueDate, setFeeDueDate] = useState("");
  const [feeDescription, setFeeDescription] = useState("");
  const [feeSaving, setFeeSaving] = useState(false);
  const [feeRenterPickerOpen, setFeeRenterPickerOpen] = useState(false);

  const [paymentActionId, setPaymentActionId] = useState("");

  const selectedHostel = useMemo(() => hostels.find((item) => item.id === selectedHostelId), [hostels, selectedHostelId]);
  const activeRenters = useMemo(() => renters.filter((item) => String(item.status || "ACTIVE").toUpperCase() === "ACTIVE"), [renters]);
  const activeRooms = useMemo(() => rooms.filter((item) => String(item.status || "ACTIVE").toUpperCase() === "ACTIVE"), [rooms]);

  async function request(path: string, options: RequestInit = {}, explicitToken?: string) {
    const authToken = explicitToken || token;
    if (!authToken) throw new Error("You are not signed in.");
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: `Bearer ${authToken}`,
      },
    });
    const data = await jsonResponse(response);
    if (!response.ok) {
      const message = data && typeof data === "object" ? (data as Record<string, unknown>).message : null;
      throw new Error(String(message || `Request failed: ${response.status}`));
    }
    return data;
  }

  async function fetchHostels(idToken: string): Promise<Hostel[]> {
    const response = await fetch(`${API_URL}/hostels`, { headers: { Authorization: `Bearer ${idToken}` } });
    const data = await jsonResponse(response);
    if (!response.ok) throw new Error(String((data as Record<string, unknown>)?.message || "Unable to load hostels."));
    return listFrom<Hostel>(data, "hostels");
  }

  async function login() {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken();

      const meResponse = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${idToken}` } });
      const meData = await jsonResponse(meResponse);
      if (!meResponse.ok) throw new Error(String((meData as Record<string, unknown>)?.message || "Unable to verify account."));

      const me = meData as Record<string, any>;
      const role = me.user?.role || me.role;
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        await signOut(auth);
        throw new Error("This account does not have Admin access.");
      }

      setToken(idToken);
      const hostelData = await fetchHostels(idToken);
      setHostels(hostelData);
      setSelectedHostelId(hostelData[0]?.id || "");

      const dashResponse = await fetch(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${idToken}` } });
      const dashData = await jsonResponse(dashResponse);
      if (!dashResponse.ok) throw new Error(String((dashData as Record<string, unknown>)?.message || "Unable to load dashboard."));
      setDashboard(dashboardFrom(dashData));
      setPage("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await signOut(auth);
    setToken(null);
    setDashboard(EMPTY_DASHBOARD);
    setHostels([]);
    setSelectedHostelId("");
    setRooms([]);
    setRenters([]);
    setFees([]);
    setPayments([]);
    setRepairs([]);
    setPage("dashboard");
    setEmail("");
    setPassword("");
    setError("");
  }

  async function refreshDashboardOnly() {
    if (!token) return;
    try {
      const data = await request("/dashboard");
      setDashboard(dashboardFrom(data));
    } catch {
      // Keep the existing dashboard visible when a refresh temporarily fails.
    }
  }

  async function refreshHostelData(hostelId = selectedHostelId) {
    if (!token || !hostelId || refreshBusy.current) return;
    refreshBusy.current = true;
    try {
      const [roomData, renterData, feeData, paymentData, repairData] = await Promise.all([
        request(`/hostels/${hostelId}/rooms`),
        request(`/hostels/${hostelId}/renters`),
        request(`/hostels/${hostelId}/fees`),
        request(`/hostels/${hostelId}/payments`),
        request(`/hostels/${hostelId}/repairs`).catch(() => ({ repairs: [] })),
      ]);
      setRooms(listFrom<Room>(roomData, "rooms"));
      setRenters(listFrom<Renter>(renterData, "renters"));
      setFees(listFrom<Fee>(feeData, "fees"));
      setPayments(listFrom<Payment>(paymentData, "payments"));
      setRepairs(listFrom<Repair>(repairData, "repairs"));
      await refreshDashboardOnly();
    } finally {
      refreshBusy.current = false;
    }
  }

  async function refreshAll() {
    if (!token || !selectedHostelId) return;
    setDataLoading(true);
    setError("");
    try {
      await refreshHostelData(selectedHostelId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to refresh data.");
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !selectedHostelId) return;
    void refreshAll();
  }, [token, selectedHostelId]);

  useEffect(() => {
    if (!token || !selectedHostelId) return;
    const timer = setInterval(() => {
      void refreshHostelData(selectedHostelId);
    }, 4000);
    return () => clearInterval(timer);
  }, [token, selectedHostelId]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && token && selectedHostelId) {
        void refreshHostelData(selectedHostelId);
      }
    });
    return () => subscription.remove();
  }, [token, selectedHostelId]);

  async function addRoom() {
    if (!roomNumber.trim()) {
      Alert.alert("Room number required", "Enter a room number.");
      return;
    }
    setRoomSaving(true);
    try {
      await request(`/hostels/${selectedHostelId}/rooms`, {
        method: "POST",
        body: JSON.stringify({
          roomNumber: roomNumber.trim(),
          floor: roomFloor.trim() || undefined,
          status: "ACTIVE",
        }),
      });
      setRoomNumber("");
      setRoomFloor("");
      setShowRoomModal(false);
      await refreshAll();
      Alert.alert("Room added", "The room was added successfully.");
    } catch (err) {
      Alert.alert("Unable to add room", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setRoomSaving(false);
    }
  }

  function deleteRoom(room: Room) {
    const hasActiveRenter = renters.some(
      (renter) =>
        String(renter.status || "ACTIVE").toUpperCase() === "ACTIVE" &&
        renter.roomId === room.id,
    );

    if (hasActiveRenter) {
      Alert.alert(
        "Room cannot be deleted",
        `Room ${room.roomNumber} has an active renter. Mark the renter as left or move them to another room first.`,
      );
      return;
    }

    Alert.alert("Delete room", `Delete room ${room.roomNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await request(`/hostels/${selectedHostelId}/rooms/${room.id}`, { method: "DELETE" });
            await refreshAll();
          } catch (err) {
            Alert.alert("Unable to delete room", err instanceof Error ? err.message : "Please try again.");
          }
        },
      },
    ]);
  }

  function resetRenterForm() {
    setFirstName("");
    setLastName("");
    setRenterEmail("");
    setRenterPhone("");
    setGuardianPhone("");
    setRenterPassword("");
    setShowRenterPassword(false);
    setRenterRoomId("");
    setJoiningDate(today());
    setMonthlyFee("");
    setSecurityDeposit("");
  }

  function openRenterModal() {
    resetRenterForm();
    setShowRenterModal(true);
  }

  async function addRenter() {
    const first = firstName.trim();
    const last = lastName.trim();
    const emailValue = renterEmail.trim().toLowerCase();
    const phoneValue = renterPhone.trim();
    const guardianValue = guardianPhone.trim();
    const passwordValue = renterPassword;
    const joiningValue = joiningDate.trim() || today();

    if (first.length < 2 || first.length > 100) {
      return Alert.alert("Invalid first name", "First name must contain 2 to 100 characters.");
    }
    if (last.length > 100) {
      return Alert.alert("Invalid last name", "Last name must contain at most 100 characters.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) || emailValue.length > 255) {
      return Alert.alert("Invalid email", "Enter a valid email address.");
    }
    if (phoneValue.length < 7 || phoneValue.length > 30) {
      return Alert.alert("Invalid phone", "Phone number must contain 7 to 30 characters.");
    }
    if (guardianValue.length < 7 || guardianValue.length > 30) {
      return Alert.alert("Invalid guardian number", "Guardian number must contain 7 to 30 characters.");
    }
    if (passwordValue.length < 6 || passwordValue.length > 100) {
      return Alert.alert("Invalid password", "Password must contain 6 to 100 characters.");
    }
    if (!renterRoomId) return Alert.alert("Room required", "Select a room for the renter.");
    if (!joiningValue) return Alert.alert("Joining date required", "Enter the joining date.");
    if (!monthlyFee.trim()) return Alert.alert("Monthly fee required", "Enter the monthly fee.");

    const monthly = Number(monthlyFee);
    const deposit = Number(securityDeposit || 0);
    if (!Number.isFinite(monthly) || monthly < 0) return Alert.alert("Invalid monthly fee", "Enter a valid amount.");
    if (!Number.isFinite(deposit) || deposit < 0) return Alert.alert("Invalid security deposit", "Enter a valid amount.");

    setRenterSaving(true);
    try {
      await request(`/hostels/${selectedHostelId}/renters/create-account`, {
        method: "POST",
        body: JSON.stringify({
          firstName: first,
          ...(last ? { lastName: last } : {}),
          email: emailValue,
          phone: phoneValue,
          guardianPhone: guardianValue,
          password: passwordValue,
          roomId: renterRoomId,
          joiningDate: joiningValue,
          monthlyFee: monthly,
          securityDeposit: deposit,
        }),
      });
      setShowRenterModal(false);
      resetRenterForm();
      await refreshAll();
      Alert.alert("Renter added", "The renter account was created successfully.");
    } catch (err) {
      Alert.alert("Unable to add renter", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setRenterSaving(false);
    }
  }

  function openFeeModal() {
    setFeeRenterId("");
    setFeeMonth(currentMonth());
    setFeeAmount("");
    setFeeDueDate("");
    setFeeDescription("");
    setShowFeeModal(true);
  }

  async function addFee() {
    if (!feeRenterId) return Alert.alert("Select renter", "Choose an active renter.");
    if (!/^\d{4}-\d{2}$/.test(feeMonth.trim())) return Alert.alert("Invalid month", "Use YYYY-MM format.");

    const existingFee = fees.find((fee) => fee.renterId === feeRenterId && fee.month === feeMonth.trim());
    if (existingFee) {
      return Alert.alert(
        "Fee already exists",
        "This renter already has a fee for the selected month. You cannot add another fee for the same renter and month.",
      );
    }
    const amount = Number(feeAmount);
    if (!Number.isFinite(amount) || amount <= 0) return Alert.alert("Invalid amount", "Enter a positive fee amount.");
    if (!feeDueDate.trim()) return Alert.alert("Due date required", "Enter the due date.");

    setFeeSaving(true);
    try {
      await request(`/hostels/${selectedHostelId}/fees`, {
        method: "POST",
        body: JSON.stringify({
          renterId: feeRenterId,
          month: feeMonth.trim(),
          amount,
          dueDate: feeDueDate.trim(),
          description: feeDescription.trim() || undefined,
        }),
      });
      setShowFeeModal(false);
      await refreshAll();
      Alert.alert("Fee created", "The fee was created successfully.");
    } catch (err) {
      Alert.alert("Unable to create fee", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setFeeSaving(false);
    }
  }

  const paymentProofStats = useMemo(() => {
    const submitted = payments.filter((item) => {
      const status = String(item.status || "APPROVED").toUpperCase();
      return status === "SUBMITTED" || status === "PENDING";
    }).length;

    const approved = payments.filter((item) =>
      String(item.status || "APPROVED").toUpperCase() === "APPROVED"
    ).length;

    const rejected = payments.filter((item) =>
      String(item.status || "").toUpperCase() === "REJECTED"
    ).length;

    return { submitted, approved, rejected };
  }, [payments]);

  const recentPayments = useMemo(() => {
    return [...payments]
      .filter((item) => item.amount && Number(item.amount) > 0)
      .sort((a, b) =>
        String(b.submittedAt || b.paymentDate || b.createdAt || "").localeCompare(
          String(a.submittedAt || a.paymentDate || a.createdAt || "")
        )
      )
      .slice(0, 6);
  }, [payments]);

  const monthlyPaymentBars = useMemo(() => {
    const months: { key: string; label: string; value: number }[] = [];
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - index,
        1,
      );

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      months.push({
        key,
        label: date.toLocaleString("en-US", {
          month: "short",
        }),
        value: 0,
      });
    }

    payments.forEach((payment) => {
      const status = String(
        payment.status || "APPROVED",
      ).toUpperCase();

      if (status !== "APPROVED") return;

      const monthKey = String(
        payment.paymentDate ||
          payment.submittedAt ||
          payment.createdAt ||
          "",
      ).slice(0, 7);

      const month = months.find(
        (item) => item.key === monthKey,
      );

      if (month) {
        month.value += Number(
          payment.amount || 0,
        );
      }
    });

    return months;
  }, [payments]);

  async function reviewPayment(
    paymentId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    if (!selectedHostelId) return;

    const action =
      status === "APPROVED"
        ? "approve"
        : "reject";

    Alert.alert(
      `${action.charAt(0).toUpperCase()}${action.slice(1)} payment proof`,
      `Are you sure you want to ${action} this payment proof?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: status === "APPROVED" ? "Approve" : "Reject",
          style:
            status === "APPROVED"
              ? "default"
              : "destructive",
          onPress: async () => {
            setPaymentActionId(paymentId);

            try {
              await request(
                `/hostels/${selectedHostelId}/payments/${paymentId}/status`,
                {
                  method: "PATCH",
                  body: JSON.stringify({
                    status,
                  }),
                },
              );

              await refreshAll();

              Alert.alert(
                "Updated",
                `Payment proof ${status.toLowerCase()}.`,
              );
            } catch (err) {
              Alert.alert(
                "Unable to update payment",
                err instanceof Error
                  ? err.message
                  : "Please try again.",
              );
            } finally {
              setPaymentActionId("");
            }
          },
        },
      ],
    );
  }






  async function openRenterDetails(renter: Renter) {
    setSelectedRenter(renter);
    setShowRenterDetailsModal(true);
    setRenterDetailsLoading(true);

    try {
      const data = await request(
        `/hostels/${selectedHostelId}/renters/${renter.id}`,
      );

      if (data && typeof data === "object" && "renter" in data) {
        setSelectedRenter((data as { renter: Renter }).renter);
      }
    } catch (err) {
      Alert.alert(
        "Unable to load renter details",
        err instanceof Error ? err.message : "Showing the available renter details.",
      );
    } finally {
      setRenterDetailsLoading(false);
    }
  }

  function openEditRenter(renter: Renter) {
    setShowRenterDetailsModal(false);
    setEditingRenterId(renter.id);
    setEditRenterRoomId(renter.roomId || renter.room?.id || "");
    setEditGuardianPhone(renter.guardianPhone || "");
    setEditJoiningDate(renter.joiningDate || today());
    setEditMonthlyFee(
      renter.monthlyFee !== undefined ? String(renter.monthlyFee) : "",
    );
    setEditSecurityDeposit(
      renter.securityDeposit !== undefined
        ? String(renter.securityDeposit)
        : "",
    );
    setEditRenterStatus(
      String(renter.status || "ACTIVE").toUpperCase(),
    );
    setShowEditRenterModal(true);
  }

  async function updateRenter() {
    if (!editingRenterId) return;
    if (!editRenterRoomId) return Alert.alert("Room required", "Select a room.");
    if (!editJoiningDate.trim()) return Alert.alert("Joining date required", "Enter the joining date.");

    const monthly = Number(editMonthlyFee);
    const deposit = Number(editSecurityDeposit || 0);

    if (!Number.isFinite(monthly) || monthly < 0) {
      return Alert.alert("Invalid monthly fee", "Enter a valid amount.");
    }
    if (!Number.isFinite(deposit) || deposit < 0) {
      return Alert.alert("Invalid security deposit", "Enter a valid amount.");
    }

    setEditRenterSaving(true);
    try {
      await request(`/hostels/${selectedHostelId}/renters/${editingRenterId}`, {
        method: "PATCH",
        body: JSON.stringify({
          roomId: editRenterRoomId,
          guardianPhone: editGuardianPhone.trim(),
          joiningDate: editJoiningDate.trim(),
          monthlyFee: monthly,
          securityDeposit: deposit,
          status: editRenterStatus,
        }),
      });
      setShowEditRenterModal(false);
      await refreshAll();
      Alert.alert("Renter updated", "The renter details were updated successfully.");
    } catch (err) {
      Alert.alert("Unable to update renter", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setEditRenterSaving(false);
    }
  }

  function removeRenter(renter: Renter) {
    Alert.alert(
      "Delete renter permanently",
      `${getName(renter)} and all related data will be permanently deleted. This includes the renter account, fees, payments/payment proofs, repairs, notifications, and uploaded files. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            try {
              await request(
                `/hostels/${selectedHostelId}/renters/${renter.id}`,
                { method: "DELETE" },
              );

              setShowRenterDetailsModal(false);
              setSelectedRenter(null);
              await refreshAll();

              Alert.alert(
                "Renter deleted",
                "The renter and all related data were permanently deleted.",
              );
            } catch (err) {
              Alert.alert(
                "Unable to delete renter",
                err instanceof Error ? err.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }





  // Payments and More screens are now extracted to PaymentsScreen and MoreScreen components

  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <KeyboardAvoidingView style={styles.loginWrapper} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
            <View style={styles.loginInner}>
              <View style={styles.brandMark}><Ionicons name="business" size={23} color="#FFFFFF" /></View>
              <Text style={styles.brandText}>StayNexa</Text>
              <Text style={styles.loginTitle}>Admin Login</Text>
              <Text style={styles.loginSubtitle}>Manage your hostels from one place.</Text>

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="mail-outline" size={20} color={COLORS.secondary} />
                <TextInput style={styles.inputWithIconText} value={email} onChangeText={setEmail} placeholder="Enter your email" placeholderTextColor="#94A3B8" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.secondary} />
                <TextInput style={styles.inputWithIconText} value={password} onChangeText={setPassword} placeholder="Enter your password" placeholderTextColor="#94A3B8" secureTextEntry={!showPassword} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}><Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color={COLORS.secondary} /></TouchableOpacity>
              </View>

              {error ? <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} /><Text style={styles.errorText}>{error}</Text></View> : null}
              <TouchableOpacity style={[styles.primaryButton, { marginTop: 12 }]} disabled={loading} onPress={() => void login()}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryButtonText}>Login</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.appContainer}>
        <View style={{ flex: 1 }}>
          {page === "dashboard" && (
            <DashboardScreen
              dashboard={dashboard}
              selectedHostel={selectedHostel}
              payments={payments}
              paymentProofStats={paymentProofStats}
              recentPayments={recentPayments}
              monthlyPaymentBars={monthlyPaymentBars}
              onRefresh={() => void refreshAll()}
            />
          )}
          {page === "hostels" && (
            <HostelsScreen
              hostels={hostels}
              selectedHostelId={selectedHostelId}
              onSelectHostel={(id: string) => {
                setSelectedHostelId(id);
                setPage("dashboard");
              }}
              onRefresh={() => void refreshAll()}
            />
          )}
          {page === "rooms" && (
            <RoomsScreen
              rooms={rooms}
              selectedHostel={selectedHostel}
              showRoomModal={showRoomModal}
              setShowRoomModal={setShowRoomModal}
              roomNumber={roomNumber}
              setRoomNumber={setRoomNumber}
              roomFloor={roomFloor}
              setRoomFloor={setRoomFloor}
              roomSaving={roomSaving}
              onAddRoom={() => void addRoom()}
              onDeleteRoom={(room) => deleteRoom(room)}
              onRefresh={() => void refreshAll()}
            />
          )}
          {page === "renters" && (
            <RentersScreen
              renters={renters}
              activeRenters={activeRenters}
              rooms={rooms}
              activeRooms={activeRooms}
              selectedHostel={selectedHostel}
              renterSearch={renterSearch}
              setRenterSearch={setRenterSearch}
              showRenterDetailsModal={showRenterDetailsModal}
              setShowRenterDetailsModal={setShowRenterDetailsModal}
              selectedRenter={selectedRenter}
              renterDetailsLoading={renterDetailsLoading}
              onOpenRenterDetails={(renter) => void openRenterDetails(renter)}
              onOpenEditRenter={(renter) => openEditRenter(renter)}
              onRemoveRenter={(renter) => removeRenter(renter)}
              showRenterModal={showRenterModal}
              setShowRenterModal={setShowRenterModal}
              onOpenRenterModal={openRenterModal}
              firstName={firstName}
              setFirstName={setFirstName}
              lastName={lastName}
              setLastName={setLastName}
              renterEmail={renterEmail}
              setRenterEmail={setRenterEmail}
              renterPhone={renterPhone}
              setRenterPhone={setRenterPhone}
              guardianPhone={guardianPhone}
              setGuardianPhone={setGuardianPhone}
              renterPassword={renterPassword}
              setRenterPassword={setRenterPassword}
              showRenterPassword={showRenterPassword}
              setShowRenterPassword={setShowRenterPassword}
              renterRoomId={renterRoomId}
              setRenterRoomId={setRenterRoomId}
              joiningDate={joiningDate}
              setJoiningDate={setJoiningDate}
              monthlyFee={monthlyFee}
              setMonthlyFee={setMonthlyFee}
              securityDeposit={securityDeposit}
              setSecurityDeposit={setSecurityDeposit}
              renterSaving={renterSaving}
              onAddRenter={() => void addRenter()}
              renterRoomPickerOpen={renterRoomPickerOpen}
              setRenterRoomPickerOpen={setRenterRoomPickerOpen}
              showEditRenterModal={showEditRenterModal}
              setShowEditRenterModal={setShowEditRenterModal}
              editingRenterId={editingRenterId}
              editRenterRoomId={editRenterRoomId}
              setEditRenterRoomId={setEditRenterRoomId}
              editGuardianPhone={editGuardianPhone}
              setEditGuardianPhone={setEditGuardianPhone}
              editJoiningDate={editJoiningDate}
              setEditJoiningDate={setEditJoiningDate}
              editMonthlyFee={editMonthlyFee}
              setEditMonthlyFee={setEditMonthlyFee}
              editSecurityDeposit={editSecurityDeposit}
              setEditSecurityDeposit={setEditSecurityDeposit}
              editRenterStatus={editRenterStatus}
              setEditRenterStatus={setEditRenterStatus}
              editRenterSaving={editRenterSaving}
              onUpdateRenter={() => void updateRenter()}
              editRenterRoomPickerOpen={editRenterRoomPickerOpen}
              setEditRenterRoomPickerOpen={setEditRenterRoomPickerOpen}
              onRefresh={() => void refreshAll()}
            />
          )}
          {page === "fees" && (
            <FeesScreen
              fees={fees}
              renters={renters}
              activeRenters={activeRenters}
              selectedHostel={selectedHostel}
              showFeeModal={showFeeModal}
              setShowFeeModal={setShowFeeModal}
              feeRenterId={feeRenterId}
              setFeeRenterId={setFeeRenterId}
              feeMonth={feeMonth}
              setFeeMonth={setFeeMonth}
              feeAmount={feeAmount}
              setFeeAmount={setFeeAmount}
              feeDueDate={feeDueDate}
              setFeeDueDate={setFeeDueDate}
              feeDescription={feeDescription}
              setFeeDescription={setFeeDescription}
              feeSaving={feeSaving}
              feeRenterPickerOpen={feeRenterPickerOpen}
              setFeeRenterPickerOpen={setFeeRenterPickerOpen}
              onOpenFeeModal={() => openFeeModal()}
              onAddFee={() => void addFee()}
              onRefresh={() => void refreshAll()}
            />
          )}
          {page === "payments" && (
            <PaymentsScreen
              payments={payments}
              renters={renters}
              selectedHostel={selectedHostel}
              paymentActionId={paymentActionId}
              onReviewPayment={(id, status) => void reviewPayment(id, status)}
              onRefresh={() => void refreshAll()}
            />
          )}
          {page === "more" && (
            <MoreScreen
              onNavigateToFees={() => setPage("fees")}
              onNavigateToPayments={() => setPage("payments")}
              onNavigateToDashboard={() => setPage("dashboard")}
              onRefresh={() => void refreshAll()}
              onLogout={() => void logout()}
            />
          )}
        </View>
        <View style={styles.bottomNav}>
          <BottomTab icon="home-outline" activeIcon="home" label="Home" active={page === "dashboard"} onPress={() => setPage("dashboard")} />
          <BottomTab icon="business-outline" activeIcon="business" label="Hostels" active={page === "hostels"} onPress={() => setPage("hostels")} />
          <BottomTab icon="grid-outline" activeIcon="grid" label="Rooms" active={page === "rooms"} onPress={() => setPage("rooms")} />
          <BottomTab icon="people-outline" activeIcon="people" label="Renters" active={page === "renters"} onPress={() => setPage("renters")} />
          <BottomTab icon="menu-outline" activeIcon="menu" label="More" active={page === "more" || page === "fees" || page === "payments"} onPress={() => setPage("more")} />
        </View>
      </View>
      {dataLoading ? <View style={styles.refreshOverlay}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={styles.refreshOverlayText}>Refreshing…</Text></View> : null}
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  appContainer: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 20, paddingBottom: 34 },
  header: { flexDirection: "row", alignItems: "center", paddingBottom: 18, paddingTop: 4 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  headerSubtitle: { marginTop: 5, color: COLORS.secondary, fontSize: 14, lineHeight: 20 },
  refreshButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginLeft: 12 },
  propertyCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 18 },
  propertyIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  propertyLabel: { fontSize: 10, fontWeight: "800", color: COLORS.secondary, letterSpacing: 1 },
  propertyName: { marginTop: 4, fontSize: 16, fontWeight: "800", color: COLORS.text },
  propertyLocation: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  statCard: { width: "48%", borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 15 },
  statIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", marginBottom: 11 },
  statTitle: { fontSize: 12, color: COLORS.secondary, fontWeight: "600" },
  statValue: { marginTop: 5, fontSize: 22, fontWeight: "800", color: COLORS.text },
  sectionHeader: { marginTop: 23, marginBottom: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { marginTop: 3, color: COLORS.secondary, fontSize: 12 },
  sectionAction: { fontSize: 13, fontWeight: "800", color: COLORS.primary },
  chartCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginBottom: 3 },
  chartCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  chartTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  chartSubtitle: { marginTop: 4, fontSize: 12, color: COLORS.secondary },
  chartBlock: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  legendList: { flex: 1, marginLeft: 13, gap: 9 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  legendLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  legendDot: { width: 9, height: 9, borderRadius: 9, marginRight: 7 },
  legendLabel: { fontSize: 12, color: COLORS.secondary, flexShrink: 1 },
  legendValue: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  rateBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 13, paddingVertical: 7, paddingHorizontal: 10, alignItems: "center" },
  rateValue: { color: COLORS.primary, fontSize: 16, fontWeight: "800" },
  rateLabel: { color: COLORS.secondary, fontSize: 9, marginTop: 1 },
  outstandingBox: { borderRadius: 13, backgroundColor: COLORS.dangerLight, padding: 12, marginTop: 7 },
  outstandingLabel: { fontSize: 11, color: COLORS.danger },
  outstandingAmount: { marginTop: 3, fontSize: 18, fontWeight: "800", color: COLORS.danger },
  noDataText: { color: COLORS.secondary, fontSize: 13, lineHeight: 20, paddingVertical: 10 },
  barChartContainer: { marginTop: 12, alignItems: "center" },
  horizontalBarHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  horizontalBarLabel: { fontSize: 12, color: COLORS.secondary },
  horizontalBarValue: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  horizontalTrack: { height: 10, borderRadius: 99, backgroundColor: COLORS.grayFill, overflow: "hidden" },
  horizontalFill: { height: "100%", borderRadius: 99 },
  paymentRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paymentIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 10 },
  paymentAmount: { fontSize: 14, fontWeight: "800", color: COLORS.text },
  paymentMeta: { marginTop: 3, fontSize: 11, color: COLORS.secondary },
  paymentNotice: { borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: COLORS.primaryLight, borderRadius: 15, padding: 13, flexDirection: "row", alignItems: "flex-start", marginBottom: 15 },
  paymentNoticeText: { flex: 1, marginLeft: 9, color: COLORS.text, fontSize: 12, lineHeight: 18 },
  paymentStatusBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  paymentStatusText: { fontSize: 10, fontWeight: "800" },
  paymentReviewCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 15, marginBottom: 12, backgroundColor: COLORS.card },
  paymentReviewTop: { flexDirection: "row", alignItems: "center", marginBottom: 13 },
  paymentReviewIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 11 },
  paymentReviewAmount: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  paymentReviewRenter: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  paymentReviewMetaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  proofImageContainer: { height: 220, borderRadius: 14, overflow: "hidden", backgroundColor: COLORS.muted, marginTop: 3, position: "relative" },
  proofImage: { width: "100%", height: "100%" },
  proofOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, paddingVertical: 9, backgroundColor: "rgba(15, 23, 42, 0.62)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  proofOverlayText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  noProofBox: { borderRadius: 13, backgroundColor: COLORS.muted, padding: 12, flexDirection: "row", alignItems: "center", marginTop: 3 },
  noProofText: { marginLeft: 8, color: COLORS.secondary, fontSize: 12 },
  reviewNoteBox: { marginTop: 12, borderRadius: 12, backgroundColor: COLORS.muted, padding: 11 },
  reviewNoteLabel: { fontSize: 10, color: COLORS.secondary, fontWeight: "800", textTransform: "uppercase" },
  reviewNoteText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: COLORS.text },
  reviewActions: { flexDirection: "row", gap: 9, marginTop: 14 },
  reviewButton: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  rejectButton: { borderWidth: 1, borderColor: "#FECACA", backgroundColor: COLORS.dangerLight },
  approveButton: { backgroundColor: COLORS.success },
  rejectButtonText: { fontSize: 13, fontWeight: "800", color: COLORS.danger },
  approveButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  proofViewerBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.92)", alignItems: "center", justifyContent: "center" },
  proofViewerClose: { position: "absolute", top: Platform.OS === "ios" ? 58 : 32, right: 18, zIndex: 2, width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  proofViewerImage: { width: "100%", height: "78%" },
  liveUpdateCard: { marginTop: 15, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: COLORS.primaryLight, borderRadius: 14, padding: 12, flexDirection: "row", gap: 9 },
  liveUpdateText: { flex: 1, fontSize: 12, lineHeight: 18, color: COLORS.primaryDark },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  smallPrimaryButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  itemCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 11, backgroundColor: COLORS.card },
  itemIcon: { width: 45, height: 45, borderRadius: 13, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 11 },
  itemTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  itemSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  roomTag: { marginTop: 5, fontSize: 11, fontWeight: "700", color: COLORS.primary },
  renterCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "flex-start", marginBottom: 11, backgroundColor: COLORS.card },
  renterSearchBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.card, minHeight: 50, paddingHorizontal: 13, marginBottom: 16 },
  renterSearchInput: { flex: 1, marginLeft: 9, color: COLORS.text, fontSize: 14, paddingVertical: 10 },
  renterDetailsHero: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 14, backgroundColor: COLORS.primaryLight },
  renterDetailsName: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  renterDetailsGrid: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, gap: 12, marginBottom: 4 },
  renterDetailSectionTitle: { marginTop: 8, marginBottom: 8, fontSize: 13, fontWeight: "800", color: COLORS.text },
  renterDetailsActions: { flexDirection: "row", gap: 9, marginTop: 16, marginBottom: 6 },
  renterDetailsLoading: { flexDirection: "row", alignItems: "center", gap: 9, paddingBottom: 12 },
  avatarLarge: { width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarLargeText: { fontSize: 22, color: COLORS.primary, fontWeight: "800" },
  renterActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  editButton: { borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  editButtonText: { color: COLORS.primary, fontSize: 11, fontWeight: "800" },
  removeButton: { borderWidth: 1, borderColor: "#FECACA", backgroundColor: COLORS.dangerLight, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  removeButtonText: { color: COLORS.danger, fontSize: 11, fontWeight: "800" },
  statusSelectorRow: { flexDirection: "row", gap: 7, marginBottom: 15 },
  statusSelectorButton: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 11, paddingVertical: 11, alignItems: "center", backgroundColor: COLORS.background },
  statusSelectorButtonActive: { borderColor: "#93C5FD", backgroundColor: COLORS.primaryLight },
  statusSelectorText: { fontSize: 10, fontWeight: "800", color: COLORS.secondary },
  statusSelectorTextActive: { color: COLORS.primary },
  deleteButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: COLORS.dangerLight, alignItems: "center", justifyContent: "center" },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 11 },
  avatarText: { fontSize: 17, color: COLORS.primary, fontWeight: "800" },
  statusBadge: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  hostelCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  hostelSelected: { borderColor: "#BFDBFE", backgroundColor: "#FBFDFF" },
  hostelIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12 },
  hostelName: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  hostelLocation: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  feeCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 15, marginBottom: 12 },
  feeTopRow: { flexDirection: "row", alignItems: "flex-start" },
  feeDetailsRow: { flexDirection: "row", gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailLabel: { fontSize: 10, color: COLORS.secondary },
  detailValue: { marginTop: 3, fontSize: 13, fontWeight: "800", color: COLORS.text },
  feeDescription: { marginTop: 10, backgroundColor: COLORS.grayFill, borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 18, color: COLORS.secondary },
  moreRow: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 11 },
  moreIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 12 },
  moreTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  moreSubtitle: { marginTop: 3, fontSize: 12, color: COLORS.secondary },
  emptyState: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 17, paddingVertical: 34, paddingHorizontal: 18, alignItems: "center", marginTop: 6 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  emptyDescription: { marginTop: 6, fontSize: 13, lineHeight: 20, color: COLORS.secondary, textAlign: "center", maxWidth: 300 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  modalKeyboard: { width: "100%" },
  modalCard: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalCardLarge: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  pickerCard: { backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  modalTitle: { fontSize: 21, fontWeight: "800", color: COLORS.text },
  modalSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 18, color: COLORS.secondary, maxWidth: 285 },
  closeButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.grayFill, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 7, marginTop: 3 },
  input: { minHeight: 52, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, fontSize: 15, color: COLORS.text, marginBottom: 13, backgroundColor: COLORS.background },
  inputWithIcon: { minHeight: 52, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", marginBottom: 13 },
  inputWithIconText: { flex: 1, minHeight: 50, marginLeft: 9, color: COLORS.text, fontSize: 15 },
  selector: { minHeight: 52, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  selectorText: { fontSize: 14, color: COLORS.text, fontWeight: "600" },
  primaryButton: { minHeight: 54, borderRadius: 14, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 16, marginTop: 8 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pickerRow: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 9 },
  pickerSelected: { borderColor: "#BFDBFE", backgroundColor: "#F8FBFF" },
  pickerIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 11 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderColor: "#FECACA", backgroundColor: COLORS.dangerLight, borderRadius: 12, padding: 12, marginTop: 3 },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, lineHeight: 19 },
  loginWrapper: { flex: 1, backgroundColor: COLORS.background },
  loginContent: { flexGrow: 1, justifyContent: "center", padding: 22 },
  loginInner: { width: "100%", alignSelf: "center", transform: [{ translateY: -35 }] },
  brandMark: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  brandText: { fontSize: 18, fontWeight: "800", color: COLORS.primary, marginBottom: 24 },
  loginTitle: { fontSize: 30, fontWeight: "800", color: COLORS.text },
  loginSubtitle: { marginTop: 7, marginBottom: 26, fontSize: 15, lineHeight: 22, color: COLORS.secondary },
  bottomNav: { minHeight: 72, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: Platform.OS === "ios" ? 8 : 4 },
  bottomTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 7 },
  bottomLabel: { marginTop: 4, fontSize: 10, fontWeight: "600", color: COLORS.secondary },
  bottomLabelActive: { color: COLORS.primary, fontWeight: "800" },
  refreshOverlay: { position: "absolute", right: 16, bottom: 83, backgroundColor: "#FFFFFF", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  refreshOverlayText: { fontSize: 11, color: COLORS.secondary },
});

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

export default App;
