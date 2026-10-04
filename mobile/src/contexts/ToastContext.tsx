import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, durationMs?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string; iconName: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: "#F0FDF4", border: "#22C55E", icon: "#16A34A", iconName: "checkmark-circle" },
  error: { bg: "#FEF2F2", border: "#EF4444", icon: "#DC2626", iconName: "alert-circle" },
  warning: { bg: "#FFFBEB", border: "#F59E0B", icon: "#D97706", iconName: "warning" },
  info: { bg: "#EFF6FF", border: "#3B82F6", icon: "#2563EB", iconName: "information-circle" },
};

const DARK_TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(16,185,129,0.15)", border: "#10B981", icon: "#34D399" },
  error: { bg: "rgba(239,68,68,0.15)", border: "#EF4444", icon: "#F87171" },
  warning: { bg: "rgba(245,158,11,0.15)", border: "#F59E0B", icon: "#FBBF24" },
  info: { bg: "rgba(59,130,246,0.15)", border: "#3B82F6", icon: "#60A5FA" },
};

let _toastIdCounter = 0;

export function ToastProvider({ children, isDark = false }: { children: React.ReactNode; isDark?: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const animValues = useRef<Record<string, Animated.Value>>({});
  const insets = useSafeAreaInsets();

  const removeToast = useCallback((id: string) => {
    const anim = animValues.current[id];
    if (anim) {
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete animValues.current[id];
      });
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", title?: string, durationMs = 3500) => {
    const id = `toast_${++_toastIdCounter}`;
    const anim = new Animated.Value(0);
    animValues.current[id] = anim;

    setToasts((prev) => [...prev.slice(-2), { id, message, title, type }]); // max 3 visible

    Animated.spring(anim, {
      toValue: 1,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();

    setTimeout(() => removeToast(id), durationMs);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => showToast(message, "success", title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, "error", title, 5000), [showToast]);
  const warning = useCallback((message: string, title?: string) => showToast(message, "warning", title, 4000), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, "info", title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <View style={[styles.container, { top: insets.top + 10 }]} pointerEvents="box-none">
        {toasts.map((toast, index) => {
          const anim = animValues.current[toast.id];
          const palette = isDark ? DARK_TOAST_COLORS[toast.type] : TOAST_COLORS[toast.type];
          const iconName = TOAST_COLORS[toast.type].iconName;

          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                {
                  backgroundColor: palette.bg,
                  borderLeftColor: palette.border,
                  transform: [
                    {
                      translateY: anim
                        ? anim.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] })
                        : -80,
                    },
                    {
                      scale: anim
                        ? anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
                        : 0.85,
                    },
                  ],
                  opacity: anim || 0,
                  marginTop: index > 0 ? 8 : 0,
                },
                Platform.OS === "ios" && {
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                },
              ]}
            >
              <Ionicons name={iconName} size={20} color={palette.icon} style={{ marginTop: 1 }} />
              <View style={styles.textContainer}>
                {toast.title ? (
                  <Text style={[styles.title, { color: isDark ? "#F1F5F9" : "#0F172A" }]}>
                    {toast.title}
                  </Text>
                ) : null}
                <Text
                  style={[styles.message, { color: isDark ? "#CBD5E1" : "#475569" }]}
                  numberOfLines={3}
                >
                  {toast.message}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeToast(toast.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={16} color={isDark ? "#94A3B8" : "#94A3B8"} />
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
    gap: 10,
    elevation: 6,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
});
