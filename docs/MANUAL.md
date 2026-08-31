# Manual del Centro de Inteligencia Política

## 1. Qué es esto

Un sistema de monitoreo de prensa y actividad institucional colombiana. Cada hora en
punto sale a leer 24 fuentes, clasifica lo que encuentra y lo presenta ordenado por
relevancia política.

**Lo que hace:** recoge, mide, ordena y compara. Le dice qué se publicó, quién aparece,
con qué tono, qué se acelera y qué se apaga.

**Lo que no hace:** no opina, no predice y no escribe contenido. Cada cifra del tablero
sale de un texto que puede abrir y leer. Si un dato le parece raro, haga clic y verá la
noticia original.

Esto importa porque define cómo usarlo: es un instrumento de observación, no un
generador de argumentos. La lectura política la pone usted.

---

## 2. La cadena horaria

Esto es lo que ocurre cada hora, sin que nadie toque nada:

| Minuto (Bogotá) | Qué pasa |
|---|---|
| :17 y :47 | GitHub arranca el flujo «Recolector horario» |
| +2 min | Un servidor de GitHub lee las 24 fuentes en lotes de 6 |
| +2 min | Normaliza, deduplica y guarda `data/latest.json` más el archivo del día en `data/history/`, que se reescribe con todo lo publicado en la jornada |
| +2 min | Ese commit dispara «Publicar en GitHub Pages» |
| +4 min | El sitio queda actualizado |

El tablero abierto en el navegador sigue el mismo reloj: al llegar la hora en punto
relee la instantánea, y también lo hace al volver a la pestaña si se pasó un corte.

Cuando usted abre el tablero, su navegador descarga ese archivo y hace **todo el
análisis localmente**: sentimiento, actores, temas, impacto, alertas, agrupaciones. Por
eso carga rápido y por eso funciona igual con o sin conexión una vez cargado.

El cron está en `17,47 * * * *` UTC. Colombia no cambia de hora, así que son los mismos
minutos en Bogotá. Son dos citas y ninguna en punto a propósito: los cron de GitHub se
retrasan —y a veces se saltan una cita entera— sobre todo en el minuto `:00`, que es el
más congestionado. Con dos citas, si una se pierde, la siguiente recoge. Nada de eso es
un fallo del tablero, y el botón «Actualizar ahora» no depende del cron.

El **parte del día** —las comparaciones del módulo 11— sigue anclado a la jornada de
Bogotá: las lecturas de la noche alimentan el archivo del día correcto, no el del día
siguiente en UTC.

**Dos cosas que debe saber:**

GitHub apaga los cron de repositorios sin actividad durante 60 días. Cualquier commit
los reactiva. Si nota que dejó de actualizarse, revise eso primero.

El botón **Actualizar ahora** de la cabecera no espera al corte: lee las fuentes en ese
momento desde su navegador, a través de un proxy. Úselo cuando pase algo y no quiera
esperar a mañana.

---

## 3. La cabecera

Cuatro indicadores que resumen el día:

**Despachos hoy** — cuántas piezas entraron en las últimas 24 horas, y la variación
frente al día anterior. Un salto grande casi siempre significa que estalló algo.

**Alertas rojas** — piezas que dispararon vocabulario de crisis: escándalo, imputación,
desfalco, captura. Son las que hay que leer primero.

**Impacto muy alto** — cuántas piezas superaron 0.70 en el puntaje de impacto.

**Tono medio** — el sentimiento promedio del día, de −1 a +1. Cerca de cero es normal:
la prensa política tiende al tono neutro-negativo. Lo informativo es el movimiento, no
el valor absoluto.

Debajo corre la franja de titulares, ordenada por impacto. Pase el cursor y se detiene.

---

## 4. Los doce módulos

### 01 · Resumen ejecutivo del día
Los diez despachos de mayor impacto. Cada uno trae su nivel (Muy Alto a Bajo), su
indicador (Político, Económico, Social, Institucional), la fuente, la hora y los temas
detectados. La barra bajo cada título es el puntaje: **pase el cursor y verá los siete
componentes que lo forman**. Esa es la garantía de que nada está inventado.

*Cómo usarlo:* es el parte de las 7 de la mañana. Si solo va a mirar una cosa, mire esto.

