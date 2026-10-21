# Cambios

## Sin publicar

- Porcentajes de presupuestos y metas calculados con enteros para conservar valores exactos como 29 % y 57 %, con pruebas de regresión.
- Corregida la carga de recordatorios cuando falta `ExpoTopicSubscriptionModule`: comprobación nativa antes de importar Notifications y estado explícito de cliente requerido, conservando preferencias.
- Recordatorio diario local opcional con horario del teléfono, permiso solo al activar, canal privado y contenido sin datos financieros.
- Ajustes accesibles desde Inicio, estados confirmados/pendientes y reconciliación al abrir o volver al primer plano; recuperación sin duplicar programaciones ni cancelar avisos ajenos.
- Migración SQLite 9 para preferencias del dispositivo; incorporación de Expo Notifications SDK 57 y bloqueo de alarmas exactas. Validación nativa pendiente.

- Estadísticas mensuales con ingresos/gastos, resultado, contador y variaciones en pesos frente al mes anterior; tendencia de hasta seis meses y participación por categoría.
- Accesos desde estadísticas al historial con mes/tipo/categoría validados y reinicio de filtros por solicitud.
- Reconciliación automatizada con todo el historial paginado, archivo de cuentas/categorías, cambios de movimientos, fechas de negocio y montos extremos; privacidad oculta importes y gráficos.

- Metas con nombre, objetivo y fecha opcional; asignación/retiro sin crear ingresos ni gastos y control del disponible global entre metas.
- Resumen de saldo, asignado, disponible y faltante tras gastos/correcciones; cambios de objetivo conservan historial y muestran excesos.
- Pestaña Metas, historial de asignaciones paginado e idempotente, privacidad de importes y progreso.
- Migración SQLite 8 con historial inmutable, saldo derivado por meta y eventos atómicos en la cola global.

- Presupuestos mensuales por categoría de gasto: creación, edición y eliminación confirmada sin modificar movimientos ni saldos; gasto real, disponible y exceso.
- Meses independientes, conservación de presupuestos de categorías archivadas y recálculo desde movimientos de todas las cuentas.
- Migración SQLite 7 con snapshots/tombstones de presupuestos, revisiones persistentes y orden global para futura sincronización.
- Pruebas de presupuestos con SQLite real, límites seguros, cambios de mes/categoría, rollback y reapertura.

- Gestión local de categorías de ingreso y gasto: creación, cambio de nombre y archivo/reactivación, conservando referencias y totales históricos.
- Migración SQLite 6 con bloqueo de categorías archivadas para nuevas asignaciones y snapshots atómicos en la cola global.
- Pruebas de categorías con SQLite real, fallos de cola, migración y reapertura de datos persistidos.

- Edición de nombre y saldo inicial de cuentas, archivo/reactivación e identificación de cuentas archivadas sin perder saldos ni historial.
- Transferencias CLP atómicas entre cuentas activas, historial propio por mes/cuenta y anulación confirmada con auditoría.
- Migración SQLite 5, eventos indivisibles de transferencia y orden global durable junto a cuentas y movimientos.
- Pruebas de integridad, límites, reintentos de anulación, archivo, migración y persistencia de transferencias.

- Comprobantes PDF/JPEG/PNG/WebP desde documentos, cámara y galería; hasta cinco por movimiento, de 10 MiB cada uno.
- Copia al almacenamiento privado persistente, vista previa de imágenes, compartir y eliminación confirmada.
- Migración SQLite 4, preparación conjunta con movimientos, recuperación de copias incompletas y tareas durables de limpieza.
- Eventos de archivos pendientes separados de la cola financiera; todavía sin subidas a R2.
- Configuración nativa para cámara y selectores sin micrófono ni permisos amplios de almacenamiento externo.

- Migración SQLite 3: cola persistente de cuentas, categorías y movimientos, snapshots de cambios y marcas de eliminación, con rollback conjunto.
- Preparación de datos existentes y lectura tipada de lotes pendientes; no se envían datos a servicios remotos todavía.
- Pruebas de reinicio, migraciones interrumpidas, fallos de cola y revisiones locales; guía para configurar servicios cuando se integren.

- Navegación Inicio, Movimientos y Estadísticas, con cuentas y formulario independientes.
- Ingresos/gastos con categorías, edición, eliminación confirmada y validación de montos/fechas.
- Saldos actuales y flujos mensuales sobre datos reales; gastos por categoría.
- Historial con filtros y paginación por fecha/ID, con recarga al volver de editar.
- Migración SQLite 2 que conserva cuentas anteriores y agrega integridad referencial para movimientos.
- Ocultamiento de montos compartido entre pantallas durante la sesión.
- Pruebas adicionales de migración, saldos, categorías, rollback, paginación y formularios.

- Base Android con Expo SDK 57, Expo Router y TypeScript estricto.
- Apertura y listado de cuentas locales en CLP; saldo inicial total y ocultamiento de montos durante la sesión.
- Persistencia SQLite con primera migración versionada y validación de datos al leer.
- Dinero con enteros seguros y fechas de negocio calculadas con zona horaria explícita.
- Temas claro/oscuro, Nunito local y notificaciones nativas centralizadas.
- Pruebas unitarias de dominio e integración contra SQLite real de Node.
- Scripts de verificación, perfiles EAS y documentación de instalación, arquitectura y dominio.

Pendientes de validar: build nativo EAS, persistencia del adaptador Expo en Android
físico, revisión visual y accesibilidad en dispositivo. No hay APK publicado.
