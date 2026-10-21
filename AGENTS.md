# Emberly: instrucciones para agentes

## Alcance y contexto

- Estas reglas se aplican a todo el proyecto. Conserva el trabajo existente del usuario y limita cada cambio a la tarea solicitada.
- Al modificar archivos existentes, aplica cambios puntuales: añade o edita únicamente las líneas necesarias y conserva el contenido que sigue siendo válido. No elimines y vuelvas a insertar líneas sin cambios ni reemplaces un archivo completo para una modificación parcial. Revisa el diff para evitar reescrituras, reordenamientos o cambios de formato ajenos a la tarea.
- Emberly es una aplicación Android de finanzas personales: cuentas, movimientos, presupuestos, metas y seguimiento de hábitos con la mascota Ember.
- Base acordada: React Native, Expo y TypeScript estricto. Desarrollo en VS Code, pruebas en teléfono físico y compilaciones Android en la nube con EAS; no exigir Android Studio ni emulador local.
- Primera versión local y funcional sin conexión. Backend, autenticación y sincronización se incorporan cuando una funcionalidad los requiera.
- Antes de diseñar o modificar interfaces, componentes, textos de producto o animaciones, lee [design.md](design.md), fuente de verdad visual.
- Comunícate y escribe documentación y textos de producto en español. Usa inglés para identificadores de código.

## TypeScript y contratos

- Activa `strict`, `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`. Mantén el chequeo de tipos sin errores.
- Prohibido introducir `any`, explícito o implícito, también en pruebas. Para datos desconocidos usa `unknown` y valida antes de acceder.
- Declara interfaces con nombre para modelos de objetos, props, DTO y contratos entre módulos. Usa `type` para uniones discriminadas, alias primitivos y tipos derivados que no puedan expresarse con interfaces.
- Tipifica parámetros y retornos de funciones públicas. Reutiliza contratos existentes y los generados a partir de schemas; evita duplicarlos manualmente.
- Evita aserciones que oculten errores (`as unknown as`, aserciones no nulas y supresiones de TypeScript). Resuelve la causa mediante validación y estrechamiento de tipos.
- Valida en ejecución las entradas de formularios, API, almacenamiento e importaciones: los tipos estáticos no validan datos externos.

## Arquitectura y dependencias

- Aplica Clean Code y SOLID con funciones pequeñas, nombres de dominio y responsabilidades claras. Introduce patrones de diseño cuando resuelvan un problema concreto; evita abstracciones sin un uso real.
- Organiza por funcionalidad. Separa reglas de dominio, casos de uso, adaptadores de persistencia/red e interfaz según crezca cada módulo.
- El dominio debe ser TypeScript puro, independiente de React, Expo, SQLite, Prisma y del transporte HTTP.
- Expón contratos públicos por módulo. Evita importaciones de detalles internos de otro módulo y dependencias circulares.
- Accede a almacenamiento, reloj y servicios externos mediante contratos sustituibles cuando sean necesarios para aislar lógica y probarla.
- Mantén la lógica financiera fuera de componentes y hooks de presentación. Los componentes coordinan interacción y muestran resultados.
- Añade dependencias solo para una necesidad demostrable. Comprueba compatibilidad con el SDK de Expo, mantenimiento, licencia y coste nativo; reutiliza las existentes y conserva un único lockfile.

## Integridad financiera y datos locales

- Representa el dinero con monto entero en unidades mínimas y código de moneda. Respeta la precisión de cada moneda; CLP tiene cero decimales. Verifica límites de enteros seguros y define redondeo explícito.
- Una transferencia entre cuentas no es un ingreso ni un gasto. Sus dos movimientos se guardan de forma atómica y se revierten juntos.
- Diferencia saldo inicial, movimientos y aportes a metas; evita contar dos veces el dinero destinado a una meta.
- Guarda fechas de negocio explícitas y distingue estas de los instantes de auditoría. Calcula periodos con la zona horaria configurada, sin depender de la del servidor.
- Persiste con SQLite en móvil. Incluye migraciones versionadas, transacciones para escrituras relacionadas y pruebas de actualización desde una versión anterior.
- Confirma el guardado persistente antes de anunciar éxito. Maneja errores sin perder los datos que el usuario estaba ingresando.
- Las importaciones deben validarse antes de aplicarse y ser transaccionales. Define cómo detectar duplicados y cómo exportar/restaurar respaldos.
- Si se añade sincronización, define reintentos idempotentes, cola persistente y resolución de conflictos antes de habilitar escrituras remotas.

## Backend y contratos de API

- Para cada nueva operación de backend, evalúa REST o GraphQL según consumidores, consultas, caché y complejidad. Reutiliza el transporte existente cuando cubra la necesidad y documenta la elección; evita crear dos APIs para la misma operación.
- Prefiere REST para operaciones sobre recursos, archivos y webhooks; considera GraphQL cuando haya consultas relacionadas y variables que justifiquen su coste.
- Documenta REST mediante OpenAPI y GraphQL mediante su schema. Mantén contratos, validaciones y clientes tipados alineados.
- Define paginación, errores estables y reglas de autorización. Si hay usuarios, verifica propiedad de los recursos en el servidor y prueba aislamiento entre cuentas.
- Separa los DTO y modelos de persistencia de las entidades de dominio. Prisma se ejecuta en el backend, no dentro de la aplicación Expo.

## Prisma y migraciones, cuando exista backend con Prisma

