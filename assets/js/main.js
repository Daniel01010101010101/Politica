/* ===================================================================
   Arranque
   =================================================================== */
(function () {
  'use strict';

  const $ = UI.$;

  /* ---- tema ---- */
  const temaGuardado = CIP_STORE.pref('tema') || 'oscuro';
  document.body.dataset.tema = temaGuardado;
  $('#btn-tema').addEventListener('click', function () {
    const nuevo = document.body.dataset.tema === 'claro' ? 'oscuro' : 'claro';
    document.body.dataset.tema = nuevo;
    CIP_STORE.pref('tema', nuevo);
    UI.renderTodo();     // los gráficos se redibujan con la nueva paleta
  });

  /* ---- fecha de cabecera ---- */
  $('#fecha-larga').textContent = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).replace(/^\w/, function (c) { return c.toUpperCase(); });

  /* ---- rail en pantallas pequeñas ---- */
  $('#abrir-rail').addEventListener('click', function () { $('#lateral').classList.toggle('abierto'); });
  document.addEventListener('click', function (e) {
    const rail = $('#lateral');
    if (!rail.classList.contains('abierto')) return;
    if (rail.contains(e.target) || e.target.id === 'abrir-rail') return;
    rail.classList.remove('abierto');
  });

  /* ---- actualizar ahora ---- */
  $('#btn-actualizar').addEventListener('click', function () { CIP.actualizar('manual'); });

  /* ---- cuenta regresiva ---- */
  setInterval(function () {
    const c = $('#cuenta-regresiva');
    if (c) c.textContent = CIP_SCHED.cuentaRegresiva();
    const s = $('#sello-actualizacion');
    if (s && CIP.estado.generado) {
      const origen = CIP.estado.origen === 'directo' ? 'lectura directa' : 'recolector horario';
      s.innerHTML = 'Actualizado ' + CIP.hace(CIP.estado.generado) + ' <span class="tenue">· ' + origen + '</span>';
    }
  }, 1000);

  /* ---- panel de ajustes ---- */
  const dlg = $('#ajustes');
  const selProxy = $('#sel-proxy');
  CIP_SOURCES.red.proxies.forEach(function (p) {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.nombre;
    selProxy.appendChild(o);
  });
  selProxy.value = CIP_STORE.pref('proxy') || CIP_SOURCES.red.proxyPorDefecto;
  $('#proxy-propio').value = CIP_STORE.pref('proxyPropio') || '';
  $('#modo-directo').checked = CIP_STORE.pref('modoDirecto') === true;

  $('#lista-fuentes').innerHTML = CIP_SOURCES.fuentes.map(function (f) {
    return '<div class="salud-fila"><span class="punto ' + (f.activo === false ? 'mal' : 'ok') + '"></span>' +
      '<span class="salud-nombre">' + CIP.esc(f.nombre) + '</span>' +
      '<span class="tenue mono">' + CIP.esc(f.categoria) + '</span></div>';
  }).join('');

  function infoBase() {
    CIP_STORE.leerDespachos(0).then(function (d) {
      $('#info-base').textContent = (d ? d.length : 0) + ' despachos guardados en este navegador. ' +
        'La base se conserva entre visitas y alimenta el módulo 11.';
    }).catch(function () { $('#info-base').textContent = 'La base local no está disponible en este navegador.'; });
  }

  $('#btn-ajustes').addEventListener('click', function () { infoBase(); dlg.showModal(); });
  $('#cerrar-ajustes').addEventListener('click', function () { dlg.close(); });
  $('#btn-guardar-ajustes').addEventListener('click', function () {
    CIP_STORE.pref('proxy', selProxy.value);
    CIP_STORE.pref('proxyPropio', $('#proxy-propio').value.trim());
    CIP_STORE.pref('modoDirecto', $('#modo-directo').checked);
    dlg.close();
    UI.aviso('Ajustes guardados. Pulse «Actualizar ahora» para aplicarlos.');
  });
  $('#btn-vaciar').addEventListener('click', function () {
    if (!confirm('Se borrarán los despachos guardados en este navegador. El histórico del repositorio no se toca. ¿Continuar?')) return;
    CIP_STORE.vaciar().then(function () {
      CIP.estado.items = []; CIP.estado.hoy = []; CIP.estado.dias = [];
      UI.renderTodo(); infoBase();
      UI.aviso('Base local vacía.');
    });
  });

  /* ---- pie técnico ---- */
  const cadaMin = CIP_SOURCES.programacion.intervaloMinutos || 60;
  $('#pie-tecnico').textContent =
    CIP_SOURCES.fuentes.length + ' fuentes configuradas · actualización cada ' +
    (cadaMin === 60 ? 'hora' : cadaMin + ' minutos') +
    ' (' + CIP_SOURCES.programacion.zonaHoraria + ') · ' +
    'parte del día ' + CIP_SOURCES.programacion.horaDiaria + ' · ' +
    'ventana de análisis ' + CIP_SOURCES.red.ventanaDias + ' días';

  /* ---- navegación e inicio ---- */
  UI.activarNavegacion();
  UI.renderCabecera();
  CIP_SCHED.iniciar(function (motivo) {
    if (motivo === 'cache') {
      // ya se leyó hoy: pintar desde la base local sin salir a la red
      CIP_STORE.leerDespachos(Date.now() - 400 * 86400000).then(function (h) {
        if (h && h.length) {
          CIP.estado.items = h.sort(function (a, b) { return b.fecha - a.fecha; });
          CIP.estado.hoy = CIP.estado.items.filter(function (i) { return i.fecha > Date.now() - 86400000; });
          CIP.estado.generado = CIP_STORE.pref('ultimaActualizacion');
          UI.renderTodo();
        } else { CIP.actualizar('alAbrir'); }
      }).catch(function () { CIP.actualizar('alAbrir'); });
      return;
    }
    CIP.actualizar(motivo);
  });
})();
