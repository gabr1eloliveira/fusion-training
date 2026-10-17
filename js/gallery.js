/* Galeria: ampliação com <dialog>, setas, teclado e transições com Anime.js (quando disponível) */
(function () {
  'use strict';

  var dialog = document.getElementById('lightbox');
  var grid = document.querySelector('[data-gallery]');
  if (!dialog || !grid || typeof dialog.showModal !== 'function') return;

  var imgEl = dialog.querySelector('.lightbox__img');
  var countEl = dialog.querySelector('.lightbox__count');
  var btnClose = dialog.querySelector('.lightbox__close');
  var btnPrev = dialog.querySelector('.lightbox__prev');
  var btnNext = dialog.querySelector('.lightbox__next');

  var A = window.anime;
  var useAnime = function () {
    return !!(A && A.animate) && document.documentElement.classList.contains('anime-ready');
  };

  var current = 0;
  var opener = null;
  var token = 0; // invalida transições antigas quando o usuário navega rápido

  // Só entram na ampliação as fotos que realmente carregaram
  function available() {
    return Array.prototype.slice.call(grid.querySelectorAll('.gallery__item')).filter(function (item) {
      return !item.classList.contains('is-missing');
    });
  }

  function render(index) {
    var list = available();
    if (!list.length) return;
    current = (index + list.length) % list.length;
    var img = list[current].querySelector('img');
    imgEl.src = img.currentSrc || img.src;
    imgEl.alt = img.alt;
    countEl.textContent = (current + 1) + ' / ' + list.length;
    var single = list.length < 2;
    btnPrev.hidden = single;
    btnNext.hidden = single;
  }

  // Troca de foto com deslize + fade
  function go(delta) {
    if (!useAnime()) { render(current + delta); return; }
    var my = ++token;
    A.utils.remove(imgEl);
    A.animate(imgEl, { opacity: 0, x: -delta * 70, duration: 200, ease: 'inQuad' }).then(function () {
      if (my !== token) return;
      render(current + delta);
      A.animate(imgEl, { opacity: [0, 1], x: [delta * 70, 0], duration: 600, ease: 'outExpo' });
    });
  }

  function open(item) {
    var list = available();
    var i = list.indexOf(item);
    if (i < 0) return;
    opener = item;
    token++;
    render(i);
    dialog.showModal();
    document.body.classList.add('is-locked');
    btnClose.focus();
    if (useAnime()) {
      A.utils.remove(imgEl);
      A.animate(imgEl, { opacity: [0, 1], scale: [0.86, 1], y: [34, 0], duration: 900, ease: 'outExpo' });
      A.animate(dialog.querySelectorAll('.lightbox__btn'), { opacity: [0, 1], scale: [0.6, 1], duration: 600, delay: A.stagger(70, { start: 200 }), ease: 'outBack' });
      A.animate(countEl, { opacity: [0, 1], y: [10, 0], duration: 600, delay: 350, ease: 'outExpo' });
    }
  }

  // Fechamento animado (botão, clique fora e tecla Esc passam por aqui)
  function requestClose() {
    if (!dialog.open) return;
    if (!useAnime()) { dialog.close(); return; }
    var my = ++token;
    A.utils.remove(imgEl);
    A.animate(imgEl, { opacity: 0, scale: 0.9, y: 20, duration: 260, ease: 'inQuad' }).then(function () {
      if (my === token && dialog.open) dialog.close();
    });
  }

  grid.addEventListener('click', function (e) {
    var item = e.target.closest('.gallery__item');
    if (!item || item.classList.contains('is-missing')) return;
    open(item);
  });

  btnClose.addEventListener('click', requestClose);
  btnPrev.addEventListener('click', function () { go(-1); });
  btnNext.addEventListener('click', function () { go(1); });

  // Fecha ao clicar fora da imagem
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog || e.target === dialog.querySelector('.lightbox__figure')) requestClose();
  });

  // Esc: usa a mesma saída animada
  dialog.addEventListener('cancel', function (e) {
    if (useAnime()) { e.preventDefault(); requestClose(); }
  });

  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  dialog.addEventListener('close', function () {
    token++;
    document.body.classList.remove('is-locked');
    imgEl.removeAttribute('src');
    imgEl.style.opacity = ''; imgEl.style.transform = '';
    if (opener) opener.focus();
  });
})();
