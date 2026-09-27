(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('mobile-menu');
  var waFloat = document.querySelector('.wa-float');

  // Floating WhatsApp over dark areas: switch to the copper version so it stays visible
  var darkAreas = document.querySelectorAll('.values, .closing, .footer, .card--accent');
  function waTone() {
    var r = waFloat.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var onDark = Array.prototype.some.call(darkAreas, function (el) {
      var b = el.getBoundingClientRect();
      return b.top <= y && b.bottom >= y && b.left <= x && b.right >= x;
    });
    waFloat.classList.toggle('on-dark', onDark);
  }

  // Header border on scroll
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
    waTone();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', waTone);
  onScroll();

  // Floating WhatsApp: visible from the first section + a few "electric shocks", then it rests
  setTimeout(function () { waFloat.classList.add('is-visible'); }, 300);

  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  if (!reduceMotion.matches) {
    waFloat.addEventListener('animationend', function (e) {
      if (e.animationName === 'wa-zap') waFloat.classList.remove('is-zap');
    });
    var zap = function () {
      if (!document.hidden && !reduceMotion.matches && !waFloat.matches(':hover')) {
        waFloat.classList.remove('is-zap');
        void waFloat.offsetWidth; // restart the animation
        waFloat.classList.add('is-zap');
      }
    };
    [2500, 12000, 30000].forEach(function (ms) { setTimeout(zap, ms); });
  }

  // Mobile menu
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', function (e) {
    if (menu.classList.contains('is-open') && !header.contains(e.target)) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setMenu(false); toggle.focus(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) setMenu(false);
  });

  // Reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Stagger siblings that enter together
        var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) {
          return c.classList.contains('reveal');
        });
        el.style.transitionDelay = Math.min(siblings.indexOf(el), 6) * 80 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  }

  // Brand bar: duplicate the list so the infinite carousel loops seamlessly
  var brandTrack = document.querySelector('.brands__track');
  if (brandTrack) {
    var brandClone = brandTrack.firstElementChild.cloneNode(true);
    brandClone.setAttribute('aria-hidden', 'true');
    brandClone.querySelectorAll('img').forEach(function (img) { img.alt = ''; });
    brandTrack.appendChild(brandClone);
    brandTrack.parentElement.classList.add('is-looping');
  }

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
