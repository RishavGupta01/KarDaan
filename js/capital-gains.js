/**
 * @file capital-gains.js
 * @description Capital gains calculator for Indian taxation (FY 2025-26, AY 2026-27).
 *              Supports listed equity, debt funds, property, gold, and grandfathering.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  if (!window.TaxData || !window.TaxData.capitalGains) {
    throw new Error('[CapitalGainsCalculator] window.TaxData.capitalGains is required.');
  }

  var cgRules = window.TaxData.capitalGains;

  // Simple inflation index table (CII - Cost Inflation Index) for indexation option
  var CII = {
    2001: 100, 2002: 105, 2003: 109, 2004: 113, 2005: 117, 2006: 122, 2007: 129,
    2008: 137, 2009: 148, 2010: 167, 2011: 184, 2012: 200, 2013: 220, 2014: 240,
    2015: 254, 2016: 272, 2017: 289, 2018: 280, 2019: 289, 2020: 301, 2021: 317,
    2022: 331, 2023: 348, 2024: 363, 2025: 375 // Estimate or actual for FY 2025-26
  };

  function getCII(year) {
    return CII[year] || 375;
  }

  function getMonthsBetweenDates(date1, date2) {
    var d1 = new Date(date1);
    var d2 = new Date(date2);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
    var months = (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth();
    return months >= 0 ? months : 0;
  }

  window.CapitalGainsCalculator = {
    /**
     * Classify a transaction as Short-Term or Long-Term Capital Gains.
     * @param {'listed'|'unlisted'|'property'|'gold'|'debtFunds'} assetType
     * @param {string} buyDate
     * @param {string} sellDate
     * @returns {'STCG'|'LTCG'}
     */
    classifyGains: function (assetType, buyDate, sellDate) {
      if (assetType === 'debtFunds') return 'STCG';
      
      var months = getMonthsBetweenDates(buyDate, sellDate);
      var threshold = 24; // Default for property, gold, unlisted
      
      if (assetType === 'listed') {
        threshold = 12; // Listed equities/mutual funds
      }

      return months > threshold ? 'LTCG' : 'STCG';
    },

    /**
     * Compute Grandfathering value under Section 112A for listed equity bought before Jan 31, 2018.
     * @param {number} sellPrice
     * @param {number} fmvJan2018 - Fair Market Value as on Jan 31, 2018
     * @param {number} buyPrice
     * @returns {number} Cost of Acquisition
     */
    computeLTCGWithGrandfathering: function (sellPrice, fmvJan2018, buyPrice) {
      // Step 1: Lower of FMV on Jan 31, 2018 and actual Sale Price
      var lowerVal = Math.min(fmvJan2018, sellPrice);
      // Step 2: Higher of the above value and actual Purchase Price
      return Math.max(lowerVal, buyPrice);
    },

    /**
     * Compare indexation (20%) vs no indexation (12.5%) for property bought before July 23, 2024.
     * @param {string} buyDate
     * @param {number} buyPrice
     * @param {string} sellDate
     * @param {number} sellPrice
     * @param {number} improvements - Cost of improvements (if any)
     * @returns {{ optimalRate: number, gains: number, tax: number, explanation: string }}
     */
    computePropertyGainsWithChoice: function (buyDate, buyPrice, sellDate, sellPrice, improvements) {
      improvements = improvements || 0;
      var buyYear = new Date(buyDate).getFullYear();
      var sellYear = new Date(sellDate).getFullYear();
      
      var isBeforeCutoff = new Date(buyDate) < new Date('2024-07-23');

      // Option A: 12.5% Flat Rate without Indexation
      var gainsNoIndex = sellPrice - buyPrice - improvements;
      var taxNoIndex = gainsNoIndex > 0 ? gainsNoIndex * 0.125 : 0;

      if (!isBeforeCutoff) {
        return {
          optimalRate: 0.125,
          gains: gainsNoIndex,
          tax: taxNoIndex,
          explanation: 'Property acquired on/after July 23, 2024. Must use new flat rate of 12.5% without indexation.'
        };
      }

      // Option B: 20% Rate with Indexation
      var ciiBuy = getCII(buyYear);
      var ciiSell = getCII(sellYear);
      
      var indexedCost = buyPrice * (ciiSell / ciiBuy);
      var gainsWithIndex = sellPrice - indexedCost - improvements;
      var taxWithIndex = gainsWithIndex > 0 ? gainsWithIndex * 0.20 : 0;

      if (taxWithIndex < taxNoIndex) {
        return {
          optimalRate: 0.20,
          gains: gainsWithIndex,
          tax: taxWithIndex,
          explanation: 'Option selected: 20% with indexation (saves ₹' + Math.round(taxNoIndex - taxWithIndex) + ' over flat 12.5% option).'
        };
      } else {
        return {
          optimalRate: 0.125,
          gains: gainsNoIndex,
          tax: taxNoIndex,
          explanation: 'Option selected: 12.5% flat without indexation (saves ₹' + Math.round(taxWithIndex - taxNoIndex) + ' over indexed 20% option).'
        };
      }
    },

    /**
     * Calculate gains for a set of transactions.
     * @param {Array<Object>} transactions
     * @returns {Array<Object>}
     */
    calculateGains: function (transactions) {
      if (!Array.isArray(transactions)) return [];
      
      var results = [];
      for (var i = 0; i < transactions.length; i++) {
        var tx = transactions[i];
        var classification = this.classifyGains(tx.assetType, tx.buyDate, tx.sellDate);
        var cost = tx.buyPrice;

        // Apply grandfathering if applicable
        if (tx.assetType === 'listed' && classification === 'LTCG' && tx.fmvJan2018 && new Date(tx.buyDate) < new Date('2018-01-31')) {
          cost = this.computeLTCGWithGrandfathering(tx.sellPrice, tx.fmvJan2018, tx.buyPrice);
        }

        var grossGains = tx.sellPrice - cost - (tx.expenses || 0);

        results.push({
          id: tx.id || i,
          assetType: tx.assetType,
          classification: classification,
          grossGains: grossGains,
          costOfAcquisition: cost,
          taxableGains: grossGains > 0 ? grossGains : 0
        });
      }
      return results;
    },

    /**
     * Compute exemptions under Section 54 (house), 54F (other assets), 54EC (infra bonds).
     * @param {number} taxableGains
     * @param {Object} reinvestments - e.g. { sec54: amount, sec54F: amount, sec54EC: amount }
     * @returns {number} Exempt amount
     */
    computeExemptions: function (taxableGains, reinvestments) {
      if (!reinvestments || taxableGains <= 0) return 0;
      var exemption = 0;
      
      // Section 54: reinvestment in residential property (up to 10 Cr cap)
      if (reinvestments.sec54) {
        exemption += Math.min(taxableGains, reinvestments.sec54, 100000000);
      }
      
      // Section 54EC: infrastructure bonds (max 50 Lakhs limit)
      if (reinvestments.sec54EC) {
        exemption += Math.min(taxableGains - exemption, reinvestments.sec54EC, 5000000);
      }

      // Section 54F: net consideration reinvestment in house
      if (reinvestments.sec54F) {
        exemption += Math.min(taxableGains - exemption, reinvestments.sec54F);
      }

      return exemption;
    },

    /**
     * Aggregate all capital gains and perform legally allowed set-offs.
     * Income Tax rules for capital gains set-off:
     * 1. STCL (Short-Term Capital Loss) can be set off against both STCG and LTCG.
     * 2. LTCL (Long-Term Capital Loss) can ONLY be set off against LTCG.
     * @param {Array<Object>} calculatedGains
     * @returns {{ stcg: number, ltcg: number, stclCarryForward: number, ltclCarryForward: number }}
     */
    computeNetCapitalGains: function (calculatedGains) {
      var netLTCG = 0;
      var netSTCG = 0;
      var ltcl = 0;
      var stcl = 0;

      for (var i = 0; i < calculatedGains.length; i++) {
        var tx = calculatedGains[i];
        if (tx.classification === 'LTCG') {
          if (tx.grossGains > 0) {
            netLTCG += tx.grossGains;
          } else {
            ltcl += Math.abs(tx.grossGains);
          }
        } else {
          if (tx.grossGains > 0) {
            netSTCG += tx.grossGains;
          } else {
            stcl += Math.abs(tx.grossGains);
          }
        }
      }

      // 1. Set off LTCL against LTCG
      if (ltcl > 0) {
        if (netLTCG >= ltcl) {
          netLTCG -= ltcl;
          ltcl = 0;
        } else {
          ltcl -= netLTCG;
          netLTCG = 0;
        }
      }

      // 2. Set off STCL against STCG
      if (stcl > 0) {
        if (netSTCG >= stcl) {
          netSTCG -= stcl;
          stcl = 0;
        } else {
          stcl -= netSTCG;
          netSTCG = 0;
        }
      }

      // 3. Set off remaining STCL against remaining LTCG (if any)
      if (stcl > 0 && netLTCG > 0) {
        if (netLTCG >= stcl) {
          netLTCG -= stcl;
          stcl = 0;
        } else {
          stcl -= netLTCG;
          netLTCG = 0;
        }
      }

      return {
        stcg: netSTCG,
        ltcg: netLTCG,
        stclCarryForward: stcl,
        ltclCarryForward: ltcl
      };
    }
  };
})();
