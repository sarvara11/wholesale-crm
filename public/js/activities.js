'use strict';
const ActivitiesPage = (() => {
  let _state = { page:1, type:'', completed:'', limit:15, total:0, customers:[] };

  const ACT_ICONS = { call:'fa-phone', email:'fa-envelope', meeting:'fa-video', task:'fa-list-check' };

  function render() {
    return `
      <div class="page-header">
        <h2>Activities</h2>
        <button class="btn-primary" id="add-act-btn"><i class="fa-solid fa-plus"></i> Add Activity</button>
      </div>
      <div class="flex flex-wrap gap-3 mb-5">
        <select id="act-type" class="form-select w-auto">
          <option value="">All Types</option>
          ${['call','email','meeting','task'].map(t => `<option value="${t}" ${_state.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <select id="act-completed" class="form-select w-auto">
          <option value="">All</option>
          <option value="false" ${_state.completed==='false'?'selected':''}>Pending</option>
          <option value="true"  ${_state.completed==='true'?'selected':''}>Completed</option>
        </select>
      </div>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Type</th><th>Note</th><th>Related To</th><th>Due Date</th><th>Status</th><th>Owner</th><th></th></tr></thead>
            <tbody id="acts-tbody"><tr><td colspan="7">${Utils.spinner()}</td></tr></tbody>
          </table>
        </div>
        <div id="acts-pagination" class="px-5 pb-4"></div>
      </div>`;
  }

  async function loadData() {
    const tbody = document.getElementById('acts-tbody');
    tbody.innerHTML = `<tr><td colspan="7">${Utils.spinner()}</td></tr>`;
    try {
      const qs = new URLSearchParams({ page:_state.page, limit:_state.limit });
      if (_state.type)      qs.set('type',      _state.type);
      if (_state.completed) qs.set('completed', _state.completed);
      const data = await API.get('/activities?' + qs);
      _state.total = data.total;
      if (!data.activities.length) {
        tbody.innerHTML = `<tr><td colspan="7">${Utils.emptyState('No activities found','fa-calendar-check')}</td></tr>`;
      } else {
        tbody.innerHTML = data.activities.map(a => {
          const relName = a.relatedTo?.name || a.relatedTo?.title || '—';
          const overdue = !a.completed && a.dueDate && new Date(a.dueDate) < new Date();
          return `<tr>
            <td>
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <i class="fa-solid ${ACT_ICONS[a.type]||'fa-circle'} text-xs text-indigo-600 dark:text-indigo-400"></i>
                </div>
                ${Utils.pill(a.type)}
              </div>
            </td>
            <td class="max-w-xs truncate">${Utils.esc(a.note||'—')}</td>
            <td>${Utils.esc(relName)}</td>
            <td class="${overdue?'text-red-500 font-medium':''}">${Utils.fmtDate(a.dueDate)}</td>
            <td>${a.completed
              ? '<span class="pill bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Done</span>'
              : '<span class="pill bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</span>'}</td>
            <td>${Utils.esc(a.owner?.name||'—')}</td>
            <td>
              <div class="flex items-center gap-1 justify-end">
                ${!a.completed ? `<button class="btn-icon text-emerald-500" data-action="complete" data-id="${a._id}" title="Mark done">
                  <i class="fa-solid fa-check text-sm pointer-events-none"></i></button>` : ''}
                <button class="btn-icon text-indigo-500" data-action="edit" data-id="${a._id}" title="Edit">
                  <i class="fa-solid fa-pen-to-square text-sm pointer-events-none"></i>
                </button>
                <button class="btn-icon text-red-500" data-action="delete" data-id="${a._id}" data-name="${Utils.esc(a.type)}" title="Delete">
                  <i class="fa-solid fa-trash text-sm pointer-events-none"></i>
                </button>
              </div>
            </td>
          </tr>`;
        }).join('');
      }
      document.getElementById('acts-pagination').innerHTML = Utils.paginationHTML(_state.page, _state.total, _state.limit);
      document.getElementById('acts-pagination').querySelectorAll('[data-page]').forEach(b =>
        b.addEventListener('click', () => { _state.page = +b.dataset.page; loadData(); }));
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-8">${err.message}</td></tr>`;
    }
  }

  async function openForm(id = null) {
    let act = {};
    if (id) { try { act = await API.get('/activities/' + id); } catch {} }
    const custOpts = [{ value:'', label:'— None —'}, ..._state.customers.map(c => ({ value:c._id, label:c.name }))];
    const dueDateVal = act.dueDate ? new Date(act.dueDate).toISOString().slice(0,16) : '';
    Utils.openModal(id ? 'Edit Activity' : 'Add Activity', `
      <form id="act-form" class="space-y-1">
        ${Utils.formRow('Type *',    Utils.formSelect('type', ['call','email','meeting','task'], act.type||'task'))}
        ${Utils.formRow('Note',      `<textarea name="note" rows="3" class="form-input" placeholder="Details…">${Utils.esc(act.note||'')}</textarea>`)}
        ${Utils.formRow('Related To',Utils.formSelect('relatedTo', custOpts, act.relatedTo?._id||act.relatedTo||''))}
        ${Utils.formRow('Due Date',  `<input name="dueDate" type="datetime-local" class="form-input" value="${dueDateVal}">`) }
        ${id ? Utils.formRow('Completed', `<label class="flex items-center gap-2 cursor-pointer">
          <input name="completed" type="checkbox" ${act.completed?'checked':''} class="w-4 h-4 rounded text-indigo-600">
          <span class="text-sm text-gray-600 dark:text-gray-400">Mark as completed</span></label>`) : ''}
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save</button>
        </div>
      </form>`);

    document.getElementById('act-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd   = new FormData(e.target);
      const body = { type: fd.get('type'), note: fd.get('note'), dueDate: fd.get('dueDate')||null };
      const rel  = fd.get('relatedTo');
      if (rel) { body.relatedTo = rel; body.relatedModel = 'Customer'; }
      if (id) body.completed = fd.get('completed') === 'on';
      try {
        if (id) await API.put('/activities/' + id, body);
        else     await API.post('/activities', body);
        Utils.closeModal(); Utils.showToast('Activity saved'); loadData();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  async function init() {
    _state.page = 1;
    try { const d = await API.get('/customers?limit=100'); _state.customers = d.customers||[]; } catch { _state.customers = []; }
    loadData();

    document.getElementById('add-act-btn').addEventListener('click', () => openForm());
    document.getElementById('act-type').addEventListener('change', e => { _state.type = e.target.value; _state.page = 1; loadData(); });
    document.getElementById('act-completed').addEventListener('change', e => { _state.completed = e.target.value; _state.page = 1; loadData(); });

    document.getElementById('acts-tbody').addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, name } = btn.dataset;
      if (action === 'edit')     openForm(id);
      if (action === 'complete') {
        try { await API.patch('/activities/' + id + '/complete', {}); Utils.showToast('Marked as done'); loadData(); }
        catch (err) { Utils.showToast(err.message, 'error'); }
      }
      if (action === 'delete')   Utils.confirmDelete(name, async () => {
        try { await API.del('/activities/' + id); Utils.showToast('Activity deleted'); loadData(); }
        catch (err) { Utils.showToast(err.message, 'error'); }
      });
    });
  }

  return { render, init };
})();
