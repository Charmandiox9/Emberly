# Plan de trabajo: Emberly para Android

Fecha de elaboración: 20 de octubre de 2026.

## Objetivo y estado

Entregar una primera versión Android instalable, usable sin conexión, que permita administrar cuentas, ingresos, gastos, presupuestos y metas, consultar estadísticas y recibir acompañamiento positivo de Ember.

La fase 1 mantiene pendiente su validación física; se avanza en las tareas independientes de las fases 2 y 3. Las fases se marcan completas únicamente al cumplir sus criterios de salida. [AGENTS.md](AGENTS.md) define las reglas técnicas y [design.md](design.md) las visuales; este documento registra el orden y el alcance del trabajo.

## Alcance de la primera versión

- Un perfil local, sin registro obligatorio, con datos guardados en el dispositivo.
- Cuentas manuales, saldo inicial, categorías, ingresos, gastos y transferencias.
- Edición de movimientos y eliminación confirmada, recalculando sus efectos.
- Presupuestos mensuales por categoría y metas con asignaciones de dinero.
- Inicio, historial filtrable, estadísticas básicas y opciones para ocultar montos.
- Tema claro y oscuro, accesibilidad y estados de error, vacío y guardado.
- Ember original con expresiones y celebraciones sencillas; evolución basada en hábitos definidos y comprobables.
- Exportación y restauración de respaldo para recuperar datos.
- Comprobantes desde documentos, cámara y galería, conservados localmente hasta confirmar la subida.
- Google y sincronización persistente con PostgreSQL, tolerando backend inaccesible.
- Notificaciones locales configurables y push para eventos remotos definidos.

Hipótesis de alcance: español, moneda inicial CLP y una sola moneda por perfil. El modelo guardará el código de moneda, pero las conversiones y las sumas entre distintas monedas quedan fuera de esta entrega. Moneda, zona horaria y plataforma mínima se documentarán al cerrar la fase 1; CLP es una propuesta, no una preferencia confirmada del usuario.

Fuera de esta entrega: conexión bancaria, inversiones, pagos, suscripciones, presupuestos compartidos, OCR e IA. Los movimientos recurrentes se evaluarán después de estabilizar el registro manual. La mascota 3D compleja no es un requisito para validar los primeros flujos. La ampliación del 20 de octubre incorpora nube, Google, adjuntos y notificaciones; [docs/offline-sync.md](docs/offline-sync.md) especifica los requisitos y distingue lo existente de lo propuesto.

## Secuencia y dependencias

Fase 0 completa → 1 base técnica y dominio → 2 sistema visual → 3 cuentas y movimientos → 3A cola y comprobantes → 3B Google y sincronización → 4 presupuestos y metas → 5 estadísticas y Ember → 6 respaldo y beta Android.

Las pruebas y documentación acompañan cada fase. La fase 6 incorpora verificación de conjunto y recuperación de datos; no concentra toda la calidad al final. Las entregas anteriores a la beta se prueban con información ficticia o prescindible.

### Fase 0: fundamentos y planificación

**Estado:** complete.

- [x] Definir stack base y restricción de trabajar sin Android Studio.
- [x] Crear instrucciones del proyecto y guía de diseño.
- [x] Inicializar Git y configurar el remoto indicado por el usuario.
- [x] Definir alcance, secuencia y criterios de aceptación en este plan.

**Resultado:** documentación y repositorio local preparados. No implica que exista código, un build ni contenido publicado en GitHub.

### Fase 1: base técnica y reglas de dominio

**Estado:** in_progress. **Depende de:** fase 0.

