'use strict';
const InventoryPage = (() => {
  let _state = { page:1, search:'', category:'', limit:15, total:0 };

  function render() {
    return `
      <div class="page-header">
        <h2>Inventory</h2>
        <button class="btn-primary" id="add-inv-btn"><i class="fa-solid fa-plus"></i> Add Item</button>
      </div>
      <div class="flex flex-wrap gap-3 mb-5">
        <div class="relative flex-1 min-w-[200px]">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input id="inv-search" type="text" placeholder="Search SKU or product name…" class="form-input pl-9 w-full">
        </div>
        <select id="inv-category" class="form-select w-auto">
          <option value="">All Categories</option>
          ${['T-Shirts','Jackets','Trousers','Dresses','Outerwear','Accessories'].map(c =>
            `<option value="${c}" ${_state.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <!-- Summary cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5" id="inv-summary">
        ${[1,2,3,4].map(() => `<div class="card p-4 animate-pulse"><div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3"></div><div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div></div>`).join('')}
      </div>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>SKU</th><th>Product Name</th><th>Category</th><th>Quantity</th><th>Price</th><th>Total Value</th><th></th></tr></thead>
            <tbody id="inv-tbody">${Utils.spinner()}</tbody>
          </table>
        </div>
        <div id="inv-pagination" class="px-5 pb-4"></div>
      </div>`;
  }

  async function loadData() {
    const tbody = document.getElementById('inv-tbody');
    tbody.innerHTML = `<tr><td colspan="7">${Utils.spinner()}</td></tr>`;
    try {
      const qs = new URLSearchParams({ page:_state.page, limit:_state.limit });
      if (_state.search)   qs.set('search',   _state.search);
      if (_state.category) qs.set('category', _state.category);
      const data = await API.get('/inventory?' + qs);
      _state.total = data.total;

      // Summary stats
      const totalItems = data.total;
      const totalQty   = data.items.reduce((s, i) => s + i.quantity, 0);
      const totalVal   = data.items.reduce((s, i) => s + i.quantity * i.price, 0);
      const lowStock   = data.items.filter(i => i.quantity < 50).length;
      document.getElementById('inv-summary').innerHTML = [
        ['fa-box',            'indigo',  'Total SKUs',    totalItems],
        ['fa-layer-group',    'purple',  'Total Units',   Utils.fmtNumber(totalQty)],
        ['fa-dollar-sign',    'emerald', 'Stock Value',   Utils.fmtCurrency(totalVal)],
        ['fa-triangle-exclamation','amber','Low Stock',   lowStock],
      ].map(([icon, color, label, val]) => {
        const C = { indigo:['bg-indigo-50 dark:bg-indigo-900/20','text-indigo-600 dark:text-indigo-400'],
          purple:['bg-purple-50 dark:bg-purple-900/20','text-purple-600 dark:text-purple-400'],
          emerald:['bg-emerald-50 dark:bg-emerald-900/20','text-emerald-600 dark:text-emerald-400'],
          amber:['bg-amber-50 dark:bg-amber-900/20','text-amber-600 dark:text-amber-400'] }[color];
        return `<div class="card p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl ${C[0]} flex items-center justify-center flex-shrink-0">
            <i class="fa-solid ${icon} ${C[1]}"></i>
          </div>
          <div><p class="text-lg font-bold text-gray-900 dark:text-white">${val}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">${label}</p></div></div>`;
      }).join('');

      if (!data.items.length) {
        tbody.innerHTML = `<tr><td colspan="7">${Utils.emptyState('No items found','fa-box')}</td></tr>`;
      } else {
        tbody.innerHTML = data.items.map(i => {
          const low = i.quantity < 50;
          return `<tr>
            <td class="font-mono text-sm text-indigo-600 dark:text-indigo-400">${Utils.esc(i.sku)}</td>
            <td class="font-medium text-gray-900 dark:text-white">${Utils.esc(i.productName)}</td>
            <td>${Utils.pill(i.category?.toLowerCase().replace(/[^a-z]/g,'_') || 'other')} <span class="text-xs text-gray-500">${Utils.esc(i.category||'')}</span></td>
            <td class="${low?'text-amber-600 font-semibold':''}">
              ${Utils.fmtNumber(i.quantity)} ${low?'<span class="pill bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 ml-1">Low</span>':''}
            </td>
            <td>${Utils.fmtCurrency(i.price)}</td>
            <td class="font-medium text-emerald-600 dark:text-emerald-400">${Utils.fmtCurrency(i.quantity * i.price)}</td>
            <td>
              <div class="flex items-center gap-1 justify-end">
                <button class="btn-icon text-indigo-500" data-action="edit" data-id="${i._id}" title="Edit">
                  <i class="fa-solid fa-pen-to-square text-sm pointer-events-none"></i>
                </button>
                <button class="btn-icon text-red-500" data-action="delete" data-id="${i._id}" data-name="${Utils.esc(i.productName)}" title="Delete">
                  <i class="fa-solid fa-trash text-sm pointer-events-none"></i>
                </button>
              </div>
            </td>
          </tr>`;
        }).join('');
      }
      document.getElementById('inv-pagination').innerHTML = Utils.paginationHTML(_state.page, _state.total, _state.limit);
      document.getElementById('inv-pagination').querySelectorAll('[data-page]').forEach(b =>
        b.addEventListener('click', () => { _state.page = +b.dataset.page; loadData(); }));
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">${err.message}</td></tr>`;
    }
  }

  async function openForm(id = null) {
    let item = {};
    if (id) { try { item = await API.get('/inventory/' + id); } catch {} }
    Utils.openModal(id ? 'Edit Item' : 'Add Inventory Item', `
      <form id="inv-form" class="space-y-1">
        ${Utils.formRow('SKU *',          Utils.formInput('sku',         item.sku,         'text',   'TS-001', true))}
        ${Utils.formRow('Product Name *', Utils.formInput('productName', item.productName, 'text',   'Classic White T-Shirt', true))}
        ${Utils.formRow('Category',       Utils.formSelect('category', ['T-Shirts','Jackets','Trousers','Dresses','Outerwear','Accessories'], item.category||''))}
        ${Utils.formRow('Quantity *',     Utils.formInput('quantity',    item.quantity,    'number', '0', true))}
        ${Utils.formRow('Price ($) *',    Utils.formInput('price',       item.price,       'number', '0.00', true))}
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save Item</button>
        </div>
      </form>`);

    document.getElementById('inv-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = { sku: fd.get('sku'), productName: fd.get('productName'), category: fd.get('category'), quantity: +fd.get('quantity'), price: +fd.get('price') };
      try {
        if (id) await API.put('/inventory/' + id, body);
        else     await API.post('/inventory', body);
        Utils.closeModal(); Utils.showToast('Item saved'); loadData();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  async function init() {
    _state.page = 1; _state.search = ''; loadData();

    document.getElementById('add-inv-btn').addEventListener('click', () => openForm());

    let timer;
    document.getElementById('inv-search').addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => { _state.search = e.target.value; _state.page = 1; loadData(); }, 400);
    });
    document.getElementById('inv-category').addEventListener('change', e => {
      _state.category = e.target.value; _state.page = 1; loadData();
    });

    document.getElementById('inv-tbody').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, name } = btn.dataset;
      if (action === 'edit')   openForm(id);
      if (action === 'delete') Utils.confirmDelete(name, async () => {
        try { await API.del('/inventory/' + id); Utils.showToast('Item deleted'); loadData(); }
        catch (err) { Utils.showToast(err.message, 'error'); }
      });
    });
  }

  return { render, init };
})();
