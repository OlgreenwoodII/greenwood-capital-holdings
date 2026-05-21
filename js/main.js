// Greenwood Capital Holdings — Main JS

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav__toggle');
  const menu = document.querySelector('.nav__menu');

  // Parallax hero background — disabled on mobile/reduced-motion to prevent content overlap
  const parallaxBg = document.querySelector('[data-parallax-bg]');
  const heroEl = document.querySelector('[data-parallax]');
  let ticking = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth < 768;

  const updateParallax = () => {
    if (parallaxBg && heroEl && !reduceMotion && !isMobile()) {
      const heroHeight = heroEl.offsetHeight;
      const scrolled = window.scrollY;
      if (scrolled < heroHeight) {
        const translateY = scrolled * 0.45;
        const scale = 1.05 + Math.min(scrolled / heroHeight, 1) * 0.08;
        const opacity = 1 - Math.min(scrolled / heroHeight, 1) * 0.4;
        parallaxBg.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
        parallaxBg.style.opacity = opacity;
      }
    } else if (parallaxBg && isMobile()) {
      // On mobile, reset parallax transform so bg stays anchored
      parallaxBg.style.transform = 'translate3d(0, 0, 0) scale(1.05)';
      parallaxBg.style.opacity = '1';
    }
    ticking = false;
  };

  // Sticky nav style on scroll + parallax (combined rAF)
  const onScroll = () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle (with body scroll lock + backdrop)
  if (toggle && menu) {
    const closeMenu = () => {
      toggle.classList.remove('open');
      menu.classList.remove('open');
      document.body.classList.remove('menu-open');
    };
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      document.body.classList.toggle('menu-open', isOpen);
    });
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });
    // Close when backdrop is tapped
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      closeMenu();
    });
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // Reveal on scroll (IntersectionObserver)
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    // Enable the hidden-then-animate behavior only now that JS is confirmed running
    document.documentElement.classList.add('js-anim');

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach(el => io.observe(el));
    } else {
      reveals.forEach(el => el.classList.add('visible'));
    }

    // Failsafe: if anything is still hidden shortly after load, reveal it
    // (covers any environment where the observer doesn't fire as expected).
    setTimeout(() => {
      document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) el.classList.add('visible');
      });
    }, 1500);
  }

  // Contact / Careers form — submits to Netlify Forms via AJAX, keeps on-page success message
  const form = document.querySelector('.form');
  const success = document.querySelector('.form__success');
  if (form && success) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Basic required-field validation
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#c0392b';
        } else {
          field.style.borderColor = '';
        }
      });
      if (!valid) {
        const firstInvalid = form.querySelector('[required]:invalid, [style*="rgb(192"]');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      const submitBtn = form.querySelector('[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      // Encode form data for Netlify
      const data = new FormData(form);
      const encoded = new URLSearchParams(data).toString();

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encoded
      })
        .then((response) => {
          if (!response.ok) throw new Error('Submission failed: ' + response.status);
          success.textContent = 'Thank you for reaching out. A member of our team will respond to you personally within one business day.';
          success.classList.add('show');
          form.reset();
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(() => {
          success.textContent = 'Sorry — something went wrong sending your message. Please email us directly at info@greenwoodcapitalholdings.com.';
          success.classList.add('show');
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .finally(() => {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
          setTimeout(() => success.classList.remove('show'), 10000);
        });
    });
  }

  // Set active nav link based on current page
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});