- [x] Revisar Node, gestor de paquetes y espacio disponible; seleccionar versiones compatibles de Expo y dependencias mediante documentación vigente al implementar.
- [x] Crear el proyecto Expo con TypeScript estricto y Expo Router, un único lockfile y configuración Android.
- [x] Configurar lint, formato, chequeo de tipos y herramientas de pruebas unitarias y de integración compatibles con el proyecto.
- [ ] Definir módulos y contratos públicos para cuentas, movimientos, presupuestos, metas y hábitos, sin crear implementaciones vacías para funciones futuras.
- [x] Especificar dinero, redondeo, límites de enteros, fecha de negocio, zona horaria, saldo inicial y transferencias.
- [x] Definir las metas como asignaciones sobre dinero existente: un aporte no crea ingresos ni duplica gastos. Especificar límites, retiros y comportamiento si se modifica un movimiento relacionado.
- [ ] Preparar SQLite, primera migración, control de versión y adaptadores de persistencia; probar apertura, escritura y actualización de la base con el motor real en Android.
- [x] Crear `.gitignore`, `README.md`, documentación de dominio, ADR de arquitectura inicial y `CHANGELOG.md`. Crear `.env.example` documentado al introducir variables; no inventar variables innecesarias.
- [ ] Configurar perfiles EAS de desarrollo, preview y producción. Generar una compilación de desarrollo e instalarla en Android físico para validar el flujo sin Android Studio.

**Criterio de salida:** app base abierta en el teléfono, datos mínimos persistentes tras reinicio, reglas monetarias y fechas con pruebas, comandos de verificación operativos y build Android exitoso identificado. Si falta acceso a EAS o teléfono, registrar qué verificación falta y mantener pendiente el criterio correspondiente.

**Entregable:** base ejecutable y documentación para reproducir el entorno.

**Avance de implementación:** cuentas y sus contratos públicos implementados; los demás módulos se crearán con sus funcionalidades. Primera migración y repositorio probados con SQLite real en Node. Perfiles EAS preparados, pero sin sesión Expo disponible para enviar el build. La verificación del adaptador SQLite, la interfaz y accesibilidad en Android físico siguen pendientes. Se adelantaron el formulario de cuentas, los tokens básicos y los toasts para obtener un primer recorrido funcional, sin dar por terminadas las fases 2 y 3.

### Fase 2: sistema visual y navegación

**Estado:** in_progress. **Depende de:** fase 1.

- [x] Implementar tokens de color, Nunito local, tipografía, espaciado y temas de `design.md`.
- [ ] Crear componentes reutilizables: botones, campos, tarjetas, filas de movimiento, selector de periodo, indicador de progreso y estados de pantalla.
- [ ] Implementar navegación Inicio, Movimientos, Metas y Estadísticas; accesos a presupuestos, cuentas y ajustes.
- [x] Incorporar un adaptador compartido de notificaciones con `sonner-native` y un único `Toaster`, previa comprobación de compatibilidad.
- [ ] Diseñar la primera versión original de Ember y del símbolo de marca. Mantener la dirección 3D como referencia; optimizar tamaño y uso móvil de los assets elegidos.
- [ ] Validar formularios con teclado, áreas seguras, TalkBack, fuentes grandes, ambos temas y movimiento reducido.

**Criterio de salida:** navegación completa y componentes revisados en Android con datos ficticios claramente separados del uso real; errores y estados vacíos comprensibles. Los cambios nativos tienen build compatible y la entrega de código cumple las comprobaciones previas al commit.

**Entregable:** interfaz coherente y componentes listos para conectar a funcionalidades.

### Fase 3: cuentas, movimientos e inicio funcional

**Estado:** in_progress. **Depende de:** fase 2.

- [x] Crear, editar y archivar/reactivar cuentas; conservar saldos e historial y bloquear operaciones nuevas en cuentas archivadas. No se expone borrado de cuentas.
- [x] Administrar categorías de ingreso y gasto: crear, renombrar, archivar/reactivar y conservar referencias de movimientos históricos. Validación física pendiente.
- [x] Registrar, editar y eliminar ingresos y gastos; validar monto, moneda, cuenta, categoría y fecha.
- [x] Registrar y anular transferencias atómicas con auditoría, cuentas diferentes y sin doble conteo; historial separado por mes/cuenta y paginación. Validación física pendiente.
- [x] Mostrar saldos, ingresos/gastos del periodo y movimientos recientes en Inicio; permitir ocultar montos.
- [x] Implementar historial con filtros de periodo, tipo, categoría y cuenta; prever listas extensas sin cargar innecesariamente todos los registros.
- [ ] Probar cálculo de saldo, edición, eliminación, fallos de escritura, doble pulsación de guardar y persistencia tras reiniciar.

