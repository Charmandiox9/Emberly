# ADR 0001: aplicación local con Expo y dominio independiente

Fecha: 20 de octubre de 2026. Estado: aceptada para la primera implementación.

## Contexto

El proyecto necesita Android, TypeScript estricto, animaciones y un flujo de trabajo
sin Android Studio. Inicialmente debe permitir controlar dinero sin conexión ni registro.

## Decisión

Usar React Native con Expo SDK 57 y Expo Router, conservando compatibilidad inicial
con Expo Go durante la transición a SDK 58. Node 24 LTS es el entorno recomendado.
Compilar APK/AAB en EAS, sin generar carpetas nativas en el repositorio.

El dominio es TS puro. El módulo de cuentas expone contratos y un caso de uso; SQLite
se conecta mediante un puerto SQL pequeño. La composición nativa pertenece a `src/app`.
Crear otros módulos cuando se implementen sus casos de uso, sin servicios vacíos.

Usar Vitest para dominio e integración SQL. Node incorpora SQLite y permite probar
las mismas migraciones y repositorios sin binarios adicionales de base de datos. El
adaptador Expo requiere además validación en Android físico; las pruebas Node no lo sustituyen.

Usar Nunito empaquetada y un adaptador de notificaciones sobre `sonner-native`.
Reanimated, Worklets y las demás dependencias nativas se fijan según la matriz Expo.

## Alternativas y consecuencias

- Flutter requeriría Dart y otro flujo de herramientas; combinarlo con TS dentro de la app incrementaría mantenimiento sin una necesidad actual.
- Un backend desde el inicio añadiría autenticación, despliegues y sincronización antes de validar el registro local; se pospone.
- Prisma no se ejecuta en el móvil. Su adopción futura en backend no reemplazará las migraciones SQLite.
- SQLite de Node y Expo pueden diferir en versión. Las pruebas en Android son necesarias, especialmente al cambiar APIs o SQL.
- React DOM se declara con la versión de React compatible con Expo para evitar que los peers transitivos de Router instalen otra versión; no implica que web sea plataforma de entrega.
- Cambios en librerías nativas exigen un nuevo build de desarrollo. El export de Metro verifica el bundle, pero no certifica compilación nativa.
- Las transacciones Expo usan una conexión propia con claves foráneas activadas antes de `BEGIN IMMEDIATE`. La implementación de `withExclusiveTransactionAsync` de SDK 57 abre una conexión nueva y comienza la transacción antes del callback, por lo que no permite activar allí `foreign_keys`. Mantener esta comprobación al actualizar Expo.

## Fuentes verificadas

- [Crear proyecto Expo](https://docs.expo.dev/get-started/create-a-project/).
- [Expo SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).
- Matriz `expo/bundledNativeModules.json` y dependencias de `expo-template-blank-typescript@sdk-57` y `expo-template-default@sdk-57` consultadas en npm.
