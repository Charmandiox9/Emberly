import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createBusinessDate } from '../domain/business-date';
import { typography, useTheme } from './theme';

interface MonthPickerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}
function adjacentMonth(value: string, direction: number): string {
  const ordinal = Number(value.slice(0, 4)) * 12 + Number(value.slice(5)) - 1 + direction;
  return createBusinessDate(
    `${String(Math.floor(ordinal / 12)).padStart(4, '0')}-${String((ordinal % 12) + 1).padStart(2, '0')}-01`,
  ).value.slice(0, 7);
}
export function MonthPicker({ value, onChange }: MonthPickerProps): ReactElement {
  const theme = useTheme();
  const label = new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-15T12:00:00Z`));
  return (
    <View style={styles.row}>
      <Pressable
        disabled={value <= '0001-01'}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
        onPress={() => onChange(adjacentMonth(value, -1))}
        style={styles.control}
      >
        <Text style={[styles.arrow, { color: theme.text }]}>‹</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.label, { color: theme.text }]}>
        {label}
      </Text>
      <Pressable
        disabled={value >= '9999-11'}
        accessibilityRole="button"
        accessibilityLabel="Mes siguiente"
        onPress={() => onChange(adjacentMonth(value, 1))}
        style={styles.control}
      >
        <Text style={[styles.arrow, { color: theme.text }]}>›</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  control: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  arrow: { fontSize: 32, lineHeight: 40 },
  label: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.bold,
    fontSize: 18,
    lineHeight: 26,
  },
});
