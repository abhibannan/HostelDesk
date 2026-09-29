import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

interface CalendarPickerModalProps {
  visible: boolean;
  initialDate?: string; // YYYY-MM-DD
  onSelectDate: (dateString: string) => void;
  onClose: () => void;
  title?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CalendarPickerModal({
  visible,
  initialDate,
  onSelectDate,
  onClose,
  title = "Select Recurring Due Date",
}: CalendarPickerModalProps) {
  // Parse initial date
  const parsedDate = initialDate ? new Date(initialDate) : new Date();
  const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  const [currentYear, setCurrentYear] = useState(validDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(validDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(validDate.getDate());

  // Calculate days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function handleConfirm() {
    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(selectedDay).padStart(2, "0");
    const dateString = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onSelectDate(dateString);
    onClose();
  }

  // Generate grid cells
  const blanks = Array.from({ length: firstDayOfWeek });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                Rent will recur on this day of every month
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Navigator */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navArrow} onPress={prevMonth}>
              <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity style={styles.navArrow} onPress={nextMonth}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Day of Week Row */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((wd, idx) => (
              <Text key={idx} style={styles.weekDayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {blanks.map((_, i) => (
              <View key={`b-${i}`} style={styles.dayCell} />
            ))}
            {days.map((d) => {
              const isSelected = d === selectedDay;
              return (
                <TouchableOpacity
                  key={`d-${d}`}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                  onPress={() => setSelectedDay(d)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Automated Notification & Recurring Notice */}
          <View style={styles.recurringNotice}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recurringNoticeTitle}>
                Recurring on Day {selectedDay} of every month
              </Text>
              <Text style={styles.recurringNoticeSub}>
                Automatic fee records & rent due notifications will be generated on this day.
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Set Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekDayText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  recurringNotice: {
    flexDirection: "row",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
  },
  recurringNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  recurringNoticeSub: {
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 2,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.grayFill,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  confirmBtn: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
