/* Navegação: menu hambúrguer, estado do header e link ativo */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('menu-principal');
  if (!header || !toggle || !nav) return;

  var mobile = window.matchMedia('(max-width: 860px)');

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    // No celular o menu fechado não deve receber foco por teclado
    if (mobile.matches) {
      if (open) nav.removeAttribute('inert'); else nav.setAttribute('inert', '');
    }
  }

  function syncMode() {
    if (mobile.matches) {
      setOpen(false);
    } else {
      nav.removeAttribute('inert');
      nav.classList.remove('is-open');
      header.classList.remove('menu-open');
      document.body.classList.remove('is-locked');
      toggle.setAttribute('aria-expanded', 'false');
    }
  }
  syncMode();
  if (mobile.addEventListener) mobile.addEventListener('change', syncMode);
  else mobile.addListener(syncMode);

  toggle.addEventListener('click', function () {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a') && mobile.matches) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Header com fundo depois de rolar
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 24); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Link ativo conforme a seção visível
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var map = {};
  links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
  var sections = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        var active = map[entry.target.id];
        if (active) { active.classList.add('is-active'); active.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
