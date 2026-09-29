import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, G, Line, Rect, Text as SvgText } from "react-native-svg";
import { COLORS } from "../constants/theme";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  centerText: string;
  centerSub: string;
}

export function DonutChart({ data, centerText, centerSub }: DonutChartProps) {
  const size = 190;
  const strokeWidth = 24;
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, item) => sum + Math.max(0, item.value), 0);

  let offset = 0;
  const circles = data.map((item, index) => {
    const fraction = total > 0 ? Math.max(0, item.value) / total : 0;
    const dash = fraction * circumference;
    const element = (
      <Circle
        key={`${item.label}-${index}`}
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={item.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    );
    offset += dash;
    return element;
  });

  return (
    <View style={styles.chartBlock}>
      <View style={{ alignItems: "center" }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS.grayFill}
            strokeWidth={strokeWidth}
          />
          {circles}
          <SvgText x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="23" fontWeight="800" fill={COLORS.text}>
            {centerText}
          </SvgText>
          <SvgText x={size / 2} y={size / 2 + 19} textAnchor="middle" fontSize="11" fill={COLORS.secondary}>
            {centerSub}
          </SvgText>
        </Svg>
      </View>
      <View style={styles.legendList}>
        {data.map((item) => (
          <View key={item.label} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
            <Text style={styles.legendValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
}

export function BarChart({ data }: BarChartProps) {
  const width = 330;
  const height = 220;
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 14;
  const paddingBottom = 34;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const max = Math.max(1, ...data.map((item) => item.value));
  const gap = 12;
  const barWidth = data.length > 0 ? (chartWidth - gap * (data.length - 1)) / data.length : 0;

  return (
    <View style={styles.barChartContainer}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke={COLORS.border} strokeWidth="1" />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight / 2} x2={width - paddingRight} y2={paddingTop + chartHeight / 2} stroke={COLORS.border} strokeWidth="1" />
        <Line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width - paddingRight} y2={paddingTop + chartHeight} stroke={COLORS.border} strokeWidth="1" />
        {data.map((item, index) => {
          const x = paddingLeft + index * (barWidth + gap);
          const h = (item.value / max) * chartHeight;
          const y = paddingTop + chartHeight - h;
          return (
            <G key={`${item.label}-${index}`}>
              <Rect x={x} y={y} width={barWidth} height={Math.max(2, h)} rx="7" fill={item.color} />
              <SvgText x={x + barWidth / 2} y={Math.max(12, y - 7)} textAnchor="middle" fontSize="10" fontWeight="700" fill={COLORS.text}>
                {item.value}
              </SvgText>
              <SvgText x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="9" fill={COLORS.secondary}>
                {item.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

interface HorizontalBarsProps {
  data: { label: string; value: number; color: string }[];
}

export function HorizontalBars({ data }: HorizontalBarsProps) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <View style={{ gap: 14 }}>
      {data.map((item) => (
        <View key={item.label}>
          <View style={styles.horizontalBarHeader}>
            <Text style={styles.horizontalBarLabel}>{item.label}</Text>
            <Text style={styles.horizontalBarValue}>{item.value}</Text>
          </View>
          <View style={styles.horizontalTrack}>
            <View style={[styles.horizontalFill, { width: `${(item.value / max) * 100}%`, backgroundColor: item.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chartBlock: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  legendList: { flex: 1, marginLeft: 13, gap: 9 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  legendLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  legendDot: { width: 9, height: 9, borderRadius: 9, marginRight: 7 },
  legendLabel: { fontSize: 12, color: COLORS.secondary, flexShrink: 1 },
  legendValue: { fontSize: 13, fontWeight: "800", color: COLORS.text },
  barChartContainer: { marginTop: 12, alignItems: "center" },
  horizontalBarHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  horizontalBarLabel: { fontSize: 12, color: COLORS.secondary },
  horizontalBarValue: { fontSize: 12, fontWeight: "800", color: COLORS.text },
  horizontalTrack: { height: 10, borderRadius: 99, backgroundColor: COLORS.grayFill, overflow: "hidden" },
  horizontalFill: { height: "100%", borderRadius: 99 },
});
