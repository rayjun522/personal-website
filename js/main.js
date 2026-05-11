(function () {
  'use strict';

  var header = document.getElementById('header');
  var nav = document.getElementById('nav');
  var menuToggle = document.getElementById('menuToggle');
  var navLinks = document.querySelectorAll('.nav-link');

  // ===== Page routing (with encoded hash URLs) =====
  var homeSections = ['hero', 'about', 'projects', 'contact'];
  var subPages = ['blog', 'project1', 'project2', 'project3'];
  var hashCodes = { '6k': 'blog', '7m': 'project1', '8n': 'project2', '9p': 'project3' };
  var pageToHash = { home: '' };
  for (var k in hashCodes) { pageToHash[hashCodes[k]] = k; }

  function getCurrentPage() {
    var hash = window.location.hash.replace('#', '');
    if (!hash || homeSections.indexOf(hash) !== -1) return 'home';
    return hashCodes[hash] || 'home';
  }

  function showPage(name) {
    // Pause video when leaving page
    var video = document.getElementById('projectVideo');
    if (video) video.pause();

    // Hide all panels
    var panels = document.querySelectorAll('.page-panel');
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.remove('active');
      panels[i].style.display = 'none';
    }

    // Show/hide home
    var homeEl = document.getElementById('page-home');
    if (name === 'home') {
      homeEl.style.display = '';
      // Scroll handled by click handler, hashchange only updates display
    } else {
      homeEl.style.display = 'none';
      var panel = document.getElementById('page-' + name);
      if (panel) {
        panel.classList.add('active');
        panel.style.display = '';
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }

    updateNavActive(name);
    header.classList.toggle('scrolled', window.scrollY > 0);
  }

  function updateNavActive(page) {
    navLinks.forEach(function (link) {
      link.classList.remove('active');
      var href = link.getAttribute('href').replace('#', '');
      if (page === 'home' && homeSections.indexOf(href) !== -1) return;
      if (href === page) link.classList.add('active');
    });
  }

  // Handle nav clicks with js-nav class
  document.addEventListener('click', function (e) {
    var target = e.target.closest('.js-nav');
    if (!target) return;
    var page = target.getAttribute('data-page');
    if (page === 'home') {
      var href = target.getAttribute('href');
      if (href && href !== '#' && href !== '#hero') {
        var sectionId = href.replace('#', '');
        var section = document.getElementById(sectionId);
        showPage('home');
        if (section) {
          setTimeout(function () {
            section.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
        window.location.hash = href;
      } else {
        showPage('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.location.hash = '';
      }
    } else {
      showPage(page);
      window.location.hash = pageToHash[page] || page;
    }
    e.preventDefault();
  });

  window.addEventListener('hashchange', function () {
    showPage(getCurrentPage());
  });

  // ===== Header shadow =====
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 0);
  }

  // ===== Scroll spy (home page only) =====
  var sections = [];
  navLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      var el = document.querySelector(href);
      if (el && homeSections.indexOf(href.replace('#', '')) !== -1) {
        sections.push({ link: link, section: el });
      }
    }
  });

  function onScrollSpy() {
    if (getCurrentPage() !== 'home') return;
    var scrollPos = window.scrollY + 100;
    var current = null;
    sections.forEach(function (item) {
      if (item.section.offsetTop <= scrollPos) current = item.link;
    });
    navLinks.forEach(function (link) { link.classList.remove('active'); });
    if (current) current.classList.add('active');
  }

  window.addEventListener('scroll', function () {
    onScroll();
    onScrollSpy();
  });

  // ===== Mobile menu =====
  menuToggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', isOpen);
  });

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !menuToggle.contains(e.target)) {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // ===== Scroll animations =====
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          if (entry.target.classList.contains('animate-stagger')) {
            var children = entry.target.children;
            for (var i = 0; i < children.length; i++) {
              (function (child, delay) {
                setTimeout(function () {
                  child.style.opacity = '1';
                  child.style.transform = 'translateY(0)';
                }, delay);
              })(children[i], i * 100);
            }
          }
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.animate').forEach(function (el) { observer.observe(el); });
  document.querySelectorAll('.animate-stagger').forEach(function (el) { observer.observe(el); });

  // ===== Lightbox =====
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxClose = document.getElementById('lightboxClose');
  var galleryImages = [];
  var currentImageIndex = -1;

  function collectGalleryImages() {
    galleryImages = [];
    var visiblePage = document.querySelector('.page-panel.active') || document.getElementById('page-home');
    if (!visiblePage || visiblePage.id === 'page-home') return;
    var imgs = visiblePage.querySelectorAll('.gallery-item img');
    for (var i = 0; i < imgs.length; i++) {
      galleryImages.push(imgs[i]);
    }
  }

  function openLightbox(img) {
    collectGalleryImages();
    for (var i = 0; i < galleryImages.length; i++) {
      if (galleryImages[i].src === img.src) {
        currentImageIndex = i;
        break;
      }
    }
    if (currentImageIndex === -1) {
      galleryImages = [img];
      currentImageIndex = 0;
    }
    showCurrentImage();
    lightbox.classList.add('open');
  }

  function showCurrentImage() {
    if (currentImageIndex >= 0 && currentImageIndex < galleryImages.length) {
      lightboxImg.src = galleryImages[currentImageIndex].src;
      lightboxImg.alt = galleryImages[currentImageIndex].alt;
    }
  }

  function nextImage() {
    if (galleryImages.length === 0) return;
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    showCurrentImage();
  }

  function prevImage() {
    if (galleryImages.length === 0) return;
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    showCurrentImage();
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest('.gallery-item img');
    if (!img) return;
    openLightbox(img);
  });

  lightboxClose.addEventListener('click', function () {
    lightbox.classList.remove('open');
  });

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) {
      lightbox.classList.remove('open');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') {
      lightbox.classList.remove('open');
    } else if (e.key === 'ArrowRight') {
      nextImage();
    } else if (e.key === 'ArrowLeft') {
      prevImage();
    }
  });

  // ===== Video fullscreen =====
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('#videoFullscreenBtn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var video = document.getElementById('projectVideo');
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    }
  });

  // ===== Init =====
  showPage(getCurrentPage());
  var initHash = window.location.hash.replace('#', '');
  if (initHash && homeSections.indexOf(initHash) !== -1) {
    var initTarget = document.getElementById(initHash);
    if (initTarget) {
      setTimeout(function () {
        initTarget.scrollIntoView({ behavior: 'instant' });
      }, 100);
    }
  }

})();
