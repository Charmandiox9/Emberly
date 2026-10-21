# Presupuestos mensuales

Desde **Inicio → Planificar presupuestos** puedes elegir un mes y fijar un límite en pesos chilenos para cada categoría de gasto activa. Se permite un presupuesto por categoría y mes. El límite es un entero positivo; no reserva dinero, no crea gastos y no bloquea el registro de gastos que lo superen.

## Disponible y exceso

El gastado se calcula desde los movimientos de esa categoría dentro del mes seleccionado, incluyendo todas las cuentas, también las archivadas. Usa sus fechas de negocio, no sus instantes UTC de creación. Excluye ingresos, transferencias y saldos iniciales.

- **Disponible:** límite menos gastado, con mínimo cero.
- **Límite alcanzado:** el gastado coincide con el límite; disponible cero.
- **Exceso:** gastado menos límite cuando se supera. Se muestra su importe aunque la barra llegue al 100 %.

Los importes son enteros seguros; los agregados SQLite se leen como texto y se validan con BigInt antes de convertirlos. Cada categoría se evalúa por separado: los límites son una planificación y no se restringen por el saldo que haya en las cuentas. Las sumas de límites entre categorías no se muestran en este incremento.

El cálculo se realiza al consultar. Registrar, corregir, eliminar o cambiar de mes/categoría un gasto actualiza el presupuesto afectado al volver a la pantalla. Cambiar un gasto a ingreso lo excluye. Se puede crear un presupuesto después de registrar gastos: se incluyen los ya existentes en ese mes.

## Meses, categorías y eliminación

Cada mes tiene límites explícitos. No se copian al mes siguiente ni se trasladan sobrantes o excesos. Para repetir un límite, selecciona el otro mes y créalo allí.

El nombre de la categoría se consulta desde su registro actual. Si se archiva, su presupuesto conserva los gastos históricos y permite editar el límite o eliminarlo. No se pueden crear presupuestos nuevos para esa categoría hasta reactivarla. Las correcciones de movimientos mantienen las reglas de [categorías](categories.md).

El mes y la categoría de un presupuesto permanecen fijos después de crearlo. Para corregirlos, elimina el presupuesto con confirmación y crea uno nuevo. Eliminar quita solo el límite: conserva movimientos, comprobantes y saldos.

La privacidad oculta importes y barra de progreso. La pantalla conserva los nombres, el mes y los estados de disponible/límite alcanzado/exceso. Los campos de edición permiten ver y corregir el límite ingresado.

## Persistencia y sincronización prevista

La migración SQLite 7 agrega presupuestos, restricciones y cola propia. Se conserva el esquema anterior y sus eventos pendientes. La base se migra con el flujo transaccional existente, sin borrar ni reiniciar datos.

Crear y editar producen snapshots completos: `id`, `category_id`, `month`, `limit_minor`, `currency` y `created_at`. Eliminar produce un tombstone con `id`. Las revisiones sobreviven a la eliminación; actualizar con el mismo límite no produce otro evento. No se guardan gastado, disponible o exceso en la cola porque se derivan de movimientos.

Cada cambio y su evento se confirman juntos; un fallo de cola revierte también la escritura. Los eventos comparten `sync_order` con cuentas, categorías, movimientos y transferencias. El contrato público de consulta requiere que se haya migrado la base a la versión actual antes de usarse. Todavía no hay envío ni confirmaciones remotas.

Este incremento no añade dependencias ni variables de entorno.

## Pruebas y recorrido Android pendiente

Las pruebas unitarias e integración usan SQLite real en Node. Cubren límites seguros, disponible/exceso, cambios de movimientos, fuentes excluidas, todas las cuentas, meses independientes, año bisiesto/cruce de año, archivo, unicidad, rollback de cola, revisiones, orden global, migración desde esquema 6 y reapertura de un archivo de base de datos.

Pendiente de ejecutar en Android físico con datos de prueba:

1. Crear un presupuesto de Alimentación de `5.000` para el mes actual; registrar gastos de `3.000` y `1.000` desde cuentas diferentes. Debe quedar `1.000` disponible.
2. Editar el primer gasto a `5.000`: gastado `6.000`, exceso `1.000`. Eliminar el segundo gasto: límite alcanzado, disponible cero.
3. Cambiar el gasto de categoría o mes y comprobar ambos periodos al volver. Un ingreso o transferencia no debe consumir el presupuesto.
4. Archivar la categoría, revisar su presupuesto y editar su límite. Deben conservarse sus gastos; no debe aparecer entre las opciones de presupuesto nuevo.
5. Elegir el siguiente mes: no debe copiarse el límite anterior. Crear otro límite y verificar ambos meses.
6. Eliminar un presupuesto con confirmación: los movimientos y el saldo deben permanecer iguales.
7. Cerrar/reabrir en modo avión y comprobar persistencia. Revisar ambos temas, TalkBack, fuentes grandes, teclado, ocultación de importes y guardado sin doble envío.
