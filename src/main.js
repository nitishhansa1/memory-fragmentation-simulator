/**
 * main.js — Application entry point.
 * Wires the Memory Engine, UI Controls, Stats Panel, Memory Map, and Charts together.
 */

import './style.css';
import MemoryEngine  from './engine/MemoryEngine.js';
import AutoSimulator from './engine/AutoSimulator.js';
import MemoryMap     from './viz/MemoryMap.js';
import Charts        from './viz/Charts.js';
import Controls      from './ui/Controls.js';
import StatsPanel    from './ui/StatsPanel.js';

/* ─── State ─── */
let engine = new MemoryEngine(1024);
let simulator = null;
let stepCounter = 0;

/* ─── DOM ─── */
const memoryMapContainer = document.getElementById('memoryMap');
const statsContainer     = document.getElementById('stats');
const controlsContainer  = document.getElementById('controls');

/* ─── Modules ─── */
const memoryMap  = new MemoryMap(memoryMapContainer);
const statsPanel = new StatsPanel(statsContainer);
const charts     = new Charts({
  fragCtx:    document.getElementById('fragChart').getContext('2d'),
  utilCtx:    document.getElementById('utilChart').getContext('2d'),
  compareCtx: document.getElementById('compareChart').getContext('2d'),
});

/* ─── Refresh UI ─── */
function refresh(operation) {
  const stats = engine.getStats();
  memoryMap.render(engine.blocks, engine.totalSize);
  statsPanel.update(stats);
  if (operation) statsPanel.logOperation(operation);

  stepCounter++;
  charts.pushData(stepCounter, stats);

  controls.updateProcessList(engine.processes);

  // Update address label
  const endLabel = document.getElementById('memEndAddr');
  if (endLabel) endLabel.textContent = engine.totalSize + ' KB';
}

/* ─── Controls setup ─── */
const controls = new Controls(controlsContainer, {
  onAllocate(size, strategy) {
    const res = engine.allocate(size, strategy);
    if (!res.success) return controls.showError(res.error);
    refresh(`Allocated ${size} KB [${strategy}]`);
  },

  onDeallocate(processId) {
    const info = engine.processes.get(processId);
    const res  = engine.deallocate(processId);
    if (!res.success) return controls.showError(res.error);
    refresh(`Deallocated ${info ? info.name : 'process'}`);
  },

  onReset(memorySize) {
    if (simulator && simulator.running) simulator.stop();
    controls.stopAuto();
    engine.reset(memorySize);
    stepCounter = 0;
    charts.resetCharts();
    refresh('Reset memory (' + memorySize + ' KB)');
  },

  onAutoRun(strategy) {
    if (simulator && simulator.running) simulator.stop();

    simulator = new AutoSimulator(engine, {
      strategy,
      minSize: Math.max(10, Math.floor(engine.totalSize * 0.02)),
      maxSize: Math.max(50, Math.floor(engine.totalSize * 0.2)),
      steps: 30,
      deallocProb: 0.35,
      onStep: () => refresh('Auto step'),
    });

    simulator.start(500);

    // Auto-stop callback
    const checkDone = setInterval(() => {
      if (!simulator.running) {
        clearInterval(checkDone);
        controls.stopAuto();
      }
    }, 600);
  },

  onAutoStop() {
    if (simulator) simulator.stop();
  },

  onStep() {
    if (!simulator) {
      const strategy = controls.getStrategy();
      simulator = new AutoSimulator(engine, {
        strategy,
        minSize: Math.max(10, Math.floor(engine.totalSize * 0.02)),
        maxSize: Math.max(50, Math.floor(engine.totalSize * 0.2)),
        steps: 999,
        deallocProb: 0.35,
        onStep: () => {},
      });
    }
    simulator.step();
    refresh('Manual step');
  },

  onCompare() {
    // Run identical workload on all 3 strategies and compare results
    const strategies = ['first-fit', 'best-fit', 'worst-fit'];
    const results = {};

    // Generate a deterministic-ish workload
    const workload = [];
    const totalMem = engine.totalSize;
    const rng = seedRandom(42);
    for (let i = 0; i < 20; i++) {
      workload.push({
        action: rng() < 0.3 && i > 3 ? 'dealloc' : 'alloc',
        size: Math.floor(rng() * totalMem * 0.18) + 10,
      });
    }

    for (const strat of strategies) {
      const tmpEngine = new MemoryEngine(totalMem);
      const allocatedIds = [];

      for (const op of workload) {
        if (op.action === 'alloc') {
          const res = tmpEngine.allocate(op.size, strat);
          if (res.success) allocatedIds.push(res.processId);
        } else if (allocatedIds.length > 0) {
          const idx = Math.floor(rng() * allocatedIds.length);
          tmpEngine.deallocate(allocatedIds.splice(idx, 1)[0]);
        }
      }

      results[strat] = tmpEngine.getStats();
    }

    charts.updateComparison(results);
    refresh('Algorithm comparison completed');
  },
});

/* Simple seeded RNG for reproducible comparisons */
function seedRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

/* ─── Initial render ─── */
refresh('Memory initialised (1024 KB)');
