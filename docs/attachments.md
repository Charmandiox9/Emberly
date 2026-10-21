# Comprobantes locales

## Uso

Al crear o editar un ingreso o gasto, la sección **Comprobantes** permite elegir un documento, tomar una foto o seleccionar una imagen de la galería. Se admiten PDF, JPEG, PNG y WebP, hasta cinco archivos de 10 MiB (10.485.760 bytes) cada uno. Otros formatos deben convertirse antes de adjuntarlos.

La selección se copia al pulsar **Guardar movimiento** o **Guardar cambios**. Antes de guardar es una selección temporal; cancelar o abandonar el formulario no la incorpora al movimiento. Los nombres visibles no se utilizan para construir rutas de archivos.

Los archivos guardados permanecen en el directorio privado de documentos de Emberly, no en la caché. Las imágenes tienen vista previa al volver a editar el movimiento; **Compartir** abre el selector Android de aplicaciones compatibles, también para PDF. No existe un visor PDF integrado.

**Quitar comprobante** solicita confirmación y elimina esa copia, sin cambiar el monto ni los datos del movimiento. Es una acción inmediata sobre un comprobante guardado, aunque después se cancele la edición del formulario. La app no elimina el original del usuario en la galería o en sus documentos.

## Guardado y recuperación

La migración SQLite 4 crea metadatos de comprobantes, eventos pendientes de archivos y tareas de limpieza. El coordinador de guardado registra el movimiento, su operación financiera de salida y todos los intentos de copia en una sola transacción SQLite. Si la preparación SQL falla, no se anuncia éxito ni queda un guardado parcial.

Después se copian los archivos de forma independiente. Fallos de copia, formato, espacio o confirmación del comprobante conservan el movimiento financiero ya confirmado. El formulario muestra el resultado parcial y permite reintentar o quitar el comprobante; guardar de nuevo actualiza ese movimiento y no crea otro.

Cada copia pasa por un archivo `.part`. Se comprueba el límite de tamaño, la cabecera de formato y una huella SHA-256 antes de moverla a su nombre definitivo. La cabecera identifica un formato admitido; no equivale a decodificar completamente la imagen o analizar el PDF. La base solo marca el comprobante como disponible después de confirmar su archivo final.

Al abrir la app:

- Si hay un archivo final válido pendiente de confirmación, se recuperan sus metadatos sin duplicar el evento de salida.
- Si solo existe una preparación o un archivo provisional, se muestra una copia fallida. El usuario puede reintentar mientras el archivo de origen siga disponible; si Android borró su copia temporal, debe quitar ese intento y seleccionar el original otra vez.
- Los borrados pendientes se reintentan. Un fallo al borrar físicamente un archivo conserva la tarea de limpieza.

Eliminar un movimiento elimina sus metadatos asociados y registra los borrados de comprobantes y sus tareas de limpieza en la misma transacción. La app intenta limpiar después; si falla o se cierra antes, vuelve a hacerlo en el siguiente inicio.

## Sincronización y privacidad

Los eventos de archivos se conservan en `attachment_outbox`, separados de `sync_outbox`. Solo se crea un evento de archivo disponible tras confirmar una copia válida; su contenido incluye ID, movimiento, nombre, tipo, tamaño y huella, sin rutas privadas ni URI temporal. Un borrado conserva su evento con identificador estable.

Todavía no hay subida a R2 ni confirmación de estos eventos por el servidor. Al implementar el protocolo, respetar el orden: sincronizar el movimiento, autorizar/subir el objeto privado y finalizar sus metadatos. Integrar ambas colas sin interpretar el contador financiero como el total de trabajos de archivos.

No se cifra específicamente el directorio de comprobantes ni SQLite en este incremento. Borrar los datos de la app o desinstalarla elimina las copias locales. Un respaldo futuro debe incluir los archivos y sus relaciones: JSON con rutas locales no es suficiente.

## Dependencias y permisos

Se incorporan los módulos oficiales compatibles con Expo SDK 57: FileSystem 57.0.7, DocumentPicker 57.0.3, ImagePicker 57.0.20 y Sharing 57.0.23. Las APIs de copia y movimiento de FileSystem son asíncronas en estas versiones y se esperan antes de continuar.

La cámara se solicita al pulsar **Tomar foto**. La galería utiliza el selector del sistema sin solicitar acceso amplio a toda la biblioteca; documentos usa el selector Android. Se bloquean los permisos de almacenamiento externo heredados y el permiso de micrófono. No se capturan vídeos ni audio.

La configuración nativa cambió: un cliente de desarrollo EAS existente debe volver a compilarse para incorporar módulos y permisos. Los commits siguen dependiendo de las verificaciones locales, no de un build nativo exitoso. No se requiere ninguna variable de entorno nueva.

## Validación

Las pruebas usan SQLite y archivos reales de Node para verificar coordinación, reinicio, migraciones, huellas, copias fallidas, límites, borrados y rollback. El adaptador de archivos Node es de pruebas; no certifica el puente nativo Expo, el selector, la cámara ni la entrega a otras aplicaciones.

Recorrido pendiente en Android físico:

1. Crear un movimiento con PDF e imagen, guardar y abrirlo desde el historial.
2. Comprobar la imagen y compartir ambos archivos con aplicaciones compatibles.
3. Reiniciar sin conexión y comprobar su disponibilidad; retirar el original después de guardarlo y repetir.
4. Denegar cámara y comprobar el mensaje y las alternativas; cancelar cada selector sin añadir filas.
5. Probar archivo vacío, tipo no admitido, archivo de más de 10 MiB, falta de espacio y un sexto comprobante.
6. Interrumpir el proceso durante la copia y revisar recuperación/reintento; repetir si el origen temporal desapareció.
7. Quitar un comprobante y eliminar un movimiento completo: comprobar saldos, copias y limpieza tras reiniciar.
8. Revisar ambos temas, TalkBack, nombres largos, fuentes grandes y teclado. Comprobar también Android con restricciones del fabricante o recreación de la actividad durante la cámara.

La selección no confirmada por Guardar no es un borrador persistente del formulario. La recuperación tras recreación de la actividad del selector antes del guardado queda pendiente de prueba y mejora específica; no anunciarla como garantizada.

## Referencias

- [FileSystem SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/).
- [DocumentPicker SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/).
- [ImagePicker SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/).
- [Sharing SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/).
