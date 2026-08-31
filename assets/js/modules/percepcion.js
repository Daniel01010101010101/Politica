/* ===================================================================
   MÓDULO 6 · Análisis de sentimiento
   MÓDULO 7 · Tendencias sociales (X / Google Trends / titulares)
   MÓDULO 8 · Nube de palabras
   =================================================================== */
(function () {
  'use strict';

  function reparto(items) {
    const r = { Positivo: 0, Neutral: 0, Negativo: 0 };
    items.forEach(function (i) { r[i.sentimiento.etiqueta]++; });
    return r;
  }

  /* ---------------- MÓDULO 6 ---------------- */
  UI.registrar({
    id: 'm6',
    render: function () {
      const cuerpo = document.querySelector('#m6 .modulo-cuerpo');
      const v = CIP.ventana(30);
      if (!v.length) { cuerpo.innerHTML = '<div class="estado-vacio"><p>Sin material para analizar.</p></div>'; return; }
      cuerpo.dataset.tieneDatos = '1';

      cuerpo.innerHTML =
        '<div class="rejilla-3">' +
          '<div><h4>Reparto general · 30 días</h4><div id="g-sent-global" class="lienzo alto-230"></div></div>' +
          '<div><h4>Perfil por actor</h4><div id="g-radar" class="lienzo alto-230"></div></div>' +
          '<div><h4>Tono por entidad</h4><div id="g-polar" class="lienzo alto-230"></div></div>' +
        '</div>' +
        '<div class="rejilla-2">' +
          '<div><h4>Composición temática por indicador</h4><div id="g-sunburst" class="lienzo alto-360"></div></div>' +
          '<div><h4>Deriva del tono · 30 días</h4><div id="g-deriva" class="lienzo alto-360"></div></div>' +
        '</div>';

      /* reparto general */
      const r = reparto(v);
      UI.grafico('g-sent-global', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'item' }),
        series: [{
          type: 'pie', radius: ['48%', '74%'], center: ['50%', '48%'],
          label: { formatter: '{b}\n{d}%', fontSize: 11 }, labelLine: { length: 6, length2: 6 },
          itemStyle: { borderWidth: 2, borderColor: 'transparent' },
          data: [
            { name: 'Positivo', value: r.Positivo, itemStyle: { color: UI.paleta.verde } },
            { name: 'Neutral', value: r.Neutral, itemStyle: { color: UI.paleta.pizarra } },
            { name: 'Negativo', value: r.Negativo, itemStyle: { color: UI.paleta.carmin } }
          ]
        }]
      }));

      /* radar por actor */
      const actoresTop = CIP.cfg.actores.map(function (a) {
        const its = v.filter(function (i) { return i.actores.indexOf(a.id) >= 0; });
        return { a: a, its: its };
      }).filter(function (x) { return x.its.length >= 2; })
        .sort(function (x, y) { return y.its.length - x.its.length; }).slice(0, 6);

      if (actoresTop.length >= 3) {
        const maxN = Math.max.apply(null, actoresTop.map(function (x) { return x.its.length; }));
        UI.grafico('g-radar', UI.fundirOpciones({
          tooltip: UI.fundirOpciones({}).tooltip,
          legend: { bottom: 0, itemWidth: 10, itemHeight: 2, textStyle: { fontSize: 10, color: UI.ejeBase().textoTenue } },
          radar: {
            indicator: actoresTop.map(function (x) {
              return { name: x.a.nombre.split(' ').slice(-2).join(' '), max: maxN };
            }),
            radius: '62%', center: ['50%', '46%'],
            axisName: { fontSize: 10, color: UI.ejeBase().textoTenue },
            splitLine: { lineStyle: { color: UI.ejeBase().linea } },
            splitArea: { areaStyle: { color: ['transparent'] } },
            axisLine: { lineStyle: { color: UI.ejeBase().linea } }
          },
          series: [{
            type: 'radar', symbolSize: 4,
            data: [
              { name: 'Menciones positivas', value: actoresTop.map(function (x) { return x.its.filter(function (i) { return i.sentimiento.etiqueta === 'Positivo'; }).length; }),
                lineStyle: { color: UI.paleta.verde }, itemStyle: { color: UI.paleta.verde }, areaStyle: { color: 'rgba(46,125,91,.16)' } },
              { name: 'Menciones negativas', value: actoresTop.map(function (x) { return x.its.filter(function (i) { return i.sentimiento.etiqueta === 'Negativo'; }).length; }),
                lineStyle: { color: UI.paleta.carmin }, itemStyle: { color: UI.paleta.carmin }, areaStyle: { color: 'rgba(139,0,0,.18)' } }
            ]
          }]
        }));
      } else {
        document.getElementById('g-radar').innerHTML = '<p class="tenue centro">Se necesitan al menos tres actores con dos menciones cada uno.</p>';
      }

      /* polar por entidad */
      const ents = CIP.cfg.entidades.map(function (e) {
        const its = v.filter(function (i) { return i.entidades.indexOf(e.id) >= 0; });
        const s = its.length ? its.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / its.length : 0;
        return { nombre: e.nombre.replace('Ministerio de ', '').replace('Ministerio del ', ''), n: its.length, s: s };
      }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 10);

      if (ents.length) {
        UI.grafico('g-polar', UI.fundirOpciones({
          tooltip: Object.assign(UI.fundirOpciones({}).tooltip, {
            formatter: function (p) { return ents[p.dataIndex].nombre + '<br/>' + ents[p.dataIndex].n + ' menciones · tono ' + ents[p.dataIndex].s.toFixed(2); }
          }),
          polar: { radius: [16, '68%'], center: ['50%', '50%'] },
          angleAxis: { type: 'category', data: ents.map(function (e) { return e.nombre; }),
                       axisLabel: { fontSize: 9, color: UI.ejeBase().textoTenue }, axisLine: { lineStyle: { color: UI.ejeBase().linea } } },
          radiusAxis: { axisLabel: { fontSize: 9 }, splitLine: { lineStyle: { color: UI.ejeBase().linea } } },
          series: [{
            type: 'bar', coordinateSystem: 'polar',
            data: ents.map(function (e) {
              return { value: e.n, itemStyle: { color: e.s > 0.1 ? UI.paleta.verde : e.s < -0.1 ? UI.paleta.carmin : UI.paleta.pizarra } };
            })
          }]
        }));
      }

      /* sunburst con Plotly (indicador → tema → tono) */
      const nodos = { labels: [], parents: [], values: [], colors: [] };
      const inds = {};
      v.forEach(function (i) {
        const ind = i.indicador;
        inds[ind] = inds[ind] || {};
        const tema = i.temas.length ? i.temas[0].nombre : 'Otros asuntos';
        inds[ind][tema] = inds[ind][tema] || { Positivo: 0, Neutral: 0, Negativo: 0 };
        inds[ind][tema][i.sentimiento.etiqueta]++;
      });
      const colInd = { 'Político': '#8B0000', 'Económico': '#3A6EA5', 'Social': '#2E7D5B', 'Institucional': '#C89211' };
      const colTono = { Positivo: '#2E7D5B', Neutral: '#5B6472', Negativo: '#B22222' };
      Object.keys(inds).forEach(function (ind) {
        nodos.labels.push(ind); nodos.parents.push(''); nodos.values.push(0); nodos.colors.push(colInd[ind] || '#5B6472');
        Object.keys(inds[ind]).forEach(function (tema) {
          const clave = ind + ' / ' + tema;
          nodos.labels.push(tema); nodos.parents.push(ind); nodos.values.push(0); nodos.colors.push(colInd[ind] || '#5B6472');
          Object.keys(inds[ind][tema]).forEach(function (tono) {
            const n = inds[ind][tema][tono];
            if (!n) return;
            nodos.labels.push(tono); nodos.parents.push(tema); nodos.values.push(n); nodos.colors.push(colTono[tono]);
          });
        });
      });

      if (window.Plotly && nodos.labels.length) {
        const oscuro = document.body.dataset.tema !== 'claro';
        Plotly.newPlot('g-sunburst', [{
          type: 'sunburst', labels: nodos.labels, parents: nodos.parents, values: nodos.values,
          branchvalues: 'remainder', marker: { colors: nodos.colors, line: { width: 1, color: oscuro ? '#111114' : '#fff' } },
          textfont: { size: 11, family: 'IBM Plex Sans', color: '#fff' }, hovertemplate: '%{label}<br>%{value} despachos<extra></extra>'
        }], {
          margin: { l: 0, r: 0, t: 0, b: 0 }, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
          font: { family: 'IBM Plex Sans', color: oscuro ? '#8B8D93' : '#555' }
        }, { displayModeBar: false, responsive: true });
      }

      /* deriva del tono con Chart.js */
      if (window.Chart) {
        const cont = document.getElementById('g-deriva');
        cont.innerHTML = '<canvas id="c-deriva"></canvas>';
        const dias = CIP.serie(30);
        const medias = dias.map(function (d) {
          const its = CIP.estado.items.filter(function (i) { return i.dia === d.dia; });
          if (!its.length) return null;
          return +(its.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / its.length).toFixed(3);
        });
        if (window._cipDeriva) { try { window._cipDeriva.destroy(); } catch (e) {} }
        window._cipDeriva = new Chart(document.getElementById('c-deriva'), {
          type: 'line',
          data: {
            labels: dias.map(function (d) { return d.etiqueta; }),
            datasets: [{
              label: 'Tono medio diario', data: medias, spanGaps: true,
              borderColor: '#B22222', backgroundColor: 'rgba(178,34,34,.14)', borderWidth: 2,
              tension: .35, pointRadius: 0, fill: true
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { min: -1, max: 1, grid: { color: UI.ejeBase().linea }, ticks: { color: UI.ejeBase().textoTenue, font: { size: 10 } } },
              x: { grid: { display: false }, ticks: { color: UI.ejeBase().textoTenue, font: { size: 10 }, maxTicksLimit: 8 } }
            }
          }
        });
      }
    }
  });

  /* ---------------- MÓDULO 7 ---------------- */
  UI.registrar({
    id: 'm7',
    render: function () {
      const cuerpo = document.querySelector('#m7 .modulo-cuerpo');
      const v7 = CIP.ventana(7), v14 = CIP.ventana(14);
      if (!v7.length) { cuerpo.innerHTML = '<div class="estado-vacio"><p>Sin material reciente.</p></div>'; return; }
      cuerpo.dataset.tieneDatos = '1';

      const conX = (CIP.estado.social && CIP.estado.social.x && CIP.estado.social.x.length) ? CIP.estado.social.x : null;
      const trends = (CIP.estado.social && CIP.estado.social.trends) ? CIP.estado.social.trends : null;

      /* Términos con mayor aceleración: frecuencia últimos 7 d vs. 7 d previos */
      const ahora = window.CIP_NLP.palabrasClave(v7.map(function (i) { return i.titulo; }), 400, true);
      const previo = {};
      window.CIP_NLP.palabrasClave(
        v14.filter(function (i) { return i.fecha < Date.now() - 7 * 86400000; }).map(function (i) { return i.titulo; }), 400, true
      ).forEach(function (p) { previo[p.palabra] = p.valor; });

      const emergentes = ahora.map(function (p) {
        const antes = previo[p.palabra] || 0;
        return { termino: p.palabra, ahora: p.valor, antes: antes,
                 aceleracion: +(((p.valor - antes) / (antes + 1.5))).toFixed(2) };
      }).filter(function (p) { return p.ahora >= 3; })
        .sort(function (a, b) { return b.aceleracion - a.aceleracion; }).slice(0, 14);

      /* Actores más mencionados */
      const rankActores = CIP.cfg.actores.map(function (a) {
        return { nombre: a.nombre, rol: a.rol, n: v7.filter(function (i) { return i.actores.indexOf(a.id) >= 0; }).length };
      }).filter(function (x) { return x.n > 0; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 12);

      /* Señales de crisis */
      const señales = [
        { tipo: 'Crisis', claves: ['crisis', 'colapso', 'emergencia', 'renuncia'] },
        { tipo: 'Escándalo', claves: ['escandalo', 'corrupcion', 'soborno', 'irregularidad'] },
        { tipo: 'Reforma', claves: ['reforma', 'proyecto de ley', 'ponencia'] },
        { tipo: 'Debate', claves: ['debate', 'plenaria', 'citacion', 'control politico'] }
      ].map(function (s) {
        const n = v7.filter(function (i) {
          const t = window.CIP_NLP.normaliza(i.titulo + ' ' + i.cuerpo);
          return s.claves.some(function (c) { return t.indexOf(c) >= 0; });
        }).length;
        return { tipo: s.tipo, n: n };
      });

      cuerpo.innerHTML =
        '<div class="nota-integracion">' +
          (conX
            ? '<span class="punto ok"></span> Conectado a la API de X: ' + conX.length + ' publicaciones en la última corrida.'
            : '<span class="punto mal"></span> La API de X exige credencial de pago. Sin <code>X_BEARER_TOKEN</code>, ' +
              'este módulo deriva las tendencias de los titulares de las fuentes originales.') +
          (trends ? ' · Google Trends: ' + trends.length + ' búsquedas destacadas.' : ' · Google Trends sin datos en esta corrida.') +
        '</div>' +
        '<div class="rejilla-2">' +
          '<div><h4>Términos en aceleración · 7 días vs. 7 anteriores</h4><div id="g-emergentes" class="lienzo alto-300"></div></div>' +
          '<div><h4>Detección de señales</h4><div id="g-señales" class="lienzo alto-160"></div>' +
            '<h4>Actores más mencionados</h4><ol class="ranking">' + rankActores.map(function (a) {
              return '<li><span>' + CIP.esc(a.nombre) + '<em>' + CIP.esc(a.rol) + '</em></span><b class="mono">' + a.n + '</b></li>';
            }).join('') + '</ol></div>' +
        '</div>' +
        (trends ? '<h4>Búsquedas destacadas en Colombia</h4><div class="fichas-trends">' +
          trends.slice(0, 12).map(function (t) {
            return '<span class="ficha-trend">' + CIP.esc(t.titulo || t) + (t.trafico ? '<em>' + CIP.esc(t.trafico) + '</em>' : '') + '</span>';
          }).join('') + '</div>' : '');

      UI.grafico('g-emergentes', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, {
          formatter: function (p) { const e = emergentes[emergentes.length - 1 - p.dataIndex];
            return e.termino + '<br/>ahora ' + e.ahora + ' · antes ' + e.antes; }
        }),
        grid: { left: 8, right: 28, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'category', data: emergentes.map(function (e) { return e.termino; }).reverse(),
                 axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar', barMaxWidth: 14,
          data: emergentes.map(function (e) {
            return { value: e.aceleracion, itemStyle: { color: e.aceleracion > 1 ? UI.paleta.carmin : UI.paleta.ladrillo } };
          }).reverse(),
          label: { show: true, position: 'right', fontSize: 10, color: UI.ejeBase().textoTenue, formatter: '×{c}' }
        }]
      }));

      UI.grafico('g-señales', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis' }),
        grid: { left: 8, right: 12, top: 12, bottom: 20, containLabel: true },
        xAxis: { type: 'category', data: señales.map(function (s) { return s.tipo; }), axisLabel: { fontSize: 10 },
                 axisLine: { lineStyle: { color: UI.ejeBase().linea } } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        series: [{ type: 'bar', barMaxWidth: 34, data: señales.map(function (s) { return s.n; }),
                   itemStyle: { color: UI.paleta.arcilla, borderRadius: [2, 2, 0, 0] } }]
      }));
    }
  });

  /* ---------------- MÓDULO 8 ---------------- */
  UI.registrar({
    id: 'm8',
    render: function () {
      const cuerpo = document.querySelector('#m8 .modulo-cuerpo');
      if (!CIP.estado.items.length) { cuerpo.innerHTML = '<div class="estado-vacio"><p>Sin material.</p></div>'; return; }
      cuerpo.dataset.tieneDatos = '1';

      const activa = window.CIP_STORE.pref('nubeVentana') || 1;
      cuerpo.innerHTML =
        '<div class="conmutador" role="tablist">' +
          [1, 7, 30].map(function (d) {
            return '<button role="tab" data-dias="' + d + '"' + (d === activa ? ' class="activo" aria-selected="true"' : ' aria-selected="false"') + '>' +
              (d === 1 ? 'Últimas 24 horas' : 'Últimos ' + d + ' días') + '</button>';
          }).join('') +
        '</div>' +
        '<div id="g-nube" class="lienzo alto-420"></div>' +
        '<p class="tenue pie-nota">Tamaño proporcional a la frecuencia; se descartan palabras vacías y se privilegian los pares de palabras, que informan más que los términos sueltos.</p>';

      function dibujar(dias) {
        const textos = CIP.ventana(dias).map(function (i) { return i.titulo + '. ' + i.cuerpo; });
        const palabras = window.CIP_NLP.palabrasClave(textos, 120, true);
        if (!palabras.length) {
          document.getElementById('g-nube').innerHTML = '<p class="tenue centro">Sin términos suficientes en esta ventana.</p>';
          return;
        }
        const cols = ['#8B0000', '#B22222', '#C62828', '#E06A5A', '#5B6472', '#C9C3B8', '#3A6EA5'];
        if (window.CIP_SIN_NUBE) { respaldo(palabras, cols); return; }
        try {
          UI.grafico('g-nube', {
            backgroundColor: 'transparent',
            tooltip: { show: true, backgroundColor: UI.ejeBase().fondoTooltip, borderColor: UI.ejeBase().linea,
                       textStyle: { color: UI.ejeBase().textoTooltip, fontSize: 12 } },
            series: [{
              type: 'wordCloud', shape: 'circle', width: '96%', height: '94%',
              sizeRange: [13, 62], rotationRange: [0, 0], gridSize: 9, drawOutOfBound: false,
              textStyle: {
                fontFamily: 'Spectral, Georgia, serif', fontWeight: 600,
                color: function () { return cols[Math.floor(Math.random() * cols.length)]; }
              },
              emphasis: { textStyle: { textShadowBlur: 8, textShadowColor: 'rgba(139,0,0,.5)' } },
              data: palabras.map(function (p) { return { name: p.palabra, value: p.valor }; })
            }]
          });
        } catch (e) {
          respaldo(palabras, cols);
        }
      }

      /* Respaldo tipográfico si el complemento de nube no está disponible */
      function respaldo(palabras, cols) {
        const max = palabras[0].valor;
        document.getElementById('g-nube').innerHTML = '<div class="nube-respaldo">' + palabras.slice(0, 90).map(function (p) {
          const t = 12 + (p.valor / max) * 44;
          return '<span style="font-size:' + t.toFixed(1) + 'px;color:' + cols[p.palabra.length % cols.length] + '">' +
            CIP.esc(p.palabra) + '</span>';
        }).join(' ') + '</div>';
      }

      dibujar(activa);
      UI.$$('#m8 .conmutador button').forEach(function (b) {
        b.addEventListener('click', function () {
          UI.$$('#m8 .conmutador button').forEach(function (x) { x.classList.remove('activo'); x.setAttribute('aria-selected', 'false'); });
          b.classList.add('activo'); b.setAttribute('aria-selected', 'true');
          const d = parseInt(b.dataset.dias, 10);
          window.CIP_STORE.pref('nubeVentana', d);
          dibujar(d);
        });
      });
    }
  });
})();
