/**
 * @file report-generator.js
 * @description Generates printable reports and summaries for tax filings in India.
 *              Builds structured print layouts that convert clean to PDF via the browser.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  if (!window.Utils || !window.FormSelector) {
    throw new Error('[ReportGenerator] window.Utils and window.FormSelector are required.');
  }

  window.ReportGenerator = {
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

      var html = '';

      // Report Container
      html += '<div class="print-report">';
      
      // Header
      html += '  <div class="print-header">';
      html += '    <div class="print-title-area">';
      html += '      <h1>KarDaan Tax Computation Report</h1>';
      html += '      <p>Financial Year: 2025-26 | Assessment Year: 2026-27</p>';
      html += '    </div>';
      html += '    <div class="print-meta-area">';
      html += '      <p>Generated on: <strong>' + formattedDate + '</strong></p>';
      html += '      <p>Filing Status: <strong>Draft</strong></p>';
      html += '    </div>';
      html += '  </div>';

      html += '  <hr>';

      // Profile details
      html += '  <div class="print-section">';
      html += '    <h2>1. Personal Profile</h2>';
      html += '    <table class="print-table-info">';
      html += '      <tr><td>Name:</td><td><strong>' + (userData.profile.name || 'Valued Taxpayer') + '</strong></td><td>PAN:</td><td><strong>' + maskedPAN.toUpperCase() + '</strong></td></tr>';
      html += '      <tr><td>Age / Category:</td><td>' + userData.profile.age + ' (' + window.Utils.getAgeCategory(userData.profile.age) + ')</td><td>Residential Status:</td><td>Resident</td></tr>';
      html += '      <tr><td>Filing Type:</td><td>' + (userData.profile.filingType || 'individual').toUpperCase() + '</td><td>Recommended Form:</td><td><strong>' + selectedForm.form + ' (' + selectedForm.name + ')</strong></td></tr>';
      html += '    </table>';
      html += '  </div>';

      // Income details
      html += '  <div class="print-section">';
      html += '    <h2>2. Income Source Summary</h2>';
      html += '    <table class="print-table">';
      html += '      <thead><tr><th>Income Head</th><th class="text-right">Amount (₹)</th></tr></thead>';
      html += '      <tbody>';
      if (heads.salaryGross > 0) {
        html += '        <tr><td>Gross Salary Income</td><td class="text-right">' + window.Utils.formatCurrency(heads.salaryGross) + '</td></tr>';
        html += '        <tr class="sub-row"><td>(-) Standard Deduction</td><td class="text-right">-' + window.Utils.formatCurrency(heads.salaryStdDeduction) + '</td></tr>';
      }
      if (heads.houseProperty !== 0) {
        html += '        <tr><td>Income / Loss from House Property</td><td class="text-right">' + window.Utils.formatCurrency(heads.houseProperty) + '</td></tr>';
      }
      if (heads.business > 0) {
        html += '        <tr><td>Business & Professional Income</td><td class="text-right">' + window.Utils.formatCurrency(heads.business) + '</td></tr>';
      }
      if (heads.stcg > 0 || heads.ltcg > 0) {
        html += '        <tr><td>Capital Gains (Net after Set-offs)</td><td class="text-right">' + window.Utils.formatCurrency(heads.stcg + heads.ltcg) + '</td></tr>';
        if (heads.stcg > 0) html += '        <tr class="sub-row"><td>STCG (Listed/Short-Term)</td><td class="text-right">' + window.Utils.formatCurrency(heads.stcg) + '</td></tr>';
        if (heads.ltcg > 0) html += '        <tr class="sub-row"><td>LTCG (Listed/Long-Term)</td><td class="text-right">' + window.Utils.formatCurrency(heads.ltcg) + '</td></tr>';
      }
      if (heads.otherSources > 0) {
        html += '        <tr><td>Income from Other Sources (Interest, Dividends)</td><td class="text-right">' + window.Utils.formatCurrency(heads.otherSources) + '</td></tr>';
      }
      html += '        <tr class="total-row"><td><strong>Gross Total Income (GTI)</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.grossIncome) + '</strong></td></tr>';
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // Deductions
      html += '  <div class="print-section">';
      html += '    <h2>3. Eligible Deductions (Chapter VI-A)</h2>';
      html += '    <table class="print-table">';
      html += '      <thead><tr><th>Deduction Section</th><th>Description</th><th class="text-right">Claimed (₹)</th></tr></thead>';
      html += '      <tbody>';
      if (activeRegime === 'new') {
        if (activeData.otherDeductions > 0) {
          html += '        <tr><td>Section 80CCD(2)</td><td>Employer Contribution to NPS (under New Regime)</td><td class="text-right">' + window.Utils.formatCurrency(activeData.otherDeductions) + '</td></tr>';
        } else {
          html += '        <tr><td colspan="3" class="text-center text-muted">No deductions applicable under New Tax Regime.</td></tr>';
        }
      } else {
        var breakdown = activeData.deductionsBreakdown || {};
        var hasDeductions = false;
        for (var sec in breakdown) {
          if (breakdown[sec] > 0) {
            hasDeductions = true;
            html += '        <tr><td>' + sec + '</td><td>' + (TD.deductions[sec] ? TD.deductions[sec].description : 'Tax Savings') + '</td><td class="text-right">' + window.Utils.formatCurrency(breakdown[sec]) + '</td></tr>';
          }
        }
        if (!hasDeductions) {
          html += '        <tr><td colspan="3" class="text-center text-muted">No deductions claimed.</td></tr>';
        }
      }
      html += '        <tr class="total-row"><td><strong>Total Deductions</strong></td><td></td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.otherDeductions) + '</strong></td></tr>';
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // Tax calculation
      html += '  <div class="print-section">';
      html += '    <h2>4. Tax Liability Details</h2>';
      html += '    <table class="print-table">';
      html += '      <tbody>';
      html += '        <tr><td>Net Taxable Income</td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.taxableSlabIncome) + '</strong></td></tr>';
      html += '        <tr><td>Tax calculated at Normal Slab Rates</td><td class="text-right">' + window.Utils.formatCurrency(activeData.slabTax) + '</td></tr>';
      if (activeData.capitalGainsTax > 0) {
        html += '        <tr><td>Tax on Capital Gains (Special Rates)</td><td class="text-right">' + window.Utils.formatCurrency(activeData.capitalGainsTax) + '</td></tr>';
      }
      html += '        <tr><td>(-) Section 87A Rebate</td><td class="text-right">-' + window.Utils.formatCurrency(activeData.rebate87A) + '</td></tr>';
      html += '        <tr><td>(+) Surcharge (if applicable)</td><td class="text-right">' + window.Utils.formatCurrency(activeData.surcharge) + '</td></tr>';
      html += '        <tr><td>(+) Health & Education Cess (4%)</td><td class="text-right">' + window.Utils.formatCurrency(activeData.cess) + '</td></tr>';
      html += '        <tr class="grand-total-row"><td><strong>Total Net Tax Payable</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.netTax) + '</strong></td></tr>';
      
      var paid = userData.taxesPaid || {};
      var totalPaid = Number(paid.tds || 0) + Number(paid.advanceTax || 0) + Number(paid.selfAssessment || 0);
      html += '        <tr><td>TDS & Advance Tax Paid</td><td class="text-right">-' + window.Utils.formatCurrency(totalPaid) + '</td></tr>';

      var bal = activeData.netTax - totalPaid;
      if (bal > 0) {
        html += '        <tr class="balance-due-row"><td><strong>Net Tax Outstanding (Payable)</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(bal) + '</strong></td></tr>';
      } else {
        html += '        <tr class="refund-due-row"><td><strong>Estimated Tax Refund Due</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(Math.abs(bal)) + '</strong></td></tr>';
      }
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // Regime comparison
      html += '  <div class="print-section">';
      html += '    <h2>5. Regime Comparison Analysis</h2>';
      html += '    <table class="print-table">';
      html += '      <thead><tr><th>Component</th><th class="text-right">Old Regime (₹)</th><th class="text-right">New Regime (₹)</th></tr></thead>';
      html += '      <tbody>';
      html += '        <tr><td>Gross Income</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.oldRegime.grossIncome) + '</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.newRegime.grossIncome) + '</td></tr>';
      html += '        <tr><td>Standard Deduction</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.oldRegime.standardDeduction) + '</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.newRegime.standardDeduction) + '</td></tr>';
      html += '        <tr><td>Eligible Deductions</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.oldRegime.otherDeductions) + '</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.newRegime.otherDeductions) + '</td></tr>';
      html += '        <tr><td>Net Taxable Income</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.oldRegime.taxableSlabIncome) + '</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.newRegime.taxableSlabIncome) + '</td></tr>';
      html += '        <tr class="total-row"><td><strong>Net Tax Payable (with Cess)</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.oldRegime.netTax) + '</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.newRegime.netTax) + '</strong></td></tr>';
      html += '        <tr class="sub-row"><td><strong>Recommended Choice</strong></td><td colspan="2" class="text-center"><strong>' + (activeRegime === 'new' ? 'New Tax Regime (Saves ' : 'Old Tax Regime (Saves ') + window.Utils.formatCurrency(taxResult.savings) + ')</strong></td></tr>';
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // Optimizer ideas
      if (suggestions.length > 0) {
        html += '  <div class="print-section page-break">';
        html += '    <h2>6. Major Tax-Saving Suggestions (Potential Savings: ' + window.Utils.formatCurrency(window.TaxOptimizer.getTotalPotentialSavings(suggestions)) + ')</h2>';
        html += '    <table class="print-table">';
        html += '      <thead><tr><th>Deduction</th><th>Action Idea</th><th class="text-right">Potential Savings (₹)</th></tr></thead>';
        html += '      <tbody>';
        var showCount = Math.min(5, suggestions.length);
        for (var k = 0; k < showCount; k++) {
          var sugg = suggestions[k];
          if (sugg.category !== 'regime') {
            html += '        <tr><td><strong>' + sugg.section + '</strong></td><td>' + sugg.title + ' - ' + sugg.description + '</td><td class="text-right text-success">+' + window.Utils.formatCurrency(sugg.potentialSavings) + '</td></tr>';
          }
        }
        html += '      </tbody>';
        html += '    </table>';
        html += '  </div>';
      }

      // Disclaimer
      html += '  <div class="print-disclaimer">';
      html += '    <p><strong>Disclaimer:</strong> This report is a draft tax computation summary generated by KarDaan Assistant for FY 2025-26 based on user inputs. It is intended for informational/educational purposes only and does not constitute official tax filing, legal, or professional chartered accountant advice. Always verify with official Income Tax Portal rules or a certified CA before paying or filing taxes.</p>';
      html += '  </div>';

      html += '</div>';

      return html;
    },

    /**
     * Download the report by printing it.
     * Inserts temporary print styles, opens print dialog, and cleanups.
     * @param {Object} userData
     * @param {Object} taxResult
     * @param {Array<Object>} suggestions
     */
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
        '@media print {' +
        '  body * { display: none !important; }' +
        '  #temp-print-div, #temp-print-div * { display: block !important; }' +
        '  #temp-print-div { position: absolute; left: 0; top: 0; width: 100%; }' +
        '  .print-report { padding: 20px; font-family: "Inter", sans-serif; color: #000; background: #fff; }' +
        '  .print-header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }' +
        '  .print-header h1 { font-size: 20px; font-weight: bold; margin: 0; }' +
        '  .print-header p { margin: 2px 0; font-size: 11px; color: #555; }' +
        '  .print-section { margin-bottom: 25px; page-break-inside: avoid; }' +
        '  .print-section h2 { font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase; }' +
        '  .print-table { width: 100%; border-collapse: collapse; margin-top: 5px; }' +
        '  .print-table th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 10px; font-size: 11px; text-align: left; text-transform: uppercase; }' +
        '  .print-table td { border: 1px solid #ccc; padding: 6px 10px; font-size: 11px; }' +
        '  .print-table-info { width: 100%; margin-bottom: 10px; }' +
        '  .print-table-info td { padding: 4px 8px; font-size: 11px; }' +
        '  .total-row td { font-weight: bold; background: #f9f9f9; }' +
        '  .grand-total-row td { font-weight: bold; font-size: 12px; background: #eaeaea; border-top: 2px solid #000; border-bottom: 2px solid #000; }' +
        '  .balance-due-row td { font-weight: bold; color: #d32f2f; background: #ffebee; }' +
        '  .refund-due-row td { font-weight: bold; color: #2e7d32; background: #e8f5e9; }' +
        '  .sub-row td { font-size: 10px; color: #555; padding-left: 20px; border-top: none; }' +
        '  .text-right { text-align: right !important; }' +
        '  .text-center { text-align: center !important; }' +
        '  .text-success { color: #2e7d32 !important; }' +
        '  .page-break { page-break-before: always; }' +
        '  .print-disclaimer { margin-top: 30px; font-size: 9px; color: #777; line-height: 1.4; border-top: 1px solid #ccc; padding-top: 10px; }' +
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
        html += '    <span>🎉</span>';
        html += '    <span>Recommended: <strong>' + (rec === 'new' ? 'New Regime' : 'Old Regime') + '</strong> (Saves ' + window.Utils.formatCurrencyShort(savings) + ')</span>';
        html += '  </div>';
      }
      html += '</div>';

      return html;
    }
  };
})();
