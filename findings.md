# Contexto y decisiones de Emberly

## Segundo incremento

- La migración 2 agrega categorías y movimientos sin modificar la migración 1 aplicada. Las categorías se guardan en SQLite con tipo; una FK compuesta mantiene la coherencia entre tipo y categoría.
- Los saldos se derivan de las cuentas y el libro de movimientos, sin mantener un segundo saldo mutable. Los agregados SQLite se leen como texto, se validan con BigInt y se convierten solo dentro del rango seguro.
- Fechas futuras se rechazan en el caso de uso según el día local de America/Santiago. Se permiten saldos negativos reales. Editar conserva la auditoría de creación.
- La selección mensual filtra flujos y movimientos; el saldo actual sigue incluyendo todas las fechas. La página de estadísticas inicial muestra totales por categoría en texto, con gráficos y comparativas pendientes.
- Navegación actual: Inicio, Movimientos y Estadísticas; cuentas/formulario fuera de las pestañas. Metas se incorporará cuando su funcionalidad exista.
- En Windows, el watcher de tipos Expo produjo rutas ajenas a `src/app` después de crear archivos con Metro abierto. Un reinicio regeneró correctamente el árbol; mantener tipos generados fuera de Git y reiniciar Metro si ocurre.

Actualizado: 20 de octubre de 2026. Este archivo conserva observaciones; las reglas están en [AGENTS.md](AGENTS.md), el diseño en [design.md](design.md) y la secuencia de ejecución en [task_plan.md](task_plan.md).

## Confirmado por la conversación

- Aplicación móvil Android de finanzas personales con cuentas, metas y estética cálida basada en Emberly.
- React Native + Expo con TypeScript estricto como base aceptada; no se combinará Flutter con TS para esta primera versión.
- El usuario no dispone de espacio para instalar Android Studio. El flujo previsto utiliza editor, teléfono físico y compilación Android en la nube.
- Deben existir pruebas importantes unitarias y de integración, documentación continua, módulos desacoplados y build previo al commit.
- `.env.example` se mantiene con las variables añadidas, renombradas o eliminadas, sin secretos reales.
- REST/GraphQL y Prisma son reglas condicionales para un futuro backend, no requisitos para añadir servidor a una aplicación local.
- `design.md` distingue lo observado en la guía de marca de los valores y comportamientos propuestos para implementarla.

## Estado del proyecto observado

- Archivos iniciales: `AGENTS.md` y `design.md`; no existe `package.json`, código de aplicación ni scripts de build.
- Git inicializado en rama `master`, sin commits al verificar el estado para esta planificación.
- Remoto `origin`: `https://github.com/Charmandiox9/Emberly.git`, configurado tanto para fetch como push.
- No se ha verificado el contenido del remoto, la autenticación GitHub, el entorno Node, la cuenta EAS ni un dispositivo Android disponible.

## Propuestas de alcance del plan

- MVP local sin cuenta obligatoria, en español, inicialmente con una sola moneda por perfil; CLP como hipótesis inicial que debe cerrarse en fase 1.
- Metas modeladas como asignaciones de dinero existente, evitando registrar un aporte como otro gasto. Sus límites y cambios retroactivos requieren reglas explícitas antes de implementarse.
- Respaldo JSON versionado y restauración por reemplazo confirmado; fusión de datos fuera de la primera entrega.
- Las primeras pruebas se harán con datos ficticios hasta verificar recuperación y respaldo.
- Evolución básica y positiva de Ember incluida; animación 3D avanzada y servicios en nube se posponen.

## Aspectos a verificar durante implementación

- Versiones y compatibilidad actuales de Expo, Node, herramientas de pruebas y dependencias nativas, especialmente toasts y animaciones.
- Forma reproducible de ejecutar integración con SQLite real en Android sin instalar herramientas de compilación local.
- Plataforma Android mínima, moneda, zona horaria y reglas sobre fechas futuras, saldos insuficientes y archivo de cuentas.
- Condiciones de EAS, acceso a credenciales de compilación y teléfono físico; no se han comprometido costes ni publicado artefactos.

## Inicio de implementación

- Entorno observado: Windows, Node 25.2.1 y npm 11.6.2; aproximadamente 113 GiB disponibles en C al revisar. Expo recomienda Node LTS, por lo que se documentará Node 24 LTS como entorno reproducible sin cambiar el Node global del usuario.
- Documentación oficial consultada: `https://docs.expo.dev/get-started/create-a-project/`, `https://docs.expo.dev/develop/unit-testing/` y `https://docs.expo.dev/versions/latest/sdk/sqlite/`. Durante la transición a SDK 58, Expo recomienda SDK 57 para Expo Go físico.
- npm necesita acceso fuera del aislamiento de red para resolver el registro; una consulta aislada falló con `ENOTFOUND`. La consulta autorizada devolvió Expo 58.0.16 como versión más reciente; se seleccionará explícitamente SDK 57.
- Dependencias nativas contrastadas contra `expo/bundledNativeModules.json`. React DOM 19.2.3, Reanimated 4.5.1 y Worklets 0.10.1 se fijaron explícitamente tras un conflicto con peers transitivos más recientes.
- Los plugins React/import de `eslint-config-expo@57.0.2` no son compatibles con ESLint 10: una ejecución falló al cargar `react/display-name`. Se conserva ESLint 9.39.5, admitido por esos plugins, pese al aviso de deprecación del registro. Revisar al actualizar SDK/configuración, sin forzar peers.
- `expo-doctor` completó 21/21 comprobaciones satisfactoriamente. El export Android de Metro/Hermes pasó; no equivale a un build APK.
- EAS CLI respondió `Not logged in`; no hay sesión Expo disponible para vincular el proyecto y enviar el build nativo. No se crearon credenciales ni proyectos remotos.
- SQLite real mediante Node permitió ejecutar 43 pruebas; quedan pendientes el adaptador Expo, revisión visual y accesibilidad en un Android físico.
