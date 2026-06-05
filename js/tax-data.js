/**
 * @file tax-data.js
 * @description Complete tax rules configuration for FY 2025-26 (AY 2026-27).
 *              All monetary values are in INR. All rates are decimals (e.g., 0.05 = 5%).
 *              This is the single source of truth for all tax computations.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  window.TaxData = {
    financialYear: '2025-26',
    assessmentYear: '2026-27',

    // ───────────────────────────────────────────────
    // NEW TAX REGIME (Default from FY 2023-24 onwards)
    // Updated slabs as per Union Budget 2025
    // ───────────────────────────────────────────────
    newRegime: {
      slabs: [
        { min: 0, max: 400000, rate: 0 },
        { min: 400000, max: 800000, rate: 0.05 },
        { min: 800000, max: 1200000, rate: 0.10 },
        { min: 1200000, max: 1600000, rate: 0.15 },
        { min: 1600000, max: 2000000, rate: 0.20 },
        { min: 2000000, max: 2400000, rate: 0.25 },
        { min: 2400000, max: Infinity, rate: 0.30 }
      ],
      standardDeduction: 75000,
      rebate87A: { limit: 1200000, maxRebate: 60000 },
      availableDeductions: ['80CCD2'] // Only employer NPS contribution in new regime
    },

    // ───────────────────────────────────────────────
    // OLD TAX REGIME
    // Slabs vary by age category
    // ───────────────────────────────────────────────
    oldRegime: {
      slabs: {
        below60: [
          { min: 0, max: 250000, rate: 0 },
          { min: 250000, max: 500000, rate: 0.05 },
          { min: 500000, max: 1000000, rate: 0.20 },
          { min: 1000000, max: Infinity, rate: 0.30 }
        ],
        senior: [
          { min: 0, max: 300000, rate: 0 },
          { min: 300000, max: 500000, rate: 0.05 },
          { min: 500000, max: 1000000, rate: 0.20 },
          { min: 1000000, max: Infinity, rate: 0.30 }
        ],
        superSenior: [
          { min: 0, max: 500000, rate: 0 },
          { min: 500000, max: 1000000, rate: 0.20 },
          { min: 1000000, max: Infinity, rate: 0.30 }
        ]
      },
      standardDeduction: 50000,
      rebate87A: { limit: 500000, maxRebate: 12500 }
    },

    // ───────────────────────────────────────────────
    // SURCHARGE (on income tax)
    // ───────────────────────────────────────────────
    surcharge: [
      { min: 0, max: 5000000, rate: 0 },
      { min: 5000000, max: 10000000, rate: 0.10 },
      { min: 10000000, max: 20000000, rate: 0.15 },
      { min: 20000000, max: Infinity, rate: 0.25 }
    ],
    surchargeCapForCapitalGains: 0.15,

    // ───────────────────────────────────────────────
    // HEALTH & EDUCATION CESS
    // ───────────────────────────────────────────────
    cess: 0.04,

    // ───────────────────────────────────────────────
    // DEDUCTIONS (Chapter VI-A and Section 24)
    // ───────────────────────────────────────────────
    deductions: {
      '80C': {
        name: 'Section 80C',
        limit: 150000,
        description: 'PPF, ELSS, EPF, LIC, NSC, SCSS, SSY, tuition fees, home loan principal',
        combined: ['80CCC', '80CCD1']
      },
      '80CCC': {
        name: 'Section 80CCC',
        limit: 150000,
        description: 'Pension fund contributions',
        combinedWith: '80C'
      },
      '80CCD1': {
        name: 'Section 80CCD(1)',
        limit: 150000,
        description: 'Employee NPS contribution',
        combinedWith: '80C',
        limitPercent: 0.10
      },
      '80CCD1B': {
        name: 'Section 80CCD(1B)',
        limit: 50000,
        description: 'Additional NPS contribution (over 80C limit)'
      },
      '80CCD2': {
        name: 'Section 80CCD(2)',
        limit: null,
        description: 'Employer NPS contribution',
        limitPercent: 0.10,
        govtLimitPercent: 0.14,
        availableInNewRegime: true
      },
      '80D': {
        name: 'Section 80D',
        selfLimit: 25000,
        selfSeniorLimit: 50000,
        parentsLimit: 25000,
        parentsSeniorLimit: 50000,
        preventiveCheckup: 5000
      },
      '80DD': {
        name: 'Section 80DD',
        normalLimit: 75000,
        severeLimit: 125000,
        description: 'Disabled dependent'
      },
      '80DDB': {
        name: 'Section 80DDB',
        normalLimit: 40000,
        seniorLimit: 100000,
        description: 'Medical treatment for specified diseases'
      },
      '80E': {
        name: 'Section 80E',
        limit: null,
        description: 'Education loan interest (no upper limit, 8 years)',
        years: 8
      },
      '80EE': {
        name: 'Section 80EE',
        limit: 50000,
        description: 'Home loan interest (first-time, loan ≤35L, property ≤50L)'
      },
      '80EEA': {
        name: 'Section 80EEA',
        limit: 150000,
        description: 'Home loan interest (affordable housing, stamp ≤45L)'
      },
      '80EEB': {
        name: 'Section 80EEB',
        limit: 150000,
        description: 'EV loan interest'
      },
      '80G': {
        name: 'Section 80G',
        description: 'Donations',
        categories: {
          full100: '100% without limit',
          full50: '50% without limit',
          qualified100: '100% with 10% limit',
          qualified50: '50% with 10% limit'
        }
      },
      '80GG': {
        name: 'Section 80GG',
        monthlyLimit: 5000,
        percentLimit: 0.25,
        description: 'Rent paid (no HRA received)'
      },
      '80TTA': {
        name: 'Section 80TTA',
        limit: 10000,
        description: 'Savings account interest (non-senior)'
      },
      '80TTB': {
        name: 'Section 80TTB',
        limit: 100000,
        description: 'Deposit interest (senior citizens)'
      },
      '80U': {
        name: 'Section 80U',
        normalLimit: 75000,
        severeLimit: 125000,
        description: 'Own disability'
      },
      '24b': {
        name: 'Section 24(b)',
        selfOccupiedLimit: 200000,
        letOutLimit: null,
        description: 'Home loan interest'
      }
    },

    // ───────────────────────────────────────────────
    // HRA EXEMPTION RULES
    // ───────────────────────────────────────────────
    hra: {
      metroPercent: 0.50,
      nonMetroPercent: 0.40,
      metroCities: ['Delhi', 'Mumbai', 'Kolkata', 'Chennai']
    },

    // ───────────────────────────────────────────────
    // CAPITAL GAINS TAX RULES (Post Jul 23, 2024 Budget)
    // ───────────────────────────────────────────────
    capitalGains: {
      listed: {
        stcgRate: 0.20,
        ltcgRate: 0.125,
        ltcgExemption: 125000,
        holdingPeriod: 12 // months
      },
      unlisted: {
        ltcgRate: 0.125,
        holdingPeriod: 24 // months
      },
      property: {
        ltcgRate: 0.125,
        holdingPeriod: 24 // months
      },
      gold: {
        ltcgRate: 0.125,
        holdingPeriod: 24 // months
      },
      debtFunds: {
        alwaysSTCG: true // Taxed at slab rate regardless of holding period
      },
      listedBonds: {
        ltcgRate: 0.125,
        holdingPeriod: 12 // months
      }
    },

    // ───────────────────────────────────────────────
    // PRESUMPTIVE TAXATION SCHEMES
    // ───────────────────────────────────────────────
    presumptive: {
      '44AD': {
        turnoverLimit: 20000000,    // ₹2 crore
        enhancedLimit: 30000000,    // ₹3 crore (if digital receipts ≥ 95%)
        profitRate: 0.08,           // 8% for non-digital
        digitalRate: 0.06,         // 6% for digital receipts
        cashThreshold: 0.05        // Cash receipts must be < 5% for enhanced limit
      },
      '44ADA': {
        receiptLimit: 5000000,     // ₹50 lakh
        enhancedLimit: 7500000,    // ₹75 lakh (if digital receipts ≥ 95%)
        profitRate: 0.50,          // 50% of gross receipts
        cashThreshold: 0.05        // Cash receipts must be < 5% for enhanced limit
      },
      '44AE': {
        vehicleLimit: 10,          // Max 10 goods carriages
        profitPerVehicle: {
          heavy: 7500,             // Per month per heavy vehicle
          other: 7500              // Per month per other vehicle
        }
      }
    },

    // ───────────────────────────────────────────────
    // ITR FORM APPLICABILITY
    // ───────────────────────────────────────────────
    itrForms: [
      {
        form: 'ITR-1',
        name: 'Sahaj',
        incomeLimit: 5000000,
        conditions: 'Salary + 1 house property + other sources, resident individual only'
      },
      {
        form: 'ITR-2',
        name: '',
        conditions: 'Capital gains, multiple properties, foreign income/assets, no business income'
      },
      {
        form: 'ITR-3',
        name: '',
        conditions: 'Business/professional income with regular books'
      },
      {
        form: 'ITR-4',
        name: 'Sugam',
        incomeLimit: 5000000,
        conditions: 'Presumptive income (44AD/44ADA/44AE)'
      },
      {
        form: 'ITR-5',
        name: '',
        conditions: 'Firms, LLPs, AOPs, BOIs'
      },
      {
        form: 'ITR-6',
        name: '',
        conditions: 'Companies (except Sec 11)'
      }
    ],

    // ───────────────────────────────────────────────
    // FILING DEADLINES (AY 2026-27)
    // ───────────────────────────────────────────────
    deadlines: {
      nonAudit: '2026-07-31',
      audit: '2026-10-31',
      belated: '2026-12-31',
      revised: '2026-12-31'
    },

    // ───────────────────────────────────────────────
    // TAX-SAVING INVESTMENT OPTIONS
    // ───────────────────────────────────────────────
    investments: [
      { name: 'ELSS', section: '80C', lockin: '3 years', returns: 'Market-linked (10-15%)', risk: 'High' },
      { name: 'PPF', section: '80C', lockin: '15 years', returns: '7.1%', risk: 'Zero' },
      { name: 'NPS Tier I', section: '80CCD(1B)', lockin: 'Till 60', returns: '8-10%', risk: 'Moderate' },
      { name: 'EPF', section: '80C', lockin: 'Till retirement', returns: '8.25%', risk: 'Zero' },
      { name: 'NSC', section: '80C', lockin: '5 years', returns: '7.7%', risk: 'Zero' },
      { name: 'SSY', section: '80C', lockin: '21 years', returns: '8.2%', risk: 'Zero' },
      { name: 'Tax-saving FD', section: '80C', lockin: '5 years', returns: '6.5-7%', risk: 'Zero' },
      { name: 'SCSS', section: '80C', lockin: '5 years', returns: '8.2%', risk: 'Zero' }
    ]
  };
})();
