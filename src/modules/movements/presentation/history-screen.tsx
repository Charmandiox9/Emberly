import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AccountRepository } from '../../accounts';
import { businessDateAt } from '../../../shared/domain/business-date';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup, type ChoiceOption } from '../../../shared/ui/choice-group';
import { MonthPicker } from '../../../shared/ui/month-picker';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { typography, useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type {
  FinanceRepository,
  MovementCursor,
  MovementQuery,
} from '../application/finance-repository';
import type { MovementKind } from '../domain/movement';
import { MovementRow } from './movement-row';

type KindFilter = MovementKind | 'all';
const kinds: readonly ChoiceOption<KindFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'income', label: 'Ingresos' },
  { value: 'expense', label: 'Gastos' },
];
export interface HistoryScreenProps {
  readonly repository: FinanceRepository;
  readonly accounts: AccountRepository;
  readonly onAdd: () => void;
  readonly onEdit: (id: string) => void;
}

export function HistoryScreen({
  repository,
  accounts,
  onAdd,
  onEdit,
}: HistoryScreenProps): ReactElement {
  const theme = useTheme();
  const [month, setMonth] = useState(() =>
    businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7),
  );
  const [kind, setKind] = useState<KindFilter>('all');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cursors, setCursors] = useState<readonly MovementCursor[]>([]);
  const cursor = cursors.at(-1);
  const query = useMemo(
    (): MovementQuery => ({
      month,
      ...(kind === 'all' ? {} : { kind }),
      ...(accountId ? { accountId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    [month, kind, accountId, categoryId, cursor],
  );
  const read = useCallback(async () => {
    const [page, accountOptions, categories] = await Promise.all([
      repository.list(query),
      accounts.list(),
      repository.categories(),
    ]);
    return { page, accountOptions, categories };
  }, [repository, accounts, query]);
  const { state, reload } = useFocusResource(read, JSON.stringify(query));
  if (state.status !== 'ready')
    return (
      <Screen title="Movimientos">
        <ResourceFeedback status={state.status} retry={reload} />
      </Screen>
    );
  const { page, accountOptions, categories } = state.data;
  const header = (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        Movimientos
      </Text>
      <MonthPicker
        value={month}
        onChange={(value) => {
          setMonth(value);
          setCursors([]);
        }}
      />
      <Button label="Agregar movimiento" onPress={onAdd} disabled={accountOptions.length === 0} />
      <ChoiceGroup<KindFilter>
        label="Tipo"
        options={kinds}
        value={kind}
        onChange={(value) => {
          setKind(value);
          setCategoryId('');
          setCursors([]);
        }}
      />
      <ChoiceGroup
        label="Cuenta"
        options={[
          { value: '', label: 'Todas' },
          ...accountOptions.map((account) => ({ value: account.id, label: account.name })),
        ]}
        value={accountId}
        onChange={(value) => {
          setAccountId(value);
          setCursors([]);
        }}
      />
      <ChoiceGroup
        label="Categoría"
        options={[
          { value: '', label: 'Todas' },
          ...categories
            .filter((category) => kind === 'all' || category.kind === kind)
            .map((category) => ({ value: category.id, label: category.name })),
        ]}
        value={categoryId}
        onChange={(value) => {
          setCategoryId(value);
          setCursors([]);
        }}
      />
    </View>
  );
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.page, { backgroundColor: theme.background }]}
    >
      <FlatList
        data={page.entries}
        keyExtractor={(movement) => movement.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ItemSeparatorComponent={RowGap}
        renderItem={({ item }) => <MovementRow movement={item} onPress={() => onEdit(item.id)} />}
        ListEmptyComponent={
          <Text style={[screenStyles.body, { color: theme.secondary }]}>
            No hay movimientos con estos filtros.
          </Text>
        }
        ListFooterComponent={
          <View style={screenStyles.section}>
            {cursors.length > 0 ? (
              <Button
                label="Página anterior"
                variant="secondary"
                onPress={() => setCursors((previous) => previous.slice(0, -1))}
              />
            ) : null}
            {page.nextCursor ? (
              <Button
                label="Página siguiente"
                variant="secondary"
                onPress={() => {
                  const next = page.nextCursor;
                  if (next) setCursors((previous) => [...previous, next]);
                }}
              />
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}
function RowGap(): ReactElement {
  return <View style={styles.gap} />;
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  gap: { height: 12 },
  title: { fontFamily: typography.extraBold, fontSize: 28, lineHeight: 36 },
});
