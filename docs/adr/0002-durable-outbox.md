# ADR 0002: cola local transaccional antes de integrar servicios

Fecha: 20 de octubre de 2026. Estado: aceptada para el almacenamiento local; protocolo remoto pendiente.

## Contexto

La aplicación debe seguir registrando información si su backend es inaccesible. Los repositorios actuales ya agrupan escrituras y validación financiera en transacciones SQLite. Añadir la cola después de confirmar un movimiento crearía una ventana de pérdida de cambios ante un cierre o fallo.

## Decisión

La migración 3 crea `sync_entities` y `sync_outbox`. Triggers SQLite sobre cuentas, categorías y movimientos generan el snapshot del cambio y avanzan su revisión local dentro de la misma escritura. Una eliminación conserva una marca en `sync_entities` y una operación con el ID eliminado, aunque desaparezca la fila financiera.

Cada operación conserva un identificador aleatorio de 128 bits, una secuencia local y un snapshot JSON de formato 1. Los snapshots son independientes de futuras ediciones. Los reintentos futuros deberán utilizar el mismo identificador; todavía no existe envío ni confirmación remota. Las revisiones locales no son versiones asignadas por el servidor y no se usan como reloj global.

La migración prepara snapshots de datos anteriores, primero cuentas/categorías y después movimientos. Repetir las migraciones no los vuelve a generar. Las categorías iniciales también quedan pendientes para conservar las dependencias del futuro protocolo. Los cambios sin diferencias de valores no generan revisiones adicionales; los identificadores no se pueden modificar.

El módulo `sync` expone consultas tipadas por lotes de hasta 100 operaciones y su contador. No expone vaciado, confirmación ni envío mientras no exista un backend que pueda reconocer operaciones de forma segura.

## Consecuencias y límites

- La integridad de la cola se aplica también a escrituras SQL realizadas fuera de un repositorio. Sus fallos revierten el cambio de origen; los fallos de validación financiera revierten también la cola.
- Los triggers forman parte de la migración versionada. Cambiar columnas rastreadas o el formato exige una nueva migración; no editar la definición histórica.
- Mantener `INSERT`, `UPDATE` y `DELETE` explícitos. No utilizar `INSERT OR REPLACE` ni políticas que ignoren fallos en estas tablas: podrían eludir la semántica del seguimiento.
- Antes de aplicar descargas remotas o restauraciones, implementar un flujo transaccional que evite reencolar esos cambios como nuevas ediciones locales. Todavía no hay una vía de importación remota.
- Solo existe el perfil local actual; no hay atribución de datos a un usuario Firebase. La vinculación explícita y el aislamiento entre perfiles requieren migraciones y pruebas antes del primer envío.
- La cola retiene cada snapshot, sin compactar ni descartar pendientes. Ocupa espacio adicional y puede incluir conceptos o montos históricos eliminados de la vista financiera. No registrarla en logs. Antes de la beta deben definirse retención, borrado de perfil y aviso de falta de espacio; una futura confirmación remota permitirá purgar operaciones reconocidas.
- Versiones remotas, cursores de descarga, resolución de conflictos y tareas de red siguen pendientes. Transferencias y adjuntos locales se incorporaron en las extensiones descritas abajo. No presentar la cola como sincronización completa.
- Se requieren funciones JSON de SQLite. Las pruebas Node validan el SQL real; falta verificar migración y reinicio con el motor Expo en Android físico.

Se prefirieron triggers a añadir llamadas de cola en cada caso de uso porque centralizan la atomicidad de las escrituras existentes. A cambio, requieren revisar el SQL de cada migración y probar también las escrituras directas y sus fallos.

## Extensión con esquema 4

Los [comprobantes locales](../attachments.md) ya tienen preparación persistente y eventos propios de archivos. El coordinador de movimiento comparte la transacción SQLite entre el repositorio financiero y las preparaciones, sin abrir conexiones ni confirmar transacciones anidadas. La copia ocurre después y sus fallos no revierten el movimiento confirmado. La incorporación de esas operaciones al protocolo remoto sigue pendiente; `SyncQueue` continúa describiendo únicamente operaciones financieras y categorías.

## Extensión con esquema 5

La migración 5 extiende la cola consultada a transferencias, con un evento indivisible por creación/anulación y un orden común mediante `sync_order`. Las cuentas archivadas mantienen sus saldos y referencias. Las [reglas de cuentas y transferencias](../finance-operations.md) detallan compatibilidad de snapshots previos y la validación pendiente en Android.

## Extensión con esquema 6

La [gestión de categorías](../categories.md) incorpora archivo/reactivación y snapshots con `archived` en el mismo orden global. El tipo permanece fijo; las correcciones históricas pueden conservar su categoría archivada. La migración no reescribe eventos previos: el futuro consumidor remoto deberá asumir activas las categorías cuyo snapshot no incluya ese campo.

## Extensión con esquema 7

Los [presupuestos](../budgets.md) incorporan una cola con revisiones conservadas después del borrado y tombstones. Sus eventos se incluyen en la consulta financiera y el mismo orden global. Solo se encola el límite y su identidad; gastado/disponible/exceso se derivan de movimientos. Los consumidores locales de la cola requieren la base migrada al esquema actual.

## Extensión con esquema 8

Las [metas y asignaciones](../goals.md) encolan entidades `goal` y `goal_allocation`. El saldo asignado por meta es derivado: un trigger lo actualiza junto al historial inmutable; no se publica como una edición independiente de la meta. Aportes y retiros conservan identidad para reintentos idempotentes. El disponible y faltante global se consultan desde los saldos reales y asignaciones, sin encolar cálculos que puedan quedar obsoletos.

## Fuentes de la decisión inicial

- [Triggers SQLite](https://www.sqlite.org/lang_createtrigger.html).
- [Funciones JSON SQLite](https://www.sqlite.org/json1.html).
