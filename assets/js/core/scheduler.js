/* ===================================================================
   Programador de actualizaciones
   -------------------------------------------------------------------
   Dos relojes independientes, por diseño:

   1. Servidor (GitHub Actions, cron 0 12 * * * UTC = 07:00 Bogotá).
      Corre aunque nadie tenga el tablero abierto. Es el reloj real.

   2. Navegador (este archivo). Cuando la pestaña está abierta,
      recarga a las 07:00 locales y también al abrir el tablero si la
      última lectura es anterior al corte de hoy.
   =================================================================== */
window.CIP_SCHED = (function () {
  'use strict';

  const CFG = window.CIP_SOURCES.programacion;
  let temporizador = null;
  let alDisparar = null;

  function partesHora() {
    const p = (CFG.horaDiaria || '07:00').split(':');
    return { h: parseInt(p[0], 10) || 7, m: parseInt(p[1], 10) || 0 };
  }

  /* Instante del corte diario más reciente ya ocurrido */
  function corteDeHoy(ref) {
    const ahora = ref ? new Date(ref) : new Date();
    const { h, m } = partesHora();
    const corte = new Date(ahora);
    corte.setHours(h, m, 0, 0);
    if (corte > ahora) corte.setDate(corte.getDate() - 1);
    return corte.getTime();
  }

  function proximoCorte() {
    const ahora = new Date();
    const { h, m } = partesHora();
    const prox = new Date(ahora);
    prox.setHours(h, m, 0, 0);
    if (prox <= ahora) prox.setDate(prox.getDate() + 1);
    return prox.getTime();
  }

  function programar() {
    if (temporizador) clearTimeout(temporizador);
    const espera = proximoCorte() - Date.now();
    // setTimeout se degrada con esperas muy largas: reprogramamos por tramos
    const tramo = Math.min(espera, 30 * 60 * 1000);
    temporizador = setTimeout(function () {
      if (Date.now() >= proximoCorte() - 1000) {
        if (alDisparar) alDisparar('programado');
      }
      programar();
    }, tramo);
  }

  function iniciar(callback) {
    alDisparar = callback;
    const ultima = window.CIP_STORE.pref('ultimaActualizacion');
    if (!ultima || ultima < corteDeHoy()) {
      // El tablero se abrió después del corte y aún no se ha leído hoy
      setTimeout(function () { if (alDisparar) alDisparar('alAbrir'); }, 300);
    } else {
      if (alDisparar) alDisparar('cache');
    }
    programar();
    // Al volver a la pestaña, verificar si se pasó el corte
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      const u = window.CIP_STORE.pref('ultimaActualizacion');
      if (!u || u < corteDeHoy()) { if (alDisparar) alDisparar('reanudado'); }
    });
  }

  function cuentaRegresiva() {
    const ms = proximoCorte() - Date.now();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  return {
    iniciar: iniciar,
    programar: programar,
    proximoCorte: proximoCorte,
    corteDeHoy: corteDeHoy,
    cuentaRegresiva: cuentaRegresiva
  };
})();
