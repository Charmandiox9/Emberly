import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert, Text, View } from 'react-native';
import type { MovementKind } from '../../movements';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup, type ChoiceOption } from '../../../shared/ui/choice-group';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import { categoryName, type CategoryRepository, type ManagedCategory } from '../index';

interface CategoriesScreenProps {
  readonly repository: CategoryRepository;
}
const kinds: readonly ChoiceOption<MovementKind>[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
];

export function CategoriesScreen({ repository }: CategoriesScreenProps): ReactElement {
  const theme = useTheme();
  const [kind, setKind] = useState<MovementKind>('expense');
  const [editing, setEditing] = useState<ManagedCategory | null>(null);
  const [name, setName] = useState('');
  const [id, setId] = useState(randomUUID);
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const read = useCallback(() => repository.list(), [repository]);
  const { state, reload } = useFocusResource(read, 'categories');

  function clear(): void {
    setEditing(null);
    setName('');
    setNameError('');
    setError('');
  }

  async function save(): Promise<void> {
    if (lock.current) return;
    let validName: string;
    try {
      validName = categoryName(name);
    } catch {
      setNameError('Escribe un nombre de entre 1 y 60 caracteres.');
      return;
    }
    lock.current = true;
    setSaving(true);
    setNameError('');
    setError('');
    try {
      if (editing) await repository.rename(editing.id, validName);
      else await repository.save({ id, name: validName, kind });
      notifications.success(editing ? 'Categoría actualizada' : 'Categoría guardada');
      clear();
      setId(randomUUID());
      reload();
    } catch {
      setError('No pudimos guardar. El nombre sigue en el formulario para reintentar.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  async function changeArchive(category: ManagedCategory): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError('');
    try {
      await repository.setArchived(category.id, !category.archived);
      notifications.success(category.archived ? 'Categoría reactivada' : 'Categoría archivada');
      reload();
    } catch {
      setError('No pudimos cambiar el estado. Reintenta.');
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  function confirmArchive(category: ManagedCategory): void {
    if (category.archived) {
      void changeArchive(category);
      return;
    }
    Alert.alert(
      'Archivar categoría',
      'Conservará los movimientos y sus totales. No podrás usarla en registros nuevos hasta reactivarla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          onPress: () => {
            void changeArchive(category);
          },
        },
      ],
    );
  }

  const editor = (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        {editing ? 'Cambiar nombre' : 'Agregar categoría'}
      </Text>
      <Field
        label="Nombre de la categoría"
        placeholder={
          kind === 'expense' ? 'Por ejemplo, Mascotas' : 'Por ejemplo, Trabajo independiente'
        }
        value={name}
        onChangeText={setName}
        maxLength={60}
        editable={!saving}
        error={nameError}
        hint={
          editing
            ? 'El nombre también cambiará en el historial y los resúmenes.'
            : `Se creará como categoría de ${kind === 'expense' ? 'gasto' : 'ingreso'}.`
        }
      />
      <Button
        label={saving ? 'Guardando…' : editing ? 'Guardar nombre' : 'Guardar categoría'}
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
    <Screen title="Tus categorías">
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        Organiza tus ingresos y gastos. Archivar conserva el historial; el tipo de una categoría
        permanece fijo.
      </Text>
      {error ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[screenStyles.body, { color: theme.danger }]}
        >
          {error}
        </Text>
      ) : null}
      <ChoiceGroup
        label="Categorías de"
        options={kinds}
        value={kind}
        disabled={saving || editing !== null}
        onChange={setKind}
      />
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : (
        <>
          {!editing ? editor : null}
          <View style={screenStyles.section}>
            <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
              {kind === 'expense' ? 'Gastos' : 'Ingresos'}
            </Text>
            {!state.data.some((category) => category.kind === kind && !category.archived) ? (
              <Text style={[screenStyles.body, { color: theme.secondary }]}>
                No hay categorías activas de este tipo. Agrega una o reactiva alguna de las
                archivadas.
              </Text>
            ) : null}
            {state.data
              .filter((category) => category.kind === kind)
              .map((category) => (
                <View
                  key={category.id}
                  style={[screenStyles.card, { backgroundColor: theme.surface }]}
                >
                  <Text style={[screenStyles.heading, { color: theme.text }]}>{category.name}</Text>
                  <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                    {category.archived ? 'Archivada' : 'Activa'}
                  </Text>
                  {editing?.id === category.id ? (
                    editor
                  ) : (
                    <Button
                      label={`Cambiar nombre: ${category.name}`}
                      variant="secondary"
                      disabled={saving || editing !== null}
                      onPress={() => {
                        setEditing(category);
                        setName(category.name);
                        setNameError('');
                        setError('');
                      }}
                    />
                  )}
                  <Button
                    label={`${category.archived ? 'Reactivar' : 'Archivar'}: ${category.name}`}
                    variant="secondary"
                    disabled={saving || editing !== null}
                    onPress={() => confirmArchive(category)}
                  />
                </View>
              ))}
          </View>
        </>
      )}
    </Screen>
  );
}
