/**
 * @file app.js
 * @description Main application controller for KarDaan.
 *              Initializes theme toggling, routing, and binds user landing interactions.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Initialize Routing
  // ---------------------------------------------------------------------------
  function setupRoutes() {
    window.Router.addRoute('#home', function () {
      document.getElementById('home-view').style.display = 'block';
    });

    window.Router.addRoute('#wizard', function () {
      document.getElementById('wizard-view').style.display = 'block';
      window.TaxWizard.init('wizard-container');
    });

    window.Router.addRoute('#faq', function () {
      document.getElementById('faq-view').style.display = 'block';
      setupFAQAccordion();
    });

    window.Router.init();
  }

  // ---------------------------------------------------------------------------
  // Theme Toggle (Dark / Light Mode)
  // ---------------------------------------------------------------------------
  function setupTheme() {
    var themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (!themeToggleBtn) return;

    // Default to dark theme
    var currentTheme = localStorage.getItem('kardaan_theme') || 'dark';
    document.body.setAttribute('data-theme', currentTheme);

    themeToggleBtn.addEventListener('click', function () {
      var nextTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', nextTheme);
      localStorage.setItem('kardaan_theme', nextTheme);
      
      // Notify active view to redraw charts if they exist
      if (window.location.hash === '#wizard') {
        var canvas = document.getElementById('res-bar-chart');
        if (canvas) {
          window.TaxWizard.renderStep(); // Re-render step to trigger redrawing chart with new theme colors
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // FAQ Accordion logic
  // ---------------------------------------------------------------------------
  function setupFAQAccordion() {
    var faqContainer = document.getElementById('faq-accordion-container');
    if (!faqContainer) return;

    faqContainer.onclick = function (e) {
      var header = e.target.closest('.accordion-header');
      if (!header) return;

      var item = header.closest('.accordion-item');
      var isActive = item.classList.contains('active');

      // Close all items
      var items = faqContainer.querySelectorAll('.accordion-item');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.remove('active');
        items[i].querySelector('.accordion-content').style.display = 'none';
      }

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
        item.querySelector('.accordion-content').style.display = 'block';
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Entry Point
  // ---------------------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', function () {
    setupTheme();
    setupRoutes();
    
    // Bind Landing Hero Call To Action
    var startBtn = document.getElementById('cta-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        window.location.hash = '#wizard';
      });
    }
  });

})();
