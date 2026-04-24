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
import ProcessTable  from './ui/ProcessTable.js';

/* ─── State ─── */
let engine = new MemoryEngine(1024);
let simulator = null;
let stepCounter = 0;

/* ─── DOM ─── */
const memoryMapContainer  = document.getElementById('memoryMap');
const statsContainer      = document.getElementById('stats');
const controlsContainer   = document.getElementById('controls');
const processTableContainer = document.getElementById('processTable');

/* ─── Modules ─── */
const memoryMap  = new MemoryMap(memoryMapContainer);
const statsPanel = new StatsPanel(statsContainer);
const processTable = new ProcessTable(processTableContainer);
const charts     = new Charts({
  fragCtx:    document.getElementById('fragChart').getContext('2d'),
  utilCtx:    document.getElementById('utilChart').getContext('2d'),
  compareCtx: document.getElementById('compareChart').getContext('2d'),
});

/* ─── Theme Management ─── */
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  body.classList.add('dark');
}

themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark');
  const currentTheme = body.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('theme', currentTheme);
  
  // Optional: Update charts to match theme if needed
  // Charts.js uses colors that work in both or we can refresh them
});

/* ─── Refresh UI ─── */
function refresh(operation) {
  const stats = engine.getStats();
  memoryMap.render(engine.blocks, engine.totalSize);
  statsPanel.update(stats);
  processTable.update(engine.blocks);
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
    // Use the engine's last history entry for richer detail (includes block selection info)
    const lastOp = engine.history.length > 0
      ? engine.history[engine.history.length - 1].operation
      : `Allocated ${size} KB [${strategy}]`;
    refresh(lastOp);
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

    // Generate a deterministic workload with its own RNG
    const totalMem = engine.totalSize;
    const workloadRng = seedRandom(42);
    const workload = [];
    for (let i = 0; i < 20; i++) {
      workload.push({
        action: workloadRng() < 0.3 && i > 3 ? 'dealloc' : 'alloc',
        size: Math.floor(workloadRng() * totalMem * 0.18) + 10,
        // Pre-generate the deallocation index so each strategy
        // uses the same random choices
        deallocRand: workloadRng(),
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
          const idx = Math.floor(op.deallocRand * allocatedIds.length);
          tmpEngine.deallocate(allocatedIds.splice(idx, 1)[0]);
        }
      }

      results[strat] = tmpEngine.getStats();
    }

    charts.updateComparison(results);
    refresh('Algorithm comparison completed');
  },

  onCompact() {
    const res = engine.compact();
    refresh(`Memory compacted — ${res.movedCount} block(s) relocated`);
  },

  onExport() {
    const blocks = engine.blocks;
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Block ID,Status,Process,Block Size (KB),Process Size (KB),Internal Frag (KB)\n";
    
    blocks.forEach((block, index) => {
      const internalFrag = (block.allocated && block.processSize !== null)
        ? block.size - block.processSize
        : 0;
      const row = [
        index + 1,
        block.allocated ? "Allocated" : "Free",
        block.processName || "—",
        block.size,
        block.allocated ? (block.processSize || block.size) : "—",
        internalFrag
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `memory_report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    refresh('Memory report exported');
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
