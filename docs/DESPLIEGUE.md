# Despliegue

## 1. Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "Centro de Inteligencia Política"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

En el repositorio, **Settings → Pages → Source: GitHub Actions**. El flujo
`publicar.yml` se encarga del resto. En dos o tres minutos tendrá el tablero en
`https://USUARIO.github.io/REPOSITORIO/`.

Si prefiere la opción sin Actions, elija **Deploy from a branch → main → / (root)**.
Funciona igual: el archivo `.nojekyll` evita que Jekyll se coma las carpetas.

## 2. Activar la recolección horaria

En **Settings → Actions → General → Workflow permissions**, marque
**Read and write permissions**. Sin eso, el recolector lee las fuentes pero no puede
publicar los datos.

Luego, en **Actions → Recolector horario → Run workflow**, lance una corrida manual
para llenar `data/latest.json` de entrada. A partir de ahí corre solo.

> El cron está en `5,20,35,50 * * * *` (UTC): cuatro lecturas por hora. Como Colombia
> no cambia de hora, esos minutos también lo son en Bogotá. Ninguna en punto a
> propósito: `:00` es el minuto más congestionado de GitHub y es donde más se retrasan
> y se saltan los cron; con cuatro citas, si una se pierde, la siguiente recoge quince
> minutos después. Si cambia la frecuencia,
> mueva las dos piezas a la vez: el `cron` del flujo y `programacion.intervaloMinutos`
> en `sources.js`, que es lo que el tablero usa para su cuenta regresiva.
>
> La primera cita de un cron recién creado suele saltarse: GitHub tarda en registrarlo.
> Use **Run workflow** para la primera lectura y deje que el cron entre solo.
>
> Noventa y seis corridas diarias caben de sobra en la cuota de Actions de un
> repositorio público (son gratuitas) y cada una tarda menos de dos minutos; las que no
> encuentran novedades duran segundos y no escriben nada. En un repositorio privado sí
> consumen minutos: ahí conviene subir `intervaloMinutos` a 120 o 180 y ajustar el cron
> a `5 */2 * * *`.

GitHub desactiva los cron de los repositorios sin actividad por 60 días. Un *commit*
cualquiera los reactiva.

### Si el cron no dispara

Es lo más común al empezar: el flujo está bien y aun así pasan varias citas sin que
GitHub ejecute nada. El `schedule` es el único programador que trae GitHub, así que
la cuestión no es sustituirlo sino desatascarlo.

Antes de tocar nada, descarte las causas reales. En **Actions → Recolector horario**,
filtre por `event: schedule`; si no hay ninguna corrida, compruebe:

| Qué mirar | Dónde | Qué debe ver |
|---|---|---|
| Que no sea un *fork* | Portada del repositorio | Sin la línea «forked from…»: GitHub no programa cron en forks |
| Que Actions esté activo | Settings → Actions → General | «Allow all actions» |
| Que el flujo no esté desactivado | Actions → Recolector horario | Sin el aviso «This workflow was disabled» |
| Que el cron esté en la rama por defecto | El archivo en `main` | El `schedule` solo se lee desde ahí |
| Minutos disponibles | Settings → Billing | En repositorio público, ilimitados |
| Permisos de escritura | Settings → Actions → General | Read and write permissions |

Si todo lo anterior está en orden, quedan dos palancas, en este orden:

1. **Apagar y encender el flujo.** En **Actions → Recolector horario → ⋯ → Disable
   workflow**, y acto seguido **Enable workflow**. Eso obliga a GitHub a registrar
   de nuevo el `schedule`, y desatasca buena parte de los casos en que el programador
   se quedó dormido.
2. **Recrear el flujo con otro nombre de archivo.** Copie el contenido a
   `.github/workflows/otro-nombre.yml` y borre el anterior en el mismo *commit*.
   GitHub lo trata como un flujo nuevo, con otro identificador interno, y registra el
   `schedule` desde cero. Es más contundente que apagar y encender, y es lo que se
   hizo aquí al pasar de `recolector.yml` a `recoleccion.yml`. Conserve el mismo
   `name:` del flujo o `publicar.yml` dejará de republicar el sitio, porque engancha
   por nombre.
3. **Esperar.** GitHub no garantiza la puntualidad de las citas y tarda especialmente
   en tomarse en serio los cron de un repositorio recién despertado tras meses
   inactivo. Puede tardar horas. Mientras tanto, **Run workflow** llena los datos y
   el botón «Actualizar ahora» del tablero no depende del cron para nada.

