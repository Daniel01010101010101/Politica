# Centro de Inteligencia Política · Colombia

Tablero de seguimiento político que lee las fuentes originales, las clasifica y las
convierte en un parte diario. Está pensado para publicarse en GitHub Pages y
actualizarse solo **dos veces por hora**, a los minutos :17 y :47 de Bogotá.

No hay una sola noticia escrita a mano en el código. Todo lo que ve el tablero llega
de los feeds y las APIs que aparecen en `assets/js/config/sources.js`.

---

## Cómo llegan los datos

El sistema tiene dos rutas, y usa la primera que funcione.

**Ruta A — recolector en el servidor (la recomendada).**
Una acción de GitHub corre `collector/collect.js` a los minutos :17 y :47
(`17,47 * * * *` en UTC; como Colombia no cambia de hora, son los mismos minutos en
Bogotá). Dos citas por hora, y fuera del minuto en punto, porque los cron de GitHub
se retrasan o se saltan en `:00`, que es su minuto más congestionado: si una cita se
pierde, la siguiente recoge. El script lee cada fuente, normaliza, deduplica y escribe `data/latest.json` más el
archivo del día en `data/history/` —que se reescribe en cada pasada con todo lo
publicado en la jornada—. Después hace *commit*. El navegador solo lee ese JSON: no
hay CORS, no hay límites de proxy y funciona aunque nadie tenga el tablero abierto.

**Ruta B — lectura directa desde el navegador.**
En «Fuentes y ajustes» puede activar la lectura directa: el navegador pide los RSS a
través de un proxy CORS. Sirve para refrescar entre cortes. Los proxies públicos
limitan peticiones; para uso serio despliegue el suyo (`docs/DESPLIEGUE.md`).

Con el tablero abierto, el navegador sigue el mismo reloj: relee la instantánea al
llegar la hora en punto y también al volver a la pestaña si entre tanto se pasó un
corte. El botón **Actualizar ahora** fuerza el ciclo completo en cualquier momento,
use la ruta que use.

**Si el cron de GitHub no arranca**, y es frecuente que no lo haga durante las
primeras horas o días de un repositorio, monte el disparador externo de
`docs/DISPARADOR-EXTERNO.md`: un servicio de cron ajeno a GitHub le ordena al
recolector que corra, por API. Cinco minutos de configuración y deja de depender
del programador de GitHub.

Cuando la cadena se rompe, el tablero lo dice: si pasan tres lecturas sin datos
nuevos, el sello de la esquina inferior izquierda se pone ámbar y avisa. No hay
que ir a mirar los registros para enterarse.

El «parte del día» del módulo 11 sigue anclado a la jornada de Bogotá: las lecturas
nocturnas suman al archivo del día correcto, no al del día siguiente en UTC.

## Qué hace con ellos

Todo el análisis ocurre en su navegador, sobre el texto que devuelven las fuentes:

| Paso | Dónde | Qué hace |
|---|---|---|
| Deduplicación | `core/nlp.js` → `huella()` | Une la misma noticia publicada por varios medios y cuenta cuántos la replican |
| Sentimiento | `core/nlp.js` → `sentimiento()` | Léxico en español de ~200 términos políticos, con negación («no hubo escándalo») e intensificadores |
| Entidades | `core/nlp.js` → `detecta()` | Reconoce actores, partidos y entidades por nombre y alias |
| Temas | `core/nlp.js` → `detectaTemas()` | Dieciséis temas vigilados con peso de severidad |
| Impacto | `core/nlp.js` → `impacto()` | Puntaje 0–1: fuente 20 %, actor 22 %, tema 26 %, corroboración 12 %, recencia 10 %, carga emocional 6 %, alerta 4 % |
| Resumen | `core/nlp.js` → `resumen()` | Extractivo: escoge las frases más densas del propio despacho, no redacta texto nuevo |

El puntaje de impacto es auditable: pase el cursor sobre la barra de cualquier
despacho del módulo 1 y verá los cinco componentes que lo produjeron.

## Los trece módulos

| | Módulo | Responde a |
|---|---|---|
| 01 | Resumen del día | Qué pasó y qué pesa |
| 02 | Radar presidencial | Cuánto se habla del Ejecutivo y en qué tono |
| 03 | Congreso | Qué avanza, qué se traba, qué se hunde |
| 04 | Partidos | Quién ocupa espacio y quién lo pierde |
| 05 | Bogotá | Alcaldía, Concejo y los seis ejes del Distrito |
| 06 | Sentimiento | Cómo se habla de cada actor, partido y entidad |
| 07 | Tendencias sociales | Qué términos se aceleran esta semana |
| 08 | Nube de palabras | Vocabulario dominante en 24 h, 7 y 30 días |
| 09 | Mapa de actores | Quién aparece con quién |
| 10 | Alertas tempranas | Qué exige atención hoy |
| 11 | Base histórica | Cómo se compara con la semana, el mes y el año |
| 12 | Lectura estratégica | Riesgos, oportunidades y escenarios |
| 13 | Cronología por horas | Qué acaba de pasar, del más reciente al más antiguo |

El módulo 12 no consulta ningún modelo de lenguaje. Aplica reglas explícitas sobre
los indicadores medidos y cada afirmación enlaza los despachos que la sustentan.