### 02 · Radar presidencial
Menciones del presidente y del gobierno, variación frente al día anterior, y un mapa de
calor por hora y día. Detecta los ciclos: cuándo se publica sobre el gobierno y cuándo
hay silencio.

*Cómo usarlo:* el heatmap revela patrones de vocería. Si un actor aparece siempre entre
las 6 y las 8 de la mañana, hay una estrategia de agenda detrás.

### 03 · Congreso en tiempo real
Actividad legislativa: proyectos, debates, votaciones, citaciones. Ranking de los
congresistas más mencionados y semáforo de temas por nivel de conflicto.

*Cómo usarlo:* le dice qué se está moviendo en el Legislativo antes de que llegue a la
prensa nacional, porque lee directamente los sitios del Senado y la Cámara.

### 04 · Partidos políticos
Nueve colectividades seguidas por separado, con su color. Volumen de menciones, tono
medio por partido, y evolución en el tiempo.

*Cómo usarlo:* aquí se ve la cuota de conversación. Si un partido sube en volumen pero
baja en tono, está siendo noticia por razones que no le convienen.

### 05 · Bogotá
Todo lo distrital: Alcaldía, Concejo, movilidad, seguridad, presupuesto. Filtrado por
ámbito, no por palabra clave, así que no se contamina con noticias nacionales.

### 06 · Análisis de sentimiento
Distribución del tono, radar por tema y desglose por fuente. Muestra no solo si el tono
es negativo, sino **dónde** lo es.

*Cómo se calcula:* un léxico de unos 200 términos políticos en español, cada uno con
peso de −3 a +3, más manejo de negación («no hubo escándalo» sale positivo),
intensificadores («gravísimo») y atenuadores («leve retraso»). El resultado se satura
suavemente para que un texto muy cargado no llegue automáticamente al extremo.

### 07 · Tendencias sociales
Términos que se aceleran: compara la frecuencia de las últimas 24 horas contra la
semana previa. Incluye las búsquedas destacadas de Google Trends en Colombia.

Sin token de X configurado, las tendencias se derivan de los titulares. Es menos
inmediato que la red social, pero no depende de que nadie pague una API.

### 08 · Nube de palabras
Vocabulario dominante en tres ventanas: 24 horas, 7 días, 30 días. Comparar las tres
muestra qué es coyuntura y qué se instaló.

### 09 · Mapa de actores
Grafo de coocurrencia: quién aparece junto a quién en las mismas piezas. El grosor de
la línea es la frecuencia de la coaparición.

*Cómo usarlo:* revela alineamientos que nadie declara. Si dos figuras de partidos
distintos empiezan a aparecer juntas, algo se está cocinando.

### 10 · Alertas tempranas
Semáforo de tres niveles. Rojo: vocabulario de crisis institucional o judicial.
Amarillo: irregularidad, objeción, renuncia. Verde: actividad normal.

*Cómo usarlo:* es lo que se revisa a las 7:05. Una alerta roja sobre un aliado exige
respuesta el mismo día; sobre un adversario, decisión sobre si capitalizarla.

### 11 · Base histórica
Series temporales por actor, partido, tema y ámbito, con detección de anomalías
estadísticas: marca los días que se salen del rango habitual.

**Este módulo estará casi vacío al principio y es correcto.** Necesita días acumulados.
Mañana tendrá dos puntos, en una semana siete, y a partir de las dos o tres semanas las
series empiezan a decir algo. Es el módulo que más valor gana con el tiempo.

### 12 · Lectura estratégica
Riesgos, oportunidades, escenarios e impactos, derivados por reglas explícitas de los
indicadores medidos. **Cada afirmación enlaza los despachos que la sustentan.**

No consulta ningún modelo de lenguaje. Si dice «riesgo alto en el frente judicial», es
porque hay N piezas con alerta roja y tema judicial en la ventana, y puede abrirlas.

---

## 5. Cómo se calcula el impacto

El puntaje que ordena todo el tablero:

```
impacto = 0.20 · peso de la fuente
        + 0.22 · relevancia de los actores mencionados
        + 0.26 · severidad de los temas detectados
        + 0.12 · corroboración entre medios
        + 0.10 · recencia
        + 0.06 · carga emocional del texto
        + 0.04 · nivel de alerta
```

Bandas: **Muy Alto** desde 0.70, **Alto** desde 0.55, **Medio** desde 0.42, el resto
**Bajo**.

