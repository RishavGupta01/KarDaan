/**
 * @file business-tax.js
 * @description Business and professional income tax calculator for Indian taxation.
 *              Covers presumptive taxation (44AD / 44ADA / 44AE), regular business
 *              income, WDV depreciation, and basic GST computations.
 *              All monetary values are in INR.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  /* ──────────────────────── helpers ──────────────────────── */

  /**
   * Assert that a value is a finite, non-negative number.
   * @param {*} value   - The value to check.
   * @param {string} name - Human-readable parameter name (for error messages).
   * @returns {number} The validated number.
   * @throws {Error} If the value is invalid.
   */
  function requireNonNegativeNumber(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(name + ' must be a finite number. Received: ' + value);
    }
    if (value < 0) {
      throw new Error(name + ' must not be negative. Received: ' + value);
    }
    return value;
  }

  /**
   * Assert that a value is a finite number (may be negative, e.g. deletions).
   * @param {*} value
   * @param {string} name
   * @returns {number}
   */
  function requireFiniteNumber(value, name) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(name + ' must be a finite number. Received: ' + value);
    }
    return value;
  }

  /**
   * Assert that a string is one of the allowed values.
   * @param {*} value
   * @param {string[]} allowed
   * @param {string} name
   * @returns {string}
   */
  function requireEnum(value, allowed, name) {
    if (typeof value !== 'string' || allowed.indexOf(value) === -1) {
      throw new Error(
        name + ' must be one of [' + allowed.join(', ') + ']. Received: ' + value
      );
    }
    return value;
  }

  /** Shorthand reference to the tax data store. */
  var TD = window.TaxData;

  /**
   * List of "special category" states / UTs for GST registration thresholds.
   * As per GST Council notifications, these states have a lower threshold.
   */
  var SPECIAL_CATEGORY_STATES = [
    'Arunachal Pradesh',
    'Assam',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Sikkim',
    'Tripura',
    'Himachal Pradesh',
    'Uttarakhand',
    'Jammu & Kashmir',
    'Ladakh',
    'Puducherry',
    'Telangana'
  ];

  /* ═════════════════════════════════════════════════════════
   *  PUBLIC API
   * ═════════════════════════════════════════════════════════ */

  window.BusinessTaxCalculator = {

    /* ─────────────────────────────────────────────────────────
     * 1. computePresumptiveIncome
     * ───────────────────────────────────────────────────────── */

    /**
     * Compute deemed/presumptive profit under the chosen scheme.
     *
     * @param {string} scheme
     *   One of `'44AD'`, `'44ADA'`, or `'44AE'`.
     *
     * @param {number} turnover
     *   - **44AD**: Total turnover / gross receipts.
     *   - **44ADA**: Total gross receipts from profession.
     *   - **44AE**: Ignored (profit is vehicle-based). Pass 0 if not applicable.
     *
     * @param {number} [cashTurnover=0]
     *   Cash / non-digital portion of turnover.
     *   Only relevant for 44AD (used to split 6 % / 8 % computation).
     *   For 44ADA & 44AE this parameter is ignored.
     *
     * @param {Object} [options={}]
     *   Additional options for specific schemes.
     * @param {number} [options.vehicleCount]
     *   **44AE only** — Number of goods-carriage vehicles owned.
     * @param {string} [options.vehicleType='heavy']
     *   **44AE only** — `'heavy'` or `'other'`.
     *
     * @returns {{ scheme: string, presumptiveIncome: number, breakdown: Object }}
     * @throws {Error} On invalid inputs.
     */
    computePresumptiveIncome: function (scheme, turnover, cashTurnover, options) {
      scheme = requireEnum(scheme, ['44AD', '44ADA', '44AE'], 'scheme');
      options = options || {};

      var data = TD.presumptive[scheme];

      if (scheme === '44AD') {
        turnover = requireNonNegativeNumber(turnover, 'turnover');
        cashTurnover = requireNonNegativeNumber(
          cashTurnover !== undefined && cashTurnover !== null ? cashTurnover : 0,
          'cashTurnover'
        );

        if (cashTurnover > turnover) {
          throw new Error(
            'cashTurnover (' + cashTurnover + ') cannot exceed turnover (' + turnover + ').'
          );
        }

        var digitalTurnover = turnover - cashTurnover;
        var digitalProfit = digitalTurnover * data.digitalRate;   // 6 %
        var cashProfit = cashTurnover * data.profitRate;           // 8 %
        var totalProfit = digitalProfit + cashProfit;

        return {
          scheme: '44AD',
          presumptiveIncome: totalProfit,
          breakdown: {
            totalTurnover: turnover,
            digitalTurnover: digitalTurnover,
            cashTurnover: cashTurnover,
            digitalRate: data.digitalRate,
            cashRate: data.profitRate,
            digitalProfit: digitalProfit,
            cashProfit: cashProfit
          }
        };
      }

      if (scheme === '44ADA') {
        turnover = requireNonNegativeNumber(turnover, 'grossReceipts');

        var profitADA = turnover * data.profitRate; // 50 %

        return {
          scheme: '44ADA',
          presumptiveIncome: profitADA,
          breakdown: {
            grossReceipts: turnover,
            profitRate: data.profitRate,
            deemedProfit: profitADA
          }
        };
      }

      /* scheme === '44AE' */
      var vehicleCount = requireNonNegativeNumber(
        options.vehicleCount !== undefined ? options.vehicleCount : 0,
        'options.vehicleCount'
      );
      if (vehicleCount !== Math.floor(vehicleCount)) {
        throw new Error('vehicleCount must be a whole number. Received: ' + vehicleCount);
      }

      var vehicleType = options.vehicleType || 'heavy';
      requireEnum(vehicleType, ['heavy', 'other'], 'options.vehicleType');

      var perMonth = data.profitPerVehicle[vehicleType]; // ₹7,500
      var annualProfit = perMonth * vehicleCount * 12;

      return {
        scheme: '44AE',
        presumptiveIncome: annualProfit,
        breakdown: {
          vehicleCount: vehicleCount,
          vehicleType: vehicleType,
          profitPerVehiclePerMonth: perMonth,
          months: 12,
          totalProfit: annualProfit
        }
      };
    },

    /* ─────────────────────────────────────────────────────────
     * 2. isEligibleForPresumptive
     * ───────────────────────────────────────────────────────── */

    /**
     * Check whether the assessee is eligible for a presumptive scheme.
     *
     * @param {string} scheme       - `'44AD'`, `'44ADA'`, or `'44AE'`.
     * @param {number} turnover     - Total turnover / gross receipts.
     * @param {number} cashTurnover - Cash / non-digital portion.
     * @param {string} entityType   - `'individual'`, `'huf'`, `'firm'`, `'llp'`, or `'company'`.
     * @param {Object} [options={}]
     * @param {number} [options.vehicleCount] - For 44AE: number of vehicles.
     * @param {boolean} [options.isSpecifiedProfession] - For 44ADA: whether the
     *        individual belongs to a notified profession.
     *
     * @returns {{ eligible: boolean, reason: string }}
     */
    isEligibleForPresumptive: function (scheme, turnover, cashTurnover, entityType, options) {
      scheme = requireEnum(scheme, ['44AD', '44ADA', '44AE'], 'scheme');
      turnover = requireNonNegativeNumber(turnover, 'turnover');
      cashTurnover = requireNonNegativeNumber(
        cashTurnover !== undefined && cashTurnover !== null ? cashTurnover : 0,
        'cashTurnover'
      );
      entityType = requireEnum(
        entityType,
        ['individual', 'huf', 'firm', 'llp', 'company'],
        'entityType'
      );
      options = options || {};

      var data = TD.presumptive[scheme];

      /* ── 44AD ── */
      if (scheme === '44AD') {
        // Entity check: individual, HUF, or partnership firm (NOT LLP)
        var allowedEntities44AD = ['individual', 'huf', 'firm'];
        if (allowedEntities44AD.indexOf(entityType) === -1) {
          return {
            eligible: false,
            reason:
              'Section 44AD is available only to individuals, HUFs, and partnership firms (not LLPs or companies). Entity type "' +
              entityType + '" is not eligible.'
          };
        }

        // Determine applicable turnover limit
        var cashPercent = turnover > 0 ? cashTurnover / turnover : 0;
        var applicableLimit =
          cashPercent < data.cashThreshold ? data.enhancedLimit : data.turnoverLimit;
        var limitLabel =
          applicableLimit === data.enhancedLimit
            ? '₹3 crore (enhanced — cash receipts < 5%)'
            : '₹2 crore';

        if (turnover > applicableLimit) {
          return {
            eligible: false,
            reason:
              'Turnover of ₹' + turnover.toLocaleString('en-IN') +
              ' exceeds the ' + limitLabel + ' limit for Section 44AD.'
          };
        }

        return {
          eligible: true,
          reason:
            'Eligible for Section 44AD. Turnover ₹' + turnover.toLocaleString('en-IN') +
            ' is within the ' + limitLabel + ' limit.'
        };
      }

      /* ── 44ADA ── */
      if (scheme === '44ADA') {
        // Entity check: individual only
        if (entityType !== 'individual') {
          return {
            eligible: false,
            reason:
              'Section 44ADA is available only to resident individuals engaged in a specified profession. Entity type "' +
              entityType + '" is not eligible.'
          };
        }

        // Profession check (advisory — caller should pass this)
        if (options.isSpecifiedProfession === false) {
          return {
            eligible: false,
            reason:
              'Section 44ADA requires the individual to be engaged in a profession notified under Section 44AA(1) ' +
              '(e.g., legal, medical, engineering, accountancy, architecture, interior decoration, technical consultancy, film arts).'
          };
        }

        // Turnover / receipt limit
        var cashPercentADA = turnover > 0 ? cashTurnover / turnover : 0;
        var applicableLimitADA =
          cashPercentADA < data.cashThreshold ? data.enhancedLimit : data.receiptLimit;
        var limitLabelADA =
          applicableLimitADA === data.enhancedLimit
            ? '₹75 lakh (enhanced — cash receipts < 5%)'
            : '₹50 lakh';

        if (turnover > applicableLimitADA) {
          return {
            eligible: false,
            reason:
              'Gross receipts of ₹' + turnover.toLocaleString('en-IN') +
              ' exceed the ' + limitLabelADA + ' limit for Section 44ADA.'
          };
        }

        return {
          eligible: true,
          reason:
            'Eligible for Section 44ADA. Gross receipts ₹' + turnover.toLocaleString('en-IN') +
            ' are within the ' + limitLabelADA + ' limit.'
        };
      }

      /* ── 44AE ── */
      // Entity check: individual, HUF, or partnership firm
      var allowedEntities44AE = ['individual', 'huf', 'firm'];
      if (allowedEntities44AE.indexOf(entityType) === -1) {
        return {
          eligible: false,
          reason:
            'Section 44AE is available only to individuals, HUFs, and partnership firms. Entity type "' +
            entityType + '" is not eligible.'
        };
      }

      var vehicleCount = options.vehicleCount !== undefined ? options.vehicleCount : 0;
      requireNonNegativeNumber(vehicleCount, 'options.vehicleCount');
      if (vehicleCount !== Math.floor(vehicleCount)) {
        throw new Error('vehicleCount must be a whole number.');
      }

      if (vehicleCount > data.vehicleLimit) {
        return {
          eligible: false,
          reason:
            'Section 44AE is limited to assessees owning at most ' + data.vehicleLimit +
            ' goods carriages. You specified ' + vehicleCount + ' vehicles.'
        };
      }

      return {
        eligible: true,
        reason:
          'Eligible for Section 44AE with ' + vehicleCount + ' vehicle(s) (limit: ' +
          data.vehicleLimit + ').'
      };
    },

    /* ─────────────────────────────────────────────────────────
     * 3. computeRegularBusinessIncome
     * ───────────────────────────────────────────────────────── */

    /**
     * Compute net business income under regular (non-presumptive) accounting.
     *
     * Net Income = Revenue − Allowable Expenses − Depreciation
     *
     * @param {number} revenue      - Gross revenue / turnover.
     * @param {number} expenses     - Total allowable business expenses.
     * @param {number} depreciation - Depreciation claimed (can be computed via
     *                                {@link computeDepreciation}).
     *
     * @returns {{ netBusinessIncome: number, revenue: number, expenses: number, depreciation: number }}
     * @throws {Error} If any input is not a valid finite number.
     */
    computeRegularBusinessIncome: function (revenue, expenses, depreciation) {
      revenue = requireNonNegativeNumber(revenue, 'revenue');
      expenses = requireNonNegativeNumber(expenses, 'expenses');
      depreciation = requireNonNegativeNumber(depreciation, 'depreciation');

      var netIncome = revenue - expenses - depreciation;

      return {
        netBusinessIncome: netIncome,
        revenue: revenue,
        expenses: expenses,
        depreciation: depreciation
      };
    },

    /* ─────────────────────────────────────────────────────────
     * 4. computeDepreciation  (WDV method)
     * ───────────────────────────────────────────────────────── */

    /**
     * Compute Written-Down-Value (WDV) depreciation for multiple asset blocks.
     *
     * Depreciation for each block:
     *   `rate × (openingWDV + additions − deletions)`
     *
     * If additions were made in the **second half** of the financial year,
     * those additions attract depreciation at only **50 %** of the normal rate.
     *
     * @param {Array<Object>} assets - Array of asset block descriptors.
     * @param {string}  assets[].block        - Block name / identifier (e.g., "Plant & Machinery").
     * @param {number}  assets[].openingWDV   - Opening written-down value.
     * @param {number}  assets[].additions    - Capital additions during the year.
     * @param {number}  assets[].deletions    - Assets sold / scrapped during the year.
     * @param {number}  assets[].rate         - Depreciation rate as a decimal (e.g., 0.15 for 15 %).
     * @param {boolean} [assets[].addedInSecondHalf=false]
     *        Whether the additions were made in the second half of the FY
     *        (i.e., on or after 1 October). If true, additions are depreciated
     *        at 50 % of the specified rate.
     *
     * @returns {{ blocks: Array<Object>, totalDepreciation: number }}
     *   - `blocks` — per-block depreciation details.
     *   - `totalDepreciation` — sum of all block depreciation amounts.
     *
     * @throws {Error} On invalid input.
     */
    computeDepreciation: function (assets) {
      if (!Array.isArray(assets) || assets.length === 0) {
        throw new Error('assets must be a non-empty array of asset block objects.');
      }

      var totalDepreciation = 0;
      var blocks = [];

      for (var i = 0; i < assets.length; i++) {
        var a = assets[i];

        if (!a || typeof a !== 'object') {
          throw new Error('Each asset entry must be an object. Index ' + i + ' is invalid.');
        }

        var block = a.block || 'Block ' + (i + 1);
        var openingWDV = requireNonNegativeNumber(a.openingWDV, 'assets[' + i + '].openingWDV');
        var additions = requireNonNegativeNumber(a.additions, 'assets[' + i + '].additions');
        var deletions = requireNonNegativeNumber(a.deletions, 'assets[' + i + '].deletions');
        var rate = requireNonNegativeNumber(a.rate, 'assets[' + i + '].rate');

        if (rate > 1) {
          throw new Error(
            'assets[' + i + '].rate should be a decimal (e.g. 0.15 for 15%). Received: ' + rate
          );
        }

        var addedInSecondHalf = !!a.addedInSecondHalf;

        // Base on which to compute depreciation
        var base = openingWDV - deletions; // existing assets after sales
        if (base < 0) {
          // More deletions than opening → short-term capital gain territory.
          // Depreciation on existing assets is 0; the negative base is a STCG,
          // but we report it here for transparency.
          base = 0;
        }

        var depreciationOnExisting = base * rate;

        // Additions: full rate or 50 % rate
        var effectiveRateOnAdditions = addedInSecondHalf ? rate * 0.5 : rate;
        var depreciationOnAdditions = additions * effectiveRateOnAdditions;

        var blockDepreciation = depreciationOnExisting + depreciationOnAdditions;

        // Closing WDV
        var closingWDV = openingWDV + additions - deletions - blockDepreciation;
        // If closing WDV goes negative (theoretically shouldn't if rates < 100%)
        // we clamp to 0 and treat the excess as STCG.
        if (closingWDV < 0) {
          blockDepreciation = openingWDV + additions - deletions;
          closingWDV = 0;
        }

        totalDepreciation += blockDepreciation;

        blocks.push({
          block: block,
          openingWDV: openingWDV,
          additions: additions,
          deletions: deletions,
          rate: rate,
          addedInSecondHalf: addedInSecondHalf,
          effectiveRateOnAdditions: effectiveRateOnAdditions,
          depreciationOnExisting: depreciationOnExisting,
          depreciationOnAdditions: depreciationOnAdditions,
          totalBlockDepreciation: blockDepreciation,
          closingWDV: closingWDV
        });
      }

      return {
        blocks: blocks,
        totalDepreciation: totalDepreciation
      };
    },

    /* ─────────────────────────────────────────────────────────
     * 5. estimateGST
     * ───────────────────────────────────────────────────────── */

    /**
     * Estimate the GST component for a given turnover / transaction value.
     *
     * - **Inclusive**: The supplied `turnover` already includes GST.
     *   GST = turnover × gstRate / (1 + gstRate)
     *
     * - **Exclusive** (default): The supplied `turnover` is the base price.
     *   GST = turnover × gstRate
     *
     * @param {number}  turnover  - Transaction / turnover value in INR.
     * @param {number}  gstRate   - GST rate as a decimal (e.g. 0.18 for 18 %).
     * @param {boolean} [inclusive=false] - Whether `turnover` is GST-inclusive.
     *
     * @returns {{ baseValue: number, gstAmount: number, totalValue: number, gstRate: number, inclusive: boolean }}
     * @throws {Error} On invalid input.
     */
    estimateGST: function (turnover, gstRate, inclusive) {
      turnover = requireNonNegativeNumber(turnover, 'turnover');
      gstRate = requireNonNegativeNumber(gstRate, 'gstRate');

      if (gstRate > 1) {
        throw new Error(
          'gstRate should be a decimal (e.g. 0.18 for 18%). Received: ' + gstRate
        );
      }

      inclusive = !!inclusive;

      var gstAmount, baseValue, totalValue;

      if (inclusive) {
        gstAmount = turnover * gstRate / (1 + gstRate);
        baseValue = turnover - gstAmount;
        totalValue = turnover;
      } else {
        gstAmount = turnover * gstRate;
        baseValue = turnover;
        totalValue = turnover + gstAmount;
      }

      // Round to 2 decimal places for currency precision
      gstAmount = Math.round(gstAmount * 100) / 100;
      baseValue = Math.round(baseValue * 100) / 100;
      totalValue = Math.round(totalValue * 100) / 100;

      return {
        baseValue: baseValue,
        gstAmount: gstAmount,
        totalValue: totalValue,
        gstRate: gstRate,
        inclusive: inclusive
      };
    },

    /* ─────────────────────────────────────────────────────────
     * 6. isGSTRegistrationRequired
     * ───────────────────────────────────────────────────────── */

    /**
     * Determine whether GST registration is mandatory based on turnover.
     *
     * | Category                     | Regular State | Special Category State |
     * |------------------------------|---------------|------------------------|
     * | Goods (manufacturer/trader)  | ≥ ₹40 lakh    | ≥ ₹20 lakh             |
     * | Services (service provider)  | ≥ ₹20 lakh    | ≥ ₹10 lakh             |
     *
     * @param {number}  turnover    - Aggregate annual turnover in INR.
     * @param {boolean} isService   - `true` if the business is primarily service-based.
     * @param {Object}  [options={}]
     * @param {string}  [options.state] - State name. If it belongs to the special
     *        category list, the lower threshold applies.
     *
     * @returns {{ required: boolean, threshold: number, currentTurnover: number, state: string|null, isSpecialCategory: boolean }}
     * @throws {Error} On invalid input.
     */
    isGSTRegistrationRequired: function (turnover, isService, options) {
      turnover = requireNonNegativeNumber(turnover, 'turnover');

      if (typeof isService !== 'boolean') {
        throw new Error('isService must be a boolean. Received: ' + isService);
      }

      options = options || {};
      var state = options.state || null;
      var isSpecialCategory = false;

      if (state && typeof state === 'string') {
        for (var s = 0; s < SPECIAL_CATEGORY_STATES.length; s++) {
          if (
            SPECIAL_CATEGORY_STATES[s].toLowerCase() === state.trim().toLowerCase()
          ) {
            isSpecialCategory = true;
            break;
          }
        }
      }

      var threshold;

      if (isService) {
        threshold = isSpecialCategory ? 1000000 : 2000000; // ₹10L / ₹20L
      } else {
        threshold = isSpecialCategory ? 2000000 : 4000000; // ₹20L / ₹40L
      }

      var required = turnover >= threshold;

      return {
        required: required,
        threshold: threshold,
        currentTurnover: turnover,
        state: state,
        isSpecialCategory: isSpecialCategory
      };
    }
  };
})();
