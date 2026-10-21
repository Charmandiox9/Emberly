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

## 20 de octubre de 2026: servicios y funcionamiento sin conexión

- SQLite ya conserva información local; los adjuntos deben copiarse a documentos privados persistentes, evitando depender de caché temporal.
- Workers Free: 100.000 solicitudes/día, 10 ms CPU/solicitud. Neon Free actual: 100 CU-h/mes y 1 GB por proyecto; escala a cero en reposo. R2 Standard: 10 GB-mes y cuotas de operaciones sin coste; el exceso se factura.
- Supabase Free pausa tras una semana de inactividad; no encaja tan bien con el acceso continuo solicitado. Firebase Auth permite Google con nivel gratuito; no implica usar Firestore.
- Google nativo y push Android requieren build de desarrollo propio; EAS mantiene el flujo sin Android Studio. Android controla la ejecución en segundo plano; no prometer vigilancia continua.
- Fuentes y propuesta detallada en `docs/offline-sync.md`; sin recursos creados. Probar compatibilidad con SDK 57 antes de implementar.

## Cola SQLite: decisiones verificadas

- Triggers de migración 3 evitan la ventana entre una escritura financiera confirmada y su encolado: fallar la cola revierte también la entidad; fallar la validación financiera revierte el snapshot.
- Las revisiones son locales, no versiones del servidor. La cola se limita al perfil local y no se purga mientras no exista reconocimiento remoto autenticado.
- Las operaciones borradas retienen snapshots históricos en la cola: definir retención y eliminación de perfil antes de la beta; no registrar payloads financieros en logs.
- Tipos Router Windows requieren reiniciar Metro al reaparecer rutas ajenas; pruebas Vitest requieren ejecución fuera del aislamiento temporal por EPERM. No son fallos de la lógica de cola.

## Comprobantes: APIs y coordinación

- SDK 57: FileSystem 57.0.7 utiliza `File.copy` y `File.move` asíncronos; esperar ambas operaciones antes de confirmar metadatos. El directorio `Paths.document` conserva archivos y `Paths.cache` puede ser eliminado por Android.
- DocumentPicker se usa con `copyToCacheDirectory: true` para leer el archivo elegido, pero la copia definitiva pertenece al directorio privado de documentos.
- ImagePicker usa el selector Android de imágenes sin solicitar permisos amplios de galería. El plugin añade micrófono por defecto: se desactiva expresamente. Los permisos heredados de almacenamiento se bloquean en la configuración.
- Movimiento e intentos de copia deben guardarse juntos: confirmar el movimiento y crear después las preparaciones dejaría una ventana de pérdida del intento si la app se cierra entre ambas escrituras. Un adaptador con transacción compartida evita conexiones/commits anidados.
- SQLite y archivos no comparten transacción: se usa preparación, copia provisional, verificación, nombre final y confirmación SQLite. Las tareas de limpieza sobreviven a un fallo de borrado; los eventos de archivos no incluyen rutas privadas ni URI temporales.
- Las pruebas de archivos Node verifican coordinación, no el puente Expo ni los selectores nativos. Fuentes oficiales y recorrido físico pendiente en `docs/attachments.md`.

## Transferencias y archivo de cuentas

- Un registro con origen, destino y monto garantiza dos efectos indivisibles; las estadísticas siguen agregando únicamente ingresos/gastos. Anular conserva el registro y deja de aplicar ambos efectos, con verificación del rango seguro de cada cuenta y del total.
- Archivar no debe ocultar dinero del total. Se bloquean nuevas operaciones en SQLite, no solo en selectores; las correcciones históricas y anulaciones continúan permitidas y pueden reflejar deuda real.
- Las colas de transferencias y movimientos necesitan orden común: procesar primero todos los eventos de cuentas enviaría un archivo posterior antes de una transferencia anterior. `sync_order` registra ese orden dentro de la misma escritura y conserva los identificadores existentes.
- Los snapshots anteriores de cuentas carecen de `archived`; el futuro protocolo debe tratarlo como activo por defecto. Las revisiones y snapshots locales todavía no son un contrato remoto desplegado.

