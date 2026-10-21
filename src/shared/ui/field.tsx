import { useId, useState, type ReactElement } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { typography, useTheme } from './theme';

interface FieldProps extends TextInputProps {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
}
export function Field({ label, error = '', hint = '', style, ...props }: FieldProps): ReactElement {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const id = useId();
  const { onFocus, onBlur, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text nativeID={id} style={[styles.label, { color: theme.text }]}>
        {label}
      </Text>
      <Animated.View
        style={[
          styles.input,
          !reducedMotion && styles.inputTransition,
          {
            backgroundColor: theme.raised,
            borderColor: error ? theme.danger : focused ? theme.primary : theme.border,
            opacity: inputProps.editable === false ? 0.55 : 1,
          },
        ]}
      >
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          accessibilityLabelledBy={id}
          accessibilityHint={inputProps.accessibilityHint ?? (hint || undefined)}
          selectionColor={theme.primary}
          placeholderTextColor={theme.secondary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.textInput, { color: theme.text }, style]}
        />
      </Animated.View>
      {hint ? <Text style={[styles.hint, { color: theme.secondary }]}>{hint}</Text> : null}
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[styles.hint, { color: theme.danger }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: typography.semibold, fontSize: 16, lineHeight: 24 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  inputTransition: {
    transitionProperty: 'borderColor',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-out',
  },
  textInput: {
    minHeight: 52,
    padding: 16,
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  hint: { fontFamily: typography.regular, fontSize: 14, lineHeight: 20 },
});
