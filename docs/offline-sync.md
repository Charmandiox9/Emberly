# Persistencia, sincronización y servicios remotos

Fecha: 20 de octubre de 2026. Estado: requisitos incorporados; Neon, Firebase Auth y R2 confirmados por el usuario; Workers aceptado al continuar con el stack; funcionalidades remotas pendientes de implementación.

## Alcance

La aplicación debe permitir registrar y consultar información sin backend disponible, adjuntar comprobantes desde archivos, cámara o galería, iniciar sesión con Google y recibir notificaciones. PostgreSQL es la base remota preferida y Cloudflare R2 el almacenamiento de archivos preferido por el usuario.

SQLite ya conserva cuentas y movimientos localmente. La migración 3 añade una cola transaccional con snapshots y marcas de eliminación; [ADR 0002](adr/0002-durable-outbox.md) documenta sus límites. La migración 4 incorpora [comprobantes locales](attachments.md), copias recuperables, eventos de archivos y limpieza pendiente. Aún no existen envío/descarga remotos, autenticación ni notificaciones push. Los [recordatorios locales](reminders.md) ya están implementados, con validación física pendiente. Los toasts son mensajes dentro de la app. La [guía de configuración](environment-setup.md) indica cuándo completar valores reales; estos incrementos locales no requieren variables.

## Persistencia local

- SQLite es la base de lectura y escritura de la app, también cuando hay conexión. Los datos permanecen después de sincronizar; la nube permite recuperación y propagación entre dispositivos.
- Copiar adjuntos a un directorio persistente privado de la aplicación antes de confirmar su guardado. Las rutas temporales del selector y la caché del sistema pueden desaparecer y no son almacenamiento definitivo.
- Una escritura financiera y su operación de salida se confirman en la misma transacción SQLite. Usar identificadores estables generados en el dispositivo y una cola persistente de operaciones pendientes.
- Coordinar archivos y SQLite mediante estados de preparación y recuperación: no existe una transacción atómica que abarque ambos. Recuperar preparaciones interrumpidas y limpiar archivos huérfanos sin borrar comprobantes vinculados.
- Mostrar por separado guardado local, pendiente de sincronizar, sincronizado y error que requiere intervención. El fallo de red nunca debe convertir un guardado local exitoso en pérdida del formulario.
- Informar falta de espacio y permitir reintentar. Desinstalar la aplicación o borrar sus datos elimina la copia local: siguen siendo necesarios respaldo y restauración.

## Protocolo de sincronización propuesto

1. Registrar operaciones con identificador idempotente, propietario, entidad, versión base y contenido validado. No depender del reloj del teléfono para ordenar cambios remotos.
2. Enviar lotes acotados a una API REST autenticada. El backend verifica propiedad e integridad y guarda el cambio y su confirmación idempotente en una transacción PostgreSQL. Repetir una solicitud no duplica movimientos ni efectos monetarios.
3. Confirmar localmente solo operaciones reconocidas por el servidor. Si la respuesta se pierde, reenviar el mismo identificador. Respetar dependencias entre cuentas, categorías, movimientos y adjuntos.
4. Descargar cambios mediante cursor asignado por el servidor; aplicarlos y avanzar el cursor en una transacción local. Conservar eliminaciones como marcas sincronizables hasta que la política de retención permita purgarlas.
5. Detectar versiones incompatibles. Una edición financiera simultánea debe producir un conflicto visible, conservando ambas propuestas para resolverlo; no sobrescribir silenciosamente con la última fecha. Mantener cambios locales pendientes al descargar cambios remotos.
6. Sincronizar transferencias como una única operación de dominio, conservando su atomicidad y evitando contarlas como ingresos o gastos.

Disparadores: inicio y regreso al primer plano, nueva escritura, recuperación de red y acción manual. Serializar ejecuciones y usar tiempos máximos, retroceso exponencial con variación aleatoria y límites de lote. Con cambios pendientes, permitir reintentos espaciados mientras la app está activa; evitar consultas constantes cuando no hay trabajo.

