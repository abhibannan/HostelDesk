import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface LoginScreenProps {
  loginRole: "RENTER" | "ADMIN";
  setLoginRole: (r: "RENTER" | "ADMIN") => void;
  // Renter fields
  showRenterEmailFallback?: boolean;
  setShowRenterEmailFallback?: (v: boolean) => void;
  renterEmailInput: string;
  setRenterEmailInput: (v: string) => void;
  renterPasswordInput: string;
  setRenterPasswordInput: (v: string) => void;
  onLoginWithGoogle?: () => void;
  onLoginRenterWithEmail: () => void;
  onSendPasswordResetLink?: () => void;
  // Admin fields
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((prev: boolean) => boolean)) => void;
  onLoginAdmin: () => void;
  // Shared
  loading: boolean;
  error: string;
  setError: (e: string) => void;
}

export function LoginScreen({
  loginRole,
  setLoginRole,
  showRenterEmailFallback,
  setShowRenterEmailFallback,
  renterEmailInput,
  setRenterEmailInput,
  renterPasswordInput,
  setRenterPasswordInput,
  onLoginWithGoogle,
  onLoginRenterWithEmail,
  onSendPasswordResetLink,
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  onLoginAdmin,
  loading,
  error,
  setError,
}: LoginScreenProps) {
  const { colors, isDark } = useTheme();
  const [showRenterPassword, setShowRenterPassword] = useState(false);

  return (
    <KeyboardAvoidingView
      style={[styles.loginWrapper, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.loginContent, { paddingBottom: 140 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={styles.loginInner}>
          {/* Brand Header */}
          <View style={styles.brandHero}>
            <View style={[styles.brandMarkOuter, { backgroundColor: colors.primaryLight }]}>
              <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
                <Ionicons name="business" size={26} color="#FFFFFF" />
              </View>
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>StayNexa</Text>
          </View>

          {/* Elevated Floating Auth Card */}
          <View style={[styles.authCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Role Switcher */}
            <View style={[styles.loginRoleSwitch, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.loginRoleTab,
                  loginRole === "RENTER" && [styles.loginRoleTabActive, { backgroundColor: colors.card, borderColor: colors.border }],
                ]}
                onPress={() => {
                  setLoginRole("RENTER");
                  setError("");
                }}
              >
                <Ionicons
                  name={loginRole === "RENTER" ? "person" : "person-outline"}
                  size={16}
                  color={loginRole === "RENTER" ? colors.primary : colors.secondary}
                />
                <Text
                  style={[
                    styles.loginRoleTabText,
                    { color: colors.secondary },
                    loginRole === "RENTER" && [styles.loginRoleTabTextActive, { color: colors.primary }],
                  ]}
                >
                  Resident
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.loginRoleTab,
                  loginRole === "ADMIN" && [styles.loginRoleTabActive, { backgroundColor: colors.card, borderColor: colors.border }],
                ]}
                onPress={() => {
                  setLoginRole("ADMIN");
                  setError("");
                }}
              >
                <Ionicons
                  name={
                    loginRole === "ADMIN"
                      ? "shield-checkmark"
                      : "shield-checkmark-outline"
                  }
                  size={16}
                  color={loginRole === "ADMIN" ? colors.primary : colors.secondary}
                />
                <Text
                  style={[
                    styles.loginRoleTabText,
                    { color: colors.secondary },
                    loginRole === "ADMIN" && [styles.loginRoleTabTextActive, { color: colors.primary }],
                  ]}
                >
                  Hostel Admin
                </Text>
              </TouchableOpacity>
            </View>

          {/* ── RENTER PANEL ── */}
          {loginRole === "RENTER" ? (
            <>
              <Text style={[styles.loginTitle, { color: colors.text }]}>Resident Portal</Text>

              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.secondary} />
                <TextInput
                  style={[styles.inputWithIconText, { color: colors.text }]}
                  value={renterEmailInput}
                  onChangeText={setRenterEmailInput}
                  placeholder="Enter registered email"
                  placeholderTextColor={colors.secondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.inputWithIconText, { color: colors.text }]}
                  value={renterPasswordInput}
                  onChangeText={setRenterPasswordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.secondary}
                  secureTextEntry={!showRenterPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowRenterPassword((v) => !v)}>
                  <Ionicons
                    name={showRenterPassword ? "eye-off-outline" : "eye-outline"}
                    size={21}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
                disabled={loading}
                onPress={onLoginRenterWithEmail}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Sign In as Resident</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              {onSendPasswordResetLink ? (
                <TouchableOpacity
                  style={{ marginTop: 16, alignItems: "center" }}
                  onPress={onSendPasswordResetLink}
                >
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
                    Need to set or forgot password? Send Setup Link
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            /* ── ADMIN PANEL ── */
            <>
              <Text style={[styles.loginTitle, { color: colors.text }]}>Admin Login</Text>

              <Text style={[styles.label, { color: colors.text }]}>Email or Mobile Number</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons name="person-outline" size={20} color={colors.secondary} />
                <TextInput
                  style={[styles.inputWithIconText, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email or mobile number"
                  placeholderTextColor={colors.secondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.secondary}
                />
                <TextInput
                  style={[styles.inputWithIconText, { color: colors.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.secondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={21}
                    color={colors.secondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
                disabled={loading}
                onPress={onLoginAdmin}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Sign In to Management</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              {onSendPasswordResetLink ? (
                <TouchableOpacity
                  style={{ marginTop: 14, alignItems: "center" }}
                  onPress={onSendPasswordResetLink}
                >
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
                    Forgot password? Send Reset Email
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {/* Error box */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.dangerLight, borderColor: isDark ? "rgba(239,68,68,0.3)" : "#FECACA" }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          ) : null}

          {/* Trust Footer */}
          <View style={styles.trustBadge}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.secondary} />
            <Text style={[styles.trustBadgeText, { color: colors.secondary }]}>
              256-bit Encrypted Cloud Operations • StayNexa
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
);
}

const styles = StyleSheet.create({
  loginWrapper: { flex: 1 },
  loginContent: { flexGrow: 1, justifyContent: "center", padding: 20, paddingVertical: 36 },
  loginInner: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  brandHero: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandMarkOuter: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  authCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  loginRoleSwitch: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  loginRoleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  loginRoleTabActive: {
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  loginRoleTabText: { fontSize: 13, fontWeight: "600" },
  loginRoleTabTextActive: { fontWeight: "700" },
  loginTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4, marginBottom: 18 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 4,
  },
  inputWithIcon: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputWithIconText: {
    flex: 1,
    minHeight: 50,
    marginLeft: 9,
    fontSize: 14,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 18 },
  btnDisabled: { opacity: 0.6 },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
