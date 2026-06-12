'use strict';
const App = (() => {
  let currentUser = null;

  // ── Routes ─────────────────────────────────────────────────────────────────
  const NAV_MAIN = [
    { path:'/dashboard',     label:'Dashboard',     icon:'fa-gauge',          roles:['manager','admin'], page: DashboardPage     },
    { path:'/customers',     label:'Customers',     icon:'fa-users',          roles:['manager','admin'], page: CustomersPage     },
    { path:'/leads',         label:'Leads',         icon:'fa-bullseye',       roles:['manager','admin'], page: LeadsPage         },
    { path:'/opportunities', label:'Opportunities', icon:'fa-handshake',      roles:['manager','admin'], page: OpportunitiesPage },
    { path:'/activities',    label:'Activities',    icon:'fa-calendar-check', roles:['manager','admin'], page: ActivitiesPage    },
    { path:'/inventory',     label:'Inventory',     icon:'fa-boxes-stacked',  roles:['manager','admin'], page: InventoryPage     },
    { path:'/reports',       label:'Reports',       icon:'fa-chart-bar',      roles:['manager','admin'], page: ReportsPage       },
    { path:'/profile',       label:'Profile',       icon:'fa-circle-user',    roles:['manager','admin'], page: ProfilePage       },
  ];
  const NAV_ADMIN = [
    { path:'/users',      label:'User Management', icon:'fa-user-gear',      roles:['manager'], page: UsersPage  },
    { path:'/audit-logs', label:'Audit Logs',      icon:'fa-clipboard-list', roles:['manager'], page: AuditPage  },
  ];
  const NAV = [...NAV_MAIN, ...NAV_ADMIN];

  function getRoute(hash) {
    const path = hash.replace(/^#/, '') || '/dashboard';
    return NAV.find(r => r.path === path) || NAV.find(r => r.path === '/dashboard');
  }

  // ── Theme ──────────────────────────────────────────────────────────────────
  function applyTheme(dark) {
    document.documentElement.classList.toggle('dark', dark);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = dark ? 'fa-solid fa-sun text-sm' : 'fa-solid fa-moon text-sm';
    localStorage.setItem('crm_theme', dark ? 'dark' : 'light');
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  function navItem(r, current) {
    return `<a href="#${r.path}" class="nav-link ${r.path === current ? 'active' : ''}" data-path="${r.path}">
      <span class="nav-icon"><i class="fa-solid ${r.icon}"></i></span>
      ${r.label}
    </a>`;
  }

  function renderSidebar(user) {
    const current = getRoute(window.location.hash).path;

    document.getElementById('sidebar-nav').innerHTML =
      NAV_MAIN.filter(r => r.roles.includes(user.role)).map(r => navItem(r, current)).join('');

    const adminSec = document.getElementById('sidebar-manager-section');
    if (user.role === 'manager') {
      adminSec.classList.remove('hidden');
      document.getElementById('sidebar-nav-admin').innerHTML =
        NAV_ADMIN.map(r => navItem(r, current)).join('');
    }

    document.getElementById('sidebar-user').innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:8px">
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;flex-shrink:0">
          ${Utils.initials(user.name)}
        </div>
        <div style="min-width:0">
          <p style="color:#fff;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.esc(user.name)}</p>
          <p style="color:rgba(165,180,252,.65);font-size:11px;text-transform:capitalize">${user.role}</p>
        </div>
      </div>
      <button id="sidebar-logout" class="nav-link w-full" style="color:rgba(252,165,165,.8)">
        <span class="nav-icon"><i class="fa-solid fa-right-from-bracket"></i></span>
        Sign out
      </button>`;

    document.getElementById('sidebar-logout').addEventListener('click', logout);
  }

  function updateSidebarActive(path) {
    document.querySelectorAll('.nav-link[data-path]').forEach(a => {
      a.classList.toggle('active', a.dataset.path === path);
    });
  }

  // ── Navigate ───────────────────────────────────────────────────────────────
  async function navigate(hash) {
    if (typeof DashboardPage !== 'undefined') DashboardPage.destroyCharts?.();
    if (typeof ReportsPage   !== 'undefined') ReportsPage.destroyCharts?.();

    const route = getRoute(hash);
    if (!route.roles.includes(currentUser.role)) {
      window.location.hash = '#/dashboard';
      return;
    }

    document.getElementById('page-title').textContent = route.label;
    updateSidebarActive(route.path);

    const content = document.getElementById('page-content');
    content.innerHTML = typeof route.page.render === 'function'
      ? route.page.render(currentUser)
      : Utils.spinner();

    if (typeof route.page.init === 'function') {
      await route.page.init(currentUser);
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  async function logout() {
    try { await API.post('/auth/logout', {}); } catch {}
    window.location.replace('/login.html');
  }

  // ── User dropdown ──────────────────────────────────────────────────────────
  function initUserMenu(user) {
    // Fill dropdown header
    const ddName  = document.getElementById('dd-name');
    const ddEmail = document.getElementById('dd-email');
    if (ddName)  ddName.textContent  = user.name;
    if (ddEmail) ddEmail.textContent = user.email;

    const btn      = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    btn.addEventListener('click', e => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('dd-profile').addEventListener('click', () => dropdown.classList.add('hidden'));
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  async function boot() {
    const saved = localStorage.getItem('crm_theme');
    applyTheme(saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches));

    document.getElementById('theme-toggle').addEventListener('click', () => {
      applyTheme(!document.documentElement.classList.contains('dark'));
    });

    let user;
    try {
      const res = await API.get('/auth/me');
      if (!res) return;
      user = res.user;
    } catch {
      window.location.replace('/login.html');
      return;
    }

    currentUser = user;

    document.getElementById('user-avatar').textContent       = Utils.initials(user.name);
    document.getElementById('user-display-name').textContent = user.name;
    document.getElementById('user-display-role').textContent = user.role;

    renderSidebar(user);
    initUserMenu(user);

    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) Utils.closeModal();
    });

    const onHashChange = () => navigate(window.location.hash.replace('#', '') || '/dashboard');
    window.addEventListener('hashchange', onHashChange);
    onHashChange();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return {
    get currentUser() { return currentUser; },
    logout,
  };
})();

// const does not create a window property — expose explicitly so other scripts
// (customers.js, leads.js, etc.) can access window.App.currentUser
window.App = App;
