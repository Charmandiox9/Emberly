# Estadísticas y comparación mensual

La pestaña **Estadísticas** muestra los registros del mes elegido: ingresos, gastos, resultado, cantidad de movimientos, distribución de gastos por categoría y tendencia de hasta seis meses.

## Qué se calcula

- Ingresos y gastos suman movimientos por su **fecha de negocio**, incluyendo todas las cuentas y categorías, también archivadas.
- El resultado es ingresos menos gastos del periodo. No representa el saldo de las cuentas: excluye saldos iniciales y movimientos de otros periodos.
- Transferencias, aportes/retiros de metas y límites de presupuesto no forman parte de los ingresos/gastos ni del contador de movimientos.
- La categoría se muestra con su nombre actual. Renombrar no cambia importes ni referencias.

Los agregados se consultan en una sola sentencia SQLite, acotada a la ventana de fechas. Se leen como texto y se validan con BigInt antes de convertirlos a importes enteros seguros. La consulta no modifica datos, migraciones ni cola de sincronización.

## Mes anterior y tendencia

La comparación expresa aumentos, disminuciones o igualdad en pesos para ingresos y gastos. No calcula variación porcentual frente a una base cero ni resta resultados netos de meses extremos que pudieran superar el rango monetario seguro.

Se comparan los registros disponibles de cada mes completo del calendario. El mes actual puede estar incompleto: no se ajusta por número de días ni se proyecta el cierre. Un mes sin registros se muestra explícitamente con cero; esto no garantiza que refleje todas las finanzas reales del usuario.

La tendencia incluye el seleccionado y los cinco anteriores, con meses vacíos. Al comienzo del calendario admitido se acorta la ventana; enero del año 1 no tiene comparación anterior. El selector conserva los límites de calendario del proyecto.

Las barras usan una escala común: el mayor total mensual de ingresos o gastos de esa ventana. Cada barra acompaña un importe y una etiqueta; no requiere identificar series únicamente por color. El resultado de cada mes también se ofrece en texto.

## Categorías y verificación con historial

Los gastos se ordenan de mayor a menor por categoría. La participación usa porcentajes enteros truncados calculados con BigInt; son aproximados y pueden no sumar 100 %. Una categoría positiva inferior al 1 % se identifica como tal. Los importes permanecen exactos.

**Ver ingresos del mes**, **Ver gastos del mes** y **Ver gastos: categoría** abren Movimientos con el mismo mes, tipo y categoría cuando corresponde, sin un filtro de cuenta. Se reinicia la paginación para esa solicitud. Se puede editar o eliminar desde el historial y volver a Estadísticas para recalcular.

Los parámetros de ruta se validan: un mes inválido usa el periodo predeterminado, un tipo inválido usa todos los tipos y una categoría inválida no se aplica. Cada nueva solicitud de filtros desde Estadísticas se distingue de la anterior, incluso cuando repite los mismos valores después de una modificación manual de filtros.

La privacidad oculta importes, porcentajes y barras. Conserva periodos, nombres, contador de movimientos y dirección de las variaciones. Los lectores de pantalla reciben las etiquetas de importe oculto del componente compartido.

## Pruebas y recorrido Android pendiente

Las pruebas unitarias y de integración usan SQLite real en Node. Reconcilian ingresos/gastos y cada categoría con todas las páginas del historial filtrado; cubren más de 30 registros, cambios de fecha/tipo/categoría, eliminación, archivo, nombre actual, exclusiones financieras, meses vacíos, cruce de año, febrero bisiesto, fecha de negocio Santiago frente al mes UTC, enteros extremos, ventanas de calendario y parámetros de ruta inválidos.

Pendiente en Android físico, con datos de prueba:

1. Registrar en el mes anterior un ingreso de `20.000` y un gasto de `5.000`; en el actual un ingreso de `30.000` y gastos de `3.000` en Alimentación y `7.000` en Transporte.
2. Revisar el actual: ingresos `30.000`, gastos `10.000`, resultado `20.000`, tres movimientos. Variación de ingresos: aumento `10.000`; gastos: aumento `5.000`.
3. Abrir cada total y categoría en el historial. Confirmar periodo, tipo y categoría, recorrer páginas y comparar importes.
4. Cambiar filtros manualmente, volver a Estadísticas y solicitar nuevamente la misma categoría: debe abrir los filtros solicitados, sin conservar otros filtros manuales.
5. Editar, cambiar de mes/tipo/categoría o eliminar un movimiento; volver y comprobar comparación y tendencia. Archivar cuentas/categorías conserva sus registros en estadísticas.
6. Verificar meses vacíos, tema oscuro, textos ampliados, TalkBack, teclado y montos ocultos. Los gráficos deben desaparecer al ocultar los importes.

Este incremento no añade dependencias, migraciones ni variables de entorno.
