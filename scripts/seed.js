require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const User          = require("../server/models/User");
const Customer      = require("../server/models/Customer");
const Lead          = require("../server/models/Lead");
const Opportunity   = require("../server/models/Opportunity");
const Activity      = require("../server/models/Activity");
const InventoryItem = require("../server/models/InventoryItem");
const AuditLog      = require("../server/models/AuditLog");

// ── Helpers ───────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // ── Wipe only seed-owned collections (safe re-run) ─────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Lead.deleteMany({}),
    Opportunity.deleteMany({}),
    Activity.deleteMany({}),
    InventoryItem.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  console.log("Collections cleared");

  // ── Users ─────────────────────────────────────────────────────────────────
  const [managerHash, adminHash] = await Promise.all([
    bcrypt.hash("Manager123!", 12),
    bcrypt.hash("Admin123!",   12),
  ]);

  const manager = await User.create({
    name: "Sara Manager",
    email: "manager@crm.test",
    passwordHash: managerHash,
    role: "manager",
  });

  const admin = await User.create({
    name: "Alex Admin",
    email: "admin@crm.test",
    passwordHash: adminHash,
    role: "admin",
  });

  console.log("Users seeded");

  // ── Inventory ─────────────────────────────────────────────────────────────
  const inventoryData = [
    { sku: "TS-001", productName: "Classic White T-Shirt",      category: "T-Shirts",    quantity: 500, price: 8.50  },
    { sku: "TS-002", productName: "Graphic Print Tee",          category: "T-Shirts",    quantity: 320, price: 11.00 },
    { sku: "JK-001", productName: "Denim Jacket Blue",          category: "Jackets",     quantity: 150, price: 35.00 },
    { sku: "JK-002", productName: "Bomber Jacket Olive",        category: "Jackets",     quantity: 90,  price: 42.00 },
    { sku: "TR-001", productName: "Slim Fit Chinos Beige",      category: "Trousers",    quantity: 240, price: 22.00 },
    { sku: "TR-002", productName: "Wide Leg Trousers Black",    category: "Trousers",    quantity: 180, price: 26.00 },
    { sku: "DR-001", productName: "Floral Midi Dress",          category: "Dresses",     quantity: 200, price: 30.00 },
    { sku: "DR-002", productName: "Bodycon Dress Navy",         category: "Dresses",     quantity: 130, price: 28.00 },
    { sku: "OW-001", productName: "Puffer Coat Winter",         category: "Outerwear",   quantity: 75,  price: 65.00 },
    { sku: "OW-002", productName: "Trench Coat Camel",          category: "Outerwear",   quantity: 60,  price: 72.00 },
    { sku: "AC-001", productName: "Canvas Belt Brown",          category: "Accessories", quantity: 400, price: 6.00  },
    { sku: "AC-002", productName: "Knit Beanie Grey",           category: "Accessories", quantity: 350, price: 7.50  },
  ];
  await InventoryItem.insertMany(inventoryData);
  console.log("Inventory seeded");

  // ── Customers ─────────────────────────────────────────────────────────────
  const customerData = [
    { name: "Lena Fischer",      company: "Fischer Mode GmbH",      email: "lena@fischmode.de",     phone: "+49-30-1234567",  status: "active"   },
    { name: "Omar Al-Rashid",    company: "Gulf Wear Trading",      email: "omar@gulfwear.ae",      phone: "+971-50-9876543", status: "active"   },
    { name: "Sofia Marín",       company: "Moda España S.L.",       email: "sofia@modaespana.com",  phone: "+34-91-5554433",  status: "active"   },
    { name: "James Thornton",    company: "Thornton Retail Ltd",    email: "james@thorntonret.co.uk",phone: "+44-20-7001122", status: "active"   },
    { name: "Yuki Tanaka",       company: "Tanaka Fashion Tokyo",   email: "yuki@tanakafashion.jp", phone: "+81-3-33334444",  status: "active"   },
    { name: "Priya Kapoor",      company: "Kapoor Garments Pvt",    email: "priya@kapoorgar.in",    phone: "+91-98-76543210", status: "prospect" },
    { name: "Marco Bianchi",     company: "Bianchi Abbigliamento",  email: "marco@bianchiabb.it",   phone: "+39-02-5556677",  status: "active"   },
    { name: "Elena Petrova",     company: "Petrova Style Moskva",   email: "elena@petrovastyle.ru", phone: "+7-495-1234567",  status: "inactive" },
    { name: "Carlos Mendoza",    company: "Mendoza Moda CDMX",      email: "carlos@mendozamoda.mx", phone: "+52-55-87654321", status: "prospect" },
    { name: "Amina Diallo",      company: "Diallo Couture Dakar",   email: "amina@diallocouture.sn",phone: "+221-77-1234567", status: "active"   },
    { name: "Thomas Weber",      company: "Weber Textilien AG",     email: "thomas@webertex.ch",    phone: "+41-44-2223344",  status: "active"   },
    { name: "Nadia Hassan",      company: "Hassan Fashion Cairo",   email: "nadia@hassanfash.eg",   phone: "+20-2-11223344",  status: "prospect" },
  ];

  const customers = await Customer.insertMany(
    customerData.map((c, i) => ({
      ...c,
      assignedTo: i % 2 === 0 ? admin._id : manager._id,
      createdBy:  admin._id,
      createdAt:  daysAgo(rand(5, 120)),
    }))
  );
  console.log("Customers seeded");

  // ── Leads ─────────────────────────────────────────────────────────────────
  const leadStatuses  = ["new", "contacted", "qualified", "lost"];
  const leadSources   = ["website", "referral", "trade_show", "cold_call", "social_media", "other"];
  const leadNames = [
    "Boutique Parisienne", "TrendSet Warsaw", "Vienna Styles KG", "Seoul Fashion Hub",
    "Rio Mode Ltda", "Lagos Casuals", "Sydney Wholesale Co", "Toronto Threads",
    "Amsterdam Apparel BV", "Lisbon Looks Lda", "Budapest Boutique Kft", "Zurich Zest AG",
    "Athens Attire SA", "Prague Prints sro", "Nairobi Knitwear Ltd",
  ];

  const leads = await Lead.insertMany(
    leadNames.map((name, i) => ({
      name,
      source: pick(leadSources),
      status: leadStatuses[i % leadStatuses.length],
      value:  rand(2000, 50000),
      owner:  i % 3 === 0 ? manager._id : admin._id,
      createdAt: daysAgo(rand(1, 90)),
    }))
  );
  console.log("Leads seeded");

  // ── Opportunities ─────────────────────────────────────────────────────────
  const stages = ["prospecting", "proposal", "negotiation", "won", "lost"];
  const opps = await Opportunity.insertMany(
    customers.slice(0, 10).map((c, i) => ({
      title:    `${c.company} — ${pick(["Summer Collection", "Winter Bulk Order", "New Season Deal", "Restock Agreement"])}`,
      customer: c._id,
      stage:    stages[i % stages.length],
      amount:   rand(5000, 120000),
      owner:    i % 2 === 0 ? admin._id : manager._id,
      createdAt: daysAgo(rand(1, 60)),
    }))
  );
  console.log("Opportunities seeded");

  // ── Activities ────────────────────────────────────────────────────────────
  const actTypes = ["call", "email", "meeting", "task"];
  const notes = [
    "Discussed spring collection requirements",
    "Sent product catalogue PDF",
    "Video call to review samples",
    "Follow up on payment terms",
    "Confirmed delivery schedule",
    "Negotiated bulk discount",
    "Requested credit application form",
    "Reviewed quality inspection report",
  ];

  const activities = [];
  for (let i = 0; i < 20; i++) {
    const useCustomer = i % 2 === 0;
    activities.push({
      type:        pick(actTypes),
      note:        pick(notes),
      relatedTo:   useCustomer ? customers[i % customers.length]._id : leads[i % leads.length]._id,
      relatedModel:useCustomer ? "Customer" : "Lead",
      dueDate:     daysAgo(rand(-14, 30)),   // negative = future
      completed:   i < 12,
      owner:       i % 2 === 0 ? admin._id : manager._id,
      createdAt:   daysAgo(rand(1, 45)),
    });
  }
  await Activity.insertMany(activities);
  console.log("Activities seeded");

  // ── Audit logs ────────────────────────────────────────────────────────────
  const auditEntries = [];
  customers.forEach((c) => {
    auditEntries.push({ user: admin._id,   action: "CREATE", entity: "Customer",    entityId: c._id,              timestamp: c.createdAt });
  });
  leads.forEach((l) => {
    auditEntries.push({ user: admin._id,   action: "CREATE", entity: "Lead",        entityId: l._id,              timestamp: l.createdAt });
  });
  opps.forEach((o) => {
    auditEntries.push({ user: admin._id,   action: "CREATE", entity: "Opportunity", entityId: o._id,              timestamp: o.createdAt });
  });
  auditEntries.push({ user: manager._id, action: "CREATE", entity: "User",        entityId: admin._id,           timestamp: daysAgo(130) });
  auditEntries.push({ user: manager._id, action: "LOGIN",  entity: "User",        entityId: manager._id,         timestamp: daysAgo(1)   });

  await AuditLog.insertMany(auditEntries);
  console.log("Audit logs seeded");

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n=== Seed complete ===");
  console.log("  manager@crm.test  /  Manager123!  (role: manager)");
  console.log("  admin@crm.test    /  Admin123!    (role: admin)");
  console.log(`  Customers: ${customers.length}  |  Leads: ${leads.length}  |  Opportunities: ${opps.length}`);
  console.log(`  Activities: ${activities.length}  |  Inventory: ${inventoryData.length}  |  Audit logs: ${auditEntries.length}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
