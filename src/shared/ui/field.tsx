import { useId, type ReactElement } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { typography, useTheme } from './theme';

interface FieldProps extends TextInputProps {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
}
export function Field({ label, error = '', hint = '', style, ...props }: FieldProps): ReactElement {
  const theme = useTheme();
  const id = useId();
  return (
    <View style={styles.field}>
      <Text nativeID={id} style={[styles.label, { color: theme.text }]}>
        {label}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        accessibilityLabelledBy={id}
        placeholderTextColor={theme.secondary}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.raised,
            borderColor: error ? theme.danger : theme.border,
          },
          style,
        ]}
      />
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
    padding: 16,
    fontFamily: typography.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  hint: { fontFamily: typography.regular, fontSize: 14, lineHeight: 20 },
});
