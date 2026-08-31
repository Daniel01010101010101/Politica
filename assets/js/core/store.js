/* ===================================================================
   Persistencia local
   -------------------------------------------------------------------
   IndexedDB  → despachos y fotografías diarias (base histórica).
   LocalStorage → preferencias, última actualización, proxy elegido.
   =================================================================== */
window.CIP_STORE = (function () {
  'use strict';

  const DB_NOMBRE = 'cip_inteligencia';
  const DB_VERSION = 1;
  let db = null;

  function abrir() {
    return new Promise(function (res, rej) {
      if (db) return res(db);
      if (!('indexedDB' in window)) return rej(new Error('IndexedDB no disponible'));
      const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
      req.onupgradeneeded = function (e) {
        const d = e.target.result;
        if (!d.objectStoreNames.contains('despachos')) {
          const s = d.createObjectStore('despachos', { keyPath: 'id' });
          s.createIndex('fecha', 'fecha');
          s.createIndex('fuente', 'fuenteId');
          s.createIndex('dia', 'dia');
        }
        if (!d.objectStoreNames.contains('dias')) {
          d.createObjectStore('dias', { keyPath: 'dia' });
        }
      };
      req.onsuccess = function (e) { db = e.target.result; res(db); };
      req.onerror = function () { rej(req.error); };
    });
  }

  function tx(almacen, modo) {
    return abrir().then(function (d) { return d.transaction(almacen, modo).objectStore(almacen); });
  }

  function guardarDespachos(items) {
    return abrir().then(function (d) {
      return new Promise(function (res, rej) {
        const t = d.transaction('despachos', 'readwrite');
        const s = t.objectStore('despachos');
        items.forEach(function (it) { s.put(it); });
        t.oncomplete = function () { res(items.length); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }

  function leerDespachos(desdeMs) {
    return tx('despachos', 'readonly').then(function (s) {
      return new Promise(function (res, rej) {
        const salida = [];
        const rango = desdeMs ? IDBKeyRange.lowerBound(desdeMs) : null;
        const req = s.index('fecha').openCursor(rango, 'prev');
        req.onsuccess = function (e) {
          const c = e.target.result;
          if (c) { salida.push(c.value); c.continue(); } else res(salida);
        };
        req.onerror = function () { rej(req.error); };
      });
    });
  }

  function guardarDia(resumenDia) {
    return tx('dias', 'readwrite').then(function (s) {
      return new Promise(function (res, rej) {
        const r = s.put(resumenDia);
        r.onsuccess = function () { res(true); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }

  function leerDias() {
    return tx('dias', 'readonly').then(function (s) {
      return new Promise(function (res, rej) {
        const r = s.getAll();
        r.onsuccess = function () {
          res((r.result || []).sort(function (a, b) { return a.dia < b.dia ? -1 : 1; }));
        };
        r.onerror = function () { rej(r.error); };
      });
    });
  }

  function purgar(diasAConservar) {
    const corte = Date.now() - (diasAConservar || 400) * 86400000;
    return tx('despachos', 'readwrite').then(function (s) {
      return new Promise(function (res) {
        const req = s.index('fecha').openCursor(IDBKeyRange.upperBound(corte));
        let n = 0;
        req.onsuccess = function (e) {
          const c = e.target.result;
          if (c) { c.delete(); n++; c.continue(); } else res(n);
        };
        req.onerror = function () { res(n); };
      });
    });
  }

  function vaciar() {
    return abrir().then(function (d) {
      return new Promise(function (res) {
        const t = d.transaction(['despachos', 'dias'], 'readwrite');
        t.objectStore('despachos').clear();
        t.objectStore('dias').clear();
        t.oncomplete = function () { res(true); };
      });
    });
  }

  /* --- Preferencias --- */
  const P = 'cip_pref_';
  function pref(clave, valor) {
    try {
      if (valor === undefined) {
        const v = localStorage.getItem(P + clave);
        return v === null ? null : JSON.parse(v);
      }
      localStorage.setItem(P + clave, JSON.stringify(valor));
      return valor;
    } catch (e) { return null; }
  }

  return {
    guardarDespachos: guardarDespachos,
    leerDespachos: leerDespachos,
    guardarDia: guardarDia,
    leerDias: leerDias,
    purgar: purgar,
    vaciar: vaciar,
    pref: pref
  };
})();
