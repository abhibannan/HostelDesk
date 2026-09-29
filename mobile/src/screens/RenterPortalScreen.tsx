import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { COLORS } from "../constants/theme";
import { Fee, Hostel, Payment, Repair, Renter, User } from "../types";
import { money, today } from "../utils/formatters";
import { EmptyState } from "../components/common";

interface RenterPortalScreenProps {
  user: User;
  renter: Renter | null;
  hostel: Hostel | null;
  fees: Fee[];
  payments: Payment[];
  repairs: Repair[];
  onRefresh: () => void;
  onLogout: () => void;
  onSubmitProof: (params: {
    feeId: string;
    amount: number;
    paymentDate: string;
    proofUrl: string;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
  onSubmitRepair: (params: {
    title: string;
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }) => Promise<void>;
}

export function RenterPortalScreen({
  user,
  renter,
  hostel,
  fees,
  payments,
  repairs,
  onRefresh,
  onLogout,
  onSubmitProof,
  onSubmitRepair,
}: RenterPortalScreenProps) {
  const [activeTab, setActiveTab] = useState<"details" | "fees" | "repairs">("details");

  // Proof Upload Modal State
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState("");
  const [proofAmount, setProofAmount] = useState("");
  const [proofDate, setProofDate] = useState(today());
  const [proofReference, setProofReference] = useState("");
  const [proofNotes, setProofNotes] = useState("");
  const [proofImageUri, setProofImageUri] = useState<string | null>(null);
  const [proofImageBase64, setProofImageBase64] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Repair Complaint Modal State
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairTitle, setRepairTitle] = useState("");
  const [repairDescription, setRepairDescription] = useState("");
  const [repairPriority, setRepairPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [submittingRepair, setSubmittingRepair] = useState(false);

  // Full-screen proof preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Calculate totals
  const totalDue = fees.reduce((acc, fee) => {
    const feeAmt = Number(fee.amount || 0);
    const paidAmt = Number(fee.paidAmount || 0);
    return acc + Math.max(0, feeAmt - paidAmt);
  }, 0);

  const totalPaid = payments
    .filter((p) => String(p.status).toUpperCase() === "APPROVED")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Pick Image from Gallery
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
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setProofImageUri(asset.uri);
        setProofImageBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
      }
    } catch {
      Alert.alert("Error", "Could not pick image from gallery.");
    }
  }

  // Take Photo with Camera
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
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setProofImageUri(asset.uri);
        setProofImageBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
      }
    } catch {
      Alert.alert("Error", "Could not open camera.");
    }
  }

  // Open Proof Modal for specific fee
  function openProofForFee(fee: Fee) {
    const remaining = Math.max(0, Number(fee.amount || 0) - Number(fee.paidAmount || 0));
    setSelectedFeeId(fee.id);
    setProofAmount(String(remaining > 0 ? remaining : fee.amount));
    setProofDate(today());
    setProofReference("");
    setProofNotes("");
    setProofImageUri(null);
    setProofImageBase64(null);
    setShowProofModal(true);
  }

  // Handle Proof Submit
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
    if (!proofImageBase64) {
      Alert.alert("Missing Proof", "Please attach a photo or screenshot of your payment receipt/UPI.");
      return;
    }

    setSubmittingProof(true);
    try {
      await onSubmitProof({
        feeId: selectedFeeId,
        amount: amt,
        paymentDate: proofDate || today(),
        proofUrl: proofImageBase64,
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

  // Handle Repair Submit
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

  return (
    <View style={styles.container}>
      {/* Top Renter Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarInfo}>
          <Text style={styles.topGreeting}>Welcome,</Text>
          <Text style={styles.topName} numberOfLines={1}>
            {renterName}
          </Text>
          <View style={styles.hostelBadge}>
            <Ionicons name="business" size={13} color={COLORS.primary} />
            <Text style={styles.hostelBadgeText} numberOfLines={1}>
              {hostel?.name || "StayNexa Hostel"}
            </Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.logoutBtn]} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Renter Segment Tabs */}
      <View style={styles.tabNav}>
        <TouchableOpacity
          style={[styles.tabNavItem, activeTab === "details" && styles.tabNavItemActive]}
          onPress={() => setActiveTab("details")}
        >
          <Ionicons
            name={activeTab === "details" ? "person" : "person-outline"}
            size={18}
            color={activeTab === "details" ? COLORS.primary : COLORS.secondary}
          />
          <Text style={[styles.tabNavLabel, activeTab === "details" && styles.tabNavLabelActive]}>
            My Details
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabNavItem, activeTab === "fees" && styles.tabNavItemActive]}
          onPress={() => setActiveTab("fees")}
        >
          <Ionicons
            name={activeTab === "fees" ? "wallet" : "wallet-outline"}
            size={18}
            color={activeTab === "fees" ? COLORS.primary : COLORS.secondary}
          />
          <Text style={[styles.tabNavLabel, activeTab === "fees" && styles.tabNavLabelActive]}>
            Payments & Fees
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabNavItem, activeTab === "repairs" && styles.tabNavItemActive]}
          onPress={() => setActiveTab("repairs")}
        >
          <Ionicons
            name={activeTab === "repairs" ? "construct" : "construct-outline"}
            size={18}
            color={activeTab === "repairs" ? COLORS.primary : COLORS.secondary}
          />
          <Text style={[styles.tabNavLabel, activeTab === "repairs" && styles.tabNavLabelActive]}>
            Repairs ({repairs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TAB 1: DETAILS ================= */}
        {activeTab === "details" && (
          <View style={styles.sectionContainer}>
            {/* Quick Banner Card */}
            <View style={styles.welcomeBanner}>
              <View style={styles.bannerAvatar}>
                <Text style={styles.bannerAvatarText}>
                  {(renterName.charAt(0) || "R").toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerName}>{renterName}</Text>
                <Text style={styles.bannerSub}>{roomDisplay}</Text>
                <View style={styles.activeTag}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeTagText}>Active Resident</Text>
                </View>
              </View>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { borderLeftColor: totalDue > 0 ? COLORS.danger : COLORS.success }]}>
                <Text style={styles.statBoxLabel}>Outstanding Due</Text>
                <Text style={[styles.statBoxVal, { color: totalDue > 0 ? COLORS.danger : COLORS.success }]}>
                  {money(totalDue)}
                </Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: COLORS.primary }]}>
                <Text style={styles.statBoxLabel}>Monthly Rent</Text>
                <Text style={styles.statBoxVal}>
                  {money(renter?.monthlyFee || 0)}
                </Text>
              </View>
            </View>

            {/* Personal Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="id-card-outline" size={20} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Personal Information</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Full Name</Text>
                <Text style={styles.detailVal}>{renterName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Email Address</Text>
                <Text style={styles.detailVal}>{user.email || renter?.email || "—"}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Phone Number</Text>
                <Text style={styles.detailVal}>{user.phone || renter?.phone || renter?.user?.phone || "—"}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Guardian Phone</Text>
                <Text style={styles.detailVal}>{renter?.guardianPhone || "—"}</Text>
              </View>
            </View>

            {/* Stay & Room Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="bed-outline" size={20} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Hostel & Room Details</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Hostel Name</Text>
                <Text style={styles.detailVal}>{hostel?.name || "StayNexa"}</Text>
              </View>

              {hostel?.address ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Address</Text>
                  <Text style={styles.detailVal}>{hostel.address}</Text>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Room Assigned</Text>
                <Text style={[styles.detailVal, { fontWeight: "700", color: COLORS.primary }]}>
                  {roomDisplay}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Joining Date</Text>
                <Text style={styles.detailVal}>{renter?.joiningDate || "—"}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Monthly Fee</Text>
                <Text style={styles.detailVal}>{money(renter?.monthlyFee || 0)}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Security Deposit</Text>
                <Text style={styles.detailVal}>{money(renter?.securityDeposit || 0)}</Text>
              </View>
            </View>

            {/* Quick Action Shortcuts */}
            <View style={styles.shortcutsRow}>
              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: COLORS.primary }]}
                onPress={() => setActiveTab("fees")}
              >
                <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                <Text style={styles.shortcutBtnText}>View & Pay Fees</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.shortcutBtn, { backgroundColor: COLORS.purple }]}
                onPress={() => {
                  setActiveTab("repairs");
                  setShowRepairModal(true);
                }}
              >
                <Ionicons name="construct-outline" size={20} color="#FFFFFF" />
                <Text style={styles.shortcutBtnText}>Lodge Complaint</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= TAB 2: PAYMENTS & FEES ================= */}
        {activeTab === "fees" && (
          <View style={styles.sectionContainer}>
            {/* Pay Rent Banner */}
            <View style={styles.feeBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeBannerTitle}>Rent Payment Status</Text>
                <Text style={styles.feeBannerSub}>
                  {totalDue > 0
                    ? `You have ₹${totalDue.toLocaleString()} pending to pay.`
                    : "All current fees are fully paid! 🎉"}
                </Text>
              </View>
              {fees.length > 0 && (
                <TouchableOpacity
                  style={styles.payProofBtn}
                  onPress={() => {
                    const firstUnpaid = fees.find(
                      (f) => String(f.status).toUpperCase() !== "PAID"
                    ) || fees[0];
                    openProofForFee(firstUnpaid);
                  }}
                >
                  <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                  <Text style={styles.payProofBtnText}>Upload Proof</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Fee Invoices List */}
            <Text style={styles.sectionHeading}>Monthly Fee Schedule</Text>
            {fees.length === 0 ? (
              <EmptyState
                icon="receipt-outline"
                title="No fees scheduled"
                description="Your fee schedule will be updated by the hostel administrator."
              />
            ) : (
              fees.map((fee) => {
                const feeStatus = String(fee.status || "PENDING").toUpperCase();
                const isPaid = feeStatus === "PAID";
                const isOverdue = feeStatus === "OVERDUE";
                const isPartial = feeStatus === "PARTIAL";

                const badgeBg = isPaid
                  ? COLORS.successLight
                  : isOverdue
                  ? COLORS.dangerLight
                  : isPartial
                  ? COLORS.primaryLight
                  : COLORS.warningLight;

                const badgeFg = isPaid
                  ? COLORS.success
                  : isOverdue
                  ? COLORS.danger
                  : isPartial
                  ? COLORS.primary
                  : COLORS.warning;

                const feeAmt = Number(fee.amount || 0);
                const paidAmt = Number(fee.paidAmount || 0);
                const remaining = Math.max(0, feeAmt - paidAmt);

                return (
                  <View key={fee.id} style={styles.feeCard}>
                    <View style={styles.feeCardHeader}>
                      <View>
                        <Text style={styles.feeMonthText}>{fee.month}</Text>
                        <Text style={styles.feeDueDate}>Due: {fee.dueDate}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.badgeText, { color: badgeFg }]}>
                          {feeStatus}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.feeDivider} />

                    <View style={styles.feeAmountsRow}>
                      <View>
                        <Text style={styles.feeLabel}>Total Amount</Text>
                        <Text style={styles.feeVal}>{money(feeAmt)}</Text>
                      </View>
                      <View>
                        <Text style={styles.feeLabel}>Paid</Text>
                        <Text style={[styles.feeVal, { color: COLORS.success }]}>{money(paidAmt)}</Text>
                      </View>
                      <View>
                        <Text style={styles.feeLabel}>Remaining</Text>
                        <Text style={[styles.feeVal, { color: remaining > 0 ? COLORS.danger : COLORS.success }]}>
                          {money(remaining)}
                        </Text>
                      </View>
                    </View>

                    {!isPaid && (
                      <TouchableOpacity
                        style={styles.feeActionBtn}
                        onPress={() => openProofForFee(fee)}
                      >
                        <Ionicons name="camera-outline" size={17} color={COLORS.primary} />
                        <Text style={styles.feeActionBtnText}>Submit Proof for {fee.month}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}

            {/* Payment History & Proofs */}
            <Text style={[styles.sectionHeading, { marginTop: 24 }]}>Payment History & Submissions</Text>
            {payments.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="No payment proofs submitted"
                description="When you pay rent via UPI or Cash, upload your screenshot here."
              />
            ) : (
              payments.map((p) => {
                const status = String(p.status || "SUBMITTED").toUpperCase();
                const isApproved = status === "APPROVED";
                const isRejected = status === "REJECTED";

                const statusColor = isApproved
                  ? COLORS.success
                  : isRejected
                  ? COLORS.danger
                  : COLORS.warning;

                return (
                  <View key={p.id} style={styles.paymentHistoryCard}>
                    <View style={styles.paymentHistoryTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.paymentAmt}>{money(Number(p.amount || 0))}</Text>
                        <Text style={styles.paymentDate}>
                          Paid on: {p.paymentDate || p.createdAt?.slice(0, 10) || "—"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isApproved
                              ? COLORS.successLight
                              : isRejected
                              ? COLORS.dangerLight
                              : COLORS.warningLight,
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: statusColor }]}>
                          {status}
                        </Text>
                      </View>
                    </View>

                    {p.reference ? (
                      <Text style={styles.paymentRef}>Ref: {p.reference}</Text>
                    ) : null}

                    {p.reviewNote ? (
                      <View style={styles.adminNoteBox}>
                        <Text style={styles.adminNoteTitle}>Admin Note:</Text>
                        <Text style={styles.adminNoteText}>{p.reviewNote}</Text>
                      </View>
                    ) : null}

                    {p.proofUrl ? (
                      <TouchableOpacity
                        style={styles.viewProofBtn}
                        onPress={() => setPreviewImageUrl(p.proofUrl || null)}
                      >
                        <Ionicons name="image-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.viewProofBtnText}>View Receipt / Screenshot</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ================= TAB 3: REPAIR COMPLAINTS ================= */}
        {activeTab === "repairs" && (
          <View style={styles.sectionContainer}>
            <View style={styles.repairHeaderRow}>
              <View>
                <Text style={styles.repairTitleText}>Maintenance & Repairs</Text>
                <Text style={styles.repairSubtitle}>
                  Report broken furniture, electrical, or plumbing issues
                </Text>
              </View>
              <TouchableOpacity
                style={styles.newComplaintBtn}
                onPress={() => setShowRepairModal(true)}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.newComplaintBtnText}>New Complaint</Text>
              </TouchableOpacity>
            </View>

            {repairs.length === 0 ? (
              <EmptyState
                icon="hammer-outline"
                title="No repair complaints"
                description="Everything in your room working fine? If something needs fixing, tap 'New Complaint'."
              />
            ) : (
              repairs.map((item) => {
                const status = String(item.status || "SUBMITTED").toUpperCase();
                const isResolved = status === "RESOLVED";
                const isInProgress = status === "IN_PROGRESS";
                const isCancelled = status === "CANCELLED";

                const statusColor = isResolved
                  ? COLORS.success
                  : isInProgress
                  ? COLORS.primary
                  : isCancelled
                  ? COLORS.secondary
                  : COLORS.warning;

                const priority = String(item.priority || "MEDIUM").toUpperCase();
                const priorityColor =
                  priority === "URGENT"
                    ? COLORS.danger
                    : priority === "HIGH"
                    ? COLORS.orange
                    : COLORS.secondary;

                return (
                  <View key={item.id} style={styles.repairCard}>
                    <View style={styles.repairCardTop}>
                      <Text style={styles.repairItemTitle}>{item.title}</Text>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isResolved
                              ? COLORS.successLight
                              : isInProgress
                              ? COLORS.primaryLight
                              : COLORS.warningLight,
                          },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: statusColor }]}>
                          {status.replace("_", " ")}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.repairDesc}>{item.description}</Text>

                    <View style={styles.repairCardFooter}>
                      <View style={[styles.priorityTag, { borderColor: priorityColor }]}>
                        <Text style={[styles.priorityText, { color: priorityColor }]}>
                          {priority} Priority
                        </Text>
                      </View>
                      {item.createdAt ? (
                        <Text style={styles.repairDateText}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>

                    {item.adminNotes ? (
                      <View style={styles.repairAdminNote}>
                        <Text style={styles.repairAdminNoteTitle}>Hostel Management Update:</Text>
                        <Text style={styles.repairAdminNoteText}>{item.adminNotes}</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL: SUBMIT PROOF ================= */}
      <Modal
        visible={showProofModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProofModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Payment Proof</Text>
              <TouchableOpacity onPress={() => setShowProofModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Fee Selection */}
              <Text style={styles.inputLabel}>Select Fee Month *</Text>
              <View style={styles.feeSelectorRow}>
                {fees.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.feeSelectChip,
                      selectedFeeId === f.id && styles.feeSelectChipActive,
                    ]}
                    onPress={() => {
                      setSelectedFeeId(f.id);
                      const rem = Math.max(0, Number(f.amount || 0) - Number(f.paidAmount || 0));
                      setProofAmount(String(rem > 0 ? rem : f.amount));
                    }}
                  >
                    <Text
                      style={[
                        styles.feeSelectChipText,
                        selectedFeeId === f.id && styles.feeSelectChipTextActive,
                      ]}
                    >
                      {f.month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount Paid (₹) *</Text>
              <TextInput
                style={styles.input}
                value={proofAmount}
                onChangeText={setProofAmount}
                keyboardType="numeric"
                placeholder="e.g. 6000"
              />

              {/* Date */}
              <Text style={styles.inputLabel}>Payment Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={proofDate}
                onChangeText={setProofDate}
                placeholder="YYYY-MM-DD"
              />

              {/* Reference */}
              <Text style={styles.inputLabel}>UPI / Bank Reference / UTR Number</Text>
              <TextInput
                style={styles.input}
                value={proofReference}
                onChangeText={setProofReference}
                placeholder="e.g. UPI Ref 32901847192"
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Optional Notes</Text>
              <TextInput
                style={styles.input}
                value={proofNotes}
                onChangeText={setProofNotes}
                placeholder="Paid via GooglePay / PhonePe"
              />

              {/* Photo Upload Section */}
              <Text style={styles.inputLabel}>Payment Screenshot / Photo *</Text>
              {proofImageUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: proofImageUri }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => {
                      setProofImageUri(null);
                      setProofImageBase64(null);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.removeImageText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickerOptions}>
                  <TouchableOpacity style={styles.pickerOptionBtn} onPress={takePhotoWithCamera}>
                    <Ionicons name="camera" size={24} color={COLORS.primary} />
                    <Text style={styles.pickerOptionText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickerOptionBtn} onPress={pickImageFromGallery}>
                    <Ionicons name="images" size={24} color={COLORS.primary} />
                    <Text style={styles.pickerOptionText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitModalBtn, submittingProof && styles.btnDisabled]}
                onPress={handleSendProof}
                disabled={submittingProof}
              >
                {submittingProof ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitModalBtnText}>Send to Admin for Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL: NEW REPAIR COMPLAINT ================= */}
      <Modal
        visible={showRepairModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRepairModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lodge Repair Complaint</Text>
              <TouchableOpacity onPress={() => setShowRepairModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Complaint Title *</Text>
              <TextInput
                style={styles.input}
                value={repairTitle}
                onChangeText={setRepairTitle}
                placeholder="e.g. Geyser not heating, Fan noisy"
              />

              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.prioritySelectorRow}>
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((pri) => (
                  <TouchableOpacity
                    key={pri}
                    style={[
                      styles.priorityChip,
                      repairPriority === pri && styles.priorityChipActive,
                    ]}
                    onPress={() => setRepairPriority(pri)}
                  >
                    <Text
                      style={[
                        styles.priorityChipText,
                        repairPriority === pri && styles.priorityChipTextActive,
                      ]}
                    >
                      {pri}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Detailed Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={repairDescription}
                onChangeText={setRepairDescription}
                placeholder="Describe the issue in detail, when it started, etc."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitModalBtn, submittingRepair && styles.btnDisabled]}
                onPress={handleSendRepair}
                disabled={submittingRepair}
              >
                {submittingRepair ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.submitModalBtnText}>Register Complaint</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL: IMAGE PREVIEW ================= */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.previewModalOverlay}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setPreviewImageUrl(null)}
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.fullPreviewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.grayFill,
  },
  topBar: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topBarInfo: {
    flex: 1,
    marginRight: 12,
  },
  topGreeting: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  topName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  hostelBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 4,
  },
  hostelBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
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
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    backgroundColor: COLORS.dangerLight,
  },
  tabNav: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabNavItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabNavItemActive: {
    borderBottomColor: COLORS.primary,
  },
  tabNavLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  tabNavLabelActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    gap: 16,
  },
  welcomeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  bannerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
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
    color: COLORS.text,
  },
  bannerSub: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 2,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.successLight,
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
    backgroundColor: COLORS.success,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.success,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBoxLabel: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  statBoxVal: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  detailKey: {
    fontSize: 13,
    color: COLORS.secondary,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    maxWidth: "60%",
    textAlign: "right",
  },
  shortcutsRow: {
    flexDirection: "row",
    gap: 12,
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
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 12,
  },
  feeBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  feeBannerSub: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 3,
  },
  payProofBtn: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.text,
    marginTop: 8,
  },
  feeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  feeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  feeMonthText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  feeDueDate: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  feeAmountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  feeLabel: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: "500",
  },
  feeVal: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  feeActionBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  feeActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
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
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  paymentHistoryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentAmt: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  paymentRef: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 6,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  adminNoteBox: {
    backgroundColor: COLORS.grayFill,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  adminNoteTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  adminNoteText: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 2,
  },
  viewProofBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  viewProofBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  repairHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  repairTitleText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  repairSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
    maxWidth: 220,
  },
  newComplaintBtn: {
    backgroundColor: COLORS.purple,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  newComplaintBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  repairCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  repairCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  repairItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  repairDesc: {
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 8,
    lineHeight: 18,
  },
  repairCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priorityTag: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
  },
  repairDateText: {
    fontSize: 11,
    color: COLORS.secondary,
  },
  repairAdminNote: {
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  repairAdminNoteTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  repairAdminNoteText: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBox: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
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
    color: COLORS.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.grayFill,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 80,
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
    backgroundColor: COLORS.grayFill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  feeSelectChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  feeSelectChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  feeSelectChipTextActive: {
    color: COLORS.primary,
  },
  imagePickerOptions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  pickerOptionBtn: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  previewContainer: {
    marginTop: 4,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewImage: {
    width: "100%",
    height: 180,
  },
  removeImageBtn: {
    backgroundColor: COLORS.danger,
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
    backgroundColor: COLORS.grayFill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priorityChipActive: {
    backgroundColor: COLORS.purpleLight,
    borderColor: COLORS.purple,
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  priorityChipTextActive: {
    color: COLORS.purple,
  },
  submitModalBtn: {
    backgroundColor: COLORS.primary,
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
  previewCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullPreviewImage: {
    width: "90%",
    height: "80%",
  },
});
