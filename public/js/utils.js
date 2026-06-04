'use strict';
const Utils = (() => {
  // ── Toast ──────────────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    const c = document.getElementById('toast-container');
    const cfg = {
      success: { bg: 'bg-emerald-500', icon: 'fa-check-circle' },
      error:   { bg: 'bg-red-500',     icon: 'fa-circle-xmark' },
      info:    { bg: 'bg-indigo-500',   icon: 'fa-circle-info' },
      warning: { bg: 'bg-amber-500',    icon: 'fa-triangle-exclamation' },
    }[type] || { bg: 'bg-indigo-500', icon: 'fa-circle-info' };

    const el = document.createElement('div');
    el.className = `toast-item pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-xl ${cfg.bg} max-w-xs`;
    el.innerHTML = `<i class="fa-solid ${cfg.icon} flex-shrink-0"></i><span>${message}</span>`;
    c.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .3s,transform .3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(1rem)';
      setTimeout(() => el.remove(), 300);
    }, 3200);
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function openModal(title, html, { wide = false } = {}) {
    const overlay = document.getElementById('modal-overlay');
    const box     = document.getElementById('modal-box');
    document.getElementById('modal-content').innerHTML = `
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">${title}</h3>
        <button onclick="Utils.closeModal()" class="btn-icon text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="px-6 py-5">${html}</div>
    `;
    box.style.maxWidth = wide ? '42rem' : '32rem';
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
  }

  // ── Formatters ─────────────────────────────────────────────────────────────
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }
  function fmtDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  }
  function fmtCurrency(n) {
    return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', minimumFractionDigits:0 }).format(n || 0);
  }
  function fmtNumber(n) {
    return new Intl.NumberFormat('en-US').format(n || 0);
  }

  // ── Status Pills ───────────────────────────────────────────────────────────
  const PILL_COLORS = {
    active:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    inactive:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    prospect:    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    new:         'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    contacted:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    qualified:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    lost:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    prospecting: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    proposal:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    negotiation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    won:         'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    call:        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    email:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    meeting:     'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    task:        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    manager:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    admin:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    website:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    referral:    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    trade_show:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    cold_call:   'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    social_media:'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    other:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  function pill(value) {
    const cls = PILL_COLORS[value] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    return `<span class="pill ${cls}">${(value||'').replace(/_/g,' ')}</span>`;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function initials(name) {
    return (name || '?').split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
  }
  function spinner() {
    return `<div class="flex items-center justify-center py-16"><div class="spinner"></div></div>`;
  }
  function emptyState(msg, icon = 'fa-inbox') {
    return `<div class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
      <i class="fa-solid ${icon} text-4xl mb-3 opacity-40"></i>
      <p class="text-sm">${msg}</p></div>`;
  }

  // ── Confirm Delete ─────────────────────────────────────────────────────────
  function confirmDelete(label, onConfirm) {
    openModal('Confirm Delete', `
      <p class="text-gray-600 dark:text-gray-400 mb-6">
        Are you sure you want to delete <strong class="text-gray-900 dark:text-white">${label}</strong>?
        This action cannot be undone.
      </p>
      <div class="flex justify-end gap-3">
        <button onclick="Utils.closeModal()" class="btn-secondary">Cancel</button>
        <button id="confirm-del-btn" class="btn-danger">Delete</button>
      </div>
    `);
    document.getElementById('confirm-del-btn').onclick = () => { closeModal(); onConfirm(); };
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  function paginationHTML(page, total, limit) {
    const pages = Math.ceil(total / limit) || 1;
    if (pages <= 1) return '';
    return `
      <div class="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
        <span>Showing ${Math.min((page-1)*limit+1,total)}–${Math.min(page*limit,total)} of ${fmtNumber(total)}</span>
        <div class="flex gap-2">
          <button class="btn-secondary py-1 px-3" ${page<=1?'disabled':''} data-page="${page-1}">
            <i class="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <span class="px-3 py-1 rounded-lg bg-indigo-600 text-white font-medium">${page}</span>
          <button class="btn-secondary py-1 px-3" ${page>=pages?'disabled':''} data-page="${page+1}">
            <i class="fa-solid fa-chevron-right text-xs"></i>
          </button>
        </div>
      </div>`;
  }

  // ── Form helpers ───────────────────────────────────────────────────────────
  function formRow(label, inputHtml) {
    return `<div class="mb-4"><label class="form-label">${label}</label>${inputHtml}</div>`;
  }
  function formInput(name, value = '', type = 'text', placeholder = '', required = false) {
    return `<input name="${name}" type="${type}" value="${esc(value)}" placeholder="${placeholder}"
      class="form-input" ${required ? 'required' : ''}>`;
  }
  function formSelect(name, options, value = '') {
    const opts = options.map(o => {
      const v = typeof o === 'object' ? o.value : o;
      const l = typeof o === 'object' ? o.label : o;
      return `<option value="${v}" ${v === value ? 'selected' : ''}>${l}</option>`;
    }).join('');
    return `<select name="${name}" class="form-select">${opts}</select>`;
  }
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return {
    showToast, openModal, closeModal,
    fmtDate, fmtDateTime, fmtCurrency, fmtNumber,
    pill, initials, spinner, emptyState, confirmDelete,
    paginationHTML, formRow, formInput, formSelect, esc,
  };
})();
