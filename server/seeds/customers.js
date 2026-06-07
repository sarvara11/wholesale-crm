require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const User     = require("../models/User");

const firstNames = [
  "James","John","Robert","Michael","William","David","Richard","Joseph","Thomas","Charles",
  "Mary","Patricia","Jennifer","Linda","Barbara","Elizabeth","Susan","Jessica","Sarah","Karen",
  "Christopher","Daniel","Matthew","Anthony","Mark","Donald","Steven","Paul","Andrew","Joshua",
  "Emma","Olivia","Ava","Isabella","Sophia","Mia","Charlotte","Amelia","Harper","Evelyn",
  "Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan","Jacob",
  "Hannah","Lily","Grace","Chloe","Victoria","Zoe","Natalie","Samantha","Ella","Abigail"
];

const lastNames = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Anderson",
  "Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lopez","Lee",
  "Harris","Clark","Lewis","Robinson","Walker","Perez","Hall","Young","Allen","Sanchez",
  "Wright","King","Scott","Green","Baker","Adams","Nelson","Carter","Mitchell","Perez",
  "Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Morris"
];

const companies = [
  "FashionHub Ltd","StyleTrend Co","UrbanWear Group","Elite Clothing","Trendy Threads",
  "ClassicAttire","ModernFit","ChicBoutique","LuxeWear","SmartStyle",
  "GlobalFashion","PremiumTex","NovaTrend","ActiveWear Pro","EcoFashion",
  "BoldLook Inc","CasualEdge","HighFashion","StreamlinedStyle","NextGen Apparel",
  "FastFit Co","PureStyle","ZenWear","RoyalCloth","UrbanElite",
  "TrendSetter","FusionWear","MetroStyle","CityThreads","PeakFashion",
  "AlphaCloth","SilkRoad Apparel","TopStitch","GarmentKing","SkylineWear",
  "DailyWear","ProCloth","TailoredFit","WholesaleFlex","ApexGarments"
];

const statuses = ["active","active","active","inactive","prospect"];

const domains = [
  "gmail.com","yahoo.com","outlook.com","hotmail.com","company.com",
  "business.net","enterprise.org","mail.com","email.co","corp.io"
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function phone() {
  return `+44 ${Math.floor(100+Math.random()*900)} ${Math.floor(100+Math.random()*900)} ${Math.floor(1000+Math.random()*9000)}`;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const users = await User.find();
  if (!users.length) { console.error("No users found — log in to the app first"); process.exit(1); }
  console.log(`Found ${users.length} user(s): ${users.map(u => u.email).join(', ')}`);

  // Wipe existing seeded customers and re-seed so all users get their share
  await Customer.deleteMany({});
  console.log("Cleared existing customers. Inserting 300...");

  const customers = [];
  const usedEmails = new Set();

  for (let i = 0; i < 300; i++) {
    const owner = users[i % users.length];   // round-robin across all users
    const first = pick(firstNames);
    const last  = pick(lastNames);
    let email;
    do {
      email = `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random()*999)}@${pick(domains)}`;
    } while (usedEmails.has(email));
    usedEmails.add(email);

    customers.push({
      name:       `${first} ${last}`,
      company:    pick(companies),
      email,
      phone:      phone(),
      status:     pick(statuses),
      createdBy:  owner._id,
      assignedTo: owner._id,
    });
  }

  await Customer.insertMany(customers, { ordered: false });
  const total = await Customer.countDocuments();
  console.log(`Done. Total customers in DB: ${total}`);
  users.forEach(u => console.log(`  ${u.email} (${u.role}): ~${Math.floor(300/users.length)} customers`));
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
