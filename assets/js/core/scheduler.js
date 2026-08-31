/* ===================================================================
   Programador de actualizaciones
   -------------------------------------------------------------------
   Dos relojes independientes, por diseño:

   1. Servidor (GitHub Actions, cron 17,47 * * * * UTC = dos citas por
      hora, a y media, también en Bogotá). Corre aunque nadie tenga el
      tablero abierto. Es el reloj real.

   2. Navegador (este archivo). Cuando la pestaña está abierta, relee al
      cumplirse cada intervalo (`programacion.intervaloMinutos`) y también
      al abrir el tablero si la última lectura quedó antes del último
      corte de hora.
   =================================================================== */
window.CIP_SCHED = (function () {
  'use strict';

  const CFG = window.CIP_SOURCES.programacion;
  let temporizador = null;
  let alDisparar = null;
  let objetivo = 0;      // instante del próximo corte que estamos esperando

  /* Intervalo entre lecturas, en milisegundos (por defecto, una hora) */
  function intervaloMs() {
    const m = parseInt(CFG.intervaloMinutos, 10);
    return (m > 0 ? m : 60) * 60000;
  }

  /* Los cortes se alinean con la medianoche local: con 60 min caen en
     punto; con 30 min, en punto y media. */
  function medianocheLocal() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  /* Instante del corte más reciente ya ocurrido */
  function ultimaLectura() {
    const iv = intervaloMs();
    const base = medianocheLocal();
    return base + Math.floor((Date.now() - base) / iv) * iv;
  }

  function proximaLectura() {
    const iv = intervaloMs();
    const base = medianocheLocal();
    return base + (Math.floor((Date.now() - base) / iv) + 1) * iv;
  }

  function programar() {
    if (temporizador) clearTimeout(temporizador);
    objetivo = proximaLectura();
    esperar();
  }

  function esperar() {
    const restante = objetivo - Date.now();
    if (restante <= 1000) {
      if (alDisparar) alDisparar('programado');
      programar();
      return;
    }
    // setTimeout se degrada en pestañas de fondo: esperamos por tramos y
    // comparamos siempre contra el reloj, no contra el temporizador
    temporizador = setTimeout(esperar, Math.min(restante, 5 * 60 * 1000));
  }

  /* ¿La última lectura guardada quedó antes del corte vigente? */
  function vencida() {
    const u = window.CIP_STORE.pref('ultimaActualizacion');
    return !u || u < ultimaLectura();
  }

  function iniciar(callback) {
    alDisparar = callback;
    if (vencida()) {
      // El tablero se abrió después del corte y aún no se ha leído
      setTimeout(function () { if (alDisparar) alDisparar('alAbrir'); }, 300);
    } else {
      if (alDisparar) alDisparar('cache');
    }
    programar();
    // Al volver a la pestaña, verificar si se pasó algún corte
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'visible') return;
      if (vencida()) { if (alDisparar) alDisparar('reanudado'); }
    });
  }

  function cuentaRegresiva() {
    const ms = Math.max(0, proximaLectura() - Date.now());
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  return {
    iniciar: iniciar,
    programar: programar,
    intervaloMs: intervaloMs,
    proximaLectura: proximaLectura,
    ultimaLectura: ultimaLectura,
    cuentaRegresiva: cuentaRegresiva
  };
})();
