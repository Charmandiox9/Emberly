import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { typography, useTheme } from './theme';

export interface ChoiceOption<T extends string> {
  readonly value: T;
  readonly label: string;
}
interface ChoiceGroupProps<T extends string> {
  readonly label: string;
  readonly options: readonly ChoiceOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
}
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: ChoiceGroupProps<T>): ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === option.value, disabled }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: value === option.value ? theme.primary : theme.surface,
                borderColor: value === option.value ? theme.primary : theme.border,
                opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: value === option.value ? theme.onPrimary : theme.text },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  group: { gap: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  label: { fontFamily: typography.semibold, fontSize: 14, lineHeight: 20 },
});
