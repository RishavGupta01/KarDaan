/**
 * @file tax-engine.js
 * @description Core tax computation engine for KarDaan (FY 2025-26, AY 2026-27).
 *              Computes tax under Old vs New Regime, handles rebates, surcharges, and set-offs.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  if (!window.TaxData) {
    throw new Error('[TaxEngine] window.TaxData is required. Load tax-data.js first.');
  }

  var TD = window.TaxData;

  window.TaxEngine = {
    /**
     * Compute progressive slab-based tax.
     * @param {number} income
     * @param {Array<Object>} slabs
     * @returns {number} Slab tax
     */
    computeSlabTax: function (income, slabs) {
      if (income <= 0) return 0;
      var tax = 0;
      for (var i = 0; i < slabs.length; i++) {
        var slab = slabs[i];
        if (income > slab.min) {
          var taxableInSlab = Math.min(income, slab.max) - slab.min;
          tax += taxableInSlab * slab.rate;
        }
      }
      return Math.round(tax * 100) / 100;
    },

    /**
     * Get applicable slabs for Old Regime based on age category.
     * @param {string} ageCategory - 'below60', 'senior', 'superSenior'
     * @returns {Array<Object>} Slabs
     */
    getOldRegimeSlabs: function (ageCategory) {
      if (ageCategory === 'superSenior') return TD.oldRegime.slabs.superSenior;
      if (ageCategory === 'senior') return TD.oldRegime.slabs.senior;
      return TD.oldRegime.slabs.below60;
    },

    /**
     * Compute gross income from all heads.
     * @param {Object} incomeData
     * @param {string} regime - 'old' | 'new'
     * @param {string} ageCategory - 'below60' | 'senior' | 'superSenior'
     * @returns {Object} Head-wise and gross income
     */
    computeGrossIncome: function (incomeData, regime, ageCategory) {
      var salaryGross = incomeData.salary ? Number(incomeData.salary.grossSalary || 0) : 0;
      
      // Calculate standard deduction
      var stdDeductionLimit = regime === 'new' ? TD.newRegime.standardDeduction : TD.oldRegime.standardDeduction;
      var salaryStdDeduction = salaryGross > 0 ? Math.min(salaryGross, stdDeductionLimit) : 0;
      var salaryNet = Math.max(0, salaryGross - salaryStdDeduction);

      // House Property Income
      var hpIncome = 0;
      var hpDetails = [];
      if (incomeData.houseProperty && Array.isArray(incomeData.houseProperty)) {
        for (var i = 0; i < incomeData.houseProperty.length; i++) {
          var prop = incomeData.houseProperty[i];
          var annualRent = Number(prop.annualRent || 0);
          var munTax = Number(prop.municipalTax || 0);
          var netAnnualValue = Math.max(0, annualRent - munTax);
          
          var stdDedHP = prop.type === 'letOut' ? netAnnualValue * 0.30 : 0;
          var loanInterest = Number(prop.interestOnLoan || 0);
          
          var netPropIncome = 0;
          if (prop.type === 'selfOccupied') {
            // self occupied has zero NAV
            netPropIncome = regime === 'old' ? -Math.min(loanInterest, TD.deductions['24b'].selfOccupiedLimit) : 0;
          } else {
            // let out
            netPropIncome = netAnnualValue - stdDedHP - loanInterest;
          }

          hpIncome += netPropIncome;
          hpDetails.push({
            type: prop.type,
            netAnnualValue: netAnnualValue,
            stdDeduction: stdDedHP,
            interestDeduction: loanInterest,
            netIncome: netPropIncome
          });
        }
      }

      // Business & Professional Income
      var businessIncome = 0;
      if (incomeData.business) {
        var biz = incomeData.business;
        if (biz.type === '44AD' || biz.type === '44ADA' || biz.type === '44AE') {
          var presumptive = window.BusinessTaxCalculator.computePresumptiveIncome(
            biz.type, 
            biz.turnover, 
            biz.cashTurnover, 
            { vehicleCount: biz.vehicleCount, vehicleType: biz.vehicleType }
          );
          businessIncome = presumptive.presumptiveIncome;
        } else if (biz.type === 'regular') {
          var regular = window.BusinessTaxCalculator.computeRegularBusinessIncome(
            biz.turnover || 0,
            biz.expenses || 0,
            biz.depreciation || 0
          );
          businessIncome = regular.netBusinessIncome;
        }
      }

      // Capital Gains (Gains must be pre-set-off via CapitalGainsCalculator)
      var capitalGainsNet = { stcg: 0, ltcg: 0, taxableLtcgListed: 0 };
      if (incomeData.capitalGains) {
        var cgList = [];
        var cg = incomeData.capitalGains;
        
        if (cg.listed) {
          cgList.push({ assetType: 'listed', buyDate: '2024-01-01', sellDate: '2025-01-01', sellPrice: cg.listed.ltcg || 0, buyPrice: 0, classification: 'LTCG', grossGains: cg.listed.ltcg || 0 });
          cgList.push({ assetType: 'listed', buyDate: '2024-01-01', sellDate: '2024-06-01', sellPrice: cg.listed.stcg || 0, buyPrice: 0, classification: 'STCG', grossGains: cg.listed.stcg || 0 });
        }
        if (cg.property) {
          cgList.push({ assetType: 'property', buyDate: '2020-01-01', sellDate: '2025-01-01', sellPrice: cg.property.ltcg || 0, buyPrice: 0, classification: 'LTCG', grossGains: cg.property.ltcg || 0 });
          cgList.push({ assetType: 'property', buyDate: '2024-01-01', sellDate: '2024-06-01', sellPrice: cg.property.stcg || 0, buyPrice: 0, classification: 'STCG', grossGains: cg.property.stcg || 0 });
        }
        if (cg.gold) {
          cgList.push({ assetType: 'gold', buyDate: '2020-01-01', sellDate: '2025-01-01', sellPrice: cg.gold.ltcg || 0, buyPrice: 0, classification: 'LTCG', grossGains: cg.gold.ltcg || 0 });
          cgList.push({ assetType: 'gold', buyDate: '2024-01-01', sellDate: '2024-06-01', sellPrice: cg.gold.stcg || 0, buyPrice: 0, classification: 'STCG', grossGains: cg.gold.stcg || 0 });
        }
        if (cg.unlisted) {
          cgList.push({ assetType: 'unlisted', buyDate: '2020-01-01', sellDate: '2025-01-01', sellPrice: cg.unlisted.ltcg || 0, buyPrice: 0, classification: 'LTCG', grossGains: cg.unlisted.ltcg || 0 });
          cgList.push({ assetType: 'unlisted', buyDate: '2024-01-01', sellDate: '2024-06-01', sellPrice: cg.unlisted.stcg || 0, buyPrice: 0, classification: 'STCG', grossGains: cg.unlisted.stcg || 0 });
        }
        if (cg.debt) {
          cgList.push({ assetType: 'debtFunds', buyDate: '2020-01-01', sellDate: '2025-01-01', sellPrice: cg.debt.gains || 0, buyPrice: 0, classification: 'STCG', grossGains: cg.debt.gains || 0 });
        }

        var netCg = window.CapitalGainsCalculator.computeNetCapitalGains(cgList);
        capitalGainsNet.stcg = netCg.stcg;
        capitalGainsNet.ltcg = netCg.ltcg;
        
        // Specifically identify LTCG on listed equity which has ₹1.25L exemption
        var listedLTCG = cg.listed ? Number(cg.listed.ltcg || 0) : 0;
        capitalGainsNet.taxableLtcgListed = Math.max(0, listedLTCG - TD.capitalGains.listed.ltcgExemption);
      }

      // Other Sources
      var otherGross = 0;
      if (incomeData.otherSources) {
        var os = incomeData.otherSources;
        otherGross += Number(os.savingsInterest || 0);
        otherGross += Number(os.fdInterest || 0);
        otherGross += Number(os.dividends || 0);
        otherGross += Number(os.gifts || 0);
        otherGross += Number(os.lottery || 0);
        otherGross += Number(os.other || 0);
      }

      var grossTotalIncome = salaryNet + hpIncome + businessIncome + otherGross;

      return {
        heads: {
          salaryGross: salaryGross,
          salaryStdDeduction: salaryStdDeduction,
          salaryNet: salaryNet,
          houseProperty: hpIncome,
          hpDetails: hpDetails,
          business: businessIncome,
          stcg: capitalGainsNet.stcg,
          ltcg: capitalGainsNet.ltcg,
          taxableLtcgListed: capitalGainsNet.taxableLtcgListed,
          otherSources: otherGross
        },
        grossTotalIncome: grossTotalIncome
      };
    },

    /**
     * Compute eligible deductions for Old Regime.
     * @param {Object} deductionsData
     * @param {Object} incomeHeads
     * @param {string} ageCategory
     * @returns {Object} Section-wise deductions and total
     */
    computeDeductionsOldRegime: function (deductionsData, incomeHeads, ageCategory) {
      var results = {};
      var total = 0;

      // 1. 80C + 80CCC + 80CCD(1) limit (1.5L)
      var limit80C = TD.deductions['80C'].limit;
      var claimed80C = Number(deductionsData['80C'] || 0) + 
                       Number(deductionsData['80CCC'] || 0) + 
                       Number(deductionsData['80CCD1'] || 0);
      results['80C'] = Math.min(claimed80C, limit80C);
      total += results['80C'];

      // 2. 80CCD(1B) NPS limit (50K)
      var claimed80CCD1B = Number(deductionsData['80CCD1B'] || 0);
      results['80CCD1B'] = Math.min(claimed80CCD1B, TD.deductions['80CCD1B'].limit);
      total += results['80CCD1B'];

      // 3. 80CCD(2) Employer NPS - 10% of (Basic + DA) under old regime
      var claimed80CCD2 = Number(deductionsData['80CCD2'] || 0);
      var basicPlusDA = Number(deductionsData.basicPlusDA || 0);
      var limit80CCD2 = basicPlusDA * TD.deductions['80CCD2'].limitPercent;
      results['80CCD2'] = Math.min(claimed80CCD2, limit80CCD2);
      total += results['80CCD2'];

      // 4. 80D Medical Insurance
      var selfLimit = ageCategory !== 'below60' ? TD.deductions['80D'].selfSeniorLimit : TD.deductions['80D'].selfLimit;
      var parentsLimit = deductionsData.parentsSenior ? TD.deductions['80D'].parentsSeniorLimit : TD.deductions['80D'].parentsLimit;
      
      var claimed80D_self = Number(deductionsData['80D_self'] || 0);
      var claimed80D_parents = Number(deductionsData['80D_parents'] || 0);
      
      results['80D'] = Math.min(claimed80D_self, selfLimit) + Math.min(claimed80D_parents, parentsLimit);
      total += results['80D'];

      // 5. 80E Education loan interest
      results['80E'] = Number(deductionsData['80E'] || 0);
      total += results['80E'];

      // 6. 80TTA / 80TTB
      var claimedTTA = Number(deductionsData['80TTA'] || 0);
      if (ageCategory !== 'below60') {
        // Senior citizens get 80TTB on both savings and FD interest up to 1L
        var claimedTTB = Number(deductionsData['80TTB'] || 0);
        results['80TTB'] = Math.min(claimedTTB, TD.deductions['80TTB'].limit);
        total += results['80TTB'];
      } else {
        // Non-seniors get 80TTA on savings interest up to 10k
        results['80TTA'] = Math.min(claimedTTA, TD.deductions['80TTA'].limit);
        total += results['80TTA'];
      }

      // 7. 80GG Rent Paid (if no HRA)
      if (deductionsData['80GG']) {
        var rentPaid = Number(deductionsData['80GG'].rentPaid || 0);
        var totalIncome = incomeHeads.salaryNet + incomeHeads.houseProperty + incomeHeads.business + incomeHeads.otherSources;
        var comp1 = TD.deductions['80GG'].monthlyLimit * 12; // 60,000
        var comp2 = totalIncome * TD.deductions['80GG'].percentLimit;
        var comp3 = Math.max(0, rentPaid - (totalIncome * 0.10));
        
        results['80GG'] = Math.min(comp1, comp2, comp3);
        total += results['80GG'];
      }

      // 8. Other deductions (80G, 80U, etc.)
      results['80G'] = Number(deductionsData['80G'] || 0);
      results['80U'] = Number(deductionsData['80U'] || 0);
      results['80DD'] = Number(deductionsData['80DD'] || 0);
      results['80DDB'] = Number(deductionsData['80DDB'] || 0);

      total += results['80G'] + results['80U'] + results['80DD'] + results['80DDB'];

      return {
        breakdown: results,
        total: total
      };
    },

    /**
     * Compute tax liability for a user.
     * @param {Object} userData
     * @returns {Object} Tax results for both regimes
     */
    computeFullTax: function (userData) {
      var age = Number(userData.profile.age || 30);
      var ageCategory = window.Utils.getAgeCategory(age);

      // 1. COMPUTE NEW TAX REGIME
      var newGross = this.computeGrossIncome(userData.income, 'new', ageCategory);
      var newDeductions = 0;
      
      // Employer NPS is allowed in new regime (14% limit)
      if (userData.deductions && userData.deductions['80CCD2']) {
        var basicPlusDA = Number(userData.deductions.basicPlusDA || 0);
        var claimed80CCD2 = Number(userData.deductions['80CCD2'] || 0);
        var limit80CCD2New = basicPlusDA * 0.14; // 14% for new regime
        newDeductions = Math.min(claimed80CCD2, limit80CCD2New);
      }

      var newTaxableSlabIncome = Math.max(0, newGross.grossTotalIncome - newDeductions);
      var newSlabTax = this.computeSlabTax(newTaxableSlabIncome, TD.newRegime.slabs);

      // Capital gains tax (New Regime)
      var newSTCG_tax = newGross.heads.stcg * TD.capitalGains.listed.stcgRate;
      var newLTCG_tax = newGross.heads.taxableLtcgListed * TD.capitalGains.listed.ltcgRate;
      var newCGTax = newSTCG_tax + newLTCG_tax;

      var newTaxBeforeRebate = newSlabTax + newCGTax;

      // Section 87A rebate for new regime (Enhanced in Budget 2025 to 12 Lakhs)
      var newRebate = 0;
      var totalTaxableIncomeNew = newTaxableSlabIncome + newGross.heads.stcg + newGross.heads.ltcg;
      
      if (totalTaxableIncomeNew <= TD.newRegime.rebate87A.limit) {
        // Section 87A rebate is capped at the tax on slab income + tax on STCG (not allowed on listed LTCG 112A)
        newRebate = Math.min(newSlabTax + newSTCG_tax, TD.newRegime.rebate87A.maxRebate);
      }

      var newTaxAfterRebate = Math.max(0, newTaxBeforeRebate - newRebate);

      // Surcharge (New Regime)
      var newSurcharge = 0;
      for (var s = 0; s < TD.surcharge.length; s++) {
        var sur = TD.surcharge[s];
        if (totalTaxableIncomeNew > sur.min && totalTaxableIncomeNew <= sur.max) {
          // New regime surcharge cap at 25%
          var rate = Math.min(sur.rate, 0.25);
          newSurcharge = newTaxAfterRebate * rate;
          break;
        }
      }

      var newCess = (newTaxAfterRebate + newSurcharge) * TD.cess;
      var newNetTax = newTaxAfterRebate + newSurcharge + newCess;

      // 2. COMPUTE OLD TAX REGIME
      var oldGross = this.computeGrossIncome(userData.income, 'old', ageCategory);
      var oldDeductionsResult = this.computeDeductionsOldRegime(userData.deductions || {}, oldGross.heads, ageCategory);
      
      var oldTaxableSlabIncome = Math.max(0, oldGross.grossTotalIncome - oldDeductionsResult.total);
      
      var oldSlabs = this.getOldRegimeSlabs(ageCategory);
      var oldSlabTax = this.computeSlabTax(oldTaxableSlabIncome, oldSlabs);

      // Capital gains tax (Old Regime)
      var oldSTCG_tax = oldGross.heads.stcg * TD.capitalGains.listed.stcgRate;
      var oldLTCG_tax = oldGross.heads.taxableLtcgListed * TD.capitalGains.listed.ltcgRate;
      var oldCGTax = oldSTCG_tax + oldLTCG_tax;

      var oldTaxBeforeRebate = oldSlabTax + oldCGTax;

      // Section 87A rebate for old regime (limit: 5 Lakhs)
      var oldRebate = 0;
      var totalTaxableIncomeOld = oldTaxableSlabIncome + oldGross.heads.stcg + oldGross.heads.ltcg;
      if (totalTaxableIncomeOld <= TD.oldRegime.rebate87A.limit) {
        oldRebate = Math.min(oldTaxBeforeRebate, TD.oldRegime.rebate87A.maxRebate);
      }

      var oldTaxAfterRebate = Math.max(0, oldTaxBeforeRebate - oldRebate);

      // Surcharge (Old Regime - up to 37% for >5Cr)
      var oldSurcharge = 0;
      for (var so = 0; so < TD.surcharge.length; so++) {
        var surO = TD.surcharge[so];
        if (totalTaxableIncomeOld > surO.min && totalTaxableIncomeOld <= surO.max) {
          // Old regime has 37% surcharge for >5Cr, else matching rates
          var r = surO.rate;
          if (totalTaxableIncomeOld > 50000000) r = 0.37;
          oldSurcharge = oldTaxAfterRebate * r;
          break;
        }
      }

      var oldCess = (oldTaxAfterRebate + oldSurcharge) * TD.cess;
      var oldNetTax = oldTaxAfterRebate + oldSurcharge + oldCess;

      // Determine recommended regime
      var recommended = newNetTax <= oldNetTax ? 'new' : 'old';
      var savings = Math.abs(oldNetTax - newNetTax);

      return {
        newRegime: {
          grossIncome: newGross.grossTotalIncome,
          standardDeduction: newGross.heads.salaryStdDeduction,
          otherDeductions: newDeductions,
          taxableSlabIncome: newTaxableSlabIncome,
          slabTax: newSlabTax,
          capitalGainsTax: newCGTax,
          rebate87A: newRebate,
          surcharge: newSurcharge,
          cess: newCess,
          netTax: newNetTax,
          heads: newGross.heads
        },
        oldRegime: {
          grossIncome: oldGross.grossTotalIncome,
          standardDeduction: oldGross.heads.salaryStdDeduction,
          otherDeductions: oldDeductionsResult.total,
          deductionsBreakdown: oldDeductionsResult.breakdown,
          taxableSlabIncome: oldTaxableSlabIncome,
          slabTax: oldSlabTax,
          capitalGainsTax: oldCGTax,
          rebate87A: oldRebate,
          surcharge: oldSurcharge,
          cess: oldCess,
          netTax: oldNetTax,
          heads: oldGross.heads
        },
        recommended: recommended,
        savings: savings
      };
    },

    /**
     * Compute Quarterly Advance Tax Installments.
     * Due Dates:
     * - June 15: 15%
     * - Sept 15: 45%
     * - Dec 15: 75%
     * - March 15: 100%
     * @param {number} annualNetTax
     * @returns {Array<Object>} Advance tax schedule
     */
    computeAdvanceTax: function (annualNetTax) {
      if (annualNetTax < 10000) {
        return []; // No advance tax required if tax is less than ₹10,000
      }
      return [
        { dueDate: '15 June 2025', cumulativePercent: 0.15, amount: annualNetTax * 0.15 },
        { dueDate: '15 September 2025', cumulativePercent: 0.45, amount: annualNetTax * 0.45 },
        { dueDate: '15 December 2025', cumulativePercent: 0.75, amount: annualNetTax * 0.75 },
        { dueDate: '15 March 2026', cumulativePercent: 1.00, amount: annualNetTax * 1.00 }
      ];
    }
  };
})();
