# Progreso de Emberly

## 20 de octubre de 2026: segundo incremento, movimientos y navegación

- Implementados ingresos/gastos, edición y eliminación confirmada, nueve categorías iniciales, filtros y paginación estable por fecha/ID.
- Inicio calcula saldo actual, ingresos/gastos del mes y cinco movimientos recientes; Estadísticas desglosa gastos por categoría. La administración de cuentas conserva explícitos los saldos iniciales.
- Creados componentes de formulario y navegación por pestañas. El ocultamiento de montos se comparte durante la sesión y las consultas se recargan al recuperar foco, cancelando resultados obsoletos.
- Migración 2 conserva cuentas del esquema anterior. Las escrituras validan referencias y agregados monetarios dentro de transacciones; la apertura de cuentas también protege el total actual contra desbordamiento.
- Pruebas hasta ahora: 69 aprobadas, incluyendo actualización desde esquema 1, rollback de cambios, categorías incompatibles, fechas futuras, filtros, páginas del mismo día y errores de formulario.
- Se conservan pendientes las transferencias, categorías personalizadas, edición/archivo de cuentas, metas y presupuestos. Se adelantó el resumen estadístico básico al integrar los movimientos; las fases no se declaran completas.
- Incidencias corregidas: ColorValue de los iconos de pestañas y dependencias de recarga de consultas. Hubo parches que no coincidieron con líneas formateadas; se reaplicaron tras leer el contexto exacto.
- Expo genera tipos correctos al reiniciar Metro, pero su watcher en Windows incluyó archivos ajenos a las rutas al añadir archivos con el servidor abierto. Se regeneraron desde el árbol completo; no se editaron tipos generados ni se desactivó TypeScript estricto. El puerto 8081 estaba ocupado y se usó temporalmente 8082.
- Verificación final: `npm run verify` aprobado (tipos, lint, formato y 69 pruebas); `npm run export:android` aprobado (1870 módulos, bundle Hermes de aproximadamente 4,2 MB). Sin dependencias nuevas ni variables de entorno adicionales.
- Incremento separado en un commit de dominio/persistencia/pruebas y otro de navegación/interfaz/documentación. El servidor temporal de Metro en 8082 se detuvo tras regenerar tipos.
- Interfaz, teclado, TalkBack y puente SQLite pendientes de validación en Android físico; no se ha generado APK ni hecho push.

## 20 de octubre de 2026: build local y separación de commits

- Ejecutados `npm run verify` y `npm run export:android` antes de guardar los cambios en Git. Ambos pasaron: tipos, lint, formato, 45 pruebas y bundle Hermes Android de 1844 módulos.
- Commit `ac76614`: reglas del proyecto y guía de marca.
- Commit `dad5a00`: base Expo, dominio financiero, cuentas SQLite, interfaz inicial y pruebas; implementación y pruebas se mantienen juntas para conservar un incremento reproducible.
- README, arquitectura, modelo de dominio, CHANGELOG y archivos de planificación se agrupan en el commit documental de esta entrega.
- Al preparar archivos, Git rechazó `expo-env.d.ts` por ser generado e ignorado por Expo. Se excluyó del commit, igual que dependencias, cachés y exportaciones.
- Los resultados anteriores sobre falta de commits son históricos. El APK nativo y las pruebas físicas siguen pendientes de EAS/dispositivo, sin impedir los commits locales con controles aprobados. No se realizó push.

## 20 de octubre de 2026: ajuste del requisito previo al commit

- A solicitud del usuario, `AGENTS.md` exige verificaciones locales y build local (`npm run verify` y `npm run export:android`) para commits de código, sin depender de EAS ni del teléfono.
- README y plan alineados con la regla nueva. Las referencias anteriores a la exigencia de build nativo en este registro describen la política vigente durante aquel incremento, ya reemplazada.
- Cambio exclusivamente documental; verificados formato y coherencia de las instrucciones. No se hizo commit en esta tarea.

## 20 de octubre de 2026: planificación inicial

**Solicitud:** elaborar el plan de trabajo de la aplicación Android.

**Completado:**

- Revisadas las instrucciones técnicas y la guía visual existentes.
- Verificado Git local: rama `master` sin commits, remoto `origin` configurado.
- Elaborado `task_plan.md` con alcance de la beta, siete fases contando preparación, dependencias, tareas y criterios de salida.
- Registrados contexto y supuestos en `findings.md`.
- Incorporadas pruebas y documentación en cada etapa, build Android temprano y respaldo antes de uso con datos reales.

