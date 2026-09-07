/**
 * LYBERTAS – script.js
 * Interaktivität: Navigation, Animationen, Wahl-Countdown, Ratsverteilung
 * Kein Framework, kein Build-Prozess – reines Vanilla JS
 */

/* ============================================================
   0. ZENTRALE DATEN
============================================================ */

/**
 * Anstehende Wahlen – Single Source of Truth.
 * Neue Wahlen einfach ergänzen; die nächstliegende zukünftige wird
 * automatisch für den Countdown gewählt. Niemals Tageszahl hardcoden.
 */
const upcomingElections = [
  { id: 'seniorenvertretung-koeln-2026', name: 'Wahl der Seniorenvertretung Köln', date: '2026-11-23' }
];

/**
 * Sitzverteilung im Rat der Stadt Köln (Kompaktansicht).
 * Wiederverwendbar gedacht (später weitere Städte). Farben 1:1 zu den
 * --council-* CSS-Tokens. Prozentwerte werden aus seats/totalSeats berechnet.
 * Quelle: Stadt Köln, Sitzplan Rat, Stand April 2026.
 */
const councilSeatDistributionCologne = {
  cityId: 'koeln',
  title: 'Rat Köln',
  totalSeats: 90,
  segments: [
    { id: 'gruene', label: 'GRÜNE',     seats: 22, status: 'Fraktion', color: '#64A12D', email: 'gruene-fraktion@stadt-koeln.de' },
    { id: 'cdu',    label: 'CDU',       seats: 18, status: 'Fraktion', color: '#111827', email: 'cdu-fraktion@stadt-koeln.de' },
    { id: 'spd',    label: 'SPD',       seats: 18, status: 'Fraktion', color: '#E3000F', email: 'spd-fraktion@stadt-koeln.de' },
    { id: 'linke',  label: 'DIE LINKE', seats: 10, status: 'Fraktion', color: '#BE3075', email: 'dielinke@stadt-koeln.de' },
    { id: 'afd',    label: 'AfD',       seats: 8,  status: 'Fraktion', color: '#009EE0', email: 'afd-fraktion@stadt-koeln.de' },
    { id: 'volt',   label: 'Volt',      seats: 5,  status: 'Fraktion', color: '#502379', email: 'volt@stadt-koeln.de' },
    {
      id: 'weitere', label: 'Weitere', seats: 9, status: 'Zusammenfassung kleinerer Akteure',
      color: '#9CA3AF', isGroup: true,
      members: [
        { id: 'fdp',    label: 'FDP',                 seats: 3, status: 'Teil der Fraktion FDP/KSG', email: 'fdp-fraktion@stadt-koeln.de' },
        { id: 'ksg',    label: 'KSG',                 seats: 1, status: 'Teil der Fraktion FDP/KSG', email: 'fdp-fraktion@stadt-koeln.de' },
        { id: 'bsw',    label: 'BSW',                 seats: 2, status: 'Ratsgruppe',                email: 'bsw-ratsgruppe@stadt-koeln.de' },
        { id: 'partei', label: 'Die PARTEI',          seats: 2, status: 'Ratsgruppe',                email: 'diepartei@stadt-koeln.de' },
        { id: 'gkf',    label: 'GUT & KLIMA FREUNDE', seats: 1, status: 'Einzelmandat',              email: 'vorstand@gut-klimafreunde.koeln' }
      ]
    }
  ]
};


