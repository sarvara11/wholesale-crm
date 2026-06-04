const Customer    = require("../models/Customer");
const Lead        = require("../models/Lead");
const Opportunity = require("../models/Opportunity");
const Activity    = require("../models/Activity");

// ── Shared helpers ────────────────────────────────────────────────────────────
function last6Months() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

function startOfMonth(year, month) {
  return new Date(year, month - 1, 1);
}
function startOfThisMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

// ── GET /api/reports/manager-dashboard ───────────────────────────────────────
async function managerDashboard(_req, res) {
  const [
    totalCustomers,
    totalLeads,
    revenue,
    customerGrowthRaw,
    employeePerf,
  ] = await Promise.all([
    // KPI cards
    Customer.countDocuments(),
    Lead.countDocuments(),
    Opportunity.aggregate([
      { $match: { stage: "won" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),

    // Customer growth: new customers per month for the last 6 months
    Customer.aggregate([
      { $match: { createdAt: { $gte: startOfMonth(...Object.values(last6Months()[0])) } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    // Employee performance: total won opportunity value per owner
    Opportunity.aggregate([
      { $match: { stage: "won" } },
      { $group: { _id: "$owner", wonValue: { $sum: "$amount" }, wonCount: { $sum: 1 } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $project: { name: "$user.name", wonValue: 1, wonCount: 1 } },
      { $sort: { wonValue: -1 } },
    ]),
  ]);

  // Fill in zero-counts for missing months
  const months  = last6Months();
  const growthMap = {};
  customerGrowthRaw.forEach(({ _id, count }) => {
    growthMap[`${_id.year}-${_id.month}`] = count;
  });
  const customerGrowth = months.map(({ year, month }) => ({
    label: new Date(year, month - 1).toLocaleString("en", { month: "short", year: "2-digit" }),
    count: growthMap[`${year}-${month}`] || 0,
  }));

  res.json({
    kpi: {
      totalCustomers,
      totalLeads,
      totalRevenue: revenue[0]?.total || 0,
    },
    customerGrowth,
    employeePerformance: employeePerf,
  });
}

// ── GET /api/reports/admin-dashboard ─────────────────────────────────────────
async function adminDashboard(req, res) {
  const uid = req.user._id;

  const [
    newCustomersThisMonth,
    activeLeads,
    pendingTasks,
    pipelineRaw,
  ] = await Promise.all([
    Customer.countDocuments({
      $or: [{ assignedTo: uid }, { createdBy: uid }],
      createdAt: { $gte: startOfThisMonth() },
    }),
    Lead.countDocuments({ owner: uid, status: { $ne: "lost" } }),
    Activity.countDocuments({ owner: uid, completed: false, type: "task" }),
    Opportunity.aggregate([
      { $match: { owner: uid } },
      { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$amount" } } },
    ]),
  ]);

  const stageOrder = ["prospecting", "proposal", "negotiation", "won", "lost"];
  const pipelineMap = {};
  pipelineRaw.forEach(({ _id, count, value }) => { pipelineMap[_id] = { count, value }; });
  const pipeline = stageOrder.map((stage) => ({
    stage,
    count: pipelineMap[stage]?.count || 0,
    value: pipelineMap[stage]?.value || 0,
  }));

  // Recent activities for the mini-feed
  const recentActivities = await Activity.find({ owner: uid })
    .populate("relatedTo")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  res.json({
    kpi: { newCustomersThisMonth, activeLeads, pendingTasks },
    pipeline,
    recentActivities,
  });
}

// ── GET /api/reports/sales-pipeline ──────────────────────────────────────────
async function salesPipeline(req, res) {
  const match = req.user.role === "admin" ? { owner: req.user._id } : {};
  const data = await Opportunity.aggregate([
    { $match: match },
    { $group: { _id: "$stage", count: { $sum: 1 }, value: { $sum: "$amount" } } },
  ]);
  res.json(data);
}

// ── GET /api/reports/lead-sources ────────────────────────────────────────────
async function leadSources(req, res) {
  const match = req.user.role === "admin" ? { owner: req.user._id } : {};
  const data = await Lead.aggregate([
    { $match: match },
    { $group: { _id: "$source", count: { $sum: 1 }, value: { $sum: "$value" } } },
    { $sort: { count: -1 } },
  ]);
  res.json(data);
}

// ── GET /api/reports/revenue-trend ───────────────────────────────────────────
async function revenueTrend(req, res) {
  const months = last6Months();
  const start  = startOfMonth(months[0].year, months[0].month);

  const raw = await Opportunity.aggregate([
    { $match: { stage: "won", createdAt: { $gte: start } } },
    {
      $group: {
        _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const map = {};
  raw.forEach(({ _id, revenue }) => { map[`${_id.year}-${_id.month}`] = revenue; });

  const trend = months.map(({ year, month }) => ({
    label:   new Date(year, month - 1).toLocaleString("en", { month: "short", year: "2-digit" }),
    revenue: map[`${year}-${month}`] || 0,
  }));
  res.json(trend);
}

module.exports = { managerDashboard, adminDashboard, salesPipeline, leadSources, revenueTrend };
