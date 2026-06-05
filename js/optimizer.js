/**
 * @file optimizer.js
 * @description Analyzes tax situation and recommends legal tax-saving strategies.
 *              Generates structured advice to minimize tax liability in India.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  if (!window.TaxData || !window.TaxEngine) {
    throw new Error('[TaxOptimizer] window.TaxData and window.TaxEngine are required.');
  }

  var TD = window.TaxData;

  window.TaxOptimizer = {
    /**
     * Analyze user tax situation and suggest strategies to minimize tax.
     * @param {Object} userData
     * @param {Object} taxResult - Output of TaxEngine.computeFullTax
     * @returns {Array<Object>} Sorted array of optimization suggestions
     */
    optimize: function (userData, taxResult) {
      var suggestions = [];
      var regime = taxResult.recommended;
      var age = Number(userData.profile.age || 30);
      var ageCategory = window.Utils.getAgeCategory(age);
      var isSalaried = userData.income.salary && Number(userData.income.salary.grossSalary || 0) > 0;
      
      // Calculate marginal tax rate (slab tax rate)
      var activeRegimeData = taxResult[regime + 'Regime'];
      var heads = activeRegimeData.heads;
      var taxableIncome = activeRegimeData.taxableSlabIncome;
      
      var slabSlabs = regime === 'new' ? TD.newRegime.slabs : TaxEngine.getOldRegimeSlabs(ageCategory);
      var marginalRate = 0;
      for (var i = 0; i < slabSlabs.length; i++) {
        if (taxableIncome > slabSlabs[i].min) {
          marginalRate = slabSlabs[i].rate;
        }
      }

      // If no tax liability, optimization potential is zero
      if (activeRegimeData.netTax <= 0) {
        return [];
      }

      // --- OPTIMIZATION STRATEGIES ---

      // 1. Regime Switch Advice
      var otherRegime = regime === 'new' ? 'old' : 'new';
      if (taxResult[otherRegime + 'Regime'].netTax < taxResult[regime + 'Regime'].netTax) {
        var savings = taxResult[regime + 'Regime'].netTax - taxResult[otherRegime + 'Regime'].netTax;
        suggestions.push({
          id: 'opt_regime_switch',
          category: 'regime',
          section: 'Regime Select',
          title: 'Switch to the ' + (otherRegime === 'new' ? 'New' : 'Old') + ' Tax Regime',
          description: 'Based on your deductions and income structure, switching your regime will yield direct tax savings.',
          currentUtilized: 0,
          maxLimit: 0,
          remainingCapacity: 0,
          potentialSavings: savings,
          priority: 'critical',
          risk: 'zero',
          deadline: 'At the time of filing (July 31, 2026)',
          howToImplement: 'Select the "' + (otherRegime === 'new' ? 'New Regime' : 'Old Regime') + '" checkbox when starting your ITR filing on the Income Tax Portal.',
          icon: 'TAX'
        });
      }

      // Slabs/Deductions below are evaluated to show all possible tax-saving ideas
      var checkOldRegimeDeductions = true;
      var oldSlabs = TaxEngine.getOldRegimeSlabs(ageCategory);
      var oldMarginalRate = 0;
      var oldTaxableIncome = taxResult.oldRegime.taxableSlabIncome;
      for (var j = 0; j < oldSlabs.length; j++) {
        if (oldTaxableIncome > oldSlabs[j].min) {
          oldMarginalRate = oldSlabs[j].rate;
        }
      }

      if (checkOldRegimeDeductions) {
        var currentDeductions = userData.deductions || {};

        // 2. Section 80C investment gap
        var claimed80C = Number(currentDeductions['80C'] || 0) + 
                         Number(currentDeductions['80CCC'] || 0) + 
                         Number(currentDeductions['80CCD1'] || 0);
        var limit80C = TD.deductions['80C'].limit; // 150000
        if (claimed80C < limit80C) {
          var remaining80C = limit80C - claimed80C;
          var savings80C = remaining80C * oldMarginalRate;
          suggestions.push({
            id: 'opt_80c_investment',
            category: 'investment',
            section: 'Section 80C',
            title: 'Max out Section 80C Investments',
            description: 'You have not fully utilized the ₹1.5 Lakh limit under Section 80C. Investing in tax-saving instruments will reduce your taxable income.',
            currentUtilized: claimed80C,
            maxLimit: limit80C,
            remainingCapacity: remaining80C,
            potentialSavings: savings80C,
            priority: remaining80C > 50000 ? 'high' : 'medium',
            risk: 'low',
            deadline: '31 March 2026',
            howToImplement: 'Invest in ELSS (Equity Linked Savings Schemes) mutual funds for high returns (3-year lock-in) or PPF (Public Provident Fund) for safe risk-free interest (15-year lock-in).',
            icon: '80C'
          });
        }

        // 3. Section 80CCD(1B) Additional NPS (₹50k)
        var claimedNPS = Number(currentDeductions['80CCD1B'] || 0);
        var limitNPS = TD.deductions['80CCD1B'].limit; // 50000
        if (claimedNPS < limitNPS) {
          var remainingNPS = limitNPS - claimedNPS;
          var savingsNPS = remainingNPS * oldMarginalRate;
          suggestions.push({
            id: 'opt_nps_additional',
            category: 'investment',
            section: 'Section 80CCD(1B)',
            title: 'Contribute to National Pension System (NPS)',
            description: 'Section 80CCD(1B) offers an exclusive deduction of up to ₹50,000 for NPS contributions over and above Section 80C.',
            currentUtilized: claimedNPS,
            maxLimit: limitNPS,
            remainingCapacity: remainingNPS,
            potentialSavings: savingsNPS,
            priority: 'high',
            risk: 'low',
            deadline: '31 March 2026',
            howToImplement: 'Open an NPS Tier-1 account online through eNPS portal or your bank and deposit up to ₹50,000.',
            icon: 'NPS'
          });
        }

        // 4. Section 80D Health Insurance (Self/Family)
        var claimed80D_self = Number(currentDeductions['80D_self'] || 0);
        var selfLimit = ageCategory !== 'below60' ? TD.deductions['80D'].selfSeniorLimit : TD.deductions['80D'].selfLimit;
        if (claimed80D_self < selfLimit) {
          var remaining80D = selfLimit - claimed80D_self;
          var savings80D = remaining80D * oldMarginalRate;
          suggestions.push({
            id: 'opt_80d_self',
            category: 'insurance',
            section: 'Section 80D',
            title: 'Health Insurance for Self & Family',
            description: 'Claim premium paid for health insurance policies protecting you, your spouse, and dependent children.',
            currentUtilized: claimed80D_self,
            maxLimit: selfLimit,
            remainingCapacity: remaining80D,
            potentialSavings: savings80D,
            priority: 'medium',
            risk: 'zero',
            deadline: '31 March 2026',
            howToImplement: 'Buy or renew a health insurance policy and pay via online bank transfer, credit card or cheque (cash payments are not eligible for tax benefits).',
            icon: '80D'
          });
        }

        // 5. Section 80D Health Insurance (Parents)
        var claimed80D_parents = Number(currentDeductions['80D_parents'] || 0);
        var parentsLimit = currentDeductions.parentsSenior ? TD.deductions['80D'].parentsSeniorLimit : TD.deductions['80D'].parentsLimit;
        if (claimed80D_parents < parentsLimit) {
          var remainingParents = parentsLimit - claimed80D_parents;
          var savingsParents = remainingParents * oldMarginalRate;
          suggestions.push({
            id: 'opt_80d_parents',
            category: 'insurance',
            section: 'Section 80D',
            title: 'Health Insurance for Parents',
            description: 'You can claim up to ' + (currentDeductions.parentsSenior ? '₹50,000' : '₹25,000') + ' for premium paid on behalf of your parents.',
            currentUtilized: claimed80D_parents,
            maxLimit: parentsLimit,
            remainingCapacity: remainingParents,
            potentialSavings: savingsParents,
            priority: 'medium',
            risk: 'zero',
            deadline: '31 March 2026',
            howToImplement: 'Purchase a health cover for parents or pay their existing policy renewals. Senior parents without health cover can claim medical expenditure up to ₹50,000.',
            icon: '80D'
          });
        }

        // 6. Section 80TTA / 80TTB Savings Interest
        var interestInOther = userData.income.otherSources ? Number(userData.income.otherSources.savingsInterest || 0) : 0;
        var claimedTTA = Number(currentDeductions['80TTA'] || 0);
        var claimedTTB = Number(currentDeductions['80TTB'] || 0);
        
        if (ageCategory !== 'below60' && interestInOther > 0 && claimedTTB < Math.min(interestInOther, 50000)) {
          var remainingTTB = Math.min(interestInOther, 50000) - claimedTTB;
          suggestions.push({
            id: 'opt_80ttb_savings',
            category: 'deduction',
            section: 'Section 80TTB',
            title: 'Claim Senior Citizen Deposit Interest Deduction',
            description: 'Senior citizens can deduct up to ₹50,000 interest earned on bank/post-office savings accounts and fixed deposits.',
            currentUtilized: claimedTTB,
            maxLimit: 50000,
            remainingCapacity: remainingTTB,
            potentialSavings: remainingTTB * oldMarginalRate,
            priority: 'low',
            risk: 'zero',
            deadline: '31 July 2026',
            howToImplement: 'Add interest received from deposits under "Income from Other Sources" and claim the exact same amount under Section 80TTB.',
            icon: 'TTB'
          });
        } else if (ageCategory === 'below60' && interestInOther > 0 && claimedTTA < Math.min(interestInOther, 10000)) {
          var remainingTTA = Math.min(interestInOther, 10000) - claimedTTA;
          suggestions.push({
            id: 'opt_80tta_savings',
            category: 'deduction',
            section: 'Section 80TTA',
            title: 'Claim Savings Account Interest Exemption',
            description: 'You can claim up to ₹10,000 deduction on interest earned across all your bank savings accounts.',
            currentUtilized: claimedTTA,
            maxLimit: 10000,
            remainingCapacity: remainingTTA,
            potentialSavings: remainingTTA * oldMarginalRate,
            priority: 'low',
            risk: 'zero',
            deadline: '31 July 2026',
            howToImplement: 'Report your savings interest under "Other Sources" and claim the exemption under Section 80TTA.',
            icon: 'TTA'
          });
        }

        // 7. HRA Exemption (Salary allowance optimization)
        var rentPaid = userData.hra ? Number(userData.hra.rentPaid || 0) : 0;
        var receivesHRA = userData.income.salary && Number(userData.income.salary.hra || 0) > 0;
        if (receivesHRA && rentPaid === 0) {
          suggestions.push({
            id: 'opt_hra_receipts',
            category: 'salary',
            section: 'Section 10(13A)',
            title: 'Claim HRA by submitting Rent Receipts',
            description: 'You receive HRA in your CTC but have not submitted rent details. Submitting rent receipts can exempt a large portion of your HRA.',
            currentUtilized: 0,
            maxLimit: Number(userData.income.salary.hra || 0),
            remainingCapacity: Number(userData.income.salary.hra || 0),
            potentialSavings: Number(userData.income.salary.hra || 0) * oldMarginalRate, // Approximate
            priority: 'high',
            risk: 'zero',
            deadline: '31 January 2026 (Employer submission) or 31 July 2026 (ITR filing)',
            howToImplement: 'Provide rent agreement, monthly rent receipts, and PAN of landlord (if annual rent > ₹1 Lakh) to your employer or claim directly in ITR.',
            icon: 'HRA'
          });
        }
      }

      // 8. 80CCD(2) Employer NPS Restructuring (CTC optimization — works in BOTH regimes!)
      if (isSalaried) {
        var claimedCCD2 = Number(userData.deductions ? userData.deductions['80CCD2'] : 0);
        var basicPlusDA = Number(userData.deductions ? userData.deductions.basicPlusDA || 0 : 0);
        var currentCCD2_pct = basicPlusDA > 0 ? claimedCCD2 / basicPlusDA : 0;
        
        var maxCCD2_pct = regime === 'new' ? 0.14 : 0.10; // 14% new regime, 10% old regime
        if (currentCCD2_pct < maxCCD2_pct) {
          var gapAmount = (basicPlusDA * maxCCD2_pct) - claimedCCD2;
          var potentialCCD2Savings = gapAmount * marginalRate;
          
          if (potentialCCD2Savings > 1000) {
            suggestions.push({
              id: 'opt_80ccd2_ctc',
              category: 'salary',
              section: 'Section 80CCD(2)',
              title: 'Employer NPS Contribution in CTC',
              description: 'Restructure your CTC to have your employer contribute up to ' + (maxCCD2_pct * 100) + '% of basic salary directly to your NPS Tier-1. This is fully tax-free in both regimes.',
              currentUtilized: claimedCCD2,
              maxLimit: basicPlusDA * maxCCD2_pct,
              remainingCapacity: gapAmount,
              potentialSavings: potentialCCD2Savings,
              priority: 'high',
              risk: 'zero',
              deadline: 'Beginning of the FY / HR CTC window',
              howToImplement: 'Contact your HR/payroll team and request them to opt for the Corporate NPS Scheme, redirecting part of your special allowances into Employer NPS.',
              icon: 'CTC'
            });
          }
        }
      }

      // Sort suggestions by potential savings desc
      suggestions.sort(function (a, b) {
        return b.potentialSavings - a.potentialSavings;
      });

      return suggestions;
    },

    /**
     * Get summary text explaining regime recommendation.
     * @param {Object} taxResult
     * @returns {string} explanation
     */
    getRegimeRecommendation: function (taxResult) {
      var recommended = taxResult.recommended === 'new' ? 'New Tax Regime' : 'Old Tax Regime';
      var savings = window.Utils.formatCurrency(taxResult.savings);
      
      if (taxResult.savings === 0) {
        return 'Both regimes result in the exact same tax liability. We recommend using the <strong>New Tax Regime</strong> as it is simpler and requires no documentation.';
      }

      var text = 'We recommend opting for the <strong>' + recommended + '</strong>. ';
      text += 'It will save you <strong>' + savings + '</strong> in tax. <br><br>';
      
      if (taxResult.recommended === 'new') {
        text += 'Under the New Regime (revised in Budget 2025), you benefit from standard deduction of ₹75,000 and zero tax on income up to ₹12 Lakhs due to rebate Section 87A.';
      } else {
        text += 'Under the Old Regime, your extensive deductions (like 80C, 80D, home loan interest, HRA) help lower your tax liability below what the New Regime slabs would offer.';
      }

      return text;
    },

    /**
     * Sum total potential savings from suggestions.
     * @param {Array<Object>} suggestions
     * @returns {number} Sum
     */
    getTotalPotentialSavings: function (suggestions) {
      var sum = 0;
      for (var i = 0; i < suggestions.length; i++) {
        if (suggestions[i].category !== 'regime') { // Regime switch is alternative, not additive
          sum += suggestions[i].potentialSavings;
        }
      }
      return sum;
    }
  };
})();
