'use strict';
const AuditPage = (() => {
  let _state = { page:1, limit:20, total:0, entity:'', userId:'' };

  const ACTION_COLORS = {
    CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    LOGIN:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    ASSIGN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    COMPLETE:'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };

  function render() {
    return `
      <div class="page-header">
        <h2>Audit Logs</h2>
        <span class="text-sm text-gray-400">Manager-only read-only view</span>
      </div>
      <div class="flex flex-wrap gap-3 mb-5">
        <select id="audit-entity" class="form-select w-auto">
          <option value="">All Entities</option>
          ${['User','Customer','Lead','Opportunity','Activity','InventoryItem'].map(e =>
            `<option value="${e}" ${_state.entity===e?'selected':''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
            <tbody id="audit-tbody">${Utils.spinner()}</tbody>
          </table>
        </div>
        <div id="audit-pagination" class="px-5 pb-4"></div>
      </div>`;
  }

  async function loadData() {
    const tbody = document.getElementById('audit-tbody');
    tbody.innerHTML = `<tr><td colspan="6">${Utils.spinner()}</td></tr>`;
    try {
      const qs = new URLSearchParams({ page:_state.page, limit:_state.limit });
      if (_state.entity) qs.set('entity', _state.entity);
      const data = await API.get('/audit-logs?' + qs);
      _state.total = data.total;
      if (!data.logs.length) {
        tbody.innerHTML = `<tr><td colspan="6">${Utils.emptyState('No logs found','fa-clipboard-list')}</td></tr>`;
      } else {
        tbody.innerHTML = data.logs.map(l => {
          const actionCls = ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
          const shortId   = String(l.entityId||'').slice(-8) || '—';
          return `<tr>
            <td class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${Utils.fmtDateTime(l.timestamp)}</td>
            <td>
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  ${Utils.initials(l.user?.name||'?')}
                </div>
                <span class="text-sm font-medium text-gray-900 dark:text-white">${Utils.esc(l.user?.name||'Unknown')}</span>
              </div>
            </td>
            <td>${Utils.pill(l.user?.role||'')}</td>
            <td><span class="pill ${actionCls}">${l.action}</span></td>
            <td class="text-sm text-gray-600 dark:text-gray-400">${Utils.esc(l.entity)}</td>
            <td class="font-mono text-xs text-gray-400">…${shortId}</td>
          </tr>`;
        }).join('');
      }
      document.getElementById('audit-pagination').innerHTML = Utils.paginationHTML(_state.page, _state.total, _state.limit);
      document.getElementById('audit-pagination').querySelectorAll('[data-page]').forEach(b =>
        b.addEventListener('click', () => { _state.page = +b.dataset.page; loadData(); }));
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-8">${err.message}</td></tr>`;
    }
  }

  async function init() {
    _state.page = 1; loadData();
    document.getElementById('audit-entity').addEventListener('change', e => {
      _state.entity = e.target.value; _state.page = 1; loadData();
    });
  }

  return { render, init };
})();
