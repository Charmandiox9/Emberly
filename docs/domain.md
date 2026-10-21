# Modelo y reglas de dominio

## Decisiones iniciales

- Una sola moneda por perfil: CLP. Es una decisión inicial revisable antes de ampliar el esquema.
- Los montos son enteros seguros en pesos, sin centavos. No se redondea silenciosamente una entrada fraccionaria.
- El campo acepta `25000`, `25.000`, cero y montos negativos para el saldo inicial; rechaza notación científica, separadores ambiguos y montos fuera del rango seguro.
- Para sumar se comprueba el rango del resultado antes de convertirlo desde `bigint` al entero de persistencia.
- `createdAt` es un instante ISO UTC canónico. La fecha de negocio es un valor de calendario distinto, validado sin conversiones de zona horaria implícitas.
- La zona prevista para periodos es `America/Santiago`; el cálculo explícito recibe la zona y usa sus reglas de horario de verano. La configuración de perfil se incorporará junto a movimientos.

## Cuenta: implementado

Una cuenta tiene identificador, nombre de 1 a 60 caracteres, saldo inicial y fecha de
creación. La gestión añade estado activa/archivada y edición de nombre/saldo inicial. Puede representar banco, efectivo o una billetera. El saldo inicial puede
ser negativo para representar una deuda; no se registra como ingreso o gasto.

El identificador es único. Un segundo intento con el mismo ID falla sin modificar
el registro original. Los INSERT usan parámetros; los nombres no se concatenan al SQL.
El caso de uso termina cuando el repositorio confirma el guardado. Las filas de la
base se validan al leer, antes de entregarse al dominio.

## Movimientos: implementado

Ingresos y gastos tienen monto positivo, tipo explícito, cuenta, categoría, concepto,
fecha de negocio y auditoría. El caso de uso rechaza fechas futuras en America/Santiago.
Se permiten saldos negativos para reflejar deuda real.

El saldo actual suma saldos iniciales e ingresos y resta gastos de todas las fechas
registradas. Los flujos mensuales excluyen el saldo inicial y usan un rango cerrado
al inicio del mes y abierto al inicio del siguiente.

Guardar, editar y eliminar son transaccionales y comprueban saldos y totales seguros
antes de confirmar. La edición conserva el instante de creación. La apertura de una
cuenta también valida el saldo total actual dentro de una transacción.

Los agregados enteros SQLite se leen como texto y validan con BigInt antes de convertir
a Money, evitando conversiones JS imprecisas. Un error de agregado revierte la escritura.
La FK compuesta categoría/tipo impide usar categorías de ingreso en gastos o viceversa.
El historial filtra mes, tipo, cuenta y categoría; pagina por fecha e ID descendentes.

## Categorías: implementado localmente

Las categorías tienen identificador estable, nombre y tipo ingreso/gasto inmutable. Se pueden crear, renombrar, archivar y reactivar, incluidas las iniciales. El archivo conserva referencias y totales; bloquea registros nuevos y permite corregir movimientos históricos manteniendo su categoría original. Los cambios de nombre actualizan las etiquetas del historial. Ver [gestión y pruebas](categories.md).

## Transferencias: implementado localmente

Un registro indivisible contiene origen, destino y monto; de él se derivan dos lados opuestos sobre los saldos. Guardar/anular confirma ambos efectos y la operación pendiente en una transacción. No entra en ingresos/gastos; anular conserva auditoría y es idempotente. Archivar una cuenta conserva su historial y saldo, bloqueando operaciones nuevas hasta reactivarla. Ver [reglas y recorrido](finance-operations.md).

## Presupuestos: implementado localmente

- Presupuestos mensuales por categoría; comparar gasto efectivo dentro del periodo local.
- Cada nuevo mes tendrá un límite explícito; no arrastrar sobrantes automáticamente sin una regla documentada.
- Límite positivo y único por categoría de gasto y mes. Cambiar o quitar un límite no altera movimientos ni saldos; el gasto puede superarlo y se muestra el exceso.
- Categorías archivadas conservan sus presupuestos y admiten correcciones del límite; no se les crean nuevos hasta reactivarlas. El gasto se deriva de movimientos al consultar. Ver [reglas y pruebas](budgets.md).

## Metas: implementado localmente

- Las metas asignan dinero existente, sin crear gasto o ingreso adicional. Un retiro de asignación libera disponibilidad, no crea ingreso.
- Antes de un aporte, comprobar que el dinero disponible no esté asignado a otras metas. Si un gasto posterior reduce el respaldo, mostrar el déficit y pedir ajuste, conservando la realidad del movimiento.
- Una edición de monto objetivo conserva aportes históricos. Si lo asignado supera el objetivo, se muestra el exceso; los retiros liberan la asignación sin crear ingresos.
- Los aportes se limitan al disponible global y al restante del objetivo. Los retiros no superan lo asignado. Completar es un estado derivado, reversible al retirar o aumentar el objetivo; no implica respaldo garantizado si el saldo bajó.
- El respaldo es el saldo neto no negativo; con saldo negativo, todas las asignaciones carecen de respaldo y la deuda sigue visible en el saldo. Asignaciones globales por perfil, sin vinculación a movimientos/cuentas individuales. Ver [reglas y pruebas](goals.md).

## Estadísticas: implementado localmente

Los ingresos/gastos mensuales y por categoría se calculan desde movimientos y fecha de negocio. El resultado resta gasto a ingreso, sin saldos iniciales, transferencias o asignaciones. La comparación usa variaciones en pesos frente al mes anterior y la tendencia abarca hasta seis meses, con ceros explícitos para meses sin registros. Cada total tiene acceso al historial filtrado y pruebas de reconciliación. Ver [estadísticas y límites](statistics.md).

## Recordatorios: implementado localmente

Preferencia de dispositivo desactivada por defecto, horario local y revisión persistente. La intención se guarda antes de programar; los estados diferencian programado, desactivado, permiso/canal bloqueados y pendiente. No pertenece al modelo financiero ni a su cola de sincronización. Ver [uso, recuperación y pruebas nativas pendientes](reminders.md).

## Persistencia y cambios de esquema

SQLite está en esquema versión 9: cuentas y movimientos (1/2), cola durable (3), comprobantes (4), archivo de cuentas y transferencias con orden global de operaciones (5), archivo y gestión de categorías (6), presupuestos (7), metas y asignaciones con eventos de sincronización (8), preferencias locales de recordatorios (9). Las actualizaciones conservan registros e identificadores de operaciones pendientes.
`PRAGMA user_version` registra la versión;
las migraciones y su versión se aplican dentro de una transacción con conexión propia
y `BEGIN IMMEDIATE` en Expo. Se activan las claves foráneas antes de iniciar cada
transacción, porque ese ajuste es específico de cada conexión SQLite.
Una base de versión superior se rechaza sin intentar degradarla o borrarla.

Las futuras migraciones se agregan con un número consecutivo y se prueban desde la
versión previa con datos. Se usan WAL y claves foráneas activadas por conexión. SQLite
común no proporciona cifrado automático. Respaldos y restauración siguen pendientes.
