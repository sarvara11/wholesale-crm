'use strict';
const ReportsPage = (() => {
  let _charts = [];
  function destroyCharts() { _charts.forEach(c => c.destroy()); _charts = []; }

  const opts = (o = {}) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:'#9ca3af', font:{size:11} } } },
    scales:{ x:{ grid:{color:'rgba(156,163,175,.08)'}, ticks:{color:'#9ca3af',font:{size:11}} },
             y:{ grid:{color:'rgba(156,163,175,.08)'}, ticks:{color:'#9ca3af',font:{size:11}}, beginAtZero:true } },
    ...o,
  });

  function render() {
    return `
      <div class="page-header"><h2>Reports</h2></div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Revenue Trend (6 months)</p>
          <div style="height:220px"><canvas id="rpt-revenue"></canvas></div>
        </div>
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Lead Sources</p>
          <div style="height:220px"><canvas id="rpt-sources"></canvas></div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Sales Pipeline (by Stage)</p>
          <div style="height:220px"><canvas id="rpt-pipeline"></canvas></div>
        </div>
        <div class="card p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Pipeline Summary</p>
          <div id="rpt-pipeline-table" class="mt-2">${Utils.spinner()}</div>
        </div>
      </div>`;
  }

  async function init() {
    destroyCharts();
    try {
      const [rev, sources, pipeline] = await Promise.all([
        API.get('/reports/revenue-trend'),
        API.get('/reports/lead-sources'),
        API.get('/reports/sales-pipeline'),
      ]);

      // Revenue line
      _charts.push(new Chart(document.getElementById('rpt-revenue'), {
        type:'line',
        data:{ labels:rev.map(d=>d.label),
          datasets:[{ label:'Revenue', data:rev.map(d=>d.revenue),
            borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,.1)',
            fill:true, tension:.4, borderWidth:2, pointBackgroundColor:'#6366f1', pointRadius:4 }] },
        options: opts({ plugins:{ legend:{ display:false } } }),
      }));

      // Lead sources donut
      _charts.push(new Chart(document.getElementById('rpt-sources'), {
        type:'doughnut',
        data:{ labels:sources.map(s=>(s._id||'other').replace(/_/g,' ')),
          datasets:[{ data:sources.map(s=>s.count),
            backgroundColor:['#6366f1','#8b5cf6','#06b6d4','#f59e0b','#10b981','#f43f5e'], borderWidth:0 }] },
        options:{ responsive:true, maintainAspectRatio:false,
          plugins:{ legend:{ position:'right', labels:{ color:'#9ca3af', font:{size:11} } } } },
      }));

      // Pipeline bar
      const stageColors = { prospecting:'#94a3b8', proposal:'#6366f1', negotiation:'#f59e0b', won:'#10b981', lost:'#ef4444' };
      _charts.push(new Chart(document.getElementById('rpt-pipeline'), {
        type:'bar',
        data:{ labels:pipeline.map(p=>p._id), datasets:[{
          label:'Count', data:pipeline.map(p=>p.count),
          backgroundColor:pipeline.map(p=>stageColors[p._id]||'#6366f1'), borderRadius:6 }] },
        options: opts({ plugins:{ legend:{ display:false } } }),
      }));

      // Pipeline summary table
      document.getElementById('rpt-pipeline-table').innerHTML = `
        <table class="data-table text-sm">
          <thead><tr><th>Stage</th><th>Deals</th><th>Total Value</th></tr></thead>
          <tbody>${pipeline.map(p => `<tr>
            <td>${Utils.pill(p._id)}</td>
            <td class="font-semibold">${p.count}</td>
            <td class="font-semibold text-indigo-600 dark:text-indigo-400">${Utils.fmtCurrency(p.value)}</td>
          </tr>`).join('')}</tbody>
        </table>`;
    } catch (err) {
      Utils.showToast('Reports error: ' + err.message, 'error');
    }
  }

  return { render, init, destroyCharts };
})();
