import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { typography, useTheme } from './theme';

export interface ButtonProps {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onPress: () => void;
}

export function Button({ label, disabled = false, onPress }: ButtonProps): ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.primary, opacity: disabled ? 0.55 : pressed ? 0.8 : 1 },
      ]}
    >
      <Text style={[styles.label, { color: theme.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: typography.bold, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
