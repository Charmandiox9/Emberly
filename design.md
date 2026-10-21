# Emberly: identidad visual y diseño de producto

## Referencia y alcance

Fuente: [chat compartido «Nombres para app financiera»](https://chatgpt.com/share/6ad7d9d9-3d64-83e8-9e53-adf24ae2d849), incluida la imagen «Guía de marca Emberly: Finanzas que brillan», revisada visualmente el 20 de octubre de 2026.

La imagen muestra una composición crema con logotipo de llama, nombre oscuro y redondeado, acentos naranjas y dorados, una criatura naranja de aspecto 3D y ejemplos móviles de inicio, gastos, metas, recompensas y estadísticas. Combina paneles claros con una pantalla de celebración oscura y luminosa.

Los hexadecimales, Nunito y el eslogan se toman del texto del chat, que permite leerlos con precisión. Los tokens adicionales, tamaños, comportamiento y criterios de accesibilidad de este documento son especificaciones propuestas para implementar esa dirección; no son mediciones extraídas de la imagen. La ilustración es una referencia conceptual y no constituye un conjunto de assets listo para producción.

## Concepto de marca

- **Nombre:** Emberly.
- **Eslogan:** «Pequeños hábitos, grandes fuegos».
- **Personaje:** Ember, compañero de hábitos financieros.
- **Promesa:** ayudar a entender el dinero y avanzar hacia metas mediante decisiones pequeñas y constantes.
- **Personalidad:** cálida, cercana, motivadora y confiable. El contenido financiero debe ser preciso y fácil de consultar.

El fuego representa constancia y progreso. La cantidad de dinero del usuario no determina su valor ni el bienestar de Ember. La mascota acompaña las tareas y las celebraciones sin retrasar el registro o la consulta de información.

## Logotipo e ilustración

- Marca principal: símbolo de llama junto al nombre Emberly, con letras redondeadas de peso alto.
- Variantes: carbón sobre crema, crema sobre carbón y símbolo independiente para icono de aplicación.
- Reserva un margen libre equivalente a la mitad de la altura del símbolo. Mantén proporciones y contrasta el símbolo sobre el fondo.
- El icono móvil debe leerse a tamaño pequeño y prever la máscara de iconos adaptativos Android. Evita texto pequeño dentro del icono.
- Ilustraciones: volúmenes suaves, luz cálida, materiales mates y detalles de brasas contenidos. Usa escenas elaboradas en bienvenida o hitos; en formularios utiliza versiones simples de Ember.
- Diseña silueta, rostro, proporciones y motivos propios para Ember. La referencia de Charmander orienta la calidez y el carácter de fuego; los assets finales deben expresar una identidad original.

## Paleta y tokens

### Colores de marca del chat

| Token | Hex | Uso |
| --- | --- | --- |
| `brand.ember` | `#FF7A3D` | Acción principal, selección y progreso |
| `brand.gold` | `#FFC24B` | Logros, llama y detalles de celebración |
| `brand.cream` | `#FFF1E6` | Fondo principal claro |
| `brand.charcoal` | `#281B14` | Texto principal y fondo oscuro |
| `brand.coral` | `#E8987A` | Acento secundario e ilustraciones |
| `brand.savings` | `#2E6F5E` | Ahorro y confirmaciones positivas |

### Tokens semánticos propuestos

| Rol | Tema claro | Tema oscuro |
| --- | --- | --- |
| `background` | `#FFF1E6` | `#281B14` |
| `surface` | `#FFFAF6` | `#35251D` |
| `surfaceRaised` | `#FFFFFF` | `#422E23` |
| `textPrimary` | `#281B14` | `#FFF1E6` |
| `textSecondary` | `#70584A` | `#D8BFAE` |
| `border` | `#E5CDBD` | `#765D4E` |
| `primary` | `#FF7A3D` | `#FF7A3D` |
| `onPrimary` | `#281B14` | `#281B14` |
| `success` | `#2E6F5E` | `#8ED0B7` |
| `warning` | `#855300` | `#FFC24B` |
| `danger` | `#A52F25` | `#FFB4A6` |

Usa crema y superficies cálidas como base, carbón para jerarquía y naranja como acento dominante. Reserva dorado para hitos; evita que cada tarjeta compita por atención. En oscuro conserva calidez y utiliza las mismas jerarquías semánticas.

Comprueba contraste de las combinaciones reales: al menos 4,5:1 en texto normal y 3:1 en texto grande y controles significativos. Usa carbón sobre botones naranjas; naranja, dorado y coral no son colores de texto pequeño sobre crema. Los bordes decorativos no sustituyen un indicador accesible del control.

## Tipografía y composición

- **Familia:** Nunito, con los pesos necesarios empaquetados para funcionar sin conexión; respaldo en la fuente del sistema.
- **Pesos:** 400 para cuerpo, 600 para etiquetas, 700 para títulos y 800 para saldo o hitos puntuales.
- **Escala inicial:** saldo 32/40, título de pantalla 24/32, sección 20/28, cuerpo 16/24 y texto auxiliar 14/20. Los pares indican tamaño/interlineado en unidades de React Native.
- Permite el escalado de fuentes del sistema y el crecimiento vertical. Los importes deben permanecer legibles sin truncar información esencial.
- Usa cifras tabulares cuando la fuente lo permita; alinea montos comparables y formatea según moneda y configuración regional.
- Base de espaciado: 4, 8, 12, 16, 24 y 32. Márgenes de pantalla de 20 y separación principal entre secciones de 24.
- Radios: controles 12, tarjetas 20, paneles y hojas 28. Usa píldoras para filtros y etiquetas breves.
- Separa tarjetas por espacio, tono o borde sutil. Sombras discretas solo para elementos elevados; limita resplandores a ilustraciones de celebración.

## Navegación y pantallas

Navegación principal: **Inicio, Gastos, Cuentas, Metas y Más**. La referencia muestra cuatro destinos, pero Cuentas debe estar también en la barra principal por solicitud del usuario. «Gastos» permite ver todos los movimientos y filtrar por tipo, cuenta, categoría y periodo. «Cuentas» tiene una pantalla dedicada con edición y acceso al historial filtrado por cuenta. «Más» agrupa Estadísticas, categorías, presupuestos, perfil cuando haya autenticación y ajustes. Las transferencias permanecen dentro del historial de movimientos. Usa icono y etiqueta para cada destino; mantiene «Agregar gasto» e «Ingreso» al alcance en Inicio.

| Pantalla | Jerarquía y contenido |
| --- | --- |
| Inicio | Saludo y bienvenida breve de Ember, saldo con periodo explícito, resumen de ingresos/gastos, acciones rápidas para gasto/ingreso/cuentas y los tres últimos gastos |
| Gastos | Resumen del periodo, acceso al registro, lista con filtros por cuenta/categoría/tipo/fecha, y gráficos accesibles por categoría |
| Cuentas | Saldo actual y estado por cuenta, edición/archivo, y acceso a movimientos filtrados por cuenta |
| Registro | Tipo de movimiento, monto, cuenta, categoría y fecha; detalle opcional y acción de guardar visible |
| Presupuestos | Periodo, límite y gasto por categoría; disponible o exceso explicado con texto |
| Metas | Nombre, monto objetivo, aportado, restante y progreso; acción para registrar un aporte |
| Estadísticas (Más) | Selector de periodo, ingresos y gastos, categorías y tendencias; acceso a valores en texto |
| Hito | Ember y mensaje breve, logro concreto y acción para continuar; aparición puntual y descartable |

El saldo es el dato principal; Ember ocupa una zona secundaria. Distingue visualmente saldo real y dinero asignado a metas. Las barras de progreso muestran monto y porcentaje. Si hay exceso, explica cuánto se superó aunque la barra visual llegue al 100 %.

## Componentes y estados

- **Botón principal:** fondo naranja, texto carbón, altura mínima 48, etiqueta que nombra la acción. Durante guardado evita envíos duplicados y conserva un estado de carga reconocible.
- **Botón secundario:** superficie neutra y texto de alto contraste. Las acciones destructivas usan un tratamiento explícito y confirmación.
- **Campo:** etiqueta persistente, entrada clara, ayuda opcional y error debajo. Montos con teclado adecuado, moneda visible y validación de separadores locales.
- **Movimiento:** icono de categoría, nombre y fecha/cuenta; monto alineado y tipo reconocible por texto o signo, además del color.
- **Gráfico:** etiquetas y leyenda accesibles, misma semántica entre pantallas y resumen textual. Evita depender exclusivamente del color o de tocar un punto pequeño.
- **Toast:** equivalente nativo de Sonner mediante el adaptador compartido; mensaje concreto, sin duplicados, respetando áreas seguras. «Movimiento guardado» o «No pudimos guardar. Inténtalo de nuevo».
- **Vacío:** explica el estado y ofrece la acción siguiente; no inventa saldo, movimientos ni logros.
- **Error:** indica qué falló y cómo reintentar, conservando la entrada del usuario. Un toast no sustituye un error de campo o una recuperación persistente.
- **Sin conexión:** la funcionalidad local sigue operativa; solo muestra advertencia si una acción necesita red. Si existe sincronización, distingue pendiente, sincronizado y error.
- **Privacidad:** ofrece ocultar montos en superficies de resumen sin alterar los datos.

## Ember y gamificación

La imagen presenta poses felices, motivadoras, de celebración y descanso. Utiliza una biblioteca coherente de expresiones y escalas, con silueta legible y sin texto incrustado en los assets.

| Etapa del chat | Significado | Orientación visual propuesta |
| --- | --- | --- |
| Chispa | Primeros pasos | Criatura pequeña, formas simples y llama discreta |
| Ember | Hábitos sostenidos | Más expresividad, postura confiada y accesorios propios |
| Flarely | Hitos de constancia | Silueta más desarrollada y llama más rica; conserva rasgos de familia |

Las reglas comprobables, los umbrales y las acciones reconocidas se documentan en [docs/ember-progress.md](docs/ember-progress.md). El progreso no depende de riqueza ni gasto. No apagues la llama, enfermes al personaje ni retires logros por dificultades económicas o días sin uso. Las celebraciones se pueden omitir.

## Movimiento e interacción

- Feedback de pulsación: 100–150 ms. Transiciones entre estados: 180–250 ms. Celebraciones breves: 400–800 ms, sin bloquear la siguiente acción.
- Anima preferentemente opacidad y transformaciones. El saldo se muestra correcto desde el principio; evita conteos que retrasen su lectura.
- En Inicio, Ember hace una entrada breve al abrir la pantalla y puede responder a acciones puntuales. Evita bucles llamativos durante la consulta; toda animación respeta movimiento reducido. La ilustración PNG es la alternativa fiable mientras no haya un modelo 3D.
- Three.js con `expo-gl` y React Three Fiber puede usarse en React Native, pero requiere un modelo 3D animable. No añadir WebGL al flujo principal hasta prototiparlo con un asset GLB, compilar un development build EAS y verificar fluidez, batería, memoria y alternativa estática en Android físico. Ver [ADR 0003](docs/adr/0003-ember-motion-rendering.md).
- Respeta movimiento reducido: sustituye desplazamientos y rebotes por cambios inmediatos o fundidos discretos y detén bucles decorativos.
- La vibración es opcional, breve y nunca la única confirmación de una acción.

## Voz y accesibilidad

- Español cercano, directo y sin juicios: «Te quedan $20.000 de presupuesto», «Registraste tu primer gasto», «Puedes ajustar tu meta».
- Mantén fechas, moneda y periodo explícitos. No asumas que un signo `$` identifica una moneda en vistas con varias divisas.
- Usa etiquetas accesibles, roles y orden de lectura lógico; comprueba TalkBack, teclado abierto, textos largos y fuentes grandes.
- Áreas táctiles de al menos 48 × 48, con separación suficiente y alternativas a gestos difíciles de descubrir.
- Acompaña ingresos, gastos, alertas y progreso con texto, forma o icono; evita comunicar información solo mediante color, sonido o movimiento.

## Verificación visual por entrega

Revisa en Android físico los temas claro y oscuro, texto ampliado, montos grandes, listas vacías, formularios con error y persistencia tras guardar. Comprueba que el teclado no tape las acciones, que los gráficos permitan leer sus valores y que Ember deje visible la información financiera. Captura las pantallas modificadas cuando haya aplicación ejecutable y registra los dispositivos y estados realmente revisados.

## Interacciones implementadas

- La tarjeta de progreso en Inicio muestra una ilustración original de Ember junto a la etapa y los días activos. El asset se mantiene transparente y optimizado para pantalla móvil; sus variantes de etapa y celebración quedan pendientes.
- Inicio presenta saludo animado una sola vez al entrar, saldo y resumen mensual, accesos directos para registrar gasto/ingreso o abrir cuentas, y los tres gastos más recientes. La entrada usa Reanimated y respeta movimiento reducido; no mantiene un bucle decorativo.
- La barra principal usa Inicio, Gastos, Cuentas, Metas y Más. Estadísticas se abre desde Más; la pestaña Cuentas abre la gestión existente y permite ver movimientos filtrados.

- Los campos de montos CLP usan teclado numérico y los importes se presentan como dígitos sin separadores en el ejemplo del campo. Los saldos iniciales conservan teclado con signo porque aceptan valores negativos.
- Fechas de movimientos, transferencias y metas se eligen con calendario; el recordatorio usa selector de hora de 24 horas. No se incorpora hora a los movimientos mientras el modelo financiero solo persista una fecha.
- Inicio prioriza el saldo total, resume ingresos y gastos en una sola superficie y ofrece accesos compactos a tareas relacionadas. La acción principal crea la primera cuenta si no existe una activa.
- Entrada breve del resumen y respuesta táctil en controles; se respeta la preferencia de movimiento reducido. No se animan las filas de listas ni los cambios de datos frecuentes.
