# Cambios

## Sin publicar

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
