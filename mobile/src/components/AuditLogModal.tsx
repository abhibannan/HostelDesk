import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { API_URL, parseJsonResponse } from "../services/api";

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface AuditLogModalProps {
  visible: boolean;
  onClose: () => void;
  hostelId: string;
  token: string;
}

export function AuditLogModal({ visible, onClose, hostelId, token }: AuditLogModalProps) {
  const { colors, isDark } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!hostelId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/hostels/${hostelId}/audit-logs?limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = (await parseJsonResponse(res)) as any;
        setLogs(data?.logs || []);
      }
    } catch (e) {
      console.warn("Failed to fetch audit logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      void fetchLogs();
    }
  }, [visible, hostelId, token]);

  const getActionIcon = (action: string): keyof typeof Ionicons.glyphMap => {
    if (action.includes("PAYMENT") || action.includes("FEE")) return "cash-outline";
    if (action.includes("RENTER")) return "person-outline";
    if (action.includes("ROOM")) return "bed-outline";
    if (action.includes("REPAIR")) return "construct-outline";
    if (action.includes("AUTH") || action.includes("LOGIN")) return "shield-checkmark-outline";
    return "time-outline";
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.iconBadge, { backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF" }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Audit Trail & History</Text>
                <Text style={[styles.subtitle, { color: colors.secondary }]}>Security & activity record</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.secondary }]}>Loading audit logs...</Text>
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="folder-open-outline" size={48} color={colors.secondary} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyText, { color: colors.secondary }]}>No audit log entries found</Text>
            </View>
          ) : (
            <ScrollView style={styles.logList} contentContainerStyle={{ paddingBottom: 24 }}>
              {logs.map((log) => {
                const date = new Date(log.createdAt);
                const timeStr = isNaN(date.getTime())
                  ? log.createdAt
                  : `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} • ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;

                return (
                  <View
                    key={log.id}
                    style={[
                      styles.logItem,
                      {
                        borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.actionIconContainer,
                        { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" },
                      ]}
                    >
                      <Ionicons name={getActionIcon(log.action)} size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={[styles.actionName, { color: colors.text }]}>{log.action}</Text>
                        <Text style={[styles.timeText, { color: colors.secondary }]}>{timeStr}</Text>
                      </View>
                      <Text style={[styles.entityText, { color: colors.secondary }]}>
                        {log.entityType} {log.entityId ? `#${log.entityId.slice(0, 8)}` : ""}
                        {log.metadata?.userEmail ? ` by ${log.metadata.userEmail}` : ""}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  container: {
    height: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 18,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.15)",
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  logList: {
    flex: 1,
    marginTop: 8,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  actionIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  actionName: {
    fontSize: 13,
    fontWeight: "700",
  },
  timeText: {
    fontSize: 11,
  },
  entityText: {
    fontSize: 12,
    marginTop: 2,
  },
});
