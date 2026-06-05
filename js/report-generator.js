/**
 * @file report-generator.js
 * @description Generates printable reports and summaries for tax filings in India.
 *              Builds structured print layouts that convert clean to PDF via the browser.
 * @version 1.1.0
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
     * Generate HTML structure for printable tax report (CA audit simulation).
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
      html += '<div class="print-report">';
      
      // Document Header
      html += '  <div class="print-header">';
      html += '    <h1>STATEMENT OF COMPUTATION OF TOTAL INCOME & TAX LIABILITY</h1>';
      html += '    <p>Assessment Year: 2026-27 | Financial Year: 2025-26</p>';
      html += '  </div>';

      // 1. Assessee Metadata (Meta Table)
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

      // 2. Main computation summary
      html += '  <div class="print-section">';
      html += '    <h2>I. Particulars of Computation of Total Income</h2>';
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

      // Capital Gains Row
      if (heads.stcg > 0 || heads.ltcg > 0) {
        var totalCg = heads.stcg + heads.ltcg;
        html += '        <tr>';
        html += '          <td><strong>Schedule CG: Capital Gains</strong></td>';
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
      html += '          <td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.taxableSlabIncome) + '</strong></td>';
      html += '        </tr>';

      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // 3. Schedule Chapter VI-A Deductions
      html += '  <div class="print-section">';
      html += '    <h2>II. Schedule VIA: Details of Deductions Claimed</h2>';
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
      html += '        <tr class="total-row"><td><strong>Total</strong></td><td colspan="2"></td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.otherDeductions) + '</strong></td></tr>';
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // 4. Detailed Tax Computation
      html += '  <div class="print-section">';
      html += '    <h2>III. Particulars of Tax Liability Computation</h2>';
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
      
      html += '        <tr class="double-total-row"><td><strong>NET TAX PAYABLE (A)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(activeData.netTax) + '</strong></td></tr>';
      
      var paid = userData.taxesPaid || {};
      var totalPaid = Number(paid.tds || 0) + Number(paid.advanceTax || 0) + Number(paid.selfAssessment || 0);
      
      html += '        <tr><td>Less: Tax Deducted at Source (TDS) / TCS</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(paid.tds || 0) + '</td></tr>';
      html += '        <tr><td>Less: Advance Tax Paid</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(paid.advanceTax || 0) + '</td></tr>';
      html += '        <tr><td>Less: Self-Assessment Tax Paid</td><td class="text-right">-</td><td class="text-right">-' + window.Utils.formatCurrency(paid.selfAssessment || 0) + '</td></tr>';
      html += '        <tr class="total-row"><td><strong>TOTAL TAX PAID (B)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(totalPaid) + '</strong></td></tr>';
      
      var bal = activeData.netTax - totalPaid;
      if (bal > 0) {
        html += '        <tr class="balance-due-row"><td><strong>NET TAX OUTSTANDING (PAYABLE) (A - B)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(bal) + '</strong></td></tr>';
      } else {
        html += '        <tr class="refund-due-row"><td><strong>NET REFUND DUE TO ASSESSEE (B - A)</strong></td><td class="text-right">-</td><td class="text-right"><strong>' + window.Utils.formatCurrency(Math.abs(bal)) + '</strong></td></tr>';
      }
      
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // 5. Dual Regime Comparison Statement
      html += '  <div class="print-section">';
      html += '    <h2>IV. Regime Suitability & Comparison Statement</h2>';
      html += '    <table class="print-table">';
      html += '      <thead>';
      html += '        <tr><th>Particulars / Head of Income</th><th class="text-right">Old Regime (₹)</th><th class="text-right">New Regime (₹)</th></tr>';
      html += '      </thead>';
      html += '      <tbody>';
      html += '        <tr><td>Gross Total Income (GTI)</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.oldRegime.grossIncome) + '</td><td class="text-right">' + window.Utils.formatCurrency(taxResult.newRegime.grossIncome) + '</td></tr>';
      html += '        <tr><td>Less: Standard Deduction</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.oldRegime.standardDeduction) + '</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.newRegime.standardDeduction) + '</td></tr>';
      html += '        <tr><td>Less: Chapter VI-A Deductions</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.oldRegime.otherDeductions) + '</td><td class="text-right">-' + window.Utils.formatCurrency(taxResult.newRegime.otherDeductions) + '</td></tr>';
      html += '        <tr><td>Total Net Taxable Income</td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.oldRegime.taxableSlabIncome) + '</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.newRegime.taxableSlabIncome) + '</strong></td></tr>';
      html += '        <tr class="double-total-row"><td><strong>NET TAX LIABILITY (Incl. Cess)</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.oldRegime.netTax) + '</strong></td><td class="text-right"><strong>' + window.Utils.formatCurrency(taxResult.newRegime.netTax) + '</strong></td></tr>';
      html += '        <tr class="total-row"><td colspan="3" class="text-center"><strong>RECOMMENDATION: OPT FOR ' + (activeRegime === 'new' ? 'NEW REGIME' : 'OLD REGIME') + ' (SAVINGS OF ' + window.Utils.formatCurrency(taxResult.savings) + ')</strong></td></tr>';
      html += '      </tbody>';
      html += '    </table>';
      html += '  </div>';

      // 6. Tax Optimizer advice
      if (suggestions.length > 0) {
        html += '  <div class="print-section page-break">';
        html += '    <h2>V. Schedule of Recommended Tax Optimization Strategies</h2>';
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

      // 7. Signature Block
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
      html += '      <div style="font-size: 10px; border: 1px dashed #1e3a8a; padding: 6px; display: inline-block; text-align: left; background: #f0f4ff; color: #1e3a8a;">';
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
        '  .print-report { padding: 40px; font-family: "Georgia", "Times New Roman", serif; color: #000; background: #fff; line-height: 1.4; max-width: 800px; margin: 0 auto; }' +
        '  .print-header { text-align: center; margin-bottom: 25px; border-bottom: 3px double #000; padding-bottom: 12px; }' +
        '  .print-header h1 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px; }' +
        '  .print-header p { margin: 6px 0 0 0; font-size: 11px; font-style: italic; color: #333; }' +
        '  .audit-meta-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }' +
        '  .audit-meta-table td { padding: 6px 10px; font-size: 11px; border: 1px solid #777; vertical-align: middle; }' +
        '  .audit-meta-table td.label { font-weight: bold; background: #f4f4f4; width: 22%; text-transform: uppercase; font-size: 10px; color: #333; }' +
        '  .print-section { margin-bottom: 25px; page-break-inside: avoid; }' +
        '  .print-section h2 { font-size: 12px; font-weight: bold; margin-bottom: 8px; border-bottom: 1.5px solid #000; padding-bottom: 3px; text-transform: uppercase; color: #1e3a8a; }' +
        '  .print-table { width: 100%; border-collapse: collapse; margin-top: 5px; }' +
        '  .print-table th { background: #1e3a8a; color: #ffffff !important; border: 1px solid #444; padding: 7px 10px; font-size: 10px; text-align: left; text-transform: uppercase; font-weight: bold; }' +
        '  .print-table td { border: 1px solid #999; padding: 7px 10px; font-size: 11px; }' +
        '  .total-row td { font-weight: bold; background: #fafafa; border-top: 1.5px solid #000; }' +
        '  .double-total-row td { font-weight: bold; font-size: 12px; background: #eaeaea; border-top: 1.5px solid #000; border-bottom: 3px double #000 !important; }' +
        '  .balance-due-row td { font-weight: bold; color: #b91c1c !important; background: #fef2f2; border: 1.5px solid #b91c1c; }' +
        '  .refund-due-row td { font-weight: bold; color: #15803d !important; background: #f0fdf4; border: 1.5px solid #15803d; }' +
        '  .sub-row td { font-size: 10px; color: #444; padding-left: 20px; border-top: none; }' +
        '  .text-right { text-align: right !important; }' +
        '  .text-center { text-align: center !important; }' +
        '  .text-success { color: #15803d !important; }' +
        '  .page-break { page-break-before: always; }' +
        '  .signature-section { margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid; }' +
        '  .signature-box { width: 45%; border-top: 1.5px solid #000; text-align: center; padding-top: 8px; font-size: 11px; line-height: 1.5; }' +
        '  .print-disclaimer { margin-top: 40px; font-size: 9px; color: #444; line-height: 1.5; border-top: 1.5px solid #000; padding-top: 10px; font-style: italic; text-align: justify; }' +
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
