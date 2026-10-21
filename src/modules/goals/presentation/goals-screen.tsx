import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { createBusinessDate } from '../../../shared/domain/business-date';
import { parseMoney, sumMoney, type Money } from '../../../shared/domain/money';
import { Amount, usePrivacy } from '../../../shared/ui/amount';
import { Button } from '../../../shared/ui/button';
import { IconButton } from '../../../shared/ui/icon-button';
import { DateField } from '../../../shared/ui/date-field';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { Progress } from '../../../shared/ui/progress';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import type { AttachmentPicker } from '../../attachments';
import type { GoalEntry, GoalImage, GoalImageService, GoalRepository } from '../index';
import { GoalFundingCard } from './goal-funding';

interface GoalsScreenProps {
  readonly repository: GoalRepository;
  readonly images: GoalImageService;
  readonly picker: AttachmentPicker;
  readonly onActivity: (id: string) => void;
}
interface FormErrors {
  readonly name?: string;
  readonly target?: string;
  readonly deadline?: string;
  readonly general?: string;
}
export function GoalsScreen({
  repository,
  images,
  picker,
  onActivity,
}: GoalsScreenProps): ReactElement {
  const theme = useTheme();
  const { hidden, toggle } = usePrivacy();
  const [editing, setEditing] = useState<GoalEntry | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentImage, setCurrentImage] = useState<GoalImage | null>(null);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [removeImageOnSave, setRemoveImageOnSave] = useState(false);
  const [savedGoalId, setSavedGoalId] = useState<string | null>(null);
  const [id, setId] = useState(randomUUID);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const read = useCallback(() => repository.overview(), [repository]);
  const { state, reload } = useFocusResource(read, 'goals');
  function clear(): void {
    setFormVisible(false);
    setCurrentImage(null);
    setPendingImageUri(null);
    setRemoveImageOnSave(false);
    setSavedGoalId(null);
    setEditing(null);
    setName('');
    setTarget('');
    setDeadline('');
    setErrors({});
  }
  async function save(): Promise<void> {
    if (lock.current) return;
    if (!name.trim() || name.trim().length > 60) {
      setErrors({ name: 'Escribe un nombre de entre 1 y 60 caracteres.' });
      return;
    }
    let amount: Money;
    try {
      amount = parseMoney(target);
      if (amount.amountMinor <= 0) throw new Error('Positive target required');
    } catch {
      setErrors({ target: 'Ingresa un objetivo positivo en pesos enteros.' });
      return;
    }
    const date = deadline.trim() || null;
    try {
      if (date !== null) createBusinessDate(date);
    } catch {
      setErrors({ deadline: 'Usa una fecha válida con formato AAAA-MM-DD o deja el campo vacío.' });
      return;
    }
    lock.current = true;
    setSaving(true);
    setErrors({});
    let goalPersisted = false;
    try {
      const changes = { name, target: amount, deadline: date };
      const goalId = editing?.id ?? id;
      if (editing || savedGoalId === goalId) await repository.update(goalId, changes);
      else {
        await repository.save({ ...changes, id: goalId, createdAt: new Date().toISOString() });
        setSavedGoalId(goalId);
      }
      goalPersisted = true;
      if (removeImageOnSave) await images.remove(goalId);
      if (pendingImageUri) {
        const image = await images.replace(goalId, pendingImageUri);
        setCurrentImage(image);
        setPendingImageUri(null);
      }
      notifications.success(editing ? 'Meta actualizada' : 'Meta guardada');
      clear();
      setId(randomUUID());
      reload();
    } catch {
      if (goalPersisted) {
        reload();
        setErrors({
          general:
            'La meta quedó guardada, pero no pudimos actualizar su foto. Puedes quitarla o elegir otra y volver a intentar.',
        });
      } else {
        setErrors({
          general: 'No pudimos guardar la meta. Tus datos siguen en el formulario para reintentar.',
        });
      }
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }
  async function choosePhoto(origin: 'camera' | 'gallery'): Promise<void> {
    try {
      const source = await picker.select(origin);
      if (source) {
        setPendingImageUri(source.uri);
        setRemoveImageOnSave(false);
        setErrors({});
      }
    } catch (error: unknown) {
      setErrors({ general: error instanceof Error ? error.message : 'No pudimos abrir la foto.' });
    }
  }
  function removePhoto(): void {
    setPendingImageUri(null);
    setCurrentImage(null);
    setRemoveImageOnSave(true);
  }
  const editor = (
    <View style={screenStyles.section}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        {editing ? 'Editar meta' : 'Crear una meta'}
      </Text>
      <Field
        label="Nombre de la meta"
        value={name}
        onChangeText={setName}
        placeholder="Por ejemplo, Fondo de emergencia"
        maxLength={60}
        editable={!saving}
        error={errors.name ?? ''}
      />
      <Field
        label="Objetivo en pesos chilenos"
        value={target}
        onChangeText={setTarget}
        placeholder="Por ejemplo, 100000"
        maxLength={24}
        keyboardType="numeric"
        editable={!saving}
        error={errors.target ?? ''}
      />
      <DateField
        label="Fecha objetivo (opcional)"
        value={deadline}
        onChange={setDeadline}
        optional
        editable={!saving}
        error={errors.deadline ?? ''}
        hint="También puedes dejarla sin fecha. Al vencer no se retiran aportes."
      />
      <View style={styles.photoSection}>
        <Text style={[screenStyles.caption, { color: theme.secondary }]}>
          Foto de la meta (opcional)
        </Text>
        {pendingImageUri || (currentImage && !removeImageOnSave) ? (
          <Image
            source={{ uri: pendingImageUri ?? images.uri(currentImage?.id ?? '') }}
            resizeMode="cover"
            accessibilityLabel="Foto seleccionada para la meta"
            style={styles.photoPreview}
          />
        ) : (
          <Text style={[screenStyles.caption, { color: theme.secondary }]}>
            Elige una imagen de hasta 10 MB. Se guarda en este dispositivo.
          </Text>
        )}
        <View style={styles.photoActions}>
          <Button
            label="Elegir foto"
            variant="secondary"
            disabled={saving}
            onPress={() => {
              void choosePhoto('gallery');
            }}
          />
          <Button
            label="Tomar foto"
            variant="secondary"
            disabled={saving}
            onPress={() => {
              void choosePhoto('camera');
            }}
          />
        </View>
        {pendingImageUri || (currentImage && !removeImageOnSave) ? (
          <Button label="Quitar foto" variant="secondary" disabled={saving} onPress={removePhoto} />
        ) : null}
      </View>
      {editing ? (
        <Text style={[screenStyles.body, { color: theme.secondary }]}>
          Cambiar el objetivo conserva todos los aportes. Si queda por debajo de lo asignado, se
          mostrará el exceso.
        </Text>
      ) : null}
      {errors.general ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {errors.general}
        </Text>
      ) : null}
      <Button
        label={saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Guardar meta'}
        disabled={saving}
        onPress={() => {
          void save();
        }}
      />
      <Button label="Cancelar" variant="secondary" disabled={saving} onPress={clear} />
    </View>
  );
  let totalGoalTarget: Money | null = null;
  if (state.status === 'ready') {
    try {
      totalGoalTarget = sumMoney(state.data.goals.map((goal) => goal.target));
    } catch {
      // Individual goals remain usable if their combined target exceeds the safe amount range.
    }
  }
  return (
    <View style={styles.page}>
      <Screen title="Tus metas">
        <Button
          label={hidden ? 'Mostrar montos' : 'Ocultar montos'}
          variant="secondary"
          onPress={toggle}
        />
        {state.status !== 'ready' ? (
          <ResourceFeedback status={state.status} retry={reload} />
        ) : (
          <>
            <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>Total de metas</Text>
              {totalGoalTarget ? (
                <Amount value={totalGoalTarget} large />
              ) : (
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>—</Text>
              )}
              <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                Progreso promedio:{' '}
                {state.data.goals.length
                  ? Math.round(
                      state.data.goals.reduce((sum, goal) => sum + goal.percentage, 0) /
                        state.data.goals.length,
                    )
                  : 0}
                %
              </Text>
              {!hidden ? (
                <Progress
                  label="Progreso promedio de tus metas"
                  percentage={
                    state.data.goals.length
                      ? Math.round(
                          state.data.goals.reduce((sum, goal) => sum + goal.percentage, 0) /
                            state.data.goals.length,
                        )
                      : 0
                  }
                />
              ) : null}
            </View>
            <GoalFundingCard funding={state.data.funding} />
            {state.data.goals.length === 0 ? (
              <Text style={[screenStyles.body, { color: theme.secondary }]}>
                Crea tu primera meta y asigna una parte de tu saldo cuando estés listo.
              </Text>
            ) : null}
            {state.data.goals.map((goal) => (
              <View key={goal.id} style={[screenStyles.card, { backgroundColor: theme.surface }]}>
                {goal.image ? (
                  <Image
                    source={{ uri: images.uri(goal.image.id) }}
                    resizeMode="cover"
                    accessibilityLabel={`Foto de la meta ${goal.name}`}
                    style={styles.goalImage}
                  />
                ) : null}
                <Text
                  accessibilityRole="header"
                  style={[screenStyles.heading, { color: theme.text }]}
                >
                  {goal.name}
                </Text>
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                  {goal.complete ? 'Objetivo alcanzado en asignaciones' : 'En progreso'}
                  {goal.deadline ? ` · Fecha objetivo: ${goal.deadline}` : ''}
                </Text>
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>Objetivo</Text>
                <Amount value={goal.target} />
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>Asignado</Text>
                <Amount value={goal.assigned} />
                {!hidden ? (
                  <Progress label={`Progreso de ${goal.name}`} percentage={goal.percentage} />
                ) : null}
                <Text style={[screenStyles.caption, { color: theme.secondary }]}>
                  {goal.excess.amountMinor > 0
                    ? 'Asignado por encima del objetivo'
                    : 'Falta asignar'}
                </Text>
                <Amount value={goal.excess.amountMinor > 0 ? goal.excess : goal.remaining} />
                <Button
                  label={`Editar: ${goal.name}`}
                  variant="secondary"
                  disabled={saving}
                  onPress={() => {
                    clear();
                    setEditing(goal);
                    setCurrentImage(goal.image);
                    setRemoveImageOnSave(false);
                    setName(goal.name);
                    setTarget(String(goal.target.amountMinor));
                    setDeadline(goal.deadline ?? '');
                    setFormVisible(true);
                  }}
                />
                <Button
                  label={`Aportes y retiros: ${goal.name}`}
                  disabled={saving || editing !== null}
                  onPress={() => onActivity(goal.id)}
                />
              </View>
            ))}
          </>
        )}
      </Screen>
      {state.status === 'ready' ? (
        <IconButton
          icon="add"
          label="Crear meta"
          onPress={() => {
            setEditing(null);
            setName('');
            setTarget('');
            setDeadline('');
            setErrors({});
            setCurrentImage(null);
            setPendingImageUri(null);
            setRemoveImageOnSave(false);
            setSavedGoalId(null);
            setId(randomUUID());
            setFormVisible(true);
          }}
          primary
          size={56}
          style={styles.floatingAdd}
        />
      ) : null}
      <Modal
        visible={formVisible}
        transparent
        animationType="slide"
        onRequestClose={clear}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>{editor}</View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  floatingAdd: { position: 'absolute', right: 22, bottom: 24, elevation: 5 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(25,16,10,0.48)',
    padding: 20,
  },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { borderRadius: 24, padding: 20 },
  photoSection: { gap: 10 },
  photoPreview: { width: '100%', height: 170, borderRadius: 18, backgroundColor: '#F3DCCB' },
  goalImage: {
    width: '100%',
    height: 150,
    borderRadius: 18,
    backgroundColor: '#F3DCCB',
    marginBottom: 8,
  },
  photoActions: { flexDirection: 'row', gap: 10 },
});
