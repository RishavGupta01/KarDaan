/**
 * @file router.js
 * @description Hash-based client router for KarDaan.
 *              Controls navigation between Landing Page, Wizard, Calculator, and Advisory sections.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  window.Router = {
    routes: {},

    /**
     * Map a hash route to a callback function.
     * @param {string} route
     * @param {Function} callback
     */
    addRoute: function (route, callback) {
      this.routes[route] = callback;
    },

    /**
     * Initialize router and bind hashchange events.
     */
    init: function () {
      var self = this;
      window.addEventListener('hashchange', function () {
        self.handleRoute();
      });
      // Initial trigger
      this.handleRoute();
    },

    /**
     * Route handler. Reads current hash and displays appropriate DOM container.
     */
    handleRoute: function () {
      var hash = window.location.hash || '#home';
      
      // Update Active Navigation link states
      var navLinks = document.querySelectorAll('.nav-link');
      for (var i = 0; i < navLinks.length; i++) {
        var link = navLinks[i];
        if (link.getAttribute('href') === hash) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }

      // Hide all main page content views
      var views = document.querySelectorAll('.page-view');
      for (var j = 0; j < views.length; j++) {
        views[j].style.display = 'none';
      }

      // Route lookup
      if (this.routes[hash]) {
        this.routes[hash]();
      } else {
        // Fallback to home
        window.location.hash = '#home';
      }
    }
  };
})();
