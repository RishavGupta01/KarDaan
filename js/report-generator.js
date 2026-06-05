/**
 * @file report-generator.js
 * @description Generates printable reports and summaries for tax filings in India.
 *              Builds structured print layouts that convert clean to PDF via the browser.
 * @version 1.2.0
 * @license MIT
 */

(function () {
  'use strict';

  if (!window.Utils || !window.FormSelector) {
    throw new Error('[ReportGenerator] window.Utils and window.FormSelector are required.');
  }

  var TD = window.TaxData;

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
     * Generate tabular ledger of Capital Gains set-offs under Sections 70 and 74.
     * @param {Object} setoff - Set-off details from TaxEngine
     * @returns {string} HTML table
     */
    generateCapitalGainsSetoffTable: function (setoff) {
      if (!setoff) return '';
      
      var html = '';
      html += '<table class="print-table" style="margin-top: 10px; margin-bottom: 15px;">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th>Asset Category & Gain Type</th>';
      html += '      <th class="text-right">Gross Gains (₹)</th>';
      html += '      <th class="text-right">Loss Set-off (₹)</th>';
      html += '      <th class="text-right">Net Taxable (₹)</th>';
      html += '      <th class="text-right">Carry-forward Loss (₹)</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      // Slab STCG
      var slabStcgLossApplied = setoff.applied.stclAgainstSlabStcg;
      html += '    <tr>';
      html += '      <td>STCG Slab Rate (Real Estate/Gold/Debt)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.slabStcg) + '</td>';
      html += '      <td class="text-right">-' + window.Utils.formatCurrency(slabStcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.slabStcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Listed STCG
      var listedStcgLossApplied = setoff.applied.stclAgainstListedStcg;
      html += '    <tr>';
      html += '      <td>STCG Sec 111A (Listed Equity)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.listedStcg) + '</td>';
      html += '      <td class="text-right">-' + window.Utils.formatCurrency(listedStcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.listedStcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Other LTCG
      var otherLtcgLossApplied = setoff.applied.ltclAgainstOtherLtcg + setoff.applied.stclAgainstOtherLtcg;
      html += '    <tr>';
      html += '      <td>LTCG Sec 112 (Real Estate/Gold/Other)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.otherLtcg) + '</td>';
      html += '      <td class="text-right">-' + window.Utils.formatCurrency(otherLtcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.otherLtcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Listed LTCG
      var listedLtcgLossApplied = setoff.applied.ltclAgainstListedLtcg + setoff.applied.stclAgainstListedLtcg;
      html += '    <tr>';
      html += '      <td>LTCG Sec 112A (Listed Equity)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.initial.listedLtcg) + '</td>';
      html += '      <td class="text-right">-' + window.Utils.formatCurrency(listedLtcgLossApplied) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(setoff.final.listedLtcg) + '</td>';
      html += '      <td class="text-right">0</td>';
      html += '    </tr>';

      // Carry forwards row
      if (setoff.final.stclCarryForward > 0 || setoff.final.ltclCarryForward > 0) {
        html += '    <tr class="total-row">';
        html += '      <td><strong>Carry-Forward Losses to AY 2027-28</strong></td>';
        html += '      <td colspan="3"></td>';
        html += '      <td class="text-right" style="color: #b91c1c;"><strong>STCL: ' + window.Utils.formatCurrency(setoff.final.stclCarryForward) + '<br>LTCL: ' + window.Utils.formatCurrency(setoff.final.ltclCarryForward) + '</strong></td>';
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
      html += '<p style="font-size: 10px; margin-top: 15px; margin-bottom: 4px; font-weight: bold; color: #1e3a8a;">Section 234B & 234C: Detailed Penal Interest Computation</p>';
      html += '<table class="print-table" style="margin-bottom: 15px;">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th>Interest Section / Installment Due Date</th>';
      html += '      <th class="text-right">Assessed Tax (₹)</th>';
      html += '      <th class="text-right">Required Cumulative (₹)</th>';
      html += '      <th class="text-right">Actual Cumulative (₹)</th>';
      html += '      <th class="text-right">Shortfall (₹)</th>';
      html += '      <th class="text-right">Interest (1% pm) (₹)</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      // 234C Q1
      var q1Req = assessedTax * 0.15;
      var q1Int = assessedTax * 0.15 * 0.01 * 3;
      html += '    <tr>';
      html += '      <td>Sec 234C - Installment 1 (15 June 2025)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q1Req) + ' (15%)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(0) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q1Req) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q1Int) + ' (3 months)</td>';
      html += '    </tr>';

      // 234C Q2
      var q2Req = assessedTax * 0.45;
      var q2Int = assessedTax * 0.45 * 0.01 * 3;
      html += '    <tr>';
      html += '      <td>Sec 234C - Installment 2 (15 Sept 2025)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q2Req) + ' (45%)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(0) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q2Req) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q2Int) + ' (3 months)</td>';
      html += '    </tr>';

      // 234C Q3
      var q3Req = assessedTax * 0.75;
      var q3Int = assessedTax * 0.75 * 0.01 * 3;
      html += '    <tr>';
      html += '      <td>Sec 234C - Installment 3 (15 Dec 2025)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q3Req) + ' (75%)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(0) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q3Req) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q3Int) + ' (3 months)</td>';
      html += '    </tr>';

      // 234C Q4
      var q4Req = assessedTax * 1.00;
      var shortfallQ4 = Math.max(0, assessedTax - advanceTaxPaid);
      var q4Int = shortfallQ4 * 0.01 * 1;
      html += '    <tr>';
      html += '      <td>Sec 234C - Installment 4 (15 March 2026)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q4Req) + ' (100%)</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(advanceTaxPaid) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(shortfallQ4) + '</td>';
      html += '      <td class="text-right">' + window.Utils.formatCurrency(q4Int) + ' (1 month)</td>';
      html += '    </tr>';

      // 234B
      if (activeData.interest234B > 0) {
        var shortfallB = Math.max(0, assessedTax - advanceTaxPaid);
        html += '    <tr>';
        html += '      <td>Sec 234B - Default of Advance Tax (FY end shortfall)</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax) + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(assessedTax * 0.90) + (assessedTax * 0.90 >= 100000 ? ' (90%)' : '') + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(advanceTaxPaid) + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(shortfallB) + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(activeData.interest234B) + ' (4 months)</td>';
        html += '    </tr>';
      }

      html += '    <tr class="total-row">';
      html += '      <td colspan="5"><strong>Total Penal Interest (Sec 234B + 234C)</strong></td>';
      html += '      <td class="text-right" style="color: #b91c1c;"><strong>' + window.Utils.formatCurrency(activeData.interestTotal) + '</strong></td>';
      html += '    </tr>';
      html += '  </tbody>';
      html += '</table>';
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
      if (userData.selectedIncomes.salary && userData.income.salary) {
        var sal = userData.income.salary;
        if (sal.grossSalary > 0) {
          rows.push({
            category: 'Schedule S: Salary',
            input: 'Gross Salary (Annual)',
            value: window.Utils.formatCurrency(sal.grossSalary),
            source: 'Step: Salary > Gross Salary',
            impact: 'Formulates base Gross Income. Standard deduction of ' + (activeRegime === 'new' ? '₹75,000' : '₹50,000') + ' is automatically deducted.'
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
      if (userData.selectedIncomes.property && userData.income.houseProperty && userData.income.houseProperty.length > 0) {
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
                ? 'Deductible up to ₹2,00,000 under Sec 24(b) (Old Regime only). Restricted to ₹0 in New Regime.' 
                : 'Fully deductible from let-out rental income under Sec 24(b). Net losses can set off against other heads up to ₹2,00,000 (Old Regime only).'
            });
          }
        }
      }

      // 4. Capital Gains
      if (userData.selectedIncomes.gains && userData.income.capitalGains) {
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
            var isLoss = cg.listed.ltcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLoss ? 'Long-Term Capital Loss (Equity)' : 'Long-Term Capital Gains (Equity)',
              value: window.Utils.formatCurrency(cg.listed.ltcg),
              source: 'Step: Capital Gains > LTCG Equity',
              impact: isLoss
                ? 'Long-term capital loss. Can only set off against LTCG under Section 74.'
                : 'Taxed at flat 12.5% under Section 112A. Eligible for a combined statutory tax exemption on the first ₹1,25,000 of gains.'
            });
          }
        }
        if (cg.property) {
          if (cg.property.stcg !== 0) {
            var isLoss = cg.property.stcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLoss ? 'Short-Term Loss (Property)' : 'Short-Term Gains (Property)',
              value: window.Utils.formatCurrency(cg.property.stcg),
              source: 'Step: Capital Gains > STCG Property',
              impact: isLoss
                ? 'Short-term capital loss. Can set off against any STCG or LTCG.'
                : 'Taxed at normal progressive slab rates based on your selected regime.'
            });
          }
          if (cg.property.ltcg !== 0) {
            var isLoss = cg.property.ltcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLoss ? 'Long-Term Loss (Property)' : 'Long-Term Gains (Property)',
              value: window.Utils.formatCurrency(cg.property.ltcg),
              source: 'Step: Capital Gains > LTCG Property',
              impact: isLoss
                ? 'Long-term capital loss. Can only set off against LTCG.'
                : 'Taxed at a flat rate of 12.5% without indexation (Budget 2024 revised rules).'
            });
          }
        }
        if (cg.gold) {
          if (cg.gold.stcg !== 0) {
            var isLoss = cg.gold.stcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLoss ? 'Short-Term Loss (Gold)' : 'Short-Term Gains (Gold)',
              value: window.Utils.formatCurrency(cg.gold.stcg),
              source: 'Step: Capital Gains > STCG Gold',
              impact: isLoss
                ? 'Short-term capital loss. Can set off against any STCG or LTCG.'
                : 'Taxed at progressive slab rates.'
            });
          }
          if (cg.gold.ltcg !== 0) {
            var isLoss = cg.gold.ltcg < 0;
            rows.push({
              category: 'Schedule CG: Capital Gains',
              input: isLoss ? 'Long-Term Loss (Gold)' : 'Long-Term Gains (Gold)',
              value: window.Utils.formatCurrency(cg.gold.ltcg),
              source: 'Step: Capital Gains > LTCG Gold',
              impact: isLoss
                ? 'Long-term capital loss. Can only set off against LTCG.'
                : 'Taxed at a flat rate of 12.5% under Section 112.'
            });
          }
        }
        if (cg.debt && cg.debt.gains !== 0) {
          var isLoss = cg.debt.gains < 0;
          rows.push({
            category: 'Schedule CG: Capital Gains',
            input: isLoss ? 'Debt Mutual Fund Losses' : 'Debt Mutual Fund Gains',
            value: window.Utils.formatCurrency(cg.debt.gains),
            source: 'Step: Capital Gains > Debt Funds',
            impact: isLoss
              ? 'Short-term capital loss. Can set off against any STCG or LTCG.'
              : 'Classified strictly as Short-Term Capital Gains under Section 50AA; taxed at progressive slab rates.'
          });
        }
      }

      // 5. Business Income
      if (userData.selectedIncomes.business && userData.income.business) {
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
      if (userData.selectedIncomes.other && userData.income.otherSources) {
        var os = userData.income.otherSources;
        if (os.savingsInterest > 0) {
          rows.push({
            category: 'Schedule OS: Other Sources',
            input: 'Savings Bank Interest',
            value: window.Utils.formatCurrency(os.savingsInterest),
            source: 'Step: Other Income > Savings Interest',
            impact: 'Taxable under slab rates. Eligible for deduction up to ₹10,000 under Sec 80TTA (non-seniors) or ₹50,000 under Sec 80TTB (seniors).'
          });
        }
        if (os.fdInterest > 0) {
          rows.push({
            category: 'Schedule OS: Other Sources',
            input: 'FD/Post-office Interest',
            value: window.Utils.formatCurrency(os.fdInterest),
            source: 'Step: Other Income > FD Interest',
            impact: 'Taxable under progressive slab rates. Seniors can deduct combined FD & savings interest up to ₹50,000 under Sec 80TTB.'
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
        return '<p class="text-muted text-center" style="font-size: 10px; padding: 15px;">No active inputs declared.</p>';
      }

      html += '<table class="print-table inputs-ledger-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th style="width: 20%;">Category / Head</th>';
      html += '      <th style="width: 25%;">Declared Input Parameter</th>';
      html += '      <th style="width: 15%;" class="text-right">Value (₹)</th>';
      html += '      <th style="width: 20%;">Source Step</th>';
      html += '      <th style="width: 20%;">Tax Impact Explanation</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var badgeHtml = '';
        if (row.category.indexOf('Deductions') !== -1 || row.category.indexOf('Salary') !== -1 || row.category.indexOf('Profile') !== -1 || row.category.indexOf('Gains') !== -1 || row.category.indexOf('Business') !== -1 || row.category.indexOf('Other') !== -1 || row.category.indexOf('Pre-Paid') !== -1) {
          var isDisallowed = (row.impact.indexOf('Ineligible') !== -1 || row.impact.indexOf('Disallowed') !== -1 || row.impact.indexOf('disallowed') !== -1);
          if (isDisallowed) {
            badgeHtml = '<span class="status-badge status-disallowed">Disallowed</span> ';
          } else if (row.category.indexOf('Deductions') !== -1 || row.category.indexOf('Salary') !== -1 || row.category.indexOf('Gains') !== -1 || row.category.indexOf('Business') !== -1 || row.category.indexOf('Other') !== -1) {
            badgeHtml = '<span class="status-badge status-allowed">Allowed</span> ';
          }
        }
        html += '    <tr>';
        html += '      <td><strong>' + row.category + '</strong></td>';
        html += '      <td>' + row.input + '</td>';
        html += '      <td class="text-right">' + row.value + '</td>';
        html += '      <td><span style="font-size: 9px; color: #555;">' + row.source + '</span></td>';
        html += '      <td style="font-size: 9px; line-height: 1.3; color: #333;">' + badgeHtml + row.impact + '</td>';
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
      html += '<table class="print-table slab-computation-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th>Tax Slab Bracket (₹)</th>';
      html += '      <th class="text-right">Tax Rate</th>';
      html += '      <th class="text-right">Taxable Income in Slab (₹)</th>';
      html += '      <th class="text-right">Tax Computed in Slab (₹)</th>';
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
          rangeText = (slab.min === 0 ? '₹0' : window.Utils.formatCurrency(slab.min + 1)) + ' to ' + window.Utils.formatCurrency(slab.max);
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
            formula = 'Exempt';
          } else {
            formula = window.Utils.formatCurrency(taxableInSlab) + ' × ' + rateText;
          }
        } else {
          taxableInSlab = 0;
          slabTax = 0;
          formula = 'Income below slab';
        }

        html += '    <tr>';
        html += '      <td>' + rangeText + '</td>';
        html += '      <td class="text-right">' + rateText + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(taxableInSlab) + '</td>';
        html += '      <td class="text-right">' + window.Utils.formatCurrency(slabTax) + '</td>';
        html += '      <td style="font-size: 9px; color: #444;">' + formula + '</td>';
        html += '    </tr>';
      }

      html += '    <tr class="total-row">';
      html += '      <td colspan="2"><strong>Aggregated Slab Tax</strong></td>';
      html += '      <td class="text-right"><strong>' + window.Utils.formatCurrency(taxableIncome) + '</strong></td>';
      html += '      <td class="text-right"><strong>' + window.Utils.formatCurrency(Math.round(totalSlabTax * 100) / 100) + '</strong></td>';
      html += '      <td>Sum of progressive slab rates</td>';
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
            instruction: 'Verify rent receipts are signed. Landlord PAN is mandatory if annual rent exceeds ₹1,00,000. Reconcile with bank debits.'
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
            instruction: 'Ensure self-occupied deduction is capped at ₹2,00,000 (Old Regime only). Verify co-borrower share if shared property.'
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
        var biz = userData.income.business || {};
        if (biz.type === 'regular') {
          rows.push({
            schedule: 'Schedule BP',
            docName: 'Audited Financials (P&L, Balance Sheet, Ledger)',
            issuer: 'Assessee / Auditor CA',
            auditAction: 'Audit business expenses, asset depreciation charts (WDV), and verify net profits under Section 28.',
            instruction: 'Check if audit under Sec 44AB is required (turnover > ₹1Cr/₹10Cr). Match sales records with GST GSTR-1/3B filings.'
          });
        } else {
          rows.push({
            schedule: 'Schedule BP (Presumptive)',
            docName: 'Presumptive Income Statement & GST Return summary',
            issuer: 'Assessee / GST Portal',
            auditAction: 'Verify turnover thresholds under Sec 44AD (₹2Cr/₹3Cr) or Sec 44ADA (₹50L/₹75L) and check digital transaction records.',
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
          instruction: 'Match transaction logs with AIS equity sale records. Verify Section 112A listed equity LTCG exemption of ₹1,25,000.'
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
          instruction: 'Verify Section 80TTA (up to ₹10,000) or Section 80TTB (up to ₹50,000 for seniors) deductions are correctly claimed.'
        });
      }

      // 7. Deductions Schedule VIA
      if (activeRegime === 'old' && userData.deductions) {
        var deds = userData.deductions;
        if (deds['80C'] > 0 || deds['80CCC'] > 0 || deds['80CCD1'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80C)',
            docName: 'Investment Proofs (PPF passbook, ELSS statements, LIC receipt)',
            issuer: 'Post Office / Fund Houses / Life Insurance Co.',
            auditAction: 'Verify that investments were deposited before March 31, 2026, and that policy premiums align with Section 80C guidelines.',
            instruction: 'Ensure the combined deduction under Sec 80C, 80CCC, and 80CCD(1) does not exceed the ₹1,50,000 ceiling.'
          });
        }
        if (deds['80CCD1B'] > 0 || deds['80CCD2'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (NPS)',
            docName: 'NPS Transaction Statement & Account Ledger',
            issuer: 'NPS Trust / CRA (NSDL/Karvy)',
            auditAction: 'Verify self-contribution under 80CCD(1B) (cap ₹50,000) and employer contribution under 80CCD(2) (cap 10% of Basic).',
            instruction: 'Ensure employer contribution matches the Form 16 Part B declaration. Reconcile with corporate salary structures.'
          });
        }
        if (deds['80D_self'] > 0 || deds['80D_parents'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80D)',
            docName: 'Health Insurance Certificate & Premium Bank receipts',
            issuer: 'Health Insurance Provider',
            auditAction: 'Confirm health insurance policy parameters, member age categories (senior vs non-senior), and payment modes.',
            instruction: 'Verify that premium payment was made through digital channels (cheque/online/card). Cash premiums are strictly disallowed.'
          });
        }
        if (deds['80E'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80E)',
            docName: 'Education Loan Interest Certificate',
            issuer: 'Lending Bank',
            auditAction: 'Verify the interest paid during the year. No deduction is available for principal repayment.',
            instruction: 'Verify the loan is taken for higher education of self, spouse, or children, and is within the 8-year statutory limit.'
          });
        }
        if (deds['80G'] > 0) {
          rows.push({
            schedule: 'Schedule VIA (80G)',
            docName: 'Donation Receipts & Form 10BE Certificate',
            issuer: 'Registered Charitable Trust / NGO',
            auditAction: 'Verify the PAN of the donee trust, donor registration numbers, and donation eligibility categories (100% or 50% exemption).',
            instruction: 'Reconcile donations with Form 10BE. Cash donations above ₹2,000 are not eligible for tax deduction.'
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
      html += '<table class="print-table detailed-checklist-table">';
      html += '  <thead>';
      html += '    <tr>';
      html += '      <th style="width: 15%;">Schedule</th>';
      html += '      <th style="width: 25%;">Required Document Name</th>';
      html += '      <th style="width: 20%;">Authorized Source / Issuer</th>';
      html += '      <th style="width: 25%;">Specific Reconciliation Audit Action</th>';
      html += '      <th style="width: 15%;">AIS / TIS Matching Instructions</th>';
      html += '    </tr>';
      html += '  </thead>';
      html += '  <tbody>';

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        html += '    <tr>';
        html += '      <td><strong>' + row.schedule + '</strong></td>';
        html += '      <td>' + row.docName + '</td>';
        html += '      <td>' + row.issuer + '</td>';
        html += '      <td style="font-size: 9px; line-height: 1.3;">' + row.auditAction + '</td>';
        html += '      <td style="font-size: 9px; line-height: 1.3; color: #444;">' + row.instruction + '</td>';
        html += '    </tr>';
      }

      html += '  </tbody>';
      html += '</table>';

      return html;
    },

    /**
     * Generate HTML structure for printable tax report.
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

      var html = '';

      // Report Container
      html += '<div class="print-report notranslate" translate="no">';
      
      // Document Header
      html += '  <div class="print-header" style="display: flex !important; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 25px;">';
      html += '    <div style="text-align: left;">';
      html += '      <h1 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">STATEMENT OF COMPUTATION OF TOTAL INCOME & TAX LIABILITY</h1>';
      html += '      <p style="margin: 4px 0 0 0; font-size: 9px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; color: #475569;">Assessment Year: 2026-27 | Financial Year: 2025-26</p>';
      html += '    </div>';
      html += '    <div style="border: 2px solid #0f172a; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 10px; letter-spacing: 1px; color: #0f172a; text-transform: uppercase; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; background: #f8fafc; flex-shrink: 0; margin-left: 15px;">';
      html += '      <span style="font-size: 11px; font-weight: 800;">KARDAAN</span>';
      html += '      <span style="font-size: 6px; font-weight: 700; color: #64748b; white-space: nowrap;">CERTIFIED AUDIT</span>';
      html += '    </div>';
      html += '  </div>';

      // Assessee Metadata (Meta Table)
      html += '  <table class="audit-meta-table">';
      html += '    <tr>';
      html += '      <td class="label">Name of Assessee</td><td><strong>' + (userData.profile.name || 'N/A').toUpperCase() + '</strong></td>';
      html += '      <td class="label">Permanent Account No (PAN)</td><td><strong>' + maskedPAN.toUpperCase() + '</strong></td>';
      html += '    </tr>';
      html += '    <tr>';
      html += '      <td class="label">Assessment Year</td><td>2026-27 (FY 2025-26)</td>';
      html += '      <td class="label">Residential Status</td><td>Resident Individual</td>';
      html += '    </tr>';
      html += '    <tr>';
      html += '      <td class="label">Age / Category</td><td>' + userData.profile.age + ' Years (' + window.Utils.getAgeCategory(userData.profile.age).toUpperCase() + ')</td>';
      html += '      <td class="label">Filing Status / Type</td><td>' + (userData.profile.filingType || 'individual').toUpperCase() + ' / CA-GRADE AUDITED SUMMARY</td>';
      html += '    </tr>';
      html += '    <tr>';
      html += '      <td class="label">Recommended Return Form</td><td><strong>' + selectedForm.form + ' (' + selectedForm.name + ')</strong></td>';
      html += '      <td class="label">Tax Regime Selected</td><td><strong>' + (activeRegime === 'new' ? 'NEW REGIME (SEC 115BAC)' : 'OLD REGIME') + '</strong></td>';
      html += '    </tr>';
      html += '    <tr>';
      html += '      <td class="label">Document Audit Hash</td><td colspan="3"><strong>' + udin + '</strong> (Client-side verification code)</td>';
      html += '    </tr>';
      html += '  </table>';

      // Section I: Inputs Ledger
      html += '  <div class="print-section">';
      html += '    <h2>I. Assessee Inputs Ledger (Taxpayer Declaration)</h2>';
      html += '    <p style="font-size: 10px; margin-bottom: 6px; color: #333;">The following values were declared by the taxpayer during the interview and serve as the baseline input data for this tax computation statement:</p>';
      html += this.generateInputsLedgerTable(userData, activeRegime);
      html += '  </div>';

      // Section II: Main computation summary
      html += '  <div class="print-section">';
      html += '    <h2>II. Particulars of Computation of Total Income</h2>';
      html += '    <table class="print-table">';
      html += '      <thead>';
      html += '        <tr>';
      html += '          <th>Schedule / Head of Income</th>';
      html += '          <th class="text-right">Gross Amount (₹)</th>';
      html += '          <th class="text-right">Deductions/Exempt (₹)</th>';
      html += '          <th class="text-right">Net Taxable (₹)</th>';
      html += '        </tr>';
      html += '      </thead>';
      html += '      <tbody>';

      // Salary Row
      if (heads.salaryGross > 0) {
        html += '        <tr>';
        html += '          <td><strong>Schedule S: Income from Salary</strong></td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.salaryGross) + '</td>';
        html += '          <td class="text-right">-' + window.Utils.formatCurrency(heads.salaryStdDeduction) + '</td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.salaryNet) + '</td>';
        html += '        </tr>';
      }

      // House Property Row
      if (heads.houseProperty !== 0 || heads.hpSetOff !== 0) {
        var hpLossText = heads.houseProperty < 0 ? ' (Loss)' : '';
        html += '        <tr>';
        html += '          <td><strong>Schedule HP: Income from House Property</strong>' + hpLossText + '</td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.houseProperty) + '</td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.hpSetOff - heads.houseProperty) + '</td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.hpSetOff) + '</td>';
        html += '        </tr>';
      }

      // Business Income Row
      if (heads.business > 0) {
        html += '        <tr>';
        html += '          <td><strong>Schedule BP: Profits & Gains of Business/Profession</strong></td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.business) + '</td>';
        html += '          <td class="text-right">0</td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.business) + '</td>';
        html += '        </tr>';
      }

      // Capital Gains Row (including initial losses check to display the schedule details)
      if (heads.stcg > 0 || heads.ltcg > 0 || (heads.setoffDetails && (heads.setoffDetails.initial.listedLtcgLoss > 0 || heads.setoffDetails.initial.otherLtcgLoss > 0 || heads.setoffDetails.initial.listedStcgLoss > 0 || heads.setoffDetails.initial.slabStcgLoss > 0))) {
        var totalCg = heads.stcg + heads.ltcg;
        html += '        <tr>';
        html += '          <td><strong>Schedule CG: Capital Gains (Net after Set-off)</strong></td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(totalCg) + '</td>';
        html += '          <td class="text-right">0</td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(totalCg) + '</td>';
        html += '        </tr>';
      }

      // Other Sources Row
      if (heads.otherSources > 0) {
        html += '        <tr>';
        html += '          <td><strong>Schedule OS: Income from Other Sources</strong></td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.otherSources) + '</td>';
        html += '          <td class="text-right">0</td>';
        html += '          <td class="text-right">' + window.Utils.formatCurrency(heads.otherSources) + '</td>';
        html += '        </tr>';
      }

      // Gross Total Income
      html += '        <tr class="total-row">';
      html += '          <td><strong>Gross Total Income (GTI)</strong></td>';
      html += '          <td colspan="2"></td>';
      html += '          <td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.grossIncome) + '</strong></td>';
      html += '        </tr>';

      // Deductions under Chapter VI-A
      var dedValue = activeData.otherDeductions;
      html += '        <tr>';
      html += '          <td>Less: Deductions under Chapter VI-A (Schedule VIA)</td>';
      html += '          <td colspan="2"></td>';
      html += '          <td class="text-right">-' + window.Utils.formatCurrency(dedValue) + '</td>';
      html += '        </tr>';

      // Net Taxable Income
      html += '        <tr class="double-total-row">';
      html += '          <td><strong>TOTAL TAXABLE INCOME (Rounded Off)</strong></td>';
      html += '          <td colspan="2"></td>';
      html += '          <td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.totalTaxableIncome) + '</strong></td>';
      html += '        </tr>';

      html += '      </tbody>';
      html += '    </table>';
      
      if (heads.setoffDetails && (heads.setoffDetails.initial.listedLtcgLoss > 0 || heads.setoffDetails.initial.otherLtcgLoss > 0 || heads.setoffDetails.initial.listedStcgLoss > 0 || heads.setoffDetails.initial.slabStcgLoss > 0 || heads.setoffDetails.initial.listedLtcg > 0 || heads.setoffDetails.initial.otherLtcg > 0 || heads.setoffDetails.initial.listedStcg > 0 || heads.setoffDetails.initial.slabStcg > 0)) {
        html += '<p style="font-size: 10px; margin-top: 10px; margin-bottom: 4px; font-weight: bold; color: #1e3a8a;">Schedule CG: Capital Gains Set-Off Statement (Sec 70 & 74)</p>';
        html += this.generateCapitalGainsSetoffTable(heads.setoffDetails);
      }
      html += '  </div>';

      // Section III: Schedule Chapter VI-A Deductions
      html += '  <div class="print-section">';
      html += '    <h2>III. Schedule VIA: Details of Deductions Claimed</h2>';
      html += '    <table class="print-table">';
      html += '      <thead>';
      html += '        <tr><th>Section</th><th>Particulars / Description</th><th class="text-right">Max Limit (₹)</th><th class="text-right">Claimed Amount (₹)</th></tr>';
      html += '      </thead>';
      html += '      <tbody>';

      if (activeRegime === 'new') {
        if (activeData.otherDeductions > 0) {
          html += '        <tr><td>Section 80CCD(2)</td><td>Employer Contribution to NPS (Eligible in New Regime)</td><td class="text-right">14% of Basic</td><td class="text-right">' + window.Utils.formatCurrency(activeData.otherDeductions) + '</td></tr>';
        } else {
          html += '        <tr><td colspan="4" class="text-center text-muted">No Chapter VI-A deductions are admissible under Section 115BAC (New Tax Regime).</td></tr>';
        }
      } else {
        var breakdown = activeData.deductionsBreakdown || {};
        var hasDeductions = false;
        for (var sec in breakdown) {
          if (breakdown[sec] > 0) {
            hasDeductions = true;
            var limitText = TD.deductions[sec] && TD.deductions[sec].limit ? window.Utils.formatCurrency(TD.deductions[sec].limit) : 'No Limit';
            html += '        <tr><td>' + sec + '</td><td>' + (TD.deductions[sec] ? TD.deductions[sec].description : 'Tax Savings') + '</td><td class="text-right">' + limitText + '</td><td class="text-right">' + window.Utils.formatCurrency(breakdown[sec]) + '</td></tr>';
          }
        }
        if (!hasDeductions) {
          html += '        <tr><td colspan="4" class="text-center text-muted">No Chapter VI-A deductions claimed under the Old Regime.</td></tr>';
        }
      }
      html += '        <tr class="total-row"><td><strong>Total Deductions</strong></td><td colspan="2"></td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.otherDeductions) + '</strong></td></tr>';
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // Section IV: Detailed Tax Computation
      html += '  <div class="print-section">';
      html += '    <h2>IV. Particulars of Tax Liability Computation</h2>';
      html += '    <table class="print-table">';
      html += '      <thead>';
      html += '        <tr><th>Description</th><th class="text-right">Rate</th><th class="text-right">Amount (₹)</th></tr>';
      html += '      </thead>';
      html += '      <tbody>';
      html += '        <tr><td>Tax on Income at Normal Slab Rates</td><td class="text-right">Progressive</td><td class="text-right">' + window.Utils.formatCurrency(activeData.slabTax) + '</td></tr>';
      
      if (activeData.capitalGainsTax > 0) {
        html += '        <tr><td>Tax on Capital Gains (Special Rates under Sec 111A/112A)</td><td class="text-right">20% / 12.5%</td><td class="text-right">' + window.Utils.formatCurrency(activeData.capitalGainsTax) + '</td></tr>';
      }
      
      if (activeData.rebate87A > 0) {
        html += '        <tr><td>Less: Rebate under Section 87A</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(activeData.rebate87A) + '</td></tr>';
      }
      
      var taxAfterRebate = Math.max(0, activeData.slabTax + activeData.capitalGainsTax - activeData.rebate87A);
      html += '        <tr class="total-row"><td>Tax After Rebate</td><td class="text-right">-</td><td class="text-right">' + window.Utils.formatCurrency(taxAfterRebate) + '</td></tr>';
      
      if (activeData.surcharge > 0) {
        html += '        <tr><td>Add: Surcharge</td><td class="text-right">Slab-based</td><td class="text-right">' + window.Utils.formatCurrency(activeData.surcharge) + '</td></tr>';
      }
      
      html += '        <tr><td>Add: Health and Education Cess</td><td class="text-right">4.0%</td><td class="text-right">' + window.Utils.formatCurrency(activeData.cess) + '</td></tr>';
      html += '        <tr class="double-total-row"><td><strong>NET TAX LIABILITY (A)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.netTaxBeforeInterest) + '</strong></td></tr>';
      
      if (activeData.interestTotal > 0) {
        html += '        <tr><td>Add: Interest under Section 234B (Default of Advance Tax)</td><td class="text-right">1% / month</td><td class="text-right">' + window.Utils.formatCurrency(activeData.interest234B) + '</td></tr>';
        html += '        <tr><td>Add: Interest under Section 234C (Deferment of Advance Tax)</td><td class="text-right">1% / month</td><td class="text-right">' + window.Utils.formatCurrency(activeData.interest234C) + '</td></tr>';
        html += '        <tr class="double-total-row"><td><strong>TOTAL TAX & INTEREST LIABILITY (A1)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.netTax) + '</strong></td></tr>';
      }
      
      var paid = userData.taxesPaid || {};
      var salaryTds = (userData.income && userData.income.salary) ? Number(userData.income.salary.tds || 0) : 0;
      var nonSalaryTds = Number(paid.tds || 0);
      var advanceTaxPaid = Number(paid.advanceTax || 0);
      var selfAssessmentPaid = Number(paid.selfAssessment || 0);
      var totalPaid = salaryTds + nonSalaryTds + advanceTaxPaid + selfAssessmentPaid;
      
      html += '        <tr><td>Less: TDS on Salary (Form 16)</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(salaryTds) + '</td></tr>';
      html += '        <tr><td>Less: TDS / TCS on Non-Salary Income (Form 26AS)</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(nonSalaryTds) + '</td></tr>';
      html += '        <tr><td>Less: Advance Tax Paid</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(advanceTaxPaid) + '</td></tr>';
      html += '        <tr><td>Less: Self-Assessment Tax Paid</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(selfAssessmentPaid) + '</td></tr>';
      html += '        <tr class="total-row"><td><strong>TOTAL TAX PAID / CREDITS (B)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(totalPaid) + '</strong></td></tr>';
      
      var bal = activeData.netTax - totalPaid;
      if (bal > 0) {
        html += '        <tr class="balance-due-row"><td><strong>NET TAX OUTSTANDING (PAYABLE) (A1 - B)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(bal) + '</strong></td></tr>';
      } else {
        html += '        <tr class="refund-due-row"><td><strong>NET REFUND DUE TO ASSESSEE (B - A1)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(Math.abs(bal)) + '</strong></td></tr>';
      }
      
      html += '      </tbody>';
      html += '    </table>';
      
      if (activeData.interestTotal > 0) {
        html += this.generateAdvanceTaxInterestTable(activeData, salaryTds + nonSalaryTds, advanceTaxPaid);
      }
      
      html += '  </div>';
 
      // Section V: Slab & Surcharge Step-by-Step Computations (Transparency Block)
      html += '  <div class="print-section page-break">';
      html += '    <h2>V. Progressive Slab & Surcharge Step-by-Step Computations</h2>';
      html += '    <p style="font-size: 10px; margin-bottom: 6px; color: #333;">The step-by-step breakdown of progressive slab rates applied to taxable income is detailed below for audit verification:</p>';
      html += this.generateDetailedSlabCalculationTable(activeData.taxableSlabIncome, activeRegime, window.Utils.getAgeCategory(Number(userData.profile.age || 30)));
      
      html += '    <div style="font-size: 9px; line-height: 1.4; margin-top: 10px; border: 1px solid #ddd; padding: 10px; background: #fafafa;">';
      if (activeData.surcharge > 0) {
        html += '      <p style="margin-bottom: 4px;"><strong>Surcharge Computation:</strong> Taxable income exceeds the surcharge threshold. Surcharge is computed at progressive rate on Tax After Rebate: ' + window.Utils.formatCurrency(activeData.slabTax + activeData.capitalGainsTax - activeData.rebate87A) + ' × surcharge rate = ' + window.Utils.formatCurrency(activeData.surcharge) + '.</p>';
      } else {
        html += '      <p style="margin-bottom: 4px;"><strong>Surcharge Audit Check:</strong> Surcharge is not applicable as total taxable income (' + window.Utils.formatCurrency(activeData.totalTaxableIncome) + ') does not exceed ₹50,00,000 threshold under Section 2(3) of the Finance Act.</p>';
      }
      html += '      <p style="margin-bottom: 0;"><strong>Health & Education Cess:</strong> Cess is computed flat at 4% under Section 2(11) of the Finance Act on (Tax after Rebate + Surcharge): (' + window.Utils.formatCurrency(Math.max(0, activeData.slabTax + activeData.capitalGainsTax - activeData.rebate87A)) + ' + ' + window.Utils.formatCurrency(activeData.surcharge) + ') × 4% = ' + window.Utils.formatCurrency(activeData.cess) + '.</p>';
      html += '    </div>';
      html += '  </div>';
 
      // Section VI: Dual Regime Comparison Statement
      html += '  <div class="print-section">';
      html += '    <h2>VI. Regime Suitability & Comparison Statement</h2>';
      html += '    <table class="print-table">';
      html += '      <thead>';
      html += '        <tr><th>Particulars / Head of Income</th><th class="text-right">Old Regime (₹)</th><th class="text-right">New Regime (₹)</th></tr>';
      html += '      </thead>';
      html += '      <tbody>';
      html += '        <tr><td>Gross Total Income (GTI)</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.oldRegime.grossIncome) + '</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.newRegime.grossIncome) + '</td></tr>';
      html += '        <tr><td>Less: Chapter VI-A Deductions</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.oldRegime.otherDeductions) + '</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.newRegime.otherDeductions) + '</td></tr>';
      html += '        <tr><td>Total Net Taxable Income</td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.oldRegime.totalTaxableIncome) + '</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.newRegime.totalTaxableIncome) + '</strong></td></tr>';
      html += '        <tr class="double-total-row"><td><strong>NET TAX LIABILITY (Incl. Cess & Interest)</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.oldRegime.netTax) + '</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.newRegime.netTax) + '</strong></td></tr>';
      html += '        <tr class="total-row"><td colspan="3" class="text-center"><strong>RECOMMENDATION: OPT FOR ' + (activeRegime === 'new' ? 'NEW REGIME' : 'OLD REGIME') + ' (SAVINGS OF ' + window.Utils.formatCurrency(taxResult.savings) + ')</strong></td></tr>';
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // Section VII: Tax Optimizer advice
      if (suggestions.length > 0) {
        html += '  <div class="print-section page-break">';
        html += '    <h2>VII. Schedule of Recommended Tax Optimization Strategies</h2>';
        html += '    <table class="print-table">';
        html += '      <thead>';
        html += '        <tr><th>Section</th><th>Key Action Proposal</th><th class="text-right">Est. Savings (₹)</th><th>Deadline</th></tr>';
        html += '      </thead>';
        html += '      <tbody>';
        var showCount = Math.min(6, suggestions.length);
        for (var k = 0; k < showCount; k++) {
          var sugg = suggestions[k];
          if (sugg.category !== 'regime') {
            html += '        <tr><td><strong>' + sugg.section + '</strong></td><td>' + sugg.title + ' - ' + sugg.description + '</td><td class="text-right text-success">+' + window.Utils.formatCurrency(sugg.potentialSavings) + '</td><td>' + sugg.deadline + '</td></tr>';
          }
        }
        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
      }

      // Section VIII: Legal Citations & Explanatory Notes
      html += '  <div class="print-section page-break">';
      html += '    <h2>VIII. Legal Citations & Explanatory Notes (Schedules and Deductions)</h2>';
      html += '    <div style="font-size: 10px; line-height: 1.5; color: #333;">';
      
      if (heads.salaryGross > 0) {
        html += '      <p style="margin-bottom: 6px;"><strong>1. Schedule S (Income from Salary):</strong></p>';
        html += '      <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: square;">';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 16(ia) - Standard Deduction:</strong> A statutory flat deduction of ' + window.Utils.formatCurrency(activeRegime === 'new' ? 75000 : 50000) + ' has been applied from the Gross Salary. This is admissible to all salaried employees to cover employment-related expenses without requiring proof of expenditure.</li>';
        if (userData.income.salary && Number(userData.income.salary.hra || 0) > 0 && activeRegime === 'old') {
          html += '        <li style="margin-bottom: 4px;"><strong>Section 10(13A) - House Rent Allowance (HRA) Exemption:</strong> Exempt HRA is computed as the minimum of: (a) actual HRA received (' + window.Utils.formatCurrency(userData.income.salary.hra || 0) + '), (b) rent paid minus 10% of basic salary, and (c) 50% (metro) or 40% (non-metro) of basic salary. The excess portion is taxable under Schedule S.</li>';
        }
        html += '      </ul>';
      }

      if (heads.houseProperty !== 0 || heads.hpSetOff !== 0) {
        html += '      <p style="margin-bottom: 6px;"><strong>2. Schedule HP (Income from House Property):</strong></p>';
        html += '      <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: square;">';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 24(a) - Standard Deduction (Rental Income):</strong> If rent is received, a flat 30% of Net Annual Value is allowed as a deduction for repairs and maintenance, irrespective of actual expenditure.</li>';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 24(b) - Home Loan Interest:</strong> Interest on housing loans is deductible up to ₹2,00,000 for self-occupied properties (Old Regime only). For let-out properties, actual interest is fully deductible.</li>';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 71 - Loss Set-off:</strong> Inter-head house property loss set-off is capped at -₹2,00,000 under the Old Regime, and disallowed (₹0 set-off) under the New Regime.</li>';
        html += '      </ul>';
      }

      if (heads.business > 0) {
        html += '      <p style="margin-bottom: 6px;"><strong>3. Schedule BP (Profits & Gains of Business or Profession):</strong></p>';
        html += '      <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: square;">';
        if (userData.income.business && userData.income.business.isPresumptive) {
          html += '        <li style="margin-bottom: 4px;"><strong>Sections 44AD / 44ADA - Presumptive Taxation:</strong> Under presumptive schemes, net profits are deemed at 6%/8% of turnover (business) or 50% of receipts (professionals). Taxpayers are exempt from maintaining formal books of accounts (Sec 44AA) or CA audits (Sec 44AB).</li>';
        } else {
          html += '        <li style="margin-bottom: 4px;"><strong>Section 28 - Profits & Gains:</strong> Taxable business income is calculated as gross business revenue minus deductible business expenses and depreciation on assets.</li>';
        }
        html += '      </ul>';
      }

      if (heads.stcg > 0 || heads.ltcg > 0) {
        html += '      <p style="margin-bottom: 6px;"><strong>4. Schedule CG (Capital Gains):</strong></p>';
        html += '      <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: square;">';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 111A - Short-Term Capital Gains:</strong> Gains on sale of listed equity shares/mutual funds held for less than 12 months are taxed at a flat rate of 20%.</li>';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 112A - Long-Term Capital Gains (Listed Equity):</strong> Gains on sale of listed equity held for 12 months or more are taxed at 12.5% on gains exceeding the statutory threshold of ₹1,25,000.</li>';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 112 - Other Capital Gains:</strong> LTCG on unlisted assets, gold, and real estate is taxed at 12.5% without indexation (Budget 2024 revised).</li>';
        html += '      </ul>';
      }

      if (heads.otherSources > 0) {
        html += '      <p style="margin-bottom: 6px;"><strong>5. Schedule OS (Income from Other Sources):</strong></p>';
        html += '      <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: square;">';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 56 - Other Sources:</strong> Bank interest, fixed deposits interest, and dividends are aggregated under this head and taxed at slab rates. Winnings from online games/lotteries are taxed at flat 30% under Sec 115BBJ.</li>';
        html += '      </ul>';
      }

      if (activeRegime === 'old' && activeData.otherDeductions > 0) {
        html += '      <p style="margin-bottom: 6px;"><strong>6. Schedule VIA (Chapter VI-A Deductions):</strong></p>';
        html += '      <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: square;">';
        var breakdown = activeData.deductionsBreakdown || {};
        if (breakdown['80C'] > 0) {
          html += '        <li style="margin-bottom: 4px;"><strong>Section 80C:</strong> Contributions to PPF, EPF, ELSS, and home loan principal are deductible up to the statutory cap of ₹1,50,000.</li>';
        }
        if (breakdown['80D'] > 0) {
          html += '        <li style="margin-bottom: 4px;"><strong>Section 80D:</strong> Medical insurance premiums are deductible up to ₹25,000 for self/spouse/children (₹50,000 if senior citizen) and an additional ₹25,000/₹50,000 for parents.</li>';
        }
        if (breakdown['80CCD1B'] > 0) {
          html += '        <li style="margin-bottom: 4px;"><strong>Section 80CCD(1B):</strong> Self-contribution to NPS is deductible up to an additional ₹50,000 outside the Section 80C cap.</li>';
        }
        if (breakdown['80TTA'] > 0) {
          html += '        <li style="margin-bottom: 4px;"><strong>Section 80TTA:</strong> Savings bank interest is deductible up to ₹10,000.</li>';
        }
        if (breakdown['80TTB'] > 0) {
          html += '        <li style="margin-bottom: 4px;"><strong>Section 80TTB:</strong> Savings and FD interest is deductible up to ₹50,000 for senior citizens.</li>';
        }
        html += '      </ul>';
      }

      if (activeData.rebate87A > 0) {
        html += '      <p style="margin-bottom: 6px;"><strong>7. Section 87A Tax Rebate & Marginal Relief:</strong></p>';
        html += '      <ul style="margin-left: 20px; margin-bottom: 10px; list-style-type: square;">';
        html += '        <li style="margin-bottom: 4px;"><strong>Section 87A Rebate:</strong> Provides a rebate up to ₹60,000 (New Regime, income <= ₹12L) or ₹12,500 (Old Regime, income <= ₹5L), reducing net tax to zero.</li>';
        if (activeRegime === 'new' && activeData.taxableSlabIncome > 1200000 && activeData.taxableSlabIncome <= 1212000) {
          html += '        <li style="margin-bottom: 4px;"><strong>Marginal Relief:</strong> Granted since income slightly exceeds ₹12L. Caps the net tax liability to the exact income amount that exceeds ₹12,0,000, preventing a steep tax spike.</li>';
        }
        html += '      </ul>';
      }

      html += '    </div>';
      html += '  </div>';

      // Section IX: CA-Grade Compliance Audit Observations
      html += '  <div class="print-section">';
      html += '    <h2>IX. CA-Grade Compliance Audit Observation Report</h2>';
      html += '    <table class="print-table">';
      html += '      <thead>';
      html += '        <tr><th>Audit Area</th><th>Observation / Flag</th><th>Severity</th><th>Recommended Next Step</th></tr>';
      html += '      </thead>';
      html += '      <tbody>';
      
      var auditChecks = window.TaxAuditor.runAudit(userData, taxResult);
      if (auditChecks.length === 0) {
        html += '        <tr><td colspan="4" class="text-center" style="color: #15803d; font-weight: bold;">✓ COMPLIANCE PASSED: No audit flags or warning alerts detected. All inputs align with standard rules under the Income Tax Act, 1961.</td></tr>';
      } else {
        for (var j = 0; j < auditChecks.length; j++) {
          var check = auditChecks[j];
          var severityColor = check.type === 'danger' ? '#b91c1c' : check.type === 'warning' ? '#b45309' : '#1e3a8a';
          html += '        <tr>';
          html += '          <td><strong>' + check.title + '</strong></td>';
          html += '          <td>' + check.message + '</td>';
          html += '          <td style="color: ' + severityColor + '; font-weight: bold; text-transform: uppercase;">' + check.type + '</td>';
          html += '          <td>' + check.action + '</td>';
          html += '        </tr>';
        }
      }
      
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // Section X: Document Checklist
      html += '  <div class="print-section page-break">';
      html += '    <h2>X. Required Document Verification Checklist</h2>';
      html += '    <p style="font-size: 10px; margin-bottom: 6px; color: #333;">The following checklist details the exact documents and verification steps required to validate the declarations made in this computation sheet and ensure compliance under the Income Tax Act, 1961:</p>';
      html += this.generateDetailedChecklist(userData, activeRegime, heads);
      html += '  </div>';

      // Signature Block
      html += '  <div class="signature-section">';
      html += '    <div class="signature-box">';
      html += '      <p><strong>Signature of the Assessee</strong></p>';
      html += '      <br><br><br>';
      html += '      <p>Name: ' + (userData.profile.name || 'Taxpayer') + '</p>';
      html += '      <p>Date: ' + formattedDate + '</p>';
      html += '    </div>';
      html += '    <div class="signature-box">';
      html += '      <p><strong>Verified by: KarDaan Tax Audit Engine</strong></p>';
      html += '      <br><br>';
      html += '      <div style="font-size: 9px; border: 1px dashed #1e3a8a; padding: 6px; display: inline-block; text-align: left; background: #f0f4ff; color: #1e3a8a;">';
      html += '        <strong>TAX COMPUTATION AUDITED</strong><br>';
      html += '        Audit Code: ' + udin + '<br>';
      html += '        Engine Code: KD-AUDIT-2026<br>';
      html += '        AY: 2026-27 | FY: 2025-26';
      html += '      </div>';
      html += '      <p style="margin-top: 6px;">Date: ' + formattedDate + '</p>';
      html += '    </div>';
      html += '  </div>';

      // Disclaimer
      html += '  <div class="print-disclaimer">';
      html += '    <p><strong>CA-Grade Compliance Audit Summary:</strong> This tax computation statement has been compiled and audited in accordance with the provisions of the Income Tax Act, 1961 as amended for FY 2025-26 (AY 2026-27). All schedules (Schedules S, HP, BP, CG, OS, and VIA) have been processed under CA-grade compliance and optimization algorithms. This document serves as a digital computation certificate for filing reference and tax optimization record-keeping.</p>';
      html += '  </div>';

      html += '</div>';

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

      // Add print styling
      var printStyle = document.createElement('style');
      printStyle.id = 'temp-print-style';
      printStyle.innerHTML = 
        '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap");' +
        '@media print {' +
        '  body > *:not(#temp-print-div) { display: none !important; }' +
        '  #temp-print-div, #temp-print-div * { display: revert; }' +
        '  #temp-print-div { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }' +
        '  .print-report { padding: 25px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #fff; line-height: 1.5; max-width: 920px; margin: 0 auto; font-size: 10px; }' +
        '  .print-header { display: flex !important; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 25px; }' +
        '  .print-header h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }' +
        '  .print-header p { margin: 4px 0 0 0; font-size: 9px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; color: #64748b; }' +
        '  .audit-meta-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; background-color: #fff; }' +
        '  .audit-meta-table td { padding: 6px 10px; font-size: 9px; border: 1px solid #e2e8f0; vertical-align: middle; color: #334155; }' +
        '  .audit-meta-table td.label { font-weight: 700; background: #f1f5f9; width: 22%; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; color: #64748b; }' +
        '  .print-section { margin-bottom: 28px; page-break-inside: avoid; }' +
        '  .print-section h2 { font-size: 13px; font-weight: 700; margin-top: 0; margin-bottom: 12px; border-left: 3px solid #0f172a; padding-left: 8px; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; border-bottom: none !important; }' +
        '  .print-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 5px; }' +
        '  .print-table th { background: #0f172a; color: #ffffff !important; border-top: none; border-left: none; border-right: none; border-bottom: 2px solid #0f172a; padding: 7px 10px; font-size: 8px; text-align: left; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }' +
        '  .print-table td { border-top: none; border-left: none; border-right: none; border-bottom: 1px solid #e2e8f0; padding: 7px 10px; font-size: 9px; vertical-align: middle; color: #334155; }' +
        '  .print-table tr:nth-child(even) td { background-color: #f8fafc; }' +
        '  .total-row td { font-weight: 700; background: #f1f5f9 !important; color: #0f172a !important; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; }' +
        '  .double-total-row td { font-weight: 700; font-size: 10px; background: #e2e8f0 !important; color: #0f172a !important; border-top: 1.5px solid #0f172a; border-bottom: 3px double #0f172a !important; }' +
        '  .balance-due-row td { font-weight: 700; color: #991b1b !important; background: #fef2f2 !important; border: 1.5px solid #fca5a5 !important; }' +
        '  .refund-due-row td { font-weight: 700; color: #166534 !important; background: #f0fdf4 !important; border: 1.5px solid #bbf7d0 !important; }' +
        '  .sub-row td { font-size: 8px; color: #64748b; padding-left: 20px; border-top: none; }' +
        '  .text-right { text-align: right !important; }' +
        '  .text-center { text-align: center !important; }' +
        '  .text-success { color: #166534 !important; }' +
        '  .page-break { page-break-before: always; }' +
        '  .signature-section { margin-top: 45px; display: flex; justify-content: space-between; page-break-inside: avoid; }' +
        '  .signature-box { width: 45%; border-top: 1.5px solid #0f172a; text-align: center; padding-top: 10px; font-size: 9px; line-height: 1.6; color: #64748b; }' +
        '  .print-disclaimer { margin-top: 35px; font-size: 8px; color: #64748b; line-height: 1.5; border-top: 1.5px solid #e2e8f0; padding-top: 10px; font-style: italic; text-align: justify; }' +
        '  .status-badge { display: inline-block; padding: 2px 6px; font-size: 7px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 6px; vertical-align: middle; }' +
        '  .status-disallowed { background-color: #FEF3C7 !important; color: #92400E !important; }' +
        '  .status-allowed { background-color: #D1FAE5 !important; color: #065F46 !important; }' +
        '  @page { size: A4 portrait; margin: 15mm 15mm 20mm 15mm; }' +
        '}';
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
