/**
 * @file form-selector.js
 * @description Automatically selects appropriate ITR (Income Tax Return) form based on income sources and profile.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  window.FormSelector = {
    /**
     * Recommends the correct ITR Form for filing.
     * @param {Object} userData
     * @returns {{ form: string, name: string, description: string, eligibility: string }}
     */
    selectForm: function (userData) {
      var filingType = userData.profile.filingType || 'individual';
      
      if (filingType === 'company') {
        return {
          form: 'ITR-6',
          name: 'ITR-6',
          description: 'For companies other than companies claiming exemption under section 11.',
          eligibility: 'All registered companies under the Companies Act.'
        };
      }

      if (filingType === 'firm' || filingType === 'llp') {
        return {
          form: 'ITR-5',
          name: 'ITR-5',
          description: 'For Firms, LLPs, AOPs (Association of Persons), BOIs (Body of Individuals), and Artificial Juridical Persons.',
          eligibility: 'Partnership firms and LLPs registered in India.'
        };
      }

      // Individual / HUF filing rules
      var hasBusiness = userData.income.business && userData.income.business.type && userData.income.business.type !== 'none';
      var hasCapitalGains = userData.income.capitalGains && 
        (Number((userData.income.capitalGains.listed || {}).ltcg || 0) > 0 || 
         Number((userData.income.capitalGains.listed || {}).stcg || 0) > 0 ||
         Number((userData.income.capitalGains.property || {}).ltcg || 0) > 0 || 
         Number((userData.income.capitalGains.property || {}).stcg || 0) > 0 ||
         Number((userData.income.capitalGains.gold || {}).ltcg || 0) > 0 || 
         Number((userData.income.capitalGains.gold || {}).stcg || 0) > 0 ||
         Number((userData.income.capitalGains.debt || {}).gains || 0) > 0);

      var salaryGross = userData.income.salary ? Number(userData.income.salary.grossSalary || 0) : 0;
      var otherSources = userData.income.otherSources ? Number(userData.income.otherSources.total || 0) : 0;
      var hpCount = userData.income.houseProperty ? userData.income.houseProperty.length : 0;

      var totalIncome = salaryGross + otherSources;

      // Rule for ITR-1:
      // Resident individual, income <= 50L, 1 house property, salary + other sources, NO capital gains, NO business.
      if (!hasBusiness && !hasCapitalGains && hpCount <= 1 && totalIncome <= 5000000 && userData.profile.isResident) {
        return {
          form: 'ITR-1',
          name: 'Sahaj',
          description: 'For resident individuals having income from salary, one house property, and other sources (interest etc.), up to ₹50 Lakh.',
          eligibility: 'Salaried individual or pensioner with total income not exceeding ₹50 Lakh.'
        };
      }

      // Rule for ITR-4:
      // Resident individual/HUF/firm (not LLP), income <= 50L, presumptive business/profession income, salary + 1 property + other sources.
      if (hasBusiness && !hasCapitalGains && hpCount <= 1 && totalIncome <= 5000000 && 
          (userData.income.business.type === '44AD' || userData.income.business.type === '44ADA' || userData.income.business.type === '44AE')) {
        return {
          form: 'ITR-4',
          name: 'Sugam',
          description: 'For resident individuals, HUFs, and firms (excluding LLP) having total income up to ₹50 Lakh and declaring presumptive income under Section 44AD, 44ADA, or 44AE.',
          eligibility: 'Freelancers, small traders, and professionals choosing presumptive taxation.'
        };
      }

      // Rule for ITR-2:
      // Individual/HUF having capital gains or multiple properties, but NO business/profession income.
      if (!hasBusiness && (hasCapitalGains || hpCount > 1 || totalIncome > 5000000 || !userData.profile.isResident)) {
        return {
          form: 'ITR-2',
          name: 'ITR-2',
          description: 'For individuals and HUFs not carrying out business or profession under any proprietorship, but having capital gains, multiple house properties, or foreign assets/income.',
          eligibility: 'Investors, property sellers, and individuals with multiple properties or equity portfolio.'
        };
      }

      // Default/Catch-all for individuals/HUFs: ITR-3 (Regular Business Income or presumptive exceeding limits)
      return {
        form: 'ITR-3',
        name: 'ITR-3',
        description: 'For individuals and HUFs having income from a proprietary business or profession (not filing under presumptive or exceeding its limits).',
        eligibility: 'Business owners, regular traders, partners in firms, and professionals maintaining formal books of accounts.'
      };
    },

    /**
     * Get documents needed for filing based on income details.
     * @param {Object} userData
     * @returns {Array<string>} Required document checklist
     */
    getRequiredDocuments: function (userData) {
      var docs = ['PAN Card', 'Aadhaar Card', 'Form 26AS (Tax Credit Statement)', 'AIS (Annual Information Statement)'];

      if (userData.income.salary && Number(userData.income.salary.grossSalary || 0) > 0) {
        docs.push('Form 16 (issued by employer)');
        docs.push('Salary Slips');
      }

      if (userData.income.houseProperty && userData.income.houseProperty.length > 0) {
        docs.push('Rent agreement / Tenant details');
        docs.push('Home loan interest certificate (from bank, if home loan exists)');
        docs.push('Property tax receipts');
      }

      var hasCapitalGains = userData.income.capitalGains && 
        (Number(userData.income.capitalGains.listed.ltcg || 0) > 0 || Number(userData.income.capitalGains.listed.stcg || 0) > 0);
      if (hasCapitalGains) {
        docs.push('Capital gains statement from stockbroker/mutual fund houses');
        docs.push('Purchase and sale contract notes for property/gold');
      }

      var hasBusiness = userData.income.business && userData.income.business.type && userData.income.business.type !== 'none';
      if (hasBusiness) {
        docs.push('Bank account statements for the business');
        if (userData.income.business.type === 'regular') {
          docs.push('P&L (Profit & Loss) Statement & Balance Sheet');
          docs.push('Tax Audit Report (if turnover exceeds ₹10 Cr / ₹2 Cr without digital cash constraints)');
        } else {
          docs.push('Summary of gross turnover / professional receipts');
        }
      }

      if (userData.deductions) {
        docs.push('Investment receipts (ELSS, PPF, Life Insurance, NPS, etc.)');
        docs.push('Health insurance premium payment certificate (for Sec 80D)');
        docs.push('Education loan interest repayment certificate (for Sec 80E)');
      }

      return docs;
    }
  };
})();
