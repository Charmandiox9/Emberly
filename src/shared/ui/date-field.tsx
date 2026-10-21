import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { DatePickerDialog, Host, TimePickerDialog } from '@expo/ui/jetpack-compose';
import { typography, useTheme } from './theme';

export interface DateFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly hint?: string;
  readonly maximumDate?: string;
  readonly optional?: boolean;
  readonly editable?: boolean;
}

export interface TimeFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly hint?: string;
  readonly editable?: boolean;
}

function pickerDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return new Date(new Date().setHours(12, 0, 0, 0));
  return new Date(year, month - 1, day, 12);
}

function dateValue(value: Date): string {
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function dateLabel(value: string): string {
  if (!value) return 'Seleccionar fecha';
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

export function DateField({
  label,
  value,
  onChange,
  error = '',
  hint = '',
  maximumDate,
  optional = false,
  editable = true,
}: DateFieldProps): ReactElement {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const initialDate = value ? pickerDate(value) : pickerDate(dateValue(new Date()));
  const maximum = maximumDate ? pickerDate(maximumDate) : undefined;
  if (maximum) maximum.setHours(23, 59, 59, 999);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.valueRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${dateLabel(value)}`}
          accessibilityState={{ disabled: !editable }}
          disabled={!editable}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.value,
            {
              backgroundColor: theme.raised,
              borderColor: error ? theme.danger : pressed ? theme.primary : theme.border,
              opacity: editable ? 1 : 0.55,
              transform: [{ scale: pressed && !reducedMotion ? 0.99 : 1 }],
            },
          ]}
        >
          <Text style={[styles.valueText, { color: value ? theme.text : theme.secondary }]}>
            {dateLabel(value)}
          </Text>
          <Text style={[styles.action, { color: theme.primary }]}>Elegir</Text>
        </Pressable>
        {optional && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar fecha límite"
            disabled={!editable}
            onPress={() => onChange('')}
            style={styles.clear}
          >
            <Text style={[styles.action, { color: theme.secondary }]}>Quitar</Text>
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={[styles.helper, { color: theme.secondary }]}>{hint}</Text> : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.helper, { color: theme.danger }]}
        >
          {error}
        </Text>
      ) : null}
      {open ? (
        <Host matchContents>
          <DatePickerDialog
            initialDate={initialDate.toISOString()}
            {...(maximum ? { selectableDates: { end: maximum } } : {})}
            confirmButtonLabel="Aceptar"
            dismissButtonLabel="Cancelar"
            color={theme.primary}
            onDateSelected={(date) => {
              onChange(dateValue(date));
              setOpen(false);
            }}
            onDismissRequest={() => setOpen(false)}
          />
        </Host>
      ) : null}
    </View>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  error = '',
  hint = '',
  editable = true,
}: TimeFieldProps): ReactElement {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hourText, minuteText] = value.split(':');
  const initialDate = new Date();
  initialDate.setHours(Number(hourText ?? 0), Number(minuteText ?? 0), 0, 0);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        accessibilityState={{ disabled: !editable }}
        disabled={!editable}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.value,
          {
            backgroundColor: theme.raised,
            borderColor: error ? theme.danger : pressed ? theme.primary : theme.border,
            opacity: editable ? 1 : 0.55,
            transform: [{ scale: pressed && !reducedMotion ? 0.99 : 1 }],
          },
        ]}
      >
        <Text style={[styles.valueText, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.action, { color: theme.primary }]}>Elegir hora</Text>
      </Pressable>
      {hint ? <Text style={[styles.helper, { color: theme.secondary }]}>{hint}</Text> : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.helper, { color: theme.danger }]}
        >
          {error}
        </Text>
      ) : null}
      {open ? (
        <Host matchContents>
          <TimePickerDialog
            initialDate={initialDate.toISOString()}
            is24Hour
            confirmButtonLabel="Aceptar"
            dismissButtonLabel="Cancelar"
            color={theme.primary}
            onDateSelected={(date) => {
              onChange(
                `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
              );
              setOpen(false);
            }}
            onDismissRequest={() => setOpen(false)}
          />
        </Host>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: typography.semibold, fontSize: 16, lineHeight: 24 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: {
    minHeight: 52,
    flex: 1,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  valueText: { flex: 1, fontFamily: typography.semibold, fontSize: 16, lineHeight: 24 },
  action: { fontFamily: typography.bold, fontSize: 15, lineHeight: 22 },
  clear: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  helper: { fontFamily: typography.regular, fontSize: 14, lineHeight: 20 },
});