- Todo cambio de estructura de `schema.prisma` debe incluir una migración versionada en el mismo cambio. Actualiza y valida el cliente generado.
- Genera migraciones en desarrollo con el flujo de Prisma Migrate y aplícalas en despliegues con `prisma migrate deploy`.
- Revisa el SQL generado, efectos sobre datos existentes, índices y restricciones. Para cambios destructivos prepara una migración de datos y una estrategia de recuperación.
- Conserva las migraciones aplicadas; corrige mediante una nueva migración. No sustituyas migraciones por `db push` o reinicios de bases compartidas.
- Prueba tanto una base vacía como la actualización de una base con datos representativos. La regla de Prisma no sustituye las migraciones SQLite del móvil.

## Pruebas y verificación

- Acompaña cada funcionalidad importante con pruebas unitarias de dominio y pruebas de integración de sus fronteras reales.
- Prioriza montos, redondeo, saldos, transferencias, presupuestos, metas, fechas, migraciones, importación/restauración y autorización cuando exista backend.
- Para regresiones, añade una prueba que reproduzca el fallo. Incluye casos límite y caminos de error; no pruebes solo el caso exitoso.
- Usa almacenamiento o base de pruebas aislados para integración. Sustituye servicios externos y controla reloj, zona horaria y aleatoriedad para resultados deterministas.
- Verifica formularios y flujos críticos desde la interfaz; comprueba guardado tras reiniciar la app, comportamiento sin conexión y accesibilidad en Android físico.
- Ejecuta los scripts reales del proyecto. Nunca declares que una prueba, build o comprobación de dispositivo pasó si no se ejecutó con éxito.

## Interfaz y notificaciones

- Usa los tokens y componentes de `design.md`; contempla estados vacío, carga, error, éxito y sin conexión.
- Utiliza `sonner-native` como equivalente móvil de Sonner, verificando compatibilidad antes de instalar. Centraliza un único `Toaster` y un adaptador de notificaciones para mantener a los módulos desacoplados de la librería.
- Los toasts comunican resultados breves y pueden ofrecer deshacer. Los errores de formulario se muestran junto al campo; las decisiones destructivas requieren una confirmación persistente.
- Respeta áreas seguras, teclado, lector de pantalla, tamaño de fuente del sistema y preferencia de movimiento reducido.

## Privacidad y seguridad

- Mantén secretos y credenciales de servidor fuera del código, bundle móvil y repositorio. Las variables públicas de Expo no son secretas.
- Evita registrar montos, notas financieras, tokens y datos personales en logs o telemetría. Usa datos ficticios en ejemplos y pruebas.
- Conserva credenciales de sesión en almacenamiento seguro de la plataforma cuando existan. El almacenamiento SQLite común no implica cifrado de la base.
- Añade permisos Android solo al implementar la función que los necesita y explica su finalidad al usuario.

## Documentación y commits

- Actualiza documentación en cada entrega que cambie comportamiento, configuración, contratos, persistencia o diseño. Incluye instalación, ejecución y verificación cuando se configure la aplicación.
- Mantén `.env.example` actualizado en el mismo cambio que agregue, renombre o elimine variables de entorno. Documenta su propósito, si son obligatorias u opcionales y los valores predeterminados aplicables; usa valores ficticios o campos vacíos para secretos y conserva los archivos `.env` reales fuera del repositorio.
- Documenta decisiones arquitectónicas relevantes y alternativas en `docs/adr/`; procedimientos y modelo de dominio en `docs/`; evolución funcional en `CHANGELOG.md` cuando comiencen las entregas de código.
- Antes de cada commit: revisa el diff, ejecuta formato/lint, chequeo de tipos, pruebas relevantes y build de los componentes afectados. Corrige fallos y repite las verificaciones afectadas antes de hacer el commit.
- Para cambios móviles, el build requerido antes del commit es el build local del proyecto: actualmente `npm run export:android`, junto con las verificaciones de `npm run verify`. Ambos deben pasar sobre el estado final; si cambias código o configuración después, repite las comprobaciones afectadas. El chequeo de tipos por sí solo no sustituye el build.
- La compilación nativa Android mediante EAS/CI y las pruebas en dispositivo se validan para entregas instalables o cambios nativos cuando corresponda; no son requisitos para hacer commits. Documenta si están pendientes, sin presentar un export local como un APK compilado.
- Para cambios exclusivamente documentales, ejecuta las comprobaciones documentales disponibles; no requieren compilar una aplicación sin cambios. Antes del scaffold, reporta que el build todavía no existe.
- Si falla el build local o alguna verificación obligatoria, corrige el error y verifica de nuevo antes del commit. Si no puedes ejecutarlos, deja el trabajo preparado e informa qué falta; la ausencia de sesión EAS o de un teléfono no bloquea un commit cuyos controles locales pasaron.
- Usa commits enfocados con formato Conventional Commits. Incluye solo archivos de la tarea y nunca secretos, builds ni dependencias instaladas. La regla previa al commit no obliga a crear un commit en cada tarea.

## Graphify

- Cuando el usuario escriba `/graphify`, lee y sigue primero la habilidad instalada de Graphify.
- Ubicación indicada por el usuario: `~/.Codex/skills/graphify/SKILL.md`. Si no existe, busca la instalación en `~/.agents/skills/graphify/SKILL.md`. Si falta, informa la limitación sin inventar resultados de análisis.
