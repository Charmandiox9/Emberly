# Emberly

Aplicación Android de finanzas personales con una identidad cálida y la mascota Ember.
React Native + Expo SDK 57, TypeScript estricto y persistencia local SQLite.

## Estado actual

Primer incremento de la fase 1: crear cuentas manuales con saldo inicial en CLP,
listar sus saldos iniciales y ocultar montos durante la sesión. Los movimientos,
presupuestos, metas y estadísticas aún no están implementados.

Los saldos que se muestran en esta entrega son **saldos iniciales**, no saldos
calculados a partir de movimientos. No se cargan datos de ejemplo automáticamente.
Usa datos de prueba hasta que exista respaldo/restauración.

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
3. Intentar guardar sin nombre o con `1,50`; verificar error sin nuevas cuentas.
4. Ocultar montos y verificar que desaparezcan también en las filas de cuentas.
5. Cerrar la app completamente y reabrir; verificar ambas cuentas y sus saldos.
6. Con APK preview, repetir sin red. En Expo Go, cargar primero el bundle de desarrollo.
7. Revisar tema oscuro, TalkBack, fuente ampliada y teclado sin ocultar los campos.

Registra resultados reales y build utilizado en `progress.md`. Estos pasos pendientes
no deben interpretarse como verificaciones ya ejecutadas.

## Estructura y documentación

- `src/app/`: rutas y composición de dependencias nativas.
- `src/modules/accounts/`: dominio, caso de uso, repositorio SQLite y presentación de cuentas.
- `src/shared/domain/`: dinero y fechas independientes del framework.
- `src/shared/storage/`: contratos, adaptador Expo y migraciones versionadas.
- `src/shared/ui/`: tokens, botón y adaptador de notificaciones.
- `tests/`: pruebas unitarias y de integración.
- [Reglas de dominio](docs/domain.md), [arquitectura](docs/adr/0001-local-first-expo.md),
  [diseño](design.md), [plan](task_plan.md), [progreso](progress.md) y [cambios](CHANGELOG.md).

El almacenamiento actual no está cifrado; no contiene credenciales ni usa servicios
remotos. El respaldo automático Android está desactivado en la configuración inicial.
No borrar datos de la aplicación para resolver errores de migración.
