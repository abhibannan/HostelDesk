import React from "react";
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
import { COLORS } from "../constants/theme";

interface LoginScreenProps {
  loginRole: "RENTER" | "ADMIN";
  setLoginRole: (r: "RENTER" | "ADMIN") => void;
  // Renter fields
  showRenterEmailFallback: boolean;
  setShowRenterEmailFallback: (v: boolean) => void;
  renterEmailInput: string;
  setRenterEmailInput: (v: string) => void;
  renterPasswordInput: string;
  setRenterPasswordInput: (v: string) => void;
  onLoginWithGoogle: () => void;
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
  return (
    <KeyboardAvoidingView
      style={styles.loginWrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.loginContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginInner}>
          {/* Brand */}
          <View style={styles.brandMark}>
            <Ionicons name="business" size={23} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>StayNexa</Text>

          {/* Role Switcher */}
          <View style={styles.loginRoleSwitch}>
            <TouchableOpacity
              style={[
                styles.loginRoleTab,
                loginRole === "RENTER" && styles.loginRoleTabActive,
              ]}
              onPress={() => {
                setLoginRole("RENTER");
                setError("");
              }}
            >
              <Ionicons
                name={loginRole === "RENTER" ? "person" : "person-outline"}
                size={16}
                color={loginRole === "RENTER" ? COLORS.primary : COLORS.secondary}
              />
              <Text
                style={[
                  styles.loginRoleTabText,
                  loginRole === "RENTER" && styles.loginRoleTabTextActive,
                ]}
              >
                Resident / Renter
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginRoleTab,
                loginRole === "ADMIN" && styles.loginRoleTabActive,
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
                color={loginRole === "ADMIN" ? COLORS.primary : COLORS.secondary}
              />
              <Text
                style={[
                  styles.loginRoleTabText,
                  loginRole === "ADMIN" && styles.loginRoleTabTextActive,
                ]}
              >
                Hostel Admin
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── RENTER PANEL ── */}
          {loginRole === "RENTER" ? (
            <>
              <Text style={styles.loginTitle}>Resident Portal</Text>
              <Text style={styles.loginSubtitle}>
                Sign in with your verified Google account to view fees, payments,
                upload receipts & file maintenance complaints.
              </Text>

              {/* Google sign-in */}
              <TouchableOpacity
                style={[styles.googleButton, loading && styles.btnDisabled]}
                disabled={loading}
                onPress={onLoginWithGoogle}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.text} />
                ) : (
                  <>
                    <View style={styles.googleIconBox}>
                      <Ionicons name="logo-google" size={18} color="#EA4335" />
                    </View>
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Email fallback */}
              {showRenterEmailFallback ? (
                <>
                  <Text style={[styles.label, { marginTop: 18 }]}>Email</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.secondary} />
                    <TextInput
                      style={styles.inputWithIconText}
                      value={renterEmailInput}
                      onChangeText={setRenterEmailInput}
                      placeholder="Your registered email"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWithIcon}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={COLORS.secondary}
                    />
                    <TextInput
                      style={styles.inputWithIconText}
                      value={renterPasswordInput}
                      onChangeText={setRenterPasswordInput}
                      placeholder="Your password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryButton, { marginTop: 6 }]}
                    disabled={loading}
                    onPress={onLoginRenterWithEmail}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>

                  {onSendPasswordResetLink ? (
                    <TouchableOpacity
                      style={{ marginTop: 14, alignItems: "center" }}
                      onPress={onSendPasswordResetLink}
                    >
                      <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: "600" }}>
                        Need to set or forgot password? Send Setup Link
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={{ marginTop: 12, alignItems: "center" }}
                    onPress={() => setShowRenterEmailFallback(false)}
                  >
                    <Text style={styles.renterHintText}>← Back to Google Sign-In</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.googleNoticeBox}>
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                    <Text style={styles.googleNoticeText}>
                      Resident accounts authenticate via Google. Ensure your Google account
                      email matches your registered renter email.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{ marginTop: 16, alignItems: "center" }}
                    onPress={() => setShowRenterEmailFallback(true)}
                  >
                    <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: "700" }}>
                      Sign in with Email & Password →
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            /* ── ADMIN PANEL ── */
            <>
              <Text style={styles.loginTitle}>Admin Login</Text>
              <Text style={styles.loginSubtitle}>
                Manage your hostels from one place.
              </Text>

              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="mail-outline" size={20} color={COLORS.secondary} />
                <TextInput
                  style={styles.inputWithIconText}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={COLORS.secondary}
                />
                <TextInput
                  style={styles.inputWithIconText}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={21}
                    color={COLORS.secondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { marginTop: 12 }]}
                disabled={loading}
                onPress={onLoginAdmin}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Login as Admin</Text>
                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Error box */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loginWrapper: { flex: 1, backgroundColor: "#FFFFFF" },
  loginContent: { flexGrow: 1, justifyContent: "center", padding: 22 },
  loginInner: {
    width: "100%",
    alignSelf: "center",
    transform: [{ translateY: -35 }],
  },
  brandMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  brandText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 24,
  },
  loginRoleSwitch: {
    flexDirection: "row",
    backgroundColor: COLORS.grayFill,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loginRoleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  loginRoleTabActive: {
    backgroundColor: COLORS.card,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  loginRoleTabText: { fontSize: 12, fontWeight: "600", color: COLORS.secondary },
  loginRoleTabTextActive: { color: COLORS.primary, fontWeight: "700" },
  loginTitle: { fontSize: 30, fontWeight: "800", color: COLORS.text },
  loginSubtitle: {
    marginTop: 7,
    marginBottom: 26,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.secondary,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 7,
    marginTop: 3,
  },
  inputWithIcon: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },
  inputWithIconText: {
    flex: 1,
    minHeight: 50,
    marginLeft: 9,
    color: COLORS.text,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    minHeight: 54,
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  googleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  googleNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  googleNoticeText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.primaryDark,
    lineHeight: 17,
    fontWeight: "500",
  },
  renterHintText: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.secondary,
    textAlign: "center",
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: COLORS.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  errorText: { flex: 1, color: COLORS.danger, fontSize: 13, lineHeight: 19 },
  btnDisabled: { opacity: 0.6 },
});
