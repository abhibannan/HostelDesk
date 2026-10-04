import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
  RefreshControl,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { API_URL, parseJsonResponse } from "../services/api";
import { AdminAccount, User } from "../types";

// ── Strict Legitimate Telemetry Interfaces ──────────────────────────────────
interface SystemStatus {
  server: {
    status: string;
    version: string;
    nodeVersion: string;
    v8Version: string;
    pid: number;
    platform: string;
    arch: string;
    environment: string;
    port: number;
    uptimeSeconds: number;
    uptimeFormatted: string;
    serverTime: string;
    activeHandles: number;
    activeRequests: number;
  };
  host: {
    hostname: string;
    osType: string;
    osRelease: string;
    platform: string;
    arch: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    cpu: {
      model: string;
      cores: number;
      speedMhz: number;
      usagePercent: number;
    };
    memory: {
      totalMb: number;
      freeMb: number;
      usedMb: number;
      usagePercent: number;
    };
    networkInterfaces: Array<{
      name: string;
      address: string;
      family: string;
      internal: boolean;
    }>;
  };
  processMemory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
    heapUsedPercent: number;
    externalMb: number;
    arrayBuffersMb: number;
  };
  database: {
    engine: string;
    status: string;
    latencyMs: number;
    collections: {
      users: number;
      hostels: number;
      notifications: number;
      auditLogs: number;
      pushTokens: number;
    };
  };
  authService: {
    provider: string;
    status: string;
    latencyMs: number;
  };
  traffic: {
    totalRequests: number;
    requestsPerMinute: number;
    statusBreakdown: {
      "2xx": number;
      "3xx": number;
      "4xx": number;
      "5xx": number;
    };
    latency: {
      avgMs: number;
      minMs: number;
      maxMs: number;
      p95Ms: number;
    };
    recentRequests: Array<{
      id: string;
      method: string;
      path: string;
      statusCode: number;
      durationMs: number;
      timestamp: string;
    }>;
  };
  scheduler: {
    name: string;
    status: string;
    frequency: string;
  };
  totalQueryTimeMs: number;
}

interface DiagnosticProbe {
  id: string;
  name: string;
  category: "ROUTER" | "DATABASE" | "AUTH" | "MEMORY" | "SCHEDULER" | "NETWORK";
  status: "PASS" | "WARN" | "FAIL";
  latencyMs: number;
  detail: string;
}

interface DiagnosticResult {
  timestamp: string;
  allPassed: boolean;
  passCount: number;
  warnCount: number;
  failCount: number;
  probes: DiagnosticProbe[];
}

interface SecurityAuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface SystemLogEntry {
  id: string;
  level: "ERROR" | "WARN" | "INFO";
  message: string;
  source: string;
  statusCode?: number;
  route?: string;
  method?: string;
  stack?: string;
  timestamp: string;
}

export interface PlatformConfig {
  maintenanceMode: boolean;
  maintenanceNotice: string;
  alertBanner: {
    active: boolean;
    title: string;
    message: string;
    level: "INFO" | "WARN" | "CRITICAL";
    updatedAt: string;
    updatedBy: string;
  };
}

interface SuperAdminScreenProps {
  currentUser: User | null;
  token: string | null;
  onLogout: () => void;
}

const TABS = [
  { key: "core", label: "System & OS", icon: "hardware-chip-outline" },
  { key: "traffic", label: "API Traffic", icon: "pulse-outline" },
  { key: "cloud", label: "Database", icon: "cloud-outline" },
  { key: "diagnostics", label: "Diagnostics", icon: "shield-checkmark-outline" },
  { key: "audit", label: "Security Audit", icon: "document-text-outline" },
  { key: "admins", label: "Admins", icon: "people-outline" },
  { key: "logs", label: "System Logs", icon: "bug-outline" },
  { key: "platform", label: "Maintenance & Alerts", icon: "construct-outline" },
] as const;

