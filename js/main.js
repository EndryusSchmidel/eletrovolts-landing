(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('mobile-menu');
  var waFloat = document.querySelector('.wa-float');

  // Header border on scroll
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Floating WhatsApp: visible from the first section + an occasional "electric shock"
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
      setTimeout(zap, 5000);
    };
    setTimeout(zap, 2500);
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
