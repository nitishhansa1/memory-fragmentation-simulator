/**
 * MemoryMap — Renders the segmented memory bar visualization.
 *
 * Color coding:
 *   Allocated → process color (blue/purple family)
 *   Free      → dark grey
 *   Internal fragmentation sliver → red accent
 */

export default class MemoryMap {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Render blocks into the memory map.
   * @param {import('../engine/MemoryEngine').Block[]} blocks
   * @param {number} totalSize
   */
  render(blocks, totalSize) {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'memory-map';

    blocks.forEach((block) => {
      const pct = (block.size / totalSize) * 100;

      const el = document.createElement('div');
      el.className = 'memory-block' + (block.allocated ? ' allocated' : ' free');
      el.style.width = `${pct}%`;

      if (block.allocated && block.color) {
        el.style.setProperty('--block-color', block.color);
      }

      // Label
      const label = document.createElement('span');
      label.className = 'block-label';
      if (block.allocated) {
        label.textContent = `${block.processName} (${block.processSize}KB)`;
      } else {
        label.textContent = `Free (${block.size}KB)`;
      }
      el.appendChild(label);

      // Internal fragmentation indicator
      if (block.allocated && block.processSize !== null && block.size > block.processSize) {
        const fragPct = ((block.size - block.processSize) / block.size) * 100;
        const fragBar = document.createElement('div');
        fragBar.className = 'internal-frag-bar';
        fragBar.style.width = `${fragPct}%`;
        fragBar.title = `Internal frag: ${block.size - block.processSize} KB`;
        el.appendChild(fragBar);
      }

      // Tooltip
      el.title = block.allocated
        ? `${block.processName}\nBlock: ${block.size} KB\nProcess: ${block.processSize} KB\nInternal Frag: ${block.size - block.processSize} KB`
        : `Free Block\n${block.size} KB`;

      wrapper.appendChild(el);
    });

    this.container.appendChild(wrapper);
  }
}
