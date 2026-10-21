import { AttachmentError } from '../domain/attachment';
import { getDocumentAsync } from 'expo-document-picker';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';
import type { AttachmentPicker } from '../application/ports';
import type { AttachmentOrigin, AttachmentSource } from '../domain/attachment';

export class ExpoAttachmentPicker implements AttachmentPicker {
  async select(origin: AttachmentOrigin): Promise<AttachmentSource | null> {
    if (origin === 'document') {
      const result = await getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      const file = result.assets?.[0];
      return result.canceled || !file ? null : { uri: file.uri, name: file.name };
    }
    if (origin === 'camera') {
      const permission = await requestCameraPermissionsAsync();
      if (!permission.granted)
        throw new AttachmentError(
          'Para tomar una foto, permite usar la cámara en los ajustes del teléfono. También puedes elegir un archivo o una foto existente.',
        );
    }
    const options = {
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    } satisfies Parameters<typeof launchCameraAsync>[0];
    // Android's system photo picker doesn't require broad gallery permissions.
    const result =
      origin === 'camera'
        ? await launchCameraAsync(options)
        : await launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    return result.canceled || !asset
      ? null
      : { uri: asset.uri, name: asset.fileName ?? 'Foto del comprobante.jpg' };
  }
}
