import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { AppIcon } from '../../../shared/ui/icon-button';
import type {
  FinanceRepository,
  MovementCursor,
  MovementQuery,
} from '../application/finance-repository';
import type { MovementKind } from '../domain/movement';
import { MovementRow } from './movement-row';
import type { HistoryFilters } from '../application/history-filters';

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
  readonly onTransfers: () => void;
  readonly onCategories: () => void;
  readonly onEdit: (id: string) => void;
  readonly initialFilters?: HistoryFilters;
}

export function HistoryScreen({
  repository,
  accounts,
  onAdd,
  onTransfers,
  onCategories,
  onEdit,
  initialFilters,
}: HistoryScreenProps): ReactElement {
  const theme = useTheme();
  const [month, setMonth] = useState(
    () => initialFilters?.month ?? businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7),
  );
  const [kind, setKind] = useState<KindFilter>(initialFilters?.kind ?? 'all');
  const [accountId, setAccountId] = useState(initialFilters?.accountId ?? '');
  const [categoryId, setCategoryId] = useState(initialFilters?.categoryId ?? '');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
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
  const activeFilterCount =
    Number(kind !== 'all') + Number(Boolean(accountId)) + Number(Boolean(categoryId));
  const header = (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        Gastos y movimientos
      </Text>
      <MonthPicker
        value={month}
        onChange={(value) => {
          setMonth(value);
          setCursors([]);
        }}
      />
      <View style={styles.actionRow}>
        <QuickAction
          icon="add"
          label="Registrar"
          onPress={onAdd}
          disabled={accountOptions.length === 0}
        />
        <QuickAction icon="transfer" label="Transferir" onPress={onTransfers} />
        <QuickAction icon="category" label="Categorías" onPress={onCategories} />
      </View>
      <View style={styles.filterSection}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: filtersExpanded }}
          onPress={() => setFiltersExpanded((expanded) => !expanded)}
          style={({ pressed }) => [styles.filterToggle, { opacity: pressed ? 0.72 : 1 }]}
        >
          <Text style={[screenStyles.body, { color: theme.text }]}>Filtros</Text>
          {activeFilterCount > 0 ? (
            <Text style={[screenStyles.caption, { color: theme.primary }]}>
              {activeFilterCount} activos
            </Text>
          ) : null}
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            {filtersExpanded ? 'Ocultar' : 'Mostrar'}
          </Text>
        </Pressable>
        {filtersExpanded ? (
          <View style={styles.filters}>
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
        ) : null}
      </View>
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
interface QuickActionProps {
  readonly icon: 'add' | 'transfer' | 'category';
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}
function QuickAction({ icon, label, onPress, disabled = false }: QuickActionProps): ReactElement {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: theme.primary }]}>
        <AppIcon name={icon} color={theme.onPrimary} size={28} />
      </View>
      <Text numberOfLines={1} style={[styles.actionLabel, { color: theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  gap: { height: 12 },
  title: { fontFamily: typography.extraBold, fontSize: 28, lineHeight: 36 },
  actionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  actionButton: {
    flex: 1,
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  actionIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: typography.bold, fontSize: 13, lineHeight: 18 },
  filterSection: { gap: 10 },
  filterToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.035)',
  },
  filters: { gap: 14, paddingTop: 4 },
});
