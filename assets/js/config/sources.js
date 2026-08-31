/* ===================================================================
   Centro de Inteligencia Política — Configuración de fuentes
   -------------------------------------------------------------------
   Este archivo es la ÚNICA fuente de verdad. Lo consumen:
     • el navegador  (window.CIP_SOURCES)
     • el recolector (require('.../sources.js') en Node)

   Todo dato del tablero proviene de estas fuentes. Ninguna cifra,
   titular o resumen está escrito a mano en el código.
   =================================================================== */
(function (root, factory) {
  var cfg = factory();
  if (typeof module === 'object' && module.exports) module.exports = cfg;
  else root.CIP_SOURCES = cfg;
})(typeof self !== 'undefined' ? self : globalThis, function () {

  /* Consulta a Google News RSS restringida a un dominio.
     Sirve como capa de descubrimiento para sitios oficiales que no
     publican RSS propio (Senado, Cámara, Concejo). Devuelve enlaces
     al sitio original, no contenido de terceros. */
  function gnews(query) {
    return 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) +
           '&hl=es-419&gl=CO&ceid=CO:es-419';
  }

  return {

    /* --------------------------------------------------------------
       1. FUENTES
       weight  = confianza editorial / institucional (0–1). Pondera el
                 puntaje de impacto: una nota de Presidencia pesa más
                 que un agregador.
       feeds   = se intentan en orden; el primero que responda gana.
       -------------------------------------------------------------- */
    fuentes: [
      /* --- Institucionales / oficiales --- */
      {
        id: 'presidencia', nombre: 'Presidencia de la República',
        categoria: 'oficial', ambito: 'nacional', weight: 1.00,
        sitio: 'https://www.presidencia.gov.co',
        feeds: [
          'https://www.presidencia.gov.co/prensa/Paginas/rss.aspx',
          gnews('site:presidencia.gov.co')
        ]
      },
      {
        id: 'senado', nombre: 'Senado de la República',
        categoria: 'oficial', ambito: 'congreso', weight: 1.00,
        sitio: 'https://www.senado.gov.co',
        feeds: [gnews('site:senado.gov.co OR (Senado Colombia plenaria OR ponencia OR votación)')]
      },
      {
        id: 'camara', nombre: 'Cámara de Representantes',
        categoria: 'oficial', ambito: 'congreso', weight: 1.00,
        sitio: 'https://www.camara.gov.co',
        feeds: [gnews('site:camara.gov.co OR ("Cámara de Representantes" Colombia debate OR proyecto)')]
      },
      {
        id: 'concejo-bogota', nombre: 'Concejo de Bogotá',
        categoria: 'oficial', ambito: 'bogota', weight: 0.95,
        sitio: 'https://concejodebogota.gov.co',
        feeds: [gnews('site:concejodebogota.gov.co OR "Concejo de Bogotá"')]
      },
      {
        id: 'alcaldia-bogota', nombre: 'Alcaldía Mayor de Bogotá',
        categoria: 'oficial', ambito: 'bogota', weight: 0.95,
        sitio: 'https://bogota.gov.co',
        feeds: [
          'https://bogota.gov.co/rss.xml',
          gnews('site:bogota.gov.co OR "Alcaldía de Bogotá"')
        ]
      },
      {
        id: 'organismos-control', nombre: 'Organismos de control',
        categoria: 'oficial', ambito: 'control', weight: 1.00,
        sitio: 'https://www.procuraduria.gov.co',
        feeds: [gnews('site:procuraduria.gov.co OR site:contraloria.gov.co OR site:fiscalia.gov.co')]
      },
      {
        id: 'dane-banrep', nombre: 'DANE y Banco de la República',
        categoria: 'oficial', ambito: 'economia', weight: 1.00,
        sitio: 'https://www.dane.gov.co',
        feeds: [gnews('site:dane.gov.co OR site:banrep.gov.co inflación OR PIB OR desempleo OR tasa')]
      },

      /* --- Medios (RSS propio verificado + respaldo) --- */
      {
        id: 'eltiempo-politica', nombre: 'El Tiempo · Política',
        categoria: 'medio', ambito: 'nacional', weight: 0.85,
        sitio: 'https://www.eltiempo.com/politica',
        feeds: ['https://www.eltiempo.com/rss/politica.xml']
      },
      {
        id: 'eltiempo-gobierno', nombre: 'El Tiempo · Gobierno',
        categoria: 'medio', ambito: 'nacional', weight: 0.85,
        sitio: 'https://www.eltiempo.com/politica/gobierno',
        feeds: ['https://www.eltiempo.com/rss/politica_gobierno.xml']
      },
      {
        id: 'eltiempo-congreso', nombre: 'El Tiempo · Congreso',
        categoria: 'medio', ambito: 'congreso', weight: 0.85,
        sitio: 'https://www.eltiempo.com/politica/congreso',
        feeds: ['https://www.eltiempo.com/rss/politica_congreso.xml']
      },
      {
        id: 'eltiempo-partidos', nombre: 'El Tiempo · Partidos',
        categoria: 'medio', ambito: 'partidos', weight: 0.85,
        sitio: 'https://www.eltiempo.com/politica/partidos-politicos',
        feeds: ['https://www.eltiempo.com/rss/politica_partidos-politicos.xml']
      },
      {
        id: 'eltiempo-bogota', nombre: 'El Tiempo · Bogotá',
        categoria: 'medio', ambito: 'bogota', weight: 0.85,
        sitio: 'https://www.eltiempo.com/bogota',
        feeds: ['https://www.eltiempo.com/rss/bogota.xml']
      },
      {
        id: 'eltiempo-justicia', nombre: 'El Tiempo · Justicia',
        categoria: 'medio', ambito: 'control', weight: 0.85,
        sitio: 'https://www.eltiempo.com/justicia',
        feeds: ['https://www.eltiempo.com/rss/justicia.xml']
      },
      {
        id: 'eltiempo-economia', nombre: 'El Tiempo · Economía',
        categoria: 'medio', ambito: 'economia', weight: 0.80,
        sitio: 'https://www.eltiempo.com/economia',
        feeds: ['https://www.eltiempo.com/rss/economia.xml']
      },
      {
        id: 'portafolio', nombre: 'Portafolio',
        categoria: 'medio', ambito: 'economia', weight: 0.85,
        sitio: 'https://www.portafolio.co',
        feeds: [
          'https://www.portafolio.co/rss/economia.xml',
          'https://www.portafolio.co/rss/portafolio.xml',
          gnews('site:portafolio.co economía OR gobierno OR reforma')
        ]
      },
      {
        id: 'larepublica', nombre: 'La República',
        categoria: 'medio', ambito: 'economia', weight: 0.85,
        sitio: 'https://www.larepublica.co',
        feeds: [
          'https://www.larepublica.co/rss/economia',
          'https://www.larepublica.co/rss',
          gnews('site:larepublica.co economía OR congreso OR reforma')
        ]
      },
      {
        id: 'semana', nombre: 'Semana',
        categoria: 'medio', ambito: 'nacional', weight: 0.75,
        sitio: 'https://www.semana.com',
        feeds: [
          'https://www.semana.com/arc/outboundfeeds/rss/category/nacion/?outputType=xml',
          'https://www.semana.com/arc/outboundfeeds/rss/?outputType=xml',
          gnews('site:semana.com política OR gobierno OR congreso')
        ]
      },
      {
        id: 'cambio', nombre: 'Cambio',
        categoria: 'medio', ambito: 'nacional', weight: 0.80,
        sitio: 'https://cambiocolombia.com',
        feeds: [
          'https://cambiocolombia.com/rss.xml',
          gnews('site:cambiocolombia.com')
        ]
      },
      {
        id: 'infobae-co', nombre: 'Infobae Colombia',
        categoria: 'medio', ambito: 'nacional', weight: 0.70,
        sitio: 'https://www.infobae.com/colombia',
        feeds: [
          'https://www.infobae.com/arc/outboundfeeds/feeds/navigation/colombia/?outputType=xml',
          'https://www.infobae.com/colombia/rss/',
          gnews('site:infobae.com/colombia política')
        ]
      },

      /* --- Consultas temáticas transversales (multi-medio) --- */
      {
        id: 'tema-reformas', nombre: 'Seguimiento · Reformas',
        categoria: 'tematica', ambito: 'nacional', weight: 0.65,
        sitio: 'https://news.google.com',
        feeds: [gnews('reforma (salud OR pensional OR laboral OR tributaria OR justicia) Colombia')]
      },
      {
        id: 'tema-nombramientos', nombre: 'Seguimiento · Nombramientos',
        categoria: 'tematica', ambito: 'nacional', weight: 0.65,
        sitio: 'https://news.google.com',
        feeds: [gnews('(nombramiento OR designó OR posesionó OR renuncia) ministro OR director Colombia')]
      },
      {
        id: 'tema-investigaciones', nombre: 'Seguimiento · Investigaciones',
        categoria: 'tematica', ambito: 'control', weight: 0.65,
        sitio: 'https://news.google.com',
        feeds: [gnews('(Fiscalía OR Procuraduría OR Contraloría OR CNE) investigación congresista OR ministro OR funcionario')]
      },
      {
        id: 'tema-pacto', nombre: 'Seguimiento · Pacto Histórico',
        categoria: 'tematica', ambito: 'partidos', weight: 0.65,
        sitio: 'https://news.google.com',
        feeds: [gnews('"Pacto Histórico" OR "Gustavo Petro" Colombia')]
      },
      {
        id: 'tema-bogota', nombre: 'Seguimiento · Bogotá',
        categoria: 'tematica', ambito: 'bogota', weight: 0.65,
        sitio: 'https://news.google.com',
        feeds: [gnews('Bogotá (alcaldía OR concejo OR TransMilenio OR metro OR seguridad OR POT)')]
      },

      /* --- Canales oficiales de YouTube (RSS nativo, sin API key) ---
         Reemplace channel_id por el de cada canal que quiera vigilar.
         Cómo obtenerlo: docs/FUENTES.md → «Canales de YouTube». */
      {
        id: 'youtube-oficial', nombre: 'YouTube · Canales oficiales',
        categoria: 'video', ambito: 'nacional', weight: 0.60,
        sitio: 'https://www.youtube.com',
        activo: false,
        feeds: ['https://www.youtube.com/feeds/videos.xml?channel_id=REEMPLACE_CHANNEL_ID']
      }
    ],

    /* --------------------------------------------------------------
       2. ACTORES POLÍTICOS
       peso = relevancia institucional para el puntaje de impacto.
       Actualizado al periodo presidencial 2026–2030.
       -------------------------------------------------------------- */
    actores: [
      { id: 'delaespriella', nombre: 'Abelardo de la Espriella', rol: 'Presidente de la República', bloque: 'gobierno', peso: 1.00, alias: ['de la espriella', 'delaespriella', 'el tigre', 'presidente de la espriella'] },
      { id: 'restrepo', nombre: 'José Manuel Restrepo', rol: 'Vicepresidente', bloque: 'gobierno', peso: 0.90, alias: ['jose manuel restrepo', 'vicepresidente restrepo'] },
      { id: 'petro', nombre: 'Gustavo Petro', rol: 'Expresidente', bloque: 'pacto', peso: 0.95, alias: ['petro', 'expresidente petro', 'gustavo francisco petro'] },
      { id: 'francia', nombre: 'Francia Márquez', rol: 'Exvicepresidenta', bloque: 'pacto', peso: 0.75, alias: ['francia marquez'] },
      { id: 'galan', nombre: 'Carlos Fernando Galán', rol: 'Alcalde de Bogotá', bloque: 'bogota', peso: 0.90, alias: ['galan', 'alcalde galan', 'carlos fernando galan'] },
      { id: 'henriquez', nombre: 'Honorio Henríquez', rol: 'Presidente del Senado', bloque: 'congreso', peso: 0.85, alias: ['honorio henriquez', 'henriquez pinedo'] },
      { id: 'pizarro', nombre: 'María José Pizarro', rol: 'Senadora', bloque: 'pacto', peso: 0.70, alias: ['maria jose pizarro'] },
      { id: 'cepeda', nombre: 'Iván Cepeda', rol: 'Senador', bloque: 'pacto', peso: 0.75, alias: ['ivan cepeda'] },
      { id: 'uribe', nombre: 'Álvaro Uribe Vélez', rol: 'Expresidente', bloque: 'centro-democratico', peso: 0.85, alias: ['alvaro uribe', 'uribe velez', 'expresidente uribe'] },
      { id: 'benedetti', nombre: 'Armando Benedetti', rol: 'Exministro', bloque: 'pacto', peso: 0.65, alias: ['benedetti'] },
      { id: 'name', nombre: 'Efraín Cepeda', rol: 'Senador', bloque: 'conservador', peso: 0.60, alias: ['efrain cepeda'] },
      { id: 'fiscal', nombre: 'Fiscalía General', rol: 'Órgano de control', bloque: 'control', peso: 0.85, alias: ['fiscalia', 'fiscal general'] },
      { id: 'procurador', nombre: 'Procuraduría General', rol: 'Órgano de control', bloque: 'control', peso: 0.80, alias: ['procuraduria', 'procurador'] },
      { id: 'contralor', nombre: 'Contraloría General', rol: 'Órgano de control', bloque: 'control', peso: 0.80, alias: ['contraloria', 'contralor'] },
      { id: 'cortecons', nombre: 'Corte Constitucional', rol: 'Alta corte', bloque: 'judicial', peso: 0.85, alias: ['corte constitucional'] },
      { id: 'cortesup', nombre: 'Corte Suprema', rol: 'Alta corte', bloque: 'judicial', peso: 0.80, alias: ['corte suprema'] },
      { id: 'cne', nombre: 'Consejo Nacional Electoral', rol: 'Autoridad electoral', bloque: 'control', peso: 0.70, alias: ['cne', 'consejo nacional electoral'] },
      { id: 'banrep', nombre: 'Banco de la República', rol: 'Autoridad monetaria', bloque: 'economia', peso: 0.80, alias: ['banco de la republica', 'banrep', 'junta directiva del banco'] }
    ],

    /* --------------------------------------------------------------
       3. PARTIDOS
       -------------------------------------------------------------- */
    partidos: [
      { id: 'pacto', nombre: 'Pacto Histórico', color: '#8B0000', alias: ['pacto historico', 'polo democratico', 'union patriotica', 'colombia humana', 'progresistas'] },
      { id: 'centro-democratico', nombre: 'Centro Democrático', color: '#1F4E79', alias: ['centro democratico', 'uribismo'] },
      { id: 'liberal', nombre: 'Partido Liberal', color: '#C62828', alias: ['partido liberal', 'liberalismo'] },
      { id: 'cambio-radical', nombre: 'Cambio Radical', color: '#B8860B', alias: ['cambio radical'] },
      { id: 'conservador', nombre: 'Partido Conservador', color: '#2E6B4F', alias: ['partido conservador', 'conservatismo'] },
      { id: 'verde', nombre: 'Alianza Verde', color: '#4C8C2B', alias: ['alianza verde', 'partido verde'] },
      { id: 'nuevo-liberalismo', nombre: 'Nuevo Liberalismo', color: '#6A4C93', alias: ['nuevo liberalismo'] },
      { id: 'la-u', nombre: 'Partido de la U', color: '#D2691E', alias: ['partido de la u', 'la u'] },
      { id: 'mira', nombre: 'MIRA / Colombia Justa', color: '#00838F', alias: ['partido mira', 'colombia justa libres'] }
    ],

    /* --------------------------------------------------------------
       4. ENTIDADES DEL ESTADO
       -------------------------------------------------------------- */
    entidades: [
      { id: 'minhacienda', nombre: 'Ministerio de Hacienda', alias: ['minhacienda', 'ministerio de hacienda'] },
      { id: 'mininterior', nombre: 'Ministerio del Interior', alias: ['mininterior', 'ministerio del interior'] },
      { id: 'mindefensa', nombre: 'Ministerio de Defensa', alias: ['mindefensa', 'ministerio de defensa'] },
      { id: 'minsalud', nombre: 'Ministerio de Salud', alias: ['minsalud', 'ministerio de salud'] },
      { id: 'mintrabajo', nombre: 'Ministerio de Trabajo', alias: ['mintrabajo', 'ministerio de trabajo'] },
      { id: 'minjusticia', nombre: 'Ministerio de Justicia', alias: ['minjusticia', 'ministerio de justicia'] },
      { id: 'minminas', nombre: 'Ministerio de Minas y Energía', alias: ['minminas', 'ministerio de minas'] },
      { id: 'mineducacion', nombre: 'Ministerio de Educación', alias: ['mineducacion', 'ministerio de educacion'] },
      { id: 'cancilleria', nombre: 'Cancillería', alias: ['cancilleria', 'ministerio de relaciones exteriores'] },
      { id: 'dnp', nombre: 'Planeación Nacional', alias: ['dnp', 'planeacion nacional'] },
      { id: 'dane', nombre: 'DANE', alias: ['dane'] },
      { id: 'transmilenio', nombre: 'TransMilenio', alias: ['transmilenio'] },
      { id: 'metro-bogota', nombre: 'Metro de Bogotá', alias: ['metro de bogota', 'primera linea del metro'] },
      { id: 'idu', nombre: 'IDU', alias: ['idu', 'instituto de desarrollo urbano'] },
      { id: 'secretaria-seguridad', nombre: 'Secretaría de Seguridad', alias: ['secretaria de seguridad'] }
    ],

    /* --------------------------------------------------------------
       5. TEMAS VIGILADOS  (peso = severidad para impacto y alertas)
       -------------------------------------------------------------- */
    temas: [
      { id: 'reforma-salud',     nombre: 'Reforma a la salud',     peso: 0.95, claves: ['reforma a la salud', 'reforma de salud', 'eps', 'adres', 'sistema de salud'] },
      { id: 'reforma-pensional', nombre: 'Reforma pensional',      peso: 0.90, claves: ['reforma pensional', 'pensiones', 'colpensiones', 'pilar solidario'] },
      { id: 'reforma-laboral',   nombre: 'Reforma laboral',        peso: 0.85, claves: ['reforma laboral', 'jornada laboral', 'recargo nocturno'] },
      { id: 'reforma-tributaria',nombre: 'Reforma tributaria',     peso: 0.95, claves: ['reforma tributaria', 'ley de financiamiento', 'impuestos', 'iva', 'recaudo'] },
      { id: 'presupuesto',       nombre: 'Presupuesto General',    peso: 0.90, claves: ['presupuesto general', 'pgn', 'adición presupuestal', 'regla fiscal', 'marco fiscal'] },
      { id: 'orden-publico',     nombre: 'Orden público',          peso: 0.90, claves: ['orden publico', 'atentado', 'disidencias', 'eln', 'clan del golfo', 'bombardeo', 'secuestro'] },
      { id: 'paz-total',         nombre: 'Paz y seguridad',        peso: 0.80, claves: ['paz total', 'negociacion', 'cese al fuego', 'mesa de dialogo'] },
      { id: 'corrupcion',        nombre: 'Corrupción',             peso: 1.00, claves: ['corrupcion', 'soborno', 'peculado', 'carrusel', 'coima', 'detrimento patrimonial', 'contrato irregular'] },
      { id: 'investigacion',     nombre: 'Investigaciones',        peso: 0.90, claves: ['imputacion', 'imputó cargos', 'condena', 'captura', 'indagacion', 'pliego de cargos', 'destitucion', 'medida de aseguramiento'] },
      { id: 'nombramientos',     nombre: 'Nombramientos',          peso: 0.70, claves: ['nombramiento', 'designo', 'posesiono', 'renuncia', 'relevo', 'nuevo ministro', 'encargado'] },
      { id: 'congreso',          nombre: 'Trámite legislativo',    peso: 0.80, claves: ['proyecto de ley', 'ponencia', 'plenaria', 'primer debate', 'segundo debate', 'comision primera', 'comision septima', 'conciliacion', 'archivado', 'aprobado en', 'moción de censura', 'citacion'] },
      { id: 'electoral',         nombre: 'Agenda electoral',       peso: 0.75, claves: ['elecciones', 'consulta', 'campaña', 'candidato', 'registraduria', 'financiacion de campaña'] },
      { id: 'movilidad',         nombre: 'Movilidad Bogotá',       peso: 0.65, claves: ['transmilenio', 'metro de bogota', 'pico y placa', 'troncal', 'ciclorruta', 'peaje'] },
      { id: 'seguridad-bogota',  nombre: 'Seguridad Bogotá',       peso: 0.75, claves: ['hurto', 'homicidios en bogota', 'extorsion', 'inseguridad', 'policia metropolitana'] },
      { id: 'macro',             nombre: 'Indicadores macro',      peso: 0.70, claves: ['inflacion', 'ipc', 'pib', 'desempleo', 'tasa de interes', 'dolar', 'trm', 'calificacion crediticia', 'deficit fiscal', 'riesgo pais'] },
      { id: 'constitucional',    nombre: 'Choque institucional',   peso: 0.95, claves: ['tutela', 'demanda de inconstitucionalidad', 'inexequible', 'conmocion interior', 'decreto', 'choque de poderes', 'constituyente'] }
    ],

    /* --------------------------------------------------------------
       6. RED — proxies para lectura directa desde el navegador
       El recolector (GitHub Actions) no los necesita. Solo se usan
       cuando el usuario pulsa «Actualizar ahora» en modo directo.
       -------------------------------------------------------------- */
    red: {
      proxies: [
        { id: 'allorigins', nombre: 'AllOrigins', plantilla: 'https://api.allorigins.win/raw?url={url}' },
        { id: 'codetabs',   nombre: 'CodeTabs',   plantilla: 'https://api.codetabs.com/v1/proxy?quest={url}' },
        { id: 'corsproxy',  nombre: 'corsproxy.io', plantilla: 'https://corsproxy.io/?{url}' },
        { id: 'propio',     nombre: 'Proxy propio (Cloudflare Worker)', plantilla: '' }
      ],
      proxyPorDefecto: 'allorigins',
      timeoutMs: 15000,
      maxItemsPorFuente: 40,
      ventanaDias: 30
    },

    /* --------------------------------------------------------------
       7. PROGRAMACIÓN
       -------------------------------------------------------------- */
    programacion: {
      horaDiaria: '07:00',
      zonaHoraria: 'America/Bogota',
      utcCron: '0 12 * * *'   // 07:00 en Bogotá (UTC-5, sin horario de verano)
    },

    /* --------------------------------------------------------------
       8. INTEGRACIONES QUE EXIGEN CREDENCIAL
       Se activan poniendo secretos en el repositorio. Ver docs.
       -------------------------------------------------------------- */
    integraciones: {
      x: {
        activo: false,
        nombre: 'X / Twitter API v2',
        endpoint: 'https://api.twitter.com/2/tweets/search/recent',
        secreto: 'X_BEARER_TOKEN',
        consultas: [
          '(Petro OR "Pacto Histórico" OR Congreso) lang:es place_country:CO -is:retweet',
          '("de la Espriella" OR Presidencia OR reforma) lang:es place_country:CO -is:retweet'
        ],
        nota: 'Requiere plan de pago. Sin token, el Módulo 7 usa tendencias derivadas de titulares.'
      },
      trends: {
        activo: false,
        nombre: 'Google Trends (RSS de tendencias diarias)',
        endpoint: 'https://trends.google.com/trending/rss?geo=CO',
        nota: 'Sin API oficial. El recolector lee el RSS público de tendencias diarias de Colombia.'
      }
    }
  };
});
