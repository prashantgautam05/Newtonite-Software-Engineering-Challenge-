const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...\n');

  // Clean existing data
  await prisma.workItemHistory.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  // ─── Create Users ──────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.create({
      data: { email: 'alice@newtonite.com', name: 'Alice Johnson', passwordHash },
    }),
    prisma.user.create({
      data: { email: 'bob@newtonite.com', name: 'Bob Smith', passwordHash },
    }),
    prisma.user.create({
      data: { email: 'charlie@newtonite.com', name: 'Charlie Davis', passwordHash },
    }),
    prisma.user.create({
      data: { email: 'diana@newtonite.com', name: 'Diana Patel', passwordHash },
    }),
    prisma.user.create({
      data: { email: 'eve@newtonite.com', name: 'Eve Rodriguez', passwordHash },
    }),
  ]);

  const [alice, bob, charlie, diana, eve] = users;
  console.log(`✓ Created ${users.length} users`);

  // ─── Create Teams ──────────────────────────────────
  const teams = await Promise.all([
    prisma.team.create({
      data: { name: 'Engineering', description: 'Software engineering team handling product development and incidents' },
    }),
    prisma.team.create({
      data: { name: 'Operations', description: 'Operations team managing day-to-day business processes' },
    }),
    prisma.team.create({
      data: { name: 'Compliance', description: 'Compliance and risk management team' },
    }),
  ]);

  const [engineering, operations, compliance] = teams;
  console.log(`✓ Created ${teams.length} teams`);

  // ─── Create Team Memberships ───────────────────────
  await Promise.all([
    // Engineering team
    prisma.teamMembership.create({ data: { userId: alice.id, teamId: engineering.id, role: 'ADMIN' } }),
    prisma.teamMembership.create({ data: { userId: bob.id, teamId: engineering.id, role: 'MEMBER' } }),
    prisma.teamMembership.create({ data: { userId: charlie.id, teamId: engineering.id, role: 'MEMBER' } }),
    // Operations team
    prisma.teamMembership.create({ data: { userId: bob.id, teamId: operations.id, role: 'ADMIN' } }),
    prisma.teamMembership.create({ data: { userId: diana.id, teamId: operations.id, role: 'MEMBER' } }),
    prisma.teamMembership.create({ data: { userId: eve.id, teamId: operations.id, role: 'MEMBER' } }),
    // Compliance team
    prisma.teamMembership.create({ data: { userId: diana.id, teamId: compliance.id, role: 'ADMIN' } }),
    prisma.teamMembership.create({ data: { userId: alice.id, teamId: compliance.id, role: 'VIEWER' } }),
    prisma.teamMembership.create({ data: { userId: eve.id, teamId: compliance.id, role: 'MEMBER' } }),
  ]);
  console.log('✓ Created team memberships');

  // ─── Create Work Items ─────────────────────────────
  const workItems = await Promise.all([
    prisma.workItem.create({
      data: {
        title: 'API Gateway returning 502 errors intermittently',
        description: 'Multiple customers reporting 502 errors when accessing the API. Seems to correlate with high traffic periods. Need to investigate load balancer configuration and backend health checks.',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        category: 'INCIDENT',
        teamId: engineering.id,
        reporterId: alice.id,
        assigneeId: bob.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Customer data export request - Acme Corp',
        description: 'Acme Corp has requested a full data export under GDPR Article 20. Need to generate and verify the export within 30 days.',
        status: 'OPEN',
        priority: 'HIGH',
        category: 'COMPLIANCE',
        teamId: compliance.id,
        reporterId: diana.id,
        assigneeId: eve.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Payment reconciliation discrepancy - Q3 batch',
        description: 'There is a $2,340 discrepancy in the Q3 payment batch. Need to cross-reference with bank statements and identify the source.',
        status: 'OPEN',
        priority: 'HIGH',
        category: 'PAYMENT',
        teamId: operations.id,
        reporterId: bob.id,
        assigneeId: diana.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Upgrade database cluster to PostgreSQL 16',
        description: 'Current cluster is running PG 14. Need to plan and execute the upgrade with minimal downtime. Requires approval from engineering lead.',
        status: 'AWAITING_APPROVAL',
        priority: 'MEDIUM',
        category: 'OPERATIONAL',
        teamId: engineering.id,
        reporterId: charlie.id,
        assigneeId: charlie.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Customer complaint - Slow dashboard loading',
        description: 'Enterprise customer "TechFlow Inc" reports that their analytics dashboard takes over 30 seconds to load. They have ~50k records.',
        status: 'OPEN',
        priority: 'MEDIUM',
        category: 'CUSTOMER_ISSUE',
        teamId: engineering.id,
        reporterId: bob.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Monthly compliance audit report',
        description: 'Prepare the monthly compliance audit report for the board. Due by end of month.',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        category: 'COMPLIANCE',
        teamId: compliance.id,
        reporterId: diana.id,
        assigneeId: diana.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Onboard new vendor - CloudSecure Ltd',
        description: 'Complete vendor onboarding checklist for CloudSecure Ltd. Includes security assessment, contract review, and access provisioning.',
        status: 'OPEN',
        priority: 'LOW',
        category: 'OPERATIONAL',
        teamId: operations.id,
        reporterId: eve.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Security vulnerability in auth module - CVE-2026-1234',
        description: 'Critical CVE reported in the authentication module dependency. Patch available, needs testing and deployment.',
        status: 'IN_PROGRESS',
        priority: 'CRITICAL',
        category: 'INCIDENT',
        teamId: engineering.id,
        reporterId: alice.id,
        assigneeId: alice.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Refund processing for order #98765',
        description: 'Customer requested refund for order #98765 due to defective product. Need to verify return status and process the refund.',
        status: 'RESOLVED',
        priority: 'MEDIUM',
        category: 'PAYMENT',
        teamId: operations.id,
        reporterId: diana.id,
        assigneeId: eve.id,
      },
    }),
    prisma.workItem.create({
      data: {
        title: 'Update privacy policy for new data retention rules',
        description: 'Legal has provided updated data retention rules effective next quarter. Privacy policy needs to be updated and published.',
        status: 'OPEN',
        priority: 'HIGH',
        category: 'COMPLIANCE',
        teamId: compliance.id,
        reporterId: eve.id,
      },
    }),
  ]);

  console.log(`✓ Created ${workItems.length} work items`);

  // ─── Create Comments ───────────────────────────────
  await Promise.all([
    prisma.comment.create({
      data: {
        workItemId: workItems[0].id,
        userId: bob.id,
        content: 'Investigated the load balancer logs. Found that backend health checks are timing out during deployments. Working on a fix.',
      },
    }),
    prisma.comment.create({
      data: {
        workItemId: workItems[0].id,
        userId: alice.id,
        content: 'Good find. Can you also check if the connection pool is being exhausted? We saw similar issues last month.',
      },
    }),
    prisma.comment.create({
      data: {
        workItemId: workItems[2].id,
        userId: diana.id,
        content: 'I\'ve identified 3 transactions that don\'t match. Waiting for bank statement from finance team.',
      },
    }),
    prisma.comment.create({
      data: {
        workItemId: workItems[3].id,
        userId: charlie.id,
        content: 'Migration plan documented. Estimated downtime: 15 minutes during off-peak hours.',
      },
    }),
  ]);
  console.log('✓ Created sample comments');

  // ─── Create History Entries ────────────────────────
  await Promise.all([
    prisma.workItemHistory.create({
      data: {
        workItemId: workItems[0].id,
        userId: alice.id,
        action: 'CREATED',
        newValue: JSON.stringify({ title: workItems[0].title }),
      },
    }),
    prisma.workItemHistory.create({
      data: {
        workItemId: workItems[0].id,
        userId: alice.id,
        action: 'ASSIGNED',
        fieldChanged: 'assignee',
        oldValue: 'unassigned',
        newValue: bob.id,
      },
    }),
    prisma.workItemHistory.create({
      data: {
        workItemId: workItems[0].id,
        userId: bob.id,
        action: 'STATUS_CHANGED',
        fieldChanged: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
    }),
  ]);
  console.log('✓ Created history entries');

  // ─── Create Approval ──────────────────────────────
  await prisma.approval.create({
    data: {
      workItemId: workItems[3].id,
      requestedById: charlie.id,
      status: 'PENDING',
    },
  });
  console.log('✓ Created sample approval');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📧 Test accounts (all passwords: "password123"):');
  users.forEach((u) => console.log(`   ${u.email} — ${u.name}`));
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
