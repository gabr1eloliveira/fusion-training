/* Animações com Anime.js v4 (bundle UMD em js/vendor, global `anime`).
 *
 * Princípios:
 *  - Progressivo: sem a biblioteca, sem JS ou com prefers-reduced-motion, o site fica completo e legível
 *    (main.js assume a revelação simples via IntersectionObserver).
 *  - Rolagem manda no progresso (onScroll com `sync`) nos efeitos "scrub"; entradas pontuais usam gatilho único.
 *  - Texto real nunca é alterado: splitText mantém uma cópia acessível e só divide em palavras.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var A = window.anime;

  function bail() {
    root.classList.remove('anime-pending', 'anime-ready');
    root.classList.add('no-anime');
  }

  // Remove estilos inline que o Anime.js possa ter aplicado antes de uma falha
  function restore() {
    Array.prototype.forEach.call(document.querySelectorAll('.reveal, [data-hero], .hero__content, .hero__media, .site-header__inner, .wa-float, .gallery__item, .gallery__item img, .photo, .photo img, .service, .service *, .amenities li, .amenities .icon, .features, .feature, .story__numerals span, .contact p, .hours tr, .location__actions .btn, .site-footer .footer__grid > *, .footer__bottom'), function (el) {
      el.style.opacity = ''; el.style.transform = ''; el.style.clipPath = ''; el.style.scale = ''; el.style.translate = ''; el.style.rotate = '';
    });
  }

  if (root.classList.contains('no-anime')) return;
  if (!A || !A.animate || !A.onScroll || !A.createTimeline || !A.splitText) { bail(); return; }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { root.classList.remove('anime-pending'); return; }

  var animate = A.animate;
  var createTimeline = A.createTimeline;
  var stagger = A.stagger;
  var set = A.utils.set;

  // ---------- utilidades ----------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  var observers = [];
  function trig(params) {
    var o = A.onScroll(params);
    observers.push(o);
    return o;
  }
  var handled = new Set();
  function take(els) { [].concat(els).forEach(function (el) { if (el) handled.add(el); }); }

  // Posições de rolagem (container = viewport). Sempre em formato de objeto, sem ambiguidade.
  function pos(target, container) { return { target: target, container: container }; }
  // Entrada pontual: dispara uma vez quando o topo do alvo passa de ~88% da altura da tela.
  // sync: 'play' => só reproduz ao entrar. O padrão da biblioteca ('play pause') PAUSA ao sair da tela,
  // o que deixaria elementos parados na metade da animação se o visitante rolasse rápido.
  var onces = [];
  function once(target, extra) {
    var p = { target: target, enter: pos('top', 'bottom-=80'), repeat: false, sync: 'play' };
    for (var k in extra) p[k] = extra[k];
    var o = trig(p);
    onces.push(o);
    return o;
  }
  // Rede de segurança: se um salto de rolagem (tecla End, arrastar a barra, âncora) pulou o elemento sem que
  // o gatilho de entrada disparasse, a animação é executada assim que ele estiver na tela ou acima dela.
  var safetyQueued = false;
  function safetyNet() {
    safetyQueued = false;
    var limit = window.innerHeight - 80;
    onces.forEach(function (o) {
      if (o.reverted || o.hasEntered || !o.target || !o.linked) return;
      if (o.target.getBoundingClientRect().top < limit) { o.hasEntered = true; o.linked.play(); }
    });
  }
  function queueSafety() {
    if (safetyQueued) return;
    safetyQueued = true;
    window.setTimeout(safetyNet, 250);
  }
  window.addEventListener('scroll', queueSafety, { passive: true });
  // Rolagem controla o progresso: do alvo entrar por baixo até o topo dele chegar ao centro.
  function scrubIn(target, smooth) {
    return trig({ target: target, enter: pos('top', 'bottom'), leave: pos('top', 'center'), sync: smooth == null ? 0.5 : smooth });
  }
  // Rolagem controla o progresso durante toda a passagem do alvo pela tela.
  function scrubPass(target, smooth) {
    return trig({ target: target, enter: pos('top', 'bottom'), leave: pos('bottom', 'top'), sync: smooth == null ? 0.5 : smooth });
  }
  // Tira o estado "escondido" que o CSS de fallback aplica a .reveal
  function unhide(els) { set(els, { opacity: 1, y: 0 }); }

  // Divide em palavras (máscara) sem duplicar o texto: o título mantém o texto original no aria-label
  // e os fragmentos ficam ocultos para leitores de tela. Seleção e cópia continuam entregando o texto uma vez.
  function splitWords(el) {
    var original = el.textContent.replace(/\s+/g, ' ').trim();
    var sp = A.splitText(el, { words: { wrap: 'clip' }, accessible: false });
    el.setAttribute('aria-label', original);
    sp.words.forEach(function (w) { if (w.parentElement && w.parentElement !== el) w.parentElement.setAttribute('aria-hidden', 'true'); else w.setAttribute('aria-hidden', 'true'); });
    el.classList.add('split-title');
    return sp;
  }

  try {
    init();
  } catch (err) {
    if (window.console) console.error('[animations]', err);
    // Reverte tudo o que foi aplicado e volta ao comportamento simples
    observers.forEach(function (o) { try { o.revert(); } catch (e) {} });
    restore();
    bail();
    return;
  }

  function init() {
    var hero = $('.hero');

    // ================= HERO: entrada =================
    var heroEls = {
      eyebrow: $('[data-hero="eyebrow"]'),
      title: $('[data-hero="title"]'),
      lead: $('[data-hero="lead"]'),
      actions: $('[data-hero="actions"]'),
      facts: $('[data-hero="facts"]')
    };
    var titleSplit = splitWords(heroEls.title);
    var btns = $$('.btn', heroEls.actions);
    var factItems = $$('li', heroEls.facts);
    var header = $('.site-header__inner');
    // Atenção: nunca deixar transform no próprio header; isso confinaria o menu mobile (position: fixed) à altura dele.
    var headerItems = $$('.brand, .nav__link, .nav__cta, .menu-toggle');
    var heroImg = $('.hero__media img');

    // Contêineres ficam visíveis; os filhos assumem o estado inicial
    set([heroEls.eyebrow, heroEls.title, heroEls.lead, heroEls.actions, heroEls.facts, header, $('.wa-float')], { opacity: 1 });
    set(heroEls.eyebrow, { opacity: 0, x: -24 });
    set(titleSplit.words, { y: '115%' });
    set(heroEls.lead, { opacity: 0, y: 26 });
    set(btns, { opacity: 0, y: 28, scale: 0.94 });
    set(factItems, { opacity: 0, y: 14 });
    set(header, { opacity: 0 });
    set(headerItems, { y: -18 });
    set($('.wa-float'), { opacity: 0, scale: 0.4 });

    root.classList.add('anime-ready');
    root.classList.remove('anime-pending');

    var intro = createTimeline({ defaults: { ease: 'outExpo' } });
    intro
      .add(header, { opacity: [0, 1], duration: 900 }, 0)
      .add(headerItems, { y: [-18, 0], duration: 900, delay: stagger(50) }, 0)
      .add(heroEls.eyebrow, { opacity: [0, 1], x: [-24, 0], duration: 900 }, 150)
      .add(titleSplit.words, { y: ['115%', '0%'], duration: 1200, delay: stagger(90) }, 250)
      .add(heroEls.lead, { opacity: [0, 1], y: [26, 0], duration: 1000 }, 850)
      .add(btns, { opacity: [0, 1], y: [28, 0], scale: [0.94, 1], duration: 900, delay: stagger(110) }, 1050)
      .add(factItems, { opacity: [0, 1], y: [14, 0], duration: 800, delay: stagger(90) }, 1350)
      .add($('.wa-float'), { opacity: [0, 1], scale: [0.4, 1], duration: 900, ease: 'outBack' }, 1900);
    if (heroImg) intro.add(heroImg, { scale: [1.18, 1], duration: 2200, ease: 'outQuart' }, 0);

    // Indicador "role": linha com ponto que desce em loop (decorativo)
    animate(hero, { '--cue-y': ['-22px', '64px'], duration: 1700, ease: 'inOutQuad', loop: true, loopDelay: 400 });

    // ================= HERO: rolagem (camadas em velocidades diferentes) =================
    var heroScroll = createTimeline({
      defaults: { ease: 'linear' },
      autoplay: trig({ target: hero, enter: pos('top', 'top'), leave: pos('bottom', 'top'), sync: 0.4 })
    });
    heroScroll
      .add('.hero__media', { scale: [1, 1.3], y: ['0%', '14%'], duration: 1000 }, 0)
      .add('.hero__content', { y: ['0vh', '-18vh'], duration: 1000 }, 0)
      .add('.hero__content', { opacity: [1, 0], duration: 450 }, 350)
      .add('.hero__facts', { y: ['0vh', '-8vh'], opacity: [1, 0], duration: 500 }, 0)
      .add('.hero__cue', { opacity: [1, 0], duration: 140 }, 0)
      .add('.hero__veil', { opacity: [0, 1], duration: 450 }, 550);

    // ================= Faixa de transição =================
    animate('.marquee__track', {
      x: ['0%', '-34%'], ease: 'linear',
      autoplay: trig({ target: '.marquee', enter: pos('top', 'bottom'), leave: pos('bottom', 'top'), sync: 0.5 })
    });

    // ================= Títulos de seção: máscara de palavras pela rolagem =================
    $$('.section__title').forEach(function (title) {
      var sp = splitWords(title);
      unhide(title);
      set(sp.words, { y: '115%' });
      take(title);
      animate(sp.words, {
        y: ['115%', '0%'], duration: 700, ease: 'outQuad', delay: stagger(110),
        autoplay: scrubIn(title, 0.6)
      });
    });

    // ================= Sobre =================
    var aboutPhoto = $('.about__media .photo');
    if (aboutPhoto) {
      take($('.about__media'));
      unhide($('.about__media'));
      var cl0 = 'inset(16% 12% 16% 12% round 14px)', cl1 = 'inset(0% 0% 0% 0% round 14px)';
      set(aboutPhoto, { clipPath: cl0 });
      animate(aboutPhoto, { clipPath: [cl0, cl1], ease: 'linear', autoplay: scrubIn(aboutPhoto, 0.5) });
      var aImg = $('img', aboutPhoto);
      if (aImg) animate(aImg, { scale: [1.3, 1.08], y: ['-6%', '6%'], ease: 'linear', autoplay: scrubPass(aboutPhoto, 0.5) });
    }

    // Números reais: só a contagem é animada; o valor final é sempre o do HTML
    $$('[data-count]').forEach(function (el) {
      var final = el.textContent;
      var target = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var state = { v: 0 };
      el.textContent = (0).toFixed(dec).replace('.', ',');
      animate(state, {
        v: target, duration: 1800, ease: 'outExpo',
        onUpdate: function () { el.textContent = state.v.toFixed(dec).replace('.', ','); },
        onComplete: function () { el.textContent = final; },
        autoplay: once(el)
      });
    });

    // ================= Estrutura =================
    var clips = [
      ['inset(0% 100% 0% 0% round 14px)', 'inset(0% 0% 0% 0% round 14px)'],
      ['inset(100% 0% 0% 0% round 14px)', 'inset(0% 0% 0% 0% round 14px)'],
      ['inset(0% 0% 100% 0% round 14px)', 'inset(0% 0% 0% 0% round 14px)']
    ];
    var drift = [['-4%', '4%'], ['7%', '-7%'], ['-8%', '8%']];
    $$('.bento__item').forEach(function (fig, i) {
      take(fig); unhide(fig);
      var photo = $('.photo', fig), img = $('img', fig);
      var c = clips[i % clips.length];
      set(photo, { clipPath: c[0] });
      animate(photo, { clipPath: c, ease: 'linear', autoplay: scrubIn(fig, 0.5) });
      if (img) {
        set(img, { scale: 1.3 });
        animate(img, { scale: [1.3, 1.1], y: drift[i % drift.length], ease: 'linear', autoplay: scrubPass(fig, 0.5) });
      }
    });

    var amen = $$('.amenities li');
    if (amen.length) {
      take(amen); unhide(amen);
      set(amen, { opacity: 0, y: 22 });
      var icons = amen.map(function (li) { return $('.icon', li); });
      set(icons, { scale: 0.3, rotate: -30 });
      createTimeline({ autoplay: once('.amenities') })
        .add(amen, { opacity: [0, 1], y: [22, 0], duration: 800, ease: 'outExpo', delay: stagger(80) }, 0)
        .add(icons, { scale: [0.3, 1], rotate: [-30, 0], duration: 800, ease: 'outBack', delay: stagger(80) }, 200);
    }

    // ================= Serviços =================
    var cards = $$('.service');
    if (cards.length) {
      take(cards); unhide(cards);
      var cardIcons = cards.map(function (c) { return $('.service__icon', c); });
      var cardTexts = cards.map(function (c) { return $$('h3, p', c); });
      set(cards, { opacity: 0, y: 56, scale: 0.94 });
      set(cardIcons, { opacity: 0, scale: 0.3, rotate: -28 });
      cardTexts.forEach(function (t) { set(t, { opacity: 0, y: 14 }); });
      var svc = createTimeline({ autoplay: once('.services', { enter: pos('top', 'bottom-=120') }), defaults: { ease: 'outExpo' } });
      cards.forEach(function (card, i) {
        var t = i * 130;
        svc.add(card, { opacity: [0, 1], y: [56, 0], scale: [0.94, 1], duration: 1000 }, t)
           .add(cardIcons[i], { opacity: [0, 1], scale: [0.3, 1], rotate: [-28, 0], duration: 900, ease: 'outBack' }, t + 250)
           .add(cardTexts[i], { opacity: [0, 1], y: [14, 0], duration: 700, delay: stagger(90) }, t + 380);
      });
      svc.then(function () { cards.forEach(function (c) { c.dataset.ready = '1'; }); });
    }

    // ================= Galeria =================
    var gItems = $$('.gallery__item');
    gItems.forEach(function (item, i) {
      take(item); unhide(item);
      var cStart = ['inset(100% 0% 0% 0% round 14px)', 'inset(0% 100% 0% 0% round 14px)', 'inset(0% 0% 100% 0% round 14px)', 'inset(0% 0% 0% 100% round 14px)'][i % 4];
      var cEnd = 'inset(0% 0% 0% 0% round 14px)';
      var img = $('img', item);
      set(item, { clipPath: cStart });
      var delay = (i % 3) * 110;
      animate(item, {
        clipPath: [cStart, cEnd], duration: 1200, delay: delay, ease: 'outExpo', autoplay: once(item),
        // O recorte é removido no fim para o contorno de foco (teclado) não ser cortado
        onComplete: function () { item.style.clipPath = 'none'; }
      });
      if (img) {
        set(img, { scale: 1.5 });
        animate(img, {
          scale: [1.5, 1.14], duration: 1800, delay: delay, ease: 'outExpo', autoplay: once(item),
          onComplete: function () { item.dataset.ready = '1'; }
        });
        animate(img, { y: i % 2 ? ['6%', '-6%'] : ['-6%', '6%'], ease: 'linear', autoplay: scrubPass(item, 0.5) });
      }
    });

    // ================= Planos / CTA =================
    var steps = $$('.plans__steps li');
    var plansCta = $('.plans__actions .btn');
    if (steps.length) {
      take(steps); unhide(steps); take($('.plans__steps')); unhide($('.plans__steps'));
      var nums = steps.map(function (li) { return $('span', li); });
      set(steps, { opacity: 0, x: 40 });
      set(nums, { scale: 0 });
      set($('.plans__steps'), { '--line-p': 0 });
      var plans = createTimeline({ autoplay: once('.plans__steps'), defaults: { ease: 'outExpo' } });
      plans
        .add('.plans__steps', { '--line-p': [0, 1], duration: 1400, ease: 'inOutQuad' }, 0)
        .add(steps, { opacity: [0, 1], x: [40, 0], duration: 900, delay: stagger(220) }, 100)
        .add(nums, { scale: [0, 1], duration: 700, ease: 'outBack', delay: stagger(220) }, 250);
      if (plansCta) {
        plans.add(plansCta, {
          boxShadow: ['0 0 0 0 rgba(217,255,63,.55)', '0 0 0 22px rgba(217,255,63,0)'],
          duration: 1400, ease: 'outQuad', loop: 2, loopDelay: 300
        }, 1500);
      }
    }

    // ================= Localização e rodapé =================
    var locInfo = $$('.contact p, .location__actions .btn');
    var hourRows = $$('.hours tr');
    take(locInfo); take(hourRows);
    $$('.location .reveal').forEach(function (el) { if (!handled.has(el) && el.classList.contains('location__map')) { take(el); unhide(el); } });
    set(locInfo, { opacity: 0, y: 18 });
    set(hourRows, { opacity: 0, x: -16 });
    // contato e horários ficam dentro de elementos .reveal; liberamos a visibilidade dos pais
    $$('.contact, .hours, .location__actions').forEach(function (el) { take(el); unhide(el); });
    createTimeline({ autoplay: once('.contact'), defaults: { ease: 'outExpo' } })
      .add($$('.contact p'), { opacity: [0, 1], y: [18, 0], duration: 800, delay: stagger(110) }, 0)
      .add(hourRows, { opacity: [0, 1], x: [-16, 0], duration: 700, delay: stagger(60) }, 250)
      .add($$('.location__actions .btn'), { opacity: [0, 1], y: [18, 0], duration: 800, delay: stagger(110) }, 700);

    var map = $('.location__map');
    if (map) {
      var m0 = 'inset(0% 0% 0% 100% round 14px)', m1 = 'inset(0% 0% 0% 0% round 14px)';
      set(map, { clipPath: m0 });
      animate(map, { clipPath: [m0, m1], duration: 1400, ease: 'outExpo', autoplay: once(map) });
      var frame = $('iframe', map);
      if (frame) animate(frame, { scale: [1.25, 1], duration: 1800, ease: 'outExpo', autoplay: once(map) });
    }

    var footerParts = $$('.footer__grid > *').concat($$('.footer__bottom'));
    set(footerParts, { opacity: 0, y: 24 });
    animate(footerParts, { opacity: [0, 1], y: [24, 0], duration: 900, ease: 'outExpo', delay: stagger(120), autoplay: once('.site-footer', { enter: pos('top', 'bottom') }) });

    // Itens dos diferenciais têm coreografia própria (mais abaixo): fora da rotina genérica
    take($$('.feature'));

    // ================= Genérico: demais elementos .reveal =================
    $$('.reveal').forEach(function (el) {
      if (handled.has(el)) return;
      var siblings = el.parentElement ? $$('.reveal', el.parentElement).filter(function (s) { return !handled.has(s); }) : [el];
      var idx = Math.max(0, siblings.indexOf(el));
      set(el, { opacity: 0, y: 28 });
      animate(el, { opacity: [0, 1], y: [28, 0], duration: 1000, delay: Math.min(idx, 5) * 80, ease: 'outExpo', autoplay: once(el) });
    });

    // ================= Diferenciais: palco fixo no desktop / entrada simples no resto =================
    var storySection = $('#diferenciais');
    var features = $$('.feature');
    var featureList = $('.features');
    // Em qualquer largura os itens são revelados; no desktop alto, a rolagem conduz a narrativa.
    take(features); unhide(features);
    var scope = A.createScope({ mediaQueries: { story: '(min-width: 1024px) and (min-height: 720px)' } });
    scope.add(function (self) {
      var deco = $('.deco-bolt');
      if (self.matches.story) {
        storySection.classList.add('story-on');
        buildStory();
        return function () { storySection.classList.remove('story-on'); };
      }
      buildSimple();
      return function () {};

      function buildSimple() {
        set(features, { opacity: 0, y: 36, '--line-p': 0 });
        createTimeline({ autoplay: once(featureList), defaults: { ease: 'outExpo' } })
          .add(features, { opacity: [0, 1], y: [36, 0], duration: 900, delay: stagger(130) }, 0)
          .add(features, { '--line-p': [0, 1], duration: 1100, ease: 'inOutQuad', delay: stagger(130) }, 0);
        if (deco) animate(deco, { y: ['-8%', '8%'], rotate: [-8, 8], ease: 'linear', autoplay: scrubPass(storySection, 0.5) });
      }

      function buildStory() {
        var track = $('.story__track');
        var nums = $$('.story__numerals span');
        var total = 3800;
        set(features, { opacity: 0.25, y: 0, x: 0, '--line-p': 1 });
        set(features[0], { opacity: 1, x: 14 });
        set(nums, { opacity: 0, y: 90 });
        set(nums[0], { opacity: 1, y: 0 });
        set(featureList, { '--p': 0 });
        var tl = createTimeline({
          defaults: { ease: 'inOutQuad' },
          autoplay: trig({ target: track, enter: pos('top', 'top'), leave: pos('bottom', 'bottom'), sync: 0.35 })
        });
        tl.add(featureList, { '--p': [0, 1], ease: 'linear', duration: total }, 0);
        if (deco) tl.add(deco, { rotate: [-12, 22], scale: [0.9, 1.2], ease: 'linear', duration: total }, 0);
        for (var i = 1; i < 4; i++) {
          var t = 600 + (i - 1) * 1000;
          tl.add(nums[i - 1], { opacity: [1, 0], y: [0, -90], duration: 400 }, t)
            .add(nums[i], { opacity: [0, 1], y: [90, 0], duration: 400 }, t)
            .add(features[i - 1], { opacity: [1, 0.25], x: [14, 0], duration: 400 }, t)
            .add(features[i], { opacity: [0.25, 1], x: [0, 14], duration: 400 }, t);
        }
      }
    });

    // ================= Microinterações =================
    microinteractions();

    // Recalcula posições depois que fontes terminam de carregar (o Anime.js já observa mudanças de tamanho).
    function refreshAll() {
      observers = observers.filter(function (o) { return !o.reverted; });
      observers.forEach(function (o) { if (o.target) o.refresh(); });
    }
    window.addEventListener('load', refreshAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshAll);
  }

  function microinteractions() {
    // Botões: escala, seta, "ímã" leve e resposta ao clique (apenas com mouse/ponteiro fino)
    $$('.btn').forEach(function (btn) {
      var arrow = $('.icon', btn);
      var mag = null;
      function ensure() {
        if (!mag) mag = A.createAnimatable(btn, { x: 350, y: 350, scale: 250, ease: 'outQuad' });
        return mag;
      }
      btn.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        ensure().scale(1.04);
        if (arrow && btn.classList.contains('btn--accent') && arrow.querySelector('use') && /i-arrow/.test(arrow.querySelector('use').getAttribute('href'))) {
          animate(arrow, { x: 6, duration: 400, ease: 'outExpo' });
        }
      });
      btn.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || !mag) return;
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        mag.x(dx * 12).y(dy * 10);
      });
      btn.addEventListener('pointerleave', function () {
        if (mag) mag.x(0).y(0).scale(1);
        if (arrow) animate(arrow, { x: 0, duration: 500, ease: 'outExpo' });
      });
      btn.addEventListener('pointerdown', function () { ensure().scale(0.96); });
      btn.addEventListener('pointerup', function (e) { if (mag) mag.scale(e.pointerType === 'mouse' ? 1.04 : 1); });
      btn.addEventListener('pointercancel', function () { if (mag) mag.scale(1); });
    });

    // Cards de serviço
    $$('.service').forEach(function (card) {
      var icon = $('.service__icon', card);
      card.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || card.dataset.ready !== '1') return;
        animate(card, { y: -8, duration: 500, ease: 'outExpo' });
        if (icon) animate(icon, { rotate: [0, -10, 6, 0], scale: [1, 1.12, 1], duration: 700, ease: 'outQuad' });
      });
      card.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse' || card.dataset.ready !== '1') return;
        animate(card, { y: 0, duration: 600, ease: 'outExpo' });
      });
    });

    // Galeria: zoom sutil no hover
    $$('.gallery__item').forEach(function (item) {
      var img = $('img', item);
      if (!img) return;
      item.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || item.dataset.ready !== '1' || item.classList.contains('is-missing')) return;
        animate(img, { scale: 1.24, duration: 900, ease: 'outExpo' });
      });
      item.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse' || item.dataset.ready !== '1') return;
        animate(img, { scale: 1.14, duration: 900, ease: 'outExpo' });
      });
    });

    // Botão flutuante do WhatsApp
    var wa = $('.wa-float');
    if (wa) {
      wa.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') animate(wa, { scale: 1.12, duration: 500, ease: 'outBack' }); });
      wa.addEventListener('pointerleave', function () { animate(wa, { scale: 1, duration: 500, ease: 'outExpo' }); });
    }
  }
})();