**Verificación:** revisión documental de coherencia con `AGENTS.md` y `design.md`; comprobación de enlaces locales y formato al cerrar esta entrega. Sin pruebas ni build de aplicación: aún no hay código ejecutable.

**Estado:** planificación entregada; implementación pendiente desde la fase 1. No se creó commit ni se hizo push en esta tarea.

**Próximo incremento:** crear la base Expo/TypeScript, acordar reglas iniciales de dominio, configurar verificaciones y obtener el primer build Android de desarrollo.

**Dependencias sin verificar:** herramientas locales, acceso EAS, teléfono físico e historial remoto.

## 20 de octubre de 2026: inicio de la fase 1

- Seleccionado Expo SDK 57 a partir de plantillas oficiales para compatibilidad inicial con Expo Go físico durante la transición SDK 58.
- Instaladas las dependencias base y configurados TypeScript estricto, Expo Router y perfiles EAS. El Node global permanece sin cambios.
- Implementados valores monetarios CLP, fechas de negocio con zona horaria, apertura de cuentas y persistencia mediante contratos independientes de Expo.
- Añadida primera migración SQLite y pruebas para cálculos, fechas, persistencia, rollback y reapertura de archivos; todavía pendientes de ejecución.
- Incidencias: consulta npm aislada falló con `ENOTFOUND`; acceso de red autorizado permitió instalar. Un parche documental no coincidió con una línea completa y se corrigió antes de aplicar el cambio.
- En curso: herramientas de validación, interfaz inicial y documentación de arquitectura/dominio.
- Primera ejecución: TypeScript pasó; Vitest se bloqueó por permisos de renombrado temporal del aislamiento. La ejecución autorizada fuera del aislamiento pasó 43 pruebas.
- Corregidos dos errores de lint (contexto Node en configuración y setters síncronos al iniciar una carga desde un efecto). ESLint 10 resultó incompatible con los plugins Expo; se vuelve a la versión 9 admitida.
- Verificación Expo: 21/21 checks de `expo-doctor` y export Android satisfactorios. Se optimizó después la importación de fuentes para limitarla a cuatro pesos y se verificará otra vez el bundle final.
- EAS: `whoami` devolvió `Not logged in`. El build nativo y la prueba física quedan pendientes de sesión Expo/dispositivo. No se ha realizado commit.

### Cierre del primer incremento

- Interfaz inicial: creación/listado de cuentas CLP, saldo inicial total, ocultamiento de montos durante la sesión, temas claro/oscuro y mensajes de error junto a los campos.
- Añadidos README, ADR, reglas de dominio, CHANGELOG y `.env.example` sin variables artificiales ni secretos.
- El resolvedor TypeScript de imports estaba instalado solo como dependencia anidada de Expo; se declaró directamente para que lint pueda cargarlo desde la raíz. La comprobación de ciclos se limita al código del proyecto, excluyendo dependencias externas.
- El adaptador Expo abre una conexión propia por transacción, activa claves foráneas antes de `BEGIN IMMEDIATE` y cierra siempre la conexión. El motor Node valida migraciones, rollback y repositorios; el puente Expo sigue pendiente de prueba física.
- Los agregados monetarios se calculan fuera de la presentación y usan BigInt internamente para evitar desbordamiento intermedio dependiente del orden.
- Tipos y lint finales: aprobados. Pruebas finales: 45 aprobadas en Node 25.2.1. También se ejecutaron satisfactoriamente las 43 pruebas existentes antes de los dos últimos casos monetarios con Node 24.14.0, sin cambiar el Node global.
- Export Android final: aprobado, 1844 módulos y bundle Hermes de aproximadamente 4,1 MB. Nunito se limita a cuatro pesos. Este resultado no certifica un build nativo.
- Expo Doctor: 21/21 comprobaciones aprobadas. La fase 1 continúa abierta por build EAS y verificaciones en dispositivo. No hubo commit ni push.
- Próxima acción para APK: iniciar sesión con `npx eas-cli login`, vincular mediante `npx eas-cli init` y ejecutar el build de desarrollo. Se puede explorar el incremento con Expo Go mediante `npm run start:go`.