**Criterio de salida:** el recorrido crear cuenta → registrar ingreso → registrar gasto → transferir → editar → reiniciar conserva exactamente los saldos esperados, también en modo avión. Una falla de persistencia no anuncia éxito ni deja una transferencia parcial.

**Entregable:** primer incremento funcional para controlar dinero con registros manuales.

### Fase 3A: cola persistente y comprobantes locales

**Estado:** in_progress. **Depende de:** reglas de escritura de fase 3.

- [x] Añadir migración 3 con cola persistente, identificadores de operaciones, revisiones locales y marcas de eliminación; conservar datos existentes y saldos. Las versiones remotas se definirán con el protocolo de sincronización.
- [x] Confirmar cambios de cuentas y movimientos con su operación pendiente en la misma transacción SQLite.
- [x] Extender seguimiento a transferencias como unidad atómica y mantener orden global entre cuentas, movimientos y transferencias pendientes.
- [x] Implementar documentos, cámara y galería con copia persistente privada, metadatos SQLite y recuperación de preparaciones interrumpidas. Validación nativa pendiente.
- [x] Definir límites de cinco archivos de 10 MiB, formatos PDF/JPEG/PNG/WebP, permisos en contexto y manejo de espacio insuficiente; conservar movimientos aunque fallen sus copias.
- [x] Probar reinicios, rollback, duplicados, fallo de cola y migración desde datos existentes con SQLite real en Node.
- [x] Probar fallos de archivos, intentos guardados con el movimiento, recuperación y limpieza con SQLite/archivos reales de Node.
- [ ] Verificar motor Expo, selectores, cámara, compartir, accesibilidad y persistencia en Android físico con cliente nativo actualizado.

**Criterio de salida:** movimiento, comprobante y cola sobreviven al reinicio sin red; un fallo parcial no anuncia un adjunto guardado.

### Fase 3B: Google, PostgreSQL, R2 y sincronización

**Estado:** pending. **Depende de:** fase 3A y configuración de servicios.

- [ ] Confirmados Neon para PostgreSQL, Firebase Auth para Google y R2 para objetos. Workers para API aceptado al continuar con el stack propuesto; verificar cuotas/costes antes de desplegar.
- [ ] Implementar Google con build EAS de desarrollo, separación de perfiles y vinculación explícita de los datos locales.
- [ ] Crear API REST autenticada, contratos/OpenAPI, migraciones PostgreSQL, autorización por propietario e idempotencia transaccional.
- [ ] Sincronizar salida por lotes y descarga por cursor; detectar conflictos y propagar eliminaciones sin sobrescribir cambios locales pendientes.
- [ ] Añadir disparadores por inicio, primer plano, escritura y recuperación de red; reintentos acotados con retroceso, acción manual y estado visible. Evaluar tareas oportunistas de fondo.
- [ ] Autorizar subida/descarga privada R2 con URLs temporales, verificar objetos y finalizar metadatos; recuperar fallos y limpiar huérfanos.
- [ ] Probar respuesta perdida, dos dispositivos, sesión vencida, cuota agotada, aislamiento entre usuarios y subidas parciales.
- [ ] Documentar despliegue y actualizar `.env.example` con cada variable real, separando configuración pública de secretos del servidor.

**Criterio de salida:** crear/editar/eliminar sin conexión y reconectar no duplica efectos financieros; los adjuntos se recuperan desde R2 y ningún usuario accede a recursos ajenos. La indisponibilidad remota permite seguir usando el perfil local existente.

La fase 3A puede avanzar sin servicios contratados; 3B requiere configurar los proveedores confirmados y definir el alojamiento de la API. Preparar la cola antes de extender los módulos financieros. Las funciones locales independientes pueden continuar mientras se configura la nube.

### Fase 4: presupuestos y metas

**Estado:** in_progress. **Depende de:** fase 3. Presupuestos y metas locales implementados; siguen pendientes validación física y servicios de fase 3B.

