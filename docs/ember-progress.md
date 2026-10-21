# Progreso de Ember

## Reglas de dominio

La etapa depende de días activos acumulados, no de saldos, ingresos, gastos ni metas alcanzadas. Un día cuenta cuando se registra una acción y se usa la fecha UTC del instante de creación. Varias acciones del mismo día cuentan una vez.

Son acciones de registro crear un ingreso, un gasto o una transferencia. Son acciones de planificación crear un presupuesto, una meta o una asignación/retiro de meta. Abrir Estadísticas cuenta como una revisión y solo conserva el día UTC agregado, sin montos ni secciones visitadas. Otras consultas, ediciones y eliminaciones no suman actividad.

| Etapa o logro     | Regla                             |
| ----------------- | --------------------------------- |
| Chispa            | De 0 a 2 días activos             |
| Ember             | Desde 3 días activos              |
| Flarely           | Desde 10 días activos             |
| Primer paso       | Primer movimiento o transferencia |
| Con intención     | Primer presupuesto o meta         |
| Ojo atento        | Primera visita a Estadísticas     |
| A tu ritmo        | Tres días activos distintos       |
| Constancia propia | Diez días activos distintos       |

Las etapas y los cinco logros no retroceden. El progreso no usa rachas consecutivas, no penaliza pausas y no cambia al editar o eliminar una operación. Los datos históricos financieros se reconocen una vez al instalar la migración; las visitas anteriores a Estadísticas no se reconstruyen. La persistencia es local; la sincronización entre dispositivos se definirá en la fase 3B.

## Experiencia

Inicio muestra la ilustración de Ember junto a su etapa, los días activos, la distancia a la siguiente etapa y el logro más reciente. La tarjeta no oculta ni retrasa cifras financieras. La ilustración base es original y optimizada para móvil; las variantes de Chispa y Flarely, las expresiones y las celebraciones descartables siguen pendientes.

Las fechas activas se guardan como días UTC. La fecha de negocio de un movimiento puede ser distinta y no se usa para rachas o logros, así una operación retroactiva no simula actividad en otro día.
