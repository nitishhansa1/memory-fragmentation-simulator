/**
 * AutoSimulator — Generates random processes and runs step-by-step simulation.
 */

export default class AutoSimulator {
  /**
   * @param {import('./MemoryEngine').default} engine
   * @param {object}  opts
   * @param {string}  opts.strategy
   * @param {number}  opts.minSize
   * @param {number}  opts.maxSize
   * @param {number}  opts.steps
   * @param {number}  opts.deallocProb - Probability (0-1) of deallocating instead of allocating
   * @param {function} opts.onStep     - Callback after each step
   */
  constructor(engine, opts = {}) {
    this.engine = engine;
    this.strategy = opts.strategy || 'first-fit';
    this.minSize = opts.minSize || 20;
    this.maxSize = opts.maxSize || 200;
    this.steps = opts.steps || 20;
    this.deallocProb = opts.deallocProb || 0.3;
    this.onStep = opts.onStep || (() => {});
    this._running = false;
    this._timer = null;
    this._currentStep = 0;
  }

  /** Run the full simulation with a delay between steps. */
  start(intervalMs = 600) {
    if (this._running) return;
    this._running = true;
    this._currentStep = 0;
    this._timer = setInterval(() => {
      if (this._currentStep >= this.steps || !this._running) {
        this.stop();
        return;
      }
      this._tick();
      this._currentStep++;
    }, intervalMs);
  }

  stop() {
    this._running = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  get running() {
    return this._running;
  }

  /** Execute a single step. */
  step() {
    this._tick();
    this._currentStep++;
  }

  _tick() {
    const processes = Array.from(this.engine.processes.keys());
    const shouldDealloc = processes.length > 0 && Math.random() < this.deallocProb;

    if (shouldDealloc) {
      const pid = processes[Math.floor(Math.random() * processes.length)];
      this.engine.deallocate(pid);
    } else {
      const size = this._randInt(this.minSize, this.maxSize);
      this.engine.allocate(size, this.strategy);
    }

    this.onStep(this._currentStep, this.engine);
  }

  _randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
