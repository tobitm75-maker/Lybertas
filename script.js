/**
 * LYBERTAS – script.js
 * Interaktivität: Navigation, Formularvalidierung, Animationen
 * Kein Framework, kein Build-Prozess – reines Vanilla JS
 */

/* ============================================================
   1. DOMContentLoaded – Initialisierung
============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  initNav();
  initSmoothScroll();
  initSurveyForm();
  initScrollAnimations();
  initScrollHeader();
  setFooterYear();
  setTimestamp();
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
   5. SURVEY FORM – Validierung & Submit
============================================================ */
function initSurveyForm() {
  const form        = document.getElementById('surveyForm');
  const successEl   = document.getElementById('surveySuccess');
  const submitBtn   = document.getElementById('submitBtn');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Alle Fehler zurücksetzen
    clearErrors();

    let isValid = true;

    // --- Validierung: Antwort ausgewählt ---
    const selectedVote = form.querySelector('input[name="vote"]:checked');
    if (!selectedVote) {
      showError('voteError');
      isValid = false;
    }

    // --- Validierung: E-Mail ---
    const emailInput = document.getElementById('emailField');
    if (!emailInput.value.trim() || !isValidEmail(emailInput.value.trim())) {
      showError('emailError');
      emailInput.classList.add('is-invalid');
      isValid = false;
    }

    // --- Validierung: Datenschutz-Checkbox ---
    const consentCheckbox = document.getElementById('consentField');
    if (!consentCheckbox.checked) {
      showError('consentError');
      isValid = false;
    }

    if (!isValid) {
      // Zum ersten Fehler scrollen
      const firstError = form.querySelector('[role="alert"]:not([hidden])');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // --- Timestamp setzen ---
    setTimestamp();

    // --- Formular absenden ---
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').hidden = true;
    submitBtn.querySelector('.btn-loading').hidden = false;

    const formData = new FormData(form);

    fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    })
    .then(function (response) {
      if (response.ok) {
        // Erfolg: Formular ausblenden, Erfolgsmeldung zeigen
        form.hidden = true;
        if (successEl) {
          successEl.hidden = false;
          successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        // Server-Fehler
        handleSubmitError(submitBtn);
      }
    })
    .catch(function () {
      // Netzwerkfehler
      handleSubmitError(submitBtn);
    });
  });

  // Live-Validierung: E-Mail beim Verlassen des Feldes
  const emailInput = document.getElementById('emailField');
  if (emailInput) {
    emailInput.addEventListener('blur', function () {
      if (this.value.trim() && !isValidEmail(this.value.trim())) {
        showError('emailError');
        this.classList.add('is-invalid');
      } else {
        hideError('emailError');
        this.classList.remove('is-invalid');
      }
    });

    emailInput.addEventListener('input', function () {
      if (this.classList.contains('is-invalid') && isValidEmail(this.value.trim())) {
        hideError('emailError');
        this.classList.remove('is-invalid');
      }
    });
  }
}


/* ============================================================
   6. HELPER FUNCTIONS
============================================================ */

/**
 * E-Mail-Validierung (RFC 5322 vereinfacht)
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Fehlermeldung anzeigen
 */
function showError(errorId) {
  const el = document.getElementById(errorId);
  if (el) el.hidden = false;
}

/**
 * Fehlermeldung ausblenden
 */
function hideError(errorId) {
  const el = document.getElementById(errorId);
  if (el) el.hidden = true;
}

/**
 * Alle Fehlermeldungen zurücksetzen
 */
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(function (el) {
    el.hidden = true;
  });
  document.querySelectorAll('.is-invalid').forEach(function (el) {
    el.classList.remove('is-invalid');
  });
}

/**
 * Submit-Fehler behandeln
 */
function handleSubmitError(submitBtn) {
  submitBtn.disabled = false;
  submitBtn.querySelector('.btn-text').hidden = false;
  submitBtn.querySelector('.btn-loading').hidden = true;

  // Einfache Fehlermeldung – alternativ könnte man einen Fehler-Toast einblenden
  alert('Beim Senden ist ein Fehler aufgetreten. Bitte versuche es später erneut oder kontaktiere uns direkt unter kontakt@lybertas.de');
}

/**
 * Timestamp in verstecktes Feld schreiben
 */
function setTimestamp() {
  const tsField = document.getElementById('timestampField');
  if (tsField) {
    tsField.value = new Date().toISOString();
  }
}


/* ============================================================
   7. SCROLL ANIMATIONS – Intersection Observer
   Elemente werden beim Scrollen eingeblendet
============================================================ */
function initScrollAnimations() {
  // Elemente, die animiert werden sollen
  const targets = document.querySelectorAll(
    '.feature-card, .survey-card, .why-inner, .municipalities-card, .contact-inner, .why-text, .why-visual'
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

  // Gestaffelte Animation für Feature Cards
  document.querySelectorAll('.feature-card').forEach(function (card, index) {
    card.style.transitionDelay = (index * 0.1) + 's';
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
   ENDE script.js
============================================================ */