## 20 de octubre de 2026: ampliación de persistencia y nube

- Incorporados al plan Google, PostgreSQL, sincronización tolerante a fallos, comprobantes de archivos/cámara/galería y notificaciones locales/push.
- Creado `docs/offline-sync.md`: almacenamiento persistente, cola transaccional, idempotencia, conflictos, separación de perfiles y subidas privadas a R2.
- Propuesta pendiente de elección: Workers + Neon + Firebase Auth + R2; cuotas contrastadas en fuentes oficiales. Sin servicios provisionados ni funcionalidades remotas implementadas.
- Un parche documental inicial fue rechazado por contexto inexistente en este registro; se reaplicó mediante sustituciones verificadas.
- Entrega documental: no modifica código ni variables de entorno; no requiere build Android.

- Elección posterior confirmada por el usuario: Neon como PostgreSQL, Firebase Auth para Google y R2 para objetos. Workers se explica y evalúa como alojamiento serverless de la API; sin despliegues.

## 20 de octubre de 2026: cola SQLite transaccional

- Implementada migración 3 con snapshots de cuentas, categorías y movimientos; operaciones con identificadores estables, revisiones locales y marcas de eliminación. Los datos anteriores se preparan una sola vez.
- Añadido módulo público de consulta de lotes/contador. Sin envío, confirmación remota ni asignación a usuarios todavía; adjuntos pendientes.
- Creado ADR 0002 y guía `docs/environment-setup.md`; `.env.example` indica que la cola no requiere variables. Se ignoran futuros `.dev.vars` reales.
- Primera ejecución de pruebas bloqueada por EPERM en la caché Vitest del aislamiento. La ejecución autorizada permitió probar SQLite; dos aserciones se ajustaron porque el adaptador Node arroja errores SQL síncronos. Las 83 pruebas pasaron después.
- Reapareció el problema conocido de tipos Expo Router al crear archivos con Metro activo. Se regeneraron mediante una instancia propia en el puerto 8084, luego detenida; TypeScript pasó sin editar tipos generados. La sesión previa del usuario no se modificó.
- Verificación final `npm run verify`: aprobados tipos, lint, 83 pruebas y formato. `npm run export:android`: aprobado, 1871 módulos y bundle Hermes de 4,2 MB. El primer export aislado falló por permiso de escritura del temporal Hermes; la repetición autorizada pasó. Validación física de migración/reinicio y build EAS siguen pendientes; no se generó APK ni se desplegaron servicios.

## 20 de octubre de 2026: comprobantes persistentes

- Implementados documentos, cámara y galería con módulos oficiales SDK 57; PDF/JPEG/PNG/WebP, cinco archivos de 10 MiB por movimiento, vista previa de imágenes, compartir y eliminación confirmada.
- Migración 4 con metadatos, estados de preparación/archivo listo/fallo, eventos de archivos y limpieza durable. El coordinador confirma movimiento, cola financiera e intentos de copia en una transacción antes de iniciar las copias.
- Se comprueban tamaño, cabecera y SHA-256, con archivo provisional y movimiento asíncrono a nombre final. La recuperación repara confirmaciones pendientes y reintenta limpieza; la copia fallida no revierte el movimiento ya confirmado.
- Añadidas pruebas con SQLite y archivos reales de Node: 102 pruebas aprobadas, incluidas recuperación tras reinicio, borrado del original, rollback ante fallo de cola y guardado financiero sin duplicados tras un fallo de comprobante.
- `expo install --check`: dependencias compatibles con el mapa local SDK 57. Introspección de configuración: entradas de eliminación para almacenamiento externo y micrófono; la cámara proviene del manifiesto de ImagePicker. La configuración no sustituye verificar el APK final.
- Incidencias resueltas: regeneración de tipos Router mediante Metro propio en puerto 8084; estilo de texto de sección corregido al token existente; escritura Python de configuración falló y su texto se corrigió con parche UTF-8. No se modificó la sesión Metro previa del usuario.
- Guía `docs/attachments.md`, README, plan, cambios y configuración actualizados. No se añadieron variables reales ni se necesitan credenciales para este incremento.
- Verificación final `npm run verify`: tipos, lint, 102 pruebas y formato aprobados. `npm run export:android`: aprobado, 1913 módulos y bundle Hermes de 4,3 MB. Pendientes EAS/dispositivo para cámara, selectores, compartir, accesibilidad y persistencia nativa; no se han subido comprobantes a R2.

