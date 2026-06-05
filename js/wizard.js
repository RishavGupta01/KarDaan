/**
 * @file wizard.js
 * @description Guided step-by-step wizard UI engine for KarDaan.
 *              Manages dynamic step routing, state management, review panels, and final dashboard rendering.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  if (!window.Utils || !window.TaxEngine || !window.TaxOptimizer || !window.FormSelector || !window.TaxCharts) {
    throw new Error('[TaxWizard] Missing core dependencies. Verify script load order.');
  }

  // Wizard state
  var state = {
    currentStepIndex: 0,
    profile: { name: '', age: 30, pan: '', filingType: 'individual', isResident: true },
    selectedIncomes: { salary: false, property: false, gains: false, business: false, other: false },
    income: {
      salary: { basic: 0, da: 0, hra: 0, specialAllowance: 0, grossSalary: 0, tds: 0 },
      houseProperty: [],
      capitalGains: {
        listed: { stcg: 0, ltcg: 0 },
        property: { stcg: 0, ltcg: 0 },
        gold: { stcg: 0, ltcg: 0 },
        debt: { gains: 0 }
      },
      business: { type: 'none', turnover: 0, cashTurnover: 0, digitalTurnover: 0, expenses: 0, vehicleCount: 0, vehicleType: 'other' },
      otherSources: { savingsInterest: 0, fdInterest: 0, dividends: 0, lottery: 0, other: 0 }
    },
    deductions: {
      '80C': 0, '80CCC': 0, '80CCD1': 0, '80CCD1B': 0, '80CCD2': 0,
      '80D_self': 0, '80D_parents': 0, parentsSenior: false,
      '80E': 0, '80G': 0, '80GG': { rentPaid: 0 }, '80TTA': 0, '80TTB': 0,
      '80U': 0, '80DD': 0, '80DDB': 0, basicPlusDA: 0
    },
    taxesPaid: { tds: 0, advanceTax: 0, selfAssessment: 0 }
  };

  // Complete step pipeline definition
  var steps = [
    { id: 'welcome', label: 'Welcome', skip: function () { return false; } },
    { id: 'profile', label: 'Profile', skip: function () { return false; } },
    { id: 'sources', label: 'Sources', skip: function () { return false; } },
    { id: 'salary', label: 'Salary', skip: function () { return !state.selectedIncomes.salary; } },
    { id: 'property', label: 'House Property', skip: function () { return !state.selectedIncomes.property; } },
    { id: 'gains', label: 'Capital Gains', skip: function () { return !state.selectedIncomes.gains; } },
    { id: 'business', label: 'Business', skip: function () { return !state.selectedIncomes.business; } },
    { id: 'other', label: 'Other Income', skip: function () { return !state.selectedIncomes.other; } },
    { id: 'deductions', label: 'Deductions', skip: function () { return false; } },
    { id: 'taxes', label: 'Taxes Paid', skip: function () { return false; } },
    { id: 'review', label: 'Review', skip: function () { return false; } },
    { id: 'results', label: 'Dashboard', skip: function () { return false; } }
  ];

  var container = null;

  window.TaxWizard = {
    /**
     * Initialize wizard in specified DOM element.
     * @param {string} containerId
     */
    init: function (containerId) {
      container = document.getElementById(containerId);
      if (!container) return;

      // Try load previous progress
      var saved = window.Utils.loadFromLocalStorage('kardaan_draft');
      if (saved) {
        state = saved;
        window.Utils.showToast('Resumed your draft successfully!', 'success');
      }

      this.renderStep();
    },

    /**
     * Get active step object.
     */
    getCurrentStep: function () {
      return steps[state.currentStepIndex];
    },

    /**
     * Navigate to next step with validation.
     */
    nextStep: function () {
      if (!this.validateCurrentStep()) return;
      this.collectStepData();
      
      // Save draft progress on every step transition
      window.Utils.saveToLocalStorage('kardaan_draft', state);

      do {
        state.currentStepIndex++;
      } while (state.currentStepIndex < steps.length && steps[state.currentStepIndex].skip());

      this.renderStep();
      window.Utils.scrollToElement(container);
    },

    /**
     * Navigate back.
     */
    prevStep: function () {
      this.collectStepData();
      
      do {
        state.currentStepIndex--;
      } while (state.currentStepIndex >= 0 && steps[state.currentStepIndex].skip());

      this.renderStep();
      window.Utils.scrollToElement(container);
    },

    /**
     * Render the active step template.
     */
    renderStep: function () {
      if (!container) return;
      var step = this.getCurrentStep();

      // Layout scaffolding
      container.className = 'wizard-layout';
      container.innerHTML = '';

      var mainCol = window.Utils.createElement('div', 'wizard-main');
      var sideCol = window.Utils.createElement('div', 'wizard-sidebar');

      // Render Progress Stepper (except on welcome and results steps)
      if (step.id !== 'welcome' && step.id !== 'results') {
        this.renderStepper(mainCol);
      }

      var card = window.Utils.createElement('div', 'card wizard-card');
      var body = window.Utils.createElement('div', 'wizard-body');
      
      // Load specific step HTML content
      this['render_' + step.id](body);
      card.appendChild(body);

      // Footer action buttons
      this.renderFooterButtons(card);
      mainCol.appendChild(card);

      container.appendChild(mainCol);

      // Render Summary Sidebar (if not on welcome or results)
      if (step.id !== 'welcome' && step.id !== 'results') {
        this.renderSidebar(sideCol);
        container.appendChild(sideCol);
      }
    },

    /**
     * Render footer action buttons.
     * @param {HTMLElement} parent
     */
    renderFooterButtons: function (parent) {
      var step = this.getCurrentStep();
      var footer = window.Utils.createElement('div', 'wizard-footer');

      if (step.id === 'welcome') {
        var startBtn = window.Utils.createElement('button', 'btn btn-primary btn-lg', 'Start Assessment ');
        startBtn.onclick = function () { window.TaxWizard.nextStep(); };
        footer.appendChild(window.Utils.createElement('div')); // filler
        footer.appendChild(startBtn);
      } else if (step.id === 'results') {
        var restartBtn = window.Utils.createElement('button', 'btn btn-secondary', ' Assess Again');
        restartBtn.onclick = function () {
          window.Utils.clearLocalStorage('kardaan_draft');
          window.location.reload();
        };
        footer.appendChild(restartBtn);

        var printBtn = window.Utils.createElement('button', 'btn btn-success', ' Save Report (PDF)');
        printBtn.onclick = function () {
          var taxRes = window.TaxEngine.computeFullTax(state);
          var suggs = window.TaxOptimizer.optimize(state, taxRes);
          window.ReportGenerator.downloadPDF(state, taxRes, suggs);
        };
        footer.appendChild(printBtn);
      } else {
        var deleteBtn = window.Utils.createElement('button', 'btn btn-danger', 'Reset Draft');
        deleteBtn.onclick = function () {
          if (confirm('Are you sure you want to delete your draft and reset all inputs? This cannot be undone.')) {
            window.Utils.clearLocalStorage('kardaan_draft');
            window.location.reload();
          }
        };
        footer.appendChild(deleteBtn);

        var rightActions = window.Utils.createElement('div');
        rightActions.style.display = 'flex';
        rightActions.style.gap = 'var(--space-3)';

        var backBtn = window.Utils.createElement('button', 'btn btn-secondary', '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>Back');
        backBtn.onclick = function () { window.TaxWizard.prevStep(); };
        rightActions.appendChild(backBtn);

        var label = step.id === 'review' ? 'Calculate Tax ' : 'Continue ';
        var nextBtn = window.Utils.createElement('button', 'btn btn-primary', label);
        nextBtn.onclick = function () { window.TaxWizard.nextStep(); };
        rightActions.appendChild(nextBtn);

        footer.appendChild(rightActions);
      }

      parent.appendChild(footer);
    },

    /**
     * Render Stepper timeline.
     * @param {HTMLElement} parent
     */
    renderStepper: function (parent) {
      var stepper = window.Utils.createElement('div', 'stepper-container');
      
      // Sift major display milestones
      var milestones = [
        { key: 'profile', label: 'Profile' },
        { key: 'sources', label: 'Sources' },
        { key: 'salary', label: 'Income Details' },
        { key: 'deductions', label: 'Deductions' },
        { key: 'review', label: 'Review' }
      ];

      var activeKey = 'salary'; // Default group for details
      var currentId = this.getCurrentStep().id;
      if (currentId === 'profile') activeKey = 'profile';
      else if (currentId === 'sources') activeKey = 'sources';
      else if (currentId === 'deductions') activeKey = 'deductions';
      else if (currentId === 'taxes' || currentId === 'review') activeKey = 'review';

      var currentFound = false;

      for (var i = 0; i < milestones.length; i++) {
        var ms = milestones[i];
        var stepDiv = window.Utils.createElement('div', 'stepper-step');
        
        if (ms.key === activeKey) {
          stepDiv.classList.add('active');
          currentFound = true;
        } else if (!currentFound) {
          stepDiv.classList.add('completed');
        }

        stepDiv.innerHTML = '<div class="step-bubble">' + (i + 1) + '</div><div class="step-label">' + ms.label + '</div>';
        stepper.appendChild(stepDiv);
      }

      parent.appendChild(stepper);
    },

    /**
     * Render live tax summary sidebar.
     * @param {HTMLElement} parent
     */
    renderSidebar: function (parent) {
      var taxRes = window.TaxEngine.computeFullTax(state);
      var summaryHTML = window.ReportGenerator.generateSummaryHTML(taxRes);
      parent.innerHTML = summaryHTML;
    },

    // ───────────────────────────────────────────────
    // STEP RENDERING LOGIC
    // ───────────────────────────────────────────────

    render_welcome: function (el) {
      el.innerHTML = 
        '<div class="text-center animate-fade-in-up" style="padding: var(--space-8) 0;">' +
        '  <span style="font-size: 64px; font-weight: 800; color: var(--color-primary-400);">IN</span>' +
        '  <h1 class="text-gradient-hero" style="font-size: var(--font-size-5xl); margin-top: 15px;">KarDaan</h1>' +
        '  <p style="font-size: var(--font-size-lg); max-width: 600px; margin: 15px auto var(--space-8);">' +
        '    Your premium, end-to-end Indian Tax assistant. Simplify your filing, compare Old vs New regimes, and optimize your taxes legally for FY 2025-26.' +
        '  </p>' +
        '  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); max-width: 700px; margin: 0 auto;">' +
        '    <div class="card glass-light" style="padding: 20px;">' +
        '      <div style="margin-bottom: 10px;">' +
        '        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 28px; height: 28px; margin: 0 auto; color: var(--color-primary-400);">' +
        '          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />' +
        '        </svg>' +
        '      </div>' +
        '      <h4 style="margin: 10px 0 5px;">100% Private</h4>' +
        '      <p style="font-size: 12px; margin: 0;">All computations occur client-side. No financial data leaves your device.</p>' +
        '    </div>' +
        '    <div class="card glass-light" style="padding: 20px;">' +
        '      <div style="margin-bottom: 10px;">' +
        '        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 28px; height: 28px; margin: 0 auto; color: var(--color-accent-400);">' +
        '          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-9L21 12m0 0-4.5 4.5M21 12H7.5" />' +
        '        </svg>' +
        '      </div>' +
        '      <h4 style="margin: 10px 0 5px;">Dual Regime</h4>' +
        '      <p style="font-size: 12px; margin: 0;">Instantly compare New vs Old tax slabs under Budget 2025 rules.</p>' +
        '    </div>' +
        '    <div class="card glass-light" style="padding: 20px;">' +
        '      <div style="margin-bottom: 10px;">' +
        '        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 28px; height: 28px; margin: 0 auto; color: var(--color-warning-400);">' +
        '          <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 21l-.813-5.096L3.091 15.09 8.187 14.28 9 9l.813 5.28 5.096.81-5.096.814ZM19.071 5.929a.75.75 0 0 1 0 1.06l-.53.53a.75.75 0 0 1-1.06 0l-.53-.53a.75.75 0 0 1 0-1.06l.53-.53a.75.75 0 0 1 1.06 0l.53.53ZM16.5 16.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />' +
        '        </svg>' +
        '      </div>' +
        '      <h4 style="margin: 10px 0 5px;">Optimization</h4>' +
        '      <p style="font-size: 12px; margin: 0;">Get recommendations to legally lower your tax outgo.</p>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    },

    render_profile: function (el) {
      el.innerHTML = 
        '<h2>1. Personal Profile</h2>' +
        '<p class="card-subtitle">Tell us about yourself to tailor slabs and rules.</p>' +
        '<div style="display: flex; flex-direction: column; gap: var(--space-4); margin-top: 20px;">' +
        '  <div class="form-group">' +
        '    <label class="form-label" for="prof-name">Full Name</label>' +
        '    <input class="form-input" id="prof-name" type="text" placeholder="Enter name" value="' + state.profile.name + '">' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label" for="prof-age">Age</label>' +
        '    <input class="form-input" id="prof-age" type="number" min="0" max="120" placeholder="e.g. 30" value="' + state.profile.age + '">' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label" for="prof-pan">PAN (Optional)</label>' +
        '    <input class="form-input" id="prof-pan" type="text" maxlength="10" placeholder="ABCDE1234F" style="text-transform: uppercase;" value="' + state.profile.pan + '">' +
        '    <span class="form-desc">Permanent Account Number (10 alphanumeric digits).</span>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">Taxpayer Category</label>' +
        '    <select class="form-select" id="prof-type">' +
        '      <option value="individual" ' + (state.profile.filingType === 'individual' ? 'selected' : '') + '>Individual (Salaried / Professional)</option>' +
        '      <option value="huf" ' + (state.profile.filingType === 'huf' ? 'selected' : '') + '>HUF (Hindu Undivided Family)</option>' +
        '      <option value="firm" ' + (state.profile.filingType === 'firm' ? 'selected' : '') + '>Partnership Firm / LLP</option>' +
        '      <option value="company" ' + (state.profile.filingType === 'company' ? 'selected' : '') + '>Corporate / Company</option>' +
        '    </select>' +
        '  </div>' +
        '</div>';
    },

    render_sources: function (el) {
      el.innerHTML = 
        '<h2>2. Income Sources</h2>' +
        '<p class="card-subtitle">Select all applicable sources of income for the year.</p>' +
        '<div class="option-grid grid-3 stagger-children" style="margin-top: 20px;">' +
        '  <div class="option-card ' + (state.selectedIncomes.salary ? 'selected' : '') + '" onclick="this.classList.toggle(\'selected\')">' +
        '    <span class="option-icon">' +
        '      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 24px; height: 24px; color: var(--color-primary-400);">' +
        '        <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 0 1 3.75 18.4v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.45.258-.717.258H4.875a1.002 1.002 0 0 1-.717-.258m16.5 0c.29-.247.467-.61.467-.99V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m0 0V5.25c0-1.03-.83-1.875-1.875-1.875H10.5C9.455 3.375 8.625 4.205 8.625 5.25v1.281m8.625 0a48.112 48.112 0 0 1-8.625 0m0 0A48.114 48.114 0 0 0 5.213 6.531C4.144 6.69 3.375 7.625 3.375 8.706v4.783c0 .38.177.744.467.99m0 0a2.18 2.18 0 0 1 .717-.258H19.5" />' +
        '      </svg>' +
        '    </span>' +
        '    <span class="option-title">Salaried / Pensioner</span>' +
        '    <span class="option-desc">Receives Form 16, standard deductions.</span>' +
        '  </div>' +
        '  <div class="option-card ' + (state.selectedIncomes.property ? 'selected' : '') + '" onclick="this.classList.toggle(\'selected\')">' +
        '    <span class="option-icon">' +
        '      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 24px; height: 24px; color: var(--color-primary-400);">' +
        '        <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />' +
        '      </svg>' +
        '    </span>' +
        '    <span class="option-title">House Property</span>' +
        '    <span class="option-desc">Rental income or paying interest on home loan.</span>' +
        '  </div>' +
        '  <div class="option-card ' + (state.selectedIncomes.gains ? 'selected' : '') + '" onclick="this.classList.toggle(\'selected\')">' +
        '    <span class="option-icon">' +
        '      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 24px; height: 24px; color: var(--color-primary-400);">' +
        '        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-3.793-.772m3.793.772-1.217 3.793" />' +
        '      </svg>' +
        '    </span>' +
        '    <span class="option-title">Capital Gains</span>' +
        '    <span class="option-desc">Shares, Mutual Funds, Gold, Real Estate sales.</span>' +
        '  </div>' +
        '  <div class="option-card ' + (state.selectedIncomes.business ? 'selected' : '') + '" onclick="this.classList.toggle(\'selected\')">' +
        '    <span class="option-icon">' +
        '      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 24px; height: 24px; color: var(--color-primary-400);">' +
        '        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />' +
        '      </svg>' +
        '    </span>' +
        '    <span class="option-title">Business / Profession</span>' +
        '    <span class="option-desc">Small traders, doctors, lawyers, freelancers, regular business.</span>' +
        '  </div>' +
        '  <div class="option-card ' + (state.selectedIncomes.other ? 'selected' : '') + '" onclick="this.classList.toggle(\'selected\')">' +
        '    <span class="option-icon">' +
        '      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 24px; height: 24px; color: var(--color-primary-400);">' +
        '        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v10m-3-7h6m-5.25-1.5h4.5M12 5.25v1.5M12 17.25v1.5" />' +
        '      </svg>' +
        '    </span>' +
        '    <span class="option-title">Other Sources</span>' +
        '    <span class="option-desc">FD/Savings interest, Dividends, Lottery, Gifts.</span>' +
        '  </div>' +
        '</div>';
    },

    render_salary: function (el) {
      var sal = state.income.salary;
      el.innerHTML = 
        '<h2>3. Salary Income Details</h2>' +
        '<p class="card-subtitle">Refer to your Form 16 (Part B) for these values.</p>' +
        '<div class="income-input-row" style="margin-top: 20px;">' +
        '  <div class="form-group">' +
        '    <label class="form-label">Basic Salary (Annual)</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="sal-basic" type="number" placeholder="0" value="' + (sal.basic || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">Dearness Allowance (DA)</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="sal-da" type="number" placeholder="0" value="' + (sal.da || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">HRA (House Rent Allowance)</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="sal-hra" type="number" placeholder="0" value="' + (sal.hra || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">Special Allowance / Other Allowances</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="sal-special" type="number" placeholder="0" value="' + (sal.specialAllowance || '') + '">' +
        '    </div>' +
        '  </div>' +
        '</div>' +
        '<div class="section-divider">Taxes Deducted</div>' +
        '<div class="form-group" style="max-width: 50%;">' +
        '  <label class="form-label">TDS on Salary (from Form 16)</label>' +
        '  <div class="input-container"><span class="input-prefix">₹</span>' +
        '    <input class="form-input" id="sal-tds" type="number" placeholder="0" value="' + (sal.tds || '') + '">' +
        '  </div>' +
        '</div>';
    },

    render_property: function (el) {
      var props = state.income.houseProperty;
      var propHtml = '';
      
      if (props.length === 0) {
        // default 1 self occupied item
        props.push({ type: 'selfOccupied', annualRent: 0, municipalTax: 0, interestOnLoan: 0, principalRepaid: 0 });
      }

      for (var i = 0; i < props.length; i++) {
        var p = props[i];
        propHtml += 
          '<div class="card glass-light" style="padding: 20px; margin-bottom: 20px; position: relative;">' +
          '  <h4 style="margin-bottom: 15px;">Property #' + (i + 1) + '</h4>' +
          '  <div class="income-input-row">' +
          '    <div class="form-group">' +
          '      <label class="form-label">Property Type</label>' +
          '      <select class="form-select hp-type" data-index="' + i + '">' +
          '        <option value="selfOccupied" ' + (p.type === 'selfOccupied' ? 'selected' : '') + '>Self-Occupied</option>' +
          '        <option value="letOut" ' + (p.type === 'letOut' ? 'selected' : '') + '>Let-Out (Rented)</option>' +
          '      </select>' +
          '    </div>' +
          '    <div class="form-group hp-rent-group" style="' + (p.type === 'selfOccupied' ? 'display:none;' : '') + '">' +
          '      <label class="form-label">Annual Rent Received</label>' +
          '      <div class="input-container"><span class="input-prefix">₹</span>' +
          '        <input class="form-input hp-rent" type="number" placeholder="0" value="' + (p.annualRent || '') + '">' +
          '      </div>' +
          '    </div>' +
          '  </div>' +
          '  <div class="income-input-row" style="margin-top: 10px;">' +
          '    <div class="form-group hp-tax-group" style="' + (p.type === 'selfOccupied' ? 'display:none;' : '') + '">' +
          '      <label class="form-label">Municipal Taxes Paid</label>' +
          '      <div class="input-container"><span class="input-prefix">₹</span>' +
          '        <input class="form-input hp-tax" type="number" placeholder="0" value="' + (p.municipalTax || '') + '">' +
          '      </div>' +
          '    </div>' +
          '    <div class="form-group">' +
          '      <label class="form-label">Interest on Home Loan (Section 24b)</label>' +
          '      <div class="input-container"><span class="input-prefix">₹</span>' +
          '        <input class="form-input hp-interest" type="number" placeholder="0" value="' + (p.interestOnLoan || '') + '">' +
          '      </div>' +
          '    </div>' +
          '  </div>' +
          '</div>';
      }

      el.innerHTML = 
        '<h2>4. House Property Income / Loss</h2>' +
        '<p class="card-subtitle">Add details for owned properties and loan interest.</p>' +
        '<div id="hp-properties-container" style="margin-top: 20px;">' + propHtml + '</div>' +
        '<button class="btn btn-secondary btn-sm" id="btn-add-property" style="margin-top: 10px;">+ Add Another Property</button>';

      // Bind dynamic events
      var containerDiv = el.querySelector('#hp-properties-container');
      containerDiv.addEventListener('change', function (e) {
        if (e.target.classList.contains('hp-type')) {
          var index = e.target.getAttribute('data-index');
          var card = e.target.closest('.card');
          var rentGroup = card.querySelector('.hp-rent-group');
          var taxGroup = card.querySelector('.hp-tax-group');
          
          if (e.target.value === 'selfOccupied') {
            rentGroup.style.display = 'none';
            taxGroup.style.display = 'none';
          } else {
            rentGroup.style.display = 'block';
            taxGroup.style.display = 'block';
          }
        }
      });

      var addBtn = el.querySelector('#btn-add-property');
      addBtn.onclick = function () {
        state.income.houseProperty.push({ type: 'selfOccupied', annualRent: 0, municipalTax: 0, interestOnLoan: 0, principalRepaid: 0 });
        window.TaxWizard.renderStep();
      };
    },

    render_gains: function (el) {
      var cg = state.income.capitalGains;
      el.innerHTML = 
        '<h2>5. Capital Gains</h2>' +
        '<p class="card-subtitle">Declare gains/losses from equity, real estate, and gold transactions.</p>' +
        '<div style="display: flex; flex-direction: column; gap: var(--space-6); margin-top: 20px;">' +
        '  <div class="card glass-light" style="padding: 20px;">' +
        '    <h4 style="margin-bottom: 12px;"> Listed Shares / Equity Mutual Funds</h4>' +
        '    <div class="income-input-row">' +
        '      <div class="form-group">' +
        '        <label class="form-label">STCG (Short-Term - sold within 1 yr)</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="cg-eq-stcg" type="number" placeholder="0" value="' + (cg.listed.stcg || '') + '">' +
        '        </div>' +
        '      </div>' +
        '      <div class="form-group">' +
        '        <label class="form-label">LTCG (Long-Term - sold after 1 yr)</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="cg-eq-ltcg" type="number" placeholder="0" value="' + (cg.listed.ltcg || '') + '">' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div class="card glass-light" style="padding: 20px;">' +
        '    <h4 style="margin-bottom: 12px;"> Property / Real Estate</h4>' +
        '    <div class="income-input-row">' +
        '      <div class="form-group">' +
        '        <label class="form-label">STCG (sold within 2 yrs)</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="cg-prop-stcg" type="number" placeholder="0" value="' + (cg.property.stcg || '') + '">' +
        '        </div>' +
        '      </div>' +
        '      <div class="form-group">' +
        '        <label class="form-label">LTCG (sold after 2 yrs)</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="cg-prop-ltcg" type="number" placeholder="0" value="' + (cg.property.ltcg || '') + '">' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div class="card glass-light" style="padding: 20px;">' +
        '    <h4 style="margin-bottom: 12px;"> Gold / Jewels / Other Assets</h4>' +
        '    <div class="income-input-row">' +
        '      <div class="form-group">' +
        '        <label class="form-label">STCG (sold within 2 yrs)</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="cg-gold-stcg" type="number" placeholder="0" value="' + (cg.gold.stcg || '') + '">' +
        '        </div>' +
        '      </div>' +
        '      <div class="form-group">' +
        '        <label class="form-label">LTCG (sold after 2 yrs)</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="cg-gold-ltcg" type="number" placeholder="0" value="' + (cg.gold.ltcg || '') + '">' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '  <div class="card glass-light" style="padding: 20px;">' +
        '    <h4 style="margin-bottom: 12px;"> Debt Mutual Funds / Bonds</h4>' +
        '    <div class="form-group" style="max-width: 50%;">' +
        '      <label class="form-label">Total Debt Gains (Always taxed at slab rate)</label>' +
        '      <div class="input-container"><span class="input-prefix">₹</span>' +
        '        <input class="form-input" id="cg-debt-gains" type="number" placeholder="0" value="' + (cg.debt.gains || '') + '">' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    },

    render_business: function (el) {
      var biz = state.income.business;
      el.innerHTML = 
        '<h2>6. Business or Profession Income</h2>' +
        '<p class="card-subtitle">Fill in presumptive scheme turnovers or regular accounting profits.</p>' +
        '<div style="display: flex; flex-direction: column; gap: var(--space-4); margin-top: 20px;">' +
        '  <div class="form-group">' +
        '    <label class="form-label">Taxation Scheme Type</label>' +
        '    <select class="form-select" id="biz-type">' +
        '      <option value="none" ' + (biz.type === 'none' ? 'selected' : '') + '>No Business Income</option>' +
        '      <option value="44AD" ' + (biz.type === '44AD' ? 'selected' : '') + '>Section 44AD (Small Business Presumptive)</option>' +
        '      <option value="44ADA" ' + (biz.type === '44ADA' ? 'selected' : '') + '>Section 44ADA (Professional Presumptive)</option>' +
        '      <option value="regular" ' + (biz.type === 'regular' ? 'selected' : '') + '>Regular Account Book Filing (ITR-3)</option>' +
        '    </select>' +
        '  </div>' +
        '  <div id="biz-form-fields" style="' + (biz.type === 'none' ? 'display:none;' : '') + '">' +
        '    <div class="income-input-row">' +
        '      <div class="form-group">' +
        '        <label class="form-label" id="lbl-turnover">Gross Turnover / Professional Receipts</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="biz-turnover" type="number" placeholder="0" value="' + (biz.turnover || '') + '">' +
        '        </div>' +
        '      </div>' +
        '      <div class="form-group" id="group-cash" style="' + (biz.type !== '44AD' && biz.type !== '44ADA' ? 'display:none;' : '') + '">' +
        '        <label class="form-label">Out of which, Cash Receipts</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="biz-cash" type="number" placeholder="0" value="' + (biz.cashTurnover || '') + '">' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '    <div class="income-input-row" id="group-regular-details" style="' + (biz.type !== 'regular' ? 'display:none;' : '') + '">' +
        '      <div class="form-group">' +
        '        <label class="form-label">Total Allowable Expenses</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="biz-expenses" type="number" placeholder="0" value="' + (biz.expenses || '') + '">' +
        '        </div>' +
        '      </div>' +
        '      <div class="form-group">' +
        '        <label class="form-label">Claimed Depreciation (WDV Block)</label>' +
        '        <div class="input-container"><span class="input-prefix">₹</span>' +
        '          <input class="form-input" id="biz-depr" type="number" placeholder="0" value="' + (biz.depreciation || '') + '">' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';

      // Attach selectors
      var typeSelect = el.querySelector('#biz-type');
      typeSelect.onchange = function (e) {
        var val = e.target.value;
        var formFields = el.querySelector('#biz-form-fields');
        var cashGroup = el.querySelector('#group-cash');
        var regularGroup = el.querySelector('#group-regular-details');
        var lblTurnover = el.querySelector('#lbl-turnover');

        if (val === 'none') {
          formFields.style.display = 'none';
        } else {
          formFields.style.display = 'block';
          if (val === '44AD') {
            cashGroup.style.display = 'block';
            regularGroup.style.display = 'none';
            lblTurnover.textContent = 'Gross Turnover (Annual)';
          } else if (val === '44ADA') {
            cashGroup.style.display = 'block';
            regularGroup.style.display = 'none';
            lblTurnover.textContent = 'Gross Professional Receipts';
          } else {
            cashGroup.style.display = 'none';
            regularGroup.style.display = 'block';
            lblTurnover.textContent = 'Gross Revenue';
          }
        }
      };
    },

    render_other: function (el) {
      var os = state.income.otherSources;
      el.innerHTML = 
        '<h2>7. Income from Other Sources</h2>' +
        '<p class="card-subtitle">FD interest, dividends, lottery winnings, and miscellaneous assets.</p>' +
        '<div class="income-input-row" style="margin-top: 20px;">' +
        '  <div class="form-group">' +
        '    <label class="form-label">Savings Bank Account Interest</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="os-savings" type="number" placeholder="0" value="' + (os.savingsInterest || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">Fixed Deposit (FD) Interest</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="os-fd" type="number" placeholder="0" value="' + (os.fdInterest || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">Dividends from Indian Shares</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="os-div" type="number" placeholder="0" value="' + (os.dividends || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">Lottery / Game / Betting wins (Flat 30% tax)</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="os-lotto" type="number" placeholder="0" value="' + (os.lottery || '') + '">' +
        '    </div>' +
        '  </div>' +
        '</div>';
    },

    render_deductions: function (el) {
      var d = state.deductions;
      el.innerHTML = 
        '<h2>8. Tax Deductions (Chapter VI-A)</h2>' +
        '<p class="card-subtitle">Note: Slabs and rebate optimizations apply differently under Old vs New Regime.</p>' +
        '<div class="optimization-grid" style="margin-top: 20px;">' +
        
        // Basic parameters (Required for engine calculations like Basic+DA)
        '  <div class="card glass-light" style="padding: 15px;">' +
        '    <div class="form-group" style="max-width: 50%; margin-bottom: 0;">' +
        '      <label class="form-label">Basic Salary + Dearness Allowance (DA)</label>' +
        '      <div class="input-container"><span class="input-prefix">₹</span>' +
        '        <input class="form-input" id="ded-sal-basicda" type="number" placeholder="0" value="' + (d.basicPlusDA || '') + '">' +
        '      </div>' +
        '      <span class="form-desc">Needed to calculate HRA exemptions and NPS limits.</span>' +
        '    </div>' +
        '  </div>' +

        // 80C
        '  <div class="category-group">' +
        '    <div class="category-header"> Section 80C - Core Investments (Limit: ₹1.5L) <span>▼</span></div>' +
        '    <div class="category-content">' +
        '      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">Includes PPF, ELSS mutual funds, EPF share, life insurance premium, home loan principal repaid, and school tuition fees.</p>' +
        '      <div class="income-input-row">' +
        '        <div class="form-group">' +
        '          <label class="form-label">Claimed Section 80C Amount</label>' +
        '          <div class="input-container"><span class="input-prefix">₹</span>' +
        '            <input class="form-input" id="ded-80c" type="number" placeholder="0" value="' + (d['80C'] || '') + '">' +
        '          </div>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +

        // 80D
        '  <div class="category-group">' +
        '    <div class="category-header"> Section 80D - Health Insurance Slabs <span>▼</span></div>' +
        '    <div class="category-content">' +
        '      <div class="income-input-row">' +
        '        <div class="form-group">' +
        '          <label class="form-label">Premium for Self / Family (Max ₹25k / ₹50k)</label>' +
        '          <div class="input-container"><span class="input-prefix">₹</span>' +
        '            <input class="form-input" id="ded-80d-self" type="number" placeholder="0" value="' + (d['80D_self'] || '') + '">' +
        '          </div>' +
        '        </div>' +
        '        <div class="form-group">' +
        '          <label class="form-label">Premium for Parents (Max ₹25k / ₹50k)</label>' +
        '          <div class="input-container"><span class="input-prefix">₹</span>' +
        '            <input class="form-input" id="ded-80d-parents" type="number" placeholder="0" value="' + (d['80D_parents'] || '') + '">' +
        '          </div>' +
        '        </div>' +
        '      </div>' +
        '      <label class="checkbox-label" style="margin-top: 10px;">' +
        '        <input type="checkbox" class="checkbox-input" id="ded-80d-senior" ' + (d.parentsSenior ? 'checked' : '') + '>' +
        '        <span class="checkbox-custom"></span>' +
        '        <span>Parents are Senior Citizens (aged 60+)</span>' +
        '      </label>' +
        '    </div>' +
        '  </div>' +

        // NPS
        '  <div class="category-group">' +
        '    <div class="category-header"> Sections 80CCD - National Pension System (NPS) <span>▼</span></div>' +
        '    <div class="category-content">' +
        '      <div class="income-input-row">' +
        '        <div class="form-group">' +
        '          <label class="form-label">Sec 80CCD(1B) Additional Voluntary NPS (Max ₹50k)</label>' +
        '          <div class="input-container"><span class="input-prefix">₹</span>' +
        '            <input class="form-input" id="ded-80ccd1b" type="number" placeholder="0" value="' + (d['80CCD1B'] || '') + '">' +
        '          </div>' +
        '        </div>' +
        '        <div class="form-group">' +
        '          <label class="form-label">Sec 80CCD(2) Employer Contribution</label>' +
        '          <div class="input-container"><span class="input-prefix">₹</span>' +
        '            <input class="form-input" id="ded-80ccd2" type="number" placeholder="0" value="' + (d['80CCD2'] || '') + '">' +
        '          </div>' +
        '          <span class="form-desc">Exempt up to 10% basic (old regime) or 14% basic (new regime).</span>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +

        // Others
        '  <div class="category-group">' +
        '    <div class="category-header"> Other Deductions (80E, 80G, 80GG) <span>▼</span></div>' +
        '    <div class="category-content">' +
        '      <div class="income-input-row">' +
        '        <div class="form-group">' +
        '          <label class="form-label">Sec 80E Education Loan Interest (No Limit)</label>' +
        '          <div class="input-container"><span class="input-prefix">₹</span>' +
        '            <input class="form-input" id="ded-80e" type="number" placeholder="0" value="' + (d['80E'] || '') + '">' +
        '          </div>' +
        '        </div>' +
        '        <div class="form-group">' +
        '          <label class="form-label">Sec 80G Charitable Donations</label>' +
        '          <div class="input-container"><span class="input-prefix">₹</span>' +
        '            <input class="form-input" id="ded-80g" type="number" placeholder="0" value="' + (d['80G'] || '') + '">' +
        '          </div>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +

        '</div>';

      // Hook toggle accordion header action
      var headers = el.querySelectorAll('.category-header');
      for (var i = 0; i < headers.length; i++) {
        headers[i].onclick = function () {
          var content = this.nextElementSibling;
          content.style.display = content.style.display === 'none' || content.style.display === '' ? 'flex' : 'none';
        };
      }
    },

    render_taxes: function (el) {
      var t = state.taxesPaid;
      el.innerHTML = 
        '<h2>9. Taxes Already Paid</h2>' +
        '<p class="card-subtitle">Report advance taxes and TDS to calculate final balances outstanding or refunds due.</p>' +
        '<div class="income-input-row" style="margin-top: 20px;">' +
        '  <div class="form-group">' +
        '    <label class="form-label">TDS / TCS on Non-Salary Income (Form 26AS)</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="tax-tds" type="number" placeholder="0" value="' + (t.tds || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group">' +
        '    <label class="form-label">Advance Tax Paid (Total for year)</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="tax-adv" type="number" placeholder="0" value="' + (t.advanceTax || '') + '">' +
        '    </div>' +
        '  </div>' +
        '  <div class="form-group" style="grid-column: 1 / -1; max-width: 50%;">' +
        '    <label class="form-label">Self-Assessment Tax Paid (if any)</label>' +
        '    <div class="input-container"><span class="input-prefix">₹</span>' +
        '      <input class="form-input" id="tax-self" type="number" placeholder="0" value="' + (t.selfAssessment || '') + '">' +
        '    </div>' +
        '  </div>' +
        '</div>';
    },

    render_review: function (el) {
      var heads = window.TaxEngine.computeGrossIncome(state.income, 'new', 'below60').heads;
      var totalDeds = state.deductions['80C'] + state.deductions['80CCD1B'] + state.deductions['80D_self'] + state.deductions['80D_parents'];
      
      el.innerHTML = 
        '<h2>10. Review Details</h2>' +
        '<p class="card-subtitle">Review your reported income details before calculating.</p>' +
        '<div style="display: flex; flex-direction: column; gap: var(--space-4); margin-top: 20px;">' +
        '  <div class="table-container">' +
        '    <table class="table">' +
        '      <thead><tr><th>Category</th><th>Details</th><th>Gross Amount</th></tr></thead>' +
        '      <tbody>' +
        '        <tr><td><strong>Profile</strong></td><td>Name: ' + (state.profile.name || 'N/A') + ' | Age: ' + state.profile.age + '</td><td>-</td></tr>' +
        (state.selectedIncomes.salary ? '        <tr><td><strong>Salary</strong></td><td>Gross Salary reported</td><td>' + window.Utils.formatCurrency(heads.salaryGross) + '</td></tr>' : '') +
        (state.selectedIncomes.property ? '        <tr><td><strong>Properties</strong></td><td>Owned HP Interest/Income</td><td>' + window.Utils.formatCurrency(heads.houseProperty) + '</td></tr>' : '') +
        (state.selectedIncomes.gains ? '        <tr><td><strong>Capital Gains</strong></td><td>STCG + LTCG portfolio net</td><td>' + window.Utils.formatCurrency(heads.stcg + heads.ltcg) + '</td></tr>' : '') +
        (state.selectedIncomes.business ? '        <tr><td><strong>Business</strong></td><td>Presumptive or Regular</td><td>' + window.Utils.formatCurrency(heads.business) + '</td></tr>' : '') +
        (state.selectedIncomes.other ? '        <tr><td><strong>Other Sources</strong></td><td>Savings / FDs / Dividends</td><td>' + window.Utils.formatCurrency(heads.otherSources) + '</td></tr>' : '') +
        '        <tr><td><strong>Deductions</strong></td><td>Section claimed savings (80C, 80D, NPS etc.)</td><td>' + window.Utils.formatCurrency(totalDeds) + '</td></tr>' +
        '      </tbody>' +
        '    </table>' +
        '  </div>' +
        '</div>';
    },

    render_results: function (el) {
      var taxResult = window.TaxEngine.computeFullTax(state);
      var suggestions = window.TaxOptimizer.optimize(state, taxResult);
      var selectedForm = window.FormSelector.selectForm(state);

      var rec = taxResult.recommended;
      var savings = taxResult.savings;

      // Construct Results Dashboard structure
      var dashboardHTML = 
        '<div class="results-header">' +
        '  <h1 class="text-gradient-hero">Your Tax Summary</h1>' +
        '  <p>KarDaan has analyzed your income under the latest FY 2025-26 Indian slabs.</p>' +
        '</div>';

      if (savings > 0) {
        dashboardHTML += 
          '<div class="recommendation-banner">' +
          '  <span></span>' +
          '  <span>We recommend the <strong>' + (rec === 'new' ? 'New Regime' : 'Old Regime') + '</strong>. You will save <strong>' + window.Utils.formatCurrency(savings) + '</strong> in tax!</span>' +
          '</div>';
      }

      dashboardHTML += 
        '<div class="results-grid">' +
        '  <div class="card stat-card ' + (rec === 'new' ? 'accent' : '') + '">' +
        '    <span class="stat-label">New Regime Tax</span>' +
        '    <span class="stat-value">' + window.Utils.formatCurrency(taxResult.newRegime.netTax) + '</span>' +
        '    <span class="stat-desc" style="font-size:11px; color:var(--text-tertiary); margin-top:5px;">Including Cess & Surcharges</span>' +
        '  </div>' +
        '  <div class="card stat-card ' + (rec === 'old' ? 'accent' : '') + '">' +
        '    <span class="stat-label">Old Regime Tax</span>' +
        '    <span class="stat-value">' + window.Utils.formatCurrency(taxResult.oldRegime.netTax) + '</span>' +
        '    <span class="stat-desc" style="font-size:11px; color:var(--text-tertiary); margin-top:5px;">Afterclaimed deductions</span>' +
        '  </div>' +
        '  <div class="card stat-card warning">' +
        '    <span class="stat-label">Tax Form to File</span>' +
        '    <span class="stat-value">' + selectedForm.form + '</span>' +
        '    <span class="stat-desc" style="font-size:11px; color:var(--text-tertiary); margin-top:5px;">Recommended Return Form</span>' +
        '  </div>' +
        '</div>';

      dashboardHTML += 
        '<div class="results-details">' +
        '  <div class="card">' +
        '    <h3 style="margin-bottom: 20px;"> Slabs Comparison Chart</h3>' +
        '    <div style="height: 200px; width: 100%;"><canvas id="res-bar-chart" style="width:100%; height:100%;"></canvas></div>' +
        '  </div>' +
        '  <div class="card">' +
        '    <h3 style="margin-bottom: 20px;"> Recommended Optimization Ideas</h3>' +
        '    <div class="optimization-grid" id="dashboard-opts"></div>' +
        '  </div>' +
        '</div>' +
        '<div class="card" style="margin-top: var(--space-6);">' +
        '  <h3 style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">' +
        '    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px; color: var(--color-warning-500);"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>' +
        '    Chartered Accountant Audit & Compliance Review' +
        '  </h3>' +
        '  <p class="text-secondary" style="font-size: 13px; margin-bottom: var(--space-4);">An automated capability analysis checking thresholds, HRA compliance, carry-forward rules, and advance tax mandates.</p>' +
        '  <div id="dashboard-audit-checks" class="audit-checks-container"></div>' +
        '</div>';

      el.innerHTML = dashboardHTML;

      // Draw comparison chart
      setTimeout(function () {
        window.TaxCharts.drawBarChart('res-bar-chart', taxResult.oldRegime.netTax, taxResult.newRegime.netTax);
      }, 100);

      // Render top suggestions
      var optsContainer = el.querySelector('#dashboard-opts');
      var validSuggestions = suggestions.filter(function (s) { return s.category !== 'regime'; });

      if (validSuggestions.length === 0) {
        optsContainer.innerHTML = '<p class="text-muted" style="font-size:13px; text-align:center; padding: 20px;">No additional optimizations found. Your tax liability is minimized.</p>';
      } else {
        var optLimit = validSuggestions.length;
        for (var k = 0; k < optLimit; k++) {
          var sugg = validSuggestions[k];
          var optCard = window.Utils.createElement('div', 'opt-card animate-scale-in');
          optCard.innerHTML = 
            '<div class="opt-icon-bubble">' + sugg.icon + '</div>' +
            '<div class="opt-content">' +
            '  <div class="opt-header">' +
            '    <span class="opt-title">' + sugg.title + '</span>' +
            '    <span class="badge badge-success">Saves ' + window.Utils.formatCurrencyShort(sugg.potentialSavings) + '</span>' +
            '  </div>' +
            '  <p class="opt-desc">' + sugg.description + '</p>' +
            '  <div class="opt-footer"><span>Deadline: <strong>' + sugg.deadline + '</strong></span></div>' +
            '</div>';
          optsContainer.appendChild(optCard);
        }
      }

      // Render Audit & Compliance Checks
      var auditContainer = el.querySelector('#dashboard-audit-checks');
      if (auditContainer) {
        var auditChecks = window.TaxAuditor.runAudit(state, taxResult);
        if (auditChecks.length === 0) {
          auditContainer.innerHTML = 
            '<div style="padding: var(--space-4); text-align: center; color: var(--color-success-500); font-weight: var(--font-weight-medium);">' +
            '  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 18px; height: 18px; color: var(--color-success-500); display: inline-block; vertical-align: middle; margin-right: 6px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>' +
            '  Compliance Audit Passed: All inputs align with standard rules under the Income Tax Act, 1961. No audit flags or warning alerts detected.' +
            '</div>';
        } else {
          var auditHTML = '';
          for (var i = 0; i < auditChecks.length; i++) {
            var check = auditChecks[i];
            var iconSVG = '';
            
            if (check.type === 'danger') {
              iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px; color: var(--color-error);"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>';
            } else if (check.type === 'warning') {
              iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px; color: var(--color-warning);"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376C1.83 19.126 2.914 21 4.645 21h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" /></svg>';
            } else {
              iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 18px; height: 18px; color: var(--color-primary);"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 1 1 1.053.92l-.44 1.543a.75.75 0 0 0 .952.921l.044-.022M12 7.51h.008v.008H12v-.008ZM12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" /></svg>';
            }

            auditHTML += 
              '<div class="audit-check-card ' + check.type + ' animate-scale-in">' +
              '  <div class="audit-check-title">' +
              '    <span>' + iconSVG + '</span>' +
              '    <span>' + check.title + '</span>' +
              '  </div>' +
              '  <div class="audit-check-message">' + check.message + '</div>' +
              '  <div class="audit-check-action"><strong>Next Step:</strong> ' + check.action + '</div>' +
              '</div>';
          }
          auditContainer.innerHTML = auditHTML;
        }
      }
    },

    // ───────────────────────────────────────────────
    // DATA COLLECTION FROM FORM ELEMENTS
    // ───────────────────────────────────────────────

    collectStepData: function () {
      var step = this.getCurrentStep();
      if (!step) return;

      if (step.id === 'profile') {
        state.profile.name = document.getElementById('prof-name').value;
        state.profile.age = Number(document.getElementById('prof-age').value) || 30;
        state.profile.pan = document.getElementById('prof-pan').value;
        state.profile.filingType = document.getElementById('prof-type').value;
      }

      if (step.id === 'sources') {
        var cards = container.querySelectorAll('.option-card');
        state.selectedIncomes.salary = cards[0].classList.contains('selected');
        state.selectedIncomes.property = cards[1].classList.contains('selected');
        state.selectedIncomes.gains = cards[2].classList.contains('selected');
        state.selectedIncomes.business = cards[3].classList.contains('selected');
        state.selectedIncomes.other = cards[4].classList.contains('selected');
      }

      if (step.id === 'salary') {
        var sal = state.income.salary;
        sal.basic = Number(document.getElementById('sal-basic').value) || 0;
        sal.da = Number(document.getElementById('sal-da').value) || 0;
        sal.hra = Number(document.getElementById('sal-hra').value) || 0;
        sal.specialAllowance = Number(document.getElementById('sal-special').value) || 0;
        sal.grossSalary = sal.basic + sal.da + sal.hra + sal.specialAllowance;
        sal.tds = Number(document.getElementById('sal-tds').value) || 0;
        
        // Auto fill Basic+DA in deductions for NPS/HRA calculations
        state.deductions.basicPlusDA = sal.basic + sal.da;
      }

      if (step.id === 'property') {
        state.income.houseProperty = [];
        var cards = container.querySelectorAll('#hp-properties-container .card');
        for (var i = 0; i < cards.length; i++) {
          var card = cards[i];
          var type = card.querySelector('.hp-type').value;
          var rent = Number(card.querySelector('.hp-rent').value) || 0;
          var tax = Number(card.querySelector('.hp-tax').value) || 0;
          var loan = Number(card.querySelector('.hp-interest').value) || 0;

          state.income.houseProperty.push({
            type: type,
            annualRent: rent,
            municipalTax: tax,
            interestOnLoan: loan
          });
        }
      }

      if (step.id === 'gains') {
        var cg = state.income.capitalGains;
        cg.listed.stcg = Number(document.getElementById('cg-eq-stcg').value) || 0;
        cg.listed.ltcg = Number(document.getElementById('cg-eq-ltcg').value) || 0;
        cg.property.stcg = Number(document.getElementById('cg-prop-stcg').value) || 0;
        cg.property.ltcg = Number(document.getElementById('cg-prop-ltcg').value) || 0;
        cg.gold.stcg = Number(document.getElementById('cg-gold-stcg').value) || 0;
        cg.gold.ltcg = Number(document.getElementById('cg-gold-ltcg').value) || 0;
        cg.debt.gains = Number(document.getElementById('cg-debt-gains').value) || 0;
      }

      if (step.id === 'business') {
        var biz = state.income.business;
        biz.type = document.getElementById('biz-type').value;
        if (biz.type !== 'none') {
          biz.turnover = Number(document.getElementById('biz-turnover').value) || 0;
          if (biz.type === '44AD' || biz.type === '44ADA') {
            biz.cashTurnover = Number(document.getElementById('biz-cash').value) || 0;
            biz.digitalTurnover = biz.turnover - biz.cashTurnover;
          } else {
            biz.expenses = Number(document.getElementById('biz-expenses').value) || 0;
            biz.depreciation = Number(document.getElementById('biz-depr').value) || 0;
          }
        }
      }

      if (step.id === 'other') {
        var os = state.income.otherSources;
        os.savingsInterest = Number(document.getElementById('os-savings').value) || 0;
        os.fdInterest = Number(document.getElementById('os-fd').value) || 0;
        os.dividends = Number(document.getElementById('os-div').value) || 0;
        os.lottery = Number(document.getElementById('os-lotto').value) || 0;
        os.total = os.savingsInterest + os.fdInterest + os.dividends + os.lottery;
      }

      if (step.id === 'deductions') {
        var d = state.deductions;
        d.basicPlusDA = Number(document.getElementById('ded-sal-basicda').value) || 0;
        d['80C'] = Number(document.getElementById('ded-80c').value) || 0;
        d['80D_self'] = Number(document.getElementById('ded-80d-self').value) || 0;
        d['80D_parents'] = Number(document.getElementById('ded-80d-parents').value) || 0;
        d.parentsSenior = document.getElementById('ded-80d-senior').checked;
        d['80CCD1B'] = Number(document.getElementById('ded-80ccd1b').value) || 0;
        d['80CCD2'] = Number(document.getElementById('ded-80ccd2').value) || 0;
        d['80E'] = Number(document.getElementById('ded-80e').value) || 0;
        d['80G'] = Number(document.getElementById('ded-80g').value) || 0;

        // Auto fill 80TTA or 80TTB based on savings interest and age
        var interestInOther = state.income.otherSources ? Number(state.income.otherSources.savingsInterest || 0) : 0;
        var ageCategory = window.Utils.getAgeCategory(state.profile.age);
        if (ageCategory !== 'below60') {
          var fdInterest = state.income.otherSources ? Number(state.income.otherSources.fdInterest || 0) : 0;
          d['80TTB'] = Math.min(interestInOther + fdInterest, 50000);
        } else {
          d['80TTA'] = Math.min(interestInOther, 10000);
        }
      }

      if (step.id === 'taxes') {
        var t = state.taxesPaid;
        t.tds = Number(document.getElementById('tax-tds').value) || 0;
        t.advanceTax = Number(document.getElementById('tax-adv').value) || 0;
        t.selfAssessment = Number(document.getElementById('tax-self').value) || 0;
      }
    },

    /**
     * Validate current step inputs.
     * @returns {boolean} isValid
     */
    validateCurrentStep: function () {
      var step = this.getCurrentStep();
      if (!step) return true;

      if (step.id === 'profile') {
        var name = document.getElementById('prof-name').value;
        var age = Number(document.getElementById('prof-age').value);
        var pan = document.getElementById('prof-pan').value;

        if (!name || name.trim() === '') {
          window.Utils.showToast('Please enter your name.', 'error');
          return false;
        }
        if (isNaN(age) || age <= 0 || age > 120) {
          window.Utils.showToast('Please enter a valid age (1-120).', 'error');
          return false;
        }
        if (pan && pan.trim() !== '' && !window.Utils.validatePAN(pan)) {
          window.Utils.showToast('Invalid PAN format (Expected: ABCDE1234F).', 'error');
          return false;
        }
      }

      if (step.id === 'sources') {
        var cards = container.querySelectorAll('.option-card.selected');
        if (cards.length === 0) {
          window.Utils.showToast('Please select at least one source of income.', 'warning');
          return false;
        }
      }

      return true;
    }
  };
})();
