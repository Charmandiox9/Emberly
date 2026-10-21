import { describe, expect, it } from 'vitest';
import { app } from '../api/src/index';

describe('API REST de Emberly', () => {
  it('expone un health check sin autenticar ni exponer infraestructura', async () => {
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', service: 'emberly-api' });
  });

  it('rechaza el perfil cuando no hay token Firebase', async () => {
    const response = await app.request('/v1/me', { method: 'PUT' });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Inicia sesión para continuar.' },
    });
  });
});
