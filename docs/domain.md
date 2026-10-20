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
creación. Puede representar banco, efectivo o una billetera. El saldo inicial puede
ser negativo para representar una deuda; no se registra como ingreso o gasto.

El identificador es único. Un segundo intento con el mismo ID falla sin modificar
el registro original. Los INSERT usan parámetros; los nombres no se concatenan al SQL.
El caso de uso termina cuando el repositorio confirma el guardado. Las filas de la
base se validan al leer, antes de entregarse al dominio.

## Movimientos y transferencias: especificado, pendiente

Ingresos y gastos tendrán monto positivo y tipo explícito. El saldo será saldo inicial
más ingresos menos gastos y efectos de transferencias. Se permitirán saldos negativos,
porque el registro debe poder reflejar una deuda real; la interfaz lo explicará.

Las transferencias tendrán dos lados relacionados y se guardarán/revertirán en una
transacción. No entrarán en totales de ingresos/gastos. Archivar una cuenta preservará
su historial. Los detalles de edición y eliminación se resolverán con esos casos de uso.

## Presupuestos y metas: especificado, pendiente

- Presupuestos mensuales por categoría; comparar gasto efectivo dentro del periodo local.
- Cada nuevo mes tendrá un límite explícito; no arrastrar sobrantes automáticamente sin una regla documentada.
- Las metas asignan dinero existente, sin crear gasto o ingreso adicional. Un retiro de asignación libera disponibilidad, no crea ingreso.
- Antes de un aporte, comprobar que el dinero disponible no esté asignado a otras metas. Si un gasto posterior reduce el respaldo, mostrar el déficit y pedir ajuste, conservando la realidad del movimiento.
- Una edición de monto objetivo no elimina aportes históricos. Un exceso sobre la meta se muestra como tal; las políticas de reasignación se implementarán con la fase 4.

## Persistencia y cambios de esquema

SQLite guarda cuentas en esquema versión 1. `PRAGMA user_version` registra la versión;
las migraciones y su versión se aplican dentro de una transacción con conexión propia
y `BEGIN IMMEDIATE` en Expo. Se activan las claves foráneas antes de iniciar cada
transacción, porque ese ajuste es específico de cada conexión SQLite.
Una base de versión superior se rechaza sin intentar degradarla o borrarla.

Las futuras migraciones se agregan con un número consecutivo y se prueban desde la
versión previa con datos. Se usan WAL y claves foráneas activadas por conexión. SQLite
común no proporciona cifrado automático. Respaldos y restauración siguen pendientes.
