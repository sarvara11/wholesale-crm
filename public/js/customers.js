'use strict';
const CustomersPage = (() => {
  let _state = { page:1, status:'', search:'', total:0, limit:15, users:[] };

  function render() {
    return `
      <div class="page-header">
        <h2>Customers</h2>
        <button class="btn-primary" id="add-customer-btn"><i class="fa-solid fa-plus"></i> Add Customer</button>
      </div>
      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-5">
        <div class="relative flex-1 min-w-[200px]">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input id="cust-search" type="text" placeholder="Search name, company, email…"
            class="form-input pl-9 w-full" value="${Utils.esc(_state.search)}">
        </div>
        <select id="cust-status" class="form-select w-auto">
          <option value="">All Statuses</option>
          <option value="active"   ${_state.status==='active'?'selected':''}>Active</option>
          <option value="inactive" ${_state.status==='inactive'?'selected':''}>Inactive</option>
          <option value="prospect" ${_state.status==='prospect'?'selected':''}>Prospect</option>
        </select>
      </div>
      <!-- Table card -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th>Name</th><th>Company</th><th>Email</th><th>Phone</th>
              <th>Status</th><th>Assigned To</th><th>Created</th><th></th>
            </tr></thead>
            <tbody id="cust-tbody"><tr><td colspan="8">${Utils.spinner()}</td></tr></tbody>
          </table>
        </div>
        <div id="cust-pagination" class="px-5 pb-4"></div>
      </div>`;
  }

  async function loadData() {
    const tbody = document.getElementById('cust-tbody');
    tbody.innerHTML = `<tr><td colspan="8">${Utils.spinner()}</td></tr>`;
    try {
      const qs = new URLSearchParams({ page:_state.page, limit:_state.limit });
      if (_state.status) qs.set('status', _state.status);
      if (_state.search) qs.set('search', _state.search);
      const data = await API.get('/customers?' + qs);
      _state.total = data.total;
      if (!data.customers.length) {
        tbody.innerHTML = `<tr><td colspan="8">${Utils.emptyState('No customers found', 'fa-users')}</td></tr>`;
      } else {
        const user = window.App.currentUser;
        tbody.innerHTML = data.customers.map(c => `
          <tr>
            <td class="font-medium text-gray-900 dark:text-white">${Utils.esc(c.name)}</td>
            <td>${Utils.esc(c.company||'—')}</td>
            <td class="text-indigo-600 dark:text-indigo-400">${Utils.esc(c.email||'—')}</td>
            <td>${Utils.esc(c.phone||'—')}</td>
            <td>${Utils.pill(c.status)}</td>
            <td>${Utils.esc(c.assignedTo?.name||'—')}</td>
            <td class="text-gray-400">${Utils.fmtDate(c.createdAt)}</td>
            <td>
              <div class="flex items-center gap-1 justify-end">
                <button class="btn-icon text-indigo-500" data-action="edit" data-id="${c._id}" title="Edit">
                  <i class="fa-solid fa-pen-to-square text-sm pointer-events-none"></i>
                </button>
                ${user.role==='manager'?`<button class="btn-icon text-sky-500" data-action="assign" data-id="${c._id}" title="Assign">
                  <i class="fa-solid fa-user-tag text-sm pointer-events-none"></i>
                </button>`:''}
                <button class="btn-icon text-red-500" data-action="delete" data-id="${c._id}" data-name="${Utils.esc(c.name)}" title="Delete">
                  <i class="fa-solid fa-trash text-sm pointer-events-none"></i>
                </button>
              </div>
            </td>
          </tr>`).join('');
      }
      document.getElementById('cust-pagination').innerHTML = Utils.paginationHTML(_state.page, _state.total, _state.limit);
      bindPagination('cust-pagination');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-8">${err.message}</td></tr>`;
    }
  }

  function bindPagination(id) {
    document.getElementById(id).querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => { _state.page = +btn.dataset.page; loadData(); });
    });
  }

  async function openForm(id = null) {
    let customer = {};
    if (id) {
      try { customer = await API.get('/customers/' + id); } catch {}
    }
    const users = _state.users;
    Utils.openModal(id ? 'Edit Customer' : 'Add Customer', `
      <form id="cust-form" class="space-y-1">
        ${Utils.formRow('Full Name *',    Utils.formInput('name',    customer.name,    'text', 'Jane Doe', true))}
        ${Utils.formRow('Company',        Utils.formInput('company', customer.company, 'text', 'Acme Ltd'))}
        ${Utils.formRow('Email',          Utils.formInput('email',   customer.email,   'email','jane@acme.com'))}
        ${Utils.formRow('Phone',          Utils.formInput('phone',   customer.phone,   'text', '+1 555 0000'))}
        ${Utils.formRow('Status',         Utils.formSelect('status', ['active','inactive','prospect'], customer.status||'prospect'))}
        ${window.App.currentUser.role==='manager'
          ? Utils.formRow('Assign To', Utils.formSelect('assignedTo',
              [{ value:'', label:'— Unassigned —'}, ...users.map(u => ({ value:u._id, label:u.name + ' (' + u.role + ')' }))],
              customer.assignedTo?._id||customer.assignedTo||''))
          : ''}
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save Customer</button>
        </div>
      </form>`);

    document.getElementById('cust-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd.entries());
      Object.keys(body).forEach(k => { if (!body[k]) delete body[k]; });
      try {
        if (id) await API.put('/customers/' + id, body);
        else     await API.post('/customers', body);
        Utils.closeModal();
        Utils.showToast('Customer saved', 'success');
        loadData();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  async function openAssign(id) {
    const users = _state.users;
    let customer = {};
    try { customer = await API.get('/customers/' + id); } catch {}
    Utils.openModal('Assign Customer', `
      <form id="assign-form" class="space-y-4">
        ${Utils.formRow('Assign To', Utils.formSelect('userId',
          [{ value:'', label:'— Unassigned —'}, ...users.map(u => ({ value:u._id, label:u.name + ' (' + u.role + ')' }))],
          customer.assignedTo?._id||customer.assignedTo||''))}
        <div class="flex justify-end gap-3">
          <button type="button" onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Assign</button>
        </div>
      </form>`);
    document.getElementById('assign-form').addEventListener('submit', async e => {
      e.preventDefault();
      const userId = new FormData(e.target).get('userId');
      try {
        await API.patch('/customers/' + id + '/assign', { userId });
        Utils.closeModal(); Utils.showToast('Customer assigned', 'success'); loadData();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  async function init() {
    _state.page = 1; _state.search = ''; _state.status = '';

    const tbody = document.getElementById('cust-tbody');

    try {
      // Prefetch users for assignment dropdown (manager only)
      if (window.App.currentUser.role === 'manager') {
        try { _state.users = await API.get('/users'); } catch { _state.users = []; }
      }

      loadData();

      document.getElementById('add-customer-btn').addEventListener('click', () => openForm());

      let searchTimer;
      document.getElementById('cust-search').addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => { _state.search = e.target.value; _state.page = 1; loadData(); }, 400);
      });
      document.getElementById('cust-status').addEventListener('change', e => {
        _state.status = e.target.value; _state.page = 1; loadData();
      });

      tbody.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, id, name } = btn.dataset;
        if (action === 'edit')   openForm(id);
        if (action === 'assign') openAssign(id);
        if (action === 'delete') Utils.confirmDelete(name, async () => {
          try { await API.del('/customers/' + id); Utils.showToast('Customer deleted', 'success'); loadData(); }
          catch (err) { Utils.showToast(err.message, 'error'); }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-8">
        Failed to load customers: ${Utils.esc(err.message)}
      </td></tr>`;
    }
  }

  return { render, init };
})();
