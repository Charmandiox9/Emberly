# API REST de Emberly

La API vive en `api/` y usa Cloudflare Workers con Hono. REST sirve para operaciones sobre recursos, lotes de sincronización y autorización de archivos, por lo que no se introduce GraphQL. El contrato inicial está en [api/openapi.yaml](../api/openapi.yaml).

## Implementado

- `GET /health`: estado del proceso, sin datos de infraestructura.
- `PUT /v1/me`: exige un Firebase ID token, valida firma RS256, emisor, audiencia y vencimiento, y crea/reutiliza el perfil mínimo en Neon de forma idempotente. La identidad se toma exclusivamente del `sub` validado.
- Migración PostgreSQL inicial en `api/migrations/0001_app_users.sql`.

Los secretos Neon y el identificador del proyecto Firebase son variables solo de Worker. Nunca se importan al bundle Expo. Aún no se ha creado ni configurado ningún recurso remoto.

## Desarrollo

1. Copiar `api/.dev.vars.example` a `api/.dev.vars` y completar `DATABASE_URL` y `FIREBASE_PROJECT_ID` con datos de desarrollo. `.dev.vars` está ignorado por Git.
2. Aplicar `api/migrations/0001_app_users.sql` en una base de desarrollo Neon.
3. Ejecutar `npm run api:dev` para iniciar Wrangler localmente.
4. `GET http://localhost:8787/health` no necesita token. `PUT /v1/me` requiere un ID token reciente de un usuario autenticado del proyecto Firebase indicado.
5. Ejecutar `npm run api:typecheck`, `npm test` y `npm run api:deploy` solo después de revisar cuenta, variables y destino.

`npm run api:deploy` publica el Worker y necesita una sesión Cloudflare autenticada. No despliega la base automáticamente. Configurar `DATABASE_URL` como secreto/variable sensible y `FIREBASE_PROJECT_ID` como variable de entorno en el Worker antes de publicar.

## Pendiente

Este primer corte no sincroniza datos financieros ni sube archivos. Siguen pendientes el inicio de sesión móvil Google, vinculación explícita de perfil local, API idempotente de sincronización, autorización por propietario de cada recurso, URLs privadas de R2, conflictos/cursor, migraciones PostgreSQL automatizadas y pruebas con servicios de staging.
