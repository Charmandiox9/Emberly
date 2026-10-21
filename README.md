# Emberly

Aplicación Android de finanzas personales con una identidad cálida y la mascota Ember.
React Native + Expo SDK 57, TypeScript estricto y persistencia local SQLite.

## Estado actual

La versión local incluye cuentas CLP, registro/edición/eliminación de ingresos y gastos,
historial filtrable con paginación, saldos actuales, comparación mensual y tendencia de seis meses con gastos por categoría.
Inicio, Movimientos, Metas, Estadísticas y Más tienen navegación por pestañas; cuentas y formulario
se abren como pantallas independientes. La pestaña Más reúne cuentas, categorías, presupuestos y ajustes; las transferencias están junto al historial. También incluye transferencias con anulación,
edición/archivo de cuentas, categorías personalizadas, presupuestos mensuales y metas con aportes/retiros.
Incluye recordatorios diarios locales configurables. Autenticación Google, sincronización remota, push y la mascota siguen pendientes.

Inicio muestra el **saldo actual** calculado desde saldos iniciales y movimientos.
El selector mensual filtra flujos e historial, sin convertirlo en saldo histórico.
Cuentas distingue saldo inicial y saldo actual. No se cargan movimientos ficticios.
La app ya permite exportar y restaurar respaldos locales. Hasta validar esos recorridos en un
teléfono físico, usa datos de prueba y conserva una copia fuera del dispositivo.

## Entorno y ejecución

- Windows con Node 24 LTS (consulta `.nvmrc`) y npm. El lockfile es `package-lock.json`.
- Teléfono Android físico. No es necesario instalar Android Studio ni emulador.
- Cuenta Expo/EAS para compilaciones nativas en la nube.

```powershell
npm ci
npm run start:go
```

Instala Expo Go compatible con SDK 57 en el teléfono y escanea el QR; PC y teléfono
deben poder comunicarse por la red local. La documentación de Expo recomienda SDK 57
para Expo Go durante la transición a SDK 58 observada el 20 de octubre de 2026.
Las funciones de la app y las fuentes empaquetadas operan sin conexión; Expo Go en
desarrollo sí necesita acceder al servidor JavaScript del PC.

La aplicación no necesita variables de entorno actualmente. `.env.example` documenta
esta condición; actualízalo al incorporar configuración real.

## Verificaciones

```powershell
npm run typecheck
npm run lint
npm test
npm run format:check
npm run verify
npm run export:android
```

Vitest prueba el dominio y ejecuta integración de repositorios/migraciones contra
SQLite real usando `node:sqlite` de Node 24+. No se reemplaza SQLite por un mock.
Los archivos de integración se crean en un directorio temporal privado y se eliminan
al finalizar. Estas pruebas no verifican el puente nativo de `expo-sqlite`.

`export:android` verifica la generación del bundle Android; **no produce un APK ni
equivale a un build nativo**. Para hacer un commit de código deben pasar
`npm run verify` y `npm run export:android` sobre el estado final. No se requiere
una sesión EAS ni un build nativo exitoso para hacer commits; esas verificaciones
se mantienen para las entregas instalables y los cambios nativos que correspondan.

## Android sin Android Studio

```powershell
npx eas-cli login
npx eas-cli init
npm run build:android:development
```

`eas init` vincula el proyecto a tu cuenta y agrega el identificador real del proyecto
a la configuración. No se ha inventado un project ID ni incluido credenciales.
Instala el APK de desarrollo entregado por EAS en el teléfono y ejecuta `npm start`.
Si cambian dependencias nativas, genera otra compilación de desarrollo.

Para una preview instalable que incorpore JavaScript y arranque sin Metro:

```powershell
npm run build:android:preview
```

`eas.json` incluye perfiles development, preview (APK) y production (AAB). El nombre
de paquete inicial es `com.charmandiox9.emberly`; puede ajustarse antes de publicar.
Consulta disponibilidad y costes de tu cuenta antes de enviar compilaciones. El
proyecto no tiene publicación automática en Google Play.

## Prueba manual de este incremento