## 20 de octubre de 2026: gestión de cuentas y transferencias

- Añadidas edición de nombre/saldo inicial, archivo/reactivación y estado visible en cuentas. Los saldos archivados siguen en el total; no se admiten operaciones nuevas hacia esas cuentas, pero sí correcciones de movimientos históricos en su cuenta original.
- Implementados registro y anulación de transferencias como unidad atómica, con historial propio, filtros por mes/cuenta y paginación. Sus dos efectos se derivan de una fila; no generan ingresos ni gastos.
- Migración 5 conserva registros y operaciones previas. Añade estado de archivo, transferencias, eventos completos y orden global entre las colas de cuentas/movimientos y transferencias, evitando adelantar un archivo de cuenta a una transferencia anterior pendiente.
- 116 pruebas aprobadas antes de la verificación final: incluyen límites seguros, rollback ante fallo de cola, anulación idempotente, archivo, actualización de cuentas, orden de eventos, migración desde versión 4 y reapertura del archivo SQLite.
- Reemplazado el formulario inicial de cuentas por componentes compartidos, con edición dentro de su tarjeta, saldos actuales e iniciales diferenciados y ocultamiento accesible de montos. Inicio e historial permiten acceder a Transferencias.
- Incidencias: un parche de reemplazo con eliminación/creación simultáneas del mismo archivo fue rechazado y reaplicado secuencialmente. Los tipos Router se regeneraron con una instancia propia Metro en 8084, después detenida. Una revisión automática interrumpió parte de la documentación por límite de uso; se inspeccionó qué archivos se habían aplicado y se completó el resto al continuar el usuario.
- Actualizados plan, modelo de dominio, README, cambios y `docs/finance-operations.md`. No hay variables nuevas ni servicios remotos desplegados. Categorías personalizadas, Google, backend, sincronización remota y pruebas físicas siguen pendientes.
- Verificación final `npm run verify`: tipos, lint, 116 pruebas y formato aprobados. `npm run export:android`: aprobado, 1920 módulos y bundle Hermes de 4,4 MB. Pendientes build EAS y validación en Android físico; no se generó APK ni se desplegaron servicios.

## 20 de octubre de 2026: gestión de categorías

- Implementadas creación, cambio de nombre y archivo/reactivación de categorías iniciales y personalizadas. Pantalla accesible desde Movimientos; el formulario conserva la categoría archivada de un registro histórico y filtra las demás archivadas.
- Migración 6 conserva categorías y eventos previos, añade estado y snapshots completos, protege el tipo y bloquea nuevas asignaciones a categorías archivadas. No se modificaron migraciones anteriores.
- Añadidas pruebas unitarias y de integración con SQLite real: importes, referencias, rollback de cola, revisiones, orden, migración y reapertura.
- La primera ejecución pasó 126 de 127 pruebas: una comprobación de SQL directo asumía rechazo asíncrono, pero el adaptador Node lanza sincrónicamente; se corrigió envolviendo la llamada. Lint aprobado. Los tipos de la ruta nueva requieren regeneración con Metro propio, como en incrementos previos.
- Actualizados README, modelo, ADR, cambios, plan y guía `docs/categories.md`. No se necesitan credenciales ni variables de entorno nuevas.
- Verificación final `npm run verify`: tipos, lint, 127 pruebas y formato aprobados. `npm run export:android`: aprobado, 1926 módulos y bundle Hermes de 4,4 MB. Tipos de rutas regenerados con Metro propio en 8084, luego detenido; no se modificó ninguna sesión previa del usuario. Interfaz y persistencia nativa pendientes de validar en teléfono; no se generó APK ni se desplegaron servicios.

## 20 de octubre de 2026: presupuestos mensuales

