/**
 * @file hra-calculator.js
 * @description HRA (House Rent Allowance) exemption calculator for Indian tax computation.
 *              Uses window.TaxData.hra for metro/non-metro percentage configuration.
 *              Implements Section 10(13A) rules for salaried employees.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Dependency check
  // ---------------------------------------------------------------------------
  if (!window.TaxData || !window.TaxData.hra) {
    throw new Error(
      '[HRACalculator] window.TaxData.hra is required. Load tax-data.js before hra-calculator.js.'
    );
  }

  /** @type {{ metroPercent: number, nonMetroPercent: number, metroCities: string[] }} */
  var hraRules = window.TaxData.hra;

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Clamp a numeric value so it is never negative.
   * @param {number} value
   * @returns {number}
   */
  function clampZero(value) {
    return value < 0 ? 0 : value;
  }

  /**
   * Validate that a value is a finite, non-negative number.
   * @param {*} value   - The value to check.
   * @param {string} name - Parameter name (used in error messages).
   * @param {boolean} [allowZero=true] - Whether zero is acceptable.
   * @throws {TypeError}  If value is not a finite number.
   * @throws {RangeError} If value is negative or zero when not allowed.
   */
  function validateNonNegative(value, name, allowZero) {
    if (allowZero === undefined) {
      allowZero = true;
    }
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new TypeError(name + ' must be a finite number. Received: ' + value);
    }
    if (value < 0) {
      throw new RangeError(name + ' must not be negative. Received: ' + value);
    }
    if (!allowZero && value === 0) {
      throw new RangeError(name + ' must be greater than 0. Received: 0');
    }
  }

  /**
   * Validate a boolean parameter.
   * @param {*} value
   * @param {string} name
   * @throws {TypeError}
   */
  function validateBoolean(value, name) {
    if (typeof value !== 'boolean') {
      throw new TypeError(name + ' must be a boolean. Received: ' + typeof value);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  window.HRACalculator = {

    /**
     * Calculate HRA exemption under Section 10(13A).
     *
     * The exempt HRA is the **minimum** of three components (annual amounts):
     *   a) Actual HRA received from employer
     *   b) Rent paid − 10% of (Basic + DA)
     *   c) 50% of (Basic + DA) for metro cities, 40% for non-metro
     *
     * @param {number}  basic      - Annual basic salary (must be > 0).
     * @param {number}  da         - Annual dearness allowance (>= 0).
     * @param {number}  actualHRA  - Annual HRA received from employer (>= 0).
     * @param {number}  rentPaid   - Annual rent paid (>= 0).
     * @param {boolean} isMetro    - true if the city is a metro (Delhi, Mumbai, Kolkata, Chennai).
     *
     * @returns {{
     *   exemption: number,
     *   taxableHRA: number,
     *   breakdown: {
     *     actualHRA: number,
     *     rentMinusTenPercent: number,
     *     fiftyOrFortyPercent: number,
     *     exempt: number
     *   }
     * }}
     *
     * @throws {TypeError}  If any parameter has an invalid type.
     * @throws {RangeError} If any numeric parameter is negative or basic is zero.
     *
     * @example
     * // Metro employee
     * var result = HRACalculator.calculate(600000, 0, 240000, 180000, true);
     * // result.exemption → 120000
     */
    calculate: function (basic, da, actualHRA, rentPaid, isMetro) {
      // ---- Input validation ----
      validateNonNegative(basic, 'basic', false);   // basic must be > 0
      validateNonNegative(da, 'da');
      validateNonNegative(actualHRA, 'actualHRA');
      validateNonNegative(rentPaid, 'rentPaid');
      validateBoolean(isMetro, 'isMetro');

      var salary = basic + da;

      // ---- Edge case: zero rent → no exemption ----
      if (rentPaid === 0) {
        return {
          exemption: 0,
          taxableHRA: actualHRA,
          breakdown: {
            actualHRA: actualHRA,
            rentMinusTenPercent: 0,
            fiftyOrFortyPercent: 0,
            exempt: 0
          }
        };
      }

      // ---- Edge case: no HRA component ----
      if (actualHRA === 0) {
        return {
          exemption: 0,
          taxableHRA: 0,
          breakdown: {
            actualHRA: 0,
            rentMinusTenPercent: 0,
            fiftyOrFortyPercent: 0,
            exempt: 0
          }
        };
      }

      // ---- Three components of HRA exemption ----
      // (a) Actual HRA received
      var compA = actualHRA;

      // (b) Rent paid minus 10% of (Basic + DA) — clamped to 0
      var compB = clampZero(rentPaid - 0.10 * salary);

      // (c) 50% (metro) or 40% (non-metro) of (Basic + DA)
      var cityPercent = isMetro ? hraRules.metroPercent : hraRules.nonMetroPercent;
      var compC = cityPercent * salary;

      // ---- Exemption = minimum of the three ----
      var exempt = Math.min(compA, compB, compC);

      // Clamp final exemption to 0 (safety net)
      exempt = clampZero(exempt);

      // Taxable HRA = Actual HRA − Exempt HRA (never negative)
      var taxableHRA = clampZero(actualHRA - exempt);

      return {
        exemption: Math.round(exempt * 100) / 100,
        taxableHRA: Math.round(taxableHRA * 100) / 100,
        breakdown: {
          actualHRA: Math.round(compA * 100) / 100,
          rentMinusTenPercent: Math.round(compB * 100) / 100,
          fiftyOrFortyPercent: Math.round(compC * 100) / 100,
          exempt: Math.round(exempt * 100) / 100
        }
      };
    },

    /**
     * Find the rent amount that maximises HRA exemption.
     *
     * The exemption is min(actualHRA, rentPaid − 10%·S, P%·S) where S = basic + DA
     * and P = 50% (metro) or 40% (non-metro).
     *
     * As rent increases from 0:
     *   • Component B (rent − 10%·S) rises linearly.
     *   • Components A (actualHRA) and C (P%·S) are constants.
     *
     * The maximum exemption is reached when the binding constraint of B
     * meets min(A, C). Beyond that point, increasing rent yields no further benefit.
     *
     * Optimal rent = min(A, C) + 10%·S
     * Max exemption = min(A, C)   (since B is now ≥ min(A, C))
     *
     * @param {number}  basic      - Annual basic salary (must be > 0).
     * @param {number}  da         - Annual dearness allowance (>= 0).
     * @param {number}  actualHRA  - Annual HRA received from employer (>= 0).
     * @param {boolean} isMetro    - true if the city is a metro.
     *
     * @returns {{
     *   optimalRent: number,
     *   maxExemption: number,
     *   analysis: {
     *     basicPlusDa: number,
     *     tenPercentSalary: number,
     *     actualHRA: number,
     *     cityPercentComponent: number,
     *     cityPercent: number,
     *     bindingConstraint: string,
     *     notes: string[]
     *   }
     * }}
     *
     * @throws {TypeError}  If any parameter has an invalid type.
     * @throws {RangeError} If any numeric parameter is negative or basic is zero.
     *
     * @example
     * var opt = HRACalculator.getOptimalRent(600000, 0, 240000, true);
     * // opt.optimalRent → 300000 + some amount
     * // opt.maxExemption → the ceiling of min(actualHRA, P%·S)
     */
    getOptimalRent: function (basic, da, actualHRA, isMetro) {
      // ---- Input validation ----
      validateNonNegative(basic, 'basic', false);
      validateNonNegative(da, 'da');
      validateNonNegative(actualHRA, 'actualHRA');
      validateBoolean(isMetro, 'isMetro');

      var salary = basic + da;
      var tenPercentSalary = 0.10 * salary;
      var cityPercent = isMetro ? hraRules.metroPercent : hraRules.nonMetroPercent;
      var compC = cityPercent * salary;

      var notes = [];

      // ---- Edge case: no HRA component ----
      if (actualHRA === 0) {
        notes.push(
          'No HRA is received from the employer. Consider claiming deduction under Section 80GG instead.'
        );
        return {
          optimalRent: 0,
          maxExemption: 0,
          analysis: {
            basicPlusDa: salary,
            tenPercentSalary: tenPercentSalary,
            actualHRA: actualHRA,
            cityPercentComponent: compC,
            cityPercent: cityPercent,
            bindingConstraint: 'actualHRA',
            notes: notes
          }
        };
      }

      // ---- Determine the binding constraint between A and C ----
      var bindingConstraint;
      var constantCap; // min(A, C)

      if (actualHRA <= compC) {
        bindingConstraint = 'actualHRA';
        constantCap = actualHRA;
        notes.push(
          'Actual HRA (₹' + actualHRA + ') is the tighter cap vs. ' +
          (cityPercent * 100) + '% of salary (₹' + compC + ').'
        );
      } else {
        bindingConstraint = 'cityPercentOfSalary';
        constantCap = compC;
        notes.push(
          (cityPercent * 100) + '% of salary (₹' + compC +
          ') is the tighter cap vs. actual HRA (₹' + actualHRA + ').'
        );
      }

      // ---- Optimal rent: make B = constantCap ----
      // B = rent − 10%·S ≥ constantCap  →  rent = constantCap + 10%·S
      var optimalRent = constantCap + tenPercentSalary;
      var maxExemption = constantCap;

      notes.push(
        'Optimal annual rent is ₹' + optimalRent +
        ' (₹' + Math.round(optimalRent / 12) + '/month).'
      );
      notes.push(
        'Paying more than ₹' + optimalRent +
        ' per year will NOT increase HRA exemption further.'
      );

      // ---- Additional insight when DA = 0 ----
      if (da === 0) {
        notes.push('DA is zero; the 10% salary threshold is based on basic salary alone.');
      }

      return {
        optimalRent: Math.round(optimalRent * 100) / 100,
        maxExemption: Math.round(maxExemption * 100) / 100,
        analysis: {
          basicPlusDa: salary,
          tenPercentSalary: Math.round(tenPercentSalary * 100) / 100,
          actualHRA: actualHRA,
          cityPercentComponent: Math.round(compC * 100) / 100,
          cityPercent: cityPercent,
          bindingConstraint: bindingConstraint,
          notes: notes
        }
      };
    }
  };
})();