## Estructura

```
.
├── index.html                     tablero completo
├── assets/
│   ├── css/styles.css             sistema visual
│   └── js/
│       ├── config/sources.js      ← fuentes, actores, partidos, temas
│       ├── core/nlp.js            motor de análisis en español
│       ├── core/store.js          IndexedDB (histórico) + LocalStorage
│       ├── core/fetcher.js        lectura de instantánea y de RSS
│       ├── core/scheduler.js      relectura cada hora en el navegador
│       ├── core/ui.js             cabecera, navegación, gráficos
│       ├── modules/panorama.js         módulos 1–2
│       ├── modules/institucional.js    módulos 3–5
│       ├── modules/percepcion.js       módulos 6–8
│       ├── modules/estrategia.js       módulos 9–12
│       ├── modules/cronologia.js      módulo 13
│       ├── app.js                 ciclo de actualización y estado
│       └── main.js                arranque y controles
├── collector/collect.js           recolector Node, sin dependencias
├── disparador/
│   ├── disparar.sh                orden de recolección por API, solo curl
│   └── apps-script.gs             la misma orden, desde Google Apps Script
├── data/
│   ├── latest.json                instantánea vigente
│   └── history/AAAA-MM-DD.json    archivo diario
├── .github/workflows/
│   ├── recolector.yml             cron a los minutos :17 y :47
│   └── publicar.yml               publicación en Pages
└── docs/
    ├── DESPLIEGUE.md
    ├── DISPARADOR-EXTERNO.md
    └── FUENTES.md
```

## Ponerlo a andar

```bash
git clone https://github.com/USUARIO/REPOSITORIO.git
cd REPOSITORIO
node collector/collect.js      # primera lectura: llena data/latest.json
python3 -m http.server 8080    # o: npx serve
```

Abra `http://localhost:8080`. Necesita servidor local: abrir el archivo con doble
clic impide leer `data/latest.json` por las reglas de origen del navegador.

Para publicarlo, siga `docs/DESPLIEGUE.md`.

## Configurar

Todo se toca en un solo archivo: `assets/js/config/sources.js`.

- **Agregar un medio**: añada una entrada a `fuentes` con su feed y un peso entre 0 y 1.
- **Vigilar a alguien**: añádalo a `actores` con sus alias y un peso de relevancia.
- **Vigilar un asunto**: añádalo a `temas` con las palabras que lo delatan.
- **Cambiar la frecuencia**: `programacion.intervaloMinutos` (cada cuánto relee el
  navegador) y el `cron` de `.github/workflows/recolector.yml` (cada cuánto lee el
  servidor; va en UTC). Para leer cada dos horas: `intervaloMinutos: 120` y
  `cron: '17 */2 * * *'`. Evite el minuto `:00`: es donde más se retrasan los cron
  de GitHub.
- **Cambiar la hora del parte del día**: `programacion.horaDiaria`, que solo ancla las
  comparaciones históricas del módulo 11.

## Ajustar el ánimo del sistema

Los umbrales viven en `core/nlp.js`:

- **Bandas de impacto** → función `impacto()`. Hoy: Muy Alto ≥ 0.70, Alto ≥ 0.55,
  Medio ≥ 0.42. Si el módulo 1 le parece inflado, suba los cortes.
- **Disparadores de alerta** → constante `ALERTAS`. Añada los términos propios de su
  sector; los del nivel rojo encienden el tablero del módulo 10.
- **Léxico de sentimiento** → constante `LEXICO`, valores entre −3 y 3.

## Límites que conviene conocer

- **X / Twitter** exige plan de pago. Sin `X_BEARER_TOKEN` el módulo 7 sigue
  funcionando: deriva las tendencias de los titulares en vez de la red social.
- **Google Trends** no tiene API oficial. El recolector lee su RSS público de
  búsquedas destacadas; si Google lo cambia, el módulo lo indica y sigue andando.
- **Senado, Cámara y Concejo** no publican RSS estable. Se consultan por búsqueda
  restringida a su dominio, que devuelve enlaces al sitio oficial.
- **El sentimiento por léxico no entiende ironía.** Sirve para ver tendencias
  agregadas, no para juzgar un titular suelto.
- **El cron de GitHub no es puntual ni garantizado.** Puede demorarse minutos y puede
  saltarse una cita entera, sobre todo recién creado el repositorio o en el minuto en
  punto. Por eso hay dos citas por hora y fuera de `:00`. Si una se pierde, la
  siguiente recoge media hora después.
- **Veinticuatro corridas diarias** son gratuitas en un repositorio público. En uno
  privado consumen minutos de Actions: allí conviene bajar la frecuencia a dos o tres
  horas.
- **Leer más seguido no acelera a las fuentes.** Varios feeds se actualizan cada varias
  horas; entre esas horas el recolector confirma que no hay nada nuevo y no escribe
  ningún *commit*.

## Uso legítimo

El tablero guarda titular, enlace, fecha y un extracto corto, y siempre enlaza a la
publicación original. No aloja artículos completos ni los reproduce. Antes de
darle un uso comercial, revise los términos de cada medio: varios permiten el RSS
solo para uso personal. El recolector se identifica con un *user-agent* propio y
lee a un ritmo moderado; no lo acelere.