/* ============================================================
   1. DOMContentLoaded – Initialisierung
============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  initNav();
  initSmoothScroll();
  initScrollAnimations();
  initScrollHeader();
  initHeroVideo();
  initElectionCountdown();
  initCouncilChart();
  setFooterYear();
});


/* ============================================================
   2. NAVIGATION – Mobile Toggle
============================================================ */
function initNav() {
  const toggle = document.getElementById('navToggle');
  const menu   = document.getElementById('navMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', function () {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.setAttribute('aria-label', isOpen ? 'Menü schließen' : 'Menü öffnen');
  });

  // Menü schließen wenn ein Link geklickt wird
  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Menü schließen bei Klick außerhalb
  document.addEventListener('click', function (e) {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}


/* ============================================================
   3. SMOOTH SCROLL – für ältere Browser (Fallback)
   (Moderne Browser nutzen CSS scroll-behavior: smooth)
============================================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerHeight = parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '72',
          10
        );
        const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });
}


/* ============================================================
   4. HEADER – Scrolled Class
============================================================ */
function initScrollHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  function onScroll() {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}


/* ============================================================
   4b. WAHL-COUNTDOWN
   Berechnet Tage bis zur nächsten Wahl live (nie hardcodiert).
   Das Datum steht bereits als echter Text/<time> im HTML (SEO);
   JS ersetzt nur die live Tageszahl.
============================================================ */
function initElectionCountdown() {
  const daysEl  = document.getElementById('electionCountdownDays');
  const badgeEl = document.getElementById('electionCountdownBadgeDays');
  const nameEl  = document.getElementById('electionCountdownName');
  const dateEl  = document.getElementById('electionCountdownDate');
  const card    = document.getElementById('wahlCountdown');
  if (!daysEl || !card) return;

  // Heute auf Mitternacht normalisieren (vermeidet Off-by-one durch Uhrzeit)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Nächstliegende zukünftige Wahl finden
  const next = upcomingElections
    .map(function (e) { return { data: e, date: new Date(e.date + 'T00:00:00') }; })
    .filter(function (e) { return e.date >= today; })
    .sort(function (a, b) { return a.date - b.date; })[0];

  if (!next) {
    // Kein zukünftiger Termin – Badge ausblenden, keine „NaN Tage"
    const badge = card.querySelector('.election-countdown__badge');
    if (badge) badge.hidden = true;
    return;
  }

  const days = Math.ceil((next.date - today) / 86400000);

  daysEl.textContent = days;
  if (badgeEl) badgeEl.textContent = days;
  if (nameEl)  nameEl.textContent = next.data.name;
  if (dateEl) {
    dateEl.setAttribute('datetime', next.data.date);
    dateEl.textContent = formatGermanDate(next.date);
  }
}

/**
 * Formatiert ein Date als deutsches Datum, z. B. „23. November 2026".
 */
function formatGermanDate(date) {
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return date.getDate() + '. ' + months[date.getMonth()] + ' ' + date.getFullYear();
}


/* ============================================================
   4c. SITZVERTEILUNG RAT KÖLN – interaktiver Donut
   SVG-Ring ist dekorativ (aria-hidden); Interaktion + A11y laufen
   über die statische, crawlbare Legende aus echten <button>.
============================================================ */
function initCouncilChart() {
  const svg    = document.querySelector('.council-chart__svg');
  const legend = document.querySelector('.council-chart__legend');
  const detail = document.getElementById('councilDetail');
  if (!svg || !legend || !detail) return;

  const data    = councilSeatDistributionCologne;
  const total   = data.totalSeats;
  const R        = 40;
  const CIRC     = 2 * Math.PI * R;    // ≈ 251.33
  const GAP      = 1.2;                // kleine Lücke zwischen Segmenten
  const SVGNS    = 'http://www.w3.org/2000/svg';
  const defaultDetailHTML = detail.innerHTML;

  // --- Ring aufbauen: ein <circle> pro Segment ---
  let offset = 0;
  data.segments.forEach(function (seg) {
    const len = (seg.seats / total) * CIRC;
    const circle = document.createElementNS(SVGNS, 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', String(R));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', seg.color);
    circle.setAttribute('stroke-width', '14');
    circle.setAttribute('stroke-dasharray', Math.max(len - GAP, 0.001) + ' ' + (CIRC - Math.max(len - GAP, 0.001)));
    circle.setAttribute('stroke-dashoffset', String(-offset));
    circle.setAttribute('transform', 'rotate(-90 50 50)');
    circle.setAttribute('data-segment-id', seg.id);
    circle.classList.add('council-chart__seg');
    svg.appendChild(circle);
    offset += len;
  });

  // --- Interaktion über die Legenden-Buttons ---
  const buttons = Array.prototype.slice.call(legend.querySelectorAll('.council-legend__item'));
  let activeId = null;

  function clearActive() {
    buttons.forEach(function (b) { b.classList.remove('is-active'); b.setAttribute('aria-expanded', 'false'); });
    svg.querySelectorAll('.council-chart__seg').forEach(function (c) { c.classList.remove('is-active'); });
  }

  function showDefault() {
    activeId = null;
    clearActive();
    detail.innerHTML = defaultDetailHTML;
  }

  function pct(seats) {
    return (seats / total * 100).toFixed(1).replace('.', ',');
  }

  function renderSingle(seg) {
    detail.innerHTML =
      '<div class="council-detail__head">' +
        '<span class="council-detail__swatch" style="background:' + seg.color + '"></span>' +
        '<h4 class="council-detail__name">' + seg.label + '</h4>' +
      '</div>' +
      '<dl class="council-detail__stats">' +
        '<div><dt>Sitze</dt><dd>' + seg.seats + ' von ' + total + '</dd></div>' +
        '<div><dt>Anteil</dt><dd>' + pct(seg.seats) + ' %</dd></div>' +
        '<div><dt>Status</dt><dd>' + seg.status + '</dd></div>' +
      '</dl>' +
      '<a class="council-detail__mail" href="mailto:' + seg.email + '">' + seg.email + '</a>';
  }

  function renderGroup(seg) {
    let rows = seg.members.map(function (m) {
      return '<li class="council-detail__member">' +
        '<span class="council-detail__member-name">' + m.label + '</span>' +
        '<span class="council-detail__member-seats">' + m.seats + ' Sitz' + (m.seats === 1 ? '' : 'e') + ' · ' + pct(m.seats) + ' %</span>' +
        '<span class="council-detail__member-status">' + m.status + '</span>' +
        '<a class="council-detail__member-mail" href="mailto:' + m.email + '">' + m.email + '</a>' +
      '</li>';
    }).join('');
    detail.innerHTML =
      '<div class="council-detail__head">' +
        '<span class="council-detail__swatch" style="background:' + seg.color + '"></span>' +
        '<h4 class="council-detail__name">Weitere Akteure · ' + seg.seats + ' Sitze</h4>' +
      '</div>' +
      '<ul class="council-detail__members" role="list">' + rows + '</ul>';
  }

  function selectSegment(id, button) {
    if (activeId === id) { showDefault(); return; }
    activeId = id;
    clearActive();
    button.classList.add('is-active');
    button.setAttribute('aria-expanded', 'true');
    const seg = svg.querySelector('.council-chart__seg[data-segment-id="' + id + '"]');
    if (seg) seg.classList.add('is-active');

    const segment = data.segments.filter(function (s) { return s.id === id; })[0];
    if (!segment) return;
    if (segment.isGroup) renderGroup(segment); else renderSingle(segment);
  }

  buttons.forEach(function (button) {
    const id = button.getAttribute('data-segment-id');
    button.addEventListener('click', function () { selectSegment(id, button); });
  });
}


/* ============================================================
   5. SCROLL ANIMATIONS – Intersection Observer
   Elemente werden beim Scrollen eingeblendet
============================================================ */
function initScrollAnimations() {
  // Elemente, die animiert werden sollen
  const targets = document.querySelectorAll(
    '.hero__subheadline, .hero__actions, .hero__trust, ' +
    '.pillar, .feature-row, .func-card, .transparency-card, .perso-card, .contact-inner, .vision-outcome'
  );

  if (!('IntersectionObserver' in window)) {
    // Fallback: alle direkt sichtbar machen
    targets.forEach(function (el) {
      el.style.opacity = '1';
    });
    return;
  }

  targets.forEach(function (el) {
    el.classList.add('fade-in');
  });

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  targets.forEach(function (el) {
    observer.observe(el);
  });

  // Sicherheitsnetz: Falls der Beobachter aus irgendeinem Grund nicht
  // ausloest, werden alle noch versteckten Elemente nach kurzer Zeit
  // eingeblendet. Inhalte duerfen nie dauerhaft unsichtbar bleiben.
  window.setTimeout(function () {
    targets.forEach(function (el) {
      if (!el.classList.contains('is-visible')) {
        el.classList.add('is-visible');
      }
    });
  }, 2500);

  // Gestaffelte Animation für Karten (Säulen + Funktions-Grid)
  document.querySelectorAll('.pillar, .func-card').forEach(function (card, index) {
    card.style.transitionDelay = ((index % 3) * 0.08) + 's';
  });

  // Hero: Text, Button und Merkmale nacheinander einblenden
  document.querySelectorAll(
    '.hero__subheadline, .hero__actions, .hero__trust'
  ).forEach(function (el, index) {
    el.style.transitionDelay = (index * 0.12) + 's';
  });
}


/* ============================================================
   8. FOOTER – Jahreszahl automatisch setzen
============================================================ */
function setFooterYear() {
  const yearEl = document.getElementById('footerYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}


/* ============================================================
   9. HERO-VIDEO
   Quelle nach Bildschirmbreite waehlen und starten. Bei reduzierter
   Bewegung wird nichts geladen, dann bleibt das Standbild stehen.
============================================================ */
function initHeroVideo() {
  const v = document.getElementById('heroVideo');
  if (!v) return;

  // Bei reduzierter Bewegung gar nichts laden – das Standbild genuegt
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Hochformat-Fassung auf schmalen Geraeten, sonst die breite
  const hochkant = window.matchMedia('(max-width: 640px)').matches;
  v.setAttribute('poster', hochkant
    ? './assets/video/hero-poster-portrait.webp'
    : './assets/video/hero-poster.webp');
  v.src = hochkant
    ? './assets/video/hero-loop-portrait.mp4'
    : './assets/video/hero-loop.mp4';

  // Fuer das automatische Abspielen auf Mobilgeraeten zwingend
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.load();

  let laeuft = false;

  function starten() {
    if (laeuft) return;
    const p = v.play();
    if (p && typeof p.then === 'function') {
      p.then(function () { laeuft = true; aufraeumen(); })
       .catch(function () { /* spaeter erneut versuchen */ });
    } else {
      laeuft = true;
    }
  }

  function aufraeumen() {
    v.removeEventListener('loadeddata', starten);
    v.removeEventListener('canplay', starten);
    document.removeEventListener('touchstart', starten);
    document.removeEventListener('click', starten);
    document.removeEventListener('visibilitychange', beiSichtbarkeit);
  }

  function beiSichtbarkeit() {
    if (!document.hidden) starten();
  }

  /* Mehrere Anlaeufe: Direkt, sobald Daten da sind, und notfalls bei der
     ersten Nutzeraktion. iOS lehnt play() ab, wenn beim Aufruf noch keine
     Daten gepuffert sind – dann bliebe sonst dauerhaft das Standbild. */
  v.addEventListener('loadeddata', starten);
  v.addEventListener('canplay', starten);
  document.addEventListener('touchstart', starten, { passive: true });
  document.addEventListener('click', starten);
  document.addEventListener('visibilitychange', beiSichtbarkeit);

  starten();
}



/* ============================================================
   ENDE script.js
============================================================ */
