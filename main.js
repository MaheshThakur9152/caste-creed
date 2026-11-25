const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const hasGsap = window.gsap && window.ScrollTrigger && window.SplitText;
if (!hasGsap) document.documentElement.classList.remove('js'); // CDN blocked: show static page

/* ---------- Ring frame sequence (canvas) ---------- */
const canvas = $('[data-ring]');
const ctx = canvas.getContext('2d');
const N = +canvas.dataset.frames;
const degEl = $('[data-deg]');
const ring = { scroll: 0 };
const current = () => ((Math.round(ring.scroll) % N) + N) % N;
const frames = Array.from({ length: N }, (_, i) => {
  const im = new Image();
  im.decoding = 'async';
  im.src = `assets/ring/f${String(i).padStart(3, '0')}.jpg`;
  im.onload = () => i === current() && draw();
  return im;
});
function draw() {
  const i = current();
  const im = frames[i];
  if (!im.naturalWidth) return;
  const { width: w, height: h } = canvas;
  const s = Math.min(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.fillStyle = '#f4f4f4';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
  degEl.textContent = String(Math.round((i / N) * 360)).padStart(3, '0') + '°';
}
function sizeCanvas() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (w === canvas.width && h === canvas.height) return; // mobile URL-bar resizes: skip needless clears
  canvas.width = w;
  canvas.height = h;
  draw();
}
addEventListener('resize', sizeCanvas);
sizeCanvas();

/* ---------- Mobile menu ---------- */
const nav = $('[data-nav]');
const menuBtn = $('[data-menu-btn]');
const menu = $('[data-menu]');
const setMenu = (open) => { menuBtn.setAttribute('aria-expanded', open); menu.hidden = !open; };
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => e.target.closest('a') && setMenu(false));

/* ---------- Collection arrows (native scroll mode) ---------- */
/* ---------- Process steps ---------- */
const steps = $('[data-steps]');
const items = [...steps.children];
let active = -1;
function activate(i, animate = true) {
  if (i === active) return;
  active = i;
  items.forEach((li, j) => {
    li.classList.toggle('is-active', i === j);
    li.querySelector('button').setAttribute('aria-expanded', i === j);
  });
  steps.className = `steps a${i + 1}`;
  if (animate && hasGsap) gsap.fromTo($('.step__card p', items[i]), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, delay: .15, ease: 'power3.out' });
}
let autoplay;
const stopAuto = () => clearInterval(autoplay);
items.forEach((li, i) => {
  li.querySelector('button').addEventListener('click', () => { stopAuto(); activate(i); });
  li.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) { stopAuto(); activate(i); } });
});
activate(1, false);

