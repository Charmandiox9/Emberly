# Respaldo local

Desde **Inicio → Ajustes → Respaldo local** puedes exportar las tablas SQLite y las copias privadas de comprobantes a un archivo JSON versionado (`emberly-respaldo-AAAA-MM-DD.json`), o restaurar un archivo compatible. Android abre el selector para guardar/compartir y para elegir el respaldo.

La exportación lee todas las tablas dentro de una transacción SQLite e incluye sus relaciones, configuración local y colas de sincronización. Cada comprobante marcado como listo se verifica con su SHA-256 antes de codificarse en base64. Si falta un archivo o hay una preparación incompleta, la exportación se cancela y no anuncia un respaldo parcial.

El archivo contiene información financiera, notas, preferencias y comprobantes sin cifrar. Guárdalo en un lugar privado y elimina las copias compartidas que ya no necesites. El tamaño puede llegar a decenas de megabytes si hay muchos comprobantes. La caché temporal usada para compartir puede eliminarse por Android después del uso; conserva el archivo que hayas guardado fuera de Emberly.

La versión 1 incluye `format`, `version`, `schemaVersion`, `exportedAt`, `tables` y `attachmentFiles`. La restauración solo acepta la misma versión de esquema instalada. Valida las tablas, columnas, valores SQLite y SHA-256 de los archivos antes de reemplazar los datos. Reemplaza el perfil local completo, incluidas las colas pendientes; no combina datos ni sincroniza el contenido restaurado automáticamente.

Antes de restaurar, la app crea y comparte un respaldo de seguridad. Guarda ese archivo fuera de Emberly y confirma la sustitución en el segundo aviso. La base se reemplaza en una transacción; los comprobantes se preparan y verifican primero. El registro persistente se escribe a un archivo temporal y se mueve antes de cambiar archivos, para que un cierre durante su escritura no deje un manifiesto parcial. Permite completar o revertir la operación si la app se cierra durante el reemplazo. El archivo importado puede medir hasta 200 MiB y Android debe tener espacio libre para conservar temporalmente ambos juegos de comprobantes.

No se requiere `.env`, EAS ni conexión a internet. Estas funciones se ejecutan localmente y usan los diálogos de Android. La validación en un teléfono físico sigue pendiente.
