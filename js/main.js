/* Comportamentos gerais: entrada ao rolar, fotos ausentes e horário do dia */
(function () {
  'use strict';

  // --- Fotos ausentes: mantém o espaço reservado visível em vez de ícone quebrado
  function markMissing(img) {
    var holder = img.closest('.photo');
    if (holder) holder.classList.add('is-missing');
  }

  function checkImages() {
    document.querySelectorAll('.photo img').forEach(function (img) {
      if (img.complete && img.naturalWidth === 0) markMissing(img);
    });
  }
  // O evento "error" não borbulha, então escutamos na fase de captura.
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') markMissing(e.target);
  }, true);
  checkImages();
  window.addEventListener('load', checkImages);

  // --- Animações de entrada
  var items = document.querySelectorAll('.reveal');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (document.documentElement.classList.contains('anime-ready')) {
    // Anime.js (js/animations.js) assumiu as animações de entrada: nada a fazer aqui.
  } else if (!('IntersectionObserver' in window) || reduceMotion) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) {
      // Pequeno atraso escalonado entre irmãos próximos
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.setProperty('--reveal-delay', Math.min(siblings, 5) * 70 + 'ms');
      io.observe(el);
    });
  }

  // --- Destaca o dia atual na tabela de horários
  var today = String(new Date().getDay());
  var row = document.querySelector('.hours tr[data-day="' + today + '"]');
  if (row) row.classList.add('is-today');
})();
