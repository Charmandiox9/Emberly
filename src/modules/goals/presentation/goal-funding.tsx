import type { ReactElement } from 'react';
import { Text, View } from 'react-native';
import { Amount } from '../../../shared/ui/amount';
import { screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import type { GoalFunding } from '../index';

interface GoalFundingProps {
  readonly funding: GoalFunding;
}
export function GoalFundingCard({ funding }: GoalFundingProps): ReactElement {
  const theme = useTheme();
  return (
    <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
      <Text style={[screenStyles.caption, { color: theme.secondary }]}>
        Saldo actual de todas tus cuentas
      </Text>
      <Amount value={funding.balance} />
      <Text style={[screenStyles.caption, { color: theme.secondary }]}>
        Asignado entre tus metas
      </Text>
      <Amount value={funding.assigned} />
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        Disponible para aportar
      </Text>
      <Amount value={funding.available} large />
      {funding.shortfall.amountMinor > 0 ? (
        <>
          <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
            Falta respaldo para tus metas
          </Text>
          <Amount value={funding.shortfall} />
          <Text style={[screenStyles.body, { color: theme.secondary }]}>
            Tu saldo bajó después de asignar dinero. Retira asignaciones o recupera saldo para
            ajustar tus metas. Los movimientos reales se conservan.
          </Text>
        </>
      ) : null}
      <Text style={[screenStyles.caption, { color: theme.secondary }]}>
        Los aportes organizan el dinero existente; no crean ingresos ni gastos. Un saldo negativo no
        respalda asignaciones.
      </Text>
    </View>
  );
}
