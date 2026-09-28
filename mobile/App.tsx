import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import Svg, {
  Circle,
  G,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase.ts";

const API_URL = "http://192.168.0.183:3000/api/v1";

const COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryLight: "#EFF6FF",
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#0F172A",
  secondary: "#64748B",
  border: "#E2E8F0",
  success: "#16A34A",
  successLight: "#F0FDF4",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  purple: "#7C3AED",
  purpleLight: "#F5F3FF",
  orange: "#EA580C",
  orangeLight: "#FFF7ED",
  grayFill: "#F1F5F9",
};

type Tab = "dashboard" | "hostels" | "rooms" | "renters" | "fees" | "payments" | "more";

type Hostel = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
};

type Room = {
  id: string;
  roomNumber: string;
  floor?: string | number;
  status?: string;
};

type Renter = {
  id: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  guardianPhone?: string;
  status?: string;
  roomId?: string;
  joiningDate?: string;
  monthlyFee?: number;
  securityDeposit?: number;
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    profilePhotoUrl?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  };
  room?: {
    id?: string;
    roomNumber?: string;
    floor?: string | number | null;
  };
};

type Fee = {
  id: string;
  renterId: string;
  month: string;
  amount: number;
  paidAmount?: number;
  dueDate: string;
  description?: string;
  status?: string;
};

type Payment = {
  id: string;
  renterId?: string;
  feeId?: string;
  amount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
  proofUrl?: string;
  status?: string;
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt?: string;
};

type Repair = {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  createdAt?: string;
};

type Dashboard = {
  totalRooms: number;
  activeRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  activeRenters: number;
  totalFees: number;
  paidFees: number;
  pendingFees: number;
  partiallyPaidFees: number;
  overdueFees: number;
  outstandingFees: number;
  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;
  totalRepairRequests: number;
  submittedRepairs: number;
  inProgressRepairs: number;
  resolvedRepairs: number;
  cancelledRepairs: number;
};

const EMPTY_DASHBOARD: Dashboard = {
  totalRooms: 0,
  activeRooms: 0,
  occupiedRooms: 0,
  availableRooms: 0,
  activeRenters: 0,
  totalFees: 0,
  paidFees: 0,
  pendingFees: 0,
  partiallyPaidFees: 0,
  overdueFees: 0,
  outstandingFees: 0,
  totalPayments: 0,
  paidPayments: 0,
  pendingPayments: 0,
  totalRepairRequests: 0,
  submittedRepairs: 0,
  inProgressRepairs: 0,
  resolvedRepairs: 0,
  cancelledRepairs: 0,
};

function getName(renter: Renter): string {
  if (renter.name) return renter.name;
  if (renter.fullName) return renter.fullName;
  if (renter.user?.name) return renter.user.name;
  if (renter.user?.fullName) return renter.user.fullName;
  const first = renter.user?.firstName ?? "";
  const last = renter.user?.lastName ?? "";
  return `${first} ${last}`.trim() || renter.email || renter.user?.email || "Renter";
}

function getEmail(renter: Renter): string {
  return renter.email || renter.user?.email || "";
}

function listFrom<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (!data || typeof data !== "object") return [];
  const object = data as Record<string, unknown>;
  if (Array.isArray(object[key])) return object[key] as T[];
  if (Array.isArray(object.data)) return object.data as T[];
  if (Array.isArray(object.items)) return object.items as T[];
  return [];
}

function dashboardFrom(data: unknown): Dashboard {
  const outer = data as Record<string, unknown> | null;
  const raw = (outer?.dashboard ?? data) as Record<string, unknown> | null;
  const value = raw || {};
  const number = (key: string) => Number(value[key] ?? 0);

  return {
    totalRooms: number("totalRooms"),
    activeRooms: number("activeRooms"),
    occupiedRooms: number("occupiedRooms"),
    availableRooms: number("availableRooms"),
    activeRenters: number("activeRenters"),
    totalFees: number("totalFees"),
    paidFees: number("paidFees"),
    pendingFees: number("pendingFees"),
    partiallyPaidFees: number("partiallyPaidFees"),
    overdueFees: number("overdueFees"),
    outstandingFees: number("outstandingFees"),
    totalPayments: number("totalPayments"),
    paidPayments: number("paidPayments"),
    pendingPayments: number("pendingPayments"),
    totalRepairRequests: number("totalRepairRequests"),
    submittedRepairs: number("submittedRepairs"),
    inProgressRepairs: number("inProgressRepairs"),
    resolvedRepairs: number("resolvedRepairs"),
    cancelledRepairs: number("cancelledRepairs"),
  };
}

