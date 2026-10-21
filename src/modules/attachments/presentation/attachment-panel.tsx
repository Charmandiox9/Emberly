import { useState, type ReactElement } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../shared/ui/button';
import { screenStyles } from '../../../shared/ui/screen';
import { useTheme } from '../../../shared/ui/theme';
import {
  attachmentCountLimit,
  type Attachment,
  type AttachmentOrigin,
  type AttachmentSource,
} from '../domain/attachment';

export interface AttachmentPanelProps {
  readonly attachments: readonly Attachment[];
  readonly selected: readonly AttachmentSource[];
  readonly busy: boolean;
  readonly uri: (id: string) => string;
  readonly onSelect: (origin: AttachmentOrigin) => void;
  readonly onDiscard: (uri: string) => void;
  readonly onRemove: (attachment: Attachment) => void;
  readonly onRetry: (attachment: Attachment) => void;
  readonly onShare: (attachment: Attachment) => void;
}

interface PreviewProps {
  readonly uri: string;
  readonly name: string;
}
function Preview({ uri, name }: PreviewProps): ReactElement {
  const [failed, setFailed] = useState(false);
  const theme = useTheme();
  return failed ? (
    <Text style={[screenStyles.body, { color: theme.secondary }]}>
      No se puede mostrar la imagen. Puedes intentar compartirla o volver a seleccionarla.
    </Text>
  ) : (
    <Image
      source={{ uri }}
      accessibilityLabel={`Comprobante: ${name}`}
      style={styles.preview}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
}

export function AttachmentPanel(props: AttachmentPanelProps): ReactElement {
  const theme = useTheme();
  const full = props.attachments.length + props.selected.length >= attachmentCountLimit;
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[screenStyles.heading, { color: theme.text }]}>
        Comprobantes
      </Text>
      <Text style={[screenStyles.body, { color: theme.secondary }]}>
        Opcional. Hasta cinco archivos PDF, JPEG, PNG o WebP de 10 MB cada uno. Se guardan en este
        teléfono; la subida a la nube aún no está disponible.
      </Text>
      <Button
        variant="secondary"
        label="Elegir documento"
        disabled={props.busy || full}
        onPress={() => props.onSelect('document')}
      />
      <Button
        variant="secondary"
        label="Tomar foto"
        disabled={props.busy || full}
        onPress={() => props.onSelect('camera')}
      />
      <Button
        variant="secondary"
        label="Elegir de la galería"
        disabled={props.busy || full}
        onPress={() => props.onSelect('gallery')}
      />
      {full ? (
        <Text style={[screenStyles.body, { color: theme.secondary }]}>
          Alcanzaste el límite de cinco comprobantes.
        </Text>
      ) : null}
      {props.selected.map((source) => (
        <View key={source.uri} style={[styles.item, { borderColor: theme.border }]}>
          <Text style={[screenStyles.body, { color: theme.text }]}>{source.name}</Text>
          <Text style={[screenStyles.body, { color: theme.secondary }]}>
            Seleccionado. Se copiará al guardar el movimiento.
          </Text>
          <Button
            variant="secondary"
            label={`Quitar selección: ${source.name}`}
            disabled={props.busy}
            onPress={() => props.onDiscard(source.uri)}
          />
        </View>
      ))}
      {props.attachments.map((attachment) => (
        <View key={attachment.id} style={[styles.item, { borderColor: theme.border }]}>
          <Text style={[screenStyles.body, { color: theme.text }]}>{attachment.name}</Text>
          <Text
            style={[
              screenStyles.body,
              { color: attachment.state === 'failed' ? theme.danger : theme.secondary },
            ]}
          >
            {attachment.state === 'ready'
              ? `Guardado en el teléfono · ${Math.ceil((attachment.file?.sizeBytes ?? 0) / 1024)} KB`
              : attachment.state === 'failed'
                ? 'No se pudo completar la copia. Reintenta o quítalo y vuelve a seleccionarlo.'
                : 'Copia pendiente de completar.'}
          </Text>
          {attachment.state === 'ready' && attachment.file?.mimeType.startsWith('image/') ? (
            <Preview uri={props.uri(attachment.id)} name={attachment.name} />
          ) : null}
          {attachment.state === 'ready' ? (
            <Button
              variant="secondary"
              label={`Compartir: ${attachment.name}`}
              disabled={props.busy}
              onPress={() => props.onShare(attachment)}
            />
          ) : (
            <Button
              variant="secondary"
              label={`Reintentar copia: ${attachment.name}`}
              disabled={props.busy}
              onPress={() => props.onRetry(attachment)}
            />
          )}
          <Button
            variant="secondary"
            label={`Quitar comprobante: ${attachment.name}`}
            disabled={props.busy}
            onPress={() => props.onRemove(attachment)}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  item: { gap: 12, padding: 16, borderWidth: 1, borderRadius: 20 },
  preview: { width: '100%', height: 200 },
});
