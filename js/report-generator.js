/**
 * @file report-generator.js
 * @description Generates premium fintech-grade printable tax computation reports.
 *              Builds structured print layouts with professional design system,
 *              gradient headers, executive summaries, and certification seals.
 * @version 2.0.0
 * @license MIT
 */

(function () {
  'use strict';

  if (!window.Utils || !window.FormSelector) {
    throw new Error('[ReportGenerator] window.Utils and window.FormSelector are required.');
  }

  var TD = window.TaxData;

  // ─── Design Tokens ────────────────────────────────────────────────────
  var COLORS = {
    navy:       '#0a1628',
    navyDark:   '#060e1a',
    navyLight:  '#1e3a5f',
    blue:       '#2563eb',
    blueDark:   '#1d4ed8',
    blueLight:  '#3b82f6',
    gold:       '#d4a853',
    goldLight:  '#e8c97a',
    slate50:    '#f8fafc',
    slate100:   '#f1f5f9',
    slate200:   '#e2e8f0',
    slate300:   '#cbd5e1',
    slate400:   '#94a3b8',
    slate500:   '#64748b',
    slate600:   '#475569',
    slate700:   '#334155',
    slate800:   '#1e293b',
    white:      '#ffffff',
    red600:     '#dc2626',
    red700:     '#b91c1c',
    red50:      '#fef2f2',
    red200:     '#fecaca',
    green600:   '#16a34a',
    green700:   '#15803d',
    green50:    '#f0fdf4',
    green200:   '#bbf7d0',
    amber600:   '#d97706',
    amber50:    '#fffbeb'
  };

  window.ReportGenerator = {
    /**
     * Generate a realistic Unique Document Identification Number (UDIN) based on PAN and Name.
     * @param {string} pan
     * @param {string} name
     * @returns {string} UDIN string
     */
    generateUDIN: function (pan, name) {
      var prefix = '26'; // Year 2026
      var regNo = '999999'; // Simulated CA Registration No.
      
      // Calculate a stable hash of name & PAN
      var hash = 0;
      var key = (name || 'TAXPAYER') + (pan || 'XXXXX0000X');
      for (var i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
      }
      var randomPart = Math.abs(hash).toString();
      // Pad to 10 digits
      while (randomPart.length < 10) {
        randomPart += '7';
      }
      randomPart = randomPart.substring(0, 10);
      
      return prefix + regNo + randomPart + 'KD';
    },

    /**
     * Generate a document serial number from PAN and timestamp.
     * @param {string} pan
     * @returns {string}
     */
    generateDocSerial: function (pan) {
      var ts = Date.now().toString(36).toUpperCase();
      var panCode = (pan || 'XXXXX').substring(0, 5);
      return 'KD-' + panCode + '-' + ts;
    },

    // ─── HELPER: Build a premium section heading ───────────────────────
    _sectionHeading: function (romanNum, title, subtitle) {
      var html = '';
      html += '<div class="section-heading">';
      html += '  <div class="section-num">' + romanNum + '</div>';
      html += '  <div class="section-title-group">';
      html += '    <h2 class="section-title">' + title + '</h2>';
      if (subtitle) {
        html += '    <p class="section-subtitle">' + subtitle + '</p>';
      }
      html += '  </div>';
      html += '</div>';
      return html;
    },

    // ─── HELPER: Build a key-value stat card ───────────────────────────
    _statCard: function (label, value, accent) {
      var borderColor = accent || COLORS.blue;
      return '<div class="stat-card" style="border-left: 3px solid ' + borderColor + ';">' +
        '<span class="stat-label">' + label + '</span>' +
        '<span class="stat-value">' + value + '</span>' +
        '</div>';
    },

    /**
     * Generate tabular ledger of Capital Gains set-offs under Sections 70 and 74.
     * @param {Object} setoff - Set-off details from TaxEngine
     * @returns {string} HTML table
     */
    generateCapitalGainsSetoffTable: function (setoff) {
      if (!setoff) return '';
      
      var html = '';
      html += '<table class="premium-table cg-setoff-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th>Asset Category & Gain Type</th>';
      html += '      <th class="text-right">Gross Gains (INR)</th>';
      html += '      <th class="text-right">Loss Set-off (INR)</th>';
      html += '      <th class="text-right">Net Taxable (INR)</th>';
      html += '      <th class="text-right">Carry-forward Loss (INR)</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      // Slab STCG
      var slabStcgLossApplied = setoff.applied.stclAgainstSlabStcg;
      html += '    <tr>';
      html += '      <td><span class="row-icon">&#9656;</span> STCG Slab Rate (Real Estate/Gold/Debt)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.slabStcg) + '</td>';
      html += '      <td class="text-right loss-cell">-' + window.Utils.formatCurrency(slabStcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.slabStcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Listed STCG
      var listedStcgLossApplied = setoff.applied.stclAgainstListedStcg;
      html += '    <tr>';
      html += '      <td><span class="row-icon">&#9656;</span> STCG Sec 111A (Listed Equity)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.listedStcg) + '</td>';
      html += '      <td class="text-right loss-cell">-' + window.Utils.formatCurrency(listedStcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.listedStcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Other LTCG
      var otherLtcgLossApplied = setoff.applied.ltclAgainstOtherLtcg + setoff.applied.stclAgainstOtherLtcg;
      html += '    <tr>';
      html += '      <td><span class="row-icon">&#9656;</span> LTCG Sec 112 (Real Estate/Gold/Other)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.otherLtcg) + '</td>';
      html += '      <td class="text-right loss-cell">-' + window.Utils.formatCurrency(otherLtcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.otherLtcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Listed LTCG
      var listedLtcgLossApplied = setoff.applied.ltclAgainstListedLtcg + setoff.applied.stclAgainstListedLtcg;
      html += '    <tr>';
      html += '      <td><span class="row-icon">&#9656;</span> LTCG Sec 112A (Listed Equity)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.listedLtcg) + '</td>';
      html += '      <td class="text-right loss-cell">-' + window.Utils.formatCurrency(listedLtcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.listedLtcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Carry forwards row
      if (setoff.final.stclCarryForward > 0 || setoff.final.ltclCarryForward > 0) {
        html += '    <tr class="summary-row">';
        html += '      <td><strong>Carry-Forward Losses to AY 2027-28</strong></td>';
        html += '      <td colspan="3"></td>';
        html += '      <td class="text-right" style="color: ' + COLORS.red700 + ';"><strong>STCL: ' + window.Utils.formatCurrency(setoff.final.stclCarryForward) + '<br>LTCL: ' + window.Utils.formatCurrency(setoff.final.ltclCarryForward) + '</strong></td>';
        html += '    </tr>';
      }

      html += '  </tbody>';
      html += '</table>';
      return html;
    },

    /**
     * Generate step-by-step advance tax penal interest calculation table under Sections 234B & 234C.
     * @param {Object} activeData - Active regime tax payload
     * @param {number} totalTds - Total TDS credits
     * @param {number} advanceTaxPaid - Advance tax paid
     * @returns {string} HTML table
     */
    generateAdvanceTaxInterestTable: function (activeData, totalTds, advanceTaxPaid) {
      if (!activeData || activeData.interestTotal <= 0) return '';
      
      var assessedTax = Math.max(0, activeData.netTaxBeforeInterest - totalTds);

      var html = '';
      html += '<div class="interest-computation-block">';
      html += '<p class="sub-section-label"><span class="label-icon">&#9888;</span> Section 234B & 234C: Detailed Penal Interest Computation</p>';
      html += '<table class="premium-table interest-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th>Interest Section / Installment Due Date</th>';
      html += '      <th class="text-right">Assessed Tax (INR)</th>';
      html += '      <th class="text-right">Required Cumulative (INR)</th>';
      html += '      <th class="text-right">Actual Cumulative (INR)</th>';
      html += '      <th class="text-right">Shortfall (INR)</th>';
      html += '      <th class="text-right">Interest @ 1% pm (INR)</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      // 234C Q1
      var q1Req = assessedTax * 0.15;
      var q1Int = assessedTax * 0.15 * 0.01 * 3;
      html += '    <tr>';
      html += '      <td><span class="row-icon">Q1</span> Sec 234C - Installment 1 (15 June 2025)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q1Req) + ' <span class="pct-badge">15%</span></td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(0) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(q1Req) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(q1Int) + ' <span class="duration-badge">3 mo</span></td>';
      html += '    </tr>';

      // 234C Q2
      var q2Req = assessedTax * 0.45;
      var q2Int = assessedTax * 0.45 * 0.01 * 3;
      html += '    <tr>';
      html += '      <td><span class="row-icon">Q2</span> Sec 234C - Installment 2 (15 Sept 2025)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q2Req) + ' <span class="pct-badge">45%</span></td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(0) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(q2Req) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(q2Int) + ' <span class="duration-badge">3 mo</span></td>';
      html += '    </tr>';

      // 234C Q3
      var q3Req = assessedTax * 0.75;
      var q3Int = assessedTax * 0.75 * 0.01 * 3;
      html += '    <tr>';
      html += '      <td><span class="row-icon">Q3</span> Sec 234C - Installment 3 (15 Dec 2025)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q3Req) + ' <span class="pct-badge">75%</span></td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(0) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(q3Req) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(q3Int) + ' <span class="duration-badge">3 mo</span></td>';
      html += '    </tr>';

      // 234C Q4
      var q4Req = assessedTax * 1.00;
      var shortfallQ4 = Math.max(0, assessedTax - advanceTaxPaid);
      var q4Int = shortfallQ4 * 0.01 * 1;
      html += '    <tr>';
      html += '      <td><span class="row-icon">Q4</span> Sec 234C - Installment 4 (15 March 2026)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q4Req) + ' <span class="pct-badge">100%</span></td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(advanceTaxPaid) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(shortfallQ4) + '</td>';
      html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(q4Int) + ' <span class="duration-badge">1 mo</span></td>';
      html += '    </tr>';

      // 234B
      if (activeData.interest234B > 0) {
        var shortfallB = Math.max(0, assessedTax - advanceTaxPaid);
        html += '    <tr class="section-234b-row">';
        html += '      <td><span class="row-icon" style="background:' + COLORS.red600 + ';">234B</span> Sec 234B - Default of Advance Tax (FY end shortfall)</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax * 0.90) + (assessedTax * 0.90 >= 100000 ? ' <span class="pct-badge">90%</span>' : '') + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(advanceTaxPaid) + '</td>';
        html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(shortfallB) + '</td>';
        html += '      <td class="text-right penalty-cell">' + window.Utils.formatCurrency(activeData.interest234B) + ' <span class="duration-badge">4 mo</span></td>';
        html += '    </tr>';
      }

      html += '    <tr class="grand-total-row">';
      html += '      <td colspan="5"><strong>Total Penal Interest (Sec 234B + 234C)</strong></td>';
      html += '      <td class="text-right" style="color: ' + COLORS.red700 + ';"><strong>' + window.Utils.formatCurrency(activeData.interestTotal) + '</strong></td>';
      html += '    </tr>';
      html += '  </tbody>';
      html += '</table>';
      html += '</div>';
      return html;
    },

    /**
     * Generate tabular ledger of user inputs and their tax impacts.
     * @param {Object} userData
     * @param {string} activeRegime
     * @returns {string} HTML table
     */
    generateInputsLedgerTable: function (userData, activeRegime) {
      var html = '';
      var rows = [];

      // 1. Profile inputs
      if (userData.profile) {
        rows.push({
          category: 'Assessee Profile',
          input: 'Residential Status',
          value: userData.profile.isResident ? 'Resident Individual' : 'Non-Resident',
          source: 'Step: Profile > Residential Status',
          impact: 'Required to determine basic exemption slabs, eligibility for rebate under Sec 87A (Resident only), and deductions.'
        });
        rows.push({
          category: 'Assessee Profile',
          input: 'Age / Category',
          value: userData.profile.age + ' Years',
          source: 'Step: Profile > Age',
          impact: 'Sets applicable slabs for the Old Tax Regime (below 60 vs senior vs super senior citizen).'
        });
      }

      // 2. Salary Income
      if (userData.income && userData.income.salary) {
        var sal = userData.income.salary;
        if (sal.grossSalary > 0) {
          rows.push({
            category: 'Schedule S: Salary',
            input: 'Gross Salary (Annual)',
            value: window.Utils.formatCurrency(sal.grossSalary),
            source: 'Step: Salary > Gross Salary',
            impact: 'Formulates base Gross Income. Standard deduction of ' + (activeRegime === 'new' ? 'INR 75,000' : 'INR 50,000') + ' is automatically deducted.'
          });
        }
        if (sal.basic > 0) {
          rows.push({
            category: 'Schedule S: Salary',
            input: 'Basic Salary (Annual)',
            value: window.Utils.formatCurrency(sal.basic),
            source: 'Step: Salary > Basic Salary',
            impact: 'Used to compute statutory ceilings: max HRA exemption (40%/50%) and Section 80CCD(2) employer NPS limit.'
          });
        }
        if (sal.hra > 0) {
          rows.push({
            category: 'Schedule S: Salary',
            input: 'House Rent Allowance (HRA)',
            value: window.Utils.formatCurrency(sal.hra),
            source: 'Step: Salary > HRA',
            impact: 'Eligible for exemption under Section 10(13A) (Old Regime only). Excess HRA is fully taxable.'
          });
        }
        if (sal.da > 0) {
          rows.push({
            category: 'Schedule S: Salary',
            input: 'Dearness Allowance (DA)',
            value: window.Utils.formatCurrency(sal.da),
            source: 'Step: Salary > Dearness Allowance',
            impact: 'Included in basic salary definitions for HRA and NPS limit calculations.'
          });
        }
        if (sal.specialAllowance > 0) {
          rows.push({
            category: 'Schedule S: Salary',
            input: 'Special Allowance',
            value: window.Utils.formatCurrency(sal.specialAllowance),
            source: 'Step: Salary > Special Allowance',
            impact: 'Fully taxable salary allowance; increases progressive slab income.'
          });
        }
      }

      // 3. House Property Income
      if (userData.income && userData.income.houseProperty && userData.income.houseProperty.length > 0) {
        for (var i = 0; i < userData.income.houseProperty.length; i++) {
          var prop = userData.income.houseProperty[i];
          var propLabel = 'Property #' + (i + 1) + ' (' + (prop.type === 'selfOccupied' ? 'Self Occupied' : 'Let Out') + ')';
          if (prop.type === 'letOut') {
            rows.push({
              category: 'Schedule HP: House Property',
              input: propLabel + ' - Annual Rent',
              value: window.Utils.formatCurrency(prop.annualRent),
              source: 'Step: House Property > Rent Received',
              impact: 'Forms Net Annual Value (NAV) after deducting municipal taxes. A 30% flat standard deduction is applied under Sec 24(a).'
            });
            if (prop.municipalTax > 0) {
              rows.push({
                category: 'Schedule HP: House Property',
                input: propLabel + ' - Municipal Taxes paid',
                value: window.Utils.formatCurrency(prop.municipalTax),
                source: 'Step: House Property > Municipal Taxes',
                impact: 'Deducted from gross annual rent to determine Net Annual Value (NAV).'
              });
            }
          }
          if (prop.interestOnLoan > 0) {
            rows.push({
              category: 'Schedule HP: House Property',
              input: propLabel + ' - Home Loan Interest paid',
              value: window.Utils.formatCurrency(prop.interestOnLoan),
              source: 'Step: House Property > Interest paid',
              impact: prop.type === 'selfOccupied' 
                ? 'Deductible up to INR 2,00,000 under Sec 24(b) (Old Regime only). Restricted to INR 0 in New Regime.' 
                : 'Fully deductible from let-out rental income under Sec 24(b). Net losses can set off against other heads up to INR 2,00,000 (Old Regime only).'
            });
          }
        }
      }

      // 4. Capital Gains
      if (userData.income && userData.income.capitalGains) {
        var cg = userData.income.capitalGains;
        if (cg.listed) {
          if (cg.listed.stcg !== 0) {
            var isLoss = cg.listed.stcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLoss ? 'Short-Term Capital Loss (Equity)' : 'Short-Term Capital Gains (Equity)',
              value: window.Utils.formatCurrency(cg.listed.stcg),
              source: 'Step: Capital Gains > STCG Equity',
              impact: isLoss 
                ? 'Short-term capital loss. Can set off against any STCG or LTCG under Section 70.'
                : 'Taxed at a flat rate of 20% under Section 111A. Standard slab deductions and rebates do not offset this except under specific low-income slab exhaustion rules.'
            });
          }
          if (cg.listed.ltcg !== 0) {
            var isLossLtcg = cg.listed.ltcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLossLtcg ? 'Long-Term Capital Loss (Equity)' : 'Long-Term Capital Gains (Equity)',
              value: window.Utils.formatCurrency(cg.listed.ltcg),
              source: 'Step: Capital Gains > LTCG Equity',
              impact: isLossLtcg
                ? 'Long-term capital loss. Can only set off against LTCG under Section 74.'
                : 'Taxed at flat 12.5% under Section 112A. Eligible for a combined statutory tax exemption on the first INR 1,25,000 of gains.'
            });
          }
        }
        if (cg.property) {
          if (cg.property.stcg !== 0) {
            var isLossPropStcg = cg.property.stcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLossPropStcg ? 'Short-Term Loss (Property)' : 'Short-Term Gains (Property)',
              value: window.Utils.formatCurrency(cg.property.stcg),
              source: 'Step: Capital Gains > STCG Property',
              impact: isLossPropStcg
                ? 'Short-term capital loss. Can set off against any STCG or LTCG.'
                : 'Taxed at normal progressive slab rates based on your selected regime.'
            });
          }
          if (cg.property.ltcg !== 0) {
            var isLossPropLtcg = cg.property.ltcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLossPropLtcg ? 'Long-Term Loss (Property)' : 'Long-Term Gains (Property)',
              value: window.Utils.formatCurrency(cg.property.ltcg),
              source: 'Step: Capital Gains > LTCG Property',
              impact: isLossPropLtcg
                ? 'Long-term capital loss. Can only set off against LTCG.'
                : 'Taxed at a flat rate of 12.5% without indexation (Budget 2024 revised rules).'
            });
          }
        }
        if (cg.gold) {
          if (cg.gold.stcg !== 0) {
            var isLossGoldStcg = cg.gold.stcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLossGoldStcg ? 'Short-Term Loss (Gold)' : 'Short-Term Gains (Gold)',
              value: window.Utils.formatCurrency(cg.gold.stcg),
              source: 'Step: Capital Gains > STCG Gold',
              impact: isLossGoldStcg
                ? 'Short-term capital loss. Can set off against any STCG or LTCG.'
                : 'Taxed at progressive slab rates.'
            });
          }
          if (cg.gold.ltcg !== 0) {
            var isLossGoldLtcg = cg.gold.ltcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLossGoldLtcg ? 'Long-Term Loss (Gold)' : 'Long-Term Gains (Gold)',
              value: window.Utils.formatCurrency(cg.gold.ltcg),
              source: 'Step: Capital Gains > LTCG Gold',
              impact: isLossGoldLtcg
                ? 'Long-term capital loss. Can only set off against LTCG.'
                : 'Taxed at a flat rate of 12.5% under Section 112.'
            });
          }
        }
        if (cg.debt && cg.debt.gains !== 0) {
          var isLossDebt = cg.debt.gains < 0;
          rows.push({
            category: 'Schedule CG: Capital Gains',
            input: isLossDebt ? 'Debt Mutual Fund Losses' : 'Debt Mutual Fund Gains',
            value: window.Utils.formatCurrency(cg.debt.gains),
            source: 'Step: Capital Gains > Debt Funds',
            impact: isLossDebt
              ? 'Short-term capital loss. Can set off against any STCG or LTCG.'
              : 'Classified strictly as Short-Term Capital Gains under Section 50AA; taxed at progressive slab rates.'
          });
        }
      }

      // 5. Business Income
      if (userData.income && userData.income.business) {
        var biz = userData.income.business;
        if (biz.type !== 'none') {
          rows.push({
            category: 'Schedule BP: Business',
            input: 'Filing Type / Scheme',
            value: biz.type === 'regular' ? 'Regular Bookkeeping' : 'Presumptive Taxation (' + biz.type + ')',
            source: 'Step: Business > Scheme selection',
            impact: biz.type === 'regular'
              ? 'Taxable net profit is calculated as gross receipts minus allowed business expenses and WDV depreciation.'
              : 'Taxable income is calculated as a statutory flat percentage of turnover, exempting you from maintaining formal audit logs under Section 44AA.'
          });
          if (biz.turnover > 0) {
            rows.push({
              category: 'Schedule BP: Business',
              input: 'Gross Turnover / Receipts',
              value: window.Utils.formatCurrency(biz.turnover),
              source: 'Step: Business > Gross Turnover',
              impact: 'Represents the base business scale. Deemed profit rates are calculated based on digital vs cash components.'
            });
          }
          if (biz.cashTurnover > 0) {
            rows.push({
              category: 'Schedule BP: Business',
              input: 'Cash Receipts portion',
              value: window.Utils.formatCurrency(biz.cashTurnover),
              source: 'Step: Business > Cash Turnover',
              impact: 'For presumptive schemes (44AD), cash portion is taxed at a higher deemed rate (8%) compared to digital receipts (6%).'
            });
          }
          if (biz.expenses > 0 && biz.type === 'regular') {
            rows.push({
              category: 'Schedule BP: Business',
              input: 'Business Expenses',
              value: window.Utils.formatCurrency(biz.expenses),
              source: 'Step: Business > Total Expenses',
              impact: 'Deducted directly from business revenue to determine net profit.'
            });
          }
        }
      }

      // 6. Other Sources
      if (userData.income && userData.income.otherSources) {
        var os = userData.income.otherSources;
        if (os.savingsInterest > 0) {
          rows.push({
            category: 'Schedule OS: Other Sources',
            input: 'Savings Bank Interest',
            value: window.Utils.formatCurrency(os.savingsInterest),
            source: 'Step: Other Income > Savings Interest',
            impact: 'Taxable under slab rates. Eligible for deduction up to INR 10,000 under Sec 80TTA (non-seniors) or INR 50,000 under Sec 80TTB (seniors).'
          });
        }
        if (os.fdInterest > 0) {
          rows.push({
            category: 'Schedule OS: Other Sources',
            input: 'FD/Post-office Interest',
            value: window.Utils.formatCurrency(os.fdInterest),
            source: 'Step: Other Income > FD Interest',
            impact: 'Taxable under progressive slab rates. Seniors can deduct combined FD & savings interest up to INR 50,000 under Sec 80TTB.'
          });
        }
        if (os.dividends > 0) {
          rows.push({
            category: 'Schedule OS: Other Sources',
            input: 'Dividend Income',
            value: window.Utils.formatCurrency(os.dividends),
            source: 'Step: Other Income > Dividends',
            impact: 'Fully taxable at normal progressive slab rates.'
          });
        }
        if (os.lottery > 0) {
          rows.push({
            category: 'Schedule OS: Other Sources',
            input: 'Lottery/Winnings (Net)',
            value: window.Utils.formatCurrency(os.lottery),
            source: 'Step: Other Income > Winnings',
            impact: 'Taxed at a flat rate of 30% under Section 115BBJ. No deductions or slab exemptions are allowed against this.'
          });
        }
        if (os.other > 0) {
          rows.push({
            category: 'Schedule OS: Other Sources',
            input: 'Miscellaneous Other Income',
            value: window.Utils.formatCurrency(os.other),
            source: 'Step: Other Income > Other Misc',
            impact: 'Taxed at normal progressive slab rates.'
          });
        }
      }

      // 7. Deductions
      if (userData.deductions) {
        var deds = userData.deductions;
        var directDeds = [
          { key: '80C', label: 'Sec 80C (PPF/ELSS/EPF/Principal)' },
          { key: '80CCC', label: 'Sec 80CCC (Pension funds)' },
          { key: '80CCD1', label: 'Sec 80CCD(1) (Employee NPS)' },
          { key: '80CCD1B', label: 'Sec 80CCD(1B) (Additional NPS)' },
          { key: '80CCD2', label: 'Sec 80CCD(2) (Employer NPS)' },
          { key: '80D_self', label: 'Sec 80D (Health Premium Self)' },
          { key: '80D_parents', label: 'Sec 80D (Health Premium Parents)' },
          { key: '80E', label: 'Sec 80E (Education Loan Interest)' },
          { key: '80G', label: 'Sec 80G (Donations)' },
          { key: '80TTA', label: 'Sec 80TTA (Savings Interest Ded)' },
          { key: '80TTB', label: 'Sec 80TTB (Deposit Interest Ded)' },
          { key: '80U', label: 'Sec 80U (Own Disability Ded)' },
          { key: '80DD', label: 'Sec 80DD (Disabled Dependent)' },
          { key: '80DDB', label: 'Sec 80DDB (Medical Treatment)' }
        ];

        for (var d = 0; d < directDeds.length; d++) {
          var val = Number(deds[directDeds[d].key] || 0);
          if (val > 0) {
            var activeImpact = '';
            if (activeRegime === 'new') {
              if (directDeds[d].key === '80CCD2') {
                activeImpact = 'Deducted directly from Gross Total Income (up to 14% of Basic).';
              } else {
                activeImpact = 'Ineligible under New Regime (disallowed under Sec 115BAC). Net tax impact is zero.';
              }
            } else {
              activeImpact = 'Reduces Net Taxable Slab Income directly (subject to statutory section caps).';
            }

            rows.push({
              category: 'Schedule VIA: Deductions',
              input: directDeds[d].label,
              value: window.Utils.formatCurrency(val),
              source: 'Step: Deductions > ' + directDeds[d].key,
              impact: activeImpact
            });
          }
        }
        if (deds['80GG'] && Number(deds['80GG'].rentPaid || 0) > 0) {
          rows.push({
            category: 'Schedule VIA: Deductions',
            input: 'Sec 80GG (Rent Paid - No HRA)',
            value: window.Utils.formatCurrency(deds['80GG'].rentPaid),
            source: 'Step: Deductions > 80GG Rent',
            impact: activeRegime === 'new' 
              ? 'Disallowed under New Regime.' 
              : 'Reduces Net Taxable Slab Income based on minimum of rent rule thresholds.'
          });
        }
      }

      // 8. Taxes Paid
      if (userData.taxesPaid || (userData.income && userData.income.salary && Number(userData.income.salary.tds || 0) > 0)) {
        var tp = userData.taxesPaid || {};
        var salaryTdsVal = (userData.income && userData.income.salary) ? Number(userData.income.salary.tds || 0) : 0;
        
        if (salaryTdsVal > 0) {
          rows.push({
            category: 'Taxes Pre-Paid',
            input: 'Salary TDS (Form 16)',
            value: window.Utils.formatCurrency(salaryTdsVal),
            source: 'Step: Salary > TDS on Salary',
            impact: 'Credited directly against computed Net Tax Liability. Reduces final tax payable or increases refund.'
          });
        }
        if (Number(tp.tds || 0) > 0) {
          rows.push({
            category: 'Taxes Pre-Paid',
            input: 'Tax Deducted at Source (TDS/TCS on Non-Salary)',
            value: window.Utils.formatCurrency(tp.tds),
            source: 'Step: Taxes Paid > TDS',
            impact: 'Credited directly against computed Net Tax Liability. Reduces final tax payable or increases refund.'
          });
        }
        if (Number(tp.advanceTax || 0) > 0) {
          rows.push({
            category: 'Taxes Pre-Paid',
            input: 'Advance Tax Paid',
            value: window.Utils.formatCurrency(tp.advanceTax),
            source: 'Step: Taxes Paid > Advance Tax',
            impact: 'Directly offsets tax liability. Prevents interest penalty charges under Sections 234B/234C.'
          });
        }
        if (Number(tp.selfAssessment || 0) > 0) {
          rows.push({
            category: 'Taxes Pre-Paid',
            input: 'Self-Assessment Tax Paid',
            value: window.Utils.formatCurrency(tp.selfAssessment),
            source: 'Step: Taxes Paid > Self Assessment',
            impact: 'Offsets final outstanding tax liability before filing return.'
          });
        }
      }

      if (rows.length === 0) {
        return '<p class="empty-state">No active inputs declared.</p>';
      }

      html += '<table class="premium-table inputs-ledger-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th style="width: 18%;">Category / Head</th>';
      html += '      <th style="width: 22%;">Declared Input Parameter</th>';
      html += '      <th style="width: 14%;" class="text-right">Value (INR)</th>';
      html += '      <th style="width: 18%;">Source Step</th>';
      html += '      <th style="width: 28%;">Tax Impact & Compliance Note</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      var lastCategory = '';
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var badgeHtml = '';
        var isDisallowed = (row.impact.indexOf('Ineligible') !== -1 || row.impact.indexOf('Disallowed') !== -1 || row.impact.indexOf('disallowed') !== -1);
        if (isDisallowed) {
          badgeHtml = '<span class="status-pill status-disallowed">DISALLOWED</span> ';
        } else if (row.category.indexOf('Deductions') !== -1 || row.category.indexOf('Salary') !== -1 || row.category.indexOf('Gains') !== -1 || row.category.indexOf('Business') !== -1 || row.category.indexOf('Other') !== -1) {
          badgeHtml = '<span class="status-pill status-allowed">ALLOWED</span> ';
        }

        var categoryClass = (row.category !== lastCategory) ? ' category-first-row' : '';
        lastCategory = row.category;

        html += '    <tr class="' + categoryClass + '">';
        html += '      <td class="category-cell"><strong>' + row.category + '</strong></td>';
        html += '      <td>' + row.input + '</td>';
        html += '      <td class="text-right mono-num">' + row.value + '</td>';
        html += '      <td class="source-cell">' + row.source + '</td>';
        html += '      <td class="impact-cell">' + badgeHtml + row.impact + '</td>';
        html += '    </tr>';
      }

      html += '  </tbody>';
      html += '</table>';

      return html;
    },

    /**
     * Generate step-by-step slab calculation table.
     * @param {number} taxableIncome
     * @param {string} activeRegime
     * @param {string} ageCategory
     * @returns {string} HTML table
     */
    generateDetailedSlabCalculationTable: function (taxableIncome, activeRegime, ageCategory) {
      var slabs = [];
      if (activeRegime === 'new') {
        slabs = TD.newRegime.slabs;
      } else {
        slabs = window.TaxEngine.getOldRegimeSlabs(ageCategory);
      }

      var html = '';
      html += '<table class="premium-table slab-computation-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th>Tax Slab Bracket (INR)</th>';
      html += '      <th class="text-right">Tax Rate</th>';
      html += '      <th class="text-right">Taxable Income in Slab (INR)</th>';
      html += '      <th class="text-right">Tax Computed in Slab (INR)</th>';
      html += '      <th>Calculation Formula</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      var totalSlabTax = 0;

      for (var i = 0; i < slabs.length; i++) {
        var slab = slabs[i];
        var rangeText = '';
        if (slab.max === Infinity) {
          rangeText = 'Above ' + window.Utils.formatCurrency(slab.min);
        } else {
          rangeText = (slab.min === 0 ? 'INR 0' : window.Utils.formatCurrency(slab.min + 1)) + ' to ' + window.Utils.formatCurrency(slab.max);
        }

        var rateText = (slab.rate * 100).toFixed(0) + '%';
        var taxableInSlab = 0;
        var slabTax = 0;
        var formula = '';

        if (taxableIncome > slab.min) {
          taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
          slabTax = taxableInSlab * slab.rate;
          totalSlabTax += slabTax;
          
          if (slab.rate === 0) {
            formula = '<span class="exempt-badge">EXEMPT</span>';
          } else {
            formula = window.Utils.formatCurrency(taxableInSlab) + ' x ' + rateText;
          }
        } else {
          taxableInSlab = 0;
          slabTax = 0;
          formula = '<span class="inactive-text">Income below slab</span>';
        }

        var activeClass = (taxableIncome > slab.min && slab.rate > 0) ? ' active-slab' : '';
        html += '    <tr class="' + activeClass + '">';
        html += '      <td>' + rangeText + '</td>';
        html += '      <td class="text-right"><span class="rate-badge">' + rateText + '</span></td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(taxableInSlab) + '</td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(slabTax) + '</td>';
        html += '      <td class="formula-cell">' + formula + '</td>';
        html += '    </tr>';
      }

      html += '    <tr class="grand-total-row">';
      html += '      <td colspan="2"><strong>Aggregated Slab Tax</strong></td>';
      html += '      <td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(taxableIncome) + '</strong></td>';
      html += '      <td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(Math.round(totalSlabTax * 100) / 100) + '</strong></td>';
      html += '      <td class="formula-cell">Sum of progressive slab rates</td>';
      html += '    </tr>';
      html += '  </tbody>';
      html += '</table>';

      return html;
    },

    /**
     * Generate dynamic document checklist based on active headers.
     * @param {Object} userData
     * @param {string} activeRegime
     * @param {Object} heads
     * @returns {string} HTML table
     */
    generateDetailedChecklist: function (userData, activeRegime, heads) {
      var html = '';
      var rows = [];

      // 1. Base files always required
      rows.push({
        schedule: 'General / All',
        docName: 'Form 26AS & AIS / TIS Summary',
        issuer: 'Income Tax Department (incometax.gov.in)',
        auditAction: 'Reconcile all taxable income and TDS entries with the IT Department\'s records to prevent mismatched tax credit demands.',
        instruction: 'Cross-reference interest income, dividend entries, and employer TDS credits. Report discrepancies via the feedback portal.'
      });

      // 2. Salary Schedule S
      if (heads.salaryGross > 0) {
        rows.push({
          schedule: 'Schedule S',
          docName: 'Form 16 (Part A & Part B)',
          issuer: 'Employer / TRACES',
          auditAction: 'Verify gross salary components, employer TDS credits, and statutory standard deductions.',
          instruction: 'Ensure the salary matches the amount reported in the AIS. Match Part A TDS to Form 26AS.'
        });
        
        if (userData.income.salary && Number(userData.income.salary.hra || 0) > 0 && activeRegime === 'old') {
          rows.push({
            schedule: 'Schedule S (HRA Exemption)',
            docName: 'Rent Receipts, Lease Agreement & Landlord PAN',
            issuer: 'Landlord / Assessee',
            auditAction: 'Audit proof of tenancy, rent paid monthly, and lease terms under Section 10(13A).',
            instruction: 'Verify rent receipts are signed. Landlord PAN is mandatory if annual rent exceeds INR 1,00,000. Reconcile with bank debits.'
          });
        }
      }

      // 3. House Property HP
      if (heads.houseProperty !== 0 || heads.hpSetOff !== 0) {
        var properties = userData.income.houseProperty || [];
        var interestPaid = false;
        var letOut = false;
        for (var p = 0; p < properties.length; p++) {
          if (properties[p].interestOnLoan > 0) interestPaid = true;
          if (properties[p].type === 'letOut') letOut = true;
        }

        if (interestPaid) {
          rows.push({
            schedule: 'Schedule HP',
            docName: 'Home Loan Interest Certificate (Section 24(b))',
            issuer: 'Lending Bank / Financial Institution',
            auditAction: 'Validate actual interest paid vs accrued and principal repayment component for Section 80C claiming.',
            instruction: 'Ensure self-occupied deduction is capped at INR 2,00,000 (Old Regime only). Verify co-borrower share if shared property.'
          });
        }
        if (letOut) {
          rows.push({
            schedule: 'Schedule HP',
            docName: 'Rent receipts & Municipal Tax receipts',
            issuer: 'Tenant / Municipal Corporation',
            auditAction: 'Verify rental income received and municipal taxes actually paid during the financial year.',
            instruction: 'Deduct municipal taxes only on cash-paid basis to establish Net Annual Value (NAV).'
          });
        }
      }

      // 4. Business BP
      if (heads.business > 0) {
        var bizData = userData.income.business || {};
        if (bizData.type === 'regular') {
          rows.push({
            schedule: 'Schedule BP',
            docName: 'Audited Financials (P&L, Balance Sheet, Ledger)',
            issuer: 'Assessee / Auditor CA',
            auditAction: 'Audit business expenses, asset depreciation charts (WDV), and verify net profits under Section 28.',
            instruction: 'Check if audit under Sec 44AB is required (turnover > INR 1Cr/INR 10Cr). Match sales records with GST GSTR-1/3B filings.'
          });
        } else {
          rows.push({
            schedule: 'Schedule BP (Presumptive)',
            docName: 'Presumptive Income Statement & GST Return summary',
            issuer: 'Assessee / GST Portal',
            auditAction: 'Verify turnover thresholds under Sec 44AD (INR 2Cr/INR 3Cr) or Sec 44ADA (INR 50L/INR 75L) and check digital transaction records.',
            instruction: 'Reconcile digital receipt percentage to ensure it exceeds 95% if claiming the higher presumptive limits. Verify deemed profits (6%/8% or 50%).'
          });
        }
      }

      // 5. Capital Gains CG
      if (heads.stcg > 0 || heads.ltcg > 0) {
        rows.push({
          schedule: 'Schedule CG',
          docName: 'Capital Gains Statement / Broker P&L',
          issuer: 'Stock Broker / Mutual Fund House',
          auditAction: 'Reconcile buy/sell dates, holding periods, grandfathering values (Sec 112A), and security transaction tax (STT).',
          instruction: 'Match transaction logs with AIS equity sale records. Verify Section 112A listed equity LTCG exemption of INR 1,25,000.'
        });
        
        var cgData = userData.income.capitalGains || {};
        if (cgData.property && (cgData.property.ltcg > 0 || cgData.property.stcg > 0)) {
          rows.push({
            schedule: 'Schedule CG (Property Sale)',
            docName: 'Purchase & Sale Deed, Stamp Valuation, & Cost Proofs',
            issuer: 'Sub-Registrar Office / Banks',
            auditAction: 'Audit indexation benefits (if applicable), purchase value, stamp duty value, and Section 54/54EC exemptions.',
            instruction: 'Verify TDS deducted by purchaser (Form 16B). Check reinvestment timelines for Capital Gains Account Scheme (CGAS).'
          });
        }
      }

      // 6. Other Sources OS
      if (heads.otherSources > 0) {
        rows.push({
          schedule: 'Schedule OS',
          docName: 'Bank Saving Statements & FD Interest Certificates',
          issuer: 'All Savings & Deposit Banks',
          auditAction: 'Aggregate all interest income earned across savings accounts, fixed deposits, and recurring deposits.',
          instruction: 'Verify Section 80TTA (up to INR 10,000) or Section 80TTB (up to INR 50,000 for seniors) deductions are correctly claimed.'
        });
      }

      // 7. Deductions Schedule VIA
      if (activeRegime === 'old' && userData.deductions) {
        var dedsData = userData.deductions;
        if (dedsData['80C'] > 0 || dedsData['80CCC'] > 0 || dedsData['80CCD1'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80C)',
            docName: 'Investment Proofs (PPF passbook, ELSS statements, LIC receipt)',
            issuer: 'Post Office / Fund Houses / Life Insurance Co.',
            auditAction: 'Verify that investments were deposited before March 31, 2026, and that policy premiums align with Section 80C guidelines.',
            instruction: 'Ensure the combined deduction under Sec 80C, 80CCC, and 80CCD(1) does not exceed the INR 1,50,000 ceiling.'
          });
        }
        if (dedsData['80CCD1B'] > 0 || dedsData['80CCD2'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (NPS)',
            docName: 'NPS Transaction Statement & Account Ledger',
            issuer: 'NPS Trust / CRA (NSDL/Karvy)',
            auditAction: 'Verify self-contribution under 80CCD(1B) (cap INR 50,000) and employer contribution under 80CCD(2) (cap 10% of Basic).',
            instruction: 'Ensure employer contribution matches the Form 16 Part B declaration. Reconcile with corporate salary structures.'
          });
        }
        if (dedsData['80D_self'] > 0 || dedsData['80D_parents'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80D)',
            docName: 'Health Insurance Certificate & Premium Bank receipts',
            issuer: 'Health Insurance Provider',
            auditAction: 'Confirm health insurance policy parameters, member age categories (senior vs non-senior), and payment modes.',
            instruction: 'Verify that premium payment was made through digital channels (cheque/online/card). Cash premiums are strictly disallowed.'
          });
        }
        if (dedsData['80E'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80E)',
            docName: 'Education Loan Interest Certificate',
            issuer: 'Lending Bank',
            auditAction: 'Verify the interest paid during the year. No deduction is available for principal repayment.',
            instruction: 'Verify the loan is taken for higher education of self, spouse, or children, and is within the 8-year statutory limit.'
          });
        }
        if (dedsData['80G'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80G)',
            docName: 'Donation Receipts & Form 10BE Certificate',
            issuer: 'Registered Charitable Trust / NGO',
            auditAction: 'Verify the PAN of the donee trust, donor registration numbers, and donation eligibility categories (100% or 50% exemption).',
            instruction: 'Reconcile donations with Form 10BE. Cash donations above INR 2,000 are not eligible for tax deduction.'
          });
        }
      }

      // 8. Taxes Pre-Paid
      var paid = userData.taxesPaid || {};
      if (Number(paid.advanceTax || 0) > 0 || Number(paid.selfAssessment || 0) > 0) {
        rows.push({
          schedule: 'Taxes Pre-Paid',
          docName: 'Tax Payment Challan Receipts (Challan 280 / IT Portal Receipts)',
          issuer: 'E-Filing Portal / Partner Banks',
          auditAction: 'Verify BSR Code, Challan Date, Challan Serial Number, and Major/Minor Head code settings.',
          instruction: 'Ensure the payments reflect in Form 26AS / AIS before final ITR submission to ensure automatic credit.'
        });
      }

      // Render Table
      html += '<table class="premium-table checklist-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th style="width: 14%;">Schedule</th>';
      html += '      <th style="width: 22%;">Required Document</th>';
      html += '      <th style="width: 18%;">Authorized Source / Issuer</th>';
      html += '      <th style="width: 26%;">Reconciliation Audit Action</th>';
      html += '      <th style="width: 20%;">AIS/TIS Matching Instructions</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        html += '    <tr>';
        html += '      <td class="schedule-cell"><strong>' + row.schedule + '</strong></td>';
        html += '      <td>' + row.docName + '</td>';
        html += '      <td class="source-cell">' + row.issuer + '</td>';
        html += '      <td class="audit-cell">' + row.auditAction + '</td>';
        html += '      <td class="instruction-cell">' + row.instruction + '</td>';
        html += '    </tr>';
      }

      html += '  </tbody>';
      html += '</table>';

      return html;
    },

    /**
     * Generate HTML structure for printable tax report - PREMIUM FINTECH GRADE.
     * @param {Object} userData
     * @param {Object} taxResult
     * @param {Array<Object>} suggestions
     * @returns {string} HTML string
     */
    generateReport: function (userData, taxResult, suggestions) {
      var activeRegime = taxResult.recommended;
      var activeData = taxResult[activeRegime + 'Regime'];
      var heads = activeData.heads;
      var selectedForm = window.FormSelector.selectForm(userData);

      var maskedPAN = userData.profile.pan ? userData.profile.pan.substring(0, 5) + '****' + userData.profile.pan.substring(9) : 'N/A';
      var formattedDate = window.Utils.formatDate(new Date().toISOString());
      var udin = this.generateUDIN(userData.profile.pan, userData.profile.name);
      var docSerial = this.generateDocSerial(userData.profile.pan);

      // Pre-compute balance
      var paid = userData.taxesPaid || {};
      var salaryTds = (userData.income && userData.income.salary) ? Number(userData.income.salary.tds || 0) : 0;
      var nonSalaryTds = Number(paid.tds || 0);
      var advanceTaxPaid = Number(paid.advanceTax || 0);
      var selfAssessmentPaid = Number(paid.selfAssessment || 0);
      var totalPaid = salaryTds + nonSalaryTds + advanceTaxPaid + selfAssessmentPaid;
      var bal = activeData.netTax - totalPaid;

      var html = '';

      // ═══════════════════════════════════════════════════════════════════
      // REPORT CONTAINER
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="print-report notranslate" translate="no">';

      // ─── WATERMARK ────────────────────────────────────────────────────
      html += '<div class="watermark">KARDAAN</div>';

      // ─── HEADER BAR ───────────────────────────────────────────────────
      html += '<div class="report-header">';
      html += '  <div class="header-gradient-bar"></div>';
      html += '  <div class="header-content">';
      html += '    <div class="header-left">';
      html += '      <div class="brand-logo">';
      html += '        <span class="brand-name">KARDAAN</span>';
      html += '        <span class="brand-tagline">TAX INTELLIGENCE PLATFORM</span>';
      html += '      </div>';
      html += '      <h1 class="report-title">Statement of Computation of Total Income & Tax Liability</h1>';
      html += '      <div class="report-meta-line">';
      html += '        <span class="meta-chip">AY 2026-27</span>';
      html += '        <span class="meta-chip">FY 2025-26</span>';
      html += '        <span class="meta-chip meta-chip-accent">' + (activeRegime === 'new' ? 'NEW REGIME' : 'OLD REGIME') + '</span>';
      html += '        <span class="meta-chip">' + selectedForm.form + '</span>';
      html += '      </div>';
      html += '    </div>';
      html += '    <div class="header-right">';
      html += '      <div class="certification-seal">';
      html += '        <div class="seal-ring">';
      html += '          <span class="seal-text">AUDITED</span>';
      html += '        </div>';
      html += '      </div>';
      html += '      <div class="doc-serial">' + docSerial + '</div>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';

      // ─── ASSESSEE METADATA TABLE ──────────────────────────────────────
      html += '<table class="meta-table">';
      html += '  <tr>';
      html += '    <td class="meta-label">Name of Assessee</td>';
      html += '    <td class="meta-value"><strong>' + (userData.profile.name || 'N/A').toUpperCase() + '</strong></td>';
      html += '    <td class="meta-label">Permanent Account No.</td>';
      html += '    <td class="meta-value"><strong>' + maskedPAN.toUpperCase() + '</strong></td>';
      html += '  </tr>';
      html += '  <tr>';
      html += '    <td class="meta-label">Assessment Year</td>';
      html += '    <td class="meta-value">2026-27 (FY 2025-26)</td>';
      html += '    <td class="meta-label">Residential Status</td>';
      html += '    <td class="meta-value">Resident Individual</td>';
      html += '  </tr>';
      html += '  <tr>';
      html += '    <td class="meta-label">Age / Category</td>';
      html += '    <td class="meta-value">' + userData.profile.age + ' Years (' + window.Utils.getAgeCategory(userData.profile.age).toUpperCase() + ')</td>';
      html += '    <td class="meta-label">Filing Status</td>';
      html += '    <td class="meta-value">' + (userData.profile.filingType || 'individual').toUpperCase() + ' / CA-GRADE AUDIT</td>';
      html += '  </tr>';
      html += '  <tr>';
      html += '    <td class="meta-label">Recommended ITR Form</td>';
      html += '    <td class="meta-value"><strong>' + selectedForm.form + '</strong> (' + selectedForm.name + ')</td>';
      html += '    <td class="meta-label">Tax Regime</td>';
      html += '    <td class="meta-value"><strong>' + (activeRegime === 'new' ? 'NEW REGIME (SEC 115BAC)' : 'OLD REGIME') + '</strong></td>';
      html += '  </tr>';
      html += '  <tr>';
      html += '    <td class="meta-label">Document Audit Hash</td>';
      html += '    <td class="meta-value" colspan="3"><strong class="mono-text">' + udin + '</strong> <span class="hash-note">(Client-side verification code)</span></td>';
      html += '  </tr>';
      html += '</table>';

      // ─── EXECUTIVE SUMMARY CARDS ──────────────────────────────────────
      html += '<div class="executive-summary">';
      html += '  <div class="summary-header">EXECUTIVE SUMMARY</div>';
      html += '  <div class="summary-cards">';
      html += this._statCard('Gross Total Income', window.Utils.formatCurrency(activeData.grossIncome), COLORS.blue);
      html += this._statCard('Total Deductions', window.Utils.formatCurrency(activeData.otherDeductions + activeData.standardDeduction), COLORS.navyLight);
      html += this._statCard('Net Taxable Income', window.Utils.formatCurrency(activeData.totalTaxableIncome), COLORS.gold);

      if (bal > 0) {
        html += this._statCard('Tax Payable (Net)', window.Utils.formatCurrency(bal), COLORS.red600);
      } else if (bal < 0) {
        html += this._statCard('Refund Due', window.Utils.formatCurrency(Math.abs(bal)), COLORS.green600);
      } else {
        html += this._statCard('Tax Payable (Net)', window.Utils.formatCurrency(activeData.netTax), COLORS.navy);
      }
      html += '  </div>';
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION I: INPUTS LEDGER
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section">';
      html += this._sectionHeading('I', 'Assessee Inputs Ledger', 'Taxpayer declaration audit trail - all values sourced from wizard interview');
      html += this.generateInputsLedgerTable(userData, activeRegime);
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION II: COMPUTATION OF TOTAL INCOME
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section">';
      html += this._sectionHeading('II', 'Particulars of Computation of Total Income', 'Head-wise aggregation as per Income Tax Act, 1961');
      html += '<table class="premium-table computation-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th>Schedule / Head of Income</th>';
      html += '      <th class="text-right">Gross Amount (INR)</th>';
      html += '      <th class="text-right">Deductions/Exempt (INR)</th>';
      html += '      <th class="text-right">Net Taxable (INR)</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      // Salary Row
      if (heads.salaryGross > 0) {
        html += '    <tr>';
        html += '      <td><span class="row-icon schedule-s">S</span> <strong>Schedule S: Income from Salary</strong></td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.salaryGross) + '</td>';
        html += '      <td class="text-right mono-num deduction-cell">-' + window.Utils.formatCurrency(heads.salaryStdDeduction) + '</td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.salaryNet) + '</td>';
        html += '    </tr>';
      }

      // House Property Row
      if (heads.houseProperty !== 0 || heads.hpSetOff !== 0) {
        var hpLossText = heads.houseProperty < 0 ? ' (Loss)' : '';
        html += '    <tr>';
        html += '      <td><span class="row-icon schedule-hp">HP</span> <strong>Schedule HP: Income from House Property</strong>' + hpLossText + '</td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.houseProperty) + '</td>';
        html += '      <td class="text-right mono-num deduction-cell">' + window.Utils.formatCurrency(heads.hpSetOff - heads.houseProperty) + '</td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.hpSetOff) + '</td>';
        html += '    </tr>';
      }

      // Business Income Row
      if (heads.business > 0) {
        html += '    <tr>';
        html += '      <td><span class="row-icon schedule-bp">BP</span> <strong>Schedule BP: Profits & Gains of Business/Profession</strong></td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.business) + '</td>';
        html += '      <td class="text-right mono-num">0</td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.business) + '</td>';
        html += '    </tr>';
      }

      // Capital Gains Row
      if (heads.stcg > 0 || heads.ltcg > 0 || (heads.setoffDetails && (heads.setoffDetails.initial.listedLtcgLoss > 0 || heads.setoffDetails.initial.otherLtcgLoss > 0 || heads.setoffDetails.initial.listedStcgLoss > 0 || heads.setoffDetails.initial.slabStcgLoss > 0))) {
        var totalCg = heads.stcg + heads.ltcg;
        html += '    <tr>';
        html += '      <td><span class="row-icon schedule-cg">CG</span> <strong>Schedule CG: Capital Gains (Net after Set-off)</strong></td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(totalCg) + '</td>';
        html += '      <td class="text-right mono-num">0</td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(totalCg) + '</td>';
        html += '    </tr>';
      }

      // Other Sources Row
      if (heads.otherSources > 0) {
        html += '    <tr>';
        html += '      <td><span class="row-icon schedule-os">OS</span> <strong>Schedule OS: Income from Other Sources</strong></td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.otherSources) + '</td>';
        html += '      <td class="text-right mono-num">0</td>';
        html += '      <td class="text-right mono-num">' + window.Utils.formatCurrency(heads.otherSources) + '</td>';
        html += '    </tr>';
      }

      // Gross Total Income
      html += '    <tr class="summary-row">';
      html += '      <td><strong>Gross Total Income (GTI)</strong></td>';
      html += '      <td colspan="2"></td>';
      html += '      <td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(activeData.grossIncome) + '</strong></td>';
      html += '    </tr>';

      // Deductions under Chapter VI-A
      var dedValue = activeData.otherDeductions;
      html += '    <tr>';
      html += '      <td>Less: Deductions under Chapter VI-A (Schedule VIA)</td>';
      html += '      <td colspan="2"></td>';
      html += '      <td class="text-right mono-num deduction-cell">-' + window.Utils.formatCurrency(dedValue) + '</td>';
      html += '    </tr>';

      // Net Taxable Income
      html += '    <tr class="grand-total-row">';
      html += '      <td><strong>TOTAL TAXABLE INCOME (Rounded Off u/s 288A)</strong></td>';
      html += '      <td colspan="2"></td>';
      html += '      <td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(activeData.totalTaxableIncome) + '</strong></td>';
      html += '    </tr>';

      html += '  </tbody>';
      html += '</table>';
      
      // Capital Gains Set-off sub-table
      if (heads.setoffDetails && (heads.setoffDetails.initial.listedLtcgLoss > 0 || heads.setoffDetails.initial.otherLtcgLoss > 0 || heads.setoffDetails.initial.listedStcgLoss > 0 || heads.setoffDetails.initial.slabStcgLoss > 0 || heads.setoffDetails.initial.listedLtcg > 0 || heads.setoffDetails.initial.otherLtcg > 0 || heads.setoffDetails.initial.listedStcg > 0 || heads.setoffDetails.initial.slabStcg > 0)) {
        html += '<div class="sub-section-block">';
        html += '<p class="sub-section-label"><span class="label-icon">&#9670;</span> Schedule CG: Capital Gains Set-Off Statement (Sec 70 & 74)</p>';
        html += this.generateCapitalGainsSetoffTable(heads.setoffDetails);
        html += '</div>';
      }
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION III: CHAPTER VI-A DEDUCTIONS
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section">';
      html += this._sectionHeading('III', 'Schedule VIA: Details of Deductions Claimed', 'Itemized deductions under Chapter VI-A of the Income Tax Act');
      html += '<table class="premium-table deductions-table">';
      html += '  <thead>';
      html += '    <tr><th>Section</th><th>Particulars / Description</th><th class="text-right">Max Limit (INR)</th><th class="text-right">Claimed Amount (INR)</th></tr>';
      html += '  </thead>';
      html += '  <tbody>';

      if (activeRegime === 'new') {
        if (activeData.otherDeductions > 0) {
          html += '    <tr><td><span class="section-badge">80CCD(2)</span></td><td>Employer Contribution to NPS (Eligible in New Regime)</td><td class="text-right mono-num">14% of Basic</td><td class="text-right mono-num">' + window.Utils.formatCurrency(activeData.otherDeductions) + '</td></tr>';
        } else {
          html += '    <tr><td colspan="4" class="empty-state">No Chapter VI-A deductions are admissible under Section 115BAC (New Tax Regime).</td></tr>';
        }
      } else {
        var breakdown = activeData.deductionsBreakdown || {};
        var hasDeductions = false;
        for (var sec in breakdown) {
          if (breakdown[sec] > 0) {
            hasDeductions = true;
            var limitText = TD.deductions[sec] && TD.deductions[sec].limit ? window.Utils.formatCurrency(TD.deductions[sec].limit) : 'No Limit';
            html += '    <tr><td><span class="section-badge">' + sec + '</span></td><td>' + (TD.deductions[sec] ? TD.deductions[sec].description : 'Tax Savings') + '</td><td class="text-right mono-num">' + limitText + '</td><td class="text-right mono-num">' + window.Utils.formatCurrency(breakdown[sec]) + '</td></tr>';
          }
        }
        if (!hasDeductions) {
          html += '    <tr><td colspan="4" class="empty-state">No Chapter VI-A deductions claimed under the Old Regime.</td></tr>';
        }
      }
      html += '    <tr class="grand-total-row"><td><strong>Total Deductions</strong></td><td colspan="2"></td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(activeData.otherDeductions) + '</strong></td></tr>';
      html += '  </tbody>';
      html += '</table>';
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION IV: TAX LIABILITY COMPUTATION
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section">';
      html += this._sectionHeading('IV', 'Particulars of Tax Liability Computation', 'Step-by-step tax, surcharge, cess, and credits reconciliation');
      html += '<table class="premium-table liability-table">';
      html += '  <thead>';
      html += '    <tr><th>Description</th><th class="text-right">Rate</th><th class="text-right">Amount (INR)</th></tr>';
      html += '  </thead>';
      html += '  <tbody>';
      html += '    <tr><td><span class="row-icon">1</span> Tax on Income at Normal Slab Rates</td><td class="text-right">Progressive</td><td class="text-right mono-num">' + window.Utils.formatCurrency(activeData.slabTax) + '</td></tr>';
      
      if (activeData.capitalGainsTax > 0) {
        html += '    <tr><td><span class="row-icon">2</span> Tax on Capital Gains (Special Rates under Sec 111A/112A)</td><td class="text-right">20% / 12.5%</td><td class="text-right mono-num">' + window.Utils.formatCurrency(activeData.capitalGainsTax) + '</td></tr>';
      }
      
      if (activeData.rebate87A > 0) {
        html += '    <tr class="rebate-row"><td><span class="row-icon rebate-icon">R</span> Less: Rebate under Section 87A</td><td class="text-right">-</td><td class="text-right mono-num">-' + window.Utils.formatCurrency(activeData.rebate87A) + '</td></tr>';
      }
      
      var taxAfterRebate = Math.max(0, activeData.slabTax + activeData.capitalGainsTax - activeData.rebate87A);
      html += '    <tr class="subtotal-row"><td><strong>Tax After Rebate</strong></td><td class="text-right">-</td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(taxAfterRebate) + '</strong></td></tr>';
      
      if (activeData.surcharge > 0) {
        html += '    <tr><td><span class="row-icon">+</span> Add: Surcharge</td><td class="text-right">Slab-based</td><td class="text-right mono-num">' + window.Utils.formatCurrency(activeData.surcharge) + '</td></tr>';
      }
      
      html += '    <tr><td><span class="row-icon">+</span> Add: Health and Education Cess</td><td class="text-right">4.0%</td><td class="text-right mono-num">' + window.Utils.formatCurrency(activeData.cess) + '</td></tr>';
      html += '    <tr class="grand-total-row"><td><strong>NET TAX LIABILITY (A)</strong></td><td class="text-right">-</td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(activeData.netTaxBeforeInterest) + '</strong></td></tr>';
      
      if (activeData.interestTotal > 0) {
        html += '    <tr class="penalty-row"><td><span class="row-icon penalty-icon">!</span> Add: Interest under Section 234B (Default of Advance Tax)</td><td class="text-right">1% / month</td><td class="text-right mono-num">' + window.Utils.formatCurrency(activeData.interest234B) + '</td></tr>';
        html += '    <tr class="penalty-row"><td><span class="row-icon penalty-icon">!</span> Add: Interest under Section 234C (Deferment of Advance Tax)</td><td class="text-right">1% / month</td><td class="text-right mono-num">' + window.Utils.formatCurrency(activeData.interest234C) + '</td></tr>';
        html += '    <tr class="grand-total-row"><td><strong>TOTAL TAX & INTEREST LIABILITY (A1)</strong></td><td class="text-right">-</td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(activeData.netTax) + '</strong></td></tr>';
      }
      
      // Tax Credits Section
      html += '    <tr class="credits-header-row"><td colspan="3"><strong>TAX CREDITS & PREPAID TAXES</strong></td></tr>';
      html += '    <tr><td><span class="row-icon credit-icon">-</span> Less: TDS on Salary (Form 16)</td><td class="text-right">-</td><td class="text-right mono-num credit-cell">-' + window.Utils.formatCurrency(salaryTds) + '</td></tr>';
      html += '    <tr><td><span class="row-icon credit-icon">-</span> Less: TDS / TCS on Non-Salary Income (Form 26AS)</td><td class="text-right">-</td><td class="text-right mono-num credit-cell">-' + window.Utils.formatCurrency(nonSalaryTds) + '</td></tr>';
      html += '    <tr><td><span class="row-icon credit-icon">-</span> Less: Advance Tax Paid</td><td class="text-right">-</td><td class="text-right mono-num credit-cell">-' + window.Utils.formatCurrency(advanceTaxPaid) + '</td></tr>';
      html += '    <tr><td><span class="row-icon credit-icon">-</span> Less: Self-Assessment Tax Paid</td><td class="text-right">-</td><td class="text-right mono-num credit-cell">-' + window.Utils.formatCurrency(selfAssessmentPaid) + '</td></tr>';
      html += '    <tr class="subtotal-row"><td><strong>TOTAL TAX PAID / CREDITS (B)</strong></td><td class="text-right">-</td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(totalPaid) + '</strong></td></tr>';
      
      if (bal > 0) {
        html += '    <tr class="balance-due-row"><td><strong>NET TAX OUTSTANDING (PAYABLE) (A1 - B)</strong></td><td class="text-right">-</td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(bal) + '</strong></td></tr>';
      } else {
        html += '    <tr class="refund-due-row"><td><strong>NET REFUND DUE TO ASSESSEE (B - A1)</strong></td><td class="text-right">-</td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(Math.abs(bal)) + '</strong></td></tr>';
      }
      
      html += '  </tbody>';
      html += '</table>';
      
      // Interest detailed table
      if (activeData.interestTotal > 0) {
        html += this.generateAdvanceTaxInterestTable(activeData, salaryTds + nonSalaryTds, advanceTaxPaid);
      }
      
      html += '</div>';
 
      // ═══════════════════════════════════════════════════════════════════
      // SECTION V: SLAB & SURCHARGE COMPUTATION
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section page-break">';
      html += this._sectionHeading('V', 'Progressive Slab & Surcharge Step-by-Step Computations', 'Detailed audit trail of progressive tax slab application');
      html += this.generateDetailedSlabCalculationTable(activeData.taxableSlabIncome, activeRegime, window.Utils.getAgeCategory(Number(userData.profile.age || 30)));
      
      html += '<div class="computation-notes">';
      if (activeData.surcharge > 0) {
        html += '  <div class="note-item"><span class="note-label">Surcharge Computation:</span> Taxable income exceeds the surcharge threshold. Surcharge is computed at progressive rate on Tax After Rebate: ' + window.Utils.formatCurrency(activeData.slabTax + activeData.capitalGainsTax - activeData.rebate87A) + ' x surcharge rate = ' + window.Utils.formatCurrency(activeData.surcharge) + '.</div>';
      } else {
        html += '  <div class="note-item"><span class="note-label">Surcharge Audit Check:</span> Surcharge is not applicable as total taxable income (' + window.Utils.formatCurrency(activeData.totalTaxableIncome) + ') does not exceed INR 50,00,000 threshold under Section 2(3) of the Finance Act.</div>';
      }
      html += '  <div class="note-item"><span class="note-label">Health & Education Cess:</span> Cess is computed flat at 4% under Section 2(11) of the Finance Act on (Tax after Rebate + Surcharge): (' + window.Utils.formatCurrency(Math.max(0, activeData.slabTax + activeData.capitalGainsTax - activeData.rebate87A)) + ' + ' + window.Utils.formatCurrency(activeData.surcharge) + ') x 4% = ' + window.Utils.formatCurrency(activeData.cess) + '.</div>';
      html += '</div>';
      html += '</div>';
 
      // ═══════════════════════════════════════════════════════════════════
      // SECTION VI: DUAL REGIME COMPARISON
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section">';
      html += this._sectionHeading('VI', 'Regime Suitability & Comparison Statement', 'Side-by-side analysis for optimal regime selection');
      html += '<table class="premium-table comparison-table">';
      html += '  <thead>';
      html += '    <tr><th>Particulars / Head of Income</th><th class="text-right">Old Regime (INR)</th><th class="text-right">New Regime (INR)</th></tr>';
      html += '  </thead>';
      html += '  <tbody>';
      html += '    <tr><td>Gross Total Income (GTI)</td><td class="text-right mono-num">' + window.Utils.formatCurrency(taxResult.oldRegime.grossIncome) + '</td><td class="text-right mono-num">' + window.Utils.formatCurrency(taxResult.newRegime.grossIncome) + '</td></tr>';
      html += '    <tr><td>Less: Chapter VI-A Deductions</td><td class="text-right mono-num deduction-cell">-' + window.Utils.formatCurrency(taxResult.oldRegime.otherDeductions) + '</td><td class="text-right mono-num deduction-cell">-' + window.Utils.formatCurrency(taxResult.newRegime.otherDeductions) + '</td></tr>';
      html += '    <tr><td>Total Net Taxable Income</td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(taxResult.oldRegime.totalTaxableIncome) + '</strong></td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(taxResult.newRegime.totalTaxableIncome) + '</strong></td></tr>';
      html += '    <tr class="grand-total-row"><td><strong>NET TAX LIABILITY (Incl. Cess & Interest)</strong></td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(taxResult.oldRegime.netTax) + '</strong></td><td class="text-right mono-num"><strong>' + window.Utils.formatCurrency(taxResult.newRegime.netTax) + '</strong></td></tr>';
      
      // Recommendation row
      html += '    <tr class="recommendation-row"><td colspan="3">';
      html += '      <div class="recommendation-badge">';
      html += '        <span class="rec-icon">&#10004;</span>';
      html += '        <span class="rec-text">RECOMMENDATION: OPT FOR <strong>' + (activeRegime === 'new' ? 'NEW REGIME' : 'OLD REGIME') + '</strong> (SAVINGS OF <strong>' + window.Utils.formatCurrency(taxResult.savings) + '</strong>)</span>';
      html += '      </div>';
      html += '    </td></tr>';
      html += '  </tbody>';
      html += '</table>';
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION VII: TAX OPTIMIZER
      // ═══════════════════════════════════════════════════════════════════
      if (suggestions.length > 0) {
        html += '<div class="report-section page-break">';
        html += this._sectionHeading('VII', 'Schedule of Recommended Tax Optimization Strategies', 'Actionable items to reduce your future tax liability');
        html += '<table class="premium-table optimizer-table">';
        html += '  <thead>';
        html += '    <tr><th>Section</th><th>Key Action Proposal</th><th class="text-right">Est. Savings (INR)</th><th>Deadline</th></tr>';
        html += '  </thead>';
        html += '  <tbody>';
        var showCount = Math.min(6, suggestions.length);
        for (var k = 0; k < showCount; k++) {
          var sugg = suggestions[k];
          if (sugg.category !== 'regime') {
            html += '    <tr><td><span class="section-badge">' + sugg.section + '</span></td><td>' + sugg.title + ' - ' + sugg.description + '</td><td class="text-right savings-cell">+' + window.Utils.formatCurrency(sugg.potentialSavings) + '</td><td><span class="deadline-badge">' + sugg.deadline + '</span></td></tr>';
          }
        }
        html += '  </tbody>';
        html += '</table>';
        html += '</div>';
      }

      // ═══════════════════════════════════════════════════════════════════
      // SECTION VIII: LEGAL CITATIONS
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section page-break">';
      html += this._sectionHeading('VIII', 'Legal Citations & Explanatory Notes', 'Statutory references under the Income Tax Act, 1961');
      html += '<div class="legal-notes">';
      
      if (heads.salaryGross > 0) {
        html += '<div class="legal-block">';
        html += '  <h3 class="legal-heading">1. Schedule S (Income from Salary)</h3>';
        html += '  <ul class="legal-list">';
        html += '    <li><strong>Section 16(ia) - Standard Deduction:</strong> A statutory flat deduction of ' + window.Utils.formatCurrency(activeRegime === 'new' ? 75000 : 50000) + ' has been applied from the Gross Salary. This is admissible to all salaried employees to cover employment-related expenses without requiring proof of expenditure.</li>';
        if (userData.income.salary && Number(userData.income.salary.hra || 0) > 0 && activeRegime === 'old') {
          html += '    <li><strong>Section 10(13A) - House Rent Allowance (HRA) Exemption:</strong> Exempt HRA is computed as the minimum of: (a) actual HRA received (' + window.Utils.formatCurrency(userData.income.salary.hra || 0) + '), (b) rent paid minus 10% of basic salary, and (c) 50% (metro) or 40% (non-metro) of basic salary. The excess portion is taxable under Schedule S.</li>';
        }
        html += '  </ul>';
        html += '</div>';
      }

      if (heads.houseProperty !== 0 || heads.hpSetOff !== 0) {
        html += '<div class="legal-block">';
        html += '  <h3 class="legal-heading">2. Schedule HP (Income from House Property)</h3>';
        html += '  <ul class="legal-list">';
        html += '    <li><strong>Section 24(a) - Standard Deduction (Rental Income):</strong> If rent is received, a flat 30% of Net Annual Value is allowed as a deduction for repairs and maintenance, irrespective of actual expenditure.</li>';
        html += '    <li><strong>Section 24(b) - Home Loan Interest:</strong> Interest on housing loans is deductible up to INR 2,00,000 for self-occupied properties (Old Regime only). For let-out properties, actual interest is fully deductible.</li>';
        html += '    <li><strong>Section 71 - Loss Set-off:</strong> Inter-head house property loss set-off is capped at -INR 2,00,000 under the Old Regime, and disallowed (INR 0 set-off) under the New Regime.</li>';
        html += '  </ul>';
        html += '</div>';
      }

      if (heads.business > 0) {
        html += '<div class="legal-block">';
        html += '  <h3 class="legal-heading">3. Schedule BP (Profits & Gains of Business or Profession)</h3>';
        html += '  <ul class="legal-list">';
        if (userData.income.business && userData.income.business.isPresumptive) {
          html += '    <li><strong>Sections 44AD / 44ADA - Presumptive Taxation:</strong> Under presumptive schemes, net profits are deemed at 6%/8% of turnover (business) or 50% of receipts (professionals). Taxpayers are exempt from maintaining formal books of accounts (Sec 44AA) or CA audits (Sec 44AB).</li>';
        } else {
          html += '    <li><strong>Section 28 - Profits & Gains:</strong> Taxable business income is calculated as gross business revenue minus deductible business expenses and depreciation on assets.</li>';
        }
        html += '  </ul>';
        html += '</div>';
      }

      if (heads.stcg > 0 || heads.ltcg > 0) {
        html += '<div class="legal-block">';
        html += '  <h3 class="legal-heading">4. Schedule CG (Capital Gains)</h3>';
        html += '  <ul class="legal-list">';
        html += '    <li><strong>Section 111A - Short-Term Capital Gains:</strong> Gains on sale of listed equity shares/mutual funds held for less than 12 months are taxed at a flat rate of 20%.</li>';
        html += '    <li><strong>Section 112A - Long-Term Capital Gains (Listed Equity):</strong> Gains on sale of listed equity held for 12 months or more are taxed at 12.5% on gains exceeding the statutory threshold of INR 1,25,000.</li>';
        html += '    <li><strong>Section 112 - Other Capital Gains:</strong> LTCG on unlisted assets, gold, and real estate is taxed at 12.5% without indexation (Budget 2024 revised).</li>';
        html += '  </ul>';
        html += '</div>';
      }

      if (heads.otherSources > 0) {
        html += '<div class="legal-block">';
        html += '  <h3 class="legal-heading">5. Schedule OS (Income from Other Sources)</h3>';
        html += '  <ul class="legal-list">';
        html += '    <li><strong>Section 56 - Other Sources:</strong> Bank interest, fixed deposits interest, and dividends are aggregated under this head and taxed at slab rates. Winnings from online games/lotteries are taxed at flat 30% under Sec 115BBJ.</li>';
        html += '  </ul>';
        html += '</div>';
      }

      if (activeRegime === 'old' && activeData.otherDeductions > 0) {
        html += '<div class="legal-block">';
        html += '  <h3 class="legal-heading">6. Schedule VIA (Chapter VI-A Deductions)</h3>';
        html += '  <ul class="legal-list">';
        var breakdownNotes = activeData.deductionsBreakdown || {};
        if (breakdownNotes['80C'] > 0) {
          html += '    <li><strong>Section 80C:</strong> Contributions to PPF, EPF, ELSS, and home loan principal are deductible up to the statutory cap of INR 1,50,000.</li>';
        }
        if (breakdownNotes['80D'] > 0) {
          html += '    <li><strong>Section 80D:</strong> Medical insurance premiums are deductible up to INR 25,000 for self/spouse/children (INR 50,000 if senior citizen) and an additional INR 25,000/INR 50,000 for parents.</li>';
        }
        if (breakdownNotes['80CCD1B'] > 0) {
          html += '    <li><strong>Section 80CCD(1B):</strong> Self-contribution to NPS is deductible up to an additional INR 50,000 outside the Section 80C cap.</li>';
        }
        if (breakdownNotes['80TTA'] > 0) {
          html += '    <li><strong>Section 80TTA:</strong> Savings bank interest is deductible up to INR 10,000.</li>';
        }
        if (breakdownNotes['80TTB'] > 0) {
          html += '    <li><strong>Section 80TTB:</strong> Savings and FD interest is deductible up to INR 50,000 for senior citizens.</li>';
        }
        html += '  </ul>';
        html += '</div>';
      }

      if (activeData.rebate87A > 0) {
        html += '<div class="legal-block">';
        html += '  <h3 class="legal-heading">7. Section 87A Tax Rebate & Marginal Relief</h3>';
        html += '  <ul class="legal-list">';
        html += '    <li><strong>Section 87A Rebate:</strong> Provides a rebate up to INR 60,000 (New Regime, income <= INR 12L) or INR 12,500 (Old Regime, income <= INR 5L), reducing net tax to zero.</li>';
        if (activeRegime === 'new' && activeData.taxableSlabIncome > 1200000 && activeData.taxableSlabIncome <= 1212000) {
          html += '    <li><strong>Marginal Relief:</strong> Granted since income slightly exceeds INR 12L. Caps the net tax liability to the exact income amount that exceeds INR 12,00,000, preventing a steep tax spike.</li>';
        }
        html += '  </ul>';
        html += '</div>';
      }

      html += '</div>';
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION IX: COMPLIANCE AUDIT
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section">';
      html += this._sectionHeading('IX', 'CA-Grade Compliance Audit Observation Report', 'Automated audit flags and compliance checks');
      html += '<table class="premium-table audit-table">';
      html += '  <thead>';
      html += '    <tr><th>Audit Area</th><th>Observation / Flag</th><th>Severity</th><th>Recommended Next Step</th></tr>';
      html += '  </thead>';
      html += '  <tbody>';
      
      var auditChecks = window.TaxAuditor.runAudit(userData, taxResult);
      if (auditChecks.length === 0) {
        html += '    <tr><td colspan="4"><div class="compliance-pass-banner"><span class="pass-icon">&#10004;</span> COMPLIANCE PASSED: No audit flags or warning alerts detected. All inputs align with standard rules under the Income Tax Act, 1961.</div></td></tr>';
      } else {
        for (var j = 0; j < auditChecks.length; j++) {
          var check = auditChecks[j];
          var severityClass = check.type === 'danger' ? 'severity-danger' : check.type === 'warning' ? 'severity-warning' : 'severity-info';
          html += '    <tr>';
          html += '      <td><strong>' + check.title + '</strong></td>';
          html += '      <td>' + check.message + '</td>';
          html += '      <td><span class="severity-badge ' + severityClass + '">' + check.type.toUpperCase() + '</span></td>';
          html += '      <td>' + check.action + '</td>';
          html += '    </tr>';
        }
      }
      
      html += '  </tbody>';
      html += '</table>';
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION X: DOCUMENT CHECKLIST
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section page-break">';
      html += this._sectionHeading('X', 'Required Document Verification Checklist', 'Complete document inventory for ITR filing and audit compliance');
      html += this.generateDetailedChecklist(userData, activeRegime, heads);
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SECTION XI: FILING INSTRUCTIONS
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-section">';
      html += this._sectionHeading('XI', 'Filing Instructions & Next Steps', 'Step-by-step guide to complete your ITR filing');
      html += '<div class="filing-instructions">';
      html += '  <div class="instruction-step"><span class="step-num">01</span><div class="step-content"><strong>Login to the Income Tax e-Filing Portal</strong><br>Visit <span class="mono-text">https://incometax.gov.in</span> and login with your PAN credentials.</div></div>';
      html += '  <div class="instruction-step"><span class="step-num">02</span><div class="step-content"><strong>Select ITR Form ' + selectedForm.form + '</strong><br>Navigate to e-File > Income Tax Returns > File Income Tax Return. Select AY 2026-27 and ' + selectedForm.form + ' (' + selectedForm.name + ').</div></div>';
      html += '  <div class="instruction-step"><span class="step-num">03</span><div class="step-content"><strong>Choose Tax Regime</strong><br>Select <strong>' + (activeRegime === 'new' ? 'New Tax Regime (Section 115BAC)' : 'Old Tax Regime') + '</strong> as computed in this statement for optimal tax savings of ' + window.Utils.formatCurrency(taxResult.savings) + '.</div></div>';
      html += '  <div class="instruction-step"><span class="step-num">04</span><div class="step-content"><strong>Enter Income & Deduction Details</strong><br>Use Section I (Inputs Ledger) of this document to fill in all declared income heads and deduction values into the respective ITR schedules.</div></div>';
      html += '  <div class="instruction-step"><span class="step-num">05</span><div class="step-content"><strong>Reconcile with Form 26AS / AIS</strong><br>Cross-verify all TDS credits, advance tax payments, and income entries against the IT Department\'s records using the Document Checklist (Section X).</div></div>';
      html += '  <div class="instruction-step"><span class="step-num">06</span><div class="step-content"><strong>Verify & Submit</strong><br>Preview the computed values, e-Verify using Aadhaar OTP or Net Banking, and download the ITR-V acknowledgement for records.</div></div>';
      html += '</div>';
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // SIGNATURE & CERTIFICATION BLOCK
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="certification-block">';
      html += '  <div class="cert-divider"></div>';
      html += '  <div class="signature-grid">';
      
      // Assessee Signature
      html += '    <div class="sig-box">';
      html += '      <div class="sig-line"></div>';
      html += '      <p class="sig-label">Signature of the Assessee</p>';
      html += '      <p class="sig-detail">Name: ' + (userData.profile.name || 'Taxpayer') + '</p>';
      html += '      <p class="sig-detail">Date: ' + formattedDate + '</p>';
      html += '      <p class="sig-detail">Place: _______________</p>';
      html += '    </div>';
      
      // KarDaan Certification Seal
      html += '    <div class="sig-box">';
      html += '      <div class="cert-stamp">';
      html += '        <div class="stamp-outer">';
      html += '          <div class="stamp-inner">';
      html += '            <span class="stamp-title">KARDAAN</span>';
      html += '            <span class="stamp-subtitle">TAX COMPUTATION</span>';
      html += '            <span class="stamp-subtitle">AUDITED</span>';
      html += '            <span class="stamp-code">' + udin.substring(0, 12) + '</span>';
      html += '          </div>';
      html += '        </div>';
      html += '      </div>';
      html += '      <p class="sig-label">Verified by: KarDaan Tax Audit Engine</p>';
      html += '      <p class="sig-detail">Audit Code: ' + udin + '</p>';
      html += '      <p class="sig-detail">Engine: KD-AUDIT-2026 | AY: 2026-27</p>';
      html += '      <p class="sig-detail">Date: ' + formattedDate + '</p>';
      html += '    </div>';
      
      html += '  </div>';
      html += '</div>';

      // ═══════════════════════════════════════════════════════════════════
      // DISCLAIMER & FOOTER
      // ═══════════════════════════════════════════════════════════════════
      html += '<div class="report-footer">';
      html += '  <div class="disclaimer-block">';
      html += '    <p class="disclaimer-title">AUDIT DISCLAIMER & LEGAL NOTICE</p>';
      html += '    <p class="disclaimer-text">This tax computation statement has been compiled and audited in accordance with the provisions of the Income Tax Act, 1961, as amended by the Finance Act, 2025, for the Assessment Year 2026-27 (Financial Year 2025-26). All schedules (Schedules S, HP, BP, CG, OS, and VIA) have been processed under CA-grade compliance and optimization algorithms. This document serves as a digital computation certificate for filing reference and tax optimization record-keeping. It does not constitute professional tax advice and should be validated by a licensed Chartered Accountant before final ITR submission. The computation is based solely on the information declared by the assessee and does not guarantee accuracy of the underlying declarations.</p>';
      html += '  </div>';
      html += '  <div class="footer-bar">';
      html += '    <span class="footer-brand">KARDAAN Tax Intelligence Platform</span>';
      html += '    <span class="footer-separator">|</span>';
      html += '    <span class="footer-text">Confidential - For Assessee Use Only</span>';
      html += '    <span class="footer-separator">|</span>';
      html += '    <span class="footer-text">Generated: ' + formattedDate + '</span>';
      html += '    <span class="footer-separator">|</span>';
      html += '    <span class="footer-text">Doc: ' + docSerial + '</span>';
      html += '  </div>';
      html += '</div>';

      html += '</div>'; // End .print-report

      return html;
    },

    downloadPDF: function (userData, taxResult, suggestions) {
      var reportHTML = this.generateReport(userData, taxResult, suggestions);

      // Create temporary print container
      var printDiv = document.createElement('div');
      printDiv.id = 'temp-print-div';
      printDiv.className = 'temp-print-wrapper';
      printDiv.innerHTML = reportHTML;
      document.body.appendChild(printDiv);

      // Add print styling - Premium Fintech Grade
      var printStyle = document.createElement('style');
      printStyle.id = 'temp-print-style';
      printStyle.innerHTML = this._getPrintStyles();
      document.head.appendChild(printStyle);

      // Trigger print
      window.print();

      // Cleanup
      setTimeout(function () {
        printDiv.remove();
        printStyle.remove();
      }, 500);
    },

    /**
     * Generate the complete print stylesheet - PREMIUM FINTECH GRADE
     * @returns {string} CSS string
     */
    _getPrintStyles: function () {
      return '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap");' +
        '@media print {' +

        /* ─── GLOBAL RESET ─── */
        '  body > *:not(#temp-print-div) { display: none !important; }' +
        '  #temp-print-div, #temp-print-div * { display: revert; }' +
        '  #temp-print-div { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }' +

        /* ─── REPORT CONTAINER ─── */
        '  .print-report {' +
        '    padding: 0;' +
        '    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;' +
        '    color: ' + COLORS.navy + ';' +
        '    background: ' + COLORS.white + ';' +
        '    line-height: 1.5;' +
        '    max-width: 100%;' +
        '    margin: 0;' +
        '    font-size: 9px;' +
        '    position: relative;' +
        '    -webkit-print-color-adjust: exact !important;' +
        '    print-color-adjust: exact !important;' +
        '  }' +

        /* ─── WATERMARK ─── */
        '  .watermark {' +
        '    position: fixed;' +
        '    top: 50%;' +
        '    left: 50%;' +
        '    transform: translate(-50%, -50%) rotate(-45deg);' +
        '    font-size: 120px;' +
        '    font-weight: 900;' +
        '    color: rgba(10, 22, 40, 0.025);' +
        '    letter-spacing: 20px;' +
        '    pointer-events: none;' +
        '    z-index: 0;' +
        '    white-space: nowrap;' +
        '  }' +

        /* ─── HEADER ─── */
        '  .report-header { margin-bottom: 20px; position: relative; }' +
        '  .header-gradient-bar {' +
        '    height: 5px;' +
        '    background: linear-gradient(90deg, ' + COLORS.navy + ' 0%, ' + COLORS.blue + ' 40%, ' + COLORS.gold + ' 100%);' +
        '    margin-bottom: 16px;' +
        '  }' +
        '  .header-content { display: flex; justify-content: space-between; align-items: flex-start; }' +
        '  .header-left { flex: 1; }' +
        '  .header-right { text-align: right; flex-shrink: 0; margin-left: 20px; }' +
        '  .brand-logo { margin-bottom: 6px; }' +
        '  .brand-name {' +
        '    font-size: 22px;' +
        '    font-weight: 900;' +
        '    letter-spacing: 4px;' +
        '    color: ' + COLORS.navy + ';' +
        '    display: block;' +
        '    line-height: 1;' +
        '  }' +
        '  .brand-tagline {' +
        '    font-size: 7px;' +
        '    font-weight: 600;' +
        '    letter-spacing: 3px;' +
        '    color: ' + COLORS.gold + ';' +
        '    display: block;' +
        '    margin-top: 2px;' +
        '  }' +
        '  .report-title {' +
        '    font-size: 13px;' +
        '    font-weight: 700;' +
        '    color: ' + COLORS.navy + ';' +
        '    margin: 8px 0 6px 0;' +
        '    text-transform: uppercase;' +
        '    letter-spacing: 0.3px;' +
        '    line-height: 1.3;' +
        '  }' +
        '  .report-meta-line { display: flex; gap: 6px; flex-wrap: wrap; }' +
        '  .meta-chip {' +
        '    display: inline-block;' +
        '    padding: 2px 8px;' +
        '    font-size: 7px;' +
        '    font-weight: 600;' +
        '    letter-spacing: 0.5px;' +
        '    border: 1px solid ' + COLORS.slate300 + ';' +
        '    border-radius: 3px;' +
        '    color: ' + COLORS.slate600 + ';' +
        '    background: ' + COLORS.slate50 + ';' +
        '  }' +
        '  .meta-chip-accent {' +
        '    background: ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.white + ' !important;' +
        '    border-color: ' + COLORS.navy + ' !important;' +
        '  }' +

        /* ─── CERTIFICATION SEAL (HEADER) ─── */
        '  .certification-seal { margin-bottom: 6px; }' +
        '  .seal-ring {' +
        '    width: 52px;' +
        '    height: 52px;' +
        '    border: 2.5px solid ' + COLORS.gold + ';' +
        '    border-radius: 50%;' +
        '    display: flex;' +
        '    align-items: center;' +
        '    justify-content: center;' +
        '    margin-left: auto;' +
        '  }' +
        '  .seal-text {' +
        '    font-size: 8px;' +
        '    font-weight: 800;' +
        '    letter-spacing: 1.5px;' +
        '    color: ' + COLORS.gold + ';' +
        '  }' +
        '  .doc-serial {' +
        '    font-family: "JetBrains Mono", monospace;' +
        '    font-size: 7px;' +
        '    color: ' + COLORS.slate500 + ';' +
        '    margin-top: 4px;' +
        '  }' +

        /* ─── META TABLE ─── */
        '  .meta-table {' +
        '    width: 100%;' +
        '    border-collapse: collapse;' +
        '    margin-bottom: 20px;' +
        '    border: 1px solid ' + COLORS.slate200 + ';' +
        '  }' +
        '  .meta-table td {' +
        '    padding: 5px 10px;' +
        '    font-size: 8.5px;' +
        '    border: 1px solid ' + COLORS.slate200 + ';' +
        '    vertical-align: middle;' +
        '    color: ' + COLORS.slate700 + ';' +
        '  }' +
        '  .meta-label {' +
        '    font-weight: 700;' +
        '    background: ' + COLORS.slate50 + ' !important;' +
        '    width: 18%;' +
        '    text-transform: uppercase;' +
        '    font-size: 7.5px !important;' +
        '    letter-spacing: 0.5px;' +
        '    color: ' + COLORS.slate500 + ' !important;' +
        '  }' +
        '  .meta-value { width: 32%; }' +
        '  .hash-note { font-size: 7px; color: ' + COLORS.slate400 + '; }' +
        '  .mono-text { font-family: "JetBrains Mono", monospace; letter-spacing: 0.5px; }' +

        /* ─── EXECUTIVE SUMMARY ─── */
        '  .executive-summary {' +
        '    margin-bottom: 24px;' +
        '    border: 1px solid ' + COLORS.slate200 + ';' +
        '    border-radius: 4px;' +
        '    overflow: hidden;' +
        '  }' +
        '  .summary-header {' +
        '    background: ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.white + ' !important;' +
        '    padding: 6px 14px;' +
        '    font-size: 8px;' +
        '    font-weight: 700;' +
        '    letter-spacing: 2px;' +
        '  }' +
        '  .summary-cards {' +
        '    display: flex;' +
        '    gap: 0;' +
        '    padding: 0;' +
        '  }' +
        '  .stat-card {' +
        '    flex: 1;' +
        '    padding: 10px 14px;' +
        '    background: ' + COLORS.white + ' !important;' +
        '    border-right: 1px solid ' + COLORS.slate200 + ';' +
        '    display: flex;' +
        '    flex-direction: column;' +
        '    gap: 3px;' +
        '  }' +
        '  .stat-card:last-child { border-right: none; }' +
        '  .stat-label {' +
        '    font-size: 7px;' +
        '    font-weight: 600;' +
        '    text-transform: uppercase;' +
        '    letter-spacing: 0.5px;' +
        '    color: ' + COLORS.slate500 + ';' +
        '  }' +
        '  .stat-value {' +
        '    font-size: 13px;' +
        '    font-weight: 800;' +
        '    color: ' + COLORS.navy + ';' +
        '    font-family: "JetBrains Mono", monospace;' +
        '    letter-spacing: -0.5px;' +
        '  }' +

        /* ─── SECTION HEADINGS ─── */
        '  .report-section { margin-bottom: 22px; page-break-inside: avoid; position: relative; z-index: 1; }' +
        '  .section-heading {' +
        '    display: flex;' +
        '    align-items: center;' +
        '    gap: 12px;' +
        '    margin-bottom: 12px;' +
        '    padding-bottom: 8px;' +
        '    border-bottom: 2px solid ' + COLORS.navy + ';' +
        '  }' +
        '  .section-num {' +
        '    background: ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.gold + ' !important;' +
        '    font-size: 11px;' +
        '    font-weight: 800;' +
        '    padding: 4px 10px;' +
        '    border-radius: 3px;' +
        '    letter-spacing: 1px;' +
        '    flex-shrink: 0;' +
        '    line-height: 1.3;' +
        '  }' +
        '  .section-title-group { flex: 1; }' +
        '  .section-title {' +
        '    font-size: 11px;' +
        '    font-weight: 700;' +
        '    margin: 0;' +
        '    text-transform: uppercase;' +
        '    color: ' + COLORS.navy + ';' +
        '    letter-spacing: 0.3px;' +
        '    line-height: 1.3;' +
        '  }' +
        '  .section-subtitle {' +
        '    font-size: 7.5px;' +
        '    color: ' + COLORS.slate500 + ';' +
        '    margin: 2px 0 0 0;' +
        '    font-weight: 400;' +
        '    font-style: italic;' +
        '  }' +

        /* ─── PREMIUM TABLES ─── */
        '  .premium-table {' +
        '    width: 100%;' +
        '    border-collapse: collapse;' +
        '    margin-top: 4px;' +
        '    margin-bottom: 12px;' +
        '    border: 1px solid ' + COLORS.slate200 + ';' +
        '  }' +
        '  .premium-table thead th {' +
        '    background: ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.white + ' !important;' +
        '    padding: 7px 10px;' +
        '    font-size: 8px;' +
        '    text-align: left;' +
        '    text-transform: uppercase;' +
        '    font-weight: 700;' +
        '    letter-spacing: 0.5px;' +
        '    border: none;' +
        '  }' +
        '  .premium-table td {' +
        '    padding: 7px 10px;' +
        '    font-size: 8.5px;' +
        '    vertical-align: middle;' +
        '    color: ' + COLORS.slate700 + ';' +
        '    border-bottom: 1px solid ' + COLORS.slate200 + ';' +
        '    border-left: none;' +
        '    border-right: none;' +
        '  }' +
        '  .premium-table tbody tr:nth-child(even) td { background-color: ' + COLORS.slate50 + ' !important; }' +
        '  .premium-table tbody tr:hover td { background-color: #f0f4ff !important; }' +

        /* ─── ROW ICONS ─── */
        '  .row-icon {' +
        '    display: inline-flex;' +
        '    align-items: center;' +
        '    justify-content: center;' +
        '    width: 18px;' +
        '    height: 18px;' +
        '    border-radius: 3px;' +
        '    font-size: 7px;' +
        '    font-weight: 700;' +
        '    color: ' + COLORS.white + ';' +
        '    background: ' + COLORS.blue + ';' +
        '    margin-right: 6px;' +
        '    vertical-align: middle;' +
        '    flex-shrink: 0;' +
        '  }' +
        '  .schedule-s { background: #4f46e5 !important; }' +
        '  .schedule-hp { background: #0891b2 !important; }' +
        '  .schedule-bp { background: #7c3aed !important; }' +
        '  .schedule-cg { background: #ea580c !important; }' +
        '  .schedule-os { background: #0d9488 !important; }' +

        /* ─── SPECIAL TABLE ROWS ─── */
        '  .summary-row td {' +
        '    background-color: #f0f4ff !important;' +
        '    font-weight: 700;' +
        '    border-top: 2px solid ' + COLORS.navy + ' !important;' +
        '    border-bottom: 2px solid ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.navy + ' !important;' +
        '  }' +
        '  .grand-total-row td {' +
        '    font-weight: 700;' +
        '    font-size: 9px;' +
        '    background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%) !important;' +
        '    color: ' + COLORS.navy + ' !important;' +
        '    border-top: 2px solid ' + COLORS.navy + ' !important;' +
        '    border-bottom: 3px double ' + COLORS.navy + ' !important;' +
        '  }' +
        '  .subtotal-row td {' +
        '    background-color: ' + COLORS.slate50 + ' !important;' +
        '    font-weight: 600;' +
        '    border-top: 1.5px solid ' + COLORS.slate300 + ' !important;' +
        '    border-bottom: 1.5px solid ' + COLORS.slate300 + ' !important;' +
        '  }' +
        '  .balance-due-row td {' +
        '    font-weight: 700;' +
        '    color: ' + COLORS.red700 + ' !important;' +
        '    background: ' + COLORS.red50 + ' !important;' +
        '    border: 1.5px solid ' + COLORS.red200 + ' !important;' +
        '    font-size: 9.5px;' +
        '  }' +
        '  .refund-due-row td {' +
        '    font-weight: 700;' +
        '    color: ' + COLORS.green700 + ' !important;' +
        '    background: ' + COLORS.green50 + ' !important;' +
        '    border: 1.5px solid ' + COLORS.green200 + ' !important;' +
        '    font-size: 9.5px;' +
        '  }' +
        '  .credits-header-row td {' +
        '    background: ' + COLORS.slate100 + ' !important;' +
        '    font-size: 8px;' +
        '    letter-spacing: 1px;' +
        '    text-transform: uppercase;' +
        '    color: ' + COLORS.slate600 + ' !important;' +
        '    padding: 5px 10px;' +
        '  }' +
        '  .rebate-row td { color: ' + COLORS.green700 + ' !important; }' +
        '  .penalty-row td { color: ' + COLORS.red700 + ' !important; }' +

        /* ─── MONO NUMBERS ─── */
        '  .mono-num { font-family: "JetBrains Mono", monospace !important; letter-spacing: 0; font-size: 8.5px; }' +

        /* ─── CELL MODIFIERS ─── */
        '  .deduction-cell { color: ' + COLORS.red600 + ' !important; }' +
        '  .credit-cell { color: ' + COLORS.green600 + ' !important; }' +
        '  .loss-cell { color: ' + COLORS.red600 + ' !important; }' +
        '  .penalty-cell { color: ' + COLORS.red600 + ' !important; font-weight: 600; }' +
        '  .savings-cell { color: ' + COLORS.green600 + ' !important; font-weight: 600; }' +
        '  .text-right { text-align: right !important; }' +
        '  .text-center { text-align: center !important; }' +

        /* ─── STATUS PILLS ─── */
        '  .status-pill {' +
        '    display: inline-block;' +
        '    padding: 1px 6px;' +
        '    font-size: 6px;' +
        '    font-weight: 700;' +
        '    border-radius: 2px;' +
        '    text-transform: uppercase;' +
        '    letter-spacing: 0.5px;' +
        '    margin-right: 4px;' +
        '    vertical-align: middle;' +
        '  }' +
        '  .status-disallowed { background-color: #FEF3C7 !important; color: #92400E !important; }' +
        '  .status-allowed { background-color: #D1FAE5 !important; color: #065F46 !important; }' +

        /* ─── BADGES ─── */
        '  .section-badge {' +
        '    display: inline-block;' +
        '    padding: 2px 6px;' +
        '    font-size: 7px;' +
        '    font-weight: 700;' +
        '    background: ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.white + ' !important;' +
        '    border-radius: 2px;' +
        '    font-family: "JetBrains Mono", monospace;' +
        '  }' +
        '  .rate-badge {' +
        '    display: inline-block;' +
        '    padding: 1px 5px;' +
        '    font-size: 7.5px;' +
        '    font-weight: 700;' +
        '    background: ' + COLORS.slate100 + ' !important;' +
        '    color: ' + COLORS.navy + ';' +
        '    border-radius: 2px;' +
        '    font-family: "JetBrains Mono", monospace;' +
        '  }' +
        '  .exempt-badge {' +
        '    display: inline-block;' +
        '    padding: 1px 5px;' +
        '    font-size: 6.5px;' +
        '    font-weight: 700;' +
        '    background: ' + COLORS.green50 + ' !important;' +
        '    color: ' + COLORS.green700 + ' !important;' +
        '    border-radius: 2px;' +
        '    text-transform: uppercase;' +
        '    letter-spacing: 0.5px;' +
        '  }' +
        '  .pct-badge {' +
        '    font-size: 6.5px;' +
        '    font-weight: 600;' +
        '    color: ' + COLORS.slate400 + ';' +
        '    margin-left: 2px;' +
        '  }' +
        '  .duration-badge {' +
        '    font-size: 6.5px;' +
        '    font-weight: 600;' +
        '    color: ' + COLORS.slate400 + ';' +
        '    margin-left: 2px;' +
        '  }' +
        '  .deadline-badge {' +
        '    display: inline-block;' +
        '    padding: 1px 5px;' +
        '    font-size: 7px;' +
        '    font-weight: 600;' +
        '    background: ' + COLORS.amber50 + ' !important;' +
        '    color: ' + COLORS.amber600 + ' !important;' +
        '    border-radius: 2px;' +
        '  }' +
        '  .inactive-text { color: ' + COLORS.slate400 + '; font-style: italic; font-size: 7.5px; }' +
        '  .active-slab td { background-color: #fefce8 !important; }' +

        /* ─── SEVERITY BADGES ─── */
        '  .severity-badge {' +
        '    display: inline-block;' +
        '    padding: 2px 8px;' +
        '    font-size: 6.5px;' +
        '    font-weight: 700;' +
        '    border-radius: 2px;' +
        '    text-transform: uppercase;' +
        '    letter-spacing: 0.5px;' +
        '  }' +
        '  .severity-danger { background: ' + COLORS.red50 + ' !important; color: ' + COLORS.red700 + ' !important; }' +
        '  .severity-warning { background: ' + COLORS.amber50 + ' !important; color: ' + COLORS.amber600 + ' !important; }' +
        '  .severity-info { background: #eff6ff !important; color: #1d4ed8 !important; }' +

        /* ─── COMPLIANCE BANNER ─── */
        '  .compliance-pass-banner {' +
        '    background: ' + COLORS.green50 + ' !important;' +
        '    color: ' + COLORS.green700 + ' !important;' +
        '    padding: 12px 16px;' +
        '    border-radius: 4px;' +
        '    font-weight: 600;' +
        '    font-size: 9px;' +
        '    border: 1px solid ' + COLORS.green200 + ';' +
        '    display: flex;' +
        '    align-items: center;' +
        '    gap: 8px;' +
        '  }' +
        '  .pass-icon { font-size: 14px; }' +

        /* ─── RECOMMENDATION ROW ─── */
        '  .recommendation-row td { padding: 0 !important; border: none !important; }' +
        '  .recommendation-badge {' +
        '    background: linear-gradient(135deg, ' + COLORS.navy + ' 0%, ' + COLORS.navyLight + ' 100%) !important;' +
        '    color: ' + COLORS.white + ' !important;' +
        '    padding: 10px 16px;' +
        '    display: flex;' +
        '    align-items: center;' +
        '    justify-content: center;' +
        '    gap: 8px;' +
        '    font-size: 9px;' +
        '    letter-spacing: 0.5px;' +
        '  }' +
        '  .rec-icon { font-size: 14px; color: ' + COLORS.gold + '; }' +
        '  .rec-text { color: ' + COLORS.white + '; }' +

        /* ─── SUB-SECTION BLOCKS ─── */
        '  .sub-section-block { margin-top: 8px; }' +
        '  .sub-section-label {' +
        '    font-size: 8.5px;' +
        '    font-weight: 700;' +
        '    color: ' + COLORS.navy + ';' +
        '    margin-bottom: 6px;' +
        '    display: flex;' +
        '    align-items: center;' +
        '    gap: 4px;' +
        '  }' +
        '  .label-icon { font-size: 10px; color: ' + COLORS.gold + '; }' +
        '  .interest-computation-block { margin-top: 12px; }' +

        /* ─── COMPUTATION NOTES ─── */
        '  .computation-notes {' +
        '    margin-top: 10px;' +
        '    border: 1px solid ' + COLORS.slate200 + ';' +
        '    border-radius: 4px;' +
        '    padding: 10px 14px;' +
        '    background: ' + COLORS.slate50 + ' !important;' +
        '  }' +
        '  .note-item { font-size: 8px; line-height: 1.5; margin-bottom: 4px; color: ' + COLORS.slate700 + '; }' +
        '  .note-item:last-child { margin-bottom: 0; }' +
        '  .note-label { font-weight: 700; color: ' + COLORS.navy + '; }' +

        /* ─── LEGAL NOTES ─── */
        '  .legal-notes { font-size: 8.5px; line-height: 1.6; color: ' + COLORS.slate700 + '; }' +
        '  .legal-block { margin-bottom: 12px; }' +
        '  .legal-heading {' +
        '    font-size: 9px;' +
        '    font-weight: 700;' +
        '    color: ' + COLORS.navy + ';' +
        '    margin: 0 0 4px 0;' +
        '    padding-left: 8px;' +
        '    border-left: 3px solid ' + COLORS.gold + ';' +
        '  }' +
        '  .legal-list { margin: 0 0 0 20px; padding: 0; list-style-type: none; }' +
        '  .legal-list li {' +
        '    margin-bottom: 4px;' +
        '    padding-left: 10px;' +
        '    position: relative;' +
        '    font-size: 8px;' +
        '  }' +
        '  .legal-list li:before {' +
        '    content: "\\25B8";' +
        '    position: absolute;' +
        '    left: 0;' +
        '    color: ' + COLORS.gold + ';' +
        '    font-size: 8px;' +
        '  }' +

        /* ─── FILING INSTRUCTIONS ─── */
        '  .filing-instructions { display: flex; flex-direction: column; gap: 0; }' +
        '  .instruction-step {' +
        '    display: flex;' +
        '    align-items: flex-start;' +
        '    gap: 12px;' +
        '    padding: 8px 12px;' +
        '    border-bottom: 1px solid ' + COLORS.slate200 + ';' +
        '  }' +
        '  .instruction-step:last-child { border-bottom: none; }' +
        '  .step-num {' +
        '    flex-shrink: 0;' +
        '    width: 28px;' +
        '    height: 28px;' +
        '    background: ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.gold + ' !important;' +
        '    border-radius: 50%;' +
        '    display: flex;' +
        '    align-items: center;' +
        '    justify-content: center;' +
        '    font-size: 10px;' +
        '    font-weight: 800;' +
        '    font-family: "JetBrains Mono", monospace;' +
        '  }' +
        '  .step-content { font-size: 8.5px; line-height: 1.5; color: ' + COLORS.slate700 + '; flex: 1; }' +
        '  .step-content strong { color: ' + COLORS.navy + '; }' +

        /* ─── CERTIFICATION BLOCK ─── */
        '  .certification-block { margin-top: 30px; page-break-inside: avoid; }' +
        '  .cert-divider {' +
        '    height: 3px;' +
        '    background: linear-gradient(90deg, ' + COLORS.navy + ' 0%, ' + COLORS.blue + ' 40%, ' + COLORS.gold + ' 100%);' +
        '    margin-bottom: 20px;' +
        '  }' +
        '  .signature-grid { display: flex; justify-content: space-between; gap: 40px; }' +
        '  .sig-box { width: 45%; text-align: center; }' +
        '  .sig-line { border-bottom: 1.5px solid ' + COLORS.navy + '; margin-bottom: 8px; height: 40px; }' +
        '  .sig-label { font-size: 8px; font-weight: 700; color: ' + COLORS.navy + '; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px; }' +
        '  .sig-detail { font-size: 7.5px; color: ' + COLORS.slate500 + '; margin: 2px 0; }' +

        /* ─── CERTIFICATION STAMP ─── */
        '  .cert-stamp { margin-bottom: 8px; display: flex; justify-content: center; }' +
        '  .stamp-outer {' +
        '    width: 76px;' +
        '    height: 76px;' +
        '    border: 2px solid ' + COLORS.gold + ';' +
        '    border-radius: 50%;' +
        '    display: flex;' +
        '    align-items: center;' +
        '    justify-content: center;' +
        '    padding: 3px;' +
        '  }' +
        '  .stamp-inner {' +
        '    width: 64px;' +
        '    height: 64px;' +
        '    border: 1.5px dashed ' + COLORS.navy + ';' +
        '    border-radius: 50%;' +
        '    display: flex;' +
        '    flex-direction: column;' +
        '    align-items: center;' +
        '    justify-content: center;' +
        '    gap: 1px;' +
        '  }' +
        '  .stamp-title { font-size: 8px; font-weight: 900; color: ' + COLORS.navy + '; letter-spacing: 1.5px; }' +
        '  .stamp-subtitle { font-size: 5px; font-weight: 700; color: ' + COLORS.gold + '; letter-spacing: 0.5px; text-transform: uppercase; }' +
        '  .stamp-code { font-size: 5px; font-family: "JetBrains Mono", monospace; color: ' + COLORS.slate400 + '; margin-top: 1px; }' +

        /* ─── FOOTER ─── */
        '  .report-footer { margin-top: 20px; page-break-inside: avoid; }' +
        '  .disclaimer-block {' +
        '    border: 1px solid ' + COLORS.slate200 + ';' +
        '    border-radius: 4px;' +
        '    padding: 10px 14px;' +
        '    margin-bottom: 12px;' +
        '    background: ' + COLORS.slate50 + ' !important;' +
        '  }' +
        '  .disclaimer-title {' +
        '    font-size: 7px;' +
        '    font-weight: 700;' +
        '    letter-spacing: 1px;' +
        '    text-transform: uppercase;' +
        '    color: ' + COLORS.slate500 + ';' +
        '    margin: 0 0 4px 0;' +
        '  }' +
        '  .disclaimer-text {' +
        '    font-size: 7px;' +
        '    color: ' + COLORS.slate500 + ';' +
        '    line-height: 1.5;' +
        '    margin: 0;' +
        '    text-align: justify;' +
        '  }' +
        '  .footer-bar {' +
        '    background: ' + COLORS.navy + ' !important;' +
        '    color: ' + COLORS.slate400 + ' !important;' +
        '    padding: 6px 14px;' +
        '    font-size: 6.5px;' +
        '    display: flex;' +
        '    align-items: center;' +
        '    gap: 8px;' +
        '    border-radius: 3px;' +
        '  }' +
        '  .footer-brand { font-weight: 700; color: ' + COLORS.gold + ' !important; letter-spacing: 1px; }' +
        '  .footer-separator { color: ' + COLORS.slate600 + '; }' +
        '  .footer-text { color: ' + COLORS.slate400 + '; }' +

        /* ─── INPUT LEDGER SPECIFIC ─── */
        '  .category-cell { font-size: 8px; }' +
        '  .category-first-row td { border-top: 2px solid ' + COLORS.slate200 + ' !important; }' +
        '  .source-cell { font-size: 7.5px !important; color: ' + COLORS.slate500 + ' !important; }' +
        '  .impact-cell { font-size: 7.5px !important; line-height: 1.4; color: ' + COLORS.slate600 + ' !important; }' +
        '  .audit-cell { font-size: 7.5px !important; line-height: 1.4; }' +
        '  .instruction-cell { font-size: 7.5px !important; line-height: 1.4; color: ' + COLORS.slate500 + ' !important; }' +
        '  .schedule-cell { font-size: 8px; }' +
        '  .formula-cell { font-size: 8px; color: ' + COLORS.slate500 + '; font-family: "JetBrains Mono", monospace; }' +
        '  .empty-state { text-align: center; color: ' + COLORS.slate400 + '; font-style: italic; padding: 16px !important; font-size: 8.5px; }' +

        /* ─── INTEREST TABLE SPECIFIC ─── */
        '  .section-234b-row td { background: ' + COLORS.red50 + ' !important; }' +
        '  .rebate-icon { background: ' + COLORS.green600 + ' !important; }' +
        '  .penalty-icon { background: ' + COLORS.red600 + ' !important; }' +
        '  .credit-icon { background: ' + COLORS.green600 + ' !important; }' +

        /* ─── PAGE SETTINGS ─── */
        '  .page-break { page-break-before: always; }' +
        '  @page {' +
        '    size: A4 portrait;' +
        '    margin: 12mm 12mm 15mm 12mm;' +
        '  }' +
        '}';
    },

    /**
     * Generate HTML summary card structure.
     * @param {Object} taxResult
     * @returns {string} HTML
     */
    generateSummaryHTML: function (taxResult) {
      var rec = taxResult.recommended;
      var recData = taxResult[rec + 'Regime'];
      var savings = taxResult.savings;

      var html = '';
      html += '<div class="summary-panel glass-heavy">';
      html += '  <h3 class="summary-title text-gradient">Tax Computation Summary</h3>';
      html += '  <div class="summary-item"><span>Gross Total Income:</span><strong>' + window.Utils.formatCurrency(recData.grossIncome) + '</strong></div>';
      html += '  <div class="summary-item"><span>Standard Deduction:</span><strong>-' + window.Utils.formatCurrency(recData.standardDeduction) + '</strong></div>';
      if (recData.otherDeductions > 0) {
        html += '  <div class="summary-item"><span>Chapter VI-A Deductions:</span><strong>-' + window.Utils.formatCurrency(recData.otherDeductions) + '</strong></div>';
      }
      html += '  <div class="summary-item"><span>Net Taxable Income:</span><strong>' + window.Utils.formatCurrency(recData.taxableSlabIncome) + '</strong></div>';
      html += '  <div class="summary-item total"><span>Net Tax Payable:</span><strong class="text-primary">' + window.Utils.formatCurrency(recData.netTax) + '</strong></div>';
      
      if (savings > 0) {
        html += '  <div class="alert alert-success gap-2 items-center" style="margin-top: 15px; padding: 10px; font-size: 11px;">';
        html += '    <span></span>';
        html += '    <span>Recommended: <strong>' + (rec === 'new' ? 'New Regime' : 'Old Regime') + '</strong> (Saves ' + window.Utils.formatCurrencyShort(savings) + ')</span>';
        html += '  </div>';
      }
      html += '</div>';

      return html;
    }
  };
})();
