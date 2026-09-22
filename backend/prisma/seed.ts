import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'aarohan-realty' },
    update: {},
    create: {
      name: 'Aarohan Realty',
      slug: 'aarohan-realty',
      status: 'ACTIVE',
      users: {
        create: [
          { name: 'Arvind Rao', email: 'admin@aarohanrealty.com', passwordHash, role: 'SUPER_ADMIN' },
          { name: 'Meera Shah', email: 'cfo@aarohanrealty.com', passwordHash, role: 'CFO' },
        ],
      },
    },
  });

  const tenantId = tenant.id;

  await prisma.project.createMany({
    data: [
      { tenantId, code: 'site-a', name: 'Aarohan Grande', physicalPct: 68, financialPct: 71, manpower: 284, delayedTasks: 8, safetyScore: 87, qualityScore: 91, contractors: 18, openIssues: 7 },
      { tenantId, code: 'site-b', name: 'Business Bay', physicalPct: 52, financialPct: 58, manpower: 196, delayedTasks: 12, safetyScore: 82, qualityScore: 88, contractors: 12, openIssues: 11 },
      { tenantId, code: 'site-c', name: 'Aarohan Serenity', physicalPct: 39, financialPct: 43, manpower: 143, delayedTasks: 5, safetyScore: 90, qualityScore: 85, contractors: 9, openIssues: 14 },
    ],
    skipDuplicates: true,
  });

  await prisma.approval.createMany({
    data: [
      { tenantId, code: 'APR-001', type: 'Purchase Order', desc: 'Tata Steel Ltd. — TMT Steel Fe500D', amount: '42.80 Lakh', icon: '🛒', project: 'Site A', raisedBy: 'Sameer Khan', date: '20 Jun 2026' },
      { tenantId, code: 'APR-002', type: 'Contractor RA Bill', desc: 'BuildMax Contractors — RCC Tower 2-3', amount: '68.25 Lakh', icon: '🏗', project: 'Site A', raisedBy: 'Rohan Kulkarni', date: '21 Jun 2026' },
      { tenantId, code: 'APR-003', type: 'Customer Discount', desc: 'Unit A-1804 — Ramesh Gupta', amount: '3.75 Lakh', icon: '💰', project: 'Site A', raisedBy: 'Nisha Kapoor', date: '20 Jun 2026' },
      { tenantId, code: 'APR-007', type: 'RERA Withdrawal', desc: 'Site A — 68% Progress Certificate', amount: '4.85 Cr', icon: '🏦', project: 'Site A', raisedBy: 'Tanvi Mehta', date: '16 Jun 2026' },
    ],
    skipDuplicates: true,
  });

  await prisma.lead.createMany({
    data: [
      { tenantId, code: 'LD-001', name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@gmail.com', source: 'Google Ads', project: 'Aarohan Grande', budget: '1.20 Cr', type: '3 BHK', timeline: '3 months', score: 84, exec: 'Rahul Sharma', last: '21 Jun 2026', next: '23 Jun 2026', stage: 'Qualified' },
      { tenantId, code: 'LD-003', name: 'Sanjay Verma', phone: '9876543212', email: 'sanjay@gmail.com', source: 'Referral', project: 'Aarohan Grande', budget: '2 Cr', type: '3 BHK', timeline: 'Immediate', score: 91, exec: 'Amit Joshi', last: '22 Jun 2026', next: '23 Jun 2026', stage: 'Negotiation' },
      { tenantId, code: 'LD-006', name: 'Sunita Patel', phone: '9876543215', email: 'sunita@gmail.com', source: 'Walk-In', project: 'Business Bay', budget: '1.20 Cr', type: 'Office', timeline: 'Immediate', score: 88, exec: 'Priya Desai', last: '22 Jun 2026', next: '23 Jun 2026', stage: 'Negotiation' },
      { tenantId, code: 'LD-010', name: 'Rohan Bhat', phone: '9876543219', email: 'rohan@gmail.com', source: 'Referral', project: 'Business Bay', budget: '2.50 Cr', type: 'Office', timeline: 'Immediate', score: 95, exec: 'Priya Desai', last: '22 Jun 2026', next: '23 Jun 2026', stage: 'Booking' },
    ],
    skipDuplicates: true,
  });

  await prisma.followup.createMany({
    data: [
      { tenantId, lead: 'LD-003', customer: 'Sanjay Verma', phone: '9876543212', stage: 'Negotiation', date: '23 Jun 2026', type: 'Meeting', exec: 'Amit Joshi', last: '22 Jun 2026' },
      { tenantId, lead: 'LD-001', customer: 'Rajesh Kumar', phone: '9876543210', stage: 'Qualified', date: '23 Jun 2026', type: 'Phone Call', exec: 'Rahul Sharma', last: '21 Jun 2026' },
    ],
  });

  await prisma.unit.createMany({
    data: [
      { tenantId, code: 'A-T1-0101', project: 'site-a', tower: 'T1', floor: '01', unitNo: '101', type: '2 BHK', carpet: 685, base: 7200000n, status: 'Available' },
      { tenantId, code: 'A-T1-0102', project: 'site-a', tower: 'T1', floor: '01', unitNo: '102', type: '3 BHK', carpet: 980, base: 9800000n, status: 'Booked', customer: 'Rajesh Kumar', bookDate: '12 Mar 2026' },
      { tenantId, code: 'B-T1-0101', project: 'site-b', tower: 'T1', floor: '01', unitNo: '101', type: 'Office', carpet: 820, base: 12500000n, status: 'Available' },
    ],
    skipDuplicates: true,
  });

  await prisma.customer.createMany({
    data: [
      { tenantId, name: 'Rajesh Kumar', unit: 'A-T1-0102', project: 'Site A', agreement: 9800000n, received: 7350000n, pending: 2450000n, nextDemand: '01 Aug 2026' },
      { tenantId, name: 'Snehal Rao', unit: 'A-T2-0202', project: 'Site A', agreement: 9880000n, received: 2964000n, pending: 6916000n, nextDemand: '15 Jul 2026', overdue: 2964000n, daysOD: 92 },
      { tenantId, name: 'Kamla Desai', unit: 'A-T1-0502', project: 'Site A', agreement: 10120000n, received: 2530000n, pending: 7590000n, nextDemand: '01 Jul 2026', overdue: 2530000n, daysOD: 62 },
    ],
  });

  await prisma.transaction.createMany({
    data: [
      { tenantId, code: 'TXN-0842', date: '22 Jun 2026', cat: 'Customer Collection', desc: 'Instalment Rajesh Kumar A-101', project: 'Site A', party: 'Rajesh Kumar', mode: 'NEFT', credit: 735000n, status: 'Verified', enteredBy: 'Harshad K' },
      { tenantId, code: 'TXN-0841', date: '22 Jun 2026', cat: 'Vendor Payment', desc: 'UltraTech Cement UC-3312', project: 'Site A', party: 'UltraTech Cement', mode: 'RTGS', debit: 842000n, status: 'Approved', enteredBy: 'Harshad K' },
      { tenantId, code: 'TXN-0839', date: '20 Jun 2026', cat: 'Contractor Payment', desc: 'RA Bill AquaFlow Plumbing', project: 'Site A', party: 'AquaFlow Plumbing', mode: 'RTGS', debit: 1555000n, status: 'Approved', enteredBy: 'Meera Shah' },
    ],
    skipDuplicates: true,
  });

  await prisma.vendor.createMany({
    data: [
      { tenantId, code: 'V-001', name: 'Tata Steel Ltd.', cat: 'Material Supplier', contact: 'Vikram Iyer', projects: 'Site A, B, C', value: '82.40 Cr', outstanding: '18.75 L', quality: 92, delivery: 88, risk: 'Low' },
      { tenantId, code: 'V-003', name: 'BuildMax Contractors', cat: 'Contractor', contact: 'Kiran Malhotra', projects: 'Site A', value: '280.00 L', outstanding: '68.25 L', quality: 82, delivery: 78, risk: 'Medium' },
      { tenantId, code: 'V-004', name: 'Elevate Systems', cat: 'Service Provider', contact: 'Anand Rao', projects: 'Site A, B', value: '46.00 L', outstanding: '15.00 L', quality: 88, delivery: 80, risk: 'High' },
    ],
    skipDuplicates: true,
  });

  await prisma.employee.createMany({
    data: [
      { tenantId, code: 'EMP-001', name: 'Arvind Rao', design: 'Managing Director', dept: 'Management', project: 'Corporate', tasks: 12, perf: 97 },
      { tenantId, code: 'EMP-002', name: 'Meera Shah', design: 'CFO', dept: 'Finance & Accounts', project: 'Corporate', tasks: 8, perf: 94 },
      { tenantId, code: 'EMP-007', name: 'Rohan Kulkarni', design: 'Project Manager', dept: 'Project Management', project: 'Site A', tasks: 18, perf: 90 },
      { tenantId, code: 'EMP-017', name: 'Rahul Sharma', design: 'Sales Executive', dept: 'Sales', project: 'All Sites', tasks: 20, perf: 85 },
    ],
    skipDuplicates: true,
  });

  await prisma.task.createMany({
    data: [
      { tenantId, code: 'T-001', title: 'Submit DPR Tower 2 Floor 14', emp: 'Nikhil Patil', dept: 'Site Execution', project: 'Site A', due: '22 Jun 2026', priority: 'High', status: 'Completed', update: 'DPR submitted and approved' },
      { tenantId, code: 'T-003', title: 'Quality inspection Tower 3 Waterproofing', emp: 'Mohit Rathod', dept: 'Quality Control', project: 'Site A', due: '21 Jun 2026', priority: 'High', status: 'Overdue' },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: [
      { tenantId, cat: 'finance', title: 'Payment Due — DesignGrid Consultants', body: 'Invoice 4.80L overdue by 7 days.' },
      { tenantId, cat: 'ai', title: 'AI Alert: Duplicate Invoice Detected', body: 'Invoice BM-4587 matches BM-4522. Payment hold placed automatically.' },
      { tenantId, cat: 'construction', title: 'Site B Progress Alert', body: 'Site B is 6.2% behind planned progress.' },
    ],
  });

  await prisma.issue.createMany({
    data: [
      { tenantId, title: 'TMT Steel delivery delayed — Site B', priority: 'High', project: 'Site B', type: 'Material Delay', impact: 80, delay: 4, owner: 'Sameer Khan', due: '25 Jun 2026' },
      { tenantId, title: 'Labour shortage Site C Tower 2', priority: 'High', project: 'Site C', type: 'Labour Shortage', impact: 120, delay: 12, owner: 'Aditya Joshi', due: '23 Jun 2026' },
    ],
  });

  await prisma.collectionAgentRecord.createMany({
    data: [
      { tenantId, customer: 'Snehal Rao', unit: 'A-T2-0202', due: 2964000n, days: 92, last: '10 Jun 2026', risk: 'High' },
      { tenantId, customer: 'Kamla Desai', unit: 'A-T1-0502', due: 2530000n, days: 62, last: '15 Jun 2026', promise: '30 Jun 2026', risk: 'High' },
    ],
  });

  await prisma.aiLog.createMany({
    data: [
      { tenantId, time: '08:14 AM', module: 'Enquiry Agent', action: 'Lead Qualified', entity: 'Rajesh Kumar', result: 'Assigned to Rahul Sharma', value: 'Budget 1.20 Cr' },
      { tenantId, time: '11:02 AM', module: 'Expense Scanner', action: 'Anomaly Flagged', entity: 'Elevate Systems', result: 'Payment held', value: '15.00L' },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { tenantId, user: 'Harshad Kulkarni', role: 'Accounts Manager', module: 'Finance', action: 'Transaction Created', desc: 'Payment UltraTech Cement' },
      { tenantId, user: 'Arvind Rao', role: 'Managing Director', module: 'Approvals', action: 'Approved', desc: 'RERA withdrawal Site A' },
    ],
  });

  await prisma.boqItem.createMany({
    data: [
      { tenantId, code: 'CW-001', cat: 'Civil & Structural', budget: 4200n, committed: 3840n, actual: 2850n, paid: 2690n, remaining: 1350n, variance: -360n, status: 'On Budget' },
      { tenantId, code: 'MEP-001', cat: 'Electrical MEP', budget: 650n, committed: 750n, actual: 480n, paid: 420n, remaining: -100n, variance: -100n, status: 'Overrun' },
    ],
    skipDuplicates: true,
  });

  await prisma.materialItem.createMany({
    data: [
      { tenantId, mat: 'TMT Steel Fe500D', unit: 'MT', opening: 42, received: 25, consumed: 38, closing: 29, min: 35, value: 48.5, alert: 'warn' },
      { tenantId, mat: 'OPC 53 Cement', unit: 'Bags', opening: 820, received: 500, consumed: 940, closing: 380, min: 400, value: 4.6, alert: 'crit' },
    ],
  });

  await prisma.progressItem.createMany({
    data: [
      { tenantId, tower: 'Tower 1', floor: 'Floor 14', activity: 'RCC Casting', contractor: 'BuildMax', planned: 100, actual: 92, delay: 2, eng: 'Nikhil Patil', status: 'In Progress' },
      { tenantId, tower: 'Tower 4', floor: 'Floor 3', activity: 'Foundation', contractor: 'BuildMax', planned: 100, actual: 60, delay: 10, eng: 'Nikhil Patil', status: 'Critical' },
    ],
  });

  await prisma.bankAccount.createMany({
    data: [
      { tenantId, bankName: 'HDFC Bank', accountNo: 'XXXX4521', type: 'Current', balance: 284500000n, project: 'Corporate' },
      { tenantId, bankName: 'ICICI Bank', accountNo: 'XXXX7712', type: 'Collection', balance: 96500000n, project: 'Site A' },
    ],
  });

  await prisma.reraAccount.createMany({
    data: [{ tenantId, project: 'Site A', reraNo: 'P52100012345', accountNo: 'XXXX9981', balance: 128500000n, withdrawable: 48500000n }],
  });

  console.log(`Seeded tenant "${tenant.slug}". Login with admin@aarohanrealty.com / Admin@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
