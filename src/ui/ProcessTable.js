/**
 * ProcessTable — Renders a detailed tabular view of all memory blocks.
 */

export default class ProcessTable {
  /** @param {HTMLElement} container */
  constructor(container) {
    this.container = container;
    this._renderShell();
  }

  _renderShell() {
    this.container.innerHTML = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Block ID</th>
              <th>Status</th>
              <th>Process</th>
              <th>Block Size</th>
              <th>Process Size</th>
              <th>Internal Frag</th>
            </tr>
          </thead>
          <tbody id="processTableBody">
            <tr><td colspan="6" class="text-center text-muted">No memory blocks</td></tr>
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Update the table with current memory blocks.
   * @param {import('../engine/MemoryEngine').Block[]} blocks
   */
  update(blocks) {
    const tbody = this.container.querySelector('#processTableBody');
    tbody.innerHTML = '';

    if (blocks.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Memory empty</td></tr>';
      return;
    }

    blocks.forEach((b) => {
      const tr = document.createElement('tr');
      if (b.allocated) tr.classList.add('row-allocated');
      
      const statusBadge = `<span class="badge ${b.allocated ? 'badge-blue' : 'badge-grey'}">${b.allocated ? 'Allocated' : 'Free'}</span>`;
      
      const processName = b.allocated ? `<strong>${b.processName}</strong>` : '<span class="text-muted">—</span>';
      const processSize = b.allocated ? `${b.processSize} KB` : '<span class="text-muted">—</span>';
      
      const intFrag = b.allocated && b.size > b.processSize 
        ? `<span class="text-red">${b.size - b.processSize} KB</span>` 
        : '<span class="text-muted">0 KB</span>';

      // Inline style to show process color as a small dot if allocated
      const colorDot = b.allocated && b.color 
        ? `<span class="color-dot" style="background-color: ${b.color};"></span>` 
        : '';

      tr.innerHTML = `
        <td class="font-mono">#${b.id}</td>
        <td>${statusBadge}</td>
        <td>${colorDot} ${processName}</td>
        <td>${b.size} KB</td>
        <td>${processSize}</td>
        <td>${intFrag}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}
