import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert, Text, View } from 'react-native';
import type { CategoryRepository } from '../../categories';
import { businessDateAt } from '../../../shared/domain/business-date';
import { parseMoney, type Money } from '../../../shared/domain/money';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup } from '../../../shared/ui/choice-group';
import { Field } from '../../../shared/ui/field';
import { MonthPicker } from '../../../shared/ui/month-picker';
import { notifications } from '../../../shared/ui/notifications';
import { Progress } from '../../../shared/ui/progress';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import { budgetLimit, type BudgetEntry, type BudgetRepository } from '../index';

interface BudgetsScreenProps {
  readonly repository: BudgetRepository;
  readonly categories: CategoryRepository;
  readonly onCategories: () => void;
}

export function BudgetsScreen({
  repository,
  categories,
  onCategories,
}: BudgetsScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [month, setMonth] = useState(() =>
    businessDateAt(new Date(), 'America/Santiago').value.slice(0, 7),
  );
  const [editing, setEditing] = useState<BudgetEntry | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [id, setId] = useState(randomUUID);
  const [limitError, setLimitError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const read = useCallback(async () => {
    const [budgets, options] = await Promise.all([repository.list(month), categories.list()]);
    return {
      budgets,
      options: options.filter(
        (category) =>
          category.kind === 'expense' &&
          !category.archived &&
          !budgets.some((budget) => budget.categoryId === category.id),
      ),
    };
  }, [repository, categories, month]);
  const { state, reload } = useFocusResource(read, month);

  function clear(): void {
    setEditing(null);
    setCategoryId('');
    setLimit('');
    setLimitError('');
    setCategoryError('');
    setError('');
  }

  async function save(): Promise<void> {
    if (lock.current || state.status !== 'ready') return;
    setLimitError('');
    setCategoryError('');
    setError('');
    let amount: Money;
    try {
      amount = budgetLimit(parseMoney(limit));
    } catch {
      setLimitError('Ingresa un límite positivo en pesos enteros, por ejemplo 50.000.');
      return;
    }
    if (!editing && !state.data.options.some((entry) => entry.id === categoryId)) {
      setCategoryError('Selecciona una categoría activa sin presupuesto para este mes.');
      return;
    }
    lock.current = true;
    setSaving(true);
    try {
      if (editing) await repository.updateLimit(editing.id, amount);
      else
        await repository.save({
          id,
          categoryId,
          month,
          limit: amount,
          createdAt: new Date().toISOString(),
        });
      notifications.success(editing ? 'Límite actualizado' : 'Presupuesto guardado');
      clear();
      setId(randomUUID());
      reload();
    } catch {
      setError(
        'No pudimos guardar. Comprueba si la categoría sigue activa y sin otro presupuesto este mes. Tus datos siguen en el formulario.',
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  async function remove(budget: BudgetEntry): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await repository.remove(budget.id);
      notifications.success('Presupuesto eliminado');
      reload();
    } catch {
      setError('No pudimos eliminar el presupuesto. Reintenta.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  function confirmRemove(budget: BudgetEntry): void {
    Alert.alert(
      'Eliminar presupuesto',
      'Se quitará el límite de esta categoría para el mes seleccionado. Los movimientos y saldos se conservan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void remove(budget);
          },
        },
      ],
    );
  }

  const editor = (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        {editing ? 'Editar límite' : 'Agregar presupuesto'}
      </Text>
      {!editing && state.status === 'ready' ? (
        <ChoiceGroup
          label="Categoría de gasto"
          options={state.data.options.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          value={categoryId}
          disabled={saving}
          onChange={setCategoryId}
        />
      ) : null}
      {categoryError ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {categoryError}
        </Text>
      ) : null}
      <Field
        label="Límite mensual en pesos chilenos"
        value={limit}
        onChangeText={setLimit}
        placeholder="Por ejemplo, 50000"
        keyboardType="numeric"
        maxLength={24}
        editable={!saving}
        error={limitError}
        hint="No reserva dinero ni cambia tu saldo. Puedes gastar por encima del límite y ver el exceso."
      />
      <Button
        label={saving ? 'Guardando…' : editing ? 'Guardar límite' : 'Guardar presupuesto'}
        disabled={saving}
        onPress={() => {
          void save();
        }}
      />
      {editing ? (
        <Button label="Cancelar edición" variant="secondary" disabled={saving} onPress={clear} />
      ) : null}
    </View>
  );

  return (
    <Screen title="Presupuestos del mes">
      <View
        pointerEvents={saving || editing ? 'none' : 'auto'}
        accessibilityElementsHidden={saving || editing !== null}
        importantForAccessibility={saving || editing ? 'no-hide-descendants' : 'auto'}
      >
        <MonthPicker
          value={month}
          onChange={(value) => {
            setMonth(value);
            clear();
          }}
        />
      </View>
      {editing ? (
        <Text style={[screenStyles.caption, { color: theme.secondary }]}>
          Editando el límite de {editing.month}. Termina o cancela para cambiar de mes.
        </Text>
      ) : null}
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        Cada categoría tiene un límite por mes. El gasto incluye todas tus cuentas; los límites no
        se trasladan automáticamente al mes siguiente.
      </Text>
      <Button
        label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
        variant="secondary"
        onPress={toggle}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[screenStyles.body, { color: theme.danger }]}
        >
          {error}
        </Text>
      ) : null}
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          {state.data.budgets.length === 0 ? (
            <Text style={[screenStyles.body, { color: theme.secondary }]}>
              Aún no hay límites para este mes. Puedes planificar aunque ya hayas registrado gastos.
            </Text>
          ) : null}
          {state.data.budgets.map((budget) => (
            <View key={budget.id} style={[screenStyles.card, { backgroundColor: theme.surface }]}>
              <Text
                accessibilityRole="header"
                style={[screenStyles.heading, { color: theme.text }]}
              >
                {budget.categoryName}
              </Text>
              {budget.categoryArchived ? (
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                  Categoría archivada · conserva sus gastos históricos
                </Text>
              ) : null}
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Límite mensual</Text>
              <Amount value={budget.limit} />
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Gastado</Text>
              <Amount value={budget.spent} />
              {!hidden ? (
                <Progress
                  label={`Límite utilizado en ${budget.categoryName}`}
                  percentage={budget.percentage}
                  exceeded={budget.status === 'exceeded'}
                />
              ) : null}
              <Text
                style={[
                  screenStyles.body,
                  { color: budget.status === 'exceeded' ? theme.danger : theme.text },
                ]}
              >
                {budget.status === 'exceeded'
                  ? 'Exceso sobre el límite'
                  : budget.status === 'reached'
                    ? 'Límite alcanzado · disponible'
                    : 'Disponible del presupuesto'}
              </Text>
              <Amount value={budget.status === 'exceeded' ? budget.excess : budget.remaining} />
              {editing?.id === budget.id ? (
                editor
              ) : (
                <Button
                  label={`Editar límite: ${budget.categoryName}`}
                  variant="secondary"
                  disabled={saving || editing !== null}
                  onPress={() => {
                    clear();
                    setEditing(budget);
                    setLimit(String(budget.limit.amountMinor));
                  }}
                />
              )}
              <Button
                label={`Eliminar presupuesto: ${budget.categoryName}`}
                variant="secondary"
                disabled={saving || editing !== null}
                onPress={() => confirmRemove(budget)}
              />
            </View>
          ))}
          {!editing ? (
            state.data.options.length > 0 ? (
              editor
            ) : (
              <View style={screenStyles.section}>
                <Text style={[screenStyles.body, { color: theme.secondary }]}>
                  No quedan categorías de gasto activas sin presupuesto en este mes. Puedes crear o
                  reactivar una categoría.
                </Text>
                <Button
                  label="Administrar categorías"
                  variant="secondary"
                  disabled={saving}
                  onPress={onCategories}
                />
              </View>
            )
          ) : null}
        </>
      )}
    </Screen>
  );
}