1. Abrir la aplicación y crear «Efectivo» con saldo `25.000`.
2. Crear otra cuenta con saldo `-5.000`; el total inicial debe ser `$20.000`.
3. Registrar un ingreso de `10.000` y un gasto de `3.000`: saldo `$27.000`, ingresos mensuales `$10.000` y gastos `$3.000`.
4. Editar el gasto a `5.000`: saldo `$25.000`. Eliminarlo con confirmación: saldo `$30.000`.
5. Revisar filtros por mes, tipo, cuenta y categoría. Con más de 30 registros, recorrer páginas sin repetir filas.
6. Intentar guardar monto cero/negativo o fecha futura/inexistente: señalar el campo y conservar la entrada.
7. Ocultar montos y recorrer pantallas: valores y etiquetas accesibles respetan la opción durante la sesión.
8. Cerrar completamente y reabrir; verificar cuentas, movimientos y saldos. La ocultación se reinicia al cerrar la sesión de la app.
9. Con APK preview, repetir sin red. En Expo Go, cargar primero el bundle de desarrollo.
10. Revisar tema oscuro, TalkBack, fuente ampliada y teclado sin ocultar los campos.

Registra resultados reales y build utilizado en `progress.md`. Estos pasos pendientes
no deben interpretarse como verificaciones ya ejecutadas.

## Estructura y documentación

- `src/app/`: rutas y composición de dependencias nativas.
- `src/modules/accounts/`: dominio, caso de uso, repositorio SQLite y presentación de cuentas.
- `src/modules/movements/`: registro, validación de borradores, historial y repositorio financiero.
- `src/modules/dashboard/`: saldos actuales y flujos mensuales.
- `src/modules/sync/`: consulta de cambios pendientes persistidos por la migración SQLite 3; todavía sin envío remoto.
- `src/modules/attachments/`: comprobantes persistentes desde documentos, cámara y galería, con reintentos y limpieza.
- `src/modules/transfers/`: transferencias entre cuentas, anulación e historial paginado.
- `src/modules/categories/`: creación, cambio de nombre y archivo/reactivación de categorías.
- `src/modules/budgets/`: límites mensuales por categoría, gasto real, disponible y exceso.
- `src/modules/goals/`: metas, asignaciones, respaldo disponible y auditoría de aportes/retiros.
- `src/modules/statistics/`: resúmenes mensuales, comparación, distribución por categoría y tendencia reconciliada con historial.
- `src/modules/reminders/`: preferencia local, permisos, programación y recuperación de recordatorios diarios.
- `src/application/`: composición de repositorios para las rutas.
- `src/shared/domain/`: dinero y fechas independientes del framework.
- `src/shared/storage/`: contratos, adaptador Expo y migraciones versionadas.
- `src/shared/ui/`: tokens, botón y adaptador de notificaciones.
- `tests/`: pruebas unitarias y de integración.
- [Reglas de dominio](docs/domain.md), [arquitectura](docs/adr/0001-local-first-expo.md),
  [diseño](design.md), [plan](task_plan.md), [progreso](progress.md) y [cambios](CHANGELOG.md).
- [Cola transaccional](docs/adr/0002-durable-outbox.md), [sincronización prevista](docs/offline-sync.md)
  y [configuración de servicios y variables](docs/environment-setup.md).
- [Comprobantes: uso, recuperación y pruebas Android](docs/attachments.md). Los nuevos módulos nativos requieren regenerar el cliente de desarrollo EAS.
- [Gestión de cuentas y transferencias](docs/finance-operations.md): edición, archivo/reactivación, saldos, anulación y sincronización prevista.
- [Gestión de categorías](docs/categories.md): tipos, historial, archivo/reactivación y recorrido de prueba.
- [Presupuestos mensuales](docs/budgets.md): límites, meses independientes, exceso y recorrido de prueba.
- [Metas y asignaciones](docs/goals.md): aportes/retiros, disponible global, faltantes y recorrido de prueba.
- [Estadísticas](docs/statistics.md): cálculos, comparación, tendencia, privacidad y navegación al historial filtrado.
- [Recordatorios](docs/reminders.md): configuración, permisos, recuperación y validación física pendiente. La nueva dependencia requiere regenerar el cliente de desarrollo EAS.
- [Respaldo local](docs/backup.md): exportación y restauración JSON con comprobantes y confirmación de reemplazo.
- [API REST](docs/api.md): desarrollo local de Cloudflare Workers, identidad Firebase y Neon.

El almacenamiento actual no está cifrado; no contiene credenciales ni usa servicios
remotos. El respaldo automático Android está desactivado en la configuración inicial.
No borrar datos de la aplicación para resolver errores de migración.

Si al agregar rutas nuevas con Metro abierto aparecen errores de rutas tipadas en
Windows, reinicia Metro para regenerar `.expo/types/router.d.ts` desde el árbol completo
de `src/app`. El archivo es generado: conserva el tipado y evita editarlo a mano.
