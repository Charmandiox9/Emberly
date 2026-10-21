# Respaldo local

Desde **Inicio → Ajustes → Respaldo local** puedes exportar las tablas SQLite, las copias privadas de comprobantes y las fotos de metas a un archivo JSON versionado (`emberly-respaldo-AAAA-MM-DD.json`), o restaurar un archivo compatible. Android abre el selector para guardar/compartir y para elegir el respaldo.

La exportación lee todas las tablas dentro de una transacción SQLite e incluye sus relaciones, configuración local y colas de sincronización. Cada comprobante y foto de meta se verifica con su SHA-256 antes de codificarse en base64. Si falta un archivo o hay una preparación incompleta, la exportación se cancela y no anuncia un respaldo parcial.

El archivo contiene información financiera, notas, preferencias y comprobantes sin cifrar. Guárdalo en un lugar privado y elimina las copias compartidas que ya no necesites. El tamaño puede llegar a decenas de megabytes si hay muchos comprobantes. La caché temporal usada para compartir puede eliminarse por Android después del uso; conserva el archivo que hayas guardado fuera de Emberly.

La versión 1 incluye `format`, `version`, `schemaVersion`, `exportedAt`, `tables` y `attachmentFiles`. Acepta los esquemas 9, 10 y 11: el 10 se migra con una lista de fotos de metas vacía; en el 9 también se inicializan las tablas de progreso de Ember a partir de las metas existentes y sin fotos. Valida las tablas, columnas, valores SQLite y SHA-256 de los archivos antes de reemplazar los datos. Reemplaza el perfil local completo, incluidas las colas pendientes; no combina datos ni sincroniza el contenido restaurado automáticamente.

Antes de restaurar, la app crea y comparte un respaldo de seguridad. Guarda ese archivo fuera de Emberly y confirma la sustitución en el segundo aviso. La base se reemplaza en una transacción; los comprobantes se preparan y verifican primero. El registro persistente se escribe a un archivo temporal y se mueve antes de cambiar archivos, para que un cierre durante su escritura no deje un manifiesto parcial. Permite completar o revertir la operación si la app se cierra durante el reemplazo. El archivo importado puede medir hasta 200 MiB y Android debe tener espacio libre para conservar temporalmente ambos juegos de comprobantes.

No se requiere `.env`, EAS ni conexión a internet. Estas funciones se ejecutan localmente y usan los diálogos de Android. La validación en un teléfono físico sigue pendiente.

Las pruebas de integración con SQLite real cubren exportación/restauración de cuentas, comprobantes y fotos de metas, compatibilidad del esquema previo, rechazo de JSON corrupto/versiones incompatibles y rollback ante restricciones. No simulan cierres abruptos del proceso ni sustituyen la prueba de los diálogos y archivos en Android.
