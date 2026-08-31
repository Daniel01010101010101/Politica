/* ===================================================================
   Interfaz: navegación, cabecera viva y despacho de módulos
   =================================================================== */
window.UI = (function () {
  'use strict';

  const modulos = [];          // { id, titulo, render }
  const graficos = [];         // instancias ECharts, para redimensionar
  let avisoTimer = null;

  function registrar(m) { modulos.push(m); }

  function $(sel, raiz) { return (raiz || document).querySelector(sel); }
  function $$(sel, raiz) { return Array.from((raiz || document).querySelectorAll(sel)); }

  /* ---------- gráficos ---------- */
  function grafico(idContenedor, opcion) {
    if (!window.echarts) return null;
    const el = document.getElementById(idContenedor);
    if (!el) return null;
    let inst = echarts.getInstanceByDom(el);
    if (!inst) { inst = echarts.init(el, null, { renderer: 'canvas' }); graficos.push(inst); }
    inst.setOption(opcion, true);
    return inst;
  }

  const paleta = {
    // Marca
    morado: '#8E378E', moradoClaro: '#B565B5', moradoHondo: '#6B2A6B', magenta: '#921B4C',
    // Señal
    rojo: '#E92025', naranja: '#F49A20', verde: '#35A74A', azul: '#6171C7',
    azulHondo: '#2A3883',
    // Neutros para series sin carga semántica
    pizarra: '#5B6472', hueso: '#C9C3B8',
    // Alias heredados
    carmin: '#8E378E', ladrillo: '#6B2A6B', arcilla: '#B565B5', ambar: '#F49A20',
    violeta: '#8E378E'
  };

  function ejeBase() {
    const oscuro = document.body.dataset.tema !== 'claro';
    return {
      textoTenue: oscuro ? '#8B8D93' : '#6B6B6B',
      linea: oscuro ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)',
      fondoTooltip: oscuro ? '#1A1A1D' : '#FFFFFF',
      textoTooltip: oscuro ? '#E8E6E1' : '#212121'
    };
  }

  function opcionBase() {
    const b = ejeBase();
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: 'IBM Plex Sans, system-ui, sans-serif', color: b.textoTenue },
      tooltip: {
        backgroundColor: b.fondoTooltip, borderColor: b.linea,
        textStyle: { color: b.textoTooltip, fontSize: 12 },
        extraCssText: 'box-shadow:0 8px 28px rgba(0,0,0,.35);border-radius:2px;'
      },
      grid: { left: 42, right: 16, top: 24, bottom: 28, containLabel: true }
    };
  }

  function fundirOpciones(extra) {
    const base = opcionBase();
    return Object.assign(base, extra);
  }

  /* ---------- estados ---------- */
  function estadoCarga(activo, motivo) {
    const barra = $('#barra-progreso');
    const btn = $('#btn-actualizar');
    if (barra) barra.classList.toggle('activa', !!activo);
    if (btn) {
      btn.disabled = !!activo;
      btn.querySelector('.etiqueta').textContent = activo ? 'Leyendo fuentes…' : 'Actualizar ahora';
    }
    if (!activo) {
      const p = $('#progreso-detalle');
      if (p) p.textContent = '';
    }
    if (activo && motivo) {
      const p = $('#progreso-detalle');
      const glosa = { programado: 'Lectura automática de la hora', alAbrir: 'Primera lectura',
                      manual: 'Actualización solicitada', reanudado: 'Poniendo al día tras el último corte' };
      if (p) p.textContent = glosa[motivo] || '';
    }
  }

  function progreso(hechas, total, nombre) {
    const p = $('#progreso-detalle');
    if (p) p.textContent = hechas + ' de ' + total + ' fuentes · ' + nombre;
  }

  function aviso(texto, tono) {
    const c = $('#avisos');
    if (!c) return;
    c.textContent = texto;
    c.dataset.tono = tono || 'atencion';
    c.classList.add('visible');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { c.classList.remove('visible'); }, 9000);
  }

  function vacio() {
    $$('.modulo-cuerpo').forEach(function (el) {
      if (!el.dataset.tieneDatos) {
        el.innerHTML = '<div class="estado-vacio">' +
          '<p>Sin despachos en la base local.</p>' +
          '<p class="tenue">Pulse «Actualizar ahora» para leer las fuentes. Si el tablero está publicado, ' +
          'el recolector escribe <code>data/latest.json</code> cada hora.</p></div>';
      }
    });
  }

  /* ---------- cabecera ---------- */
  function renderCabecera() {
    const e = CIP.estado;
    const hoy = e.hoy || [];
    const ayer = (e.items || []).filter(function (i) {
      return i.fecha < Date.now() - 86400000 && i.fecha > Date.now() - 172800000;
    });

    const rojas = hoy.filter(function (i) { return i.alerta.nivel === 'rojo'; }).length;
    const sent = hoy.length ? hoy.reduce(function (a, i) { return a + i.sentimiento.puntaje; }, 0) / hoy.length : 0;
    const muyAlto = hoy.filter(function (i) { return i.impacto.nivel === 'Muy Alto'; }).length;
    const varia = ayer.length ? Math.round(((hoy.length - ayer.length) / ayer.length) * 100) : 0;

    function kpi(id, valor, delta, tono) {
      const el = document.getElementById(id);
      if (!el) return;
      el.querySelector('.kpi-valor').textContent = valor;
      const d = el.querySelector('.kpi-delta');
      if (d) {
        d.textContent = delta || '';
        d.dataset.tono = tono || 'neutro';
      }
    }

    kpi('kpi-volumen', hoy.length, (varia >= 0 ? '+' : '') + varia + '% frente a ayer',
        varia > 15 ? 'alza' : varia < -15 ? 'baja' : 'neutro');
    kpi('kpi-alertas', rojas, rojas ? 'requieren lectura' : 'sin alertas rojas', rojas ? 'baja' : 'alza');
    kpi('kpi-impacto', muyAlto, 'de impacto muy alto', 'neutro');
    kpi('kpi-sentimiento', (sent >= 0 ? '+' : '') + sent.toFixed(2),
        sent > 0.12 ? 'tono favorable' : sent < -0.12 ? 'tono adverso' : 'tono neutro',
        sent > 0.12 ? 'alza' : sent < -0.12 ? 'baja' : 'neutro');

    const sello = $('#sello-actualizacion');
    if (sello) {
      const origen = e.origen === 'directo' ? 'lectura directa' :
                     e.origen === 'recolector' ? 'recolector horario' : 'instantánea';
      sello.innerHTML = e.generado
        ? 'Actualizado ' + CIP.hace(e.generado) + ' <span class="tenue">· ' + origen + '</span>'
        : 'Sin lectura';
    }

    const cuenta = $('#cuenta-regresiva');
    if (cuenta) cuenta.textContent = window.CIP_SCHED.cuentaRegresiva();

    // franja de titulares
    const franja = $('#franja-titulares');
    if (franja) {
      const top = hoy.slice().sort(function (a, b) { return b.impacto.valor - a.impacto.valor; }).slice(0, 12);
      if (!top.length) {
        franja.innerHTML = '<span class="franja-espera">A la espera de la primera lectura del día.</span>';
      } else {
        const copia = top.map(function (i) {
          return '<a href="' + CIP.esc(i.enlace) + '" target="_blank" rel="noopener">' +
            '<span class="franja-nivel n-' + i.impacto.nivel.replace(/ /g, '-').toLowerCase() + '"></span>' +
            CIP.esc(i.titulo) + '<em>' + CIP.esc(i.fuenteNombre) + '</em></a>';
        }).join('');
        // Se repite el bloque: la animación desplaza la mitad exacta del ancho
        franja.innerHTML = copia + '<span aria-hidden="true" class="franja-copia">' + copia + '</span>';
      }
    }
  }

  /* ---------- navegación ---------- */
  function activarNavegacion() {
    const enlaces = $$('.nav-modulo');
    const secciones = $$('.modulo');
    enlaces.forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        const destino = document.getElementById(a.dataset.destino);
        if (destino) destino.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        $('#lateral').classList.remove('abierto');
      });
    });
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          enlaces.forEach(function (a) { a.classList.toggle('activo', a.dataset.destino === e.target.id); });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      secciones.forEach(function (s) { obs.observe(s); });
    }
  }

  /* ---------- render general ---------- */
  function renderTodo() {
    renderCabecera();
    modulos.forEach(function (m) {
      try { m.render(); }
      catch (err) {
        console.error('[' + m.id + ']', err);
        const c = document.querySelector('#' + m.id + ' .modulo-cuerpo');
        if (c) c.innerHTML = '<div class="estado-vacio"><p>Este módulo no pudo dibujarse.</p>' +
          '<p class="tenue">' + CIP.esc(err.message) + '</p></div>';
      }
    });
    setTimeout(function () { graficos.forEach(function (g) { try { g.resize(); } catch (e) {} }); }, 60);
  }

  window.addEventListener('resize', function () {
    graficos.forEach(function (g) { try { g.resize(); } catch (e) {} });
  });

  return {
    registrar: registrar, grafico: grafico, fundirOpciones: fundirOpciones, paleta: paleta,
    ejeBase: ejeBase, estadoCarga: estadoCarga, progreso: progreso, aviso: aviso, vacio: vacio,
    renderTodo: renderTodo, renderCabecera: renderCabecera, activarNavegacion: activarNavegacion,
    $: $, $$: $$
  };
})();
