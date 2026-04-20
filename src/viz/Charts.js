/**
 * Charts — Chart.js wrapper for fragmentation and utilization graphs.
 */

import {
  Chart,
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(
  LineController, BarController, LineElement, BarElement,
  PointElement, LinearScale, CategoryScale, Filler, Tooltip, Legend,
);

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 350 },
  plugins: {
    legend: { labels: { color: '#52525b', font: { family: "'Inter', sans-serif", size: 11 } } },
    tooltip: { backgroundColor: '#18181b', titleColor: '#ffffff', bodyColor: '#e4e4e7', cornerRadius: 6 },
  },
  scales: {
    x: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: '#f4f4f5' } },
    y: { ticks: { color: '#71717a', font: { size: 10 } }, grid: { color: '#f4f4f5' }, beginAtZero: true },
  },
};

export default class Charts {
  constructor({ fragCtx, utilCtx, compareCtx }) {
    this.fragChart = this._createLine(fragCtx, 'Fragmentation Over Time', [
      { label: 'Internal Frag (KB)', borderColor: '#f87171', backgroundColor: '#f8717122', key: 'internalFrag' },
      { label: 'External Frag (KB)', borderColor: '#facc15', backgroundColor: '#facc1522', key: 'externalFrag' },
    ]);

    this.utilChart = this._createLine(utilCtx, 'Memory Utilization Over Time', [
      { label: 'Utilization %', borderColor: '#34d399', backgroundColor: '#34d39922', key: 'utilization' },
    ]);

    this.compareChart = this._createBar(compareCtx);
  }

  /**
   * Push a data point from stats.
   * @param {number} step
   * @param {object} stats - from MemoryEngine.getStats()
   */
  pushData(step, stats) {
    const label = `${step}`;

    // Fragmentation chart
    this.fragChart.data.labels.push(label);
    this.fragChart.data.datasets[0].data.push(stats.internalFrag);
    this.fragChart.data.datasets[1].data.push(stats.externalFrag);
    this._trimChart(this.fragChart, 30);
    this.fragChart.update();

    // Utilization chart
    this.utilChart.data.labels.push(label);
    this.utilChart.data.datasets[0].data.push(stats.utilization);
    this._trimChart(this.utilChart, 30);
    this.utilChart.update();
  }

  /**
   * Update algorithm comparison bar chart.
   * @param {Object<string, object>} results - { 'first-fit': stats, 'best-fit': stats, ... }
   */
  updateComparison(results) {
    const strategies = Object.keys(results);
    this.compareChart.data.labels = strategies.map(s => s.replace('-', ' ').toUpperCase());
    this.compareChart.data.datasets[0].data = strategies.map(s => results[s].externalFrag);
    this.compareChart.data.datasets[1].data = strategies.map(s => results[s].internalFrag);
    this.compareChart.data.datasets[2].data = strategies.map(s => results[s].utilization);
    this.compareChart.update();
  }

  resetCharts() {
    [this.fragChart, this.utilChart].forEach(c => {
      c.data.labels = [];
      c.data.datasets.forEach(ds => (ds.data = []));
      c.update();
    });
  }

  /* ─── Private helpers ─── */

  _createLine(ctx, title, datasets) {
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: datasets.map(d => ({
          label: d.label,
          data: [],
          borderColor: d.borderColor,
          backgroundColor: d.backgroundColor,
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: d.borderColor,
        })),
      },
      options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, title: { display: false } } },
    });
  }

  _createBar(ctx) {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          { label: 'External Frag (KB)', backgroundColor: '#facc15aa', borderColor: '#facc15', borderWidth: 1, data: [] },
          { label: 'Internal Frag (KB)', backgroundColor: '#f87171aa', borderColor: '#f87171', borderWidth: 1, data: [] },
          { label: 'Utilization %', backgroundColor: '#34d399aa', borderColor: '#34d399', borderWidth: 1, data: [] },
        ],
      },
      options: CHART_DEFAULTS,
    });
  }

  _trimChart(chart, maxPoints) {
    if (chart.data.labels.length > maxPoints) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }
  }
}