- Implementados límites por categoría de gasto y mes, edición y eliminación confirmada. Consulta de gasto desde movimientos reales con disponible, límite alcanzado y exceso. Acceso desde Inicio; barra accesible y ocultación junto con montos.
- Meses independientes sin arrastre. Presupuestos existentes de categorías archivadas conservan gasto y admiten correcciones del límite; no se crean otros para categorías archivadas. Los presupuestos no alteran saldos ni bloquean gastos reales.
- Migración 7 añade presupuestos y cola con snapshots/tombstones, revisiones y orden global; se conservaron las migraciones previas. La prueba de migración de categorías compara eventos crudos antes de migrar para no invocar un adaptador actual sobre un esquema antiguo.
- Primera pasada: 141 pruebas aprobadas, incluidas 14 nuevas de dominio e integración, migración y reapertura. En curso lint, regeneración de rutas, comprobación final y export Android.
- Actualizados plan, modelo, README, cambios, ADR y guía `docs/budgets.md`. No se agregaron dependencias ni variables de entorno; backend y credenciales siguen pendientes.
- Verificación final `npm run verify`: tipos, lint, 141 pruebas y formato aprobados. `npm run export:android`: aprobado, 1933 módulos y bundle Hermes de 4,4 MB. Ruta regenerada mediante Metro propio en 8084, después detenido. Quedan pendientes interfaz y motor Expo en Android físico; no se generó APK ni se desplegaron servicios.

## 20 de octubre de 2026: metas y asignaciones

- Implementadas creación/edición de metas, fecha opcional, asignado/restante/exceso, estado completado derivado y pestaña Metas. Historial paginado de aportes/retiros, sin crear ingresos ni gastos.
- Disponible global validado dentro de transacción; faltante visible después de gastos y correcciones. Con deuda, respaldo cero y asignaciones sin respaldo separadas del saldo. Reducir objetivos conserva auditoría y muestra exceso.
- Migración 8 añade historial inmutable, saldo asignado derivado por trigger y cola de metas/asignaciones con orden global. Reintentos exactos no duplican saldo ni eventos; otra intención con el mismo ID falla.
- Primera pasada: 158 pruebas aprobadas, incluidas 17 nuevas de dominio/integración, límites, rollback, historial, migración y reapertura. En curso lint, regeneración de rutas, verificación final y export Android.
- Actualizados plan, modelo, README, cambios, ADR y `docs/goals.md`. Sin dependencias ni variables nuevas; validación física y servicios remotos pendientes.
- Añadida regresión de rollback del saldo derivado si falla su trigger después de encolar. Pasaron 159 pruebas y el export previo (1942 módulos, 4,5 MB). En revisión se ajustó la auditoría del formulario para generarla en el primer intento de guardado, conservándola al reintentar; se repiten las comprobaciones afectadas y el export sobre ese estado final.
- Estado final: `npm run verify` aprobó tipos, lint, 159 pruebas y formato. `npm run export:android` aprobado: 1942 módulos y bundle Hermes de 4,5 MB. Se regeneraron rutas con Metro propio en 8084 y se detuvo esa instancia; sesiones previas no modificadas. Pendientes motor Expo, interfaz y flujos en Android físico; no se generó APK ni se desplegaron servicios.

## 20 de octubre de 2026: estadísticas y comparación mensual

- Implementados ingresos, gastos, resultado y contador mensuales; comparación en pesos frente al mes anterior, categorías y tendencia de hasta seis meses, incluyendo periodos vacíos.
- Consulta única agrupada por fecha de negocio, con importes seguros y porcentajes visuales por BigInt. Se excluyen saldos iniciales, transferencias, presupuestos y asignaciones; se conservan cuentas/categorías archivadas.
- Accesos a Movimientos desde ingresos, gastos y categorías con filtros de ruta validados. Cada nueva solicitud distingue filtros repetidos y reinicia paginación; volver de editar conserva el historial actual.
- Primera pasada: 173 pruebas aprobadas, incluidas 14 nuevas de dominio/integración y reconciliación con más de 30 movimientos. En curso lint, regeneración de rutas, verificación final y export Android.
- Actualizados plan, README, dominio, cambios y guía `docs/statistics.md`. Sin dependencias, migraciones ni variables nuevas. Interfaz, navegación, gráficos y accesibilidad en Android físico pendientes.
- Verificación final `npm run verify`: tipos, lint, 173 pruebas y formato aprobados. `npm run export:android`: aprobado, 1947 módulos y bundle Hermes de 4,5 MB. Tipos de rutas regenerados mediante Metro propio en 8084 y esa instancia detenida; sesiones previas no modificadas. Sin APK ni servicios desplegados; recorrido físico pendiente.