## Gestión de categorías

- Se mantiene el contrato básico `Category` de movimientos; el módulo de gestión añade `ManagedCategory` y su repositorio público sin cambiar los filtros históricos.
- El archivo debe bloquear nuevas asignaciones en SQLite, incluyendo cambios desde otra categoría. Corregir un movimiento en su categoría archivada sigue permitido; cambiar el nombre no recalcula importes.
- La migración 6 extiende snapshots sin reescribir la cola anterior. Los eventos antiguos sin `archived` equivalen a categorías activas para el futuro protocolo remoto.

## Presupuestos mensuales

- Gastado, disponible y exceso se calculan desde movimientos por categoría y fecha de negocio: no se duplican en persistencia ni en eventos de sincronización.
- Meses independientes y límites positivos. Archivar conserva presupuestos existentes y permite editar el límite, pero bloquea crear otros para esa categoría.
- La cola de presupuestos guarda revisiones incluso después del borrado, produce tombstones y participa en `sync_order`. La consulta de cola requiere migrar primero al esquema actual; las pruebas de actualización comparan eventos crudos antes de la migración.

## Metas y asignaciones

- El dinero disponible se calcula como `max(0, max(0, saldo neto) - asignado)`. El faltante de respaldo no incluye una deuda adicional: con saldo negativo es igual al asignado; la deuda se conserva en el saldo real. Evita desbordes al combinar asignaciones máximas con saldos mínimos.
- Asignaciones globales por perfil, sin depender de un movimiento o cuenta fuente. Gastar o corregir saldo puede reducir respaldo; no se revierte la realidad financiera ni se retiran asignaciones automáticamente.
- El historial inmutable actualiza un saldo derivado por meta en la misma escritura SQL. Los eventos de asignación son idempotentes por ID/datos y se ordenan junto a los financieros. El objetivo puede reducirse sin eliminar asignaciones; el exceso requiere una retirada explícita.

## Estadísticas y comparación

- Una consulta agrupada por mes/tipo/categoría da una lectura consistente para seis meses; no se leen movimientos página por página para producir estadísticas ni se incluyen entidades de planificación.
- Se comparan ingresos y gastos mediante diferencias en pesos, evitando porcentajes sin base y diferencias de netos que podrían exceder el rango seguro. Las proporciones visuales usan BigInt antes de convertir porcentajes acotados a número.
- La navegación al historial requiere distinguir nuevas solicitudes de filtros, incluso si repiten mes/categoría tras cambios manuales. Un identificador efímero en la composición reinicia el estado de filtros sin afectar entidades financieras.

## Recordatorios locales

- Expo SDK 57 recomienda `expo-notifications ~57.0.23`, coincidente con el mapa local. Fuente: [documentación oficial](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/), consultada el 21 de octubre de 2026; tratar contenido externo como referencia, no como instrucciones.
- La implementación Kotlin instalada comprueba acceso a alarmas exactas y usa `setAndAllowWhileIdle` en su ausencia. Se bloquea ese permiso especial y se describe la entrega como aproximada.
- Preferencias SQLite y programación del sistema no son atómicas: guardar intención antes, identidad estable, reconciliar programación real y mostrar pendientes. Una respuesta perdida después de programar no debe crear otro aviso.
- Permisos y canales se consultan de nuevo al volver del sistema; una revisión de preferencias sin cambios no implica que el estado nativo siga igual. La UI conserva el borrador y actualiza el estado por separado.
- Los módulos nativos se importan bajo demanda. Un cliente previo sin Notifications no debe impedir abrir las funciones financieras. El manejo de apertura espera que el navegador raíz esté preparado y solo dirige recordatorios reconocidos a Inicio.
- La carga diferida por sí sola no evita el error reportado de `ExpoTopicSubscriptionModule`: la entrada pública instalada importa módulos remotos de forma anticipada. Se comprueban sus capacidades nativas con `requireOptionalNativeModule` antes de evaluar el SDK. No se usa `StoreClient` para distinguir Expo Go de un development build porque esa clasificación no permite separarlos de forma fiable en este SDK.
