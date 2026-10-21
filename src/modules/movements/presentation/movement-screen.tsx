import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Alert, Text } from 'react-native';
import type { ManagedAccount, AccountRepository } from '../../accounts';
import type { ManagedCategory, CategoryRepository } from '../../categories';
import { businessDateAt } from '../../../shared/domain/business-date';
import { Button } from '../../../shared/ui/button';
import { ChoiceGroup, type ChoiceOption } from '../../../shared/ui/choice-group';
import { Field } from '../../../shared/ui/field';
import { notifications } from '../../../shared/ui/notifications';
import { ResourceFeedback } from '../../../shared/ui/resource-feedback';
import { Screen, screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import { useFocusResource } from '../../../shared/ui/use-focus-resource';
import { saveMovementWithProofs } from '../../../application/save-movement-with-proofs';
import {
  validateMovementDraft,
  type MovementDraft,
  type MovementErrors,
} from '../application/movement-draft';
import type { FinanceRepository, MovementEntry } from '../application/finance-repository';
import type { MovementKind } from '../domain/movement';
import type {
  Attachment,
  AttachmentService,
  AttachmentPicker,
  AttachmentOrigin,
  AttachmentSource,
} from '../../attachments';
import { AttachmentPanel } from '../../attachments/presentation';
import { attachmentErrorMessage } from '../../attachments';
import type { MovementCommitter } from '../../../application/movement-committer';

export interface MovementScreenProps {
  readonly repository: FinanceRepository;
  readonly accounts: AccountRepository;
  readonly categories: CategoryRepository;
  readonly attachments: AttachmentService;
  readonly attachmentPicker: AttachmentPicker;
  readonly committer: MovementCommitter;
  readonly id: string | undefined;
  readonly onDone: () => void;
  readonly onAccounts: () => void;
  readonly onCategories: () => void;
}
interface FormData {
  readonly accounts: readonly ManagedAccount[];
  readonly categories: readonly ManagedCategory[];
  readonly existing: MovementEntry | null;
  readonly attachments: readonly Attachment[];
}
interface MovementFormProps {
  readonly data: FormData;
  readonly repository: FinanceRepository;
  readonly attachments: AttachmentService;
  readonly attachmentPicker: AttachmentPicker;
  readonly committer: MovementCommitter;
  readonly onDone: () => void;
  readonly onCategories: () => void;
}
const kinds: readonly ChoiceOption<MovementKind>[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
];

export function MovementScreen({
  repository,
  accounts,
  categories: categoryRepository,
  attachments,
  attachmentPicker,
  committer,
  id,
  onDone,
  onAccounts,
  onCategories,
}: MovementScreenProps): ReactElement {
  const theme = useTheme();
  const read = useCallback(async (): Promise<FormData> => {
    const [options, categories, existing, proofs] = await Promise.all([
      accounts.listManaged(),
      categoryRepository.list(),
      id ? repository.get(id) : Promise.resolve(null),
      id ? attachments.list(id) : Promise.resolve([]),
    ]);
    if (id && !existing) throw new Error('El movimiento no existe.');
    return {
      accounts: options.filter(
        (account) => !account.archived || account.id === existing?.accountId,
      ),
      categories: categories.filter(
        (category) => !category.archived || category.id === existing?.categoryId,
      ),
      existing,
      attachments: proofs,
    };
  }, [repository, accounts, categoryRepository, attachments, id]);
  const { state, reload } = useFocusResource(read, id ?? 'new');
  return (
    <Screen title={id ? 'Editar movimiento' : 'Registrar movimiento'}>
      {state.status !== 'ready' ? (
        <ResourceFeedback status={state.status} retry={reload} />
      ) : state.data.accounts.length === 0 ? (
        <>
          <Text style={[screenStyles.body, { color: theme.secondary }]}>
            Necesitas una cuenta activa para registrar movimientos. Puedes crear una o reactivar una
            cuenta archivada.
          </Text>
          <Button label="Crear una cuenta" onPress={onAccounts} />
        </>
      ) : (
        <MovementForm
          key={id ?? 'new'}
          data={state.data}
          repository={repository}
          attachments={attachments}
          attachmentPicker={attachmentPicker}
          committer={committer}
          onDone={onDone}
          onCategories={onCategories}
        />
      )}
    </Screen>
  );
}

function MovementForm({
  data,
  repository,
  attachments,
  attachmentPicker,
  committer,
  onDone,
  onCategories,
}: MovementFormProps): ReactElement {
  const theme = useTheme();
  const [id] = useState(() => data.existing?.id ?? randomUUID());
  const [draft, setDraft] = useState<MovementDraft>(() => ({
    accountId: data.existing?.accountId ?? data.accounts[0]?.id ?? '',
    categoryId:
      data.existing?.categoryId ??
      data.categories.find((category) => category.kind === 'expense')?.id ??
      '',
    kind: data.existing?.kind ?? 'expense',
    amount: data.existing ? String(data.existing.amount.amountMinor) : '',
    description: data.existing?.description ?? '',
    date: data.existing?.date ?? businessDateAt(new Date(), 'America/Santiago').value,
  }));
  const [errors, setErrors] = useState<MovementErrors>({});
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [persisted, setPersisted] = useState(data.existing !== null);
  const [proofs, setProofs] = useState(data.attachments);
  const [selected, setSelected] = useState<readonly AttachmentSource[]>([]);

  async function save(): Promise<void> {
    if (lock.current) return;
    const today = businessDateAt(new Date(), 'America/Santiago').value;
    const result = validateMovementDraft(draft, {
      id,
      createdAt: data.existing?.createdAt ?? new Date().toISOString(),
      today,
    });
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    lock.current = true;
    setSaving(true);
    setErrors({});
    try {
      const saved = await saveMovementWithProofs(committer, attachments, {
        movement: result.movement,
        today,
        updating: persisted,
        selected,
      });
      setPersisted(true);
      setSelected([]);
      if (saved.proofStatus !== 'unavailable') setProofs(saved.attachments);
      if (saved.proofStatus === 'incomplete') {
        setErrors({
          general:
            'El movimiento quedó guardado. Algunos comprobantes no se copiaron; reintenta abajo o vuelve a seleccionarlos. Puedes salir y revisarlos después.',
        });
        return;
      }
      if (saved.proofStatus === 'unavailable') {
        setErrors({
          general:
            'El movimiento quedó guardado, pero no pudimos consultar sus comprobantes. Abre de nuevo el movimiento para revisarlos.',
        });
        return;
      }
    } catch {
      setErrors({
        general:
          'No pudimos guardar. Revisa la cuenta, la categoría y el monto. Tus datos siguen aquí para reintentar.',
      });
      return;
    } finally {
      lock.current = false;
      setSaving(false);
    }
    notifications.success(data.existing ? 'Movimiento actualizado' : 'Movimiento guardado');
    onDone();
  }

  async function attachmentAction(work: () => Promise<void>): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      await work();
      setProofs(await attachments.list(id));
      setErrors({});
    } catch (error: unknown) {
      setErrors({
        general: `${attachmentErrorMessage(error)} ${persisted ? 'El movimiento guardado se conserva.' : 'Tus datos siguen en el formulario.'}`,
      });
      try {
        setProofs(await attachments.list(id));
      } catch {
        /* Preserve the last list; the error remains visible. */
      }
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  function selectProof(origin: AttachmentOrigin): void {
    void attachmentAction(async () => {
      const source = await attachmentPicker.select(origin);
      if (source)
        setSelected((current) =>
          current.some((entry) => entry.uri === source.uri) ? current : [...current, source],
        );
    });
  }

  function removeProof(attachment: Attachment): void {
    Alert.alert(
      'Quitar comprobante',
      'Se eliminará la copia guardada en Emberly. El movimiento conservará su monto y sus datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => {
            void attachmentAction(() => attachments.remove(attachment.id));
          },
        },
      ],
    );
  }

  async function remove(): Promise<void> {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      await repository.remove(id);
    } catch {
      setErrors({
        general: 'No pudimos eliminar el movimiento. Reintenta para verificar su estado.',
      });
      return;
    } finally {
      lock.current = false;
      setSaving(false);
    }
    notifications.success('Movimiento eliminado');
    // Financial deletion is already durable; file cleanup can be retried on startup.
    try {
      await attachments.recover();
    } catch {
      /* The durable cleanup job is retained. */
    }
    onDone();
  }

  function confirmDelete(): void {
    Alert.alert(
      'Eliminar movimiento',
      'Se eliminará este registro y se recalculará el saldo de la cuenta. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void remove();
          },
        },
      ],
    );
  }

  return (
    <>
      <ChoiceGroup<MovementKind>
        label="Tipo de movimiento"
        value={draft.kind}
        options={kinds}
        disabled={saving}
        onChange={(kind) =>
          setDraft((current) => ({
            ...current,
            kind,
            categoryId: data.categories.find((category) => category.kind === kind)?.id ?? '',
          }))
        }
      />
      <Field
        label="Monto en pesos chilenos"
        placeholder="Por ejemplo, 25.000"
        value={draft.amount}
        onChangeText={(amount) => setDraft((current) => ({ ...current, amount }))}
        keyboardType="numbers-and-punctuation"
        maxLength={24}
        editable={!saving}
        error={errors.amount ?? ''}
        hint="Usa un monto positivo, sin decimales."
      />
      <Field
        label="Concepto"
        placeholder="Por ejemplo, Almuerzo"
        value={draft.description}
        onChangeText={(description) => setDraft((current) => ({ ...current, description }))}
        maxLength={120}
        editable={!saving}
        error={errors.description ?? ''}
      />
      <ChoiceGroup
        label="Cuenta"
        options={data.accounts.map((account) => ({
          value: account.id,
          label: account.name + (account.archived ? ' (archivada)' : ''),
        }))}
        value={draft.accountId}
        disabled={saving}
        onChange={(accountId) => setDraft((current) => ({ ...current, accountId }))}
      />
      {errors.accountId ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {errors.accountId}
        </Text>
      ) : null}
      <ChoiceGroup
        label="Categoría"
        options={data.categories
          .filter((category) => category.kind === draft.kind)
          .map((category) => ({
            value: category.id,
            label: category.name + (category.archived ? ' (archivada)' : ''),
          }))}
        value={draft.categoryId}
        disabled={saving}
        onChange={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
      />
      {errors.categoryId ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {errors.categoryId}
        </Text>
      ) : null}
      {!data.categories.some((category) => category.kind === draft.kind) ? (
        <>
          <Text style={[screenStyles.body, { color: theme.secondary }]}>
            No hay categorías activas de este tipo. Crea una o reactiva alguna antes de guardar.
          </Text>
          <Button
            label="Administrar categorías"
            variant="secondary"
            disabled={saving}
            onPress={onCategories}
          />
        </>
      ) : null}
      <Field
        label="Fecha"
        hint="AAAA-MM-DD. Puedes registrar movimientos de días anteriores."
        placeholder="2026-10-20"
        value={draft.date}
        onChangeText={(date) => setDraft((current) => ({ ...current, date }))}
        maxLength={10}
        autoCapitalize="none"
        editable={!saving}
        error={errors.date ?? ''}
      />
      <AttachmentPanel
        attachments={proofs}
        selected={selected}
        busy={saving}
        uri={(attachmentId) => attachments.uri(attachmentId)}
        onSelect={selectProof}
        onDiscard={(uri) => setSelected((current) => current.filter((entry) => entry.uri !== uri))}
        onRemove={removeProof}
        onRetry={(attachment) => {
          void attachmentAction(() => attachments.retry(attachment));
        }}
        onShare={(attachment) => {
          void attachmentAction(() => attachments.share(attachment));
        }}
      />
      {errors.general ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[screenStyles.body, { color: theme.danger }]}
        >
          {errors.general}
        </Text>
      ) : null}
      <Button
        label={saving ? 'Procesando…' : persisted ? 'Guardar cambios' : 'Guardar movimiento'}
        disabled={saving}
        onPress={() => {
          void save();
        }}
      />
      <Button label="Cancelar" variant="secondary" disabled={saving} onPress={onDone} />
      {persisted ? (
        <Button
          label="Eliminar movimiento"
          variant="secondary"
          disabled={saving}
          onPress={confirmDelete}
        />
      ) : null}
    </>
  );
}
