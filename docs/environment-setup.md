# Configuración de servicios y variables reales

## Estado actual

La aplicación, su cola SQLite y los comprobantes locales funcionan sin variables de entorno. No necesitas crear ni completar un `.env` para estos incrementos. `.env.example` seguirá describiendo únicamente valores que el código consuma realmente.

Al integrar cada servicio, se actualizarán su plantilla y este documento con nombres definitivos, obligatoriedad y validaciones, y se indicará al usuario qué valores debe completar antes de probarlo. No compartir contraseñas, tokens ni claves privadas por el chat.

## Separación de configuración

| Ubicación                        | Contenido al incorporar el servicio                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `.env.local` de la app Expo      | URL pública de la API y configuración pública necesaria para el SDK de Google/Firebase elegido                        |
| Configuración nativa Android/EAS | Identificadores de cliente, archivo de configuración Firebase si lo requiere el SDK y certificados de firma asociados |
| `.dev.vars` del futuro backend   | Secretos para ejecutar Workers localmente; debe ubicarse junto a la configuración Wrangler                            |
| Secrets de Workers               | Cadena PostgreSQL y credenciales R2 que el backend necesite en el entorno desplegado                                  |
| Configuración Wrangler           | Identificador público de proyecto Firebase, bindings y nombres de recursos, sin contraseñas                           |

Todavía no existe el directorio del backend ni su configuración Wrangler. No crear estos archivos ni instalar CLIs solo para completar campos futuros. Los nombres de variables de ese backend se definirán al implementarlo.

Las variables `EXPO_PUBLIC_*` quedan incorporadas al bundle y son visibles para quien instale la app. Nunca deben contener la conexión de PostgreSQL, un secreto OAuth, una cuenta de servicio Firebase ni claves de R2. [Documentación de Expo](https://docs.expo.dev/guides/environment-variables/).

## Neon: obtener la conexión cuando se implemente PostgreSQL

1. Crear o seleccionar un proyecto en la consola Neon y una rama de desarrollo separada de producción.
2. Abrir **Connect** en el panel del proyecto; elegir rama, base y rol correctos.
3. Copiar la cadena de conexión con TLS. Para tráfico de aplicación, utilizar la conexión agrupada cuando corresponda al adaptador elegido; las migraciones tendrán su conexión/procedimiento documentados por separado.
4. Guardarla únicamente en el entorno del backend. La app Android nunca conecta directamente a PostgreSQL.

La cadena contiene usuario y contraseña. No pegarla en logs, documentación ni argumentos de comandos que la dejen en el historial. [Flujo de ramas y conexiones Neon](https://neon.com/docs/get-started-with-neon/workflow-primer).

## Firebase: preparar Google cuando se implemente el acceso

1. Crear o seleccionar un proyecto en Firebase Console y activar **Authentication → Sign-in method → Google**, con su correo de soporte.
2. Registrar la aplicación Android con el paquete real. Actualmente `app.json` utiliza `com.charmandiox9.emberly`; comprobarlo antes de registrar.
3. Registrar la huella SHA-1 del certificado que firme el build EAS utilizado. Cada certificado de desarrollo, distribución o Google Play puede requerir su huella correspondiente.
4. Descargar el archivo `google-services.json` actualizado si lo necesita el SDK seleccionado. No modificar manualmente sus valores ni introducirlo como una variable de texto.
5. Identificar el cliente OAuth de tipo web que requiera la integración y el ID del proyecto Firebase. Un ID de cliente no es un secreto de cliente: no intercambiarlos.
6. Configurar las rutas/variables exactas que se añadan con la integración, generar un build EAS de desarrollo y probar el inicio real en el teléfono. Expo Go no valida esta integración nativa.

No se necesita descargar una clave privada de cuenta de servicio para que el usuario inicie sesión. La validación de tokens en Workers se implementará con comprobación de firma, emisor, audiencia y vigencia. [Google en Firebase Android](https://firebase.google.com/docs/auth/android/google-signin) y [verificación de tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens).

## R2: preparar comprobantes privados

1. En Cloudflare, activar R2 revisando las condiciones de suscripción/facturación y crear un bucket de desarrollo.
2. Mantenerlo privado: no habilitar acceso público para los comprobantes.
3. Obtener el Account ID y el nombre del bucket. El backend podrá acceder por un binding R2 configurado en Wrangler.
4. Si la implementación utiliza URLs firmadas S3, crear credenciales con permiso de lectura/escritura de objetos limitado al bucket correspondiente. Guardar Access Key ID y Secret Access Key solo en los secretos del backend; la clave secreta debe conservarse cuando se muestra al crearla.
5. Configurar las variables/bindings definitivos al implementar subidas, y verificar autorización, expiración, tamaño y recuperación de subidas interrumpidas.

La app recibe una autorización temporal para un objeto concreto y nunca las credenciales permanentes del bucket. [Inicio con R2](https://developers.cloudflare.com/r2/get-started/), [credenciales S3](https://developers.cloudflare.com/r2/get-started/s3/) y [autenticación R2](https://developers.cloudflare.com/r2/api/tokens/).

## Workers: cargar configuración y secretos

Cuando exista el backend, su guía indicará el directorio desde el que ejecutar Wrangler y contendrá un ejemplo sin secretos. Para desarrollo se completará `.dev.vars`; para despliegue, cada secreto se cargará interactivamente con `wrangler secret put NOMBRE`, sin pegar el valor en el comando. La configuración pública y los bindings quedarán declarados en Wrangler.

Después del despliegue se obtendrá la URL HTTPS del Worker y se configurará en la app como URL pública de API con el nombre definido en `.env.example`. Cada entorno usará su base, bucket y credenciales correspondientes. [Secrets de Workers](https://developers.cloudflare.com/workers/configuration/secrets/) y [variables de Workers](https://developers.cloudflare.com/workers/configuration/environment-variables/).

## Verificación al habilitar servicios

Probar Google → petición autenticada → escritura PostgreSQL → subida y descarga privadas R2. Después repetir con sesión vencida, sin red y con respuesta perdida. Distinguir la configuración introducida de las integraciones que realmente se hayan probado.
