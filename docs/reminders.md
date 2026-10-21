# Recordatorios locales

Desde **Inicio → Ajustes de recordatorios** puedes activar o desactivar un recordatorio diario y elegir una hora entre `00:00` y `23:59`. Viene desactivado. **Guardar y aplicar** persiste la preferencia y solicita permiso solo si elegiste activarlo y Android permite volver a preguntar.

El horario sigue la zona del teléfono. La entrega es aproximada y puede retrasarse por ahorro de batería u opciones de Android. Al cambiar de zona, abre Emberly para reconciliar el siguiente aviso con la zona actual. No se solicita acceso a alarmas exactas.

## Privacidad y permisos

El aviso contiene únicamente «Un momento para ti» y «Puedes abrir Emberly y revisar tu día cuando te venga bien.». No incluye montos, cuentas, metas, comprobantes ni datos financieros en su contenido o navegación.

El canal se crea con importancia baja, sin sonido, vibración ni insignias y con visibilidad privada en pantalla bloqueada. Se respetan los cambios que hagas en las opciones del canal de Android. Al tocar un aviso reconocido, se abre Inicio; se ignoran URLs y destinos externos del payload.

Abrir la app, volver al primer plano o comprobar el estado no solicita permisos. Si los deniegas, la preferencia queda guardada, pero la pantalla indica que falta permiso. Puedes usar **Abrir ajustes del teléfono** y habilitar Emberly → Notificaciones. Si solo bloqueaste su canal, se informa por separado. Al volver, se comprueba nuevamente sin descartar el horario que estabas editando.

La configuración no registra tokens Expo/FCM ni usa Firebase, Workers o red. Los toasts siguen comunicando resultados dentro de la app; estas notificaciones son avisos del sistema.

## Persistencia y recuperación

La migración SQLite 9 guarda una preferencia local del dispositivo: activación, hora, minuto y revisión. No se envía a la cola financiera ni se copia entre dispositivos. Repetir valores sin cambios no incrementa la revisión.

SQLite y el programador Android no comparten transacción. Se guarda primero la intención y después se reconcilia:

- **Desactivado:** no queda ninguna programación propia después de confirmar su cancelación.
- **Programado:** se comprobó una única programación diaria propia con horario y contenido actuales.
- **Falta permiso/canal bloqueado:** la preferencia sigue activada, pero no se anuncia una programación utilizable.
- **Requiere cliente de desarrollo:** faltan módulos nativos necesarios para cargar la librería. Se conserva la preferencia y las funciones financieras siguen disponibles.
- **Pendiente:** se guardó la preferencia, pero falló el acceso al programador, la programación o su confirmación. Si falló cancelar, el aviso podría seguir programado; se indica expresamente.

Se reintenta al abrir la app, al volver al primer plano y mediante **Comprobar y reintentar**. No se utiliza un sondeo continuo. Las operaciones de configuración y recuperación se serializan dentro de la app.

Una identidad estable evita duplicar programaciones al reintentar. Los avisos antiguos con el prefijo reservado del recordatorio diario se cancelan; otras notificaciones se conservan. Si la app se cierra después de programar pero antes de confirmar, la recuperación reconoce la programación existente. Si se cierra después de cancelar el horario antiguo, conserva la intención para crear el nuevo al reabrir.

Los estados describen la preferencia y la programación, no garantizan que Android presente el aviso. Cambiar el horario después de una entrega puede producir otra entrega ese día; no se mantiene un registro financiero de notificaciones recibidas.

## Cliente nativo y configuración

Se incorpora `expo-notifications ~57.0.23`, compatible con el mapa local del SDK 57, y su plugin. El manifiesto de la librería declara notificaciones y recepción de reinicio; la aplicación bloquea `SCHEDULE_EXACT_ALARM`. La implementación Android instalada usa programación no exacta cuando no dispone de ese acceso. La introspección de Expo no sustituye revisar el APK final.

Regenera el cliente de desarrollo con `npm run build:android:development` cuando tengas disponible la sesión Expo/EAS e instálalo en el teléfono. Un cliente previo puede carecer del módulo. Antes de importar la librería, el adaptador comprueba los módulos nativos que exige su entrada pública; si falta alguno, Ajustes indica que se necesita un cliente de desarrollo actualizado. El export Android solo verifica el bundle, no la recepción nativa.

La entrada pública instalada también carga APIs remotas, incluido `ExpoTopicSubscriptionModule`. En el Expo Go donde falta ese módulo, importar la librería provoca un error incluso al usar solo recordatorios locales. La comprobación evita evaluar esa entrada incompatible; no supone que todas las notificaciones locales estén deshabilitadas en todas las versiones de Expo Go. Recarga la app para aplicar la corrección.

No se requieren variables de entorno ni credenciales reales. Push remotas, registro de dispositivo, eventos del backend y su configuración Firebase siguen pendientes.

## Verificación

Las pruebas automatizadas usan SQLite real y un puerto nativo sustituido: no prueban la entrega de Android. Cubren horarios, persistencia, revisiones, permisos explícitos, revocación, canal bloqueado, cambios simultáneos, duplicados, conservación de otros avisos, programación/cancelación fallidas, respuesta perdida, recuperación y migración desde esquema 8.

Recorrido pendiente en Android físico con cliente actualizado:

1. Abrir una instalación limpia: recordatorio desactivado y ningún diálogo de permisos al inicio.
2. Activarlo para unos minutos después, guardar y conceder permiso. Confirmar el estado programado; cerrar la app y esperar la recepción.
3. Tocar el aviso con la app cerrada y en segundo plano: debe abrir Inicio una sola vez, sin datos financieros en la notificación.
4. Denegar permiso, volver a guardar cuando Android permita preguntar, y probar la habilitación desde Ajustes del teléfono. Abrir/verificar no debe lanzar diálogos.
5. Cambiar horario, guardar repetidamente y reiniciar la app: debe quedar una programación propia, sin alterar otros avisos.
6. Bloquear el canal, revocar permiso y volver a la app. Revisar mensajes y recuperación al habilitar de nuevo. Desactivar debe cancelar el recordatorio.
7. Reiniciar el teléfono, cambiar zona/horario de verano y probar ahorro de batería; documentar dispositivo, build y retrasos observados. Estas condiciones aún no están verificadas.
8. Revisar ambos temas, TalkBack, fuente ampliada, teclado y conservación del horario ante errores.

Referencia consultada el 21 de octubre de 2026: [Expo Notifications para SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/). Los tipos y la implementación Kotlin instalados se revisaron junto al código; la validación física sigue pendiente.
