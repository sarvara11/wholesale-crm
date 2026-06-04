'use strict';
const DashboardPage = (() => {
  let _charts = [];

  function destroyCharts() { _charts.forEach(c => c.destroy()); _charts = []; }

  const chartOpts = (overrides = {}) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid:{ color:'rgba(156,163,175,.08)' }, ticks:{ color:'#9ca3af', font:{size:11} } },
      y: { grid:{ color:'rgba(156,163,175,.08)' }, ticks:{ color:'#9ca3af', font:{size:11} }, beginAtZero:true },
    },
    ...overrides,
  });

  function kpiCard(label, value, icon, colorKey, href = '#') {
    const C = {
      indigo:  ['bg-indigo-50 dark:bg-indigo-900/20',  'text-indigo-600 dark:text-indigo-400'],
      purple:  ['bg-purple-50 dark:bg-purple-900/20',  'text-purple-600 dark:text-purple-400'],
      emerald: ['bg-emerald-50 dark:bg-emerald-900/20','text-emerald-600 dark:text-emerald-400'],
      amber:   ['bg-amber-50 dark:bg-amber-900/20',    'text-amber-600 dark:text-amber-400'],
    }[colorKey] || ['bg-indigo-50 dark:bg-indigo-900/20','text-indigo-600 dark:text-indigo-400'];
    return `
      <a href="${href}" class="card kpi-card hover:shadow-md transition-shadow cursor-pointer block no-underline">
        <div class="w-12 h-12 rounded-xl ${C[0]} flex items-center justify-center flex-shrink-0">
          <i class="fa-solid ${icon} text-lg ${C[1]}"></i>
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">${value}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">${label}</p>
        </div>
      </a>`;
  }

  function skeleton() {
    return `<div class="card p-6 animate-pulse space-y-3">
      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
    </div>`;
  }

  // ── Manager dashboard ──────────────────────────────────────────────────────
  function renderManager() {
    return `
      <div class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5" id="mgr-kpi">
          ${skeleton()}${skeleton()}${skeleton()}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Customer Growth (6 months)</p>
            <div class="chart-wrap" style="height:200px"><canvas id="chart-growth"></canvas></div>
          </div>
          <div class="card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Employee Performance (Won Revenue)</p>
            <div class="chart-wrap" style="height:200px"><canvas id="chart-perf"></canvas></div>
          </div>
        </div>
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Revenue Trend (6 months)</p>
          <div class="chart-wrap" style="height:180px"><canvas id="chart-rev"></canvas></div>
        </div>
      </div>`;
  }

  async function initManager() {
    try {
      const [dash, rev] = await Promise.all([
        API.get('/reports/manager-dashboard'),
        API.get('/reports/revenue-trend'),
      ]);

      document.getElementById('mgr-kpi').innerHTML =
        kpiCard('Total Customers', Utils.fmtNumber(dash.kpi.totalCustomers), 'fa-users',       'indigo',  '#/customers')  +
        kpiCard('Total Leads',     Utils.fmtNumber(dash.kpi.totalLeads),     'fa-bullseye',    'purple',  '#/leads')      +
        kpiCard('Total Revenue',   Utils.fmtCurrency(dash.kpi.totalRevenue), 'fa-circle-dollar-to-slot', 'emerald', '#/opportunities');

      // Line: customer growth
      _charts.push(new Chart(document.getElementById('chart-growth'), {
        type: 'line',
        data: {
          labels: dash.customerGrowth.map(d => d.label),
          datasets: [{ label:'New Customers', data: dash.customerGrowth.map(d => d.count),
            borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,.1)',
            borderWidth:2, fill:true, tension:.4, pointBackgroundColor:'#6366f1', pointRadius:4 }]
        },
        options: chartOpts(),
      }));

      // Bar: employee performance
      if (dash.employeePerformance.length) {
        _charts.push(new Chart(document.getElementById('chart-perf'), {
          type: 'bar',
          data: {
            labels: dash.employeePerformance.map(d => d.name),
            datasets: [{ label:'Won Revenue', data: dash.employeePerformance.map(d => d.wonValue),
              backgroundColor: ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd'],
              borderRadius:8 }]
          },
          options: chartOpts({ indexAxis:'y' }),
        }));
      }

      // Bar: revenue trend
      _charts.push(new Chart(document.getElementById('chart-rev'), {
        type: 'bar',
        data: {
          labels: rev.map(d => d.label),
          datasets: [{ label:'Revenue', data: rev.map(d => d.revenue),
            backgroundColor:'rgba(99,102,241,.75)', borderRadius:6 }]
        },
        options: chartOpts(),
      }));
    } catch (err) {
      Utils.showToast('Dashboard error: ' + err.message, 'error');
    }
  }

  // ── Admin dashboard ────────────────────────────────────────────────────────
  function renderAdmin() {
    return `
      <div class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5" id="adm-kpi">
          ${skeleton()}${skeleton()}${skeleton()}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Sales Pipeline</p>
            <div class="chart-wrap" style="height:200px"><canvas id="chart-pipeline"></canvas></div>
          </div>
          <div class="card p-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Recent Activities</p>
            <div id="recent-acts" class="space-y-2 text-sm">${Utils.spinner()}</div>
          </div>
        </div>
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Lead Sources</p>
          <div class="chart-wrap" style="height:180px"><canvas id="chart-sources"></canvas></div>
        </div>
      </div>`;
  }

  async function initAdmin() {
    try {
      const [dash, sources] = await Promise.all([
        API.get('/reports/admin-dashboard'),
        API.get('/reports/lead-sources'),
      ]);

      document.getElementById('adm-kpi').innerHTML =
        kpiCard('New Customers (Month)', Utils.fmtNumber(dash.kpi.newCustomersThisMonth), 'fa-user-plus', 'indigo', '#/customers') +
        kpiCard('Active Leads',          Utils.fmtNumber(dash.kpi.activeLeads),           'fa-bullseye',  'purple', '#/leads')     +
        kpiCard('Pending Tasks',         Utils.fmtNumber(dash.kpi.pendingTasks),          'fa-list-check','amber',  '#/activities');

      // Pipeline bar chart
      const stageColors = { prospecting:'#94a3b8', proposal:'#6366f1', negotiation:'#f59e0b', won:'#10b981', lost:'#ef4444' };
      _charts.push(new Chart(document.getElementById('chart-pipeline'), {
        type: 'bar',
        data: {
          labels: dash.pipeline.map(p => p.stage),
          datasets: [
            { label:'Count',  data: dash.pipeline.map(p => p.count), backgroundColor: dash.pipeline.map(p => stageColors[p.stage] || '#6366f1'), borderRadius:6 },
          ]
        },
        options: chartOpts(),
      }));

      // Lead sources donut
      if (sources.length) {
        _charts.push(new Chart(document.getElementById('chart-sources'), {
          type: 'doughnut',
          data: {
            labels: sources.map(s => (s._id||'other').replace(/_/g,' ')),
            datasets: [{ data: sources.map(s => s.count),
              backgroundColor:['#6366f1','#8b5cf6','#06b6d4','#f59e0b','#10b981','#f43f5e'],
              borderWidth:0 }]
          },
          options: { responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:'right', labels:{ color:'#9ca3af', font:{size:11} } } } },
        }));
      }

      // Recent activities feed
      const actsEl = document.getElementById('recent-acts');
      if (!dash.recentActivities.length) {
        actsEl.innerHTML = Utils.emptyState('No recent activities');
      } else {
        const ICONS = { call:'fa-phone', email:'fa-envelope', meeting:'fa-video', task:'fa-check-square' };
        actsEl.innerHTML = dash.recentActivities.map(a => `
          <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i class="fa-solid ${ICONS[a.type]||'fa-circle'} text-xs text-indigo-600 dark:text-indigo-400"></i>
            </div>
            <div class="min-w-0">
              <p class="font-medium text-gray-800 dark:text-white truncate">${Utils.esc(a.note || a.type)}</p>
              <p class="text-xs text-gray-400 mt-0.5">${Utils.fmtDate(a.dueDate || a.createdAt)}</p>
            </div>
            ${a.completed ? '<span class="text-xs text-emerald-500 ml-auto flex-shrink-0">Done</span>' : ''}
          </div>`).join('');
      }
    } catch (err) {
      Utils.showToast('Dashboard error: ' + err.message, 'error');
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function render(user) {
    destroyCharts();
    return user.role === 'manager' ? renderManager() : renderAdmin();
  }
  async function init(user) {
    if (user.role === 'manager') await initManager();
    else                          await initAdmin();
  }

  return { render, init, destroyCharts };
})();