- [x] Crear y editar presupuestos por categoría y mes; calcular gastado, disponible y exceso desde movimientos reales. Eliminación confirmada sin borrar movimientos. Validación física pendiente.
- [x] Definir y probar meses independientes sin arrastre automático; conservar presupuestos de categorías archivadas y permitir corregir sus límites.
- [x] Crear metas con nombre, monto objetivo y fecha opcional; mostrar asignado, restante y exceso. Validación física pendiente.
- [x] Registrar y retirar asignaciones a metas según las reglas de dominio, sin alterar el saldo total; historial paginado e idempotencia.
- [x] Evitar sobreasignación del disponible global; mostrar faltante tras gastos o correcciones sin bloquear la realidad financiera y permitir retirar asignaciones.
- [x] Actualizar presupuestos ante edición/eliminación o cambio de mes/categoría de movimientos y mostrar disponible/exceso.
- [x] Actualizar respaldo de metas ante edición/eliminación de movimientos o correcciones de saldo y mostrar sus efectos.
- [x] Cubrir con pruebas presupuestos en cruces de mes/año, fechas bisiestas, excedentes, metas completadas, aportes repetidos y cambios del objetivo. Presentación en zona Santiago pendiente de validación física.
- [ ] Verificar en Android los recorridos de presupuestos y metas, incluidos reinicio, modo avión, faltante, doble pulsación y accesibilidad.

**Criterio de salida:** presupuesto y meta se mantienen coherentes con cuentas y movimientos, incluidos sus cambios posteriores. El usuario puede explicar cuánto tiene, cuánto gastó y cuánto asignó sin sumas duplicadas.

**Entregable:** planificación financiera integrada con el registro diario.

### Fase 5: estadísticas, notificaciones y acompañamiento de Ember

**Estado:** in_progress. **Depende de:** fase 4. Estadísticas y recordatorios locales implementados; validación física, push y Ember siguen pendientes.

- [x] Añadir resúmenes por mes, gastos por categoría, comparación en pesos y tendencia de seis meses con valores textuales accesibles. Validación física pendiente.
- [x] Reconciliar cada total y categoría con todas las páginas del historial filtrado; excluir transferencias, saldos iniciales y asignaciones de metas. Accesos al historial con filtros validados.
- [ ] Definir eventos y umbrales de hábitos: primer registro, revisiones y constancia; documentar cuándo se concede cada logro.
- [ ] Implementar expresiones y celebraciones originales de Ember, progresión Chispa → Ember → Flarely y persistencia de logros.
- [ ] Evitar recompensas duplicadas por reintentos, reapertura o edición de un mismo registro. No penalizar dificultades económicas ni ausencia.
- [x] Añadir recordatorio diario local configurable, permisos en contexto, canal privado y contenido genérico; reconciliación persistente sin duplicar programaciones. Build nativo actualizado y validación física pendientes.
- [ ] Añadir push Expo/FCM para eventos remotos definidos, con tokens por usuario/dispositivo y prueba de recepción/apertura en Android físico.
- [ ] Aplicar movimiento reducido y permitir omitir celebraciones. Revisar rendimiento con historial amplio y assets optimizados.

**Criterio de salida:** estadísticas reconciliadas con movimientos y progresión comprobable e idempotente; la mascota no bloquea acciones financieras. El rendimiento se revisa en el dispositivo disponible y queda registrado.

**Entregable:** visión del progreso financiero y experiencia característica de Emberly.

### Fase 6: respaldo, recuperación y beta Android

**Estado:** pending. **Depende de:** fase 5.

- [ ] Exportar respaldo JSON versionado con todas las entidades y relaciones necesarias; explicar que contiene información financiera y si está cifrado.
- [ ] Restaurar con validación previa, detección de referencias inválidas y operación transaccional. Para la primera versión usar restauración por reemplazo confirmado y respaldo previo; la fusión se deja fuera de alcance.
- [ ] Probar exportar → restaurar en una instalación limpia y comparar saldos, movimientos, presupuestos, metas y logros.
- [ ] Incluir comprobantes en el respaldo y definir restauración de identidad, identificadores y cola sin duplicar datos remotos.
- [ ] Probar archivos corruptos, versiones incompatibles e interrupciones sin destruir los datos actuales.
- [ ] Ejecutar el recorrido completo: primer uso, carga manual, planificación, estadísticas, cierre/reapertura, modo avión y recuperación.
- [ ] Revisar accesibilidad, temas, teclado, listas extensas, privacidad de logs y permisos; documentar resultados y límites de lo probado.
- [ ] Preparar iconos, splash, identificador Android y versión; generar APK preview instalable con build exitoso del estado final.
- [ ] Actualizar README, guía breve de uso, respaldo/restauración, notas de versión y problemas conocidos. Entregar APK y evidencia de verificaciones.

