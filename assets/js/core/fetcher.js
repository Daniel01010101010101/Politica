/* ===================================================================
   Adquisición de datos
   -------------------------------------------------------------------
   Dos rutas, en este orden:

   A) data/latest.json  — lo produce el recolector (GitHub Actions) a
      las 07:00 de Bogotá leyendo las fuentes originales desde el
      servidor. Es la ruta recomendada: sin CORS, sin límites.

   B) Lectura directa — el navegador pide los RSS a través de un proxy
      CORS configurable. Útil para refrescar entre corridas.

   En ambos casos los datos salen de las fuentes originales.
   =================================================================== */
window.CIP_FETCH = (function () {
  'use strict';

  const CFG = window.CIP_SOURCES;

  /* ---------- Parser RSS / Atom ---------- */
  function parseFeed(xmlTexto, fuente) {
    const doc = new DOMParser().parseFromString(xmlTexto, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML inválido');

    let nodos = Array.from(doc.querySelectorAll('item'));
    const esAtom = nodos.length === 0;
    if (esAtom) nodos = Array.from(doc.querySelectorAll('entry'));

    return nodos.map(function (n) {
      function txt(sel) { const e = n.querySelector(sel); return e ? e.textContent.trim() : ''; }
      const titulo = txt('title');
      let enlace = txt('link');
      if (!enlace) {
        const l = n.querySelector('link[href]');
        enlace = l ? l.getAttribute('href') : '';
      }
      const fechaTxt = txt('pubDate') || txt('published') || txt('updated') || txt('date');
      const desc = txt('description') || txt('summary') || txt('content') || txt('encoded');
      const autor = txt('creator') || txt('author name') || txt('author') || '';
      return {
        titulo: titulo,
        enlace: enlace,
        fecha: fechaTxt ? new Date(fechaTxt).getTime() : Date.now(),
        cuerpo: desc,
        autor: autor,
        fuenteId: fuente.id,
        fuenteNombre: fuente.nombre,
        fuenteCategoria: fuente.categoria,
        fuenteAmbito: fuente.ambito,
        fuenteSitio: fuente.sitio
      };
    }).filter(function (x) { return x.titulo && x.enlace; });
  }

  /* ---------- Proxy ---------- */
  function urlProxy(destino) {
    const id = window.CIP_STORE.pref('proxy') || CFG.red.proxyPorDefecto;
    const propio = window.CIP_STORE.pref('proxyPropio');
    const p = CFG.red.proxies.filter(function (x) { return x.id === id; })[0];
    let plantilla = p ? p.plantilla : '';
    if (id === 'propio') plantilla = propio || '';
    if (!plantilla) return destino;
    return plantilla.replace('{url}', encodeURIComponent(destino));
  }

  function conTimeout(promesa, ms) {
    return Promise.race([
      promesa,
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('tiempo agotado')); }, ms); })
    ]);
  }

  /* ---------- Ruta A: instantánea del recolector ---------- */
  function leerInstantanea() {
    const url = 'data/latest.json?t=' + Date.now();
    return conTimeout(fetch(url, { cache: 'no-store' }), CFG.red.timeoutMs)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
  }

  function leerHistorico(dia) {
    return fetch('data/history/' + dia + '.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  /* ---------- Ruta B: lectura directa de cada fuente ---------- */
  function leerFuente(fuente) {
    const feeds = fuente.feeds || [];
    let i = 0;
    function intento() {
      if (i >= feeds.length) {
        return Promise.resolve({ fuente: fuente.id, estado: 'error', motivo: 'ningún feed respondió', items: [] });
      }
      const objetivo = feeds[i++];
      const t0 = Date.now();
      return conTimeout(fetch(urlProxy(objetivo), { cache: 'no-store' }), CFG.red.timeoutMs)
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        })
        .then(function (t) {
          const items = parseFeed(t, fuente).slice(0, CFG.red.maxItemsPorFuente);
          if (!items.length) throw new Error('feed vacío');
          return { fuente: fuente.id, estado: 'ok', ms: Date.now() - t0, url: objetivo, items: items };
        })
        .catch(function (e) {
          if (i < feeds.length) return intento();
          return { fuente: fuente.id, estado: 'error', motivo: e.message, items: [] };
        });
    }
    return intento();
  }

  function leerTodasLasFuentes(alProgresar) {
    const activas = CFG.fuentes.filter(function (f) { return f.activo !== false; });
    let hechas = 0;
    const tareas = activas.map(function (f) {
      return leerFuente(f).then(function (r) {
        hechas++;
        if (alProgresar) alProgresar(hechas, activas.length, f.nombre);
        return r;
      });
    });
    return Promise.all(tareas).then(function (resultados) {
      const items = [];
      resultados.forEach(function (r) { items.push.apply(items, r.items); });
      return {
        generado: Date.now(),
        origen: 'directo',
        fuentes: resultados.map(function (r) {
          return { id: r.fuente, estado: r.estado, motivo: r.motivo || null, ms: r.ms || null, n: r.items.length };
        }),
        items: items
      };
    });
  }

  return {
    leerInstantanea: leerInstantanea,
    leerHistorico: leerHistorico,
    leerFuente: leerFuente,
    leerTodasLasFuentes: leerTodasLasFuentes,
    parseFeed: parseFeed,
    urlProxy: urlProxy
  };
})();