/* ---------- FAQ accordion with animated height ---------- */
const faqs = $$('.faq details');
faqs.forEach((d) => d.removeAttribute('name')); // JS manages exclusivity so closing can animate
function toggleFaq(d, open) {
  const body = $('p', d);
  if (!hasGsap) { d.open = open; return; }
  if (open) {
    d.open = true;
    gsap.fromTo(body, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: .5, ease: 'power3.out', clearProps: 'height' });
  } else {
    gsap.to(body, { height: 0, autoAlpha: 0, duration: .35, ease: 'power2.inOut', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
  }
}
faqs.forEach((d) => $('summary', d).addEventListener('click', (e) => {
  e.preventDefault();
  const opening = !d.open;
  faqs.forEach((o) => o !== d && o.open && toggleFaq(o, false));
  toggleFaq(d, opening);
}));

/* ---------- Motion ---------- */
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true }); // URL bar show/hide must not re-measure pins mid-scroll
  const mm = gsap.matchMedia();

  // Smooth scroll, driven by the GSAP ticker so ScrollTrigger stays in sync
  let lenis;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    if (!window.Lenis) return;
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (t) => lenis.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(raf); lenis.destroy(); lenis = null; };
  });
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : id.length > 1 && $(id);
    if (el === false || el === null) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(el, { offset: -56, duration: 1.4 }) : scrollTo({ top: el ? el.offsetTop - 56 : 0 });
  }));

  // Nav: border once scrolled, hides on scroll down, returns on scroll up
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (s) => {
      nav.classList.toggle('is-scrolled', s.scroll() > 8);
      nav.classList.toggle('is-hidden', s.direction === 1 && s.scroll() > 320 && menu.hidden);
    },
  });

  document.fonts.ready.then(() => {
    const split = (el, type = 'lines') => SplitText.create(el, { type: type === 'words' ? 'lines,words' : 'lines', mask: 'lines', linesClass: 'split-line' });

    mm.add({ any: 'all', motion: '(prefers-reduced-motion: no-preference)', phone: '(max-width: 700px)' }, (c) => {
      const { motion, phone } = c.conditions;
      gsap.set('[data-intro]', { visibility: 'visible' });
      if (!motion) return;

      /* Intro */
      const h1 = split('.hero h1', 'words');
      const hp = split('.hero__copy p');
      gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.3 } })
        .from(nav, { yPercent: -100, duration: 1, clearProps: 'transform' }, 0)
        .from('.hero__stage', { autoAlpha: 0, scale: 1.08, duration: 1.8 }, 0)
        .from('.hero .tag', { autoAlpha: 0, y: 12, duration: .8 }, .3)
        .from(h1.words, { yPercent: 110, stagger: .06 }, .35)
        .from(hp.lines, { yPercent: 110, stagger: .08 }, .55)
        .from('.hero__buy > *', { autoAlpha: 0, y: 16, stagger: .08 }, .7)
        .from('.hero__sub a, .hero__hint', { autoAlpha: 0, y: 10, stagger: .06 }, .9);

      /* Hero: pinned, scroll turns the ring a slow half revolution (a full 360° read as dizzy) */
      gsap.timeline({
        scrollTrigger: { trigger: '.hero', start: 'top top', end: phone ? '+=90%' : '+=160%', pin: true, scrub: 1.2, anticipatePin: 1 },
      })
        .to(ring, { scroll: N / 2, ease: 'power1.inOut', onUpdate: draw, duration: 1 }, 0)
        .to('.hero__copy', { yPercent: -18, autoAlpha: 0, ease: 'power2.in', duration: .35 }, .6)
        .to('.hero__sub', { autoAlpha: 0, duration: .2 }, .6)
        .to('.hero__stage', { scale: .9, ease: 'power1.in', duration: .4 }, .6);

      /* Statement: words light up as you read */
      const lead = split('.statement__lead', 'words');
      gsap.fromTo(lead.words, { opacity: .12 }, {
        opacity: 1, stagger: .05, ease: 'none',
        scrollTrigger: { trigger: '.statement__lead', start: 'top 82%', end: 'bottom 45%', scrub: true },
      });
      gsap.fromTo('.statement__img', { clipPath: 'inset(16% 12% 16% 12%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: '.statement__img', start: 'top 92%', end: 'center 55%', scrub: true },
      });
      gsap.fromTo('.statement__img img', { scale: 1.3, yPercent: -6 }, {
        scale: 1, yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: '.statement__img', start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.from('.statement__note', { autoAlpha: 0, y: 20, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.statement__note', start: 'top 90%' } });
      gsap.from('.statement__note svg', { rotate: -180, scale: .4, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.statement__note', start: 'top 90%' } });

      /* Collection */
      const ch = split('.collection h2');
      gsap.from(ch.lines, { yPercent: 110, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.collection', start: 'top 75%' } });
      gsap.from('.collection__all', { autoAlpha: 0, y: 12, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.collection', start: 'top 75%' } });
      ScrollTrigger.batch('.card', {
        start: 'top 90%', once: true,
        onEnter: (els) => gsap.from(els, { yPercent: 14, autoAlpha: 0, stagger: .1, duration: 1.1, ease: 'expo.out' }),
      });
    });

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      /* Ticker: constant drift; scroll velocity speeds it up and flips direction */
      const loop = gsap.to('[data-ticker]', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        trigger: '.ticker', start: 'top bottom', end: 'bottom top',
        onUpdate: (s) => {
          const boost = gsap.utils.clamp(1, 6, Math.abs(s.getVelocity()) / 300);
          gsap.timeline({ overwrite: true })
            .to(loop, { timeScale: boost * s.direction, duration: .2 })
            .to(loop, { timeScale: s.direction, duration: 1.2 }, '+=.2');
        },
      });

      /* Features */
      const ft = split('.features__title');
      gsap.from(ft.lines, { yPercent: 110, stagger: .1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.features', start: 'top 70%' } });
      gsap.from('.features__cols p', { y: 30, autoAlpha: 0, stagger: .12, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.features__cols', start: 'top 85%' } });

      $$('.anatomy svg ellipse, .anatomy svg rect, .anatomy svg path').forEach((el) => {
        const L = el.getTotalLength();
        gsap.set(el, { strokeDasharray: L, strokeDashoffset: L });
      });
      gsap.timeline({ scrollTrigger: { trigger: '.anatomy', start: 'top 80%', end: 'bottom 55%', scrub: 1 } })
        .to('.anatomy svg > g:first-of-type > *', { strokeDashoffset: 0, stagger: .08, ease: 'none' }, 0)
        .to('.anatomy__gold path', { strokeDashoffset: 0, ease: 'none' }, .2)
        .to('.anatomy__lines path', { strokeDashoffset: 0, stagger: .06, ease: 'none' }, .3)
        .from('.anatomy__text text', { autoAlpha: 0, x: -6, stagger: .06 }, .5)
        .set('.anatomy svg rect[stroke-dasharray]', { strokeDasharray: '3 4', strokeDashoffset: 0 }); // restore dashed inner face

      gsap.fromTo('.features__img', { clipPath: 'inset(100% 0% 0% 0%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut',
        scrollTrigger: { trigger: '.features__img', start: 'top 80%' },
      });
      gsap.fromTo('.features__img img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.features__img', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from('.specs li', { y: 24, autoAlpha: 0, stagger: .08, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.specs', start: 'top 92%' } });
      gsap.from('.specs svg', { rotate: -90, scale: .3, stagger: .08, duration: 1.2, ease: 'back.out(2)', scrollTrigger: { trigger: '.specs', start: 'top 92%' } });

      /* Process */
      const ph = split('.process__head h2', 'words');
      gsap.timeline({ scrollTrigger: { trigger: '.process', start: 'top 70%' } })
        .from(ph.words, { yPercent: 110, stagger: .06, duration: 1.1, ease: 'expo.out' })
        .from('.process__head p', { autoAlpha: 0, y: 12, duration: .8 }, .2)
        .from(items, { clipPath: 'inset(100% 0% 0% 0%)', y: 40, stagger: .1, duration: 1.2, ease: 'expo.out' }, .2);
      const startAuto = () => { stopAuto(); autoplay = setInterval(() => activate((active + 1) % items.length), 3200); };
      ScrollTrigger.create({ trigger: '.steps', start: 'top 60%', end: 'bottom 20%', onEnter: startAuto, onEnterBack: startAuto, onLeave: stopAuto, onLeaveBack: stopAuto });

      /* FAQ */
      gsap.fromTo('.faq__bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.faq', start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.timeline({ scrollTrigger: { trigger: '.faq', start: 'top 65%' } })
        .from('.faq__card', { y: 80, autoAlpha: 0, duration: 1.2, ease: 'expo.out' })
        .from('.faq__card h2, .faq__intro, .faq__card details', { y: 20, autoAlpha: 0, stagger: .05, duration: .8, ease: 'power3.out' }, .2)
        .from('.faq__contact > *', { y: 20, autoAlpha: 0, stagger: .1, duration: .8, ease: 'power3.out' }, .3);

      /* Footer: columns rise, giant wordmark lifts into view */
      gsap.from('.footer__cols > div, .footer__news', { y: 30, autoAlpha: 0, stagger: .06, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.footer', start: 'top 95%', once: true } });
      // ends at 'max' so the wordmark always finishes rising at the very bottom of the page
      gsap.fromTo('.footer__giant svg', { yPercent: 60, autoAlpha: .2 }, {
        yPercent: 0, autoAlpha: 1, ease: 'power1.out',
        scrollTrigger: { trigger: '.footer__giant', start: 'top bottom', end: 'max', scrub: true },
      });

      /* Magnetic buttons */
      if (!matchMedia('(hover: hover)').matches) return;
      $$('.btn, .footer__news button').forEach((b) => {
        const xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3.out' });
        const yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
        b.addEventListener('mousemove', (e) => {
          const r = b.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * .3);
          yTo((e.clientY - r.top - r.height / 2) * .35);
        });
        b.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });
    });

    ScrollTrigger.refresh();
  });
  addEventListener('load', () => ScrollTrigger.refresh());
}
