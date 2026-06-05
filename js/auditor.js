/**
 * @file auditor.js
 * @description Tax Compliance Auditor for KarDaan.
 *              Acts as a virtual Chartered Accountant (CA) capability substitute by executing compliance 
 *              and validation checks on user inputs to verify thresholds, HRA rules, caps, and filing risks.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  window.TaxAuditor = {
    /**
     * Runs audit checks on user data and tax calculation results.
     * @param {Object} userData - User input state
     * @param {Object} taxResult - Calculated tax result object from TaxEngine
     * @returns {Array<Object>} list of audit flags
     */
    runAudit: function (userData, taxResult) {
      var checks = [];
      var income = userData.income || {};
      var deductions = userData.deductions || {};
      var profile = userData.profile || {};
      var activeRegime = taxResult.recommended;
      var activeData = taxResult[activeRegime + 'Regime'];

      // -------------------------------------------------------------------------
      // Check 1: Section 44AB Tax Audit Threshold Enforcements
      // -------------------------------------------------------------------------
      if (userData.selectedIncomes.business) {
        var biz = income.business || {};
        var turnover = Number(biz.turnover || 0);
        var isProfessional = biz.type === 'professional';
        var limit = isProfessional ? 7500000 : 30000000; // 75L for 44ADA, 3Cr for 44AD
        
        if (turnover > limit) {
          checks.push({
            id: 'audit_44ab_required',
            type: 'danger',
            title: 'Statutory CA Tax Audit Mandated (Sec 44AB)',
            message: 'Your gross business turnover/professional receipts of ' + window.Utils.formatCurrency(turnover) + ' exceed the legal presumptive scheme limit (' + (isProfessional ? '₹75 Lakhs' : '₹3 Crores') + '). You are legally required to maintain formal books of accounts under Section 44AA and get them audited under Section 44AB.',
            action: 'Recommendation: Maintain detailed ledgers and consult a practicing CA to file Audit Form 3CD.'
          });
        }
      }

      // -------------------------------------------------------------------------
      // Check 2: HRA Exemption Landlord PAN Compliance (Sec 10(13A))
      // -------------------------------------------------------------------------
      if (userData.selectedIncomes.salary && activeRegime === 'old') {
        var rentPaid = Number(deductions.rentPaid || 0);
        var hraReceived = Number(income.salary.hra || 0);
        
        if (rentPaid > 100000 && hraReceived > 0) {
          checks.push({
            id: 'hra_landlord_pan',
            type: 'warning',
            title: 'Landlord PAN Declaration Required',
            message: 'Since your annual rent paid of ' + window.Utils.formatCurrency(rentPaid) + ' exceeds ₹1,00,000, it is mandatory to report your landlord\'s 10-digit PAN in your ITR to claim HRA exemption. Claiming HRA without it poses a high risk of demand notices and disallowances.',
            action: 'Requirement: Obtain the landlord\'s PAN and declare it on the e-filing portal.'
          });
        }
      }

      // -------------------------------------------------------------------------
      // Check 3: Savings Interest Deduction (80TTA / 80TTB) Audit Check
      // -------------------------------------------------------------------------
      var other = income.other || {};
      var interestSavings = Number(other.savingsInterest || 0);
      var claimed80C = Number(deductions['80C'] || 0);
      var age = Number(profile.age || 30);
      var isSenior = age >= 60;

      if (interestSavings > 0 && activeRegime === 'old') {
        var claimedTTA = Number(deductions['80TTA'] || 0);
        var claimedTTB = Number(deductions['80TTB'] || 0);

        if (isSenior && claimedTTB === 0) {
          checks.push({
            id: 'audit_80ttb_missed',
            type: 'info',
            title: 'Eligible Deduction Unclaimed (Sec 80TTB)',
            message: 'You reported interest income but did not claim Section 80TTB deduction. Senior citizens are eligible to claim a deduction of up to ₹50,000 on cumulative interest from savings, FDs, and post office deposits.',
            action: 'Action: Claim Section 80TTB deduction in your ITR (eligible up to ₹' + Math.min(50000, interestSavings) + ').'
          });
        } else if (!isSenior && claimedTTA === 0) {
          checks.push({
            id: 'audit_80tta_missed',
            type: 'info',
            title: 'Eligible Deduction Unclaimed (Sec 80TTA)',
            message: 'You have savings bank interest income but did not claim Section 80TTA. You are eligible to deduct up to ₹10,000 of savings interest.',
            action: 'Action: Claim Section 80TTA deduction in your ITR (eligible up to ₹' + Math.min(10000, interestSavings) + ').'
          });
        }
      }

      // -------------------------------------------------------------------------
      // Check 4: Section 80C Deduction Cap Enforcement
      // -------------------------------------------------------------------------
      if (claimed80C > 150000 && activeRegime === 'old') {
        checks.push({
          id: 'audit_80c_limit_exceeded',
          type: 'warning',
          title: 'Section 80C Deduction Capped',
          message: 'Your reported Section 80C investments of ' + window.Utils.formatCurrency(claimed80C) + ' exceed the statutory maximum limit of ₹1,50,000. The excess investment will not yield additional tax benefits.',
          action: 'Optimization: Consider shifting the excess investment budget to other sections like NPS (80CCD(1B)) or health insurance (80D).'
        });
      }

      // -------------------------------------------------------------------------
      // Check 5: Presumptive Deemed Profit Compliance Check (Sec 44AD/ADA)
      // -------------------------------------------------------------------------
      if (userData.selectedIncomes.business) {
        var biz = income.business || {};
        var turnover = Number(biz.turnover || 0);
        var profit = Number(biz.profit || 0);
        var isProfessional = biz.type === 'professional';
        var minRate = isProfessional ? 0.50 : 0.06; // 50% for professional, 6% digital presumptive default
        var minProfit = turnover * minRate;

        if (turnover > 0 && profit < minProfit) {
          checks.push({
            id: 'audit_presumptive_low_profit',
            type: 'warning',
            title: 'Deemed Profit Below Statutory Presumptive Rates',
            message: 'Your declared business profit (' + window.Utils.formatCurrency(profit) + ') is less than the presumptive deemed profit threshold (' + (isProfessional ? '50%' : '6%') + ' of turnover, which is ' + window.Utils.formatCurrency(minProfit) + '). Declaring lower profits makes you ineligible to file under the simplified presumptive schemes.',
            action: 'Requirement: You must prepare audited books of accounts under Sec 44AA/AB, or adjust your reported profit to the presumptive minimum.'
          });
        }
      }

      // -------------------------------------------------------------------------
      // Check 6: Capital Loss Carry Forward & Set-off Check
      // -------------------------------------------------------------------------
      if (userData.selectedIncomes.gains) {
        var cg = income.gains || {};
        var ltcl = Number(cg.ltcl || 0);
        var stcg = Number(cg.stcg || 0);

        if (ltcl > 0 && stcg > 0 && Number(cg.ltcg || 0) === 0) {
          checks.push({
            id: 'audit_cg_setoff_restriction',
            type: 'warning',
            title: 'Capital Loss Set-off Restriction (Sec 74)',
            message: 'You reported a Long-Term Capital Loss (LTCL) and Short-Term Capital Gains (STCG). Under the Income Tax Act, LTCL can only set off Long-Term Capital Gains. It cannot be used to offset Short-Term Capital Gains.',
            action: 'System action: The computation engine has automatically carried forward your LTCL for future years set-off.'
          });
        }
      }

      // -------------------------------------------------------------------------
      // Check 7: Advance Tax Liability Alert & Instalment Schedule
      // -------------------------------------------------------------------------
      var paid = userData.taxesPaid || {};
      var totalTds = Number(paid.tds || 0);
      var advanceTaxLiability = activeData.netTax - totalTds;
      var hasBizIncome = userData.selectedIncomes.business;
      var isSeniorExempt = isSenior && !hasBizIncome;

      if (advanceTaxLiability > 10000 && !isSeniorExempt) {
        var dates = hasBizIncome ? 
          ['By 15 March: 100% (' + window.Utils.formatCurrency(advanceTaxLiability) + ')'] :
          [
            'By 15 June: 15% (' + window.Utils.formatCurrency(advanceTaxLiability * 0.15) + ')',
            'By 15 September: 45% (' + window.Utils.formatCurrency(advanceTaxLiability * 0.45) + ')',
            'By 15 December: 75% (' + window.Utils.formatCurrency(advanceTaxLiability * 0.75) + ')',
            'By 15 March: 100% (' + window.Utils.formatCurrency(advanceTaxLiability) + ')'
          ];

        checks.push({
          id: 'audit_advance_tax_alert',
          type: 'warning',
          title: 'Advance Tax Mandated (Sec 208)',
          message: 'Your net tax liability after TDS is ' + window.Utils.formatCurrency(advanceTaxLiability) + '. Since this exceeds ₹10,000, you must pay your taxes in advance. Delay or default triggers penal interest of 1% per month under Sections 234B & 234C.',
          action: 'Due Schedule: ' + dates.join(' | ')
        });
      }

      return checks;
    }
  };
})();
