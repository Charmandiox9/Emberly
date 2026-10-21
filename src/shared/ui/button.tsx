import { useState, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { typography, useTheme } from './theme';

export interface ButtonProps {
  readonly label: string;
  readonly disabled?: boolean;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary';
}

export function Button({
  label,
  disabled = false,
  onPress,
  variant = 'primary',
}: ButtonProps): ReactElement {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variant === 'primary' ? theme.primary : theme.surface,
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          !reducedMotion && styles.labelTransition,
          { transform: [{ scale: pressed && !disabled && !reducedMotion ? 0.97 : 1 }] },
        ]}
      >
        <Text
          style={[styles.label, { color: variant === 'primary' ? theme.onPrimary : theme.text }]}
        >
          {label}
        </Text>
      </Animated.View>
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
  labelTransition: {
    transitionProperty: 'transform',
    transitionDuration: '120ms',
    transitionTimingFunction: 'ease-out',
  },
  label: { fontFamily: typography.bold, fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
