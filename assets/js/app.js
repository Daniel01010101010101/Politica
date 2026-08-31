/* ===================================================================
   Centro de Inteligencia Política — orquestador
   =================================================================== */
window.CIP = (function () {
  'use strict';

  const CFG = window.CIP_SOURCES;
  const NLP = window.CIP_NLP;
  const STORE = window.CIP_STORE;
  const FETCH = window.CIP_FETCH;

  const estado = {
    items: [],          // despachos enriquecidos, ventana de 30 días
    hoy: [],            // despachos de las últimas 24 h
    dias: [],           // fotografías diarias (base histórica)
    fuentes: [],        // estado de lectura por fuente
    generado: null,
    origen: null,
    cargando: false
  };

  const idxActores = {};
  CFG.actores.forEach(function (a) { idxActores[a.id] = a; });
  const idxPartidos = {};
  CFG.partidos.forEach(function (p) { idxPartidos[p.id] = p; });
  const idxEntidades = {};
  CFG.entidades.forEach(function (e) { idxEntidades[e.id] = e; });
  const idxFuentes = {};
  CFG.fuentes.forEach(function (f) { idxFuentes[f.id] = f; });

  /* ---------------- utilidades ---------------- */
  function diaDe(ms) {
    const d = new Date(ms);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function idDe(item) {
    let h = 0; const s = (item.enlace || item.titulo);
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return 'd' + Math.abs(h).toString(36);
  }
  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fechaCorta(ms) {
    const d = new Date(ms);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' · ' +
           d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  function hace(ms) {
    const m = Math.round((Date.now() - ms) / 60000);
    if (m < 60) return 'hace ' + m + ' min';
    const h = Math.round(m / 60);
    if (h < 24) return 'hace ' + h + ' h';
    return 'hace ' + Math.round(h / 24) + ' d';
  }

  /* ---------------- enriquecimiento ---------------- */
  function enriquecer(brutos) {
    const ahora = Date.now();
    const ventana = ahora - CFG.red.ventanaDias * 86400000;

    // 1. limpiar y deduplicar por huella semántica del titular
    const porHuella = {};
    brutos.forEach(function (b) {
      if (!b.titulo || !b.enlace) return;
      const fecha = typeof b.fecha === 'number' ? b.fecha : new Date(b.fecha).getTime();
      if (!fecha || isNaN(fecha) || fecha < ventana || fecha > ahora + 7200000) return;
      const h = NLP.huella(b.titulo);
      if (!porHuella[h]) porHuella[h] = { base: b, fecha: fecha, copias: [] };
      porHuella[h].copias.push(b.fuenteId);
      if (fecha < porHuella[h].fecha) { porHuella[h].base = b; porHuella[h].fecha = fecha; }
    });

    // 2. analizar
    const salida = [];
    Object.keys(porHuella).forEach(function (h) {
      const g = porHuella[h];
      const b = g.base;
      const cuerpo = NLP.sinHtml(b.cuerpo || '');
      const texto = b.titulo + '. ' + cuerpo;
      const fuente = idxFuentes[b.fuenteId] || { weight: 0.6, nombre: b.fuenteNombre };

      const item = {
        id: idDe(b),
        titulo: NLP.sinHtml(b.titulo),
        enlace: b.enlace,
        fecha: g.fecha,
        dia: diaDe(g.fecha),
        cuerpo: cuerpo,
        fuenteId: b.fuenteId,
        fuenteNombre: b.fuenteNombre || fuente.nombre,
        fuenteCategoria: b.fuenteCategoria,
        fuenteAmbito: b.fuenteAmbito,
        fuenteSitio: b.fuenteSitio,
        replicas: Array.from(new Set(g.copias)).length,
        actores: NLP.detecta(texto, CFG.actores),
        partidos: NLP.detecta(texto, CFG.partidos),
        entidades: NLP.detecta(texto, CFG.entidades),
        temas: NLP.detectaTemas(texto, CFG.temas),
        sentimiento: NLP.sentimiento(texto),
        indicador: NLP.indicador(texto),
        alerta: NLP.alerta(texto),
        resumen: NLP.resumen(b.titulo, cuerpo, 2)
      };
      item.impacto = NLP.impacto(item, {
        pesoFuente: fuente.weight, actores: idxActores,
        duplicados: item.replicas, ahora: ahora
      });
      salida.push(item);
    });

    return salida.sort(function (a, b) { return b.fecha - a.fecha; });
  }

  /* ---------------- fotografía diaria ---------------- */
  function fotografiaDelDia(items, dia) {
    const delDia = items.filter(function (i) { return i.dia === dia; });
    const porActor = {}, porPartido = {}, porTema = {}, porIndicador = {};
    let s = 0, n = 0, rojas = 0, amarillas = 0;

    delDia.forEach(function (i) {
      i.actores.forEach(function (a) { porActor[a] = (porActor[a] || 0) + 1; });
      i.partidos.forEach(function (p) { porPartido[p] = (porPartido[p] || 0) + 1; });
      i.temas.forEach(function (t) { porTema[t.id] = (porTema[t.id] || 0) + 1; });
      porIndicador[i.indicador] = (porIndicador[i.indicador] || 0) + 1;
      s += i.sentimiento.puntaje; n++;
      if (i.alerta.nivel === 'rojo') rojas++;
      if (i.alerta.nivel === 'amarillo') amarillas++;
    });

    return {
      dia: dia,
      total: delDia.length,
      sentimientoMedio: n ? +(s / n).toFixed(3) : 0,
      alertasRojas: rojas,
      alertasAmarillas: amarillas,
      impactoMedio: n ? +(delDia.reduce(function (a, i) { return a + i.impacto.valor; }, 0) / n).toFixed(3) : 0,
      porActor: porActor, porPartido: porPartido, porTema: porTema, porIndicador: porIndicador
    };
  }

  function reconstruirDias(items) {
    const dias = Array.from(new Set(items.map(function (i) { return i.dia; }))).sort();
    return dias.map(function (d) { return fotografiaDelDia(items, d); });
  }

  /* ---------------- ciclo de actualización ---------------- */
  function actualizar(motivo) {
    if (estado.cargando) return Promise.resolve();
    estado.cargando = true;
    UI.estadoCarga(true, motivo);

    const modoDirecto = STORE.pref('modoDirecto') === true;
    const paso = modoDirecto
      ? FETCH.leerTodasLasFuentes(function (h, t, nombre) { UI.progreso(h, t, nombre); })
      : FETCH.leerInstantanea().catch(function (e) {
          UI.aviso('No se encontró data/latest.json (' + e.message + '). Leyendo las fuentes en directo.');
          return FETCH.leerTodasLasFuentes(function (h, t, n) { UI.progreso(h, t, n); });
        });

    return paso
      .then(function (paquete) {
        estado.generado = paquete.generado || Date.now();
        estado.origen = paquete.origen || 'instantanea';
        estado.fuentes = paquete.fuentes || [];
        const nuevos = enriquecer(paquete.items || []);
        return STORE.guardarDespachos(nuevos)
          .catch(function () { return 0; })
          .then(function () { return STORE.leerDespachos(Date.now() - 400 * 86400000); })
          .then(function (historico) {
            const mapa = {};
            (historico || []).concat(nuevos).forEach(function (i) { mapa[i.id] = i; });
            const todos = Object.keys(mapa).map(function (k) { return mapa[k]; })
              .sort(function (a, b) { return b.fecha - a.fecha; });
            estado.items = todos;
            estado.hoy = todos.filter(function (i) { return i.fecha > Date.now() - 86400000; });
            estado.dias = reconstruirDias(todos);
            const hoyDia = diaDe(Date.now());
            return STORE.guardarDia(fotografiaDelDia(todos, hoyDia)).catch(function () {});
          });
      })
      .then(function () {
        STORE.pref('ultimaActualizacion', Date.now());
        UI.renderTodo();
        UI.estadoCarga(false);
        estado.cargando = false;
      })
      .catch(function (e) {
        estado.cargando = false;
        UI.estadoCarga(false);
        UI.aviso('La actualización falló: ' + e.message);
        // Aun así, mostrar lo que haya en la base local
        STORE.leerDespachos(Date.now() - 400 * 86400000).then(function (h) {
          if (h && h.length) {
            estado.items = h.sort(function (a, b) { return b.fecha - a.fecha; });
            estado.hoy = estado.items.filter(function (i) { return i.fecha > Date.now() - 86400000; });
            estado.dias = reconstruirDias(estado.items);
            UI.renderTodo();
          } else { UI.vacio(); }
        }).catch(function () { UI.vacio(); });
      });
  }

  /* ---------------- selectores de apoyo ---------------- */
  function ventana(dias) {
    const corte = Date.now() - dias * 86400000;
    return estado.items.filter(function (i) { return i.fecha >= corte; });
  }
  function conActor(id, dias) {
    return ventana(dias || 30).filter(function (i) { return i.actores.indexOf(id) >= 0; });
  }
  function conAmbito(ambito, dias) {
    return ventana(dias || 30).filter(function (i) { return i.fuenteAmbito === ambito; });
  }
  function conTema(id, dias) {
    return ventana(dias || 30).filter(function (i) {
      return i.temas.some(function (t) { return t.id === id; });
    });
  }
  function serie(dias, filtro) {
    const salida = [];
    for (let d = dias - 1; d >= 0; d--) {
      const ref = new Date(Date.now() - d * 86400000);
      const clave = diaDe(ref.getTime());
      const n = estado.items.filter(function (i) {
        return i.dia === clave && (!filtro || filtro(i));
      }).length;
      salida.push({ dia: clave, etiqueta: ref.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }), n: n });
    }
    return salida;
  }

  return {
    cfg: CFG, estado: estado,
    idxActores: idxActores, idxPartidos: idxPartidos, idxEntidades: idxEntidades, idxFuentes: idxFuentes,
    actualizar: actualizar, enriquecer: enriquecer, fotografiaDelDia: fotografiaDelDia,
    ventana: ventana, conActor: conActor, conAmbito: conAmbito, conTema: conTema, serie: serie,
    diaDe: diaDe, esc: esc, fechaCorta: fechaCorta, hace: hace
  };
})();
