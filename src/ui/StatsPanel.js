/**
 * StatsPanel — Displays real-time memory statistics and operation history.
 */

export default class StatsPanel {
  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container;
    this._render();
  }

  _render() {
    this.container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Total Memory</div>
          <div class="stat-value" id="statTotal">0 KB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Allocated</div>
          <div class="stat-value highlight-blue" id="statAlloc">0 KB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Free</div>
          <div class="stat-value highlight-green" id="statFree">0 KB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Utilization</div>
          <div class="stat-value highlight-cyan" id="statUtil">0%</div>
          <div class="stat-bar"><div class="stat-bar-fill" id="utilBar"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Internal Fragmentation</div>
          <div class="stat-value highlight-red" id="statIntFrag">0 KB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">External Fragmentation</div>
          <div class="stat-value highlight-yellow" id="statExtFrag">0 KB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Largest Free Block</div>
          <div class="stat-value" id="statLargestFree">0 KB</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Blocks (Alloc / Free)</div>
          <div class="stat-value" id="statBlocks">0 / 0</div>
        </div>
      </div>

      <div class="history-section">
        <h3><span class="icon">📜</span> Operation History</h3>
        <div class="history-log" id="historyLog"></div>
      </div>
    `;
  }

  /**
   * Update displayed statistics.
   * @param {object} stats - from MemoryEngine.getStats()
   */
  update(stats) {
    const $ = id => this.container.querySelector('#' + id);

    $('statTotal').textContent = stats.totalMemory + ' KB';
    $('statAlloc').textContent = stats.totalAllocated + ' KB';
    $('statFree').textContent = stats.totalFree + ' KB';
    $('statUtil').textContent = stats.utilization + '%';
    $('statIntFrag').textContent = stats.internalFrag + ' KB';
    $('statExtFrag').textContent = stats.externalFrag + ' KB';
    $('statLargestFree').textContent = stats.largestFree + ' KB';
    $('statBlocks').textContent = stats.allocatedBlocks + ' / ' + stats.freeBlocks;

    const bar = $('utilBar');
    bar.style.width = stats.utilization + '%';
    // Color the bar based on utilization
    if (stats.utilization > 80) bar.style.background = 'var(--red)';
    else if (stats.utilization > 50) bar.style.background = 'var(--yellow)';
    else bar.style.background = 'var(--green)';
  }

  /**
   * Append an entry to the operation history.
   * @param {string} operation
   */
  logOperation(operation) {
    const log = this.container.querySelector('#historyLog');
    const entry = document.createElement('div');
    entry.className = 'history-entry';
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="history-time">${time}</span> ${operation}`;
    log.prepend(entry);

    // Keep max 50 entries
    while (log.children.length > 50) log.removeChild(log.lastChild);
  }
}
