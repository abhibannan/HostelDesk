import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

export interface SwipeAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  textColor?: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
  actionWidth?: number;
}

export function SwipeableRow({
  children,
  rightActions = [],
  leftActions = [],
  actionWidth = 72,
}: SwipeableRowProps) {
  const panX = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);

  const maxRightOffset = -(rightActions.length * actionWidth);
  const maxLeftOffset = leftActions.length * actionWidth;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dy) < 18,
      onPanResponderGrant: () => {
        panX.setOffset(currentOffset.current);
        panX.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        // Apply resistance if swiping beyond action bounds
        let newX = gesture.dx;
        if (newX < 0 && rightActions.length === 0) return;
        if (newX > 0 && leftActions.length === 0) return;

        panX.setValue(newX);
      },
      onPanResponderRelease: (_, gesture) => {
        panX.flattenOffset();
        const totalX = currentOffset.current + gesture.dx;

        let targetX = 0;
        if (totalX < maxRightOffset / 2 && rightActions.length > 0) {
          targetX = maxRightOffset;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (totalX > maxLeftOffset / 2 && leftActions.length > 0) {
          targetX = maxLeftOffset;
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        currentOffset.current = targetX;
        Animated.spring(panX, {
          toValue: targetX,
          useNativeDriver: true,
          tension: 70,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const close = () => {
    currentOffset.current = 0;
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 90,
      friction: 11,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Left Revealed Actions */}
      {leftActions.length > 0 && (
        <View style={[styles.actionsContainer, styles.leftActions]}>
          {leftActions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.actionBtn,
                { width: actionWidth, backgroundColor: action.backgroundColor },
              ]}
              onPress={() => {
                close();
                action.onPress();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon} size={20} color={action.textColor || "#FFF"} />
              <Text style={[styles.actionLabel, { color: action.textColor || "#FFF" }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Right Revealed Actions */}
      {rightActions.length > 0 && (
        <View style={[styles.actionsContainer, styles.rightActions]}>
          {rightActions.map((action, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.actionBtn,
                { width: actionWidth, backgroundColor: action.backgroundColor },
              ]}
              onPress={() => {
                close();
                action.onPress();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name={action.icon} size={20} color={action.textColor || "#FFF"} />
              <Text style={[styles.actionLabel, { color: action.textColor || "#FFF" }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Foreground Swipeable Content */}
      <Animated.View
        style={{ transform: [{ translateX: panX }] }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  actionsContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "stretch",
    zIndex: 1,
  },
  leftActions: {
    left: 0,
  },
  rightActions: {
    right: 0,
  },
  actionBtn: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
});
