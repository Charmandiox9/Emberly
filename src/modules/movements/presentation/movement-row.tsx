import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Amount } from '../../../shared/ui/amount';
import { screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import type { MovementEntry } from '../application/finance-repository';

interface MovementRowProps {
  readonly movement: MovementEntry;
  readonly onPress: () => void;
}
export function MovementRow({ movement, onPress }: MovementRowProps): ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Editar ${movement.description}, ${movement.date}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View
        style={[
          styles.marker,
          { backgroundColor: movement.kind === 'income' ? theme.primary : theme.border },
        ]}
      />
      <View style={styles.details}>
        <Text numberOfLines={1} style={[screenStyles.body, { color: theme.text }]}>
          {movement.description}
        </Text>
        <Text numberOfLines={1} style={[screenStyles.caption, { color: theme.secondary }]}>
          {movement.categoryName} · {movement.date}
        </Text>
      </View>
      <Amount value={movement.amount} prefix={movement.kind === 'income' ? '+' : '−'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marker: { width: 4, height: 38, borderRadius: 2 },
  details: { flex: 1, gap: 2 },
});
