/**
 * @file utils.js
 * @description Helper functions for KarDaan (formatting, validation, storage, UI).
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  window.Utils = {
    /**
     * Format a number in the Indian currency system (e.g., ₹12,34,567.89).
     * @param {number} amount
     * @returns {string}
     */
    formatCurrency: function (amount) {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return '₹0';
      }
      
      var roundAmount = Math.round(amount * 100) / 100;
      var strAmount = roundAmount.toString();
      var parts = strAmount.split('.');
      var numPart = parts[0];
      var decPart = parts.length > 1 ? '.' + parts[1] : '';

      var lastThree = numPart.substring(numPart.length - 3);
      var otherNumbers = numPart.substring(0, numPart.length - 3);
      if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
      }
      var res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree + decPart;
      return '₹' + res;
    },

    /**
     * Format a currency in a short format (e.g., ₹12.5L, ₹1.2Cr).
     * @param {number} amount
     * @returns {string}
     */
    formatCurrencyShort: function (amount) {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return '₹0';
      }
      if (amount >= 10000000) { // 1 Crore
        return '₹' + (amount / 10000000).toFixed(2).replace(/\.00$/, '') + ' Cr';
      }
      if (amount >= 100000) { // 1 Lakh
        return '₹' + (amount / 100000).toFixed(2).replace(/\.00$/, '') + ' L';
      }
      if (amount >= 1000) { // 1 Thousand
        return '₹' + (amount / 1000).toFixed(1).replace(/\.0$/, '') + ' K';
      }
      return '₹' + Math.round(amount);
    },

    /**
     * Parse a formatted currency string back to a number.
     * @param {string} str
     * @returns {number}
     */
    parseCurrency: function (str) {
      if (!str) return 0;
      var num = Number(str.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    },

    /**
     * Validate Permanent Account Number (PAN) format: ABCDE1234F.
     * @param {string} pan
     * @returns {boolean}
     */
    validatePAN: function (pan) {
      if (!pan) return false;
      var regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
      return regex.test(pan.trim());
    },

    /**
     * Validate if amount is a positive finite number.
     * @param {*} amount
     * @returns {boolean}
     */
    validateAmount: function (amount) {
      var num = Number(amount);
      return !isNaN(num) && isFinite(num) && num >= 0;
    },

    /**
     * Validate age (0 to 120).
     * @param {*} age
     * @returns {boolean}
     */
    validateAge: function (age) {
      var num = Number(age);
      return !isNaN(num) && Number.isInteger(num) && num >= 0 && num <= 120;
    },

    /**
     * Classify age category for tax purposes.
     * @param {number} age
     * @returns {'below60'|'senior'|'superSenior'}
     */
    getAgeCategory: function (age) {
      var a = Number(age);
      if (a >= 80) return 'superSenior';
      if (a >= 60) return 'senior';
      return 'below60';
    },

    /**
     * Save key-value pair to LocalStorage.
     * @param {string} key
     * @param {*} data
     */
    saveToLocalStorage: function (key, data) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.error('LocalStorage Save Error:', e);
      }
    },

    /**
     * Load data from LocalStorage.
     * @param {string} key
     * @returns {*}
     */
    loadFromLocalStorage: function (key) {
      try {
        var data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error('LocalStorage Load Error:', e);
        return null;
      }
    },

    /**
     * Clear specific or all item(s) from LocalStorage.
     * @param {string} [key]
     */
    clearLocalStorage: function (key) {
      try {
        if (key) {
          localStorage.removeItem(key);
        } else {
          localStorage.clear();
        }
      } catch (e) {
        console.error('LocalStorage Clear Error:', e);
      }
    },

    /**
     * Debounce function to limit execution rates.
     * @param {Function} fn
     * @param {number} delayMs
     * @returns {Function}
     */
    debounce: function (fn, delayMs) {
      var timer;
      return function () {
        var context = this;
        var args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function () {
          fn.apply(context, args);
        }, delayMs);
      };
    },

    /**
     * Animate numeric counters in the UI.
     * @param {HTMLElement} element
     * @param {number} targetValue
     * @param {number} durationMs
     * @param {string} [prefix='₹']
     */
    animateCounter: function (element, targetValue, durationMs, prefix) {
      if (!element) return;
      prefix = prefix !== undefined ? prefix : '₹';
      var startTime = null;
      var startValue = 0;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / durationMs, 1);
        var currentValue = progress * (targetValue - startValue) + startValue;
        
        if (prefix === '₹') {
          element.textContent = window.Utils.formatCurrency(currentValue);
        } else {
          element.textContent = prefix + Math.round(currentValue).toLocaleString('en-IN');
        }

        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          if (prefix === '₹') {
            element.textContent = window.Utils.formatCurrency(targetValue);
          } else {
            element.textContent = prefix + Math.round(targetValue).toLocaleString('en-IN');
          }
        }
      }

      window.requestAnimationFrame(step);
    },

    /**
     * Quick DOM element creator.
     * @param {string} tag
     * @param {string} [className]
     * @param {string} [content]
     * @returns {HTMLElement}
     */
    createElement: function (tag, className, content) {
      var el = document.createElement(tag);
      if (className) el.className = className;
      if (content !== undefined) el.innerHTML = content;
      return el;
    },

    /**
     * Show premium toast notification.
     * @param {string} message
     * @param {'success'|'error'|'warning'|'info'} [type='info']
     */
    showToast: function (message, type) {
      type = type || 'info';
      var container = document.getElementById('toast-container');
      if (!container) {
        container = this.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      var toast = this.createElement('div', 'toast toast-' + type);
      
      var icon = '';
      if (type === 'success') icon = '';
      if (type === 'error') icon = '';
      if (type === 'warning') icon = '';

      toast.innerHTML = '<span>' + icon + '</span><span class="toast-message">' + message + '</span>';
      container.appendChild(toast);

      setTimeout(function () {
        toast.classList.add('hide');
        setTimeout(function () {
          toast.remove();
        }, 300);
      }, 4000);
    },

    /**
     * Format ISO date string into readable Indian format.
     * @param {string} dateStr
     * @returns {string}
     */
    formatDate: function (dateStr) {
      if (!dateStr) return '';
      var date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return date.getDate() + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
    },

    /**
     * Generate simple random unique ID.
     * @returns {string}
     */
    generateId: function () {
      return '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Smooth scroll to element.
     * @param {HTMLElement|string} target
     */
    scrollToElement: function (target) {
      var el = typeof target === 'string' ? document.getElementById(target) : target;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };
})();