## 21 de octubre de 2026: recordatorios locales

- Instalado Expo Notifications compatible con SDK 57, plugin y permiso de alarmas exactas bloqueado. Preferencia local desactivada por defecto, horario HH:MM y migración 9, sin cola financiera ni variables reales.
- Servicio serializado de reconciliación: permiso solo por activación explícita, cancelación/programación propias, limpieza de duplicados, recuperación de fallos y respuesta perdida. Contenido genérico, canal privado y silencioso de inicio; apertura fija de Inicio tras reconocer el aviso.
- Ajustes desde Inicio, borrador conservado y estado actualizado al volver de permisos. El módulo se carga bajo demanda; errores nativos no bloquean finanzas. Recuperación al abrir, primer plano y acción manual; sin sondeo continuo.
- Primera pasada: 188 pruebas aprobadas (15 nuevas), con SQLite real y dispositivo sustituido. No se probó recepción real, apertura, zona horaria ni reinicio de teléfono.
- Incidencias corregidas: Expo CLI no admite `install --offline`; se usó `EXPO_OFFLINE=1`. Se corrigieron una importación/entrada de migración duplicadas, estrechamiento de triggers nativos y `sound: false` conforme a los tipos instalados. Se regeneran rutas con Metro propio.
- `expo install --check` aprobó compatibilidad con el mapa local; TypeScript aprobado tras corregir el adaptador. Introspección de permisos revisada sin generar proyecto Android. En curso verificación final y export.
- Documentación, plan, README, cambios y `.env.example` actualizados; falta cliente EAS actualizado y validación Android física. Push y credenciales Firebase siguen pendientes.
- Verificación final `npm run verify`: tipos, lint, 188 pruebas y formato aprobados. `npm run export:android`: aprobado, 2019 módulos y bundle Hermes de 4,6 MB. La introspección confirmó `tools:node="remove"` para alarmas exactas; no verifica el manifiesto del APK final. Metro propio en 8084 detenido tras regenerar rutas; sesiones previas no modificadas. No se generó APK ni se probó entrega/apertura en dispositivo.

## 21 de octubre de 2026: compatibilidad de recordatorios con el cliente nativo

- Corregido el error reportado de `ExpoTopicSubscriptionModule`: la entrada pública de Notifications carga también módulos remotos. Se comprueban capacidades antes del import, incluyendo el observador de apertura, sin suprimir errores ni modificar dependencias instaladas.
- Ajustes muestra un estado específico cuando requiere un cliente actualizado; conserva la intención persistida y permite continuar usando las funciones financieras. Sin cambios de esquema, dependencias ni variables de entorno.
- Regresión reproducida antes del cambio mediante un módulo ausente simulado en la frontera de importación; se añadieron cinco casos para módulos ausentes, todas las vías nativas, persistencia SQLite y cliente con capacidades completas. No se reprodujo en dispositivo físico.
- La primera verificación detectó anotación de importación de tipo y orden de imports contrarios al lint; corregidos con imports estáticos exclusivos de tipos y orden al inicio del archivo. El export Android aprobó 2019 módulos y bundle Hermes de 4,6 MB; en curso verificación completa final.
- Verificación final aprobada: TypeScript, lint sin advertencias, 193 pruebas en 21 archivos y formato. Las cinco regresiones nativas también pasaron de forma aislada. Las importaciones de tipos se unificaron para cumplir la regla de duplicados. Metro propio detenido; sesiones previas conservadas. Entrega y apertura en Android físico pendientes; no se generó APK.

## 21 de octubre de 2026: revisión y preparación de commits

- Revisados cambios con y sin seguimiento respecto a `ff9acbf`, contrastando reglas y especificación local. Se revisaron fronteras financieras, transacciones, migraciones, comprobantes, cola, navegación y notificaciones.
- Detectada pérdida de un punto porcentual por coma flotante en presupuestos y metas: 29/100 mostraba 28 % y 57/100 mostraba 56 %. Cuatro regresiones reprodujeron el fallo; se sustituyó el cociente por BigInt, sin alterar montos guardados.
- Corregida la guía de sincronización que todavía afirmaba ausencia de notificaciones del sistema: existen recordatorios locales, quedan pendientes push y validación física.
- Verificación final para los commits: `npm run verify` aprobado con TypeScript, lint sin advertencias, 197 pruebas en 21 archivos y formato. `npm run export:android` aprobado con 2019 módulos y bundle Hermes de 4,6 MB. Sin APK ni validación física; servicios remotos pendientes. Cambios agrupados en reglas, implementación integrada con sus guías y cierre documental; no se hizo push.

