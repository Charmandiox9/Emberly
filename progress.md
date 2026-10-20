# Progreso de Emberly

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