Distinguir falta de internet, indisponibilidad real de API/PostgreSQL/R2, sesión vencida, conflicto, rechazo de validación y cuota agotada. Un indicador de conectividad no demuestra que el backend funcione. Respetar `Retry-After`; pausar operaciones que requieren una nueva sesión sin bloquear el uso local.

Las tareas de fondo son oportunistas y dependen de Android, batería y restricciones del fabricante. No prometer vigilancia continua, un intervalo exacto ni sincronización inmediata con la aplicación cerrada o detenida por el usuario. Evitar sondeos que mantengan PostgreSQL despierto innecesariamente.

## Comprobantes de movimientos

- Permitir documentos, fotos de cámara y fotos de galería; solicitar permisos cuando se utilice cada origen y ofrecer alternativas si se deniegan.
- Guardar metadatos en SQLite y después PostgreSQL: identificador, movimiento, propietario, nombre, tipo, tamaño, huella de contenido, ubicación local, clave remota y estado. No almacenar archivos binarios/base64 en filas financieras.
- Validar tipo y tamaño en cliente y servidor; definir límites antes de implementar. Optimizar fotos sin destruir la legibilidad del comprobante y conservar una política explícita para originales y miniaturas.
- Guardar la transacción financiera aunque la subida posterior falle. Mostrar si el comprobante quedó pendiente o falló; reintentar su transferencia de forma independiente.
- Usar un bucket R2 privado. La API autoriza cada operación y entrega una URL de subida o descarga de corta duración; las credenciales de R2 y PostgreSQL nunca se incluyen en la app.
- Verificar la subida antes de marcar el adjunto como disponible y finalizar sus metadatos. Las URLs firmadas por sí solas no sustituyen verificar tamaño y contenido recibido.
- Gestionar cancelación, eliminación durante una subida y limpieza de objetos huérfanos. No eliminar el último archivo local antes de confirmar la copia remota; la liberación posterior de espacio será una opción explícita.
- Incluir adjuntos en respaldo/restauración o indicar inequívocamente los que no se incluyen. JSON solo con rutas locales no constituye un respaldo completo de comprobantes.

## Google y separación de usuarios

Elección confirmada: Firebase Authentication para identidad Google, sin usar Firestore como base financiera. El backend valida el ID token, emisor, audiencia y vigencia, y utiliza el identificador verificado para autorizar recursos; no confía en un usuario enviado en el cuerpo de la petición.

El primer inicio de sesión requiere internet. Un perfil ya conocido puede seguir operando localmente sin conexión; las escrituras remotas esperan una sesión válida. Guardar secretos de sesión con mecanismos seguros compatibles con el SDK elegido.

Mantener separados los datos por perfil. Ofrecer una vinculación explícita de los datos del perfil local al primer usuario autenticado; no subir automáticamente información a una cuenta diferente. Definir cierre de sesión, cambio de cuenta, restauración y eliminación de cuenta antes de habilitar el flujo remoto. No borrar operaciones pendientes al cerrar sesión de manera silenciosa.

Google nativo requiere configuración OAuth, certificados de firma y un build de desarrollo propio. Se conserva EAS y no se requiere Android Studio.

## Notificaciones

- Locales: recordatorios configurables para registrar movimientos y revisar metas; deben poder funcionar sin backend una vez programados.
- Push: mensajes remotos cuando se incorporen eventos que los justifiquen, mediante Expo Notifications/FCM y credenciales del servidor. No depender de push para garantizar la sincronización.
- Pedir permiso en contexto, respetar preferencias y horarios, usar canales Android y mostrar contenido discreto por defecto en pantalla bloqueada.
- Persistir identificadores para no duplicar recordatorios por reintentos; cancelar o actualizar al cambiar la configuración. Asociar y desvincular tokens push por dispositivo y usuario.
- Comprobar entrega y apertura en Android físico con build de desarrollo. Sonner sigue atendiendo únicamente los toasts dentro de la app.