## 21 de octubre de 2026: exportación de respaldo local

- Añadida exportación JSON versionada desde Ajustes. Reúne todas las tablas y colas en una transacción SQLite; incluye preferencias y comprobantes listos, que se vuelven a validar por SHA-256. Si falta un archivo o su copia está incompleta, cancela el respaldo.
- El diálogo de Android permite guardar o compartir el archivo. La pantalla informa que el contenido financiero y los comprobantes no están cifrados. La restauración y la validación física siguen pendientes; no se debe eliminar la app confiando solo en la exportación.
- TypeScript, lint sin advertencias, formato y `npm run export:android` aprobados; bundle Hermes de 4,6 MB con 2024 módulos. El primer export falló al escribir archivos temporales restringidos; el reintento autorizado pasó. No se agregaron ni ejecutaron pruebas automatizadas en este incremento. Restore/import y validación física siguen pendientes.

## 21 de octubre de 2026: restauración de respaldo local

- Ajustes permite elegir un JSON y exige generar/compartir un respaldo de seguridad antes de confirmar la sustitución. Tras restaurar, vuelve a Inicio para recargar los datos.
- La importación valida versión de esquema, tablas/columnas, valores, referencias de archivos y SHA-256; restaura tablas y colas en una transacción y prepara los comprobantes antes del cambio. Un manifiesto durable permite recuperar archivos tras el cierre inesperado.
- Documentación y plan actualizados. Pendiente ejecutar chequeos y export Android; no se agregaron ni ejecutaron pruebas automatizadas en este incremento. Validación en dispositivo físico pendiente.
- Endurecida la creación del manifiesto: se escribe en un temporal y se mueve antes de iniciar el reemplazo, conservando intactos los datos si la preparación del registro se interrumpe. TypeScript, lint, formato, `git diff --check` y `npm run export:android` aprobados; 2024 módulos y bundle Hermes de 4,6 MB. No se agregaron ni ejecutaron pruebas automatizadas. La restauración real, interrupciones y recuperación requieren aún validación en Android físico.

# 21 de octubre de 2026: formularios e interfaz de inicio

- Montos usan el teclado numérico. Movimientos/transferencias limitan el calendario a hoy o antes; metas mantienen fecha opcional; recordatorios permiten elegir hora en formato 24 h.
- Se actualizó el resumen de inicio, navegación de accesos y filas del historial, además de feedback táctil y foco con respeto a movimiento reducido.
- TypeScript, lint, formato, `git diff --check` y export Android aprobados. La suite pasó 197 pruebas en 21 archivos; Expo exportó 2025 módulos con bundle Hermes de 4,7 MB. La primera ejecución de Vitest falló al renombrar temporales de Windows; el reintento con permisos temporales ampliados pasó. Revisión visual en Expo Go/teléfono pendiente.

# 21 de octubre de 2026: compatibilidad de easing

- El reporte confirmó que Reanimated rechaza la función `cubic-bezier` CSS de los estilos animados de botones y campos. Se cambió a `ease-out`, entre las curvas predefinidas soportadas.
- TypeScript y lint aprobados; `npm test` pasó 197 pruebas tras reintento autorizado; `npm run export:android` aprobó con 2025 módulos y bundle Hermes de 4,7 MB. Falta comprobar que Inicio renderiza y que botones/campos animan en Expo Go.

# 21 de octubre de 2026: host Compose y navegación

- Los selectores Material 3 ahora se montan dentro de `<Host matchContents>`, sin una vista nativa intermedia entre Host y el diálogo Compose.
- Añadida pestaña «Más» para cuentas, categorías, presupuestos y ajustes; se reduce la lista de accesos de Inicio y las transferencias quedan junto a Movimientos. Documentada la organización de pestañas.
- TypeScript, lint, formato y diff aprobados; 197 pruebas pasaron en 21 archivos y export Android aprobada con 2027 módulos y bundle Hermes de 4,7 MB. Falta confirmar los dos selectores y la pestaña Más en Expo Go.
