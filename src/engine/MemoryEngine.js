/**
 * MemoryEngine — Core simulation engine for memory allocation & fragmentation analysis.
 *
 * Memory is represented as an ordered array of Block objects.
 * Supports First Fit, Best Fit, and Worst Fit allocation strategies.
 */

let _nextBlockId = 1;
let _nextProcessColor = 0;

const PROCESS_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#3b82f6', '#0ea5e9',
  '#14b8a6', '#10b981', '#22c55e', '#eab308', '#f59e0b',
  '#f97316', '#ef4444', '#ec4899', '#d946ef', '#06b6d4',
];

function pickColor() {
  const c = PROCESS_COLORS[_nextProcessColor % PROCESS_COLORS.length];
  _nextProcessColor++;
  return c;
}

/**
 * @typedef {Object} Block
 * @property {number} id
 * @property {number} size        - Block size in KB
 * @property {boolean} allocated
 * @property {string|null} processId
 * @property {string|null} processName
 * @property {number|null} processSize - Actual process size (may be < block size → internal frag)
 * @property {string|null} color
 */

/**
 * @typedef {Object} Snapshot
 * @property {Block[]} blocks
 * @property {object} stats
 * @property {string} operation
 * @property {number} timestamp
 */

export default class MemoryEngine {
  /** @param {number} totalSize - Total memory in KB */
  constructor(totalSize = 1024) {
    this.totalSize = totalSize;
    /** @type {Block[]} */
    this.blocks = [];
    /** @type {Snapshot[]} */
    this.history = [];
    /** @type {Map<string, {name:string, size:number, color:string}>} */
    this.processes = new Map();
    this._processCounter = 0;
    this._init();
  }

  /* ─── Initialisation ─── */

  _init() {
    _nextBlockId = 1;
    _nextProcessColor = 0;
    this.blocks = [this._freeBlock(this.totalSize)];
    this._snapshot('Initialised memory (' + this.totalSize + ' KB)');
  }

  reset(newSize) {
    if (newSize && newSize > 0) this.totalSize = newSize;
    this.processes.clear();
    this._processCounter = 0;
    this._init();
    this.history = [];
    this._snapshot('Reset memory (' + this.totalSize + ' KB)');
  }

  /* ─── Allocation ─── */

  /**
   * Allocate a process.
   * @param {number} size - Process size in KB
   * @param {'first-fit'|'best-fit'|'worst-fit'} strategy
   * @returns {{success:boolean, processId?:string, error?:string}}
   */
  allocate(size, strategy = 'first-fit') {
    if (size <= 0) return { success: false, error: 'Size must be > 0' };

    const idx = this._findBlock(size, strategy);
    if (idx === -1) return { success: false, error: 'No suitable free block found (external fragmentation)' };

    const block = this.blocks[idx];
    const processId = this._genProcessId();
    const processName = 'P' + this._processCounter;
    const color = pickColor();

    if (block.size === size) {
      // Perfect fit
      block.allocated = true;
      block.processId = processId;
      block.processName = processName;
      block.processSize = size;
      block.color = color;
    } else {
      // Split: allocated part + remaining free part
      const allocatedBlock = {
        id: _nextBlockId++,
        size: size,
        allocated: true,
        processId,
        processName,
        processSize: size,
        color,
      };
      const remaining = this._freeBlock(block.size - size);
      this.blocks.splice(idx, 1, allocatedBlock, remaining);
    }

    this.processes.set(processId, { name: processName, size, color });
    this._snapshot(`Allocated ${processName} (${size} KB) [${strategy}]`);
    return { success: true, processId };
  }

  /* ─── Deallocation ─── */

  /**
   * Deallocate a process by its ID.
   * @param {string} processId
   * @returns {{success:boolean, error?:string}}
   */
  deallocate(processId) {
    const idx = this.blocks.findIndex(b => b.processId === processId);
    if (idx === -1) return { success: false, error: 'Process not found' };

    const block = this.blocks[idx];
    const name = block.processName;
    block.allocated = false;
    block.processId = null;
    block.processName = null;
    block.processSize = null;
    block.color = null;

    this._mergeAdjacentFree();
    this.processes.delete(processId);
    this._snapshot(`Deallocated ${name}`);
    return { success: true };
  }

  /* ─── Strategy helpers ─── */

  _findBlock(size, strategy) {
    let bestIdx = -1;
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      if (b.allocated || b.size < size) continue;
      if (bestIdx === -1) {
        bestIdx = i;
        if (strategy === 'first-fit') return bestIdx;
      } else {
        const bestSize = this.blocks[bestIdx].size;
        if (strategy === 'best-fit' && b.size < bestSize) bestIdx = i;
        if (strategy === 'worst-fit' && b.size > bestSize) bestIdx = i;
      }
    }
    return bestIdx;
  }

  /* ─── Merge adjacent free blocks ─── */

  _mergeAdjacentFree() {
    let i = 0;
    while (i < this.blocks.length - 1) {
      if (!this.blocks[i].allocated && !this.blocks[i + 1].allocated) {
        this.blocks[i].size += this.blocks[i + 1].size;
        this.blocks.splice(i + 1, 1);
      } else {
        i++;
      }
    }
  }

  /* ─── Statistics ─── */

  getStats() {
    let totalFree = 0;
    let largestFree = 0;
    let totalAllocated = 0;
    let internalFrag = 0;
    let freeBlocks = 0;
    let allocatedBlocks = 0;

    for (const b of this.blocks) {
      if (b.allocated) {
        allocatedBlocks++;
        totalAllocated += b.size;
        if (b.processSize !== null) {
          internalFrag += b.size - b.processSize;
        }
      } else {
        freeBlocks++;
        totalFree += b.size;
        if (b.size > largestFree) largestFree = b.size;
      }
    }

    const externalFrag = totalFree - largestFree;
    const utilization = this.totalSize > 0 ? (totalAllocated / this.totalSize) * 100 : 0;

    return {
      totalMemory: this.totalSize,
      totalAllocated,
      totalFree,
      largestFree,
      internalFrag,
      externalFrag,
      utilization: Math.round(utilization * 100) / 100,
      allocatedBlocks,
      freeBlocks,
      totalBlocks: this.blocks.length,
    };
  }

  /* ─── Snapshot / History ─── */

  _snapshot(operation) {
    this.history.push({
      blocks: JSON.parse(JSON.stringify(this.blocks)),
      stats: this.getStats(),
      operation,
      timestamp: Date.now(),
    });
  }

  /* ─── Helpers ─── */

  _freeBlock(size) {
    return {
      id: _nextBlockId++,
      size,
      allocated: false,
      processId: null,
      processName: null,
      processSize: null,
      color: null,
    };
  }

  _genProcessId() {
    this._processCounter++;
    return 'proc_' + this._processCounter + '_' + Date.now();
  }
}