**Criterio de salida:** APK instalado en Android físico, flujos críticos y respaldo/restauración verificados, sin fallos críticos de integridad pendientes y documentación reproducible. Preparar el AAB de producción cuando corresponda; publicar en Google Play es una tarea posterior con requisitos propios.

**Entregable:** beta utilizable sin conexión, con sincronización cuando el servicio esté disponible y recuperación local/remota verificada.

## Verificación y cierre de cada incremento

- Las pruebas se entregan junto a las funcionalidades importantes, con fallos, límites y regresiones; usar pruebas de integración contra SQLite real para persistencia y migraciones, además de pruebas unitarias aisladas.
- Registrar comandos, resultados, build y verificaciones manuales en [progress.md](progress.md). Distinguir lo ejecutado de lo previsto o no comprobado.
- Actualizar documentación y `.env.example` cuando corresponda; incorporar migraciones junto a cambios de estructura.
- Antes de un commit de código, cumplir `npm run verify` y el build local `npm run export:android` sobre el estado final según `AGENTS.md`. Un fallo impide el commit hasta corregirlo y verificarlo. El APK nativo EAS y el teléfono no condicionan los commits; conservan sus criterios propios de entrega.
- La carpeta tiene `origin` configurado; aún no se ha consultado el historial remoto. Antes del primer push, inspeccionarlo y reconciliarlo sin sobrescribir contenido ajeno.

## Dependencias externas y riesgos

| Situación                                       | Tratamiento previsto                                                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Poco espacio en PC                              | Evitar SDK/emulador local, usar teléfono físico y EAS; revisar cachés y tamaño de assets                             |
| Cuenta/configuración EAS no comprobada          | Resolver durante fase 1; documentar disponibilidad, colas y costes antes de depender del servicio                    |
| Compatibilidad de librerías nativas             | Comprobar contra la versión Expo elegida y realizar build temprano                                                   |
| Pérdida de datos antes de tener respaldo        | Usar datos ficticios hasta completar fase 6; probar migraciones desde fase 1                                         |
| Reglas de metas ambiguas                        | Cerrar asignación, límites y cambios retroactivos antes de implementar la fase 4                                     |
| Asset original de Ember pendiente               | Crear versión sencilla en fase 2 y mejorarla sin bloquear el control financiero                                      |
| Acceso al teléfono o pruebas manuales pendiente | Solicitar la intervención concreta al llegar a esa verificación; no marcarla completada por una previsualización web |

## Ampliación de alcance: nube y nuevas funciones

Google, PostgreSQL, sincronización, comprobantes y notificaciones se incorporan por solicitud del usuario el 20 de octubre de 2026. Las fases 3A y 3B siguen pendientes; Neon, Firebase Auth, R2 y Workers quedan como stack elegido al continuar; no se han provisionado servicios. La sincronización no reemplaza los respaldos ni garantiza disponibilidad remota ilimitada en planes gratuitos.

## Incidencias y estado de validación

Segundo incremento: 69 pruebas, tipos, lint, formato y export Android aprobados. Se implementaron registro/edición/eliminación de ingresos y gastos, historial filtrable/paginado, saldos actuales y navegación Inicio/Movimientos/Estadísticas. Metas, transferencias y validación física siguen pendientes; no se cierran las fases 1, 2 o 3 por estos avances parciales.

TypeScript, lint, 45 pruebas unitarias/de integración, export Android y 21 comprobaciones de Expo Doctor pasaron durante el primer incremento. Se conservan resultados e incidencias de entorno en `progress.md`. Falta autenticación EAS para generar el APK y acceso al Android físico para validar persistencia nativa, interfaz y accesibilidad; la fase 1 permanece abierta.
