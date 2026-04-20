/**
 * Controls — Renders and manages the control panel UI.
 */

export default class Controls {
  /**
   * @param {HTMLElement} container
   * @param {object} callbacks
   * @param {function} callbacks.onAllocate   - (size, strategy) => void
   * @param {function} callbacks.onDeallocate - (processId) => void
   * @param {function} callbacks.onReset      - (memorySize) => void
   * @param {function} callbacks.onAutoRun    - (strategy) => void
   * @param {function} callbacks.onAutoStop   - () => void
   * @param {function} callbacks.onStep       - () => void
   * @param {function} callbacks.onCompare    - () => void
   */
  constructor(container, callbacks) {
    this.container = container;
    this.cb = callbacks;
    this._render();
    this._bind();
  }

  _render() {
    this.container.innerHTML = `
      <div class="control-group">
        <h3><span class="icon">⚙️</span> Memory Setup</h3>
        <label for="memSize">Total Memory (KB)</label>
        <input type="number" id="memSize" value="1024" min="64" max="65536" />
        <button id="btnReset" class="btn btn-secondary">
          <span class="btn-icon">🔄</span> Initialize / Reset
        </button>
      </div>

      <div class="control-group">
        <h3><span class="icon">📦</span> Allocate Process</h3>
        <label for="procSize">Process Size (KB)</label>
        <input type="number" id="procSize" value="128" min="1" max="65536" />
        <label for="strategy">Allocation Strategy</label>
        <select id="strategy">
          <option value="first-fit">First Fit</option>
          <option value="best-fit">Best Fit</option>
          <option value="worst-fit">Worst Fit</option>
        </select>
        <button id="btnAllocate" class="btn btn-primary">
          <span class="btn-icon">➕</span> Allocate
        </button>
      </div>

      <div class="control-group">
        <h3><span class="icon">🗑️</span> Deallocate Process</h3>
        <label for="processList">Select Process</label>
        <select id="processList">
          <option value="">— No processes —</option>
        </select>
        <button id="btnDealloc" class="btn btn-danger">
          <span class="btn-icon">➖</span> Deallocate
        </button>
      </div>

      <div class="control-group">
        <h3><span class="icon">🤖</span> Auto Simulation</h3>
        <button id="btnAutoRun" class="btn btn-accent">
          <span class="btn-icon">▶️</span> Auto Run
        </button>
        <button id="btnStep" class="btn btn-secondary">
          <span class="btn-icon">⏭️</span> Step
        </button>
        <button id="btnCompare" class="btn btn-secondary">
          <span class="btn-icon">📊</span> Compare Algorithms
        </button>
      </div>

      <div id="errorMsg" class="error-msg hidden"></div>
    `;
  }

  _bind() {
    const $ = id => this.container.querySelector('#' + id);

    $('btnReset').addEventListener('click', () => {
      const size = parseInt($('memSize').value, 10);
      if (!size || size < 1) return this.showError('Invalid memory size');
      this.cb.onReset(size);
    });

    $('btnAllocate').addEventListener('click', () => {
      const size = parseInt($('procSize').value, 10);
      const strategy = $('strategy').value;
      if (!size || size < 1) return this.showError('Invalid process size');
      this.cb.onAllocate(size, strategy);
    });

    $('btnDealloc').addEventListener('click', () => {
      const pid = $('processList').value;
      if (!pid) return this.showError('No process selected');
      this.cb.onDeallocate(pid);
    });

    this._autoRunning = false;
    $('btnAutoRun').addEventListener('click', () => {
      if (this._autoRunning) {
        this.cb.onAutoStop();
        this._setAutoBtn(false);
      } else {
        const strategy = $('strategy').value;
        this.cb.onAutoRun(strategy);
        this._setAutoBtn(true);
      }
    });

    $('btnStep').addEventListener('click', () => {
      this.cb.onStep();
    });

    $('btnCompare').addEventListener('click', () => {
      this.cb.onCompare();
    });
  }

  _setAutoBtn(running) {
    this._autoRunning = running;
    const btn = this.container.querySelector('#btnAutoRun');
    btn.innerHTML = running
      ? '<span class="btn-icon">⏹️</span> Stop'
      : '<span class="btn-icon">▶️</span> Auto Run';
    btn.classList.toggle('btn-stop', running);
  }

  /** Stop auto visually (called from outside when sim finishes). */
  stopAuto() {
    this._setAutoBtn(false);
  }

  /**
   * Update the process list dropdown.
   * @param {Map<string, {name:string, size:number, color:string}>} processes
   */
  updateProcessList(processes) {
    const sel = this.container.querySelector('#processList');
    sel.innerHTML = '';
    if (processes.size === 0) {
      sel.innerHTML = '<option value="">— No processes —</option>';
      return;
    }
    processes.forEach((info, pid) => {
      const opt = document.createElement('option');
      opt.value = pid;
      opt.textContent = `${info.name} (${info.size} KB)`;
      sel.appendChild(opt);
    });
  }

  getStrategy() {
    return this.container.querySelector('#strategy').value;
  }

  showError(msg) {
    const el = this.container.querySelector('#errorMsg');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3000);
  }
}