El componente de corroboración es el que más cuesta falsear: mide si varios medios
independientes publicaron lo mismo. Una nota que solo aparece en un sitio pesa menos
que una que reportan cuatro.

Los pesos están en `assets/js/core/nlp.js` y puede cambiarlos. Si le parece que la
severidad temática pesa demasiado, bájela y vuelva a cargar.

---

## 6. Uso operativo para el Pacto Histórico

Un apunte necesario primero: desde el 7 de agosto de 2026 el Pacto está en oposición.
Eso cambia el uso del tablero. En gobierno, el trabajo es defender gestión; en
oposición, es fiscalizar y disputar la agenda. Los módulos sirven para las dos cosas,
pero se leen distinto.

**Rutina de la mañana (10 minutos).** Módulo 10 primero: si hay alerta roja, se define
qué se hace hoy. Después el módulo 1 para el estado general. Después el 3, para saber
qué se vota esta semana.

**Tiempo de respuesta.** El valor real está aquí. Un tema que aparece a las 7:00 y no
se responde hasta el mediodía ya se instaló con el encuadre de otro. El tablero le da
esas cinco horas.

**Disputa de agenda.** El módulo 4 muestra cuánta conversación ocupa cada colectividad
y con qué tono. Volumen alto con tono negativo no es visibilidad, es desgaste. Volumen
bajo tampoco sirve. El objetivo observable es presencia sostenida con tono estable.

**Fiscalización.** Los módulos 3 y 10 leen directamente Senado, Cámara, Procuraduría,
Contraloría y Fiscalía. Eso permite ver actuaciones oficiales antes de que las cubra la
prensa nacional, que es donde está la ventaja de tiempo.

**Territorio.** El módulo 5 aísla Bogotá. Si le interesa otra ciudad, se añade una
fuente con `ambito` propio y el módulo la recoge.

**Memoria.** El módulo 11 es el que permite decir «esto ya pasó en marzo y así se
resolvió» en vez de reaccionar cada vez desde cero. Por eso conviene no borrar el
histórico.

**Una advertencia.** El tablero mide lo que publican los medios, que no es lo mismo que
lo que piensa la gente. Un tono negativo en prensa no equivale a rechazo ciudadano.
Para eso hacen falta encuestas, y este sistema no las sustituye.

---

## 7. Límites honestos

**El léxico no entiende ironía.** «Qué gran gestión» en tono sarcástico se cuenta como
positivo. En volumen alto se compensa; en piezas sueltas, no confíe en el signo.

**La corroboración se puede inflar.** Si cinco medios replican el mismo boletín, el
sistema lo lee como cinco confirmaciones. Es una limitación real de cualquier medición
por conteo.

**Sin RSS estable en el Congreso.** Senado, Cámara y Concejo no publican feeds fiables,
así que se consultan por búsqueda restringida a su dominio. Llega con algo de retraso.

**X requiere plan de pago.** Sin token, el módulo 7 funciona con una aproximación
derivada de titulares.

**Google Trends no tiene API oficial.** Se usa el RSS público. Si Google lo retira, ese
bloque se apaga y el resto sigue.

**Los medios cambian sus feeds.** Cuando una fuente aparezca en rojo varios días,
revise `docs/FUENTES.md`, que explica cómo encontrar la nueva dirección.

---

## 8. Ajustes frecuentes

Todo lo configurable vive en `assets/js/config/sources.js`.

**Seguir a una persona nueva:** añádala al arreglo `actores` con sus alias en minúscula
y sin tildes, y un peso de 0 a 1 según su relevancia.

**Seguir un tema nuevo:** añádalo a `temas` con sus disparadores y un peso de severidad.
Ese peso alimenta directamente el 26 % del puntaje de impacto.

**Añadir un medio:** siga la plantilla de `docs/FUENTES.md`. El campo `ambito` no es
decorativo: determina en qué módulos aparece.

**Cambiar la hora del corte:** modifique el cron en `.github/workflows/recolector.yml`
y también `programacion.horaDiaria` en `sources.js`, para que la cuenta regresiva de la
cabecera siga diciendo la verdad.

**Cambiar los colores:** los tokens están al principio de `assets/css/styles.css` y la
paleta de gráficos en `assets/js/core/ui.js`. Los rojos, naranjas y verdes están
reservados para señal (alerta e impacto); si los usa como decoración, el tablero pierde
legibilidad.