## Servicios propuestos y costes

Recomendación preliminar: API TypeScript con Hono en Cloudflare Workers, PostgreSQL en Neon, Firebase Auth para Google y archivos en R2 Standard. REST se adapta a lotes de sincronización y autorización de archivos; no hace falta incorporar GraphQL para estos flujos. Si se utiliza Prisma, comprobar su adaptador compatible con Workers y Neon y conservar migraciones ejecutadas fuera del móvil.

Cuotas consultadas en fuentes oficiales el 20 de octubre de 2026; deben revisarse al desplegar:

| Servicio                                                               | Nivel gratuito consultado                                                                             | Consecuencia                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Workers](https://developers.cloudflare.com/workers/platform/pricing/) | 100.000 solicitudes/día y 10 ms de CPU por solicitud                                                  | Procesar lotes pequeños y medir validación de tokens y SQL; no asumir compatibilidad de un servidor Node tradicional      |
| [Neon](https://neon.com/pricing)                                       | 100 CU-h al mes y 1 GB por proyecto                                                                   | El cómputo baja a cero en reposo y vuelve a arrancar al recibir consultas; prever latencia inicial y agotamiento de cuota |
| [Firebase](https://firebase.google.com/pricing)                        | Autenticación no telefónica disponible en Spark sin coste; Identity Platform tiene cuotas específicas | Usarlo para identidad; revisar límites aplicables al proyecto al configurarlo                                             |
| [R2](https://developers.cloudflare.com/r2/pricing/)                    | 10 GB-mes, 1 millón de operaciones A y 10 millones B mensuales; salida a internet sin coste           | El exceso de almacenamiento/operaciones se factura; el nivel gratuito aplica a Standard                                   |

R2 requiere activar su suscripción; revisar el método de pago y las condiciones de facturación al habilitarlo. Configurar límites de archivo y seguimiento de uso; una alerta de gasto no equivale a un límite duro.

Alternativa con menos proveedores: Supabase para PostgreSQL, Auth con Google y funciones, conservando R2. Su [plan gratuito](https://supabase.com/pricing) incluye 500 MB de base y 50.000 usuarios activos mensuales, pero pausa proyectos tras una semana de inactividad; esto reduce su encaje con el requisito de acceso continuo sin intervención.

El nivel gratuito no equivale a capacidad ilimitada ni a disponibilidad garantizada. El diseño conserva el funcionamiento local ante suspensión, cuota agotada o mantenimiento. No se han creado cuentas, recursos ni despliegues Neon, Firebase Auth, R2 y Workers quedan como stack elegido al continuar con el plan.

## Validación necesaria

Cubrir reinicio con operaciones pendientes, caída después de aplicar un lote pero antes de responder, solicitudes repetidas, descargas repetidas, cambios en dos dispositivos, eliminaciones, rechazo de permisos, token vencido, aislamiento entre usuarios, subida parcial, archivo faltante y falta de espacio. Verificar también migraciones con datos existentes y restauración con adjuntos. Mantener pruebas de integración contra SQLite y PostgreSQL reales, y pruebas de extremo a extremo de autorización y R2 en un entorno aislado.

## Fuentes técnicas

- [Google en Expo](https://docs.expo.dev/guides/google-authentication/).
- [Verificación de tokens Firebase](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
- [Tareas de fondo Expo](https://docs.expo.dev/versions/latest/sdk/background-task/).
- [Notificaciones Expo](https://docs.expo.dev/versions/latest/sdk/notifications/).
- [URLs firmadas R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).
- [Inicio de R2](https://developers.cloudflare.com/r2/get-started/) y [facturación Cloudflare](https://developers.cloudflare.com/billing/understand/billing-policy/).

Antes de implementar, consultar la documentación correspondiente al SDK 57 del proyecto y verificar compatibilidad nativa; los enlaces generales de Expo pueden mostrar una versión posterior.
