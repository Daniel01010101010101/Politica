/* ===================================================================
   MÓDULO 3 · Congreso en tiempo real
   MÓDULO 4 · Partidos políticos
   MÓDULO 5 · Bogotá
   =================================================================== */
(function () {
  'use strict';

  /* Etapas del trámite legislativo detectadas en el texto del despacho */
  const ETAPAS = [
    { id: 'radicado',   nombre: 'Radicado',    claves: ['radico', 'radicado', 'presento el proyecto', 'nuevo proyecto de ley'] },
    { id: 'ponencia',   nombre: 'Ponencia',    claves: ['ponencia', 'ponente', 'informe de ponencia'] },
    { id: 'comision',   nombre: 'Comisión',    claves: ['comision primera', 'comision septima', 'comision tercera', 'comision cuarta', 'primer debate'] },
    { id: 'plenaria',   nombre: 'Plenaria',    claves: ['plenaria', 'segundo debate', 'tercer debate', 'cuarto debate'] },
    { id: 'conciliado', nombre: 'Conciliación',claves: ['conciliacion', 'texto conciliado'] },
    { id: 'aprobado',   nombre: 'Aprobado',    claves: ['aprobado en', 'aprobo el proyecto', 'sancion presidencial', 'quedo aprobada'] },
    { id: 'hundido',    nombre: 'Hundido',     claves: ['hundio', 'archivado', 'se hundio', 'naufrago', 'negado'] }
  ];

  function etapaDe(item) {
    const t = window.CIP_NLP.normaliza(item.titulo + ' ' + item.cuerpo);
    for (let i = ETAPAS.length - 1; i >= 0; i--) {
      for (let j = 0; j < ETAPAS[i].claves.length; j++) {
        if (t.indexOf(ETAPAS[i].claves[j]) >= 0) return ETAPAS[i];
      }
    }
    return null;
  }

  function semaforo(item) {
    if (item.alerta.nivel === 'rojo') return 'rojo';
    const e = etapaDe(item);
    if (e && (e.id === 'hundido')) return 'rojo';
    if (e && (e.id === 'aprobado' || e.id === 'conciliado')) return 'verde';
    if (item.sentimiento.puntaje < -0.2) return 'amarillo';
    return e ? 'amarillo' : 'verde';
  }

  /* ---------------- MÓDULO 3 ---------------- */
  UI.registrar({
    id: 'm3',
    render: function () {
      const cuerpo = document.querySelector('#m3 .modulo-cuerpo');
      const legislativo = CIP.ventana(30).filter(function (i) {
        return i.fuenteAmbito === 'congreso' || i.temas.some(function (t) { return t.id === 'congreso'; }) ||
               etapaDe(i) !== null;
      });

      if (!legislativo.length) {
        cuerpo.innerHTML = '<div class="estado-vacio"><p>Sin actividad legislativa en la ventana leída.</p>' +
          '<p class="tenue">Las fuentes del Congreso se consultan por RSS de descubrimiento; revise el estado en el módulo 1.</p></div>';
        return;
      }
      cuerpo.dataset.tieneDatos = '1';

      const porEtapa = {};
      ETAPAS.forEach(function (e) { porEtapa[e.id] = 0; });
      legislativo.forEach(function (i) { const e = etapaDe(i); if (e) porEtapa[e.id]++; });

      const citaciones = legislativo.filter(function (i) {
        const t = window.CIP_NLP.normaliza(i.titulo + ' ' + i.cuerpo);
        return t.indexOf('citacion') >= 0 || t.indexOf('cito a') >= 0 || t.indexOf('mocion de censura') >= 0 ||
               t.indexOf('debate de control politico') >= 0;
      });

      const filas = legislativo.slice(0, 60).map(function (i) {
        const e = etapaDe(i);
        const sm = semaforo(i);
        return '<tr>' +
          '<td><span class="semaforo s-' + sm + '"></span></td>' +
          '<td class="celda-titulo"><a href="' + CIP.esc(i.enlace) + '" target="_blank" rel="noopener">' + CIP.esc(i.titulo) + '</a></td>' +
          '<td>' + (e ? CIP.esc(e.nombre) : '<span class="tenue">—</span>') + '</td>' +
          '<td>' + CIP.esc(i.fuenteNombre) + '</td>' +
          '<td class="mono">' + new Date(i.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + '</td>' +
          '<td class="mono">' + i.impacto.valor.toFixed(2) + '</td>' +
        '</tr>';
      }).join('');

      cuerpo.innerHTML =
        '<div class="rejilla-2">' +
          '<div><h4>Avance del trámite legislativo</h4><div id="g-embudo" class="lienzo alto-260"></div></div>' +
          '<div><h4>Control político y citaciones · 30 días</h4>' +
            '<div class="cifra-suelta"><span class="mono">' + citaciones.length + '</span> menciones a citaciones, ' +
            'debates de control o moción de censura</div>' +
            '<ul class="lista-simple">' + (citaciones.slice(0, 7).map(function (i) {
              return '<li><a href="' + CIP.esc(i.enlace) + '" target="_blank" rel="noopener">' + CIP.esc(i.titulo) + '</a>' +
                     '<span class="tenue"> · ' + CIP.hace(i.fecha) + '</span></li>';
            }).join('') || '<li class="tenue">Sin registros en la ventana.</li>') + '</ul>' +
          '</div>' +
        '</div>' +
        '<h4>Tablero legislativo</h4>' +
        '<div class="tabla-envoltura"><table id="tabla-congreso" class="tabla-datos"><thead><tr>' +
        '<th></th><th>Asunto</th><th>Etapa</th><th>Fuente</th><th>Fecha</th><th>Impacto</th>' +
        '</tr></thead><tbody>' + filas + '</tbody></table></div>';

      UI.grafico('g-embudo', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'item' }),
        grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'category', data: ETAPAS.map(function (e) { return e.nombre; }).reverse(),
                 axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar', barMaxWidth: 16,
          data: ETAPAS.map(function (e) {
            const col = e.id === 'hundido' ? UI.paleta.rojo : e.id === 'aprobado' ? UI.paleta.verde : UI.paleta.ladrillo;
            return { value: porEtapa[e.id], itemStyle: { color: col } };
          }).reverse(),
          label: { show: true, position: 'right', fontSize: 10, color: UI.ejeBase().textoTenue }
        }]
      }));

      if (window.jQuery && jQuery.fn.DataTable) {
        try {
          if (jQuery.fn.DataTable.isDataTable('#tabla-congreso')) jQuery('#tabla-congreso').DataTable().destroy();
          jQuery('#tabla-congreso').DataTable({
            pageLength: 10, order: [[5, 'desc']], lengthChange: false,
            language: { search: 'Filtrar:', info: '_START_–_END_ de _TOTAL_', paginate: { previous: '‹', next: '›' },
                        zeroRecords: 'Sin coincidencias', infoEmpty: 'Sin registros' },
            columnDefs: [{ orderable: false, targets: 0 }]
          });
        } catch (e) { /* la tabla queda estática */ }
      }
    }
  });

  /* ---------------- MÓDULO 4 ---------------- */
  UI.registrar({
    id: 'm4',
    render: function () {
      const cuerpo = document.querySelector('#m4 .modulo-cuerpo');
      const v30 = CIP.ventana(30), v7 = CIP.ventana(7), v14 = CIP.ventana(14);

      const datos = CIP.cfg.partidos.map(function (p) {
        const n30 = v30.filter(function (i) { return i.partidos.indexOf(p.id) >= 0; });
        const n7 = v7.filter(function (i) { return i.partidos.indexOf(p.id) >= 0; });
        const prev7 = v14.filter(function (i) {
          return i.partidos.indexOf(p.id) >= 0 && i.fecha < Date.now() - 7 * 86400000;
        });
        const sent = n30.length ? n30.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / n30.length : 0;
        return {
          id: p.id, nombre: p.nombre, color: p.color,
          n30: n30.length, n7: n7.length,
          crecimiento: prev7.length ? Math.round(((n7.length - prev7.length) / prev7.length) * 100) : (n7.length ? 100 : 0),
          sentimiento: +sent.toFixed(3),
          cuota: 0
        };
      });
      const total = datos.reduce(function (a, d) { return a + d.n30; }, 0) || 1;
      datos.forEach(function (d) { d.cuota = +(d.n30 / total * 100).toFixed(1); });
      datos.sort(function (a, b) { return b.n30 - a.n30; });

      cuerpo.dataset.tieneDatos = '1';
      cuerpo.innerHTML =
        '<div class="rejilla-2">' +
          '<div><h4>Participación mediática · 30 días</h4><div id="g-partidos" class="lienzo alto-280"></div></div>' +
          '<div><h4>Tono medio por partido</h4><div id="g-tono-partidos" class="lienzo alto-280"></div></div>' +
        '</div>' +
        '<div class="rejilla-partidos">' + datos.map(function (d) {
          return '<div class="ficha-partido" style="--color:' + d.color + '">' +
            '<div class="fp-nombre">' + CIP.esc(d.nombre) + '</div>' +
            '<div class="fp-cifra mono">' + d.cuota + '%<small>de la conversación</small></div>' +
            '<div class="fp-linea"><span>menciones 30 d</span><b class="mono">' + d.n30 + '</b></div>' +
            '<div class="fp-linea"><span>últimos 7 d</span><b class="mono">' + d.n7 + '</b></div>' +
            '<div class="fp-linea"><span>crecimiento</span><b class="mono" data-tono="' +
              (d.crecimiento > 0 ? 'alza' : d.crecimiento < 0 ? 'baja' : 'neutro') + '">' +
              (d.crecimiento >= 0 ? '+' : '') + d.crecimiento + '%</b></div>' +
            '<div class="fp-linea"><span>tono</span><b class="mono" data-tono="' +
              (d.sentimiento > 0.1 ? 'alza' : d.sentimiento < -0.1 ? 'baja' : 'neutro') + '">' +
              (d.sentimiento >= 0 ? '+' : '') + d.sentimiento.toFixed(2) + '</b></div>' +
          '</div>';
        }).join('') + '</div>';

      UI.grafico('g-partidos', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, { trigger: 'axis', axisPointer: { type: 'shadow' } }),
        grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'category', data: datos.map(function (d) { return d.nombre; }).reverse(),
                 axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar', barMaxWidth: 16,
          data: datos.map(function (d) { return { value: d.n30, itemStyle: { color: d.color } }; }).reverse(),
          label: { show: true, position: 'right', fontSize: 10, color: UI.ejeBase().textoTenue }
        }]
      }));

      UI.grafico('g-tono-partidos', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, {
          formatter: function (p) { return p.name + '<br/>tono ' + p.value[0].toFixed(2) + ' · ' + p.value[1] + ' menciones'; }
        }),
        grid: { left: 40, right: 24, top: 16, bottom: 40 },
        xAxis: { type: 'value', min: -1, max: 1, name: 'tono', nameLocation: 'middle', nameGap: 24,
                 nameTextStyle: { fontSize: 10 }, splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        yAxis: { type: 'value', name: 'menciones', nameTextStyle: { fontSize: 10 },
                 splitLine: { lineStyle: { color: UI.ejeBase().linea } }, axisLabel: { fontSize: 10 } },
        series: [{
          type: 'scatter',
          symbolSize: function (v) { return Math.max(10, Math.sqrt(v[1]) * 5); },
          data: datos.filter(function (d) { return d.n30 > 0; }).map(function (d) {
            return { name: d.nombre, value: [d.sentimiento, d.n30], itemStyle: { color: d.color, opacity: .82 } };
          }),
          markLine: { silent: true, symbol: 'none', lineStyle: { color: UI.ejeBase().linea, type: 'dashed' },
                      data: [{ xAxis: 0 }] },
          label: { show: true, formatter: '{b}', position: 'top', fontSize: 10, color: UI.ejeBase().textoTenue }
        }]
      }));
    }
  });

  /* ---------------- MÓDULO 5 ---------------- */
  UI.registrar({
    id: 'm5',
    render: function () {
      const cuerpo = document.querySelector('#m5 .modulo-cuerpo');
      const bog = CIP.ventana(30).filter(function (i) {
        return i.fuenteAmbito === 'bogota' ||
               window.CIP_NLP.contiene(window.CIP_NLP.normaliza(i.titulo + ' ' + i.cuerpo), 'bogota');
      });

      if (!bog.length) {
        cuerpo.innerHTML = '<div class="estado-vacio"><p>Sin despachos de Bogotá en la ventana leída.</p></div>';
        return;
      }
      cuerpo.dataset.tieneDatos = '1';

      const ejes = [
        { id: 'movilidad', nombre: 'Movilidad', claves: ['transmilenio', 'metro', 'pico y placa', 'troncal', 'trafico', 'ciclorruta', 'peaje', 'via'] },
        { id: 'seguridad', nombre: 'Seguridad', claves: ['hurto', 'homicidio', 'extorsion', 'inseguridad', 'policia', 'atraco', 'riña'] },
        { id: 'economia', nombre: 'Economía', claves: ['empleo', 'empresa', 'inversion', 'presupuesto distrital', 'impuesto', 'comercio'] },
        { id: 'proyectos', nombre: 'Proyectos', claves: ['obra', 'contrato', 'pot', 'licitacion', 'construccion', 'renovacion urbana'] },
        { id: 'concejo', nombre: 'Concejo', claves: ['concejo', 'cabildo', 'concejal', 'acuerdo distrital'] },
        { id: 'servicios', nombre: 'Servicios', claves: ['acueducto', 'agua', 'basuras', 'energia', 'salud', 'colegio'] }
      ];

      const medidas = ejes.map(function (e) {
        const items = bog.filter(function (i) {
          const t = window.CIP_NLP.normaliza(i.titulo + ' ' + i.cuerpo);
          return e.claves.some(function (c) { return t.indexOf(c) >= 0; });
        });
        const sent = items.length ? items.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / items.length : 0;
        return { eje: e, n: items.length, sent: +sent.toFixed(3), items: items };
      });

      cuerpo.innerHTML =
        '<div class="rejilla-kpi-bogota">' + medidas.map(function (m) {
          return '<div class="kpi-bogota">' +
            '<span class="kb-nombre">' + m.eje.nombre + '</span>' +
            '<span class="kb-valor mono">' + m.n + '</span>' +
            '<span class="kb-tono" data-tono="' + (m.sent > 0.1 ? 'alza' : m.sent < -0.1 ? 'baja' : 'neutro') + '">' +
              (m.sent >= 0 ? '+' : '') + m.sent.toFixed(2) + '</span></div>';
        }).join('') + '</div>' +
        '<div class="rejilla-2">' +
          '<div><h4>Intensidad por eje y semana</h4><div id="g-bogota-heat" class="lienzo alto-240"></div></div>' +
          '<div><h4>Últimos despachos del Distrito</h4><ul class="lista-simple lista-scroll">' +
            bog.slice(0, 14).map(function (i) {
              return '<li><span class="semaforo s-' + (i.alerta.nivel === 'rojo' ? 'rojo' : i.alerta.nivel === 'amarillo' ? 'amarillo' : 'verde') + '"></span>' +
                '<a href="' + CIP.esc(i.enlace) + '" target="_blank" rel="noopener">' + CIP.esc(i.titulo) + '</a>' +
                '<span class="tenue"> · ' + CIP.esc(i.fuenteNombre) + ' · ' + CIP.hace(i.fecha) + '</span></li>';
            }).join('') + '</ul></div>' +
        '</div>';

      // heatmap eje × semana
      const semanas = 5;
      const datos = [], etiquetasSem = [];
      for (let s = semanas - 1; s >= 0; s--) {
        const fin = Date.now() - s * 7 * 86400000;
        const ini = fin - 7 * 86400000;
        etiquetasSem.push(new Date(ini).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }));
        medidas.forEach(function (m, y) {
          const n = m.items.filter(function (i) { return i.fecha >= ini && i.fecha < fin; }).length;
          datos.push([semanas - 1 - s, y, n]);
        });
      }
      const maxv = Math.max(1, Math.max.apply(null, datos.map(function (d) { return d[2]; })));

      UI.grafico('g-bogota-heat', UI.fundirOpciones({
        tooltip: Object.assign(UI.fundirOpciones({}).tooltip, {
          formatter: function (p) { return medidas[p.value[1]].eje.nombre + ' · semana del ' + etiquetasSem[p.value[0]] + ': ' + p.value[2]; }
        }),
        grid: { left: 76, right: 12, top: 10, bottom: 46 },
        xAxis: { type: 'category', data: etiquetasSem, axisLabel: { fontSize: 10 }, axisLine: { show: false }, splitArea: { show: true } },
        yAxis: { type: 'category', data: medidas.map(function (m) { return m.eje.nombre; }),
                 axisLabel: { fontSize: 10 }, axisLine: { show: false }, splitArea: { show: true } },
        visualMap: { min: 0, max: maxv, orient: 'horizontal', left: 'center', bottom: 0, calculable: false,
                     itemWidth: 10, itemHeight: 70, textStyle: { fontSize: 10, color: UI.ejeBase().textoTenue },
                     inRange: { color: ['rgba(58,110,165,.10)', '#3A6EA5', '#8B0000'] } },
        series: [{ type: 'heatmap', data: datos, itemStyle: { borderWidth: 1, borderColor: 'rgba(0,0,0,.25)' } }]
      }));
    }
  });
})();
