/* ===================================================================
   MÓDULO 13 · Cronología por horas
   -------------------------------------------------------------------
   El módulo 1 ordena por peso: qué importa más. Este ordena por reloj:
   qué acaba de pasar. Son lecturas distintas y ninguna sustituye a la
   otra —una noticia menor recién publicada puede ser la señal del día—,
   así que aquí manda la hora y el impacto queda como marca al margen.

   Las horas son las del navegador de quien mira, no las del servidor.
   =================================================================== */
(function () {
  'use strict';

  const VENTANAS = [
    { horas: 24, etiqueta: '24 horas' },
    { horas: 48, etiqueta: '48 horas' },
    { horas: 168, etiqueta: '7 días' }
  ];

  /* Niveles de impacto, del más alto al más bajo, con su color de señal */
  const NIVELES = [
    { nombre: 'Muy Alto', color: '#E92025' },
    { nombre: 'Alto',     color: '#F49A20' },
    { nombre: 'Medio',    color: '#8E378E' },
    { nombre: 'Bajo',     color: '#5B6472' }
  ];

  function nivelClase(n) { return 'n-' + n.replace(/ /g, '-').toLowerCase(); }

  /* Instante de la hora en punto a la que pertenece una fecha */
  function claveHora(ms) {
    const d = new Date(ms);
    d.setMinutes(0, 0, 0);
    return d.getTime();
  }

  function soloHora(ms) {
    return new Date(ms).toLocaleTimeString('es-CO', { hour: 'numeric', hour12: true });
  }

  function horaMinuto(ms) {
    return new Date(ms).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  /* Etiqueta de eje: «13:00». El formato de 12 horas ocupa el doble y se
     solapa; el día lo aporta el tooltip, que sí tiene sitio. */
  function horaEje(ms) {
    return String(new Date(ms).getHours()).padStart(2, '0') + ':00';
  }

  /* «Hoy», «Ayer» o la fecha, según a qué día pertenece la hora */
  function diaRelativo(ms) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const dia = new Date(ms); dia.setHours(0, 0, 0, 0);
    const dif = Math.round((hoy - dia) / 86400000);
    if (dif === 0) return 'Hoy';
    if (dif === 1) return 'Ayer';
    return dia.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  /* Todas las horas de la ventana, incluidas las vacías: un hueco de
     silencio es información, y taparlo deformaría el eje. */
  function horasDeLaVentana(horas) {
    const fin = claveHora(Date.now());
    const salida = [];
    for (let k = horas - 1; k >= 0; k--) salida.push(fin - k * 3600000);
    return salida;
  }

  UI.registrar({
    id: 'm13',
    render: function () {
      const cuerpo = document.querySelector('#m13 .modulo-cuerpo');
      if (!cuerpo) return;

      const guardada = parseInt(window.CIP_STORE.pref('cronoVentana'), 10);
      const activa = VENTANAS.some(function (v) { return v.horas === guardada; }) ? guardada : 24;

      if (!CIP.estado.items.length) {
        cuerpo.innerHTML = '<div class="estado-vacio"><p>Todavía no hay despachos que ordenar.</p>' +
          '<p class="tenue">Pulse «Actualizar ahora» para leer las fuentes.</p></div>';
        return;
      }
      cuerpo.dataset.tieneDatos = '1';

      /* Armazón fijo: los contenedores de gráfico no se reemplazan, así
         ECharts reutiliza sus instancias al cambiar de ventana. */
      cuerpo.innerHTML =
        '<div class="conmutador" role="tablist" aria-label="Ventana de tiempo">' +
          VENTANAS.map(function (v) {
            return '<button type="button" role="tab" data-horas="' + v.horas + '"' +
              (v.horas === activa ? ' class="activo" aria-selected="true"' : ' aria-selected="false"') +
              '>' + v.etiqueta + '</button>';
          }).join('') +
        '</div>' +
        '<div id="crono-cifras" class="crono-cifras"></div>' +
        '<div class="rejilla-2">' +
          '<div><h4>Despachos por hora y tono medio</h4>' +
            '<div id="g-crono-volumen" class="lienzo alto-240"></div></div>' +
          '<div><h4>Peso de cada hora, por nivel de impacto</h4>' +
            '<div id="g-crono-impacto" class="lienzo alto-240"></div></div>' +
        '</div>' +
        '<h4 class="crono-titulo-lista">Del despacho más reciente al más antiguo</h4>' +
        '<div id="crono-lista" class="crono-lista"></div>' +
        '<p class="tenue pie-nota" id="crono-pie"></p>';

      function dibujar(horas) {
        const desde = claveHora(Date.now()) - (horas - 1) * 3600000;
        const items = CIP.estado.items
          .filter(function (i) { return i.fecha >= desde; })
          .sort(function (a, b) { return b.fecha - a.fecha; });

        const cubos = {};
        horasDeLaVentana(horas).forEach(function (h) {
          cubos[h] = { hora: h, items: [], suma: 0, niveles: { 'Muy Alto': 0, 'Alto': 0, 'Medio': 0, 'Bajo': 0 } };
        });
        items.forEach(function (i) {
          const c = cubos[claveHora(i.fecha)];
          if (!c) return;                       // fuera de la ventana por redondeo
          c.items.push(i);
          c.suma += i.sentimiento.puntaje;
          c.niveles[i.impacto.nivel] = (c.niveles[i.impacto.nivel] || 0) + 1;
        });

        const orden = Object.keys(cubos).map(Number).sort(function (a, b) { return a - b; });
        const serie = orden.map(function (h) { return cubos[h]; });

        /* ---------- cifras de cabecera ---------- */
        const ultimo = items[0];
        const masActiva = serie.slice().sort(function (a, b) { return b.items.length - a.items.length; })[0];
        const corte = Date.now() - 3 * 3600000;
        const recientes = items.filter(function (i) { return i.fecha >= corte; }).length;
        const previos = items.filter(function (i) {
          return i.fecha >= corte - 3 * 3600000 && i.fecha < corte;
        }).length;
        const ritmo = previos ? Math.round(((recientes - previos) / previos) * 100) : null;

        document.getElementById('crono-cifras').innerHTML =
          bloqueCifra('Última publicación', ultimo ? CIP.hace(ultimo.fecha) : '—',
                      ultimo ? CIP.esc(ultimo.fuenteNombre) : 'sin despachos en la ventana') +
          bloqueCifra('Hora más activa',
                      masActiva && masActiva.items.length ? soloHora(masActiva.hora) : '—',
                      masActiva && masActiva.items.length
                        ? masActiva.items.length + ' despachos · ' + diaRelativo(masActiva.hora).toLowerCase()
                        : 'sin actividad') +
          bloqueCifra('Últimas 3 horas', String(recientes),
                      ritmo === null ? 'sin base de comparación'
                        : (ritmo >= 0 ? '+' : '') + ritmo + ' % frente a las 3 previas') +
          bloqueCifra('En la ventana', String(items.length),
                      'de ' + horas + ' horas · ' +
                      (items.length / horas).toFixed(1) + ' por hora');

        /* ---------- gráfico 1: volumen y tono ---------- */
        const eje = UI.ejeBase();
        const etiquetas = serie.map(function (c) { return horaEje(c.hora); });

        /* El eje solo lleva la hora; el tooltip dice de qué día es */
        function tooltipHora(puntos) {
          const h = serie[puntos[0].dataIndex].hora;
          return '<b>' + diaRelativo(h) + ' · ' + horaMinuto(h) + '</b><br/>' +
            puntos.filter(function (p) { return p.value !== null && p.value !== 0; })
              .map(function (p) { return p.marker + ' ' + p.seriesName + ': ' + p.value; })
              .join('<br/>');
        }
        const conteos = serie.map(function (c) { return c.items.length; });
        const tonos = serie.map(function (c) {
          return c.items.length ? +(c.suma / c.items.length).toFixed(3) : null;
        });
        const salto = Math.max(0, Math.ceil(serie.length / 12) - 1);

        UI.grafico('g-crono-volumen', UI.fundirOpciones({
          tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis', formatter: tooltipHora }),
          legend: { data: ['Despachos', 'Tono medio'], top: 0, textStyle: { color: eje.textoTenue, fontSize: 11 } },
          grid: { left: 34, right: 40, top: 30, bottom: 30 },
          xAxis: {
            type: 'category', data: etiquetas,
            axisLine: { lineStyle: { color: eje.linea } },
            axisLabel: { fontSize: 10, interval: salto, hideOverlap: true, rotate: serie.length > 30 ? 45 : 0 }
          },
          yAxis: [
            { type: 'value', name: '', splitLine: { lineStyle: { color: eje.linea } }, axisLabel: { fontSize: 10 } },
            { type: 'value', min: -1, max: 1, splitLine: { show: false }, axisLabel: { fontSize: 10 } }
          ],
          series: [
            { name: 'Despachos', type: 'bar', data: conteos, barMaxWidth: 16,
              itemStyle: { color: UI.paleta.morado, borderRadius: [1, 1, 0, 0] } },
            { name: 'Tono medio', type: 'line', yAxisIndex: 1, data: tonos, connectNulls: true,
              smooth: true, symbolSize: 5, lineStyle: { width: 2, color: UI.paleta.azul },
              itemStyle: { color: UI.paleta.azul } }
          ]
        }));

        /* ---------- gráfico 2: composición por impacto ---------- */
        UI.grafico('g-crono-impacto', UI.fundirOpciones({
          tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis', formatter: tooltipHora }),
          legend: { data: NIVELES.map(function (n) { return n.nombre; }), top: 0,
                    textStyle: { color: eje.textoTenue, fontSize: 11 } },
          grid: { left: 34, right: 16, top: 30, bottom: 30 },
          xAxis: {
            type: 'category', data: etiquetas,
            axisLine: { lineStyle: { color: eje.linea } },
            axisLabel: { fontSize: 10, interval: salto, hideOverlap: true, rotate: serie.length > 30 ? 45 : 0 }
          },
          yAxis: { type: 'value', splitLine: { lineStyle: { color: eje.linea } }, axisLabel: { fontSize: 10 } },
          series: NIVELES.map(function (n) {
            return {
              name: n.nombre, type: 'bar', stack: 'impacto', barMaxWidth: 16,
              itemStyle: { color: n.color },
              data: serie.map(function (c) { return c.niveles[n.nombre] || 0; })
            };
          })
        }));

        /* ---------- lista cronológica ---------- */
        const TOPE = 200;
        const mostrados = items.slice(0, TOPE);
        const porHora = [];
        mostrados.forEach(function (i) {
          const h = claveHora(i.fecha);
          if (!porHora.length || porHora[porHora.length - 1].hora !== h) porHora.push({ hora: h, items: [] });
          porHora[porHora.length - 1].items.push(i);
        });

        document.getElementById('crono-lista').innerHTML = porHora.length
          ? porHora.map(function (g) {
              const suma = g.items.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0);
              const tono = suma / g.items.length;
              return '<section class="crono-bloque">' +
                '<header class="crono-hora">' +
                  '<span class="crono-hora-reloj mono">' + horaMinuto(g.hora) + '</span>' +
                  '<span class="crono-hora-dia">' + CIP.esc(diaRelativo(g.hora)) + '</span>' +
                  '<span class="crono-hora-n">' + g.items.length +
                    (g.items.length === 1 ? ' despacho' : ' despachos') + '</span>' +
                  '<span class="crono-hora-tono" data-tono="' +
                    (tono > 0.12 ? 'alza' : tono < -0.12 ? 'baja' : 'neutro') + '">tono ' +
                    (tono >= 0 ? '+' : '') + tono.toFixed(2) + '</span>' +
                '</header>' +
                g.items.map(function (i) {
                  return '<article class="crono-item">' +
                    '<span class="crono-minuto mono">' + horaMinuto(i.fecha) + '</span>' +
                    '<div class="crono-texto">' +
                      '<a href="' + CIP.esc(i.enlace) + '" target="_blank" rel="noopener">' +
                        CIP.esc(i.titulo) + '</a>' +
                      '<div class="crono-meta">' +
                        '<span class="sello ' + nivelClase(i.impacto.nivel) + '">' + i.impacto.nivel + '</span>' +
                        '<span class="tenue">' + CIP.esc(i.fuenteNombre) + '</span>' +
                        (i.replicas > 1 ? '<span class="replicas">' + i.replicas + ' fuentes</span>' : '') +
                        (i.alerta.nivel !== 'verde'
                          ? '<span class="punto-alerta a-' + i.alerta.nivel + '" title="Alerta ' + i.alerta.nivel + '"></span>'
                          : '') +
                        (i.temas.length
                          ? '<span class="temas">' + i.temas.slice(0, 2).map(function (t) {
                              return '<i>' + CIP.esc(t.nombre) + '</i>'; }).join('') + '</span>'
                          : '') +
                      '</div>' +
                    '</div></article>';
                }).join('') +
              '</section>';
            }).join('')
          : '<div class="estado-vacio"><p>Ningún despacho en esta ventana.</p>' +
            '<p class="tenue">Pruebe con una ventana más amplia.</p></div>';

        document.getElementById('crono-pie').textContent = items.length > TOPE
          ? 'Se listan los ' + TOPE + ' más recientes de ' + items.length +
            '. Reduzca la ventana para ver el resto con detalle.'
          : (items.length ? 'Los ' + items.length + ' despachos de la ventana, en orden de publicación.' : '');
      }

      dibujar(activa);

      UI.$$('#m13 .conmutador button').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.$$('#m13 .conmutador button').forEach(function (x) {
            x.classList.remove('activo'); x.setAttribute('aria-selected', 'false');
          });
          b.classList.add('activo'); b.setAttribute('aria-selected', 'true');
          const h = parseInt(b.dataset.horas, 10);
          window.CIP_STORE.pref('cronoVentana', h);
          dibujar(h);
        });
      });
    }
  });

  function bloqueCifra(etiqueta, valor, glosa) {
    return '<div class="crono-cifra">' +
      '<span class="crono-cifra-etiqueta">' + etiqueta + '</span>' +
      '<span class="crono-cifra-valor mono">' + CIP.esc(valor) + '</span>' +
      '<span class="crono-cifra-glosa">' + glosa + '</span>' +
    '</div>';
  }
})();
