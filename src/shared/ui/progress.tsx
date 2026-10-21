import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from './theme';

interface ProgressProps {
  readonly label: string;
  readonly percentage: number;
  readonly exceeded?: boolean;
}

export function Progress({ label, percentage, exceeded = false }: ProgressProps): ReactElement {
  const theme = useTheme();
  const value = Math.max(0, Math.min(100, Math.floor(percentage)));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value} %` }}
      style={[styles.track, { backgroundColor: theme.border }]}
    >
      <View
        style={[
          styles.fill,
          { width: `${value}%`, backgroundColor: exceeded ? theme.danger : theme.primary },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 8, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 8 },
});
