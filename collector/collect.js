#!/usr/bin/env node
/* ===================================================================
   Recolector — Centro de Inteligencia Política
   -------------------------------------------------------------------
   Corre en el servidor (GitHub Actions) cada hora en punto. Lee las
   fuentes originales, normaliza y escribe:

     data/latest.json           instantánea que consume el tablero
     data/history/AAAA-MM-DD.json  archivo del día, reescrito en cada
                                   lectura con todo lo publicado ese día

   Sin dependencias externas: usa el fetch nativo de Node 18+.
   Guarda titular, enlace, fecha y extracto corto con enlace de vuelta
   a la publicación original; no reproduce artículos completos.
   =================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const CFG = require('../assets/js/config/sources.js');

const RAIZ = path.resolve(__dirname, '..');
const DIR_DATOS = path.join(RAIZ, 'data');
const DIR_HIST = path.join(DIR_DATOS, 'history');
const TIEMPO_LIMITE = 20000;
const MAX_POR_FUENTE = CFG.red.maxItemsPorFuente || 40;
const VENTANA_DIAS = CFG.red.ventanaDias || 30;
const ZONA = CFG.programacion.zonaHoraria || 'America/Bogota';
const AGENTE = 'CentroInteligenciaPolitica/1.0 (lector RSS; contacto: configure en docs/FUENTES.md)';

/* Fecha AAAA-MM-DD en la zona del tablero ('en-CA' entrega ese formato) */
function diaEnZona(ms) {
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: ZONA });
}

