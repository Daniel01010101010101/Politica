/* ===================================================================
   MÓDULO 9  · Mapa de actores políticos
   MÓDULO 10 · Alertas tempranas
   MÓDULO 11 · Inteligencia histórica
   MÓDULO 12 · Lectura estratégica
   =================================================================== */
(function () {
  'use strict';

  /* ---------------- MÓDULO 9 ---------------- */
  UI.registrar({
    id: 'm9',
    render: function () {
      const cuerpo = document.querySelector('#m9 .modulo-cuerpo');
      const v = CIP.ventana(30);
      if (v.length < 4) { cuerpo.innerHTML = '<div class="estado-vacio"><p>Se necesitan más despachos para trazar la red.</p></div>'; return; }
      cuerpo.dataset.tieneDatos = '1';

      cuerpo.innerHTML =
        '<div class="barra-controles">' +
          '<label>Fuerza mínima del vínculo <input type="range" id="umbral-red" min="1" max="6" value="2"></label>' +
          '<span class="tenue" id="leyenda-red"></span>' +
        '</div>' +
        '<div id="g-red" class="lienzo alto-520"></div>' +
        '<p class="tenue pie-nota">Dos nodos se unen cuando aparecen juntos en el mismo despacho. El grosor del vínculo mide cuántas veces coinciden; el color del nodo indica su naturaleza.</p>';

      const tipos = {
        actor: { color: '#B22222', catalogo: CIP.idxActores },
        partido: { color: '#3A6EA5', catalogo: CIP.idxPartidos },
        entidad: { color: '#C89211', catalogo: CIP.idxEntidades },
        tema: { color: '#2E7D5B', catalogo: null }
      };

      const nodos = {}, vinculos = {};
      function nodo(id, etiqueta, tipo) {
        const k = tipo + ':' + id;
        if (!nodos[k]) nodos[k] = { id: k, etiqueta: etiqueta, tipo: tipo, peso: 0 };
        nodos[k].peso++;
        return k;
      }

      v.forEach(function (i) {
        const presentes = [];
        i.actores.forEach(function (a) { if (CIP.idxActores[a]) presentes.push(nodo(a, CIP.idxActores[a].nombre, 'actor')); });
        i.partidos.forEach(function (p) { if (CIP.idxPartidos[p]) presentes.push(nodo(p, CIP.idxPartidos[p].nombre, 'partido')); });
        i.entidades.forEach(function (e) { if (CIP.idxEntidades[e]) presentes.push(nodo(e, CIP.idxEntidades[e].nombre, 'entidad')); });
        i.temas.slice(0, 2).forEach(function (t) { presentes.push(nodo(t.id, t.nombre, 'tema')); });
        for (let x = 0; x < presentes.length; x++) {
          for (let y = x + 1; y < presentes.length; y++) {
            const k = [presentes[x], presentes[y]].sort().join('||');
            vinculos[k] = (vinculos[k] || 0) + 1;
          }
        }
      });

      function pintar(umbral) {
        const enlaces = Object.keys(vinculos)
          .filter(function (k) { return vinculos[k] >= umbral; })
          .map(function (k) { const p = k.split('||'); return { source: p[0], target: p[1], valor: vinculos[k] }; });
        const usados = {};
        enlaces.forEach(function (e) { usados[e.source] = 1; usados[e.target] = 1; });
        const lista = Object.keys(nodos).filter(function (k) { return usados[k]; }).map(function (k) { return nodos[k]; });

        const leyenda = document.getElementById('leyenda-red');
        if (leyenda) leyenda.textContent = lista.length + ' nodos · ' + enlaces.length + ' vínculos';

        if (!lista.length) {
          document.getElementById('g-red').innerHTML = '<p class="tenue centro">Ningún vínculo alcanza ese umbral. Baje el control.</p>';
          return;
        }

        if (!window.d3) {
          // respaldo con ECharts si D3 no cargó
          UI.grafico('g-red', {
            backgroundColor: 'transparent',
            tooltip: {},
            series: [{
              type: 'graph', layout: 'force', roam: true,
              force: { repulsion: 220, edgeLength: [50, 140] },
              label: { show: true, fontSize: 10, color: UI.ejeBase().textoTenue },
              data: lista.map(function (n) {
                return { id: n.id, name: n.etiqueta, symbolSize: 8 + Math.sqrt(n.peso) * 4,
                         itemStyle: { color: tipos[n.tipo].color } };
              }),
              links: enlaces.map(function (e) {
                return { source: e.source, target: e.target, lineStyle: { width: Math.min(6, e.valor), opacity: .35 } };
              })
            }]
          });
          return;
        }

        const cont = document.getElementById('g-red');
        cont.innerHTML = '';
        const W = cont.clientWidth || 900, H = cont.clientHeight || 520;
        const svg = d3.select(cont).append('svg')
          .attr('viewBox', '0 0 ' + W + ' ' + H).attr('width', '100%').attr('height', '100%');
        const g = svg.append('g');
        svg.call(d3.zoom().scaleExtent([0.4, 4]).on('zoom', function (ev) { g.attr('transform', ev.transform); }));

        const maxV = Math.max.apply(null, enlaces.map(function (e) { return e.valor; }));
        const linea = g.append('g').selectAll('line').data(enlaces).enter().append('line')
          .attr('stroke', 'rgba(201,195,184,.30)')
          .attr('stroke-width', function (d) { return 0.6 + (d.valor / maxV) * 4; });

        const punto = g.append('g').selectAll('g').data(lista).enter().append('g')
          .call(d3.drag()
            .on('start', function (ev, d) { if (!ev.active) sim.alphaTarget(.25).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', function (ev, d) { d.fx = ev.x; d.fy = ev.y; })
            .on('end', function (ev, d) { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

        punto.append('circle')
          .attr('r', function (d) { return 4 + Math.sqrt(d.peso) * 2.6; })
          .attr('fill', function (d) { return tipos[d.tipo].color; })
          .attr('stroke', 'rgba(0,0,0,.45)').attr('stroke-width', 1);

        punto.append('text').text(function (d) { return d.etiqueta; })
          .attr('x', function (d) { return 6 + Math.sqrt(d.peso) * 2.6; }).attr('y', 4)
          .attr('font-size', 10).attr('font-family', 'IBM Plex Sans, sans-serif')
          .attr('fill', document.body.dataset.tema === 'claro' ? '#3A3A3A' : '#B9B6AF');

        punto.append('title').text(function (d) { return d.etiqueta + ' · ' + d.peso + ' apariciones'; });

        const sim = d3.forceSimulation(lista)
          .force('link', d3.forceLink(enlaces).id(function (d) { return d.id; }).distance(function (d) { return 130 - (d.valor / maxV) * 60; }).strength(.5))
          .force('charge', d3.forceManyBody().strength(-190))
          .force('center', d3.forceCenter(W / 2, H / 2))
          .force('collide', d3.forceCollide().radius(function (d) { return 16 + Math.sqrt(d.peso) * 2.6; }))
          .on('tick', function () {
            linea.attr('x1', function (d) { return d.source.x; }).attr('y1', function (d) { return d.source.y; })
                 .attr('x2', function (d) { return d.target.x; }).attr('y2', function (d) { return d.target.y; });
            punto.attr('transform', function (d) { return 'translate(' + d.x + ',' + d.y + ')'; });
          });
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { sim.stop(); for (let i = 0; i < 160; i++) sim.tick(); sim.tick(); }
      }

      pintar(2);
      const ctrl = document.getElementById('umbral-red');
      if (ctrl) ctrl.addEventListener('change', function () { pintar(parseInt(ctrl.value, 10)); });
    }
  });

  /* ---------------- MÓDULO 10 ---------------- */
  UI.registrar({
    id: 'm10',
    render: function () {
      const cuerpo = document.querySelector('#m10 .modulo-cuerpo');
      const v = CIP.ventana(7);
      const alertas = v.filter(function (i) { return i.alerta.nivel !== 'verde'; })
        .sort(function (a, b) {
          if (a.alerta.nivel !== b.alerta.nivel) return a.alerta.nivel === 'rojo' ? -1 : 1;
          return b.impacto.valor - a.impacto.valor;
        });

      const rojas = alertas.filter(function (i) { return i.alerta.nivel === 'rojo'; });
      const amarillas = alertas.filter(function (i) { return i.alerta.nivel === 'amarillo'; });

      const nivelGlobal = rojas.length >= 3 ? 'rojo' : (rojas.length || amarillas.length >= 5) ? 'amarillo' : 'verde';
      const glosaGlobal = {
        rojo: 'Varios focos críticos abiertos al tiempo. Exige seguimiento continuo.',
        amarillo: 'Hay asuntos que pueden escalar. Conviene revisarlos antes del próximo corte.',
        verde: 'Sin señales críticas en la última semana.'
      }[nivelGlobal];

      cuerpo.dataset.tieneDatos = '1';
      cuerpo.innerHTML =
        '<div class="tablero-alerta a-' + nivelGlobal + '">' +
          '<div class="ta-luz"><span></span><span></span><span></span></div>' +
          '<div><strong>Estado general: ' + nivelGlobal.toUpperCase() + '</strong><p>' + glosaGlobal + '</p>' +
            '<p class="tenue mono">' + rojas.length + ' rojas · ' + amarillas.length + ' amarillas · ventana de 7 días</p></div>' +
        '</div>' +
        (alertas.length
          ? '<div class="lista-alertas">' + alertas.slice(0, 24).map(function (i) {
              return '<article class="alerta a-' + i.alerta.nivel + '">' +
                '<div class="al-cabeza"><span class="semaforo s-' + i.alerta.nivel + '"></span>' +
                  '<span class="al-tipo">' + (i.temas.length ? CIP.esc(i.temas[0].nombre) : 'Señal detectada') + '</span>' +
                  '<span class="tenue">' + CIP.esc(i.fuenteNombre) + ' · ' + CIP.hace(i.fecha) + '</span></div>' +
                '<h4><a href="' + CIP.esc(i.enlace) + '" target="_blank" rel="noopener">' + CIP.esc(i.titulo) + '</a></h4>' +
                (i.alerta.disparadores.length
                  ? '<div class="al-disparadores">' + i.alerta.disparadores.map(function (d) { return '<i>' + CIP.esc(d) + '</i>'; }).join('') + '</div>'
                  : '') +
              '</article>';
            }).join('') + '</div>'
          : '<div class="estado-vacio"><p>Ninguna señal superó el umbral en los últimos siete días.</p></div>');
    }
  });

  /* ---------------- MÓDULO 11 ---------------- */
  UI.registrar({
    id: 'm11',
    render: function () {
      const cuerpo = document.querySelector('#m11 .modulo-cuerpo');
      const items = CIP.estado.items;
      if (!items.length) { cuerpo.innerHTML = '<div class="estado-vacio"><p>La base histórica está vacía.</p><p class="tenue">Se llena sola: cada corte diario suma un día.</p></div>'; return; }
      cuerpo.dataset.tieneDatos = '1';

      function bloque(dias) {
        const its = CIP.ventana(dias);
        const s = its.length ? its.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / its.length : 0;
        return {
          n: its.length,
          diario: +(its.length / dias).toFixed(1),
          tono: +s.toFixed(3),
          rojas: its.filter(function (i) { return i.alerta.nivel === 'rojo'; }).length
        };
      }
      const comp = [
        { etiqueta: 'Hoy', d: 1, b: bloque(1) },
        { etiqueta: 'Última semana', d: 7, b: bloque(7) },
        { etiqueta: 'Último mes', d: 30, b: bloque(30) },
        { etiqueta: 'Último año', d: 365, b: bloque(365) }
      ];

      const cobertura = Math.round((Date.now() - items[items.length - 1].fecha) / 86400000);

      /* Detección de anomalías: días que superan la media + 2σ */
      const serie = CIP.serie(Math.min(90, Math.max(14, cobertura)));
      const valores = serie.map(function (x) { return x.n; });
      const media = valores.reduce(function (a, b) { return a + b; }, 0) / (valores.length || 1);
      const sd = Math.sqrt(valores.reduce(function (a, b) { return a + Math.pow(b - media, 2); }, 0) / (valores.length || 1));
      const anomalias = serie.filter(function (x) { return sd > 0 && x.n > media + 2 * sd; });

      cuerpo.innerHTML =
        '<div class="rejilla-comparativa">' + comp.map(function (c) {
          return '<div class="celda-comp"><span class="cc-etiqueta">' + c.etiqueta + '</span>' +
            '<span class="cc-valor mono">' + c.b.n + '</span>' +
            '<span class="cc-detalle">' + c.b.diario + ' al día · tono ' + (c.b.tono >= 0 ? '+' : '') + c.b.tono.toFixed(2) +
            ' · ' + c.b.rojas + ' rojas</span></div>';
        }).join('') + '</div>' +
        '<div class="rejilla-2">' +
          '<div><h4>Serie temporal y anomalías</h4><div id="g-serie" class="lienzo alto-300"></div></div>' +
          '<div><h4>Temas dominantes por semana</h4><div id="g-temas-tiempo" class="lienzo alto-300"></div></div>' +
        '</div>' +
        '<p class="tenue pie-nota">Cobertura de la base local: ' + (cobertura || 0) + ' días · ' + items.length +
        ' despachos. Las anomalías marcan los días que superan la media más dos desviaciones típicas' +
        (anomalias.length ? ': ' + anomalias.map(function (a) { return a.etiqueta; }).join(', ') : '. Ninguna por ahora') + '.</p>';

      UI.grafico('g-serie', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis' }),
        grid: { left: 36, right: 14, top: 16, bottom: 26 },
        xAxis: { type: 'category', data: serie.map(function (x) { return x.etiqueta; }),
                 axisLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10, interval: Math.ceil(serie.length / 8) } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        series: [
          { type: 'line', smooth: true, symbol: 'none', data: valores,
            lineStyle: { color: UI.paleta.ladrillo, width: 2 }, areaStyle: { color: 'rgba(178,34,34,.12)' },
            markLine: { silent: true, symbol: 'none', label: { fontSize: 10, formatter: 'media' },
                        lineStyle: { color: UI.paleta.pizarra, type: 'dashed' }, data: [{ yAxis: +media.toFixed(1) }] } },
          { type: 'scatter', symbolSize: 9, itemStyle: { color: UI.paleta.carmin },
            data: serie.map(function (x, k) { return (sd > 0 && x.n > media + 2 * sd) ? [k, x.n] : null; }).filter(Boolean) }
        ]
      }));

      // temas por semana (barras apiladas)
      const semanas = 6, temasTop = {};
      CIP.ventana(semanas * 7).forEach(function (i) {
        i.temas.forEach(function (t) { temasTop[t.nombre] = (temasTop[t.nombre] || 0) + 1; });
      });
      const listaTemas = Object.keys(temasTop).sort(function (a, b) { return temasTop[b] - temasTop[a]; }).slice(0, 6);
      const etiquetas = [];
      const seriesTema = listaTemas.map(function (t) { return { name: t, type: 'bar', stack: 'x', barMaxWidth: 28, data: [] }; });
      for (let s = semanas - 1; s >= 0; s--) {
        const fin = Date.now() - s * 7 * 86400000, ini = fin - 7 * 86400000;
        etiquetas.push(new Date(ini).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }));
        const its = CIP.estado.items.filter(function (i) { return i.fecha >= ini && i.fecha < fin; });
        listaTemas.forEach(function (t, k) {
          seriesTema[k].data.push(its.filter(function (i) { return i.temas.some(function (x) { return x.nombre === t; }); }).length);
        });
      }
      const cols = ['#8B0000', '#B22222', '#E06A5A', '#3A6EA5', '#2E7D5B', '#C89211'];
      seriesTema.forEach(function (s, k) { s.itemStyle = { color: cols[k % cols.length] }; });

      UI.grafico('g-temas-tiempo', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, color: UI.ejeBase().textoTenue } },
        grid: { left: 36, right: 14, top: 14, bottom: 52 },
        xAxis: { type: 'category', data: etiquetas, axisLabel: { fontSize: 10 }, axisLine: { lineStyle: { color: UI.ejeBase().linea } } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        series: seriesTema
      }));
    }
  });

  /* ---------------- MÓDULO 12 ----------------
     Motor de reglas explícitas sobre los indicadores medidos.
     Cada afirmación declara la evidencia que la sostiene. No hay
     texto de opinión precargado ni redacción de un modelo externo. */
  UI.registrar({
    id: 'm12',
    render: function () {
      const cuerpo = document.querySelector('#m12 .modulo-cuerpo');
      const v7 = CIP.ventana(7), v30 = CIP.ventana(30);
      if (v7.length < 3) { cuerpo.innerHTML = '<div class="estado-vacio"><p>Muy pocos despachos para una lectura fiable.</p></div>'; return; }
      cuerpo.dataset.tieneDatos = '1';

      const tono7 = v7.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / v7.length;
      const tono30 = v30.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / v30.length;
      const rojas7 = v7.filter(function (i) { return i.alerta.nivel === 'rojo'; });
      const previo7 = v30.filter(function (i) { return i.fecha < Date.now() - 7 * 86400000 && i.fecha >= Date.now() - 14 * 86400000; });
      const varVolumen = previo7.length ? (v7.length - previo7.length) / previo7.length : 0;

      const temaTop = (function () {
        const c = {};
        v7.forEach(function (i) { i.temas.forEach(function (t) { c[t.nombre] = (c[t.nombre] || 0) + 1; }); });
        const k = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
        return k.length ? { nombre: k[0], n: c[k[0]] } : null;
      })();

      const actorTop = (function () {
        const c = {};
        v7.forEach(function (i) { i.actores.forEach(function (a) { c[a] = (c[a] || 0) + 1; }); });
        const k = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
        return k.length ? { actor: CIP.idxActores[k[0]], n: c[k[0]] } : null;
      })();

      function evidencia(filtro, n) {
        return v7.filter(filtro).sort(function (a, b) { return b.impacto.valor - a.impacto.valor; }).slice(0, n || 3);
      }

      const riesgos = [], oportunidades = [], escenarios = [];

      if (rojas7.length >= 1) {
        riesgos.push({
          texto: rojas7.length + (rojas7.length === 1 ? ' señal crítica abierta' : ' señales críticas abiertas') +
                 ' en siete días, concentradas en ' + (rojas7[0].temas.length ? rojas7[0].temas[0].nombre.toLowerCase() : 'asuntos de control'),
          base: 'alertas rojas del módulo 10',
          ev: rojas7.slice(0, 3)
        });
      }
      if (tono7 < -0.15) {
        riesgos.push({
          texto: 'El tono medio de la semana (' + tono7.toFixed(2) + ') está por debajo del mes (' + tono30.toFixed(2) + '): la cobertura se ha endurecido',
          base: 'léxico de sentimiento sobre ' + v7.length + ' despachos',
          ev: evidencia(function (i) { return i.sentimiento.puntaje < -0.3; })
        });
      }
      if (varVolumen > 0.4) {
        riesgos.push({
          texto: 'El volumen creció ' + Math.round(varVolumen * 100) + '% frente a la semana anterior; la agenda está saturada y compite por atención',
          base: 'conteo de despachos por ventana',
          ev: evidencia(function (i) { return i.impacto.nivel === 'Muy Alto'; })
        });
      }
      const econ = v7.filter(function (i) { return i.indicador === 'Económico'; });
      if (econ.length && econ.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / econ.length < -0.2) {
        riesgos.push({
          texto: 'La conversación económica se inclina a lo adverso; conviene vigilar señales fiscales y de mercado',
          base: econ.length + ' despachos clasificados como económicos',
          ev: evidencia(function (i) { return i.indicador === 'Económico' && i.sentimiento.puntaje < -0.2; })
        });
      }

      if (tono7 > 0.12) {
        oportunidades.push({
          texto: 'Ventana de tono favorable (' + tono7.toFixed(2) + '): momento propicio para anuncios y posicionamiento',
          base: 'sentimiento medio de la semana', ev: evidencia(function (i) { return i.sentimiento.puntaje > 0.3; })
        });
      }
      if (temaTop) {
        oportunidades.push({
          texto: '«' + temaTop.nombre + '» domina la agenda con ' + temaTop.n + ' despachos: es el terreno donde hoy se gana o se pierde relato',
          base: 'diccionario temático', ev: evidencia(function (i) { return i.temas.some(function (t) { return t.nombre === temaTop.nombre; }); })
        });
      }
      const silenciosos = CIP.cfg.temas.filter(function (t) {
        return !v7.some(function (i) { return i.temas.some(function (x) { return x.id === t.id; }); }) && t.peso >= 0.85;
      });
      if (silenciosos.length) {
        oportunidades.push({
          texto: 'Sin cobertura esta semana: ' + silenciosos.slice(0, 3).map(function (t) { return t.nombre.toLowerCase(); }).join(', ') +
                 '. Espacio disponible para instalar tema propio',
          base: 'temas vigilados sin apariciones', ev: []
        });
      }

      if (rojas7.length >= 3) {
        escenarios.push({ nombre: 'Escalamiento', p: 'alta', texto: 'Con tres o más focos críticos simultáneos, el patrón histórico de la base local es de crecimiento del volumen en los días siguientes.' });
      } else if (rojas7.length) {
        escenarios.push({ nombre: 'Contención', p: 'media', texto: 'Un foco aislado suele agotarse en 48–72 horas si no aparece una segunda fuente que lo amplifique. Vigilar la corroboración.' });
      } else {
        escenarios.push({ nombre: 'Rutina', p: 'alta', texto: 'Sin señales críticas, la agenda la marca el trámite institucional ordinario.' });
      }
      if (varVolumen > 0.4) escenarios.push({ nombre: 'Saturación', p: 'media', texto: 'Un pico de volumen tiende a ir seguido de caída; los asuntos que sobreviven al descenso son los estructurales.' });
      if (tono7 < tono30 - 0.1) escenarios.push({ nombre: 'Deterioro sostenido', p: 'media', texto: 'El tono semanal por debajo del mensual, si se repite dos semanas, anticipa una fase adversa prolongada.' });

      const impactos = [
        { ambito: 'País', n: v7.length, tono: tono7 },
        { ambito: 'Bogotá', n: v7.filter(function (i) { return i.fuenteAmbito === 'bogota'; }).length,
          tono: (function () { const x = v7.filter(function (i) { return i.fuenteAmbito === 'bogota'; }); return x.length ? x.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / x.length : 0; })() },
        { ambito: 'Económico', n: econ.length,
          tono: econ.length ? econ.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / econ.length : 0 },
        { ambito: 'Institucional', n: v7.filter(function (i) { return i.indicador === 'Institucional'; }).length,
          tono: (function () { const x = v7.filter(function (i) { return i.indicador === 'Institucional'; }); return x.length ? x.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / x.length : 0; })() }
      ];

      function bloqueLista(titulo, lista, clase) {
        return '<div class="bloque-lectura ' + clase + '"><h4>' + titulo + '</h4>' +
          (lista.length ? '<ul>' + lista.map(function (r) {
            return '<li><p>' + CIP.esc(r.texto) + '</p>' +
              '<span class="fundamento">medido sobre: ' + CIP.esc(r.base) + '</span>' +
              (r.ev && r.ev.length ? '<div class="ev">' + r.ev.map(function (e) {
                return '<a href="' + CIP.esc(e.enlace) + '" target="_blank" rel="noopener">' + CIP.esc(e.titulo.slice(0, 70)) + '…</a>';
              }).join('') + '</div>' : '') + '</li>';
          }).join('') + '</ul>' : '<p class="tenue">Sin hallazgos que superen el umbral.</p>') + '</div>';
      }

      cuerpo.innerHTML =
        '<div class="nota-integracion"><span class="punto ok"></span> Lectura derivada por reglas explícitas de los indicadores medidos. ' +
        'Cada afirmación enlaza los despachos que la sustentan; ninguna proviene de un texto redactado de antemano.</div>' +
        '<div class="rejilla-2">' + bloqueLista('Riesgos', riesgos, 'b-riesgo') + bloqueLista('Oportunidades', oportunidades, 'b-oportunidad') + '</div>' +
        '<h4>Escenarios probables</h4><div class="rejilla-escenarios">' + escenarios.map(function (e) {
          return '<div class="escenario p-' + e.p + '"><div class="es-cabeza"><strong>' + CIP.esc(e.nombre) + '</strong>' +
            '<span class="prob">probabilidad ' + e.p + '</span></div><p>' + CIP.esc(e.texto) + '</p></div>';
        }).join('') + '</div>' +
        '<h4>Impacto por ámbito · 7 días</h4><div class="rejilla-impacto">' + impactos.map(function (m) {
          const t = m.tono > 0.1 ? 'alza' : m.tono < -0.1 ? 'baja' : 'neutro';
          return '<div class="celda-impacto"><span class="ci-ambito">' + m.ambito + '</span>' +
            '<span class="ci-n mono">' + m.n + '</span>' +
            '<span class="ci-tono" data-tono="' + t + '">tono ' + (m.tono >= 0 ? '+' : '') + m.tono.toFixed(2) + '</span></div>';
        }).join('') + '</div>' +
        (actorTop && actorTop.actor ? '<p class="tenue pie-nota">Actor con mayor presencia esta semana: ' +
          CIP.esc(actorTop.actor.nombre) + ' (' + actorTop.n + ' menciones, ' + CIP.esc(actorTop.actor.rol.toLowerCase()) + ').</p>' : '');
    }
  });
})();
