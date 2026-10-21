import { useState, type ReactElement } from 'react';
import { Alert, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import type { LocalBackupService } from '../application/backup-service';
import { Button } from '../../../shared/ui/button';
import { notifications } from '../../../shared/ui/notifications';
import { screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';

interface BackupSectionProps {
  readonly service: LocalBackupService;
}

export function BackupSection({ service }: BackupSectionProps): ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function confirmExport(): void {
    Alert.alert(
      'Crear respaldo',
      'El archivo incluirá tus datos financieros, la cola de sincronización y los comprobantes. Se exporta sin cifrar: guárdalo en un lugar privado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: () => {
            setBusy(true);
            setError('');
            void service
              .export()
              .then(() => notifications.success('Respaldo listo para guardar'))
              .catch(() =>
                setError(
                  'No se pudo crear el respaldo. Tus datos siguen en Emberly; revisa tus comprobantes e inténtalo de nuevo.',
                ),
              )
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  }

  async function chooseBackup(): Promise<void> {
    setError('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) throw new Error('No se seleccionó un archivo.');
      Alert.alert(
        'Reemplazar datos locales',
        'Primero se creará un respaldo de seguridad. Después podrás confirmar la restauración, que reemplazará tus datos y comprobantes actuales.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Crear respaldo',
            onPress: () => {
              setBusy(true);
              void service
                .export()
                .then(() => {
                  Alert.alert(
                    'Respaldo de seguridad creado',
                    'Guárdalo en un lugar seguro antes de continuar.',
                    [
                      { text: 'Cancelar', style: 'cancel', onPress: () => setBusy(false) },
                      {
                        text: 'Reemplazar datos',
                        style: 'destructive',
                        onPress: () => {
                          void service
                            .restore(asset.uri)
                            .then(() => {
                              notifications.success('Respaldo restaurado');
                              router.replace('/(tabs)');
                            })
                            .catch(() =>
                              setError(
                                'No se pudo restaurar el respaldo. Emberly revirtió los cambios locales; revisa el archivo e inténtalo de nuevo.',
                              ),
                            )
                            .finally(() => setBusy(false));
                        },
                      },
                    ],
                  );
                })
                .catch(() => {
                  setError(
                    'No se pudo crear el respaldo de seguridad; no se modificaron tus datos.',
                  );
                  setBusy(false);
                });
            },
          },
        ],
      );
    } catch {
      setError('No se pudo abrir el selector de respaldos.');
    }
  }

  return (
    <View style={[screenStyles.card, { backgroundColor: theme.surface }]}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        Respaldo local
      </Text>
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        Exporta un JSON que incluye cuentas, movimientos, metas, presupuestos, preferencias,
        operaciones pendientes y comprobantes. También puedes restaurar un respaldo compatible; la
        restauración reemplaza tus datos actuales. Los archivos contienen datos personales sin
        cifrar.
      </Text>
      <Button
        label={busy ? 'Preparando respaldo…' : 'Exportar respaldo'}
        disabled={busy}
        onPress={confirmExport}
      />
      <Button label="Restaurar respaldo" disabled={busy} onPress={() => void chooseBackup()} />
      {error ? (
        <Text accessibilityRole="alert" style={[screenStyles.body, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