/* ---------------- utilidades de texto ---------------- */
function desescapar(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}
function sinEtiquetas(s) {
  return desescapar(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
function etiqueta(bloque, nombre) {
  const m = bloque.match(new RegExp('<' + nombre + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + nombre + '>', 'i'));
  return m ? desescapar(m[1]).trim() : '';
}
function atributo(bloque, nombre, attr) {
  const m = bloque.match(new RegExp('<' + nombre + '[^>]*\\s' + attr + '="([^"]*)"', 'i'));
  return m ? desescapar(m[1]) : '';
}
function normaliza(t) {
  return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

/* ---------------- lectura de un feed ---------------- */
function parsear(xml, fuente) {
  const bloques = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return bloques.map((b) => {
    const titulo = sinEtiquetas(etiqueta(b, 'title'));
    let enlace = etiqueta(b, 'link');
    if (!enlace || /^\s*$/.test(enlace)) enlace = atributo(b, 'link', 'href');
    if (!enlace) enlace = etiqueta(b, 'guid');
    const fechaTxt = etiqueta(b, 'pubDate') || etiqueta(b, 'published') || etiqueta(b, 'updated') || etiqueta(b, 'dc:date');
    let cuerpo = sinEtiquetas(etiqueta(b, 'description') || etiqueta(b, 'summary') || etiqueta(b, 'content:encoded') || etiqueta(b, 'content'));
    if (cuerpo.length > 700) cuerpo = cuerpo.slice(0, 700) + '…';   // extracto, no artículo completo
    const t = fechaTxt ? Date.parse(fechaTxt) : NaN;
    return {
      titulo,
      enlace: (enlace || '').trim(),
      fecha: isNaN(t) ? Date.now() : t,
      cuerpo,
      fuenteId: fuente.id,
      fuenteNombre: fuente.nombre,
      fuenteCategoria: fuente.categoria,
      fuenteAmbito: fuente.ambito,
      fuenteSitio: fuente.sitio
    };
  }).filter((x) => x.titulo && x.enlace);
}

async function pedir(url) {
  const ctrl = new AbortController();
  const reloj = setTimeout(() => ctrl.abort(), TIEMPO_LIMITE);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': AGENTE,
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*;q=0.6',
        'Accept-Language': 'es-CO,es;q=0.9'
      }
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(reloj); }
}

async function leerFuente(fuente) {
  const inicio = Date.now();
  const fallos = [];
  for (const url of (fuente.feeds || [])) {
    try {
      const xml = await pedir(url);
      const items = parsear(xml, fuente).slice(0, MAX_POR_FUENTE);
      if (!items.length) throw new Error('sin entradas');
      return { id: fuente.id, estado: 'ok', url, ms: Date.now() - inicio, n: items.length, items };
    } catch (e) {
      fallos.push(url.slice(0, 60) + ' → ' + e.message);
    }
  }
  return { id: fuente.id, estado: 'error', motivo: fallos.join(' | ') || 'sin feeds', ms: Date.now() - inicio, n: 0, items: [] };
}

/* ---------------- relevancia ----------------
   Los feeds temáticos ya vienen acotados; los generales se filtran
   por vocabulario político para no inflar el archivo. */
const VOCABULARIO = []
  .concat(CFG.actores.flatMap((a) => [a.nombre].concat(a.alias || [])))
  .concat(CFG.partidos.flatMap((p) => [p.nombre].concat(p.alias || [])))
  .concat(CFG.entidades.flatMap((e) => [e.nombre].concat(e.alias || [])))
  .concat(CFG.temas.flatMap((t) => t.claves))
  .concat(['gobierno', 'presidencia', 'congreso', 'senado', 'camara de representantes', 'ministro',
           'ministerio', 'alcaldia', 'concejo', 'reforma', 'proyecto de ley', 'corte', 'fiscalia',
           'procuraduria', 'contraloria', 'petro', 'bogota', 'colombia'])
  .map(normaliza);

function esRelevante(item, fuente) {
  if (fuente.categoria === 'oficial' || fuente.categoria === 'tematica') return true;
  const t = normaliza(item.titulo + ' ' + item.cuerpo);
  return VOCABULARIO.some((v) => v.length > 3 && t.includes(v));
}

/* ---------------- integraciones opcionales ---------------- */
async function leerTrends() {
  if (!CFG.integraciones.trends) return null;
  try {
    const xml = await pedir(CFG.integraciones.trends.endpoint);
    const bloques = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    return bloques.slice(0, 20).map((b) => ({
      titulo: sinEtiquetas(etiqueta(b, 'title')),
      trafico: sinEtiquetas(etiqueta(b, 'ht:approx_traffic')),
      enlace: etiqueta(b, 'link')
    })).filter((x) => x.titulo);
  } catch (e) {
    console.warn('Google Trends no respondió:', e.message);
    return null;
  }
}

async function leerX() {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return null;
  const salida = [];
  for (const consulta of CFG.integraciones.x.consultas) {
    try {
      const url = CFG.integraciones.x.endpoint +
        '?query=' + encodeURIComponent(consulta) +
        '&max_results=100&tweet.fields=created_at,public_metrics,entities&expansions=author_id';
      const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      (j.data || []).forEach((t) => salida.push({
        texto: t.text, fecha: Date.parse(t.created_at),
        metricas: t.public_metrics,
        hashtags: ((t.entities || {}).hashtags || []).map((h) => h.tag)
      }));
    } catch (e) {
      console.warn('API de X:', e.message);
    }
  }
  return salida.length ? salida : null;
}

/* ---------------- huella para deduplicar ---------------- */
const VACIAS = new Set(('de la el en y a los las un una del al con por para que se su sus es son fue tras sobre entre desde hasta como mas pero no ni o u ya hoy dice dijo').split(' '));
function huella(titulo) {
  return normaliza(titulo).replace(/[^a-z0-9ñ\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !VACIAS.has(w)).sort().slice(0, 9).join('-');
}

/* ---------------- programa principal ---------------- */
(async function principal() {
  const t0 = Date.now();
  const activas = CFG.fuentes.filter((f) => f.activo !== false);
  console.log('Leyendo ' + activas.length + ' fuentes…');

  const resultados = [];
  const lote = 6;
  for (let i = 0; i < activas.length; i += lote) {
    const trozo = activas.slice(i, i + lote);
    const r = await Promise.all(trozo.map(leerFuente));
    r.forEach((x) => {
      const f = activas.find((a) => a.id === x.id);
      console.log('  ' + (x.estado === 'ok' ? '✓' : '✗') + ' ' + f.nombre + ' — ' +
                  (x.estado === 'ok' ? x.n + ' entradas en ' + x.ms + ' ms' : x.motivo));
    });
    resultados.push(...r);
  }

  const limite = Date.now() - VENTANA_DIAS * 86400000;
  const vistos = new Map();
  let descartados = 0;

  resultados.forEach((r) => {
    const fuente = activas.find((f) => f.id === r.id);
    r.items.forEach((it) => {
      if (it.fecha < limite || it.fecha > Date.now() + 7200000) { descartados++; return; }
      if (!esRelevante(it, fuente)) { descartados++; return; }
      const h = huella(it.titulo);
      if (!h) return;
      if (!vistos.has(h)) vistos.set(h, it);
      else if (it.fecha < vistos.get(h).fecha) vistos.set(h, it);
    });
  });

  const items = Array.from(vistos.values()).sort((a, b) => b.fecha - a.fecha);
  const trends = await leerTrends();
  const x = await leerX();

  const respondieron = resultados.filter((r) => r.estado === 'ok').length;
  // Con lecturas cada hora, una caída de red no puede sobrescribir la
  // instantánea buena con uno vacío: si nadie respondió, se sale sin escribir.
  if (!respondieron) {
    console.error('Ninguna fuente respondió: se conserva la instantánea anterior.');
    process.exit(1);
  }

  const paquete = {
    generado: Date.now(),
    generadoISO: new Date().toISOString(),
    origen: 'recolector',
    ventanaDias: VENTANA_DIAS,
    duracionMs: Date.now() - t0,
    descartados,
    fuentes: resultados.map((r) => ({ id: r.id, estado: r.estado, motivo: r.motivo || null, ms: r.ms, n: r.n })),
    social: { trends, x },
    items
  };

  fs.mkdirSync(DIR_HIST, { recursive: true });
  fs.writeFileSync(path.join(DIR_DATOS, 'latest.json'), JSON.stringify(paquete));

  // El servidor de GitHub corre en UTC y ahora leemos también de noche:
  // el día del archivo se calcula en Bogotá para que no se parta a las 19:00.
  const dia = diaEnZona(Date.now());
  const delDia = items.filter((i) => diaEnZona(i.fecha) === dia);
  fs.writeFileSync(path.join(DIR_HIST, dia + '.json'), JSON.stringify({
    dia, generado: paquete.generado, n: delDia.length, items: delDia
  }));

  console.log('\n' + items.length + ' despachos únicos · ' + descartados + ' descartados · ' +
              respondieron + '/' + activas.length + ' fuentes respondieron · ' +
              Math.round(paquete.duracionMs / 1000) + ' s');
})().catch((e) => { console.error('Fallo del recolector:', e); process.exit(1); });