Para no enterarse por casualidad: si pasan tres lecturas sin datos nuevos, el sello de
la esquina inferior izquierda del tablero se pone ámbar y lo dice.

## 3. Conectar la API de X (opcional)

En **Settings → Secrets and variables → Actions → New repository secret**:

- Nombre: `X_BEARER_TOKEN`
- Valor: su *bearer token* del portal de desarrolladores de X

Después ponga `integraciones.x.activo: true` en `sources.js`. El secreto nunca llega
al navegador: solo lo ve la acción de GitHub, y al tablero llegan los resultados ya
agregados dentro de `latest.json`.

## 4. Proxy propio para la lectura directa

Los proxies públicos que trae el tablero sirven para probar, pero limitan peticiones.
Con una cuenta gratuita de Cloudflare tendrá el suyo en cinco minutos.

Cree un Worker y pegue esto:

```js
export default {
  async fetch(peticion) {
    const origen = new URL(peticion.url).searchParams.get('url');
    if (!origen) return new Response('Falta el parámetro url', { status: 400 });

    // Solo los dominios que usted autorice
    const permitidos = [
      'eltiempo.com', 'portafolio.co', 'larepublica.co', 'semana.com',
      'cambiocolombia.com', 'infobae.com', 'presidencia.gov.co',
      'senado.gov.co', 'camara.gov.co', 'bogota.gov.co',
      'concejodebogota.gov.co', 'news.google.com', 'trends.google.com',
      'youtube.com'
    ];
    const anfitrion = new URL(origen).hostname;
    if (!permitidos.some((d) => anfitrion === d || anfitrion.endsWith('.' + d))) {
      return new Response('Dominio no autorizado', { status: 403 });
    }

    const r = await fetch(origen, {
      headers: { 'User-Agent': 'CentroInteligenciaPolitica/1.0', 'Accept': 'application/rss+xml, application/xml, text/xml' },
      cf: { cacheTtl: 600, cacheEverything: true }
    });

    return new Response(r.body, {
      status: r.status,
      headers: {
        'Content-Type': r.headers.get('Content-Type') || 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600'
      }
    });
  }
};
```

En el tablero, **Fuentes y ajustes → Dirección del proxy propio**:

```
https://SU-WORKER.workers.dev/?url={url}
```

La lista de dominios permitidos importa: sin ella tendría un proxy abierto que
cualquiera podría usar para enmascarar tráfico.

## 5. Otras formas de publicarlo

**Netlify o Vercel.** Arrastre la carpeta o conecte el repositorio. Como no hay
compilación, deje vacío el comando de *build* y ponga `.` como directorio. Ambos
tienen funciones programadas si prefiere no depender de GitHub Actions.

**Servidor propio.** Copie la carpeta al directorio del servidor web y programe el
recolector con cron:

```
0 7 * * * cd /var/www/cip && /usr/bin/node collector/collect.js >> /var/log/cip.log 2>&1
```

**Red interna sin salida a internet.** Descargue las bibliotecas y sírvalas desde
`assets/vendor/`, cambiando las etiquetas `<script>` de `index.html`. Son siete:
ECharts, echarts-wordcloud, D3, Chart.js, Plotly, jQuery y DataTables.

## 6. Comprobar que quedó bien

1. `data/latest.json` pesa más de unos pocos kilobytes.
2. El módulo 1 muestra diez despachos con enlaces que abren el medio original.
3. En «Estado de las fuentes», la mayoría tiene punto verde. Los rojos aparecen con
   el motivo en la salida de la acción de GitHub.
4. La cuenta regresiva de la cabecera avanza.
5. En **Actions** hay una corrida verde del día.

### Cuando algo no cuadra

| Síntoma | Causa habitual |
|---|---|
| Todo vacío y aviso de `latest.json` | El recolector no ha corrido, o Pages sirve una versión anterior |
| «Ninguna fuente respondió» | Sin red en el ejecutor, o todos los feeds cambiaron de dirección |
| Una fuente en rojo siempre | Ese medio movió su RSS: revise `docs/FUENTES.md` |
| La acción no hace *commit* | Faltan los permisos de escritura del paso 2 |
| Los gráficos no aparecen | Alguna CDN bloqueada; mire la consola del navegador |
| El módulo 11 casi vacío | Es normal al principio: la base histórica se llena un día por día |
