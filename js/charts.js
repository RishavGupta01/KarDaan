/**
 * @file charts.js
 * @description Custom HTML5 Canvas charts for KarDaan (donut, bar, waterfall, progress).
 *              No external dependencies. Built for theme-responsiveness and premium aesthetics.
 * @version 1.0.0
 * @license MIT
 */

(function () {
  'use strict';

  window.TaxCharts = {
    /**
     * Clear and prep canvas with high DPI support (retina).
     * @param {string|HTMLCanvasElement} canvas
     * @returns {CanvasRenderingContext2D}
     */
    getPrepContext: function (canvas) {
      var cvs = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
      if (!cvs) return null;

      var ctx = cvs.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      
      // Get logical dimensions
      var rect = cvs.getBoundingClientRect();
      var width = rect.width || cvs.width;
      var height = rect.height || cvs.height;

      // Set physical dimensions
      cvs.width = width * dpr;
      cvs.height = height * dpr;
      cvs.style.width = width + 'px';
      cvs.style.height = height + 'px';

      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      return ctx;
    },

    /**
     * Draw a Donut Chart showing income breakdown.
     * @param {string} canvasId
     * @param {Array<{label: string, value: number, color: string}>} data
     */
    drawDonutChart: function (canvasId, data) {
      var cvs = document.getElementById(canvasId);
      var ctx = this.getPrepContext(cvs);
      if (!ctx) return;

      var w = cvs.getBoundingClientRect().width;
      var h = cvs.getBoundingClientRect().height;
      var cx = w / 2;
      var cy = h / 2;
      var outerRadius = Math.min(cx, cy) - 20;
      var innerRadius = outerRadius * 0.65;

      var total = 0;
      for (var i = 0; i < data.length; i++) {
        total += data[i].value;
      }

      if (total === 0) {
        // Draw empty state
        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = outerRadius - innerRadius;
        ctx.stroke();
        
        ctx.fillStyle = '#64748b';
        ctx.font = '500 12px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No Income Reported', cx, cy);
        return;
      }

      var currentAngle = -Math.PI / 2; // Start from top
      ctx.lineWidth = outerRadius - innerRadius;

      for (var j = 0; j < data.length; j++) {
        var segment = data[j];
        if (segment.value <= 0) continue;

        var segmentAngle = (segment.value / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx, cy, (outerRadius + innerRadius) / 2, currentAngle, currentAngle + segmentAngle);
        ctx.strokeStyle = segment.color;
        ctx.stroke();

        currentAngle += segmentAngle;
      }

      // Draw center text
      ctx.fillStyle = document.body.getAttribute('data-theme') === 'light' ? '#0f172a' : '#f8fafc';
      ctx.font = '700 18px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(window.Utils.formatCurrencyShort(total), cx, cy - 8);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 10px Inter';
      ctx.fillText('Total Income', cx, cy + 12);
    },

    /**
     * Draw a Bar Chart comparing Old vs New tax liability.
     * @param {string} canvasId
     * @param {number} oldTax
     * @param {number} newTax
     */
    drawBarChart: function (canvasId, oldTax, newTax) {
      var cvs = document.getElementById(canvasId);
      var ctx = this.getPrepContext(cvs);
      if (!ctx) return;

      var w = cvs.getBoundingClientRect().width;
      var h = cvs.getBoundingClientRect().height;

      var padding = 40;
      var barWidth = 60;
      var maxBarHeight = h - padding * 2;

      var maxVal = Math.max(oldTax, newTax);
      if (maxVal === 0) maxVal = 10000; // default height scaler if zero

      var oldHeight = (oldTax / maxVal) * maxBarHeight;
      var newHeight = (newTax / maxVal) * maxBarHeight;

      // Draw Old regime bar (indigo)
      var x1 = w / 2 - barWidth - 20;
      var y1 = h - padding - oldHeight;
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.roundRect(x1, y1, barWidth, oldHeight, [8, 8, 0, 0]);
      ctx.fill();

      // Label on top of old bar
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(window.Utils.formatCurrencyShort(oldTax), x1 + barWidth / 2, y1 - 10);

      // Label below old bar
      ctx.fillStyle = document.body.getAttribute('data-theme') === 'light' ? '#0f172a' : '#f8fafc';
      ctx.fillText('Old Regime', x1 + barWidth / 2, h - padding + 20);

      // Draw New regime bar (emerald/success if recommended, or primary)
      var x2 = w / 2 + 20;
      var y2 = h - padding - newHeight;
      ctx.fillStyle = newTax <= oldTax ? '#10b981' : '#f43f5e';
      ctx.beginPath();
      ctx.roundRect(x2, y2, barWidth, newHeight, [8, 8, 0, 0]);
      ctx.fill();

      // Label on top of new bar
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(window.Utils.formatCurrencyShort(newTax), x2 + barWidth / 2, y2 - 10);

      // Label below new bar
      ctx.fillStyle = document.body.getAttribute('data-theme') === 'light' ? '#0f172a' : '#f8fafc';
      ctx.fillText('New Regime', x2 + barWidth / 2, h - padding + 20);
    },

    /**
     * Draw a Horizontal progress bar showing deduction utilization.
     * @param {string} canvasId
     * @param {number} current
     * @param {number} max
     * @param {string} label
     */
    drawHorizontalBar: function (canvasId, current, max, label) {
      var cvs = document.getElementById(canvasId);
      var ctx = this.getPrepContext(cvs);
      if (!ctx) return;

      var w = cvs.getBoundingClientRect().width;
      var h = cvs.getBoundingClientRect().height;

      // Label
      ctx.fillStyle = document.body.getAttribute('data-theme') === 'light' ? '#0f172a' : '#f8fafc';
      ctx.font = '600 13px Inter';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, 0, 0);

      // Value text
      var pct = max > 0 ? (current / max) : 0;
      var pctText = Math.min(100, Math.round(pct * 100)) + '%';
      var valText = window.Utils.formatCurrencyShort(current) + ' / ' + window.Utils.formatCurrencyShort(max);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 12px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(valText + ' (' + pctText + ')', w, 0);

      // Outer track
      var barY = 22;
      var barH = 10;
      ctx.fillStyle = '#1e293b';
      if (document.body.getAttribute('data-theme') === 'light') ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(0, barY, w, barH, 5);
      ctx.fill();

      // Inner fill
      var fillW = w * Math.min(1, pct);
      if (fillW > 0) {
        ctx.fillStyle = pct >= 1 ? '#10b981' : '#4f46e5';
        ctx.beginPath();
        ctx.roundRect(0, barY, fillW, barH, 5);
        ctx.fill();
      }
    },

    /**
     * Draw Waterfall Chart showing calculation flow.
     * @param {string} canvasId
     * @param {Array<{label: string, value: number, type: 'plus'|'minus'|'total'}>} data
     */
    drawWaterfallChart: function (canvasId, data) {
      var cvs = document.getElementById(canvasId);
      var ctx = this.getPrepContext(cvs);
      if (!ctx) return;

      var w = cvs.getBoundingClientRect().width;
      var h = cvs.getBoundingClientRect().height;

      var paddingLeft = 40;
      var paddingRight = 20;
      var paddingTop = 30;
      var paddingBottom = 40;

      var count = data.length;
      var spacing = 12;
      var barWidth = (w - paddingLeft - paddingRight - (spacing * (count - 1))) / count;
      var chartHeight = h - paddingTop - paddingBottom;

      // Find max cumulative value for scaling
      var maxVal = 0;
      var runningTotal = 0;
      for (var i = 0; i < count; i++) {
        if (data[i].type === 'plus') {
          runningTotal += data[i].value;
        } else if (data[i].type === 'minus') {
          runningTotal -= data[i].value;
        } else {
          runningTotal = data[i].value;
        }
        if (runningTotal > maxVal) maxVal = runningTotal;
      }
      if (maxVal === 0) maxVal = 1;

      runningTotal = 0;
      var lastY = h - paddingBottom;

      for (var j = 0; j < count; j++) {
        var item = data[j];
        var val = item.value;
        
        var startVal = runningTotal;
        var endVal = runningTotal;

        if (item.type === 'plus') {
          endVal += val;
          runningTotal = endVal;
        } else if (item.type === 'minus') {
          endVal -= val;
          runningTotal = endVal;
        } else {
          startVal = 0;
          endVal = val;
          runningTotal = val;
        }

        var yStart = h - paddingBottom - (startVal / maxVal) * chartHeight;
        var yEnd = h - paddingBottom - (endVal / maxVal) * chartHeight;
        
        var x = paddingLeft + j * (barWidth + spacing);
        var height = Math.abs(yStart - yEnd);
        var y = Math.min(yStart, yEnd);

        if (item.type === 'plus') {
          ctx.fillStyle = '#4f46e5'; // Purple for additions
        } else if (item.type === 'minus') {
          ctx.fillStyle = '#f43f5e'; // Rose for deductions
        } else {
          ctx.fillStyle = '#10b981'; // Green for final taxable total
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, Math.max(2, height), 3);
        ctx.fill();

        // Connecting lines
        if (j > 0) {
          ctx.beginPath();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#64748b';
          ctx.lineWidth = 1;
          ctx.moveTo(x - spacing, lastY);
          ctx.lineTo(x, lastY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        lastY = yEnd;

        // Label value on top of bar
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(window.Utils.formatCurrencyShort(val), x + barWidth / 2, y - 6);

        // X axis labels
        ctx.fillStyle = document.body.getAttribute('data-theme') === 'light' ? '#0f172a' : '#f8fafc';
        ctx.font = '500 9px Inter';
        ctx.fillText(item.label, x + barWidth / 2, h - paddingBottom + 16);
      }
    }
  };
})();
