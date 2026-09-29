import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";
import {
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import * as WebBrowser from "expo-web-browser";
import { auth } from "../../firebase";
import { API_URL, parseJsonResponse as jsonResponse } from "../services/api";
import { Hostel, Renter, User } from "../types";
import { listFrom, dashboardFrom } from "../utils/formatters";

export interface AuthActions {
  token: string | null;
  currentUser: User | null;
  currentRenterDoc: Renter | null;
  setCurrentRenterDoc: (r: Renter | null) => void;
  loading: boolean;
  error: string;
  setError: (e: string) => void;
  loginRole: "RENTER" | "ADMIN";
  setLoginRole: (r: "RENTER" | "ADMIN") => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((prev: boolean) => boolean)) => void;
  showRenterEmailFallback: boolean;
  setShowRenterEmailFallback: (v: boolean) => void;
  renterEmailInput: string;
  setRenterEmailInput: (v: string) => void;
  renterPasswordInput: string;
  setRenterPasswordInput: (v: string) => void;
  loginWithGoogle: () => Promise<void>;
  loginRenterWithEmail: () => Promise<void>;
  sendPasswordResetLink: (targetEmail?: string) => Promise<void>;
  loginAdmin: () => Promise<void>;
  logout: () => Promise<void>;
  /** Exposed so host data hook can initialise after auth */
  handleAuthenticatedUser: (
    idToken: string,
    expectedRole?: "RENTER" | "ADMIN",
    callbacks?: AuthCallbacks,
  ) => Promise<void>;
}

export interface AuthCallbacks {
  onHostelsLoaded: (hostels: Hostel[], token: string) => void;
  onDashboardLoaded: (data: unknown) => void;
  onRenterDataNeeded: (token: string, hostelId: string, userId: string) => void;
  onLogout: () => void;
}

export function useAuth(callbacks?: AuthCallbacks): AuthActions {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRenterDoc, setCurrentRenterDoc] = useState<Renter | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loginRole, setLoginRole] = useState<"RENTER" | "ADMIN">("RENTER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRenterEmailFallback, setShowRenterEmailFallback] = useState(false);
  const [renterEmailInput, setRenterEmailInput] = useState("");
  const [renterPasswordInput, setRenterPasswordInput] = useState("");

  const fetchHostels = useCallback(async (idToken: string): Promise<Hostel[]> => {
    const response = await fetch(`${API_URL}/hostels`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await jsonResponse(response);
    if (!response.ok) {
      throw new Error(
        String((data as Record<string, unknown>)?.message || "Unable to load hostels."),
      );
    }
    return listFrom<Hostel>(data, "hostels");
  }, []);

  const handleAuthenticatedUser = useCallback(
    async (
      idToken: string,
      expectedRole?: "RENTER" | "ADMIN",
      cb?: AuthCallbacks,
    ) => {
      const cbs = cb ?? callbacks;
      const meResponse = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const meData = await jsonResponse(meResponse);
      if (!meResponse.ok) {
        throw new Error(
          String((meData as Record<string, unknown>)?.message || "Unable to verify account."),
        );
      }

      const me = meData as Record<string, any>;
      const user = (me.user || me) as User;
      const role = user?.role;

      if (expectedRole === "RENTER" && role !== "RENTER") {
        await signOut(auth);
        throw new Error(
          "This account is not registered as a renter. Please login using the Admin tab.",
        );
      }
      if (expectedRole === "ADMIN" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        await signOut(auth);
        throw new Error(
          "This account does not have Admin access. Please login using the Renter (Google) tab.",
        );
      }

      setToken(idToken);
      setCurrentUser(user);

      const hostelData = await fetchHostels(idToken);
      cbs?.onHostelsLoaded(hostelData, idToken);

      if (role === "RENTER") {
        if (hostelData[0]?.id) {
          cbs?.onRenterDataNeeded(idToken, hostelData[0].id, user.id);
        }
        return;
      }

      const dashResponse = await fetch(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const dashData = await jsonResponse(dashResponse);
      if (!dashResponse.ok) {
        throw new Error(
          String((dashData as Record<string, unknown>)?.message || "Unable to load dashboard."),
        );
      }
      cbs?.onDashboardLoaded(dashboardFrom(dashData));
    },
    [callbacks, fetchHostels],
  );

  const loginWithGoogle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (Platform.OS === "web") {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(auth, provider);
        const idToken = await credential.user.getIdToken();
        await handleAuthenticatedUser(idToken, "RENTER");
        return;
      }

      const authUrl = `https://staynexa-17a95.firebaseapp.com/__/auth/handler?apiKey=AIzaSyAZZlhQGPf0eXNlXYdn3cHFnMzKhF7oEqk&appName=%5BDEFAULT%5D&authType=signInWithPopup&providerId=google.com&scopes=profile%20email`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, "staynexa://");

      if (result.type === "success" && auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        await handleAuthenticatedUser(idToken, "RENTER");
        return;
      }

      setShowRenterEmailFallback(true);
    } catch (err) {
      setShowRenterEmailFallback(true);
      setError(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  }, [handleAuthenticatedUser]);

  const loginRenterWithEmail = useCallback(async () => {
    if (!renterEmailInput.trim() || !renterPasswordInput) {
      setError("Please enter your registered email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        renterEmailInput.trim(),
        renterPasswordInput,
      );
      const idToken = await credential.user.getIdToken();
      await handleAuthenticatedUser(idToken, "RENTER");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renter login failed.");
    } finally {
      setLoading(false);
    }
  }, [renterEmailInput, renterPasswordInput, handleAuthenticatedUser]);

  const sendPasswordResetLink = useCallback(async (targetEmail?: string) => {
    const toEmail = (targetEmail || renterEmailInput || email).trim();
    if (!toEmail) {
      setError("Please enter your registered email address first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, toEmail);
      Alert.alert(
        "Password Setup Link Sent",
        `We have sent a link to ${toEmail}. Open the email to create or reset your password, then return here to log in.`,
      );
    } catch (err: any) {
      setError(err?.message || "Failed to send password setup email.");
    } finally {
      setLoading(false);
    }
  }, [renterEmailInput, email]);

  const loginAdmin = useCallback(async () => {
    if (!email.trim() || !password) {
      setError("Enter your admin email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken();
      await handleAuthenticatedUser(idToken, "ADMIN");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin login failed.");
    } finally {
      setLoading(false);
    }
  }, [email, password, handleAuthenticatedUser]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setToken(null);
    setCurrentUser(null);
    setCurrentRenterDoc(null);
    setEmail("");
    setPassword("");
    setRenterEmailInput("");
    setRenterPasswordInput("");
    setError("");
    callbacks?.onLogout();
  }, [callbacks]);

  return {
    token,
    currentUser,
    currentRenterDoc,
    setCurrentRenterDoc,
    loading,
    error,
    setError,
    loginRole,
    setLoginRole,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    showRenterEmailFallback,
    setShowRenterEmailFallback,
    renterEmailInput,
    setRenterEmailInput,
    renterPasswordInput,
    setRenterPasswordInput,
    loginWithGoogle,
    loginRenterWithEmail,
    sendPasswordResetLink,
    loginAdmin,
    logout,
    handleAuthenticatedUser,
  };
}
