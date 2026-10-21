# Gestión de categorías

Desde **Movimientos → Administrar categorías** puedes crear categorías de ingresos o gastos, cambiar su nombre, archivarlas y reactivarlas. Las categorías iniciales también se pueden renombrar y archivar.

El nombre admite de 1 a 60 caracteres y se guarda sin espacios exteriores. Cada categoría tiene un identificador estable; el tipo se elige al crearla y permanece fijo. Para pasar a otro tipo, crea otra categoría y archiva la anterior. No hay una acción de borrado ni de fusión.

## Historial y registro

- Cambiar el nombre actualiza la etiqueta de movimientos y resúmenes existentes; conserva identificadores, importes, fechas y saldos.
- Archivar conserva la categoría en filtros e historial y mantiene sus gastos o ingresos dentro de los totales. Su estado aparece en la pantalla de gestión.
- Los registros nuevos solo admiten categorías activas. Si no quedan categorías del tipo seleccionado, el formulario ofrece acceso a su gestión.
- Un movimiento histórico puede corregirse manteniendo su categoría archivada o trasladarse a una activa. No se puede asignar otro movimiento a una categoría archivada ni volver a ella después de trasladarlo; primero hay que reactivarla.
- Eliminar un movimiento histórico continúa permitido, con la confirmación habitual y el recálculo de su efecto.

## Persistencia y cola

La migración SQLite 6 agrega el estado de archivo y protege las restricciones anteriores mediante triggers. Conserva las categorías existentes como activas y no modifica los eventos que ya estaban pendientes. Una migración posterior debe extender el esquema; las anteriores se conservan.

Crear, renombrar, archivar o reactivar escribe un snapshot completo en la misma operación SQLite que el cambio. Incluye `id`, `name`, `kind` y `archived` (0/1). Si falla la cola, se revierte el cambio y su revisión. Repetir un nombre o estado sin cambiar su valor no produce otro evento.

Los eventos de categorías comparten el orden global con cuentas, movimientos y transferencias. Los snapshots anteriores al esquema 6 carecen de `archived`; el futuro protocolo remoto deberá interpretarlo como activo. No existe aún envío al backend ni se requieren variables de entorno para esta función.

## Verificación

Las pruebas automatizadas usan SQLite real en Node: cambios de nombre, integridad de saldos, restricciones de tipo y archivo, fallos de cola, orden, migración desde esquema 5 y reapertura de un archivo de base de datos. Esto no sustituye probar el motor Expo ni la interfaz en Android.

Recorrido pendiente en teléfono, con datos de prueba:

1. Crear «Mascotas» en gastos y «Trabajo independiente» en ingresos; registrar movimientos y revisar sus totales.
2. Renombrar «Mascotas» a «Veterinaria» y comprobar la etiqueta del historial sin cambios de monto.
3. Archivar «Veterinaria»: desaparece del registro nuevo y sigue disponible como filtro de historial.
4. Corregir el importe del movimiento original manteniendo la categoría archivada. Intentar asignarla a otro movimiento debe fallar sin guardar cambios.
5. Reactivar y registrar otro gasto. Cerrar completamente y reabrir la app en modo avión: categorías, nombres, estados y saldos deben conservarse.
6. Con todas las categorías de un tipo archivadas, abrir el registro, entrar a su gestión, reactivar una y volver para seleccionarla.
7. Revisar ambos temas, fuente ampliada, TalkBack y teclado. Ante un fallo de guardado, el nombre ingresado debe permanecer disponible para reintentar.
