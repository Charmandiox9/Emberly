# Cuentas y transferencias locales

## Gestión de cuentas

En **Administrar cuentas** se muestran saldos iniciales, saldos actuales y el estado de cada cuenta. Los importes respetan el ocultamiento de montos compartido con Inicio.

- **Editar** permite corregir nombre y saldo inicial en el formulario de la propia tarjeta. Corregir el saldo inicial modifica el saldo actual, sin crear un ingreso o un gasto. La fecha original y el ID se conservan.
- **Archivar** solicita confirmación. Conserva historial, comprobantes y dinero; su saldo continúa en el total y la cuenta se identifica como archivada. No se admite en movimientos ni transferencias nuevos.
- **Reactivar** permite volver a seleccionarla en operaciones nuevas.

Se pueden corregir o eliminar movimientos históricos de una cuenta archivada. Un movimiento de otra cuenta no puede trasladarse a ella hasta reactivarla. No se implementa borrado de cuentas, evitando perder relaciones históricas. Las categorías siguen siendo las iniciales; su administración está pendiente.

Las correcciones validan saldos individuales y total dentro de una transacción. Si fallan la validación o la cola persistente, se conserva el estado anterior. Archivar dos veces una cuenta ya archivada no crea otra revisión.

## Transferencias

Inicio y Movimientos ofrecen acceso a **Transferencias entre cuentas**. Se requieren dos cuentas activas distintas, un monto positivo CLP, concepto y fecha válida no futura. Se admiten saldos negativos, igual que en gastos, para reflejar deuda real.

Un único registro guarda origen, destino y monto. De él se derivan dos efectos inseparables: restar al origen y sumar al destino. No se crean un ingreso y un gasto, ni se alteran los totales de flujo o categorías. El total entre cuentas se conserva.

El historial propio de transferencias filtra por mes y por cualquiera de las cuentas, incluidas las archivadas. Pagina por fecha e ID, con 30 registros por página. Está separado del historial de ingresos/gastos; Inicio incluye las transferencias en los saldos, pero sus movimientos recientes siguen mostrando ingresos y gastos.

**Anular transferencia** requiere confirmación y elimina su efecto sobre ambos saldos en una transacción. Conserva concepto, fecha, origen, destino, monto y fecha de anulación para auditoría. Repetir la anulación no vuelve a alterar saldos ni genera otra operación. Para corregir una transferencia, anularla y registrar otra; no se editan los datos de una transferencia ya registrada.

Se permite anular una transferencia histórica aunque alguna cuenta esté archivada. Si al revertirla una cuenta quedara fuera del rango de enteros seguros, se rechaza toda la operación. Todavía no se adjuntan comprobantes a transferencias; los comprobantes existentes pertenecen a ingresos y gastos. Las comisiones se registran como gastos separados.

## Migración y cola de salida

La migración 5 añade el estado de archivo a las cuentas existentes, inicialmente activas; crea transferencias, revisiones y eventos de salida, conservando los datos y operaciones previas.

Cada creación o anulación genera un único evento con ambos lados en `transfer_outbox`. `SyncQueue` consulta esa tabla y `sync_outbox` mediante `sync_order`, que registra un orden global durable. No adelantar todas las operaciones de cuentas a las transferencias: eso podría enviar el archivo de una cuenta antes que una transferencia anterior todavía pendiente. La migración prepara el orden de los eventos previos sin cambiar sus identificadores.

Las revisiones son locales por entidad. La secuencia global ordena operaciones, no sustituye los identificadores idempotentes ni las futuras versiones remotas. Los snapshots de cuenta nuevos incluyen `archived` como 0/1; el formato anterior no tenía ese campo y debe interpretarse como cuenta activa al diseñar el protocolo. Las transferencias activas serializan `reversed_at` como cadena vacía en el formato local; una anulación incluye un instante UTC. Estos snapshots todavía no son DTO de una API desplegada.

Los fallos de escritura en cualquier cola, incluido el orden global, revierten la operación financiera. Los eventos de comprobantes siguen en su cola propia y requerirán coordinar dependencias al implementar R2. No hay conexión remota en este incremento ni variables de entorno nuevas.

## Verificación pendiente en Android

1. Crear Efectivo con $10.000 y Banco con $5.000; transferir $3.000: saldos $7.000/$8.000 y total $15.000, sin ingresos o gastos mensuales nuevos.
2. Cerrar y reabrir sin conexión; comprobar saldos e historial de transferencias. Anular: recuperar $10.000/$5.000, conservar el registro anulado y evitar otro efecto si se repite.
3. Archivar Efectivo: conservar el total y el historial, excluirla de operaciones nuevas y permitir reactivación y correcciones históricas.
4. Corregir nombre y saldo inicial, revisar los saldos y confirmar que no aparezcan ingresos ficticios.
5. Probar misma cuenta, monto cero, fechas inválidas/futuras, doble pulsación, filtros y paginación; revisar teclado, temas, fuente grande y TalkBack.

Las pruebas automatizadas usan SQLite real de Node, incluidos límites, fallos de cola, migración desde versión 4 y reapertura de archivo. No sustituyen este recorrido físico.
