'use strict';
const OpportunitiesPage = (() => {
  let _state = { page:1, stage:'', limit:15, total:0, customers:[] };

  function render() {
    const stages = ['','prospecting','proposal','negotiation','won','lost'];
    return `
      <div class="page-header">
        <h2>Opportunities</h2>
        <button class="btn-primary" id="add-opp-btn"><i class="fa-solid fa-plus"></i> Add Opportunity</button>
      </div>
      <div class="flex gap-3 mb-5 flex-wrap">
        ${stages.map(s =>
          `<button class="btn-secondary py-1.5 px-4 text-xs opp-filter ${_state.stage===s?'!bg-indigo-600 !text-white !border-indigo-600':''}" data-stage="${s}">
            ${s||'All'}
          </button>`).join('')}
      </div>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Title</th><th>Customer</th><th>Stage</th><th>Amount</th><th>Owner</th><th>Created</th><th></th></tr></thead>
            <tbody id="opp-tbody"><tr><td colspan="7">${Utils.spinner()}</td></tr></tbody>
          </table>
        </div>
        <div id="opp-pagination" class="px-5 pb-4"></div>
      </div>`;
  }

  async function loadData() {
    const tbody = document.getElementById('opp-tbody');
    tbody.innerHTML = `<tr><td colspan="7">${Utils.spinner()}</td></tr>`;
    try {
      const qs = new URLSearchParams({ page:_state.page, limit:_state.limit });
      if (_state.stage) qs.set('stage', _state.stage);
      const data = await API.get('/opportunities?' + qs);
      _state.total = data.total;
      if (!data.opportunities.length) {
        tbody.innerHTML = `<tr><td colspan="7">${Utils.emptyState('No opportunities found','fa-handshake')}</td></tr>`;
      } else {
        tbody.innerHTML = data.opportunities.map(o => `
          <tr>
            <td class="font-medium text-gray-900 dark:text-white">${Utils.esc(o.title)}</td>
            <td>${Utils.esc(o.customer?.name||'—')}</td>
            <td>${Utils.pill(o.stage)}</td>
            <td class="font-semibold text-indigo-600 dark:text-indigo-400">${Utils.fmtCurrency(o.amount)}</td>
            <td>${Utils.esc(o.owner?.name||'—')}</td>
            <td class="text-gray-400">${Utils.fmtDate(o.createdAt)}</td>
            <td>
              <div class="flex items-center gap-1 justify-end">
                <button class="btn-icon text-indigo-500" data-action="edit" data-id="${o._id}" title="Edit">
                  <i class="fa-solid fa-pen-to-square text-sm pointer-events-none"></i>
                </button>
                <button class="btn-icon text-red-500" data-action="delete" data-id="${o._id}" data-name="${Utils.esc(o.title)}" title="Delete">
                  <i class="fa-solid fa-trash text-sm pointer-events-none"></i>
                </button>
              </div>
            </td>
          </tr>`).join('');
      }
      document.getElementById('opp-pagination').innerHTML = Utils.paginationHTML(_state.page, _state.total, _state.limit);
      document.getElementById('opp-pagination').querySelectorAll('[data-page]').forEach(b =>
        b.addEventListener('click', () => { _state.page = +b.dataset.page; loadData(); }));
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">${err.message}</td></tr>`;
    }
  }

  async function openForm(id = null) {
    let opp = {};
    if (id) { try { opp = await API.get('/opportunities/' + id); } catch {} }
    const custOpts = [{ value:'', label:'— Select Customer —' }, ..._state.customers.map(c => ({ value:c._id, label:c.name + (c.company ? ' · ' + c.company : '') }))];
    Utils.openModal(id ? 'Edit Opportunity' : 'Add Opportunity', `
      <form id="opp-form" class="space-y-1">
        ${Utils.formRow('Title *',   Utils.formInput('title',  opp.title,  'text', 'Summer Collection Deal', true))}
        ${Utils.formRow('Customer *',Utils.formSelect('customer', custOpts, opp.customer?._id||opp.customer||''))}
        ${Utils.formRow('Stage',     Utils.formSelect('stage', ['prospecting','proposal','negotiation','won','lost'], opp.stage||'prospecting'))}
        ${Utils.formRow('Amount ($)',Utils.formInput('amount', opp.amount||'', 'number', '10000'))}
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save</button>
        </div>
      </form>`);

    document.getElementById('opp-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = { title: fd.get('title'), customer: fd.get('customer'), stage: fd.get('stage'), amount: +fd.get('amount') };
      if (!body.customer) { Utils.showToast('Please select a customer', 'warning'); return; }
      try {
        if (id) await API.put('/opportunities/' + id, body);
        else     await API.post('/opportunities', body);
        Utils.closeModal(); Utils.showToast('Opportunity saved'); loadData();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  async function init() {
    _state.page = 1;
    try { const d = await API.get('/customers?limit=100'); _state.customers = d.customers||[]; } catch { _state.customers = []; }
    loadData();

    document.getElementById('add-opp-btn').addEventListener('click', () => openForm());

    document.querySelectorAll('.opp-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        _state.stage = btn.dataset.stage; _state.page = 1;
        document.querySelectorAll('.opp-filter').forEach(b => {
          b.classList.toggle('!bg-indigo-600',    b.dataset.stage === _state.stage);
          b.classList.toggle('!text-white',        b.dataset.stage === _state.stage);
          b.classList.toggle('!border-indigo-600', b.dataset.stage === _state.stage);
        });
        loadData();
      });
    });

    document.getElementById('opp-tbody').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, name } = btn.dataset;
      if (action === 'edit')   openForm(id);
      if (action === 'delete') Utils.confirmDelete(name, async () => {
        try { await API.del('/opportunities/' + id); Utils.showToast('Opportunity deleted'); loadData(); }
        catch (err) { Utils.showToast(err.message, 'error'); }
      });
    });
  }

  return { render, init };
})();
