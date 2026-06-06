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
    computeGrossIncome: function (incomeData, regime, ageCategory, filingType) {
      var isNonIndividual = (filingType === 'company' || filingType === 'firm' || filingType === 'llp');
      var salaryGross = (!isNonIndividual && incomeData.salary) ? Number(incomeData.salary.grossSalary || 0) : 0;
      
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
          
          var stdDedHP = prop.type === 'letOut' ? Math.round(netAnnualValue * 0.30) : 0;
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

      // House Property Set-off rules
      var hpSetOff = hpIncome;
      if (hpIncome < 0) {
        if (regime === 'new') {
          hpSetOff = 0; // Disallowed to set off against other heads in New Regime
        } else {
          hpSetOff = Math.max(hpIncome, -200000); // Capped at 2 Lakhs loss set-off in Old Regime
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

      // Capital Gains (Detailed classification and Section 70/74 set-off rules)
      var setoffDetails = {
        initial: {
          listedLtcg: 0,
          listedLtcgLoss: 0,
          otherLtcg: 0,
          otherLtcgLoss: 0,
          listedStcg: 0,
          listedStcgLoss: 0,
          slabStcg: 0,
          slabStcgLoss: 0
        },
        applied: {
          ltclAgainstOtherLtcg: 0,
          ltclAgainstListedLtcg: 0,
          stclAgainstSlabStcg: 0,
          stclAgainstListedStcg: 0,
          stclAgainstOtherLtcg: 0,
          stclAgainstListedLtcg: 0
        },
        final: {
          listedLtcg: 0,
          otherLtcg: 0,
          listedStcg: 0,
          slabStcg: 0,
          stclCarryForward: 0,
          ltclCarryForward: 0
        }
      };

      if (incomeData.capitalGains) {
        var cg = incomeData.capitalGains;
        
        var listedLtcgVal = Number(cg.listed ? cg.listed.ltcg || 0 : 0);
        var listedStcgVal = Number(cg.listed ? cg.listed.stcg || 0 : 0);
        var propertyLtcgVal = Number(cg.property ? cg.property.ltcg || 0 : 0);
        var propertyStcgVal = Number(cg.property ? cg.property.stcg || 0 : 0);
        var goldLtcgVal = Number(cg.gold ? cg.gold.ltcg || 0 : 0);
        var goldStcgVal = Number(cg.gold ? cg.gold.stcg || 0 : 0);
        var debtGainsVal = Number(cg.debt ? cg.debt.gains || 0 : 0);

        var listedLtcgGains = Math.max(0, listedLtcgVal);
        var listedLtcgLoss = Math.max(0, -listedLtcgVal);
        var listedStcgGains = Math.max(0, listedStcgVal);
        var listedStcgLoss = Math.max(0, -listedStcgVal);

        var otherLtcgGains = Math.max(0, propertyLtcgVal) + Math.max(0, goldLtcgVal);
        var otherLtcgLoss = Math.max(0, -propertyLtcgVal) + Math.max(0, -goldLtcgVal);

        var slabStcgGains = Math.max(0, propertyStcgVal) + Math.max(0, goldStcgVal) + Math.max(0, debtGainsVal);
        var slabStcgLoss = Math.max(0, -propertyStcgVal) + Math.max(0, -goldStcgVal);

        setoffDetails.initial = {
          listedLtcg: listedLtcgGains,
          listedLtcgLoss: listedLtcgLoss,
          otherLtcg: otherLtcgGains,
          otherLtcgLoss: otherLtcgLoss,
          listedStcg: listedStcgGains,
          listedStcgLoss: listedStcgLoss,
          slabStcg: slabStcgGains,
          slabStcgLoss: slabStcgLoss
        };

        // 1. Set off LTCL against LTCG
        var totalLtcl = listedLtcgLoss + otherLtcgLoss;
        var remainingOtherLtcg = otherLtcgGains;
        var remainingListedLtcg = listedLtcgGains;

        if (totalLtcl > 0) {
          // Set off against otherLtcg first (12.5% rate, no exemption) to preserve listedLtcg exemption
          if (remainingOtherLtcg >= totalLtcl) {
            setoffDetails.applied.ltclAgainstOtherLtcg = totalLtcl;
            remainingOtherLtcg -= totalLtcl;
            totalLtcl = 0;
          } else {
            setoffDetails.applied.ltclAgainstOtherLtcg = remainingOtherLtcg;
            totalLtcl -= remainingOtherLtcg;
            remainingOtherLtcg = 0;
            
            // Set off against listedLtcg
            if (remainingListedLtcg >= totalLtcl) {
              setoffDetails.applied.ltclAgainstListedLtcg = totalLtcl;
              remainingListedLtcg -= totalLtcl;
              totalLtcl = 0;
            } else {
              setoffDetails.applied.ltclAgainstListedLtcg = remainingListedLtcg;
              totalLtcl -= remainingListedLtcg;
              remainingListedLtcg = 0;
            }
          }
        }

        // 2. Set off STCL
        var totalStcl = listedStcgLoss + slabStcgLoss;
        var remainingSlabStcg = slabStcgGains;
        var remainingListedStcg = listedStcgGains;

        if (totalStcl > 0) {
          // A. Slab STCG first (taxed at progressive rates)
          if (remainingSlabStcg >= totalStcl) {
            setoffDetails.applied.stclAgainstSlabStcg = totalStcl;
            remainingSlabStcg -= totalStcl;
            totalStcl = 0;
          } else {
            setoffDetails.applied.stclAgainstSlabStcg = remainingSlabStcg;
            totalStcl -= remainingSlabStcg;
            remainingSlabStcg = 0;
          }

          // B. Listed STCG next (20% rate)
          if (totalStcl > 0) {
            if (remainingListedStcg >= totalStcl) {
              setoffDetails.applied.stclAgainstListedStcg = totalStcl;
              remainingListedStcg -= totalStcl;
              totalStcl = 0;
            } else {
              setoffDetails.applied.stclAgainstListedStcg = remainingListedStcg;
              totalStcl -= remainingListedStcg;
              remainingListedStcg = 0;
            }
          }

          // C. Other LTCG next (12.5% rate, no exemption)
          if (totalStcl > 0) {
            if (remainingOtherLtcg >= totalStcl) {
              setoffDetails.applied.stclAgainstOtherLtcg = totalStcl;
              remainingOtherLtcg -= totalStcl;
              totalStcl = 0;
            } else {
              setoffDetails.applied.stclAgainstOtherLtcg = remainingOtherLtcg;
              totalStcl -= remainingOtherLtcg;
              remainingOtherLtcg = 0;
            }
          }

          // D. Listed LTCG last (12.5% rate, has ₹1.25L exemption)
          if (totalStcl > 0) {
            if (remainingListedLtcg >= totalStcl) {
              setoffDetails.applied.stclAgainstListedLtcg = totalStcl;
              remainingListedLtcg -= totalStcl;
              totalStcl = 0;
            } else {
              setoffDetails.applied.stclAgainstListedLtcg = remainingListedLtcg;
              totalStcl -= remainingListedLtcg;
              remainingListedLtcg = 0;
            }
          }
        }

        setoffDetails.final = {
          listedLtcg: remainingListedLtcg,
          otherLtcg: remainingOtherLtcg,
          listedStcg: remainingListedStcg,
          slabStcg: remainingSlabStcg,
          stclCarryForward: totalStcl,
          ltclCarryForward: totalLtcl
        };
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

      var grossTotalIncome = salaryNet + hpSetOff + businessIncome + otherGross + 
                             setoffDetails.final.slabStcg + 
                             setoffDetails.final.listedStcg + 
                             setoffDetails.final.listedLtcg + 
                             setoffDetails.final.otherLtcg;

      return {
        heads: {
          salaryGross: salaryGross,
          salaryStdDeduction: salaryStdDeduction,
          salaryNet: salaryNet,
          houseProperty: hpIncome,
          hpSetOff: hpSetOff,
          hpDetails: hpDetails,
          business: businessIncome,
          stcg: setoffDetails.final.slabStcg + setoffDetails.final.listedStcg,
          ltcg: setoffDetails.final.listedLtcg + setoffDetails.final.otherLtcg,
          stcgListed: setoffDetails.final.listedStcg,
          stcgSlab: setoffDetails.final.slabStcg,
          ltcgListed: setoffDetails.final.listedLtcg,
          ltcgOther: setoffDetails.final.otherLtcg,
          taxableLtcgListed: Math.max(0, setoffDetails.final.listedLtcg - TD.capitalGains.listed.ltcgExemption),
          otherSources: otherGross,
          setoffDetails: setoffDetails
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
    computeDeductionsOldRegime: function (deductionsData, incomeHeads, ageCategory, filingType) {
      var results = {};
      var total = 0;

      // 1. 80C + 80CCC + 80CCD(1) limit (1.5L)
      var limit80C = TD.deductions['80C'].limit;
      var claimed80C = Number(deductionsData['80C'] || 0) + 
                       Number(deductionsData['80CCC'] || 0) + 
                       Number(deductionsData['80CCD1'] || 0);
      results['80C'] = Math.min(claimed80C, limit80C);

      // 2. 80CCD(1B) NPS limit (50K)
      var claimed80CCD1B = Number(deductionsData['80CCD1B'] || 0);
      results['80CCD1B'] = Math.min(claimed80CCD1B, TD.deductions['80CCD1B'].limit);

      // 3. 80CCD(2) Employer NPS - 10% of (Basic + DA) under old regime
      var claimed80CCD2 = Number(deductionsData['80CCD2'] || 0);
      var basicPlusDA = Number(deductionsData.basicPlusDA || 0);
      var limit80CCD2 = basicPlusDA * TD.deductions['80CCD2'].limitPercent;
      results['80CCD2'] = Math.min(claimed80CCD2, limit80CCD2);

      // 4. 80D Medical Insurance
      var selfLimit = ageCategory !== 'below60' ? TD.deductions['80D'].selfSeniorLimit : TD.deductions['80D'].selfLimit;
      var parentsLimit = deductionsData.parentsSenior ? TD.deductions['80D'].parentsSeniorLimit : TD.deductions['80D'].parentsLimit;
      
      var claimed80D_self = Number(deductionsData['80D_self'] || 0);
      var claimed80D_parents = Number(deductionsData['80D_parents'] || 0);
      results['80D'] = Math.min(claimed80D_self, selfLimit) + Math.min(claimed80D_parents, parentsLimit);

      // 5. 80E Education loan interest
      results['80E'] = Number(deductionsData['80E'] || 0);

      // 6. 80TTA / 80TTB
      var claimedTTA = Number(deductionsData['80TTA'] || 0);
      if (ageCategory !== 'below60') {
        // Senior citizens get 80TTB on both savings and FD interest up to 1L
        var claimedTTB = Number(deductionsData['80TTB'] || 0);
        results['80TTB'] = Math.min(claimedTTB, TD.deductions['80TTB'].limit);
      } else {
        // Non-seniors get 80TTA on savings interest up to 10k
        results['80TTA'] = Math.min(claimedTTA, TD.deductions['80TTA'].limit);
      }

      // 7. 80GG Rent Paid (if no HRA)
      if (deductionsData['80GG']) {
        var rentPaid = Number(deductionsData['80GG'].rentPaid || 0);
        var totalIncome = incomeHeads.salaryNet + incomeHeads.houseProperty + incomeHeads.business + incomeHeads.otherSources;
        var comp1 = TD.deductions['80GG'].monthlyLimit * 12; // 60,000
        var comp2 = totalIncome * TD.deductions['80GG'].percentLimit;
        var comp3 = Math.max(0, rentPaid - (totalIncome * 0.10));
        results['80GG'] = Math.min(comp1, comp2, comp3);
      }

      // 8. Other deductions (80G, 80U, etc.)
      results['80G'] = Number(deductionsData['80G'] || 0);
      results['80U'] = Number(deductionsData['80U'] || 0);
      results['80DD'] = Number(deductionsData['80DD'] || 0);
      results['80DDB'] = Number(deductionsData['80DDB'] || 0);

      // Auto-block individual deductions for corporate/partnership/LLP entities
      if (filingType === 'company' || filingType === 'firm' || filingType === 'llp') {
        results['80C'] = 0;
        results['80CCD1B'] = 0;
        results['80CCD2'] = 0;
        results['80D'] = 0;
        results['80E'] = 0;
        if ('80TTA' in results) results['80TTA'] = 0;
        if ('80TTB' in results) results['80TTB'] = 0;
        if ('80GG' in results) results['80GG'] = 0;
        results['80U'] = 0;
        results['80DD'] = 0;
        results['80DDB'] = 0;
      }

      // Sum final deductions
      for (var key in results) {
        if (results.hasOwnProperty(key)) {
          total += results[key];
        }
      }

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
    /**
     * Compute Section 234B & 234C interest for advance tax default/deferment.
     * @param {number} netTax
     * @param {number} totalTds
     * @param {number} advanceTaxPaid
     * @returns {Object} interest details
     */
    computeAdvanceTaxInterest: function (netTax, totalTds, advanceTaxPaid) {
      var assessedTax = Math.max(0, netTax - totalTds);
      if (assessedTax < 10000) {
        return { interest234B: 0, interest234C: 0, totalInterest: 0 };
      }

      // June 15: 15% due, 0 paid (assumes paid at end)
      var interestC_Q1 = assessedTax * 0.15 * 0.01 * 3;
      // Sept 15: 45% due, 0 paid
      var interestC_Q2 = assessedTax * 0.45 * 0.01 * 3;
      // Dec 15: 75% due, 0 paid
      var interestC_Q3 = assessedTax * 0.75 * 0.01 * 3;
      // March 15: 100% due, advanceTaxPaid paid
      var shortfallQ4 = Math.max(0, assessedTax - advanceTaxPaid);
      var interestC_Q4 = shortfallQ4 * 0.01 * 1;

      var interest234C = Math.round(interestC_Q1 + interestC_Q2 + interestC_Q3 + interestC_Q4);

      var interest234B = 0;
      if (advanceTaxPaid < assessedTax * 0.90) {
        var shortfallB = Math.max(0, assessedTax - advanceTaxPaid);
        interest234B = Math.round(shortfallB * 0.01 * 4); // 4 months: April to July
      }

      return {
        interest234B: interest234B,
        interest234C: interest234C,
        totalInterest: interest234B + interest234C
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
      var paid = userData.taxesPaid || {};
      var salaryTds = (userData.income && userData.income.salary) ? Number(userData.income.salary.tds || 0) : 0;
      var totalTds = salaryTds + Number(paid.tds || 0);
      var advanceTaxPaid = Number(paid.advanceTax || 0);

      var filingType = userData.profile ? (userData.profile.filingType || 'individual') : 'individual';

      // 1. COMPUTE NEW TAX REGIME
      var newGross = this.computeGrossIncome(userData.income, 'new', ageCategory, filingType);
      var newDeductions = 0;
      
      // Employer NPS is allowed in new regime (14% limit)
      if (userData.deductions && userData.deductions['80CCD2'] && filingType !== 'company' && filingType !== 'firm' && filingType !== 'llp') {
        var basicPlusDA = Number(userData.deductions.basicPlusDA || 0);
        var claimed80CCD2 = Number(userData.deductions['80CCD2'] || 0);
        var limit80CCD2New = basicPlusDA * 0.14; // 14% for new regime
        newDeductions = Math.min(claimed80CCD2, limit80CCD2New);
      }

      var newTaxableSlabIncome = Math.max(0, (newGross.heads.salaryNet + newGross.heads.hpSetOff + newGross.heads.business + newGross.heads.otherSources + newGross.heads.stcgSlab) - newDeductions);
      var newSlabTax = this.computeSlabTax(newTaxableSlabIncome, TD.newRegime.slabs);

      // Capital gains tax (New Regime)
      var newSTCG_tax = newGross.heads.stcgListed * TD.capitalGains.listed.stcgRate;
      var newLTCG_tax = newGross.heads.taxableLtcgListed * TD.capitalGains.listed.ltcgRate + newGross.heads.ltcgOther * 0.125;
      var newCGTax = newSTCG_tax + newLTCG_tax;

      var newTaxBeforeRebate = newSlabTax + newCGTax;

      // Section 87A rebate for new regime (Enhanced in Budget 2025 to 12 Lakhs)
      var newRebate = 0;
      var totalTaxableIncomeNew = newTaxableSlabIncome + newGross.heads.stcgListed + newGross.heads.ltcgListed + newGross.heads.ltcgOther;
      totalTaxableIncomeNew = Math.round(totalTaxableIncomeNew / 10) * 10;
      
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

      // Penal Interest 234B & 234C
      var newInterest = this.computeAdvanceTaxInterest(newNetTax, totalTds, advanceTaxPaid);
      var finalNewNetTax = newNetTax + newInterest.totalInterest;

      // 2. COMPUTE OLD TAX REGIME
      var oldGross = this.computeGrossIncome(userData.income, 'old', ageCategory, filingType);
      var oldDeductionsResult = this.computeDeductionsOldRegime(userData.deductions || {}, oldGross.heads, ageCategory, filingType);
      
      var oldTaxableSlabIncome = Math.max(0, (oldGross.heads.salaryNet + oldGross.heads.hpSetOff + oldGross.heads.business + oldGross.heads.otherSources + oldGross.heads.stcgSlab) - oldDeductionsResult.total);
      
      var oldSlabs = this.getOldRegimeSlabs(ageCategory);
      var oldSlabTax = this.computeSlabTax(oldTaxableSlabIncome, oldSlabs);

      // Capital gains tax (Old Regime)
      var oldSTCG_tax = oldGross.heads.stcgListed * TD.capitalGains.listed.stcgRate;
      var oldLTCG_tax = oldGross.heads.taxableLtcgListed * TD.capitalGains.listed.ltcgRate + oldGross.heads.ltcgOther * 0.125;
      var oldCGTax = oldSTCG_tax + oldLTCG_tax;

      var oldTaxBeforeRebate = oldSlabTax + oldCGTax;

      // Section 87A rebate for old regime (limit: 5 Lakhs)
      var oldRebate = 0;
      var totalTaxableIncomeOld = oldTaxableSlabIncome + oldGross.heads.stcgListed + oldGross.heads.ltcgListed + oldGross.heads.ltcgOther;
      totalTaxableIncomeOld = Math.round(totalTaxableIncomeOld / 10) * 10;
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

      // Penal Interest 234B & 234C
      var oldInterest = this.computeAdvanceTaxInterest(oldNetTax, totalTds, advanceTaxPaid);
      var finalOldNetTax = oldNetTax + oldInterest.totalInterest;

      // Determine recommended regime
      var recommended = finalNewNetTax <= finalOldNetTax ? 'new' : 'old';
      var savings = Math.abs(finalOldNetTax - finalNewNetTax);

      return {
        newRegime: {
          grossIncome: newGross.grossTotalIncome,
          standardDeduction: newGross.heads.salaryStdDeduction,
          otherDeductions: newDeductions,
          taxableSlabIncome: newTaxableSlabIncome,
          totalTaxableIncome: totalTaxableIncomeNew,
          slabTax: newSlabTax,
          capitalGainsTax: newCGTax,
          rebate87A: newRebate,
          surcharge: newSurcharge,
          cess: newCess,
          interest234B: newInterest.interest234B,
          interest234C: newInterest.interest234C,
          interestTotal: newInterest.totalInterest,
          netTaxBeforeInterest: newNetTax,
          netTax: finalNewNetTax,
          heads: newGross.heads
        },
        oldRegime: {
          grossIncome: oldGross.grossTotalIncome,
          standardDeduction: oldGross.heads.salaryStdDeduction,
          otherDeductions: oldDeductionsResult.total,
          deductionsBreakdown: oldDeductionsResult.breakdown,
          taxableSlabIncome: oldTaxableSlabIncome,
          totalTaxableIncome: totalTaxableIncomeOld,
          slabTax: oldSlabTax,
          capitalGainsTax: oldCGTax,
          rebate87A: oldRebate,
          surcharge: oldSurcharge,
          cess: oldCess,
          interest234B: oldInterest.interest234B,
          interest234C: oldInterest.interest234C,
          interestTotal: oldInterest.totalInterest,
          netTaxBeforeInterest: oldNetTax,
          netTax: finalOldNetTax,
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
