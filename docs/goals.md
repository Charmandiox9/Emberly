# Metas y asignaciones de ahorro

La pestaña **Metas** permite crear y editar una meta con nombre, objetivo positivo en CLP, fecha opcional y una foto JPEG, PNG o WebP de hasta 10 MiB elegida desde la galería o cámara. La imagen se copia al almacenamiento privado y persiste localmente; el respaldo JSON incluye la foto y verifica su SHA-256. El nombre admite de 1 a 60 caracteres. Una fecha histórica es válida para conservar metas anteriores; vencer no elimina aportes ni aplica penalizaciones.

## Asignar dinero existente

Un aporte asigna una parte del saldo actual a una meta. No mueve dinero entre cuentas ni registra ingresos o gastos. Retirar una asignación libera ese dinero dentro de la planificación; tampoco altera el saldo financiero.

Las asignaciones son globales para el perfil local: no están vinculadas a una cuenta ni a un movimiento individual. El cálculo usa el saldo neto de todas las cuentas, incluidas deudas y cuentas archivadas. Las transferencias entre cuentas no duplican dinero.

- **Saldo actual:** el saldo neto real de todas las cuentas.
- **Asignado:** suma de las asignaciones vigentes entre metas.
- **Respaldo:** máximo entre saldo actual y cero. Un saldo negativo no respalda asignaciones.
- **Disponible para aportar:** máximo entre respaldo menos asignado y cero.
- **Faltante de respaldo:** máximo entre asignado menos respaldo y cero. Si el saldo es negativo, este faltante representa las asignaciones sin respaldo; la deuda se muestra por separado dentro del saldo actual.

Estas definiciones mantienen cada importe dentro del rango de enteros seguros, incluso si el saldo pasa del máximo positivo al mínimo negativo después de asignar fondos.

## Aportes, retiros y cambios posteriores

En **Aportes y retiros**, un aporte positivo no puede superar el disponible global ni lo que falta para el objetivo. Un retiro positivo no puede superar lo asignado a esa meta. La validación se repite dentro de una transacción SQLite, evitando que dos metas consuman el mismo dinero a partir de una lectura anterior.

Un gasto, una eliminación de ingreso o una corrección del saldo inicial pueden reducir el respaldo después de asignar dinero. Se conserva el movimiento real y se muestra el faltante al volver a Metas. No se cancelan aportes automáticamente: puedes retirar asignaciones o recuperar saldo. Durante un faltante se bloquean nuevos aportes, pero se permiten retiros.

Cambiar nombre, objetivo o fecha conserva auditoría e historial. Reducir el objetivo por debajo de lo asignado muestra el exceso; no devuelve dinero automáticamente. La meta aparece alcanzada en asignaciones cuando lo asignado es igual o mayor al objetivo. Un retiro o aumento del objetivo puede dejarla nuevamente en progreso. Ese estado no garantiza respaldo: hay que revisar también el resumen global.

El historial de aportes/retiros se pagina por instante UTC e identificador, con 30 filas por defecto y un máximo de 100. Se presenta en `America/Santiago`. Los registros permanecen inmutables; las correcciones se registran como una nueva operación en sentido contrario y respetan los límites vigentes. No se exponen eliminación ni archivo de metas en este incremento.

La privacidad oculta montos y barras. Conserva nombres, fechas y estados. Los campos de edición permiten ver y corregir el objetivo o importe ingresado.

## Persistencia, auditoría y cola

La migración SQLite 8 añade metas, asignaciones, saldo asignado derivado y cola. Cada nueva asignación actualiza mediante trigger el saldo derivado de su meta, en la misma operación que su historial. Las metas comienzan sin asignaciones; las restricciones SQL impiden superar el objetivo mediante aportes o retirar por encima de lo asignado.

El repositorio comprueba además el disponible de todo el perfil en una transacción exclusiva. El saldo derivado no tiene una operación pública de escritura: se modifica al insertar aportes/retiros. Crear/editar metas y registrar asignaciones producen eventos atómicos; un fallo revierte registro, saldo derivado y revisión.

Los eventos `goal` contienen `id`, `name`, `target_minor`, `deadline` y `created_at`; una fecha opcional vacía se serializa como `''`. Los eventos `goal_allocation` contienen `id`, `goal_id`, `kind`, `amount_minor` y `created_at`. Son CLP, la única moneda del perfil actual. Se ordenan mediante `sync_order` junto al resto de eventos financieros. El futuro servidor deberá reconstruir y validar asignaciones dentro del perfil autenticado; todavía no hay sincronización remota.

Reintentar exactamente el mismo identificador de asignación y sus datos devuelve éxito sin aplicar ni encolar otro efecto, incluso después de reiniciar o de cambios posteriores de saldo. Reutilizarlo para otra intención falla. El formulario genera identificador y auditoría al primer intento de guardar y los conserva mientras se reintenta un guardado fallido; abrir la pantalla no fija la fecha del próximo aporte.

No se necesitan dependencias ni variables de entorno nuevas.

## Verificación y recorrido físico pendiente

Las pruebas de dominio e integración con SQLite real en Node cubren asignación/retiro, disponible entre varias metas, reintentos, faltante tras gastos/correcciones, objetivos reducidos, estados completados, fechas, enteros extremos, auditoría, fallo de cola, paginación, migración desde esquema 7 y reapertura.

En Android físico, con datos de prueba:

1. Crear una cuenta con `10.000`, una meta «Emergencia» con objetivo `10.000` y otra «Viaje» con el mismo objetivo.
2. Aportar `6.000` a Emergencia: asignado `6.000`, disponible `4.000`, saldo de cuentas sin cambios. Intentar aportar `6.000` a Viaje debe fallar.
3. Registrar un gasto real de `8.000`: saldo `2.000`, asignado `6.000`, disponible cero, faltante `4.000` al volver a Metas.
4. Retirar `4.000` de Emergencia: asignado `2.000`, faltante cero, saldo de cuentas `2.000`. No debe aparecer un ingreso.
5. Reducir el objetivo a `1.000`: aparece exceso asignado de `1.000` y estado alcanzado. Retirar `1.500`: asignado `500`, falta `500`, estado en progreso.
6. Corregir/eliminar el gasto y comprobar que se actualice el disponible. Transferir o archivar cuentas debe conservar el total.
7. Guardar con doble pulsación, cerrar/reabrir en modo avión y comprobar aportes, auditoría y saldos. Revisar historial extenso, ambos temas, TalkBack, texto ampliado, teclado y ocultación de montos.
