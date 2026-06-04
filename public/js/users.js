'use strict';
const UsersPage = (() => {
  function render() {
    return `
      <div class="page-header">
        <h2>User Management</h2>
        <button class="btn-primary" id="add-user-btn"><i class="fa-solid fa-user-plus"></i> Add User</button>
      </div>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th></th></tr></thead>
            <tbody id="users-tbody">${Utils.spinner()}</tbody>
          </table>
        </div>
      </div>`;
  }

  async function loadData() {
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = `<tr><td colspan="5">${Utils.spinner()}</td></tr>`;
    try {
      const users = await API.get('/users');
      if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="5">${Utils.emptyState('No users found','fa-users')}</td></tr>`;
      } else {
        tbody.innerHTML = users.map(u => {
          const isMe = u._id === window.App.currentUser._id;
          return `<tr>
            <td>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  ${Utils.initials(u.name)}
                </div>
                <span class="font-medium text-gray-900 dark:text-white">${Utils.esc(u.name)}</span>
                ${isMe ? '<span class="pill bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs ml-1">You</span>' : ''}
              </div>
            </td>
            <td class="text-indigo-600 dark:text-indigo-400">${Utils.esc(u.email)}</td>
            <td>${Utils.pill(u.role)}</td>
            <td class="text-gray-400">${Utils.fmtDate(u.createdAt)}</td>
            <td>
              <div class="flex items-center gap-1 justify-end">
                <button class="btn-icon text-indigo-500" data-action="edit" data-id="${u._id}" title="Edit">
                  <i class="fa-solid fa-pen-to-square text-sm pointer-events-none"></i>
                </button>
                ${!isMe ? `<button class="btn-icon text-red-500" data-action="delete" data-id="${u._id}" data-name="${Utils.esc(u.name)}" title="Delete">
                  <i class="fa-solid fa-trash text-sm pointer-events-none"></i>
                </button>` : ''}
              </div>
            </td>
          </tr>`;
        }).join('');
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-8">${err.message}</td></tr>`;
    }
  }

  function openForm(id = null, existing = {}) {
    Utils.openModal(id ? 'Edit User' : 'Add User', `
      <form id="user-form" class="space-y-1">
        ${Utils.formRow('Full Name *', Utils.formInput('name',  existing.name,  'text',  'Jane Doe', true))}
        ${Utils.formRow('Email *',     Utils.formInput('email', existing.email, 'email', 'jane@company.com', true))}
        ${Utils.formRow('Role',        Utils.formSelect('role', [
          { value:'admin',   label:'Admin — Operational access' },
          { value:'manager', label:'Manager — Full platform access' },
        ], existing.role || 'admin'))}
        ${Utils.formRow(id ? 'New Password (leave blank to keep)' : 'Password *',
          Utils.formInput('password', '', 'password', '••••••••', !id))}
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save User</button>
        </div>
      </form>`);

    document.getElementById('user-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd   = new FormData(e.target);
      const body = { name: fd.get('name'), email: fd.get('email'), role: fd.get('role') };
      if (fd.get('password')) body.password = fd.get('password');
      try {
        if (id) await API.put('/users/' + id, body);
        else     await API.post('/users', body);
        Utils.closeModal(); Utils.showToast('User saved'); loadData();
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  }

  async function init() {
    loadData();
    document.getElementById('add-user-btn').addEventListener('click', () => openForm());

    document.getElementById('users-tbody').addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id, name } = btn.dataset;
      if (action === 'edit') {
        try { const u = await API.get('/users/' + id); openForm(id, u); }
        catch (err) { Utils.showToast(err.message, 'error'); }
      }
      if (action === 'delete') Utils.confirmDelete(name, async () => {
        try { await API.del('/users/' + id); Utils.showToast('User deleted'); loadData(); }
        catch (err) { Utils.showToast(err.message, 'error'); }
      });
    });
  }

  return { render, init };
})();
