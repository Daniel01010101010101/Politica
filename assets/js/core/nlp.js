/* ===================================================================
   Motor de análisis lingüístico — español (Colombia)
   -------------------------------------------------------------------
   Todo el procesamiento ocurre en el navegador, sobre los textos que
   devuelven las fuentes originales. No hay llamadas a modelos de
   lenguaje externos ni contenido redactado previamente: los resúmenes
   son extractivos (seleccionan frases del propio despacho).
   =================================================================== */
window.CIP_NLP = (function () {
  'use strict';

  /* ---------- Normalización ---------- */
  function normaliza(t) {
    return (t || '')
      .toString()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019\u201c\u201d]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sinHtml(t) {
    return (t || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  const VACIAS = new Set(('a al algo algun alguna algunas alguno algunos ante antes aqui aquel aquella aquello asi aun aunque bajo bien cada casi como con contra cual cuales cuando cuanto de del desde donde dos e el ella ellas ello ellos en entre era eran es esa esas ese eso esos esta estan estas este esto estos fue fueron ha habia han hasta hay he hoy incluso la las le les lo los mas me mediante mientras mucho muy nada ni no nos nuestra nuestro o otra otras otro otros para pero poco por porque pues que quien quienes se segun ser si sido sin sobre solo son su sus tambien tan tanto te tiene tienen toda todas todo todos tras un una uno unos usted ustedes va van ver vez y ya sera seran seria haber hacer hace hizo dijo dice dice dijo tras ademas luego ahora dia dias ano anos mismo misma cabe durante frente hacia mediante salvo versus via cuyo cuya nuevo nueva gran grandes primer primera segundo cerca lejo mil millones millon caso casos parte partes forma manera vista tema temas punto puntos pais paises cosa cosas hecho hechos vez veces mayor menor mejor peor sino desde entonces').split(' '));

  /* ---------- Léxico de sentimiento ----------
     Valores en [-3, 3]. Calibrado para discurso político colombiano. */
  const LEXICO = {
    // positivos
    'acuerdo': 1.4, 'aprobo': 1.6, 'aprobada': 1.6, 'aprobado': 1.6, 'avance': 1.6, 'avanza': 1.4,
    'beneficio': 1.5, 'crecimiento': 1.8, 'exito': 2.2, 'exitosa': 2.0, 'fortalece': 1.5,
    'garantiza': 1.3, 'impulso': 1.4, 'inversion': 1.3, 'logro': 2.0, 'mejora': 1.7, 'mejoro': 1.7,
    'progreso': 1.6, 'reactivacion': 1.6, 'recuperacion': 1.6, 'respaldo': 1.5, 'sancionada': 1.2,
    'consenso': 1.6, 'alivio': 1.5, 'record': 1.8, 'historico': 1.2,
    'reduccion de la pobreza': 2.4, 'empleo': 1.2, 'estabilidad': 1.6, 'confianza': 1.5,
    'transparencia': 1.7, 'eficiencia': 1.3, 'alianza': 1.2, 'cooperacion': 1.3, 'apoyo': 1.3,
    'reconocimiento': 1.4, 'premio': 1.5, 'inauguro': 1.3, 'entrego': 1.0, 'firmo': 0.9,
    'superavit': 1.8, 'desembolso': 0.8, 'subsidio': 0.7, 'reduccion': 0.6,
    // negativos
    'crisis': -2.4, 'escandalo': -2.8, 'corrupcion': -3.0, 'soborno': -3.0, 'peculado': -2.8,
    'fraude': -2.8, 'irregularidad': -2.2, 'irregularidades': -2.2, 'detrimento': -2.4,
    'imputacion': -2.4, 'imputo': -2.4, 'condena': -2.6, 'captura': -2.2, 'capturado': -2.2,
    'renuncia': -1.8, 'renuncio': -1.8, 'destitucion': -2.4, 'destituido': -2.4, 'sancion': -2.0,
    'investigacion': -1.6, 'indagacion': -1.6, 'demanda': -1.4, 'denuncia': -2.0, 'denuncio': -1.8,
    'fracaso': -2.4, 'hundio': -2.0, 'hundida': -2.0, 'archivado': -1.6, 'naufrago': -2.0,
    'rechazo': -1.8, 'rechaza': -1.8, 'critica': -1.5, 'criticas': -1.5, 'polemica': -1.8,
    'conflicto': -1.9, 'tension': -1.7, 'tensiones': -1.7, 'ruptura': -2.0, 'choque': -1.8,
    'protesta': -1.5, 'paro': -1.7, 'bloqueo': -1.7, 'marcha': -0.8, 'disturbios': -2.4,
    'violencia': -2.6, 'atentado': -3.0, 'asesinato': -3.0, 'masacre': -3.0, 'homicidio': -2.6,
    'secuestro': -2.8, 'extorsion': -2.5, 'amenaza': -2.2, 'amenazas': -2.2, 'bombardeo': -2.2,
    'desplazamiento': -2.2, 'narcotrafico': -2.4, 'ilegal': -2.0, 'ilegales': -2.0,
    'deficit': -1.9, 'recesion': -2.6, 'inflacion': -1.5, 'desempleo': -2.0, 'devaluacion': -1.8,
    'incumplimiento': -2.2, 'retraso': -1.5, 'demora': -1.3, 'sobrecosto': -2.2, 'costoso': -1.2,
    'caida': -1.6, 'desplome': -2.4, 'perdida': -1.8, 'perdidas': -1.8, 'riesgo': -1.5,
    'alerta': -1.4, 'emergencia': -1.8, 'colapso': -2.6, 'desabastecimiento': -2.3,
    'inexequible': -2.0, 'inconstitucional': -2.0, 'moción de censura': -2.2, 'censura': -1.8,
    'renuncia masiva': -2.6, 'escasez': -2.0, 'mora': -1.6, 'quiebra': -2.6, 'liquidacion': -2.0,
    'polarizacion': -1.8, 'insulto': -2.0, 'agresion': -2.4, 'pelea': -1.8, 'discordia': -1.7,
    'oposicion': -0.6, 'reparo': -1.2, 'reparos': -1.2, 'objecion': -1.4, 'veto': -1.6
  };

  const NEGADORES = new Set(['no', 'ni', 'sin', 'nunca', 'jamas', 'tampoco', 'nadie', 'nada']);
  const INTENSIFICA = { 'muy': 1.5, 'mas': 1.2, 'gran': 1.3, 'fuerte': 1.4, 'total': 1.5, 'grave': 1.6, 'severa': 1.6, 'severo': 1.6, 'profunda': 1.4, 'enorme': 1.5, 'masiva': 1.5, 'historica': 1.3 };
  const ATENUA = { 'poco': 0.6, 'leve': 0.6, 'ligero': 0.6, 'ligera': 0.6, 'parcial': 0.7, 'posible': 0.7, 'presunto': 0.8, 'presunta': 0.8, 'eventual': 0.7 };

  /* Clasificación por indicador */
  const INDICADORES = {
    'Económico': ['inflacion', 'ipc', 'pib', 'desempleo', 'tasa', 'dolar', 'trm', 'impuesto', 'tributaria', 'presupuesto', 'fiscal', 'deuda', 'inversion', 'mercado', 'banco', 'economia', 'empresa', 'exportacion', 'importacion', 'salario', 'recaudo', 'deficit', 'calificacion', 'petroleo', 'ecopetrol', 'bolsa'],
    'Institucional': ['corte', 'tutela', 'fiscalia', 'procuraduria', 'contraloria', 'sentencia', 'decreto', 'constitucional', 'consejo de estado', 'cne', 'registraduria', 'jurisdiccion', 'demanda', 'fallo', 'inexequible', 'nombramiento', 'posesion', 'renuncia', 'destitucion'],
    'Social': ['salud', 'educacion', 'pobreza', 'vivienda', 'subsidio', 'protesta', 'comunidad', 'indigena', 'campesino', 'victimas', 'derechos', 'genero', 'migrante', 'hospital', 'colegio', 'agua', 'servicios publicos', 'movilidad', 'seguridad', 'hurto', 'homicidio'],
    'Político': ['congreso', 'senado', 'camara', 'partido', 'coalicion', 'bancada', 'debate', 'plenaria', 'ponencia', 'votacion', 'reforma', 'gobierno', 'presidente', 'ministro', 'oposicion', 'campaña', 'elecciones', 'alcalde', 'concejo']
  };

  /* Palabras que disparan alerta temprana, con nivel */
  const ALERTAS = [
    { nivel: 'rojo', peso: 1.0, claves: ['escandalo', 'corrupcion', 'soborno', 'desfalco', 'peculado', 'carrusel', 'detrimento patrimonial', 'imputo cargos', 'medida de aseguramiento', 'captura', 'condena', 'atentado', 'masacre', 'conmocion interior', 'moción de censura', 'mocion de censura', 'renuncia del ministro', 'colapso', 'inexequible'] },
    { nivel: 'amarillo', peso: 0.6, claves: ['investigacion', 'indagacion', 'pliego de cargos', 'denuncia', 'irregularidad', 'renuncia', 'objecion', 'polemica', 'tension', 'choque', 'paro', 'bloqueo', 'demanda de inconstitucionalidad', 'archivado', 'hundio', 'crisis', 'alerta', 'sobrecosto', 'incumplimiento', 'retraso'] }
  ];

  /* ---------- Utilidades ---------- */
  function tokens(texto) {
    return normaliza(texto).replace(/[^a-z0-9ñ\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function contiene(textoNorm, frase) {
    const f = normaliza(frase);
    if (f.indexOf(' ') >= 0) return textoNorm.indexOf(f) >= 0;
    return new RegExp('(^|[^a-z0-9ñ])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9ñ]|$)').test(textoNorm);
  }

  /* ---------- Sentimiento ---------- */
  function sentimiento(texto) {
    const tn = normaliza(texto);
    const tk = tokens(texto);
    let suma = 0, aciertos = 0;

    // frases multipalabra
    Object.keys(LEXICO).forEach(function (k) {
      if (k.indexOf(' ') > 0 && tn.indexOf(k) >= 0) { suma += LEXICO[k]; aciertos++; }
    });

    for (let i = 0; i < tk.length; i++) {
      const v = LEXICO[tk[i]];
      if (v === undefined) continue;
      let valor = v;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (NEGADORES.has(tk[j])) valor = -valor * 0.75;
        if (INTENSIFICA[tk[j]]) valor *= INTENSIFICA[tk[j]];
        if (ATENUA[tk[j]]) valor *= ATENUA[tk[j]];
      }
      suma += valor; aciertos++;
    }

    if (!aciertos) return { puntaje: 0, etiqueta: 'Neutral', densidad: 0 };
    // Saturación suave: conserva el matiz en la zona media y nunca supera ±1
    const norm = suma / (Math.abs(suma) + 4.2);
    return {
      puntaje: +norm.toFixed(3),
      etiqueta: norm > 0.12 ? 'Positivo' : (norm < -0.12 ? 'Negativo' : 'Neutral'),
      densidad: +(aciertos / Math.max(1, tk.length)).toFixed(3)
    };
  }

  /* ---------- Detección de entidades ---------- */
  function detecta(texto, catalogo, campoAlias) {
    const tn = normaliza(texto);
    const hallados = [];
    catalogo.forEach(function (e) {
      const nombres = [e.nombre].concat(e[campoAlias || 'alias'] || []);
      for (let i = 0; i < nombres.length; i++) {
        if (contiene(tn, nombres[i])) { hallados.push(e.id); break; }
      }
    });
    return hallados;
  }

  function detectaTemas(texto, temas) {
    const tn = normaliza(texto);
    const hallados = [];
    temas.forEach(function (t) {
      for (let i = 0; i < t.claves.length; i++) {
        if (contiene(tn, t.claves[i])) { hallados.push({ id: t.id, nombre: t.nombre, peso: t.peso }); break; }
      }
    });
    return hallados;
  }

  function indicador(texto) {
    const tn = normaliza(texto);
    let mejor = 'Político', max = 0;
    Object.keys(INDICADORES).forEach(function (k) {
      let n = 0;
      INDICADORES[k].forEach(function (w) { if (contiene(tn, w)) n++; });
      if (n > max) { max = n; mejor = k; }
    });
    return mejor;
  }

  /* ---------- Alerta ---------- */
  function alerta(texto) {
    const tn = normaliza(texto);
    let nivel = 'verde', peso = 0, disparadores = [];
    ALERTAS.forEach(function (a) {
      a.claves.forEach(function (c) {
        if (contiene(tn, c)) {
          disparadores.push(c);
          if (a.peso > peso) { peso = a.peso; nivel = a.nivel; }
        }
      });
    });
    return { nivel: nivel, peso: peso, disparadores: disparadores.slice(0, 4) };
  }

  /* ---------- Resumen extractivo ----------
     Selecciona las frases del propio despacho con mayor densidad de
     términos relevantes. No genera texto nuevo. */
  function resumen(titulo, cuerpo, maxFrases) {
    const limpio = sinHtml(cuerpo || '');
    if (!limpio) return '';
    const frases = limpio.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/).filter(function (f) { return f.length > 40; });
    if (frases.length <= 1) return limpio.slice(0, 320);

    const clave = {};
    tokens(titulo).forEach(function (t) { if (!VACIAS.has(t) && t.length > 3) clave[t] = 2; });
    tokens(limpio).forEach(function (t) { if (!VACIAS.has(t) && t.length > 3) clave[t] = (clave[t] || 0) + 1; });

    const puntuadas = frases.map(function (f, i) {
      let p = 0;
      tokens(f).forEach(function (t) { p += (clave[t] || 0); });
      return { f: f, p: p / Math.sqrt(f.length) - i * 0.02 };
    }).sort(function (a, b) { return b.p - a.p; }).slice(0, maxFrases || 2);

    return puntuadas
      .sort(function (a, b) { return frases.indexOf(a.f) - frases.indexOf(b.f); })
      .map(function (x) { return x.f.trim(); })
      .join(' ')
      .slice(0, 420);
  }

  /* ---------- Palabras clave y n-gramas ---------- */
  function palabrasClave(textos, limite, incluirBigramas) {
    const freq = {};
    textos.forEach(function (t) {
      const tk = tokens(t).filter(function (w) { return w.length > 3 && !VACIAS.has(w) && !/^\d+$/.test(w); });
      tk.forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
      if (incluirBigramas !== false) {
        for (let i = 0; i < tk.length - 1; i++) {
          const bg = tk[i] + ' ' + tk[i + 1];
          freq[bg] = (freq[bg] || 0) + 1.4;   // los bigramas informan más
        }
      }
    });
    return Object.keys(freq)
      .map(function (k) { return { palabra: k, valor: Math.round(freq[k] * 10) / 10 }; })
      .filter(function (x) { return x.valor >= 2; })
      .sort(function (a, b) { return b.valor - a.valor; })
      .slice(0, limite || 120);
  }

  /* ---------- Puntaje de impacto ----------
     0–1. Componentes explicables, sin caja negra. */
  function impacto(item, ctx) {
    const pesoFuente = ctx.pesoFuente || 0.6;
    const pesoActor = (item.actores || []).reduce(function (m, a) {
      const act = ctx.actores[a]; return Math.max(m, act ? act.peso : 0);
    }, 0.12);
    const pesoTema = (item.temas || []).reduce(function (m, t) { return Math.max(m, t.peso); }, 0.15);
    const corrobora = Math.min(1, ((ctx.duplicados || 1) - 1) / 3);   // cuántas fuentes lo replican
    const horas = Math.max(0, (ctx.ahora - item.fecha) / 3600000);
    const recencia = Math.exp(-horas / 30);                            // vida media ~21 h
    const carga = Math.abs(item.sentimiento ? item.sentimiento.puntaje : 0);
    const alertaPeso = item.alerta ? item.alerta.peso : 0;

    const s = 0.20 * pesoFuente + 0.22 * pesoActor + 0.26 * pesoTema +
              0.12 * corrobora + 0.10 * recencia + 0.06 * carga + 0.04 * alertaPeso;

    const v = Math.max(0, Math.min(1, s));
    return {
      valor: +v.toFixed(3),
      nivel: v >= 0.70 ? 'Muy Alto' : v >= 0.55 ? 'Alto' : v >= 0.42 ? 'Medio' : 'Bajo',
      componentes: {
        fuente: +pesoFuente.toFixed(2), actor: +pesoActor.toFixed(2), tema: +pesoTema.toFixed(2),
        corroboracion: +corrobora.toFixed(2), recencia: +recencia.toFixed(2)
      }
    };
  }

  /* ---------- Huella para deduplicar ---------- */
  function huella(titulo) {
    const tk = tokens(titulo).filter(function (w) { return w.length > 3 && !VACIAS.has(w); }).sort();
    return tk.slice(0, 9).join('-');
  }

  return {
    normaliza: normaliza, sinHtml: sinHtml, tokens: tokens, contiene: contiene,
    sentimiento: sentimiento, detecta: detecta, detectaTemas: detectaTemas,
    indicador: indicador, alerta: alerta, resumen: resumen,
    palabrasClave: palabrasClave, impacto: impacto, huella: huella,
    VACIAS: VACIAS
  };
})();
