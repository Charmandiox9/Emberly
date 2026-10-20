import type { ReactElement } from 'react';
import { Pressable, Text } from 'react-native';
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
        screenStyles.card,
        { backgroundColor: theme.surface, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[screenStyles.heading, { color: theme.text }]}>{movement.description}</Text>
      <Text style={[screenStyles.caption, { color: theme.secondary }]}>
        {movement.kind === 'income' ? 'Ingreso' : 'Gasto'} · {movement.categoryName} ·{' '}
        {movement.accountName}
      </Text>
      <Amount value={movement.amount} prefix={movement.kind === 'income' ? '+' : '−'} />
      <Text style={[screenStyles.caption, { color: theme.secondary }]}>{movement.date}</Text>
    </Pressable>
  );
}
