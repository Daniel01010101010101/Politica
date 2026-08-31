/* ===================================================================
   MÓDULO 1 · Resumen ejecutivo del día
   MÓDULO 2 · Radar presidencial
   =================================================================== */
(function () {
  'use strict';

  const nivelClase = function (n) { return 'n-' + n.replace(/ /g, '-').toLowerCase(); };

  /* ---------------- MÓDULO 1 ---------------- */
  UI.registrar({
    id: 'm1',
    render: function () {
      const cuerpo = document.querySelector('#m1 .modulo-cuerpo');
      const universo = CIP.estado.hoy.length >= 8 ? CIP.estado.hoy : CIP.ventana(3);
      const top = universo.slice()
        .sort(function (a, b) { return b.impacto.valor - a.impacto.valor; })
        .slice(0, 10);

      if (!top.length) {
        cuerpo.innerHTML = '<div class="estado-vacio"><p>Todavía no hay despachos del día.</p>' +
          '<p class="tenue">Pulse «Actualizar ahora» para leer las fuentes.</p></div>';
        return;
      }
      cuerpo.dataset.tieneDatos = '1';

      const filas = top.map(function (i, k) {
        const c = i.impacto.componentes;
        return '<article class="despacho">' +
          '<div class="despacho-orden">' + String(k + 1).padStart(2, '0') + '</div>' +
          '<div class="despacho-cuerpo">' +
            '<div class="despacho-meta">' +
              '<span class="sello ' + nivelClase(i.impacto.nivel) + '">' + i.impacto.nivel + '</span>' +
              '<span class="etiqueta-ind i-' + i.indicador.toLowerCase().replace('ó', 'o').replace('í','i') + '">' + i.indicador + '</span>' +
              '<span class="tenue">' + CIP.esc(i.fuenteNombre) + '</span>' +
              '<span class="tenue">' + CIP.fechaCorta(i.fecha) + '</span>' +
              (i.replicas > 1 ? '<span class="replicas">' + i.replicas + ' fuentes</span>' : '') +
              (i.alerta.nivel !== 'verde' ? '<span class="punto-alerta a-' + i.alerta.nivel + '" title="Alerta ' + i.alerta.nivel + '"></span>' : '') +
            '</div>' +
            '<h3><a href="' + CIP.esc(i.enlace) + '" target="_blank" rel="noopener">' + CIP.esc(i.titulo) + '</a></h3>' +
            (i.resumen ? '<p class="despacho-resumen">' + CIP.esc(i.resumen) + '</p>' : '') +
            '<div class="despacho-pie">' +
              '<span class="medidor" title="fuente ' + c.fuente + ' · actor ' + c.actor + ' · tema ' + c.tema +
                ' · corroboración ' + c.corroboracion + ' · recencia ' + c.recencia + '">' +
                '<span style="width:' + Math.round(i.impacto.valor * 100) + '%"></span></span>' +
              '<span class="tenue mono">' + i.impacto.valor.toFixed(2) + '</span>' +
              (i.temas.length ? '<span class="temas">' + i.temas.slice(0, 3).map(function (t) {
                  return '<i>' + CIP.esc(t.nombre) + '</i>'; }).join('') + '</span>' : '') +
            '</div>' +
          '</div></article>';
      }).join('');

      const reparto = {};
      universo.forEach(function (i) { reparto[i.indicador] = (reparto[i.indicador] || 0) + 1; });

      cuerpo.innerHTML =
        '<div class="rejilla-m1">' +
          '<div class="lista-despachos">' + filas + '</div>' +
          '<aside class="panel-lateral">' +
            '<h4>Reparto por indicador</h4><div id="g-indicadores" class="lienzo alto-180"></div>' +
            '<h4>Volumen de los últimos 14 días</h4><div id="g-volumen" class="lienzo alto-160"></div>' +
            '<h4>Estado de las fuentes</h4><div id="salud-fuentes" class="salud"></div>' +
          '</aside>' +
        '</div>';

      UI.grafico('g-indicadores', UI.fundirOpciones({
        grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'item' }),
        series: [{
          type: 'pie', radius: ['52%', '78%'], center: ['50%', '50%'],
          itemStyle: { borderWidth: 2, borderColor: 'transparent' },
          label: { show: true, fontSize: 11, formatter: '{b}\n{c}' },
          labelLine: { length: 6, length2: 6 },
          data: Object.keys(reparto).map(function (k, idx) {
            const cols = [UI.paleta.carmin, UI.paleta.azul, UI.paleta.verde, UI.paleta.ambar];
            return { name: k, value: reparto[k], itemStyle: { color: cols[idx % cols.length] } };
          })
        }]
      }));

      const s = CIP.serie(14);
      UI.grafico('g-volumen', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis' }),
        grid: { left: 30, right: 10, top: 12, bottom: 22 },
        xAxis: { type: 'category', data: s.map(function (x) { return x.etiqueta; }),
                 axisLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10, interval: 2 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        series: [{
          type: 'bar', data: s.map(function (x) { return x.n; }), barMaxWidth: 14,
          itemStyle: { color: UI.paleta.ladrillo, borderRadius: [1, 1, 0, 0] }
        }]
      }));

      const salud = document.getElementById('salud-fuentes');
      const est = CIP.estado.fuentes || [];
      salud.innerHTML = est.length
        ? est.map(function (f) {
            const meta = CIP.idxFuentes[f.id] || { nombre: f.id };
            return '<div class="salud-fila"><span class="punto ' + (f.estado === 'ok' ? 'ok' : 'mal') + '"></span>' +
              '<span class="salud-nombre">' + CIP.esc(meta.nombre) + '</span>' +
              '<span class="mono tenue">' + (f.estado === 'ok' ? f.n : '—') + '</span></div>';
          }).join('')
        : '<p class="tenue">Sin registro de la última lectura.</p>';
    }
  });

  /* ---------------- MÓDULO 2 ---------------- */
  UI.registrar({
    id: 'm2',
    render: function () {
      const cuerpo = document.querySelector('#m2 .modulo-cuerpo');
      const vigilados = ['delaespriella', 'restrepo', 'petro', 'francia'];
      const ministerios = CIP.cfg.entidades.filter(function (e) { return /^min|^cancilleria/.test(e.id); });

      const hoy = CIP.estado.hoy;
      const ayer = CIP.estado.items.filter(function (i) {
        return i.fecha < Date.now() - 86400000 && i.fecha > Date.now() - 172800000;
      });

      const tarjetas = vigilados.map(function (id) {
        const a = CIP.idxActores[id];
        if (!a) return '';
        const h = hoy.filter(function (i) { return i.actores.indexOf(id) >= 0; });
        const y = ayer.filter(function (i) { return i.actores.indexOf(id) >= 0; });
        const delta = y.length ? Math.round(((h.length - y.length) / y.length) * 100) : (h.length ? 100 : 0);
        const sent = h.length ? h.reduce(function (s, i) { return s + i.sentimiento.puntaje; }, 0) / h.length : 0;
        return '<div class="tarjeta-actor">' +
          '<div class="ta-cabeza"><strong>' + CIP.esc(a.nombre) + '</strong>' +
            '<span class="tenue">' + CIP.esc(a.rol) + '</span></div>' +
          '<div class="ta-cifra mono">' + h.length + '<small>menciones hoy</small></div>' +
          '<div class="ta-delta" data-tono="' + (delta > 0 ? 'alza' : delta < 0 ? 'baja' : 'neutro') + '">' +
            (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '% vs. ayer</div>' +
          '<div class="ta-tono">tono <span class="mono">' + (sent >= 0 ? '+' : '') + sent.toFixed(2) + '</span>' +
            '<span class="barra-tono"><i style="left:' + ((sent + 1) / 2 * 100) + '%"></i></span></div>' +
          '<div class="ta-spark" id="spark-' + id + '"></div>' +
        '</div>';
      }).join('');

      cuerpo.dataset.tieneDatos = '1';
      cuerpo.innerHTML =
        '<div class="rejilla-actores">' + tarjetas + '</div>' +
        '<div class="rejilla-2">' +
          '<div><h4>Evolución de menciones · 30 días</h4><div id="g-evolucion" class="lienzo alto-260"></div></div>' +
          '<div><h4>Actividad por hora y día</h4><div id="g-heatmap" class="lienzo alto-260"></div></div>' +
        '</div>' +
        '<h4>Carteras ministeriales en la conversación · 30 días</h4>' +
        '<div id="g-ministerios" class="lienzo alto-220"></div>';

      // sparklines por actor
      vigilados.forEach(function (id) {
        const s = CIP.serie(14, function (i) { return i.actores.indexOf(id) >= 0; });
        UI.grafico('spark-' + id, {
          backgroundColor: 'transparent',
          grid: { left: 0, right: 0, top: 4, bottom: 0 },
          xAxis: { type: 'category', show: false, data: s.map(function (x) { return x.etiqueta; }) },
          yAxis: { type: 'value', show: false },
          tooltip: { trigger: 'axis', backgroundColor: UI.ejeBase().fondoTooltip,
                     borderColor: UI.ejeBase().linea, textStyle: { color: UI.ejeBase().textoTooltip, fontSize: 11 } },
          series: [{ type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: UI.paleta.arcilla },
                     areaStyle: { color: 'rgba(224,106,90,.14)' }, data: s.map(function (x) { return x.n; }) }]
        });
      });

      const dias = CIP.serie(30);
      const series = vigilados.map(function (id, k) {
        const cols = [UI.paleta.carmin, UI.paleta.azul, UI.paleta.arcilla, UI.paleta.verde];
        return {
          name: CIP.idxActores[id] ? CIP.idxActores[id].nombre : id,
          type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 2, color: cols[k % cols.length] },
          itemStyle: { color: cols[k % cols.length] },
          data: CIP.serie(30, function (i) { return i.actores.indexOf(id) >= 0; }).map(function (x) { return x.n; })
        };
      });

      UI.grafico('g-evolucion', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis' }),
        legend: { top: 0, itemWidth: 12, itemHeight: 2, textStyle: { fontSize: 11, color: UI.ejeBase().textoTenue } },
        grid: { left: 34, right: 12, top: 34, bottom: 26 },
        xAxis: { type: 'category', data: dias.map(function (x) { return x.etiqueta; }),
                 axisLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10, interval: 4 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        series: series
      }));

      // heatmap hora × día de la semana
      const nomDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const bloques = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24'];
      const conteo = {};
      CIP.ventana(30).forEach(function (i) {
        const d = new Date(i.fecha);
        const dw = (d.getDay() + 6) % 7;
        const b = Math.floor(d.getHours() / 4);
        const k = dw + '|' + b;
        conteo[k] = (conteo[k] || 0) + 1;
      });
      const datos = [];
      let maxv = 1;
      for (let dw = 0; dw < 7; dw++) for (let b = 0; b < 6; b++) {
        const v = conteo[dw + '|' + b] || 0;
        maxv = Math.max(maxv, v);
        datos.push([b, dw, v]);
      }
      UI.grafico('g-heatmap', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, {
          formatter: function (p) { return nomDias[p.value[1]] + ' ' + bloques[p.value[0]] + ' · ' + p.value[2] + ' despachos'; }
        }),
        grid: { left: 48, right: 12, top: 10, bottom: 46 },
        xAxis: { type: 'category', data: bloques, splitArea: { show: true }, axisLabel: { fontSize: 10 }, axisLine: { show: false } },
        yAxis: { type: 'category', data: nomDias, splitArea: { show: true }, axisLabel: { fontSize: 10 }, axisLine: { show: false } },
        visualMap: {
          min: 0, max: maxv, calculable: false, orient: 'horizontal', left: 'center', bottom: 0,
          itemWidth: 10, itemHeight: 70, textStyle: { fontSize: 10, color: UI.ejeBase().textoTenue },
          inRange: { color: ['rgba(139,0,0,.10)', '#8B0000', '#E06A5A'] }
        },
        series: [{ type: 'heatmap', data: datos, itemStyle: { borderWidth: 1, borderColor: 'rgba(0,0,0,.25)' } }]
      }));

      const minCuenta = ministerios.map(function (m) {
        return { nombre: m.nombre.replace('Ministerio de ', '').replace('Ministerio del ', ''),
                 n: CIP.ventana(30).filter(function (i) { return i.entidades.indexOf(m.id) >= 0; }).length };
      }).sort(function (a, b) { return a.n - b.n; });

      UI.grafico('g-ministerios', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'category', data: minCuenta.map(function (x) { return x.nombre; }),
                 axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11 } },
        series: [{ type: 'bar', data: minCuenta.map(function (x) { return x.n; }), barMaxWidth: 13,
                   itemStyle: { color: UI.paleta.pizarra }, label: { show: true, position: 'right', fontSize: 10, color: UI.ejeBase().textoTenue } }]
      }));
    }
  });
})();
