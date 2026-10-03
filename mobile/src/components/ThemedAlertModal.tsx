import React, { useState, useEffect, useCallback } from "react";
import { Alert, Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

export interface ThemedAlertButton {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface ThemedAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

export interface AlertPayload {
  id: string;
  title: string;
  message?: string;
  buttons?: ThemedAlertButton[];
  options?: ThemedAlertOptions;
}

type AlertListener = (payload: AlertPayload | null) => void;

let currentListener: AlertListener | null = null;

/**
 * Trigger a themed alert or confirmation dialog in the app
 */
export function showThemedAlert(
  title: string,
  message?: string,
  buttons?: ThemedAlertButton[],
  options?: ThemedAlertOptions,
) {
  const normalizedButtons: ThemedAlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: "OK", style: "default" }];

  if (currentListener) {
    currentListener({
      id: String(Date.now()),
      title,
      message,
      buttons: normalizedButtons,
      options,
    });
  } else {
    // Fallback if component is not yet mounted
    const cancelBtn = normalizedButtons.find((b) => b.style === "cancel");
    const okBtn = normalizedButtons.find((b) => b.style !== "cancel") || normalizedButtons[0];
    if (typeof window !== "undefined" && window.confirm) {
      const confirmed = window.confirm(`${title}${message ? `\n\n${message}` : ""}`);
      if (confirmed) {
        okBtn?.onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
    }
  }
}

// Monkey-patch React Native's Alert.alert to render our themed modal everywhere
if (Alert && typeof Alert.alert === "function") {
  Alert.alert = ((
    title: string,
    message?: string,
    buttons?: ThemedAlertButton[],
    options?: ThemedAlertOptions,
  ) => {
    showThemedAlert(title, message, buttons, options);
  }) as typeof Alert.alert;
}

/**
 * Register global listener
 */
export function registerAlertListener(listener: AlertListener) {
  currentListener = listener;
  return () => {
    if (currentListener === listener) {
      currentListener = null;
    }
  };
}

/**
 * Themed Confirmation & Alert Modal Component
 */
export function ThemedAlertModal() {
  const { colors, isDark } = useTheme();
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.92));

  useEffect(() => {
    const unregister = registerAlertListener((payload) => {
      setActiveAlert(payload);
      if (payload) {
        fadeAnim.setValue(0);
        scaleAnim.setValue(0.92);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 70,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });

    return unregister;
  }, [fadeAnim, scaleAnim]);

  const handleClose = useCallback(
    (onPressCallback?: () => void) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        const dismissCb = activeAlert?.options?.onDismiss;
        setActiveAlert(null);
        if (onPressCallback) {
          try {
            onPressCallback();
          } catch (e) {
            console.warn("Alert callback error:", e);
          }
        } else if (dismissCb) {
          dismissCb();
        }
      });
    },
    [activeAlert, fadeAnim],
  );

  if (!activeAlert) return null;

  const { title, message, buttons = [], options } = activeAlert;

  // Determine tone & icon based on title, message, and button styles
  const textContent = `${title} ${message || ""}`.toLowerCase();
  const hasDestructive = buttons.some((b) => b.style === "destructive");

  const isDeleteOrRemove =
    hasDestructive ||
    textContent.includes("delete") ||
    textContent.includes("remove") ||
    textContent.includes("withdraw") ||
    textContent.includes("permanently");

  const isSuccess =
    textContent.includes("success") ||
    textContent.includes("deleted") ||
    textContent.includes("withdrawn") ||
    textContent.includes("updated") ||
    textContent.includes("marked as") ||
    textContent.includes("registered") ||
    textContent.includes("created") ||
    textContent.includes("added") ||
    textContent.includes("sent") ||
    textContent.includes("saved") ||
    textContent.includes("confirmed");

  const isWarning =
    textContent.includes("warning") ||
    textContent.includes("missing") ||
    textContent.includes("required") ||
    textContent.includes("permission") ||
    textContent.includes("notice") ||
    textContent.includes("invalid") ||
    textContent.includes("unable") ||
    textContent.includes("failed") ||
    textContent.includes("error");

  let toneColor = colors.primary;
  let toneLight = colors.primaryLight;
  let iconName: keyof typeof Ionicons.glyphMap = "information-circle-outline";

  if (isDeleteOrRemove) {
    toneColor = colors.danger;
    toneLight = colors.dangerLight;
    iconName = "trash-outline";
  } else if (isSuccess) {
    toneColor = colors.success;
    toneLight = colors.successLight;
    iconName = "checkmark-circle-outline";
  } else if (isWarning) {
    toneColor = colors.warning;
    toneLight = colors.warningLight;
    iconName = "alert-circle-outline";
  }

  const cancelable = options?.cancelable ?? true;

  return (
    <Modal
      transparent
      visible={!!activeAlert}
      animationType="none"
      onRequestClose={() => {
        if (cancelable) {
          const cancelBtn = buttons.find((b) => b.style === "cancel");
          handleClose(cancelBtn?.onPress);
        }
      }}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            if (cancelable) {
              const cancelBtn = buttons.find((b) => b.style === "cancel");
              handleClose(cancelBtn?.onPress);
            }
          }}
        />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Tone Icon Badge */}
          <View style={[styles.iconBadge, { backgroundColor: toneLight }]}>
            <Ionicons name={iconName} size={28} color={toneColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          {message ? (
            <Text style={[styles.message, { color: colors.secondary }]}>
              {message}
            </Text>
          ) : null}

          {/* Actions */}
          <View
            style={[
              styles.buttonRow,
              buttons.length > 2 && { flexDirection: "column" },
            ]}
          >
            {buttons.map((btn, index) => {
              const isCancel = btn.style === "cancel";
              const isDestructive = btn.style === "destructive";

              let btnBg = colors.primary;
              let btnText = "#FFFFFF";
              let btnBorder = "transparent";

              if (isCancel) {
                btnBg = colors.surfaceSecondary;
                btnText = colors.text;
                btnBorder = colors.border;
              } else if (isDestructive) {
                btnBg = colors.danger;
                btnText = "#FFFFFF";
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    {
                      backgroundColor: btnBg,
                      borderColor: btnBorder,
                      borderWidth: isCancel ? 1 : 0,
                    },
                    buttons.length <= 2 && { flex: 1 },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => handleClose(btn.onPress)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: btnText },
                      !isCancel && { fontWeight: "700" },
                    ]}
                  >
                    {btn.text || "OK"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  buttonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  button: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