export function SuperAdminScreen({
  currentUser,
  token,
  onLogout,
}: SuperAdminScreenProps) {
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const windowWidth = Dimensions.get("window").width;
  const [containerWidth, setContainerWidth] = useState(windowWidth);

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? StatusBar.currentHeight || 28 : 0,
  );
  const bottomInset = Math.max(insets.bottom, 16);

  // ── Minimalist Apple Developer Palette (Zinc & Graphite) ───────────────────
  const theme = {
    // Canvas & Card Surfaces
    bg: isDark ? "#090A0D" : "#F4F5F7",
    card: isDark ? "#12141A" : "#FFFFFF",
    surfaceSecondary: isDark ? "#1A1D24" : "#F0F2F5",
    surfaceElevated: isDark ? "#222630" : "#E8EBF0",
    border: isDark ? "#232732" : "#E2E5EB",
    borderSubtle: isDark ? "#191C24" : "#ECEEF2",

    // Monochromatic & Subtle Accents
    accent: isDark ? "#E4E4E7" : "#18181B",
    accentLight: isDark ? "rgba(228, 228, 231, 0.1)" : "rgba(24, 24, 27, 0.06)",
    blue: isDark ? "#38BDF8" : "#0284C7",
    green: "#10B981",
    greenLight: isDark ? "rgba(16, 185, 129, 0.12)" : "#ECFDF5",
    amber: "#F59E0B",
    amberLight: isDark ? "rgba(245, 158, 11, 0.12)" : "#FFFBEB",
    red: "#EF4444",
    redLight: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",

    // Typography
    text: isDark ? "#F4F4F5" : "#09090B",
    textSecondary: isDark ? "#A1A1AA" : "#71717A",
    textMuted: isDark ? "#71717A" : "#A1A1AA",
    monoFont: Platform.OS === "ios" ? "Menlo" : "monospace",
  };

  // ── Tab State & Horizontal Sliding Pager ─────────────────────────────────
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const horizontalPagerRef = useRef<ScrollView>(null);
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  // ── Animations ────────────────────────────────────────────────────────────
  // 1. Subtle Live Status Pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.7)).current;

  // 2. Animated Memory Bar widths
  const heapBarAnim = useRef(new Animated.Value(0)).current;
  const hostRamBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.1,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.7,
            duration: 600,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim, pulseOpacity]);

  // ── Real Telemetry State ──────────────────────────────────────────────────
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(false);

  // ── Diagnostics State ────────────────────────────────────────────────────
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [flushingCache, setFlushingCache] = useState(false);

  // ── Security Audit Logs State ─────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null);

  // ── Administrators State ──────────────────────────────────────────────────
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Add Admin Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  // ── System Logs State (Feature 2) ──────────────────────────────────────────
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  const [loadingSystemLogs, setLoadingSystemLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | "ERROR" | "WARN" | "INFO">("ALL");
  const [selectedSystemLog, setSelectedSystemLog] = useState<SystemLogEntry | null>(null);

  // ── Platform Governance & Maintenance State (Feature 5) ─────────────────────
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig | null>(null);
  const [loadingPlatformConfig, setLoadingPlatformConfig] = useState(false);
  const [savingPlatformConfig, setSavingPlatformConfig] = useState(false);

  // Form states for Platform Config
  const [formMaintenanceNotice, setFormMaintenanceNotice] = useState("");
  const [formBannerActive, setFormBannerActive] = useState(false);
  const [formBannerTitle, setFormBannerTitle] = useState("");
  const [formBannerMessage, setFormBannerMessage] = useState("");
  const [formBannerLevel, setFormBannerLevel] = useState<"INFO" | "WARN" | "CRITICAL">("INFO");

  const [refreshing, setRefreshing] = useState(false);

  // ── API Fetchers (Strictly Genuine) ─────────────────────────────────────────
  const loadTechnicalStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/auth/super-admin/system-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as SystemStatus;
        setSystemStatus(data);

        if (data.processMemory) {
          Animated.timing(heapBarAnim, {
            toValue: Math.min(Math.max(data.processMemory.heapUsedPercent, 0), 100),
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
        if (data.host?.memory) {
          Animated.timing(hostRamBarAnim, {
            toValue: Math.min(Math.max(data.host.memory.usagePercent, 0), 100),
            duration: 700,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
      }
    } catch (err) {
      console.warn("Telemetry fetch error:", err);
    }
  }, [token, heapBarAnim, hostRamBarAnim]);

  const loadAuditLogs = useCallback(async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`${API_URL}/auth/super-admin/audit-logs?limit=35`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as { logs: SecurityAuditLog[] };
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn("Audit logs fetch error:", err);
    } finally {
      setLoadingLogs(false);
    }
  }, [token]);

  const loadAdmins = useCallback(async () => {
    if (!token) return;
    setLoadingAdmins(true);
    try {
      const res = await fetch(`${API_URL}/auth/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as { admins: AdminAccount[] };
        setAdmins(data.admins || []);
      }
    } catch (err) {
      console.warn("Admins fetch error:", err);
    } finally {
      setLoadingAdmins(false);
    }
  }, [token]);

  const loadSystemLogs = useCallback(async (level?: string) => {
    if (!token) return;
    setLoadingSystemLogs(true);
    try {
      const activeFilter = level !== undefined ? level : logFilter;
      const url = `${API_URL}/auth/super-admin/system-logs?limit=50${activeFilter && activeFilter !== "ALL" ? `&level=${activeFilter}` : ""}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as { logs: SystemLogEntry[] };
        setSystemLogs(data.logs || []);
      }
    } catch (err) {
      console.warn("System logs fetch error:", err);
    } finally {
      setLoadingSystemLogs(false);
    }
  }, [token, logFilter]);

  const handleClearSystemLogs = () => {
    Alert.alert(
      "Clear System Logs",
      "Are you sure you want to clear the in-memory error logs buffer? Recent captured crashes and exceptions will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Buffer",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/auth/super-admin/system-logs`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                setSystemLogs([]);
                Alert.alert("Buffer Cleared", "System error logs buffer has been cleared.");
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to clear logs.");
            }
          },
        },
      ]
    );
  };

  const loadPlatformConfig = useCallback(async () => {
    if (!token) return;
    setLoadingPlatformConfig(true);
    try {
      const res = await fetch(`${API_URL}/auth/super-admin/platform-config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as PlatformConfig;
        setPlatformConfig(data);
        setFormMaintenanceNotice(data.maintenanceNotice || "");
        setFormBannerActive(Boolean(data.alertBanner?.active));
        setFormBannerTitle(data.alertBanner?.title || "");
        setFormBannerMessage(data.alertBanner?.message || "");
        setFormBannerLevel(data.alertBanner?.level || "INFO");
      }
    } catch (err) {
      console.warn("Platform config fetch error:", err);
    } finally {
      setLoadingPlatformConfig(false);
    }
  }, [token]);

  const handleToggleMaintenanceMode = (enable: boolean) => {
    Alert.alert(
      enable ? "Activate Maintenance Mode?" : "Deactivate Maintenance Mode?",
      enable
        ? "Activating maintenance mode will immediately block access for hostel residents and hostel admins (HTTP 503). Only Super Admins will retain access. Are you sure?"
        : "Deactivating maintenance mode will immediately restore platform access for all users.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: enable ? "Enable Maintenance" : "Disable Maintenance",
          style: enable ? "destructive" : "default",
          onPress: async () => {
            setSavingPlatformConfig(true);
            try {
              const res = await fetch(`${API_URL}/auth/super-admin/platform-config`, {
                method: "PATCH",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  maintenanceMode: enable,
                }),
              });
              if (res.ok) {
                const data = (await parseJsonResponse(res)) as { config: PlatformConfig };
                setPlatformConfig(data.config);
                Alert.alert("Success", `Maintenance mode is now ${enable ? "ACTIVE" : "DISABLED"}.`);
              } else {
                Alert.alert("Error", "Could not update maintenance status.");
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to update maintenance mode.");
            } finally {
              setSavingPlatformConfig(false);
            }
          },
        },
      ]
    );
  };

  const handleSavePlatformConfig = async () => {
    if (!token) return;
    setSavingPlatformConfig(true);
    try {
      const res = await fetch(`${API_URL}/auth/super-admin/platform-config`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maintenanceNotice: formMaintenanceNotice.trim() || undefined,
          alertBanner: {
            active: formBannerActive,
            title: formBannerTitle.trim(),
            message: formBannerMessage.trim(),
            level: formBannerLevel,
          },
        }),
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as { config: PlatformConfig };
        setPlatformConfig(data.config);
        Alert.alert("Saved", "Platform controls and alert banner updated successfully.");
      } else {
        Alert.alert("Error", "Failed to update platform settings.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error while saving settings.");
    } finally {
      setSavingPlatformConfig(false);
    }
  };

  const loadAll = useCallback(async () => {
    setLoadingStatus(true);
    await Promise.all([
      loadTechnicalStatus(),
      loadAuditLogs(),
      loadAdmins(),
      loadSystemLogs(),
      loadPlatformConfig(),
    ]);
    setLoadingStatus(false);
  }, [loadTechnicalStatus, loadAuditLogs, loadAdmins, loadSystemLogs, loadPlatformConfig]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Live Auto-Refresh Stream (every 4s when active)
  useEffect(() => {
    if (!liveStreamEnabled) return;
    const interval = setInterval(() => {
      void loadTechnicalStatus();
      void loadSystemLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [liveStreamEnabled, loadTechnicalStatus, loadSystemLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadTechnicalStatus(),
      loadAuditLogs(),
      loadAdmins(),
      loadSystemLogs(),
      loadPlatformConfig(),
    ]);
    setRefreshing(false);
  };

  // ── Tab Switching & Sliding Indicator ─────────────────────────────────────
  const handleTabPress = (index: number) => {
    setActiveTabIdx(index);
    horizontalPagerRef.current?.scrollTo({
      x: index * containerWidth,
      animated: true,
    });
    Animated.spring(tabSlideAnim, {
      toValue: index,
      friction: 9,
      tension: 60,
      useNativeDriver: false,
    }).start();
  };

  const handlePagerScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / containerWidth);
    if (newIdx >= 0 && newIdx < TABS.length && newIdx !== activeTabIdx) {
      setActiveTabIdx(newIdx);
      Animated.spring(tabSlideAnim, {
        toValue: newIdx,
        friction: 9,
        tension: 60,
        useNativeDriver: false,
      }).start();
    }
  };

  // ── Diagnostics Execution ────────────────────────────────────────────────
  const handleRunDiagnostics = async () => {
    if (!token) return;
    setRunningDiagnostics(true);
    setDiagnosticResult(null);
    try {
      const res = await fetch(`${API_URL}/auth/super-admin/run-diagnostics`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as DiagnosticResult;
        setDiagnosticResult(data);
      } else {
        Alert.alert("Diagnostics Error", "Failed to execute system probes.");
      }
    } catch (err: any) {
      Alert.alert("Diagnostics Error", err.message || "Failed to reach backend probes.");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  // ── Cache Flush Action ────────────────────────────────────────────────────
  const handleFlushCache = async () => {
    if (!token) return;
    setFlushingCache(true);
    try {
      const res = await fetch(`${API_URL}/auth/super-admin/clear-cache`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.ok) {
        Alert.alert("Cache Cleared", "Server-side permissions and routing cache flushed.");
        void loadTechnicalStatus();
      } else {
        Alert.alert("Error", "Could not flush server cache.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error while clearing cache.");
    } finally {
      setFlushingCache(false);
    }
  };

  // ── Admin Management Actions ──────────────────────────────────────────────
  const handleCreateAdmin = async () => {
    if (!newFirstName.trim() || !newEmail.trim() || !newPassword.trim()) {
      Alert.alert("Missing Fields", "First name, email, and password are required.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Password Too Short", "Password must be at least 6 characters.");
      return;
    }

    setSavingAdmin(true);
    try {
      const res = await fetch(`${API_URL}/auth/admins`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: newFirstName.trim(),
          ...(newLastName.trim() ? { lastName: newLastName.trim() } : {}),
          email: newEmail.trim().toLowerCase(),
          ...(newPhone.trim() ? { phone: newPhone.trim() } : {}),
          password: newPassword,
        }),
      });

      const data = (await parseJsonResponse(res)) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Failed to create administrator");
      }

      Alert.alert("Admin Created", `Administrator account for ${newEmail} created successfully.`);
      setShowAddModal(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("");
      void loadAdmins();
    } catch (err: any) {
      Alert.alert("Creation Error", err.message || "Unable to create administrator.");
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleToggleStatus = async (admin: AdminAccount) => {
    if (admin.id === currentUser?.id) {
      Alert.alert("Action Prohibited", "You cannot deactivate your own Super Admin account.");
      return;
    }

    const nextStatus = admin.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`${API_URL}/auth/admins/${admin.id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const d = (await parseJsonResponse(res)) as any;
        throw new Error(d.message || "Failed to update status");
      }

      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, status: nextStatus } : a))
      );
    } catch (err: any) {
      Alert.alert("Status Error", err.message || "Could not update status.");
    }
  };

  const handleDeleteAdmin = (admin: AdminAccount) => {
    if (admin.id === currentUser?.id) {
      Alert.alert("Action Prohibited", "You cannot delete your own Super Admin account.");
      return;
    }

    Alert.alert(
      "Delete Administrator",
      `Are you sure you want to permanently remove ${admin.firstName} ${admin.lastName || ""}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/auth/admins/${admin.id}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              if (!res.ok) {
                const d = (await parseJsonResponse(res)) as any;
                throw new Error(d.message || "Failed to delete administrator");
              }

              setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
              Alert.alert("Deleted", "Administrator account removed successfully.");
              void loadAdmins();
            } catch (err: any) {
              Alert.alert("Delete Error", err.message || "Could not remove administrator.");
            }
          },
        },
      ]
    );
  };

  const handleConfirmLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of the Super Admin Console?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: onLogout },
    ]);
  };

  // Filtered Admins
  const filteredAdmins = admins.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      a.email.toLowerCase().includes(q) ||
      a.firstName.toLowerCase().includes(q) ||
      (a.lastName && a.lastName.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && a.status === "ACTIVE") ||
      (statusFilter === "INACTIVE" && a.status !== "ACTIVE");

    return matchesSearch && matchesStatus;
  });

  const totalAdminsCount = admins.length;
  const activeAdminsCount = admins.filter((a) => a.status === "ACTIVE").length;
  const inactiveAdminsCount = totalAdminsCount - activeAdminsCount;

  // Clean Apple-style Method Pills
  const getMethodBadgeStyle = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return { color: isDark ? "#34D399" : "#059669", bg: isDark ? "rgba(52, 211, 153, 0.12)" : "#ECFDF5" };
      case "POST":
        return { color: isDark ? "#60A5FA" : "#2563EB", bg: isDark ? "rgba(96, 165, 250, 0.12)" : "#EFF6FF" };
      case "PATCH":
      case "PUT":
        return { color: isDark ? "#FBBF24" : "#D97706", bg: isDark ? "rgba(251, 191, 36, 0.12)" : "#FFFBEB" };
      case "DELETE":
        return { color: isDark ? "#F87171" : "#DC2626", bg: isDark ? "rgba(248, 113, 113, 0.12)" : "#FEF2F2" };
      default:
        return { color: theme.textSecondary, bg: theme.surfaceSecondary };
    }
  };

  const getStatusCodeStyle = (code: number) => {
    if (code >= 200 && code < 300) return { color: isDark ? "#34D399" : "#059669" };
    if (code >= 300 && code < 400) return { color: isDark ? "#60A5FA" : "#2563EB" };
    if (code >= 400 && code < 500) return { color: isDark ? "#FBBF24" : "#D97706" };
    return { color: isDark ? "#F87171" : "#DC2626" };
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.bg }]}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          setContainerWidth(w);
        }
      }}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* ── Apple Developer Header ───────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
            paddingTop: topInset + 8,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.appleIconBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <Ionicons name="hardware-chip-outline" size={18} color={theme.text} />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>StayNexa</Text>
              <View style={[styles.roleBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                <Text style={[styles.roleBadgeText, { color: theme.textSecondary }]}>Super Admin</Text>
              </View>
            </View>
            <View style={styles.statusLiveRow}>
              <View style={styles.heartbeatContainer}>
                <Animated.View
                  style={[
                    styles.heartbeatRing,
                    {
                      backgroundColor: theme.green,
                      transform: [{ scale: pulseAnim }],
                      opacity: pulseOpacity,
                    },
                  ]}
                />
                <View style={[styles.heartbeatDot, { backgroundColor: theme.green }]} />
              </View>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                {systemStatus?.server.status === "ONLINE" ? "Live Telemetry" : "Connecting"} • PID {systemStatus?.server.pid ?? "---"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* Live Auto-Refresh Switch */}
          <View style={[styles.liveToggleBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
            <Ionicons
              name={liveStreamEnabled ? "radio" : "radio-outline"}
              size={13}
              color={liveStreamEnabled ? theme.green : theme.textMuted}
            />
            <Switch
              value={liveStreamEnabled}
              onValueChange={setLiveStreamEnabled}
              trackColor={{ false: theme.border, true: theme.green }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 0.65 }, { scaleY: 0.65 }] }}
            />
          </View>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
            onPress={toggleTheme}
            accessibilityLabel="Toggle Theme"
          >
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={16} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}
            onPress={handleConfirmLogout}
            accessibilityLabel="Sign Out"
          >
            <Ionicons name="log-out-outline" size={15} color={theme.red} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Apple Developer Sliding Segmented Bar ────────────────────────────── */}
      <View style={[styles.segmentedBarContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentedBarScroll}
        >
          {TABS.map((tab, idx) => {
            const isActive = activeTabIdx === idx;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.segmentItem,
                  {
                    backgroundColor: isActive ? theme.surfaceElevated : "transparent",
                    borderColor: isActive ? theme.border : "transparent",
                  },
                ]}
                onPress={() => handleTabPress(idx)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? theme.text : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isActive ? theme.text : theme.textSecondary,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {tab.label}
                  {tab.key === "admins" ? ` (${totalAdminsCount})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Horizontal Sliding Pager ─────────────────────────────────────────── */}
      <ScrollView
        ref={horizontalPagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePagerScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 0: SYSTEM & OS ARCHITECTURE                                      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* Apple Developer Metric Row */}
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>UPTIME</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {systemStatus?.server.uptimeFormatted || "---"}
                </Text>
                <Text style={[styles.metricSub, { color: theme.textMuted }]}>
                  Node {systemStatus?.server.nodeVersion || "---"}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>CPU LOAD</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {systemStatus?.host.cpu.usagePercent ?? 0}%
                </Text>
                <Text style={[styles.metricSub, { color: theme.textMuted }]}>
                  {systemStatus?.host.cpu.cores || 0} Cores
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>HEAP ALLOCATED</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {systemStatus?.processMemory.heapUsedMb || 0} MB
                </Text>
                <Text style={[styles.metricSub, { color: theme.textMuted }]}>
                  of {systemStatus?.processMemory.heapTotalMb || 0} MB
                </Text>
              </View>
            </View>

            {/* V8 Process Memory Gauge */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="pie-chart-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Node.js V8 Process Memory</Text>
                </View>
                <View style={[styles.neutralPill, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.neutralPillText, { color: theme.text }]}>
                    {systemStatus?.processMemory.heapUsedPercent ?? 0}% Allocated
                  </Text>
                </View>
              </View>

              {/* Storage Gauge Bar */}
              <View style={[styles.gaugeTrack, { backgroundColor: theme.surfaceSecondary }]}>
                <Animated.View
                  style={[
                    styles.gaugeFill,
                    {
                      width: heapBarAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
              </View>

              <View style={styles.memoryGrid}>
                <View style={[styles.memoryBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.memoryBoxLabel, { color: theme.textSecondary }]}>Heap Total</Text>
                  <Text style={[styles.memoryBoxValue, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.processMemory.heapTotalMb ?? 0} MB
                  </Text>
                </View>
                <View style={[styles.memoryBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.memoryBoxLabel, { color: theme.textSecondary }]}>Heap Used</Text>
                  <Text style={[styles.memoryBoxValue, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.processMemory.heapUsedMb ?? 0} MB
                  </Text>
                </View>
                <View style={[styles.memoryBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.memoryBoxLabel, { color: theme.textSecondary }]}>RSS Resident</Text>
                  <Text style={[styles.memoryBoxValue, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.processMemory.rssMb ?? 0} MB
                  </Text>
                </View>
                <View style={[styles.memoryBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Text style={[styles.memoryBoxLabel, { color: theme.textSecondary }]}>ArrayBuffers</Text>
                  <Text style={[styles.memoryBoxValue, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.processMemory.arrayBuffersMb ?? 0} MB
                  </Text>
                </View>
              </View>
            </View>

            {/* Host Physical Machine */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="desktop-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Host System Hardware</Text>
                </View>
                <View style={[styles.statusBadgeGreen, { backgroundColor: theme.greenLight }]}>
                  <Text style={[styles.statusBadgeGreenText, { color: theme.green }]}>Online</Text>
                </View>
              </View>

              {/* Physical RAM Bar */}
              <View style={{ marginTop: 12 }}>
                <View style={styles.barLabelRow}>
                  <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Physical RAM Utilization</Text>
                  <Text style={[styles.barValue, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.host.memory.usedMb ?? 0} MB / {systemStatus?.host.memory.totalMb ?? 0} MB ({systemStatus?.host.memory.usagePercent ?? 0}%)
                  </Text>
                </View>
                <View style={[styles.gaugeTrack, { backgroundColor: theme.surfaceSecondary }]}>
                  <Animated.View
                    style={[
                      styles.gaugeFill,
                      {
                        width: hostRamBarAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                        backgroundColor: theme.textSecondary,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={[styles.appleTable, { borderColor: theme.border }]}>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Hostname</Text>
                  <Text style={[styles.tableVal, { color: theme.text }]}>{systemStatus?.host.hostname || "---"}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Processor</Text>
                  <Text style={[styles.tableVal, { color: theme.text }]} numberOfLines={1}>
                    {systemStatus?.host.cpu.model || "---"}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Operating System</Text>
                  <Text style={[styles.tableVal, { color: theme.text }]}>
                    {systemStatus?.host.platform} ({systemStatus?.host.arch}) • {systemStatus?.host.osRelease}
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Host Uptime</Text>
                  <Text style={[styles.tableVal, { color: theme.text }]}>{systemStatus?.host.uptimeFormatted || "---"}</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Event Loop</Text>
                  <Text style={[styles.tableVal, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.server.activeHandles || 0} handles / {systemStatus?.server.activeRequests || 0} requests
                  </Text>
                </View>
              </View>

              {/* Active Network Interfaces */}
              {systemStatus?.host.networkInterfaces && systemStatus.host.networkInterfaces.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>Network Interfaces</Text>
                  <View style={styles.networkBadgeRow}>
                    {systemStatus.host.networkInterfaces.map((net, i) => (
                      <View key={i} style={[styles.networkBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                        <Ionicons name="git-network-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.networkText, { color: theme.text }]}>
                          {net.name}: <Text style={{ fontFamily: theme.monoFont, color: theme.textSecondary }}>{net.address}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: API TRAFFIC & LATENCY METRICS                                 */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* Traffic Metrics Header */}
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>TOTAL REQUESTS</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {systemStatus?.traffic.totalRequests ?? 0}
                </Text>
                <Text style={[styles.metricSub, { color: theme.textMuted }]}>Inbound Traffic</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>THROUGHPUT</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {systemStatus?.traffic.requestsPerMinute ?? 0}
                </Text>
                <Text style={[styles.metricSub, { color: theme.textMuted }]}>Req / Minute</Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>AVG LATENCY</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {systemStatus?.traffic.latency.avgMs ?? 0} ms
                </Text>
                <Text style={[styles.metricSub, { color: theme.textMuted }]}>
                  p95: {systemStatus?.traffic.latency.p95Ms ?? 0} ms
                </Text>
              </View>
            </View>

            {/* Status Code Breakdown Card */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="bar-chart-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>HTTP Status Distribution</Text>
                </View>
              </View>

              <View style={styles.statusBreakdownGrid}>
                <View style={[styles.statusBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.statusBoxCount, { color: theme.green, fontFamily: theme.monoFont }]}>
                    {systemStatus?.traffic.statusBreakdown["2xx"] ?? 0}
                  </Text>
                  <Text style={[styles.statusBoxLabel, { color: theme.textSecondary }]}>2xx Success</Text>
                </View>

                <View style={[styles.statusBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.statusBoxCount, { color: theme.blue, fontFamily: theme.monoFont }]}>
                    {systemStatus?.traffic.statusBreakdown["3xx"] ?? 0}
                  </Text>
                  <Text style={[styles.statusBoxLabel, { color: theme.textSecondary }]}>3xx Redirect</Text>
                </View>

                <View style={[styles.statusBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.statusBoxCount, { color: theme.amber, fontFamily: theme.monoFont }]}>
                    {systemStatus?.traffic.statusBreakdown["4xx"] ?? 0}
                  </Text>
                  <Text style={[styles.statusBoxLabel, { color: theme.textSecondary }]}>4xx Client Err</Text>
                </View>

                <View style={[styles.statusBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.statusBoxCount, { color: theme.red, fontFamily: theme.monoFont }]}>
                    {systemStatus?.traffic.statusBreakdown["5xx"] ?? 0}
                  </Text>
                  <Text style={[styles.statusBoxLabel, { color: theme.textSecondary }]}>5xx Server Err</Text>
                </View>
              </View>
            </View>

            {/* Network Inspector / Live Stream */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="list-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Live Request Stream</Text>
                </View>
                <Text style={[styles.subTextRight, { color: theme.textSecondary }]}>Recent Inbound</Text>
              </View>

              {(!systemStatus?.traffic.recentRequests || systemStatus.traffic.recentRequests.length === 0) ? (
                <View style={styles.emptyCardBox}>
                  <Ionicons name="radio-outline" size={28} color={theme.textMuted} />
                  <Text style={[styles.emptyCardText, { color: theme.textSecondary }]}>No recent HTTP traffic recorded</Text>
                </View>
              ) : (
                <View style={styles.streamList}>
                  {systemStatus.traffic.recentRequests.map((reqItem) => {
                    const badge = getMethodBadgeStyle(reqItem.method);
                    const status = getStatusCodeStyle(reqItem.statusCode);

                    return (
                      <View key={reqItem.id} style={[styles.streamItemRow, { borderBottomColor: theme.borderSubtle }]}>
                        <View style={[styles.methodBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.methodText, { color: badge.color }]}>{reqItem.method}</Text>
                        </View>
                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                          <Text style={[styles.streamPath, { color: theme.text, fontFamily: theme.monoFont }]} numberOfLines={1}>
                            {reqItem.path}
                          </Text>
                          <Text style={[styles.streamTimestamp, { color: theme.textMuted }]}>
                            {new Date(reqItem.timestamp).toLocaleTimeString()}
                          </Text>
                        </View>
                        <View style={styles.streamMetaRight}>
                          <Text style={[styles.statusCodeText, { color: status.color, fontFamily: theme.monoFont }]}>
                            {reqItem.statusCode}
                          </Text>
                          <Text style={[styles.streamDuration, { color: theme.textSecondary, fontFamily: theme.monoFont }]}>
                            {reqItem.durationMs}ms
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: DATABASE & CLOUD SERVICES                                     */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* Firestore Engine Card */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="server-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Google Cloud Firestore</Text>
                </View>
                <View style={[styles.statusBadgeGreen, { backgroundColor: systemStatus?.database.status === "ONLINE" ? theme.greenLight : theme.redLight }]}>
                  <Text style={[styles.statusBadgeGreenText, { color: systemStatus?.database.status === "ONLINE" ? theme.green : theme.red }]}>
                    {systemStatus?.database.status === "ONLINE" ? "Connected" : "Degraded"}
                  </Text>
                </View>
              </View>

              <View style={[styles.appleTable, { borderColor: theme.border, marginTop: 12 }]}>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Read Ping Latency</Text>
                  <Text style={[styles.tableVal, { color: theme.text, fontFamily: theme.monoFont, fontWeight: "700" }]}>
                    {systemStatus?.database.latencyMs ?? 0} ms
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Engine</Text>
                  <Text style={[styles.tableVal, { color: theme.text }]}>NoSQL Document Store</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Replication</Text>
                  <Text style={[styles.tableVal, { color: theme.textSecondary }]}>Multi-Region Automatic</Text>
                </View>
              </View>

              {/* Collection Counts Grid */}
              <Text style={[styles.subSectionTitle, { color: theme.textSecondary, marginTop: 16 }]}>
                Collection Document Counts
              </Text>
              <View style={styles.collectionCountGrid}>
                <View style={[styles.collectionCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Ionicons name="people-outline" size={16} color={theme.text} />
                  <Text style={[styles.collectionNumber, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.database.collections.users ?? 0}
                  </Text>
                  <Text style={[styles.collectionName, { color: theme.textSecondary }]}>users</Text>
                </View>

                <View style={[styles.collectionCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Ionicons name="business-outline" size={16} color={theme.text} />
                  <Text style={[styles.collectionNumber, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.database.collections.hostels ?? 0}
                  </Text>
                  <Text style={[styles.collectionName, { color: theme.textSecondary }]}>hostels</Text>
                </View>

                <View style={[styles.collectionCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Ionicons name="notifications-outline" size={16} color={theme.text} />
                  <Text style={[styles.collectionNumber, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.database.collections.notifications ?? 0}
                  </Text>
                  <Text style={[styles.collectionName, { color: theme.textSecondary }]}>notifications</Text>
                </View>

                <View style={[styles.collectionCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Ionicons name="shield-outline" size={16} color={theme.text} />
                  <Text style={[styles.collectionNumber, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.database.collections.auditLogs ?? 0}
                  </Text>
                  <Text style={[styles.collectionName, { color: theme.textSecondary }]}>auditLogs</Text>
                </View>

                <View style={[styles.collectionCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                  <Ionicons name="phone-portrait-outline" size={16} color={theme.text} />
                  <Text style={[styles.collectionNumber, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.database.collections.pushTokens ?? 0}
                  </Text>
                  <Text style={[styles.collectionName, { color: theme.textSecondary }]}>pushTokens</Text>
                </View>
              </View>
            </View>

            {/* Firebase Auth & Cloud Push Gateway */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="key-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Identity & Cloud Push Gateway</Text>
                </View>
              </View>

              <View style={[styles.appleTable, { borderColor: theme.border, marginTop: 12 }]}>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Firebase Admin Auth</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.tableVal, { color: theme.green, fontWeight: "600" }]}>Active</Text>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontFamily: theme.monoFont }}>({systemStatus?.authService.latencyMs ?? 0} ms)</Text>
                  </View>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Push Notification Devices</Text>
                  <Text style={[styles.tableVal, { color: theme.text, fontFamily: theme.monoFont }]}>
                    {systemStatus?.database.collections.pushTokens ?? 0} Registered
                  </Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Cron Scheduler Worker</Text>
                  <Text style={[styles.tableVal, { color: theme.green, fontWeight: "600" }]}>Active</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 3: DIAGNOSTICS & SYSTEM BENCHMARKS                                */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* Action Bar */}
            <View style={[styles.actionBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionBannerTitle, { color: theme.text }]}>
                  System Health Benchmarks
                </Text>
                <Text style={[styles.actionBannerDesc, { color: theme.textSecondary }]}>
                  Executes 7 diagnostic probes testing event loop, Firestore reads/writes, and Firebase Auth tokens.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.accent }, runningDiagnostics && { opacity: 0.6 }]}
                onPress={handleRunDiagnostics}
                disabled={runningDiagnostics}
              >
                {runningDiagnostics ? (
                  <ActivityIndicator size="small" color={isDark ? "#09090B" : "#FFFFFF"} />
                ) : (
                  <>
                    <Ionicons name="play" size={14} color={isDark ? "#09090B" : "#FFFFFF"} />
                    <Text style={[styles.primaryActionBtnText, { color: isDark ? "#09090B" : "#FFFFFF" }]}>Run Probes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Diagnostic Summary KPI if executed */}
            {diagnosticResult && (
              <View style={styles.metricRow}>
                <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>PASSED</Text>
                  <Text style={[styles.metricValue, { color: theme.green, fontFamily: theme.monoFont }]}>{diagnosticResult.passCount}</Text>
                  <Text style={[styles.metricSub, { color: theme.textMuted }]}>Optimal</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>WARNINGS</Text>
                  <Text style={[styles.metricValue, { color: theme.amber, fontFamily: theme.monoFont }]}>{diagnosticResult.warnCount}</Text>
                  <Text style={[styles.metricSub, { color: theme.textMuted }]}>Threshold</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>FAILURES</Text>
                  <Text style={[styles.metricValue, { color: theme.red, fontFamily: theme.monoFont }]}>{diagnosticResult.failCount}</Text>
                  <Text style={[styles.metricSub, { color: theme.textMuted }]}>Errors</Text>
                </View>
              </View>
            )}

            {/* Probes Results */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Diagnostic Probes</Text>
                </View>
                {diagnosticResult && (
                  <Text style={[styles.subTextRight, { color: theme.textSecondary }]}>
                    {new Date(diagnosticResult.timestamp).toLocaleTimeString()}
                  </Text>
                )}
              </View>

              {!diagnosticResult ? (
                <View style={styles.emptyCardBox}>
                  <Ionicons name="shield-outline" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyCardText, { color: theme.textSecondary }]}>
                    Tap "Run Probes" to benchmark live services and connectivity
                  </Text>
                </View>
              ) : (
                <View style={styles.probesList}>
                  {diagnosticResult.probes.map((probe) => (
                    <View key={probe.id} style={[styles.probeCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.borderSubtle }]}>
                      <View style={styles.probeTopRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.probeName, { color: theme.text }]}>{probe.name}</Text>
                          <Text style={[styles.probeCategory, { color: theme.textMuted }]}>
                            {probe.category}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.probeStatusBadge,
                            probe.status === "PASS" && { backgroundColor: theme.greenLight },
                            probe.status === "WARN" && { backgroundColor: theme.amberLight },
                            probe.status === "FAIL" && { backgroundColor: theme.redLight },
                          ]}
                        >
                          <Text
                            style={[
                              styles.probeStatusText,
                              probe.status === "PASS" && { color: theme.green },
                              probe.status === "WARN" && { color: theme.amber },
                              probe.status === "FAIL" && { color: theme.red },
                            ]}
                          >
                            {probe.status} {probe.latencyMs > 0 ? `(${probe.latencyMs}ms)` : ""}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.probeDetail, { color: theme.textSecondary }]}>{probe.detail}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Cache Flush Controller */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 14 }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="trash-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Server Cache Controller</Text>
                </View>
              </View>
              <Text style={[styles.cardDescText, { color: theme.textSecondary }]}>
                Purges in-memory administrative role permissions, routing caches, and room queries across memory.
              </Text>
              <TouchableOpacity
                style={[styles.flushCacheBtn, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }, flushingCache && { opacity: 0.6 }]}
                onPress={handleFlushCache}
                disabled={flushingCache}
              >
                {flushingCache ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={15} color={theme.text} />
                    <Text style={[styles.flushCacheBtnText, { color: theme.text }]}>
                      Flush Server Cache
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 4: SECURITY & AUDIT EVENT LEDGER                                 */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="document-text-outline" size={17} color={theme.text} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Security Audit Trail</Text>
                </View>
                <TouchableOpacity onPress={loadAuditLogs} style={[styles.miniRefreshBtn, { borderColor: theme.border }]}>
                  <Ionicons name="reload-outline" size={14} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {loadingLogs ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={theme.text} />
                  <Text style={[styles.emptyCardText, { color: theme.textSecondary, marginTop: 8 }]}>Loading audit events...</Text>
                </View>
              ) : auditLogs.length === 0 ? (
                <View style={styles.emptyCardBox}>
                  <Ionicons name="document-text-outline" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyCardText, { color: theme.textSecondary }]}>No security audit logs recorded</Text>
                </View>
              ) : (
                <View style={styles.auditList}>
                  {auditLogs.map((log) => (
                    <TouchableOpacity
                      key={log.id}
                      style={[styles.auditItem, { borderBottomColor: theme.borderSubtle }]}
                      onPress={() => setSelectedLog(log)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.auditItemHeader}>
                        <View style={[styles.actionPill, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                          <Text style={[styles.actionPillText, { color: theme.text }]}>{log.action}</Text>
                        </View>
                        <Text style={[styles.auditTime, { color: theme.textMuted }]}>
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </View>
                      <View style={styles.auditMetaRow}>
                        <Text style={[styles.auditMetaText, { color: theme.text }]}>
                          Target: <Text style={{ color: theme.blue }}>{log.entityType}</Text>
                          {log.entityId ? ` (${log.entityId.slice(0, 8)}...)` : ""}
                        </Text>
                        <Text style={[styles.auditActor, { color: theme.textMuted }]}>
                          Actor: {log.actorId ? log.actorId.slice(0, 8) : "SYSTEM"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 5: ADMINISTRATOR GOVERNANCE                                      */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* KPI Counters */}
            <View style={styles.metricRow}>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>TOTAL ADMINS</Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>{totalAdminsCount}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>ACTIVE</Text>
                <Text style={[styles.metricValue, { color: theme.green, fontFamily: theme.monoFont }]}>{activeAdminsCount}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>INACTIVE</Text>
                <Text style={[styles.metricValue, { color: theme.textSecondary, fontFamily: theme.monoFont }]}>{inactiveAdminsCount}</Text>
              </View>
            </View>

            {/* Action Bar & Search */}
            <View style={styles.adminActionRow}>
              <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={15} color={theme.textSecondary} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search administrators..."
                  placeholderTextColor={theme.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={[styles.addAdminBtn, { backgroundColor: theme.accent }]}
                onPress={() => setShowAddModal(true)}
              >
                <Ionicons name="person-add" size={14} color={isDark ? "#09090B" : "#FFFFFF"} />
                <Text style={[styles.addAdminBtnText, { color: isDark ? "#09090B" : "#FFFFFF" }]}>Add Admin</Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter Chips */}
            <View style={styles.filterChipRow}>
              {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    statusFilter === filter
                      ? { backgroundColor: theme.surfaceElevated, borderColor: theme.border }
                      : { backgroundColor: theme.card, borderColor: theme.borderSubtle },
                  ]}
                  onPress={() => setStatusFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: statusFilter === filter ? theme.text : theme.textSecondary,
                        fontWeight: statusFilter === filter ? "700" : "500",
                      },
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Admins List */}
            {loadingAdmins ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={theme.text} />
              </View>
            ) : filteredAdmins.length === 0 ? (
              <View style={[styles.emptyCardBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="people-outline" size={32} color={theme.textMuted} />
                <Text style={[styles.emptyCardText, { color: theme.textSecondary, marginTop: 8 }]}>
                  No administrators matching filter
                </Text>
              </View>
            ) : (
              filteredAdmins.map((admin) => {
                const isCurrent = admin.id === currentUser?.id;
                const isActive = admin.status === "ACTIVE";

                return (
                  <View
                    key={admin.id}
                    style={[
                      styles.adminCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: isCurrent ? theme.text : theme.border,
                      },
                    ]}
                  >
                    <View style={styles.adminCardHeader}>
                      <View style={[styles.adminAvatar, { backgroundColor: theme.surfaceSecondary }]}>
                        <Text style={[styles.adminAvatarText, { color: theme.text }]}>
                          {(admin.firstName?.[0] || "A").toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.adminNameRow}>
                          <Text style={[styles.adminName, { color: theme.text }]}>
                            {admin.firstName} {admin.lastName || ""}
                          </Text>
                          {isCurrent && (
                            <View style={[styles.youBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                              <Text style={[styles.youBadgeText, { color: theme.textSecondary }]}>YOU</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.adminEmail, { color: theme.textSecondary }]}>{admin.email}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isActive ? theme.greenLight : theme.surfaceSecondary,
                          },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: isActive ? theme.green : theme.textSecondary }]}>
                          {admin.status}
                        </Text>
                      </View>
                    </View>

                    {admin.phone && (
                      <View style={styles.adminDetailRow}>
                        <Ionicons name="call-outline" size={13} color={theme.textSecondary} />
                        <Text style={[styles.adminDetailText, { color: theme.textSecondary }]}>{admin.phone}</Text>
                      </View>
                    )}

                    {!isCurrent && (
                      <View style={[styles.adminActionFooter, { borderTopColor: theme.borderSubtle }]}>
                        <TouchableOpacity
                          style={[
                            styles.toggleStatusBtn,
                            {
                              borderColor: theme.border,
                              backgroundColor: theme.surfaceSecondary,
                            },
                          ]}
                          onPress={() => handleToggleStatus(admin)}
                        >
                          <Ionicons
                            name={isActive ? "pause-outline" : "play-outline"}
                            size={13}
                            color={isActive ? theme.amber : theme.green}
                          />
                          <Text
                            style={[
                              styles.toggleStatusText,
                              { color: theme.text },
                            ]}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.deleteAdminBtn, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}
                          onPress={() => handleDeleteAdmin(admin)}
                        >
                          <Ionicons name="trash-outline" size={13} color={theme.red} />
                          <Text style={[styles.deleteAdminText, { color: theme.red }]}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 6: SYSTEM ERROR & EXCEPTION LOGS (Feature 2)                     */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* Header / Buffer Controls Card */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="bug-outline" size={17} color={theme.red} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>System Log Stream</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    style={[styles.smallActionBtn, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    onPress={handleClearSystemLogs}
                  >
                    <Ionicons name="trash-outline" size={13} color={theme.red} />
                    <Text style={[styles.smallActionBtnText, { color: theme.red }]}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                Real-time circular buffer capturing unhandled 5xx exceptions, syntax/transform errors, and server events.
              </Text>

              {/* Filter Chips */}
              <View style={styles.logFilterRow}>
                {(["ALL", "ERROR", "WARN", "INFO"] as const).map((lvl) => {
                  const isActive = logFilter === lvl;
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.logFilterChip,
                        {
                          backgroundColor: isActive ? theme.surfaceElevated : theme.surfaceSecondary,
                          borderColor: isActive ? theme.border : "transparent",
                        },
                      ]}
                      onPress={() => {
                        setLogFilter(lvl);
                        void loadSystemLogs(lvl);
                      }}
                    >
                      <Text
                        style={[
                          styles.logFilterChipText,
                          {
                            color: isActive ? theme.text : theme.textSecondary,
                            fontWeight: isActive ? "700" : "500",
                          },
                        ]}
                      >
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Logs List */}
            {loadingSystemLogs ? (
              <View style={[styles.loadingBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <ActivityIndicator size="small" color={theme.text} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Querying telemetry logs buffer…</Text>
              </View>
            ) : systemLogs.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="shield-checkmark-outline" size={32} color={theme.green} />
                <Text style={[styles.emptyCardTitle, { color: theme.text }]}>No System Errors Captured</Text>
                <Text style={[styles.emptyCardSub, { color: theme.textSecondary }]}>
                  All services and API endpoints are operating within normal operational tolerances.
                </Text>
              </View>
            ) : (
              systemLogs.map((log) => {
                const isError = log.level === "ERROR";
                const isWarn = log.level === "WARN";
                const levelColor = isError ? theme.red : isWarn ? theme.amber : theme.blue;
                const levelBg = isError ? theme.redLight : isWarn ? theme.amberLight : theme.accentLight;

                return (
                  <TouchableOpacity
                    key={log.id}
                    style={[styles.systemLogCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => setSelectedSystemLog(log)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.systemLogRowHeader}>
                      <View style={[styles.systemLogLevelBadge, { backgroundColor: levelBg, borderColor: levelColor }]}>
                        <Text style={[styles.systemLogLevelText, { color: levelColor }]}>{log.level}</Text>
                      </View>

                      {log.method && (
                        <View style={[styles.systemLogMethodBadge, { backgroundColor: theme.surfaceSecondary }]}>
                          <Text style={[styles.systemLogMethodText, { color: theme.text, fontFamily: theme.monoFont }]}>
                            {log.method}
                          </Text>
                        </View>
                      )}

                      {log.route && (
                        <Text
                          style={[styles.systemLogRouteText, { color: theme.textSecondary, fontFamily: theme.monoFont }]}
                          numberOfLines={1}
                        >
                          {log.route}
                        </Text>
                      )}

                      <Text style={[styles.systemLogTimestamp, { color: theme.textMuted }]}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </Text>
                    </View>

                    <Text style={[styles.systemLogMessage, { color: theme.text }]} numberOfLines={2}>
                      {log.message}
                    </Text>

                    {log.stack && (
                      <View style={styles.stackTraceIndicator}>
                        <Ionicons name="code-slash-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.stackTraceIndicatorText, { color: theme.textMuted, fontFamily: theme.monoFont }]}>
                          Stack trace available • Tap to inspect
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 7: PLATFORM GOVERNANCE & MAINTENANCE MODE (Feature 5)            */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        <View style={{ width: containerWidth }}>
          <ScrollView
            contentContainerStyle={[styles.tabContent, { paddingBottom: bottomInset + 30 }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.accent} />}
          >
            {/* Platform Maintenance Mode Card */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="construct-outline" size={17} color={platformConfig?.maintenanceMode ? theme.amber : theme.green} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Platform Maintenance Mode</Text>
                </View>
                <View
                  style={[
                    styles.neutralPill,
                    {
                      backgroundColor: platformConfig?.maintenanceMode ? theme.amberLight : theme.greenLight,
                      borderColor: platformConfig?.maintenanceMode ? theme.amber : theme.green,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.neutralPillText,
                      { color: platformConfig?.maintenanceMode ? theme.amber : theme.green, fontWeight: "700" },
                    ]}
                  >
                    {platformConfig?.maintenanceMode ? "MAINTENANCE ACTIVE" : "PLATFORM ONLINE"}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                Enabling maintenance mode blocks all resident and hostel admin traffic with HTTP 503 Service Unavailable. Super Admins retain full console access.
              </Text>

              <View style={[styles.switchCardRow, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>Activate Maintenance Lockdown</Text>
                  <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                    Returns maintenance screen to mobile clients
                  </Text>
                </View>
                <Switch
                  value={platformConfig?.maintenanceMode ?? false}
                  onValueChange={handleToggleMaintenanceMode}
                  trackColor={{ false: theme.border, true: theme.amber }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                />
              </View>

              <Text style={[styles.inputFieldLabel, { color: theme.textSecondary, marginTop: 14 }]}>
                Resident Maintenance Notice
              </Text>
              <TextInput
                style={[
                  styles.platformMultilineInput,
                  { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border },
                ]}
                placeholder="Notice displayed on resident and admin screens during maintenance…"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                value={formMaintenanceNotice}
                onChangeText={setFormMaintenanceNotice}
              />
            </View>

            {/* Global Alert Banner Card */}
            <View style={[styles.appleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderTitleGroup}>
                  <Ionicons name="notifications-outline" size={17} color={theme.blue} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Global Alert Banner</Text>
                </View>
                <Switch
                  value={formBannerActive}
                  onValueChange={setFormBannerActive}
                  trackColor={{ false: theme.border, true: theme.blue }}
                  thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
                />
              </View>

              <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                Broadcast an official announcement banner across all resident and hostel admin application screens.
              </Text>

              {/* Banner Severity Level Selector */}
              <Text style={[styles.inputFieldLabel, { color: theme.textSecondary }]}>Banner Severity</Text>
              <View style={styles.levelSelectorRow}>
                {(["INFO", "WARN", "CRITICAL"] as const).map((lvl) => {
                  const isActive = formBannerLevel === lvl;
                  const chipColor = lvl === "CRITICAL" ? theme.red : lvl === "WARN" ? theme.amber : theme.blue;
                  const chipBg = lvl === "CRITICAL" ? theme.redLight : lvl === "WARN" ? theme.amberLight : theme.accentLight;

                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.levelChip,
                        {
                          backgroundColor: isActive ? chipBg : theme.surfaceSecondary,
                          borderColor: isActive ? chipColor : theme.border,
                        },
                      ]}
                      onPress={() => setFormBannerLevel(lvl)}
                    >
                      <View style={[styles.levelDot, { backgroundColor: chipColor }]} />
                      <Text
                        style={[
                          styles.levelChipText,
                          { color: isActive ? chipColor : theme.textSecondary, fontWeight: isActive ? "700" : "500" },
                        ]}
                      >
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title & Message inputs */}
              <Text style={[styles.inputFieldLabel, { color: theme.textSecondary, marginTop: 12 }]}>Banner Title</Text>
              <TextInput
                style={[
                  styles.platformInput,
                  { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border },
                ]}
                placeholder="e.g. Scheduled Network Upgrade"
                placeholderTextColor={theme.textMuted}
                value={formBannerTitle}
                onChangeText={setFormBannerTitle}
              />

              <Text style={[styles.inputFieldLabel, { color: theme.textSecondary, marginTop: 12 }]}>Banner Message</Text>
              <TextInput
                style={[
                  styles.platformMultilineInput,
                  { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border },
                ]}
                placeholder="e.g. Core server migrations will be active tonight from 2:00 AM to 4:00 AM."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={2}
                value={formBannerMessage}
                onChangeText={setFormBannerMessage}
              />

              {/* Live Preview */}
              <Text style={[styles.inputFieldLabel, { color: theme.textSecondary, marginTop: 14 }]}>Live App Preview</Text>
              <View
                style={[
                  styles.bannerPreviewCard,
                  {
                    backgroundColor:
                      formBannerLevel === "CRITICAL"
                        ? theme.redLight
                        : formBannerLevel === "WARN"
                        ? theme.amberLight
                        : theme.accentLight,
                    borderColor:
                      formBannerLevel === "CRITICAL"
                        ? theme.red
                        : formBannerLevel === "WARN"
                        ? theme.amber
                        : theme.blue,
                  },
                ]}
              >
                <Ionicons
                  name={
                    formBannerLevel === "CRITICAL"
                      ? "alert-circle"
                      : formBannerLevel === "WARN"
                      ? "warning"
                      : "information-circle"
                  }
                  size={18}
                  color={
                    formBannerLevel === "CRITICAL"
                      ? theme.red
                      : formBannerLevel === "WARN"
                      ? theme.amber
                      : theme.blue
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerPreviewTitle, { color: theme.text }]}>
                    {formBannerTitle || "Banner Title Preview"}
                  </Text>
                  <Text style={[styles.bannerPreviewMessage, { color: theme.textSecondary }]}>
                    {formBannerMessage || "Banner message preview will render here for all users."}
                  </Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.savePlatformBtn, { backgroundColor: theme.accent }, savingPlatformConfig && { opacity: 0.6 }]}
                onPress={handleSavePlatformConfig}
                disabled={savingPlatformConfig}
              >
                {savingPlatformConfig ? (
                  <ActivityIndicator size="small" color={isDark ? "#09090B" : "#FFFFFF"} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="cloud-upload-outline" size={15} color={isDark ? "#09090B" : "#FFFFFF"} />
                    <Text style={[styles.savePlatformBtnText, { color: isDark ? "#09090B" : "#FFFFFF" }]}>
                      Publish Platform Settings
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── Modal: Create Administrator (Apple Minimalist) ──────────────────── */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="person-add-outline" size={18} color={theme.text} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Administrator</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>First Name *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Rahul"
                placeholderTextColor={theme.textMuted}
                value={newFirstName}
                onChangeText={setNewFirstName}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Last Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Verma"
                placeholderTextColor={theme.textMuted}
                value={newLastName}
                onChangeText={setNewLastName}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="admin@staynexa.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Contact Phone</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="+91 9876543210"
                placeholderTextColor={theme.textMuted}
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Temporary Password *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
                placeholder="Min 6 characters"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={true}
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: theme.accent }, savingAdmin && { opacity: 0.6 }]}
                  onPress={handleCreateAdmin}
                  disabled={savingAdmin}
                >
                  {savingAdmin ? (
                    <ActivityIndicator size="small" color={isDark ? "#09090B" : "#FFFFFF"} />
                  ) : (
                    <Text style={[styles.modalSaveText, { color: isDark ? "#09090B" : "#FFFFFF" }]}>Create Admin</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal: Audit Log Details ─────────────────────────────────────────── */}
      <Modal
        visible={Boolean(selectedLog)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="document-text-outline" size={18} color={theme.text} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Audit Event Detail</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.appleTable, { borderColor: theme.border }]}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Action</Text>
                    <Text style={[styles.tableVal, { color: theme.text, fontWeight: "700" }]}>{selectedLog.action}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Entity Type</Text>
                    <Text style={[styles.tableVal, { color: theme.text }]}>{selectedLog.entityType}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Entity ID</Text>
                    <Text style={[styles.tableVal, { color: theme.text, fontFamily: theme.monoFont }]}>{selectedLog.entityId || "N/A"}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Actor ID</Text>
                    <Text style={[styles.tableVal, { color: theme.textSecondary, fontFamily: theme.monoFont }]}>{selectedLog.actorId}</Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Timestamp</Text>
                    <Text style={[styles.tableVal, { color: theme.textSecondary }]}>{new Date(selectedLog.createdAt).toLocaleString()}</Text>
                  </View>
                </View>

                {selectedLog.metadata && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>Event Metadata</Text>
                    <View style={[styles.codeBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                      <Text style={[styles.codeText, { color: theme.text, fontFamily: theme.monoFont }]}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: theme.border, marginTop: 18 }]}
                  onPress={() => setSelectedLog(null)}
                >
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Dismiss</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: System Log Inspector (Apple Minimalist) ───────────────────── */}
      <Modal
        visible={Boolean(selectedSystemLog)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedSystemLog(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border, maxHeight: "88%" }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="bug-outline" size={18} color={theme.red} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Exception Trace & Details</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSystemLog(null)}>
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedSystemLog && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.appleTable, { borderColor: theme.border }]}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Level</Text>
                    <Text
                      style={[
                        styles.tableVal,
                        {
                          color:
                            selectedSystemLog.level === "ERROR"
                              ? theme.red
                              : selectedSystemLog.level === "WARN"
                              ? theme.amber
                              : theme.blue,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {selectedSystemLog.level}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>HTTP Route</Text>
                    <Text style={[styles.tableVal, { color: theme.text, fontFamily: theme.monoFont }]}>
                      {selectedSystemLog.method ? `${selectedSystemLog.method} ` : ""}{selectedSystemLog.route || "N/A"}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>HTTP Status</Text>
                    <Text style={[styles.tableVal, { color: theme.text, fontFamily: theme.monoFont }]}>
                      {selectedSystemLog.statusCode || 500}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Subsystem Source</Text>
                    <Text style={[styles.tableVal, { color: theme.textSecondary, fontFamily: theme.monoFont }]}>
                      {selectedSystemLog.source}
                    </Text>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableKey, { color: theme.textSecondary }]}>Timestamp</Text>
                    <Text style={[styles.tableVal, { color: theme.textSecondary }]}>
                      {new Date(selectedSystemLog.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Error Message */}
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>Error Message</Text>
                  <View style={[styles.codeBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                    <Text style={[styles.codeText, { color: theme.red, fontFamily: theme.monoFont }]}>
                      {selectedSystemLog.message}
                    </Text>
                  </View>
                </View>

                {/* Stack Trace */}
                {selectedSystemLog.stack && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>V8 Stack Trace</Text>
                    <ScrollView horizontal style={{ maxWidth: "100%" }}>
                      <View style={[styles.codeBox, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                        <Text style={[styles.codeText, { color: theme.textSecondary, fontFamily: theme.monoFont, fontSize: 11 }]}>
                          {selectedSystemLog.stack}
                        </Text>
                      </View>
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: theme.border, marginTop: 18 }]}
                  onPress={() => setSelectedSystemLog(null)}
                >
                  <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Close Inspector</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  appleIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  heartbeatContainer: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  heartbeatRing: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  heartbeatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveToggleBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Apple Segmented Bar
  segmentedBarContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentedBarScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  segmentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 12,
  },

  tabContent: {
    padding: 16,
  },

  // KPI Row
  metricRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    fontWeight: "500",
  },

  // Apple Card
  appleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  neutralPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  neutralPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusBadgeGreen: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeGreenText: {
    fontSize: 10,
    fontWeight: "700",
  },
  subTextRight: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardDescText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },

  // Progress Bar
  gaugeTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 10,
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 3,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  barValue: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Memory Grid
  memoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  memoryBox: {
    flex: 1,
    minWidth: "45%",
    padding: 10,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  memoryBoxLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  memoryBoxValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  // Detail Table
  appleTable: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128, 128, 128, 0.15)",
  },
  tableKey: {
    fontSize: 12,
    fontWeight: "500",
  },
  tableVal: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },

  subSectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  networkBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  networkBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  networkText: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Status Breakdown
  statusBreakdownGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  statusBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  statusBoxCount: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  statusBoxLabel: {
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },

  // Stream List
  streamList: {
    marginTop: 8,
  },
  streamItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    minWidth: 46,
    alignItems: "center",
  },
  methodText: {
    fontSize: 10,
    fontWeight: "700",
  },
  streamPath: {
    fontSize: 12,
    fontWeight: "500",
  },
  streamTimestamp: {
    fontSize: 10,
    marginTop: 1,
  },
  streamMetaRight: {
    alignItems: "flex-end",
  },
  statusCodeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  streamDuration: {
    fontSize: 10,
    marginTop: 2,
  },

  // Collections Grid
  collectionCountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  collectionCard: {
    flex: 1,
    minWidth: "28%",
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  collectionNumber: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  collectionName: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },

  // Diagnostics Action Banner
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
  },
  actionBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  actionBannerDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  probesList: {
    marginTop: 10,
    gap: 8,
  },
  probeCard: {
    padding: 11,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  probeTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  probeName: {
    fontSize: 13,
    fontWeight: "600",
  },
  probeCategory: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  probeStatusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  probeStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  probeDetail: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
  },

  flushCacheBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  flushCacheBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Security Audit List
  miniRefreshBtn: {
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  auditList: {
    marginTop: 6,
  },
  auditItem: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  auditItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  actionPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  auditTime: {
    fontSize: 10,
  },
  auditMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  auditMetaText: {
    fontSize: 11,
    fontWeight: "500",
  },
  auditActor: {
    fontSize: 10,
  },

  // Admin Governance
  adminActionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  addAdminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 38,
  },
  addAdminBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  filterChipRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
  },

  adminCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    marginBottom: 10,
  },
  adminCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  adminAvatarText: {
    fontSize: 15,
    fontWeight: "700",
  },
  adminNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adminName: {
    fontSize: 13,
    fontWeight: "600",
  },
  youBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  adminEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  adminDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  adminDetailText: {
    fontSize: 11,
  },
  adminActionFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleStatusText: {
    fontSize: 11,
    fontWeight: "500",
  },
  deleteAdminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteAdminText: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Generic Helpers
  emptyCardBox: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCardText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: "center",
  },
  modalSaveText: {
    fontSize: 12,
    fontWeight: "600",
  },
  codeBox: {
    padding: 10,
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 6,
  },
  codeText: {
    fontSize: 10,
    lineHeight: 15,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },

  // System Logs & Platform Controls Styles
  smallActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  smallActionBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  logFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  logFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  logFilterChipText: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  loadingBox: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginVertical: 12,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    marginVertical: 12,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  emptyCardSub: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 280,
  },
  systemLogCard: {
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 8,
  },
  systemLogRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  systemLogLevelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  systemLogLevelText: {
    fontSize: 9,
    fontWeight: "700",
  },
  systemLogMethodBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  systemLogMethodText: {
    fontSize: 10,
    fontWeight: "700",
  },
  systemLogRouteText: {
    flex: 1,
    fontSize: 11,
  },
  systemLogTimestamp: {
    fontSize: 10,
  },
  systemLogMessage: {
    fontSize: 12,
    lineHeight: 17,
  },
  stackTraceIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
  },
  stackTraceIndicatorText: {
    fontSize: 10,
  },

  // Platform & Maintenance Mode Styles
  switchCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  platformInput: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
  },
  platformMultilineInput: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 65,
    textAlignVertical: "top",
  },
  levelSelectorRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  levelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  levelChipText: {
    fontSize: 11,
  },
  bannerPreviewCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  bannerPreviewTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  bannerPreviewMessage: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  savePlatformBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 16,
  },
  savePlatformBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
