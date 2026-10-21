import { neon } from '@neondatabase/serverless';
import { Hono } from 'hono';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface ApiBindings {
  readonly DATABASE_URL: string;
  readonly FIREBASE_PROJECT_ID: string;
}

export interface AuthenticatedUser {
  readonly uid: string;
}

interface ApiVariables {
  user: AuthenticatedUser;
}

type ApiEnvironment = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};

const firebaseKeys = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export const app = new Hono<ApiEnvironment>();

app.onError((_error, context) =>
  context.json(
    { error: { code: 'INTERNAL_ERROR', message: 'No pudimos completar la solicitud.' } },
    500,
  ),
);

app.get('/health', (context) => context.json({ status: 'ok', service: 'emberly-api' }));

app.use('/v1/*', async (context, next) => {
  const authorization = context.req.header('Authorization');
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match?.[1])
    return context.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' } },
      401,
    );
  try {
    const { payload } = await jwtVerify(match[1], firebaseKeys, {
      issuer: `https://securetoken.google.com/${context.env.FIREBASE_PROJECT_ID}`,
      audience: context.env.FIREBASE_PROJECT_ID,
      algorithms: ['RS256'],
      maxTokenAge: '1h',
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128)
      return context.json(
        { error: { code: 'UNAUTHENTICATED', message: 'La sesión no es válida.' } },
        401,
      );
    context.set('user', { uid: payload.sub });
    await next();
  } catch {
    return context.json(
      { error: { code: 'UNAUTHENTICATED', message: 'La sesión venció o no es válida.' } },
      401,
    );
  }
});

app.put('/v1/me', async (context) => {
  try {
    const sql = neon(context.env.DATABASE_URL);
    const user = context.get('user');
    const rows = await sql`
      INSERT INTO app_users (firebase_uid)
      VALUES (${user.uid})
      ON CONFLICT (firebase_uid) DO UPDATE SET last_seen_at = now()
      RETURNING firebase_uid
    `;
    if (rows.length !== 1)
      return context.json(
        { error: { code: 'PROFILE_UNAVAILABLE', message: 'No pudimos cargar tu perfil.' } },
        503,
      );
    return context.json({ data: { uid: user.uid } });
  } catch {
    return context.json(
      { error: { code: 'PROFILE_UNAVAILABLE', message: 'No pudimos conectar con tu perfil.' } },
      503,
    );
  }
});

export default app;
