# ADR 0003: animación y renderizado de Ember en Android

- **Estado:** Aceptado para la primera entrega; prototipo 3D pendiente.
- **Fecha:** 21 de octubre de 2026.

## Contexto

La guía de marca muestra a Ember como personaje 3D expresivo y la pantalla Inicio debe dar una bienvenida cálida. El asset integrado es un PNG 2D transparente; todavía no hay un modelo 3D con esqueleto, clips de animación ni materiales móviles.

Expo ofrece `GLView` mediante `expo-gl` para renderizar gráficos 2D/3D. React Three Fiber documenta su renderer nativo con `@react-three/fiber/native`, apoyado en `expo-gl` y `expo-asset`. Por tanto, Three.js sí es una opción técnica real para Ember en React Native.

## Decisión

Mantener el inicio con ilustración PNG y una entrada breve animada con Reanimated, sin movimiento de fondo permanente. La animación de entrada respeta el ajuste de movimiento reducido del sistema.

Probar Three.js como prototipo independiente cuando exista un modelo GLB animable. No añadirlo al bundle principal ni hacerlo requisito de navegación, registro financiero o Android Go hasta que un development build instalado en teléfono confirme fluidez, consumo razonable de batería/memoria y fallback estático accesible.

## Consecuencias

- Inicio ya puede mostrar una bienvenida animada sin coste de renderizado 3D continuo ni dependencia nueva.
- La versión actual no reproduce las poses de la guía; hacen falta ilustraciones adicionales o un modelo propio para expresiones/animación 3D.
- La decisión sobre Three.js queda abierta a resultados medidos en Android. Expo Go no sustituye la verificación de un development build cuando se incorporen módulos nativos.

## Fuentes técnicas

- [Expo GLView](https://docs.expo.dev/versions/latest/sdk/gl-view/)
- [React Three Fiber: instalación y React Native](https://github.com/pmndrs/react-three-fiber/blob/master/docs/getting-started/installation.mdx)
