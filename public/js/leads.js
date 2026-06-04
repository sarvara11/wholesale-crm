'use strict';
const LeadsPage = (() => {
  let _state = { page:1, status:'', limit:15, total:0 };

  function render() {
    return `
      <div class="page-header">
        <h2>Leads</h2>
        <button class="btn-primary" id="add-lead-btn"><i class="fa-solid fa-plus"></i> Add Lead</button>
      </div>
      <div class="flex gap-3 mb-5 flex-wrap">
        ${['','new','contacted','qualified','lost'].map(s =>
          `<button class="btn-secondary py-1.5 px-4 text-xs lead-filter ${_state.status===s?'!bg-indigo-600 !text-white !border-indigo-600':''}" data-status="${s}">
            ${s||'All'}
          </button>`).join('')}
      </div>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Source</th><th>Status</th><th>Value</th><th>Owner</th><th>Created</th><th></th></tr></thead>
            <tbody id="leads-tbody">${Utils.spinner()}</tbody>
          </table>
        </div>
        <div id="leads-pagination" class="px-5 pb-4"></div>
      </div>`;
  }

  async function loadData() {
    const tbody = document.getElementById('leads-tbody');
    tbody.innerHTML = `<tr><td colspan="7">${Utils.spinner()}</td></tr>`;
    try {
      const qs = new URLSearchParams({ page:_state.page, limit:_state.limit });
      if (_state.status) qs.set('status', _state.status);
      const data = await API.get('/leads?' + qs);
      _state.total = data.total;
      if (!data.leads.length) {
        tbody.innerHTML = `<tr><td colspan="7">${Utils.emptyState('No leads found','fa-bullseye')}</td></tr>`;
      } else {
        tbody.innerHTML = data.leads.map(l => `
          <tr>
            <td class="font-medium text-gray-900 dark:text-white">${Utils.esc(l.name)}</td>
            <td>${Utils.pill(l.source)}</td>
            <td>${Utils.pill(l.status)}</td>
            <td class="font-semibold text-indigo-600 dark:text-indigo-400">${Utils.fmtCurrency(l.value)}</td>
            <td>${Utils.esc(l.owner?.name||'—')}</td>
            <td class="text-gray-400">${Utils.fmtDate(l.createdAt)}</td>
            <td>
              <div class="flex items-center gap-1 justify-end">
                <button class="btn-icon text-indigo-500" data-action="edit" data-id="${l._id}" title="Edit">
                  <i class="fa-solid fa-pen-to-square text-sm pointer-events-none"></i>
                </button>
                <button class="btn-icon text-red-500" data-action="delete" data-id="${l._id}" data-name="${Utils.esc(l.name)}" title="Delete">
                  <i class="fa-solid fa-trash text-sm pointer-events-none"></i>
                </button>
              </div>
            </td>
          </tr>`).join('');
      }
      document.getElementById('leads-pagination').innerHTML = Utils.paginationHTML(_state.page, _state.total, _state.limit);
      document.getElementById('leads-pagination').querySelectorAll('[data-page]').forEach(b =>
        b.addEventListener('click', () => { _state.page = +b.dataset.page; loadData(); }));
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">${err.message}</td></tr>`;
    }
  }

  async function openForm(id = null) {
    let lead = {};
    if (id) { try { lead = await API.get('/leads/' + id); } catch {} }
    Utils.openModal(id ? 'Edit Lead' : 'Add Lead', `
      <form id="lead-form" class="space-y-1">
        ${Utils.formRow('Lead Name *',    Utils.formInput('name',  lead.name,  'text', 'Company / Person', true))}
        ${Utils.formRow('Source',         Utils.formSelect('source', ['website','referral','trade_show','cold_call','social_media','other'], lead.source||'other'))}
        ${Utils.formRow('Status',         Utils.formSelect('status', ['new','contacted','qualified','lost'], lead.status||'new'))}
        ${Utils.formRow('Estimated Value',Utils.formInput('value', lead.value||'', 'number', '5000'))}
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save Lead</button>
        </div>
      </form>`);

    document.getElementById('lead-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = { name: fd.get('name'), source: fd.get('source'), status: fd.get('status'), value: +fd.get('value') };
      try {
        if (id) await API.put('/leads/' + id, body);
        else     await API.post('/leads', body);
        Utils.closeModal(); Utils.showToast('Lead saved'); loadData();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  async function init() {
    _state.page = 1; loadData();

    document.getElementById('add-lead-btn').addEventListener('click', () => openForm());

    document.querySelectorAll('.lead-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        _state.status = btn.dataset.status; _state.page = 1;
        document.querySelectorAll('.lead-filter').forEach(b => {
          b.classList.toggle('!bg-indigo-600', b.dataset.status === _state.status);
          b.classList.toggle('!text-white',     b.dataset.status === _state.status);
          b.classList.toggle('!border-indigo-600', b.dataset.status === _state.status);
        });
        loadData();
      });
    });

    document.getElementById('leads-tbody').addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, name } = btn.dataset;
      if (action === 'edit')   openForm(id);
      if (action === 'delete') Utils.confirmDelete(name, async () => {
        try { await API.del('/leads/' + id); Utils.showToast('Lead deleted'); loadData(); }
        catch (err) { Utils.showToast(err.message, 'error'); }
      });
    });
  }

  return { render, init };
})();
