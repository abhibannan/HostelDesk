import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";
import { Hostel, Notification } from "../types";
import { Header, EmptyState } from "../components/common";

interface NotificationsScreenProps {
  notifications: Notification[];
  selectedHostel?: Hostel;
  hostels: Hostel[];
  onSendBroadcast: (title: string, message: string, type: string) => Promise<void>;
  onRefresh: () => void;
  onBack?: () => void;
}

export function NotificationsScreen({
  notifications,
  selectedHostel,
  hostels,
  onSendBroadcast,
  onRefresh,
  onBack,
}: NotificationsScreenProps) {
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<string>("ANNOUNCEMENT");
  const [targetScope, setTargetScope] = useState<"CURRENT" | "ALL">("CURRENT");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!broadcastTitle.trim()) {
      return Alert.alert("Title Required", "Please enter an announcement title.");
    }
    if (!broadcastMessage.trim()) {
      return Alert.alert("Message Required", "Please enter the announcement details.");
    }

    setSending(true);
    try {
      await onSendBroadcast(broadcastTitle.trim(), broadcastMessage.trim(), broadcastType);
      setShowBroadcastModal(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastType("ANNOUNCEMENT");
    } finally {
      setSending(false);
    }
  }

  function getTypeIconAndColor(type: string) {
    switch (type) {
      case "URGENT":
      case "ALERT":
        return { icon: "alert-circle-outline", color: COLORS.danger, bg: COLORS.dangerLight, label: "Urgent Alert" };
      case "MAINTENANCE":
        return { icon: "construct-outline", color: COLORS.orange, bg: COLORS.orangeLight, label: "Maintenance" };
      case "SYSTEM":
        return { icon: "information-circle-outline", color: COLORS.purple, bg: COLORS.purpleLight, label: "Notice" };
      default:
        return { icon: "megaphone-outline", color: COLORS.primary, bg: COLORS.primaryLight, label: "Announcement" };
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
        {/* Header navigation */}
        <View style={styles.topNavRow}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Header
              title="Announcements & Broadcasts"
              subtitle={selectedHostel?.name || "Hostel Communication Center"}
              onRefresh={onRefresh}
            />
          </View>
        </View>

        {/* Notice Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
          <Text style={styles.infoBoxText}>
            Use this section to publish hostel broadcasts, announcements, and maintenance alerts to residents.
            Fee-specific rent reminders are managed in the <Text style={{ fontWeight: "700" }}>Fees</Text> section.
          </Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <View>
            <Text style={styles.sectionTitle}>Broadcast History</Text>
            <Text style={styles.sectionSubtitle}>
              Announcements dispatched to resident portals
            </Text>
          </View>
          <TouchableOpacity
            style={styles.smallPrimaryButton}
            onPress={() => setShowBroadcastModal(true)}
          >
            <Ionicons name="megaphone" size={16} color="#FFFFFF" />
            <Text style={styles.smallPrimaryText}>New Broadcast</Text>
          </TouchableOpacity>
        </View>

        {/* Notification Cards */}
        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="No Broadcasts Sent Yet"
            description="Tap 'New Broadcast' above to send your first announcement or notice to residents."
          />
        ) : (
          notifications.map((notif) => {
            const typeInfo = getTypeIconAndColor(notif.type);

            return (
              <View key={notif.id} style={styles.notifCard}>
                <View style={styles.notifCardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: typeInfo.bg }]}>
                    <Ionicons name={typeInfo.icon as any} size={13} color={typeInfo.color} />
                    <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                      {typeInfo.label}
                    </Text>
                  </View>
                  <Text style={styles.notifDate}>
                    {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ""}
                  </Text>
                </View>

                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifMessage}>{notif.message}</Text>

                <View style={styles.notifFooter}>
                  <View style={styles.notifFooterItem}>
                    <Ionicons name="checkmark-circle-outline" size={13} color={COLORS.success} />
                    <Text style={styles.notifFooterText}>Delivered to resident portal</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Broadcast Modal */}
      <Modal visible={showBroadcastModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Broadcast to Residents</Text>
                <Text style={styles.modalSubtitle}>
                  Dispatches an instant notification to all active residents.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBroadcastModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Scope */}
            <Text style={styles.inputLabel}>Audience</Text>
            <View style={styles.scopeRow}>
              <TouchableOpacity
                style={[styles.scopeBtn, targetScope === "CURRENT" && styles.scopeBtnActive]}
                onPress={() => setTargetScope("CURRENT")}
              >
                <Ionicons
                  name="business-outline"
                  size={14}
                  color={targetScope === "CURRENT" ? COLORS.primary : COLORS.secondary}
                />
                <Text
                  style={[styles.scopeBtnText, targetScope === "CURRENT" && styles.scopeBtnTextActive]}
                >
                  {selectedHostel?.name || "This Hostel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, targetScope === "ALL" && styles.scopeBtnActive]}
                onPress={() => setTargetScope("ALL")}
              >
                <Ionicons
                  name="globe-outline"
                  size={14}
                  color={targetScope === "ALL" ? COLORS.primary : COLORS.secondary}
                />
                <Text
                  style={[styles.scopeBtnText, targetScope === "ALL" && styles.scopeBtnTextActive]}
                >
                  All Hostels
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category */}
            <Text style={styles.inputLabel}>Announcement Category</Text>
            <View style={styles.scopeRow}>
              {[
                { key: "ANNOUNCEMENT", label: "Announcement", icon: "megaphone-outline" },
                { key: "MAINTENANCE", label: "Maintenance", icon: "construct-outline" },
                { key: "SYSTEM", label: "Notice", icon: "information-circle-outline" },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.scopeBtn, broadcastType === cat.key && styles.scopeBtnActive]}
                  onPress={() => setBroadcastType(cat.key)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={14}
                    color={broadcastType === cat.key ? COLORS.primary : COLORS.secondary}
                  />
                  <Text
                    style={[styles.scopeBtnText, broadcastType === cat.key && styles.scopeBtnTextActive]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={broadcastTitle}
              onChangeText={setBroadcastTitle}
              placeholder="e.g. Water Tank Cleaning / Gate Curfew Timing"
              placeholderTextColor="#94A3B8"
            />

            {/* Message */}
            <Text style={styles.inputLabel}>Message Details *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              placeholder="Write the complete announcement notice..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowBroadcastModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, sending && styles.btnDisabled]}
                disabled={sending}
                onPress={handleSend}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Send Broadcast</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  screenContent: { padding: 18, paddingBottom: 36 },
  topNavRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: COLORS.card,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoBoxText: { flex: 1, fontSize: 12, color: COLORS.primaryDark, lineHeight: 18 },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sectionSubtitle: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  smallPrimaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 5,
  },
  smallPrimaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  notifCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  notifCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  notifDate: { fontSize: 11, color: COLORS.secondary },
  notifTitle: { fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 5 },
  notifMessage: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  notifFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notifFooterItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  notifFooterText: { fontSize: 11, color: COLORS.success, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalSubtitle: { fontSize: 12, color: COLORS.secondary, marginTop: 2 },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 10,
  },
  scopeRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  scopeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.grayFill,
  },
  scopeBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  scopeBtnText: { fontSize: 12, fontWeight: "600", color: COLORS.secondary },
  scopeBtnTextActive: { color: COLORS.primary, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: COLORS.secondary },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
  },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  btnDisabled: { opacity: 0.6 },
});