function money(value: number | undefined): string {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function statusLabel(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

async function jsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function Header({ title, subtitle, onRefresh }: { title: string; subtitle?: string; onRefresh?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {onRefresh ? (
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={21} color={COLORS.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function StatCard({ title, value, icon, tone }: { title: string; value: string | number; icon: keyof typeof Ionicons.glyphMap; tone: "blue" | "green" | "orange" | "purple" | "red" }) {
  const toneMap = {
    blue: { bg: COLORS.primaryLight, icon: COLORS.primary },
    green: { bg: COLORS.successLight, icon: COLORS.success },
    orange: { bg: COLORS.orangeLight, icon: COLORS.orange },
    purple: { bg: COLORS.purpleLight, icon: COLORS.purple },
    red: { bg: COLORS.dangerLight, icon: COLORS.danger },
  } as const;
  const colors = toneMap[tone];

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: colors.bg }]}>
        <Ionicons name={icon} size={21} color={colors.icon} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function DonutChart({ data, centerText, centerSub }: { data: { label: string; value: number; color: string }[]; centerText: string; centerSub: string }) {
  const size = 190;
  const strokeWidth = 24;
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  let offset = 0;
  const circles = data.map((item, index) => {
    const fraction = total > 0 ? Math.max(0, item.value) / total : 0;
    const dash = fraction * circumference;
    const element = (
      <Circle
        key={`${item.label}-${index}`}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={item.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    );
    offset += dash;
    return element;
  });

  return (
    <View style={styles.chartBlock}>
      <View style={{ alignItems: "center" }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS.grayFill}
            strokeWidth={strokeWidth}
          />
          {circles}
          <SvgText x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="23" fontWeight="800" fill={COLORS.text}>
            {centerText}
          </SvgText>
          <SvgText x={size / 2} y={size / 2 + 19} textAnchor="middle" fontSize="11" fill={COLORS.secondary}>
            {centerSub}
          </SvgText>
        </Svg>
      </View>
      <View style={styles.legendList}>
        {data.map((item) => (
          <View key={item.label} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
            <Text style={styles.legendValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const width = 330;
  const height = 220;
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 14;
  const paddingBottom = 34;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const max = Math.max(1, ...data.map((item) => item.value));
  const gap = 12;
  const barWidth = data.length > 0 ? (chartWidth - gap * (data.length - 1)) / data.length : 0;

  return (
    <View style={styles.barChartContainer}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke={COLORS.border} strokeWidth="1" />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke={COLORS.border} strokeWidth="1" />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke={COLORS.border} strokeWidth="1" />
        {data.map((item, index) => {
          const x = paddingLeft + index * (barWidth + gap);
          const h = (item.value / max) * chartHeight;
          const y = paddingTop + chartHeight - h;
          return (
            <G key={`${item.label}-${index}`}>
              <Rect x={x} y={y} width={barWidth} height={Math.max(2, h)} rx="7" fill={item.color} />
              <SvgText x={x + barWidth / 2} y={Math.max(12, y - 7)} textAnchor="middle" fontSize="10" fontWeight="700" fill={COLORS.text}>
                {item.value}
              </SvgText>
              <SvgText x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="9" fill={COLORS.secondary}>
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function HorizontalBars({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <View style={{ gap: 14 }}>
      {data.map((item) => (
        <View key={item.label}>
          <View style={styles.horizontalBarHeader}>
            <Text style={styles.horizontalBarLabel}>{item.label}</Text>
            <Text style={styles.horizontalBarValue}>{item.value}</Text>
          </View>
          <View style={styles.horizontalTrack}>
            <View style={[styles.horizontalFill, { width: `${(item.value / max) * 100}%`, backgroundColor: item.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({ icon, title, description }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
    </View>
  );
}

function MoreRow({ icon, title, subtitle, onPress, danger = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity style={styles.moreRow} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.moreIcon, { backgroundColor: danger ? COLORS.dangerLight : COLORS.primaryLight }]}>
        <Ionicons name={icon} size={22} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.moreTitle, danger && { color: COLORS.danger }]}>{title}</Text>
        <Text style={styles.moreSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
    </TouchableOpacity>
  );
}

function BottomTab({ icon, activeIcon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.bottomTab} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={active ? activeIcon : icon} size={23} color={active ? COLORS.primary : COLORS.secondary} />
      <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

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
  const [proofPreviewUrl, setProofPreviewUrl] = useState("");

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

  function renderDashboard() {
    const occupancyRate = dashboard.totalRooms > 0 ? Math.round((dashboard.occupiedRooms / dashboard.totalRooms) * 100) : 0;
    const roomChart = [
      { label: "Occupied", value: dashboard.occupiedRooms, color: COLORS.primary },
      { label: "Available", value: dashboard.availableRooms, color: COLORS.success },
    ];
    const feeChart = [
      { label: "Paid", value: dashboard.paidFees, color: COLORS.success },
      { label: "Pending", value: dashboard.pendingFees, color: COLORS.primary },
      { label: "Partial", value: dashboard.partiallyPaidFees, color: COLORS.warning },
      { label: "Overdue", value: dashboard.overdueFees, color: COLORS.danger },
    ];
    const repairChart = [
      { label: "Submitted", value: dashboard.submittedRepairs, color: COLORS.primary },
      { label: "Progress", value: dashboard.inProgressRepairs, color: COLORS.warning },
      { label: "Resolved", value: dashboard.resolvedRepairs, color: COLORS.success },
      { label: "Cancelled", value: dashboard.cancelledRepairs, color: COLORS.secondary },
    ];

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header title="Dashboard" subtitle="Live overview of your StayNexa operations." onRefresh={() => void refreshAll()} />

        {selectedHostel ? (
          <View style={styles.propertyCard}>
            <View style={styles.propertyIcon}>
              <Ionicons name="business-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.propertyLabel}>MANAGING HOSTEL</Text>
              <Text style={styles.propertyName}>{selectedHostel.name}</Text>
              <Text style={styles.propertyLocation}>
                {selectedHostel.city || ""}{selectedHostel.city && selectedHostel.state ? ", " : ""}{selectedHostel.state || ""}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.statsGrid}>
          <StatCard title="Total Rooms" value={dashboard.totalRooms} icon="grid-outline" tone="blue" />
          <StatCard title="Available Rooms" value={dashboard.availableRooms} icon="checkmark-circle-outline" tone="green" />
          <StatCard title="Occupied Rooms" value={dashboard.occupiedRooms} icon="people-outline" tone="blue" />
          <StatCard title="Active Renters" value={dashboard.activeRenters} icon="person-outline" tone="orange" />
          <StatCard title="Outstanding Fees" value={money(dashboard.outstandingFees)} icon="wallet-outline" tone="red" />
          <StatCard title="Payments" value={dashboard.totalPayments} icon="card-outline" tone="purple" />
        </View>

        <SectionTitle title="Room occupancy" />
        <View style={styles.chartCard}>
          <View style={styles.chartCardHeader}>
            <View>
              <Text style={styles.chartTitle}>Occupancy distribution</Text>
              <Text style={styles.chartSubtitle}>Occupied rooms versus available rooms</Text>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateValue}>{occupancyRate}%</Text>
              <Text style={styles.rateLabel}>occupied</Text>
            </View>
          </View>
          <DonutChart data={roomChart} centerText={`${occupancyRate}%`} centerSub="occupied" />
        </View>

        <SectionTitle title="Fee status" />
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Current fee collection</Text>
          <Text style={styles.chartSubtitle}>Live totals from the backend</Text>
          <DonutChart data={feeChart} centerText={String(dashboard.totalFees)} centerSub="fees" />
          <View style={styles.outstandingBox}>
            <Text style={styles.outstandingLabel}>Outstanding amount</Text>
            <Text style={styles.outstandingAmount}>{money(dashboard.outstandingFees)}</Text>
          </View>
        </View>

        <SectionTitle title="Repair requests" />
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Repair status</Text>
          <Text style={styles.chartSubtitle}>Current request workflow</Text>
          <DonutChart data={repairChart} centerText={String(dashboard.totalRepairRequests)} centerSub="requests" />
        </View>

        <SectionTitle title="Payment proof review" />
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Proof status</Text>
          <Text style={styles.chartSubtitle}>Payments are made outside StayNexa; this dashboard reviews submitted proof.</Text>
          <DonutChart
            data={[
              { label: "Submitted", value: paymentProofStats.submitted, color: COLORS.warning },
              { label: "Approved", value: paymentProofStats.approved, color: COLORS.success },
              { label: "Rejected", value: paymentProofStats.rejected, color: COLORS.danger },
            ]}
            centerText={String(payments.length)}
            centerSub="proofs"
          />
        </View>

        <SectionTitle title="Approved payment activity" />
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Approved payments by month</Text>
          <Text style={styles.chartSubtitle}>Only approved payment proofs are included.</Text>
          {monthlyPaymentBars.some((item) => item.value > 0) ? (
            <BarChart
              data={monthlyPaymentBars.map((item) => ({
                label: item.label,
                value: Math.round(item.value),
                color: COLORS.primary,
              }))}
            />
          ) : (
            <EmptyState
              icon="bar-chart-outline"
              title="No approved payment activity"
              description="Approved payment proofs will appear here."
            />
          )}
        </View>

        <SectionTitle title="Recent payment proofs" />
        <View style={styles.chartCard}>
          {recentPayments.length === 0 ? (
            <Text style={styles.noDataText}>No payment proofs have been submitted.</Text>
          ) : (
            recentPayments.map((payment) => {
              const status = String(
                payment.status || "APPROVED",
              ).toUpperCase();
              const proofStatus =
                status === "SUBMITTED" || status === "PENDING"
                  ? "SUBMITTED"
                  : status;
              const statusStyle =
                proofStatus === "APPROVED"
                  ? { bg: COLORS.successLight, fg: COLORS.success }
                  : proofStatus === "REJECTED"
                    ? { bg: COLORS.dangerLight, fg: COLORS.danger }
                    : { bg: COLORS.warningLight, fg: COLORS.warning };

              return (
                <View key={payment.id} style={styles.paymentRow}>
                  <View style={styles.paymentIcon}>
                    <Ionicons
                      name="image-outline"
                      size={19}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentAmount}>
                      {money(Number(payment.amount || 0))}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {payment.paymentDate || payment.submittedAt || payment.createdAt || "-"}
                    </Text>
                  </View>
                  <View style={[styles.paymentStatusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.paymentStatusText, { color: statusStyle.fg }]}>
                      {statusLabel(proofStatus)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.liveUpdateCard}>
          <Ionicons name="sync-outline" size={19} color={COLORS.primary} />
          <Text style={styles.liveUpdateText}>Dashboard auto-refreshes every 4 seconds and also refreshes immediately after changes.</Text>
        </View>
      </ScrollView>
    );
  }

  function renderHostels() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        <Header title="Hostels" subtitle="Choose the hostel you want to manage." onRefresh={() => void refreshAll()} />
        {hostels.length === 0 ? (
          <EmptyState icon="business-outline" title="No hostels found" description="No hostels are assigned to this admin account." />
        ) : (
          hostels.map((hostel) => (
            <TouchableOpacity key={hostel.id} style={[styles.hostelCard, hostel.id === selectedHostelId && styles.hostelSelected]} onPress={() => { setSelectedHostelId(hostel.id); setPage("dashboard"); }}>
              <View style={styles.hostelIcon}><Ionicons name="business" size={22} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hostelName}>{hostel.name}</Text>
                <Text style={styles.hostelLocation}>{hostel.address || "Address not set"}</Text>
                <Text style={styles.hostelLocation}>{hostel.city || ""}{hostel.city && hostel.state ? ", " : ""}{hostel.state || ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  function renderRooms() {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
          <Header title="Rooms" subtitle={selectedHostel?.name || "Select a hostel"} onRefresh={() => void refreshAll()} />
          <View style={styles.actionRow}>
            <View>
              <Text style={styles.sectionTitle}>Room management</Text>
              <Text style={styles.sectionSubtitle}>{rooms.length} room{rooms.length === 1 ? "" : "s"}</Text>
            </View>
            <TouchableOpacity style={styles.smallPrimaryButton} onPress={() => setShowRoomModal(true)}>
              <Ionicons name="add" size={19} color="#FFFFFF" /><Text style={styles.smallPrimaryText}>Add Room</Text>
            </TouchableOpacity>
          </View>
          {rooms.length === 0 ? (
            <EmptyState icon="grid-outline" title="No rooms found" description="Add your first room to start managing occupancy." />
          ) : (
            rooms.map((room) => (
              <View key={room.id} style={styles.itemCard}>
                <View style={styles.itemIcon}><Ionicons name="home-outline" size={22} color={COLORS.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>Room {room.roomNumber}</Text>
                  <Text style={styles.itemSubtitle}>{room.floor !== undefined ? `Floor ${room.floor}` : "Floor not set"}</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRoom(room)}>
                  <Ionicons name="trash-outline" size={19} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <Modal visible={showRoomModal} transparent animationType="slide" onRequestClose={() => !roomSaving && setShowRoomModal(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View><Text style={styles.modalTitle}>Add Room</Text><Text style={styles.modalSubtitle}>{selectedHostel?.name || "Selected hostel"}</Text></View>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setShowRoomModal(false)}><Ionicons name="close" size={22} color={COLORS.secondary} /></TouchableOpacity>
                </View>
                <Text style={styles.label}>Room number</Text>
                <TextInput style={styles.input} value={roomNumber} onChangeText={setRoomNumber} placeholder="Example: 101" placeholderTextColor="#94A3B8" />
                <Text style={styles.label}>Floor</Text>
                <TextInput style={styles.input} value={roomFloor} onChangeText={setRoomFloor} placeholder="Example: 1" placeholderTextColor="#94A3B8" />
                <TouchableOpacity style={styles.primaryButton} disabled={roomSaving} onPress={() => void addRoom()}>
                  {roomSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryButtonText}>Add Room</Text><Ionicons name="checkmark" size={19} color="#FFFFFF" /></>}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
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

  function renderRenters() {
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
          <Header title="Renters" subtitle={selectedHostel?.name || "Select a hostel"} onRefresh={() => void refreshAll()} />

          <View style={styles.actionRow}>
            <View>
              <Text style={styles.sectionTitle}>Renter management</Text>
              <Text style={styles.sectionSubtitle}>
                {activeRenters.length} active renter{activeRenters.length === 1 ? "" : "s"}
              </Text>
            </View>
            <TouchableOpacity style={styles.smallPrimaryButton} onPress={openRenterModal}>
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
            <EmptyState icon="people-outline" title="No renters found" description="Add a renter account and assign a room." />
          ) : filteredRenters.length === 0 ? (
            <EmptyState icon="search-outline" title="No matching renters" description="Try a different name, phone number, email, guardian number or room number." />
          ) : (
            filteredRenters.map((renter) => {
              const active = String(renter.status || "ACTIVE").toUpperCase() === "ACTIVE";
              const roomNumber = renter.room?.roomNumber || rooms.find((room) => room.id === renter.roomId)?.roomNumber || "-";

              return (
                <Pressable key={renter.id} style={styles.renterCard} onPress={() => void openRenterDetails(renter)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getName(renter).charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{getName(renter)}</Text>
                    {getEmail(renter) ? <Text style={styles.itemSubtitle}>{getEmail(renter)}</Text> : null}
                    {renter.phone || renter.user?.phone ? (
                      <Text style={styles.itemSubtitle}>Phone: {renter.phone || renter.user?.phone}</Text>
                    ) : null}
                    {renter.guardianPhone ? (
                      <Text style={styles.itemSubtitle}>Guardian: {renter.guardianPhone}</Text>
                    ) : null}
                    <Text style={styles.roomTag}>Room {roomNumber}</Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: active ? COLORS.successLight : COLORS.dangerLight }]}>
                    <Text style={[styles.statusBadgeText, { color: active ? COLORS.success : COLORS.danger }]}>
                      {active ? "ACTIVE" : String(renter.status || "INACTIVE")}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

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
                      <Text style={styles.modalSubtitle}>Complete renter account, room and financial information.</Text>
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
                          value={selectedRenter.room?.floor !== null && selectedRenter.room?.floor !== undefined ? String(selectedRenter.room.floor) : "-"}
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
                          onPress={() => openEditRenter(selectedRenter)}
                        >
                          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.editButtonText}>Edit renter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.removeButton, { flex: 1, justifyContent: "center", paddingVertical: 12 }]}
                          onPress={() => removeRenter(selectedRenter)}
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

        <Modal visible={showRenterModal} transparent animationType="slide" onRequestClose={() => !renterSaving && setShowRenterModal(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
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

                  <Text style={styles.label}>Phone *</Text>
                  <TextInput style={styles.input} value={renterPhone} onChangeText={setRenterPhone} placeholder="Renter phone number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

                  <Text style={styles.label}>Guardian number *</Text>
                  <TextInput style={styles.input} value={guardianPhone} onChangeText={setGuardianPhone} placeholder="Guardian phone number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

                  <Text style={styles.label}>Password *</Text>
                  <View style={styles.inputWithIcon}>
                    <TextInput style={styles.inputWithIconText} value={renterPassword} onChangeText={setRenterPassword} placeholder="Minimum 6 characters" placeholderTextColor="#94A3B8" secureTextEntry={!showRenterPassword} autoCapitalize="none" />
                    <TouchableOpacity onPress={() => setShowRenterPassword((v) => !v)}>
                      <Ionicons name={showRenterPassword ? "eye-off-outline" : "eye-outline"} size={21} color={COLORS.secondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Room *</Text>
                  <TouchableOpacity style={styles.selector} onPress={() => setRenterRoomPickerOpen(true)}>
                    <Text style={[styles.selectorText, !selectedRoom && { color: "#94A3B8" }]}>
                      {selectedRoom ? `Room ${selectedRoom.roomNumber}` : "Select active room"}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                  </TouchableOpacity>

                  <Text style={styles.label}>Joining date *</Text>
                  <TextInput style={styles.input} value={joiningDate} onChangeText={setJoiningDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" />

                  <Text style={styles.label}>Monthly fee *</Text>
                  <TextInput style={styles.input} value={monthlyFee} onChangeText={setMonthlyFee} placeholder="Example: 8000" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" />

                  <Text style={styles.label}>Security deposit</Text>
                  <TextInput style={styles.input} value={securityDeposit} onChangeText={setSecurityDeposit} placeholder="Example: 8000" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" />

                  <TouchableOpacity style={styles.primaryButton} disabled={renterSaving} onPress={() => void addRenter()}>
                    {renterSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryButtonText}>Create Renter</Text><Ionicons name="checkmark" size={19} color="#FFFFFF" /></>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={renterRoomPickerOpen} transparent animationType="slide" onRequestClose={() => setRenterRoomPickerOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.pickerCard}>
              <View style={styles.modalHeader}>
                <View><Text style={styles.modalTitle}>Select room</Text><Text style={styles.modalSubtitle}>Active rooms in this hostel</Text></View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setRenterRoomPickerOpen(false)}><Ionicons name="close" size={22} color={COLORS.secondary} /></TouchableOpacity>
              </View>
              {activeRooms.length === 0 ? (
                <EmptyState icon="grid-outline" title="No active rooms" description="Add an active room before creating a renter." />
              ) : (
                activeRooms.map((room) => {
                  const occupied = activeRenters.some((renter) => renter.roomId === room.id);
                  return (
                    <Pressable
                      key={room.id}
                      disabled={occupied}
                      style={[styles.pickerRow, room.id === renterRoomId && styles.pickerSelected, occupied && { opacity: 0.45 }]}
                      onPress={() => { setRenterRoomId(room.id); setRenterRoomPickerOpen(false); }}
                    >
                      <View style={styles.pickerIcon}><Ionicons name="home-outline" size={20} color={COLORS.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>Room {room.roomNumber}</Text>
                        <Text style={styles.itemSubtitle}>{occupied ? "Occupied" : room.floor !== undefined ? `Floor ${room.floor}` : "Floor not set"}</Text>
                      </View>
                      {room.id === renterRoomId ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </Modal>

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

                  <Text style={styles.label}>Guardian number *</Text>
                  <TextInput style={styles.input} value={editGuardianPhone} onChangeText={setEditGuardianPhone} placeholder="Guardian phone number" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />

                  <Text style={styles.label}>Joining date *</Text>
                  <TextInput style={styles.input} value={editJoiningDate} onChangeText={setEditJoiningDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" />

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

                  <TouchableOpacity style={styles.primaryButton} disabled={editRenterSaving} onPress={() => void updateRenter()}>
                    {editRenterSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryButtonText}>Save Changes</Text><Ionicons name="checkmark" size={19} color="#FFFFFF" /></>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

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
                  const occupiedByAnother = activeRenters.some((renter) => renter.id !== editingRenterId && renter.roomId === room.id);
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
      </View>
    );
  }

  function renderFees() {
    const feeRenter = renters.find((renter) => renter.id === feeRenterId);
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
          <Header title="Fees" subtitle={selectedHostel?.name || "Select a hostel"} onRefresh={() => void refreshAll()} />
          <View style={styles.actionRow}>
            <View><Text style={styles.sectionTitle}>Fee records</Text><Text style={styles.sectionSubtitle}>{fees.length} fee{fees.length === 1 ? "" : "s"}</Text></View>
            <TouchableOpacity style={styles.smallPrimaryButton} onPress={openFeeModal}><Ionicons name="add" size={19} color="#FFFFFF" /><Text style={styles.smallPrimaryText}>Add Fee</Text></TouchableOpacity>
          </View>
          {fees.length === 0 ? (
            <EmptyState icon="receipt-outline" title="No fees found" description="Create the first fee for an active renter." />
          ) : (
            fees.map((fee) => {
              const renter = renters.find((item) => item.id === fee.renterId);
              const paid = Number(fee.paidAmount || 0);
              const remaining = Math.max(Number(fee.amount || 0) - paid, 0);
              const status = String(fee.status || "PENDING").toUpperCase();
              const color = status === "PAID" ? COLORS.success : status === "OVERDUE" ? COLORS.danger : status === "PARTIALLY_PAID" ? COLORS.warning : COLORS.primary;
              return (
                <View key={fee.id} style={styles.feeCard}>
                  <View style={styles.feeTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{renter ? getName(renter) : "Renter"}</Text>
                      <Text style={styles.itemSubtitle}>{fee.month} · Due {fee.dueDate}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: color === COLORS.success ? COLORS.successLight : color === COLORS.danger ? COLORS.dangerLight : color === COLORS.warning ? COLORS.warningLight : COLORS.primaryLight }]}>
                      <Text style={[styles.statusBadgeText, { color }]}>{statusLabel(status)}</Text>
                    </View>
                  </View>
                  <View style={styles.feeDetailsRow}>
                    <FeeDetail label="Amount" value={money(fee.amount)} />
                    <FeeDetail label="Paid" value={money(paid)} />
                    <FeeDetail label="Remaining" value={money(remaining)} />
                  </View>
                  {fee.description ? <Text style={styles.feeDescription}>{fee.description}</Text> : null}
                </View>
              );
            })
          )}
        </ScrollView>

        <Modal visible={showFeeModal} transparent animationType="slide" onRequestClose={() => !feeSaving && setShowFeeModal(false)}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={styles.modalCardLarge}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeader}>
                    <View><Text style={styles.modalTitle}>Add Fee</Text><Text style={styles.modalSubtitle}>Payment is intentionally not recorded here; this screen manages fee records only.</Text></View>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setShowFeeModal(false)}><Ionicons name="close" size={22} color={COLORS.secondary} /></TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Active renter *</Text>
                  <TouchableOpacity style={styles.selector} onPress={() => setFeeRenterPickerOpen(true)}>
                    <Text style={[styles.selectorText, !feeRenter && { color: "#94A3B8" }]}>{feeRenter ? getName(feeRenter) : "Select active renter"}</Text>
                    <Ionicons name="chevron-down" size={20} color={COLORS.secondary} />
                  </TouchableOpacity>

                  <Text style={styles.label}>Month *</Text>
                  <TextInput style={styles.input} value={feeMonth} onChangeText={setFeeMonth} placeholder="YYYY-MM" placeholderTextColor="#94A3B8" />

                  <Text style={styles.label}>Amount *</Text>
                  <TextInput style={styles.input} value={feeAmount} onChangeText={setFeeAmount} placeholder="Example: 8000" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" />

                  <Text style={styles.label}>Due date *</Text>
                  <TextInput style={styles.input} value={feeDueDate} onChangeText={setFeeDueDate} placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" />

                  <Text style={styles.label}>Description</Text>
                  <TextInput style={[styles.input, { minHeight: 90, textAlignVertical: "top" }]} value={feeDescription} onChangeText={setFeeDescription} placeholder="Optional description" placeholderTextColor="#94A3B8" multiline />

                  <TouchableOpacity style={styles.primaryButton} disabled={feeSaving} onPress={() => void addFee()}>
                    {feeSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryButtonText}>Create Fee</Text><Ionicons name="checkmark" size={19} color="#FFFFFF" /></>}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        <Modal visible={feeRenterPickerOpen} transparent animationType="slide" onRequestClose={() => setFeeRenterPickerOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.pickerCard}>
              <View style={styles.modalHeader}>
                <View><Text style={styles.modalTitle}>Select renter</Text><Text style={styles.modalSubtitle}>Only active renters can receive a new fee.</Text></View>
                <TouchableOpacity style={styles.closeButton} onPress={() => setFeeRenterPickerOpen(false)}><Ionicons name="close" size={22} color={COLORS.secondary} /></TouchableOpacity>
              </View>
              {activeRenters.length === 0 ? (
                <EmptyState icon="people-outline" title="No active renters" description="Add a renter before creating a fee." />
              ) : (
                activeRenters.map((renter) => (
                  <Pressable key={renter.id} style={[styles.pickerRow, renter.id === feeRenterId && styles.pickerSelected]} onPress={() => { setFeeRenterId(renter.id); setFeeRenterPickerOpen(false); }}>
                    <View style={styles.pickerIcon}><Ionicons name="person-outline" size={20} color={COLORS.primary} /></View>
                    <View style={{ flex: 1 }}><Text style={styles.itemTitle}>{getName(renter)}</Text><Text style={styles.itemSubtitle}>{getEmail(renter) || "No email"}</Text></View>
                    {renter.id === feeRenterId ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : null}
                  </Pressable>
                ))
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  function renderPayments() {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.screenContent}
          showsVerticalScrollIndicator={false}
        >
          <Header
            title="Payment Proofs"
            subtitle={
              selectedHostel?.name ||
              "Review payment screenshots"
            }
            onRefresh={() => void refreshAll()}
          />

          <View style={styles.paymentNotice}>
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={COLORS.primary}
            />
            <Text style={styles.paymentNoticeText}>
              Payments are completed outside StayNexa. Renters submit a payment screenshot as proof. Admins review the screenshot and approve or reject the proof.
            </Text>
          </View>

          {payments.length === 0 ? (
            <EmptyState
              icon="image-outline"
              title="No payment proofs"
              description="Submitted payment screenshots will appear here for admin review."
            />
          ) : (
            payments.map((payment) => {
              const status = String(
                payment.status || "APPROVED",
              ).toUpperCase();
              const displayStatus =
                status === "PENDING"
                  ? "SUBMITTED"
                  : status;
              const linkedRenter = renters.find(
                (renter) =>
                  renter.id === payment.renterId,
              );

              const statusStyle =
                displayStatus === "APPROVED"
                  ? { bg: COLORS.successLight, fg: COLORS.success }
                  : displayStatus === "REJECTED"
                    ? { bg: COLORS.dangerLight, fg: COLORS.danger }
                    : { bg: COLORS.warningLight, fg: COLORS.warning };

              return (
                <View key={payment.id} style={styles.paymentReviewCard}>
                  <View style={styles.paymentReviewTop}>
                    <View style={styles.paymentReviewIcon}>
                      <Ionicons
                        name="receipt-outline"
                        size={21}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.paymentReviewAmount}>
                        {money(Number(payment.amount || 0))}
                      </Text>
                      <Text style={styles.paymentReviewRenter}>
                        {linkedRenter ? getName(linkedRenter) : "Renter"}
                      </Text>
                    </View>
                    <View style={[styles.paymentStatusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.paymentStatusText, { color: statusStyle.fg }]}>
                        {statusLabel(displayStatus)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.paymentReviewMetaGrid}>
                    <FeeDetail
                      label="Payment date"
                      value={payment.paymentDate || "-"}
                    />
                    <FeeDetail
                      label="Submitted"
                      value={payment.submittedAt || payment.createdAt || "-"}
                    />
                    <FeeDetail
                      label="Reference"
                      value={payment.reference || "-"}
                    />
                    <FeeDetail
                      label="Fee"
                      value={payment.feeId || "-"}
                    />
                  </View>

                  {payment.proofUrl ? (
                    <TouchableOpacity
                      style={styles.proofImageContainer}
                      onPress={() => setProofPreviewUrl(payment.proofUrl || "")}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: payment.proofUrl }}
                        style={styles.proofImage}
                        resizeMode="cover"
                      />
                      <View style={styles.proofOverlay}>
                        <Ionicons
                          name="expand-outline"
                          size={22}
                          color="#FFFFFF"
                        />
                        <Text style={styles.proofOverlayText}>
                          View proof
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.noProofBox}>
                      <Ionicons
                        name="image-outline"
                        size={19}
                        color={COLORS.secondary}
                      />
                      <Text style={styles.noProofText}>
                        No payment proof image attached.
                      </Text>
                    </View>
                  )}

                  {payment.reviewNote ? (
                    <View style={styles.reviewNoteBox}>
                      <Text style={styles.reviewNoteLabel}>Admin note</Text>
                      <Text style={styles.reviewNoteText}>
                        {payment.reviewNote}
                      </Text>
                    </View>
                  ) : null}

                  {displayStatus === "SUBMITTED" ? (
                    <View style={styles.reviewActions}>
                      <TouchableOpacity
                        style={[styles.reviewButton, styles.rejectButton]}
                        disabled={paymentActionId === payment.id}
                        onPress={() => void reviewPayment(payment.id, "REJECTED")}
                      >
                        {paymentActionId === payment.id ? (
                          <ActivityIndicator color={COLORS.danger} />
                        ) : (
                          <>
                            <Ionicons
                              name="close-circle-outline"
                              size={18}
                              color={COLORS.danger}
                            />
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.reviewButton, styles.approveButton]}
                        disabled={paymentActionId === payment.id}
                        onPress={() => void reviewPayment(payment.id, "APPROVED")}
                      >
                        {paymentActionId === payment.id ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={18}
                              color="#FFFFFF"
                            />
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>

        <Modal
          visible={Boolean(proofPreviewUrl)}
          transparent
          animationType="fade"
          onRequestClose={() => setProofPreviewUrl("")}
        >
          <View style={styles.proofViewerBackdrop}>
            <TouchableOpacity
              style={styles.proofViewerClose}
              onPress={() => setProofPreviewUrl("")}
            >
              <Ionicons
                name="close"
                size={28}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            {proofPreviewUrl ? (
              <Image
                source={{ uri: proofPreviewUrl }}
                style={styles.proofViewerImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </Modal>
      </View>
    );
  }

  function renderMore() {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
        <Header title="More" subtitle="Additional StayNexa modules." onRefresh={() => void refreshAll()} />
        <MoreRow icon="receipt-outline" title="Fees" subtitle="Create and manage fee records" onPress={() => setPage("fees")} />
        <MoreRow icon="card-outline" title="Payments" subtitle="Read-only payment history from the backend" onPress={() => setPage("payments")} />
        <MoreRow icon="construct-outline" title="Repairs" subtitle="Repair information is included on the dashboard" onPress={() => setPage("dashboard")} />
        <MoreRow icon="notifications-outline" title="Notifications" subtitle="Notification center will be connected next" onPress={() => Alert.alert("Notifications", "Notification center is the next module.")} />
        <MoreRow icon="log-out-outline" title="Logout" subtitle="Sign out from StayNexa" danger onPress={() => Alert.alert("Logout", "Are you sure you want to logout?", [{ text: "Cancel", style: "cancel" }, { text: "Logout", style: "destructive", onPress: () => void logout() }])} />
      </ScrollView>
    );
  }

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
          {page === "dashboard" && renderDashboard()}
          {page === "hostels" && renderHostels()}
          {page === "rooms" && renderRooms()}
          {page === "renters" && renderRenters()}
          {page === "fees" && renderFees()}
          {page === "payments" && renderPayments()}
          {page === "more" && renderMore()}
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

function RenterDetail({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "-"}</Text>
    </View>
  );
}

function FeeDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
