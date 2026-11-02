const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data in reverse order of dependencies
  await prisma.activityLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.column.deleteMany({});
  await prisma.board.deleteMany({});
  await prisma.membership.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.organization.deleteMany({});

  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Create Organizations
  console.log('Creating organizations...');
  const orgAbc = await prisma.organization.create({
    data: { name: 'ABC Technologies' }
  });

  const orgXyz = await prisma.organization.create({
    data: { name: 'XYZ Solutions' }
  });

  // 2. Create Tenants
  console.log('Creating tenants...');
  const tenantHyd = await prisma.tenant.create({
    data: { organizationId: orgAbc.id, name: 'Hyderabad' }
  });
  const tenantBlr = await prisma.tenant.create({
    data: { organizationId: orgAbc.id, name: 'Bangalore' }
  });
  const tenantChn = await prisma.tenant.create({
    data: { organizationId: orgAbc.id, name: 'Chennai' }
  });

  const tenantMum = await prisma.tenant.create({
    data: { organizationId: orgXyz.id, name: 'Mumbai' }
  });
  const tenantPun = await prisma.tenant.create({
    data: { organizationId: orgXyz.id, name: 'Pune' }
  });

  // 3. Create Users
  console.log('Creating users...');
  const userRahul = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      email: 'rahul@abctech.com',
      passwordHash: passwordHash
    }
  });

  const userPriya = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@abctech.com',
      passwordHash: passwordHash
    }
  });

  const userArjun = await prisma.user.create({
    data: {
      name: 'Arjun Verma',
      email: 'arjun@abctech.com',
      passwordHash: passwordHash
    }
  });

  const userSneha = await prisma.user.create({
    data: {
      name: 'Sneha Reddy',
      email: 'sneha@abctech.com',
      passwordHash: passwordHash
    }
  });

  const userKiran = await prisma.user.create({
    data: {
      name: 'Kiran Desai',
      email: 'kiran@xyzsol.com',
      passwordHash: passwordHash
    }
  });

  // 4. Create Memberships
  console.log('Creating memberships...');
  // Rahul is Org Admin of ABC, and member of Hyderabad
  await prisma.membership.create({
    data: {
      userId: userRahul.id,
      organizationId: orgAbc.id,
      tenantId: tenantHyd.id,
      role: 'Org Admin'
    }
  });

  // Priya is Tenant Admin of Hyderabad
  await prisma.membership.create({
    data: {
      userId: userPriya.id,
      organizationId: orgAbc.id,
      tenantId: tenantHyd.id,
      role: 'Tenant Admin'
    }
  });

  // Arjun is Member in Hyderabad
  await prisma.membership.create({
    data: {
      userId: userArjun.id,
      organizationId: orgAbc.id,
      tenantId: tenantHyd.id,
      role: 'Member'
    }
  });

  // Sneha is Tenant Admin in Bangalore
  await prisma.membership.create({
    data: {
      userId: userSneha.id,
      organizationId: orgAbc.id,
      tenantId: tenantBlr.id,
      role: 'Tenant Admin'
    }
  });

  // Kiran is Member in Mumbai (XYZ Solutions)
  await prisma.membership.create({
    data: {
      userId: userKiran.id,
      organizationId: orgXyz.id,
      tenantId: tenantMum.id,
      role: 'Member'
    }
  });

  // Helper to create 4 standard columns
  async function createStandardColumns(boardId, tenantId) {
    const colTodo = await prisma.column.create({
      data: { boardId, tenantId, name: 'To Do', position: 0 }
    });
    const colInProgress = await prisma.column.create({
      data: { boardId, tenantId, name: 'In Progress', position: 1 }
    });
    const colTesting = await prisma.column.create({
      data: { boardId, tenantId, name: 'Testing', position: 2 }
    });
    const colDone = await prisma.column.create({
      data: { boardId, tenantId, name: 'Done', position: 3 }
    });
    return { colTodo, colInProgress, colTesting, colDone };
  }

  // 5. Create Boards & Columns
  console.log('Creating boards & columns...');
  // Hyderabad Board 1: Website Development
  const boardWebDev = await prisma.board.create({
    data: {
      organizationId: orgAbc.id,
      tenantId: tenantHyd.id,
      name: 'Website Development',
      description: 'Customer-facing responsive web portal redesign project',
      createdBy: userRahul.id
    }
  });
  const hydCols1 = await createStandardColumns(boardWebDev.id, tenantHyd.id);

  // Hyderabad Board 2: Mobile Application Development
  const boardMobDev = await prisma.board.create({
    data: {
      organizationId: orgAbc.id,
      tenantId: tenantHyd.id,
      name: 'Mobile Application Development',
      description: 'iOS and Android client application with offline sync',
      createdBy: userPriya.id
    }
  });
  const hydCols2 = await createStandardColumns(boardMobDev.id, tenantHyd.id);

  // Bangalore Board 1: CRM Development
  const boardCrm = await prisma.board.create({
    data: {
      organizationId: orgAbc.id,
      tenantId: tenantBlr.id,
      name: 'CRM Development',
      description: 'Internal customer relationship management system',
      createdBy: userSneha.id
    }
  });
  const blrCols1 = await createStandardColumns(boardCrm.id, tenantBlr.id);

  // Bangalore Board 2: AI Automation
  const boardAi = await prisma.board.create({
    data: {
      organizationId: orgAbc.id,
      tenantId: tenantBlr.id,
      name: 'AI Automation',
      description: 'Agentic workflows and automated ticket processing',
      createdBy: userSneha.id
    }
  });
  await createStandardColumns(boardAi.id, tenantBlr.id);

  // Mumbai Board: Customer Support Platform
  const boardSupport = await prisma.board.create({
    data: {
      organizationId: orgXyz.id,
      tenantId: tenantMum.id,
      name: 'Customer Support Platform',
      description: 'XYZ omnichannel support ticketing dashboard',
      createdBy: userKiran.id
    }
  });
  const mumCols = await createStandardColumns(boardSupport.id, tenantMum.id);

  // 6. Create Tasks for Hyderabad Website Development
  console.log('Creating tasks for Hyderabad...');
  const now = new Date();
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const overdueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const task1 = await prisma.task.create({
    data: {
      boardId: boardWebDev.id,
      columnId: hydCols1.colTodo.id,
      tenantId: tenantHyd.id,
      title: 'Design Login and SSO Flow',
      description: 'Create Figma wireframes and secure JWT cookie specifications.',
      assignedTo: userRahul.id,
      priority: 'High',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  const task2 = await prisma.task.create({
    data: {
      boardId: boardWebDev.id,
      columnId: hydCols1.colTodo.id,
      tenantId: tenantHyd.id,
      title: 'Fix API Input Validation',
      description: 'Ensure Zod schema rejects malformed UUIDs and dangerous input.',
      assignedTo: userArjun.id,
      priority: 'Medium',
      dueDate: overdueDate,
      position: 1,
      version: 1
    }
  });

  const task3 = await prisma.task.create({
    data: {
      boardId: boardWebDev.id,
      columnId: hydCols1.colInProgress.id,
      tenantId: tenantHyd.id,
      title: 'Develop Registration API',
      description: 'Implement bcrypt hashing, rate limiting, and email uniqueness checks.',
      assignedTo: userArjun.id,
      priority: 'Urgent',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  const task4 = await prisma.task.create({
    data: {
      boardId: boardWebDev.id,
      columnId: hydCols1.colTesting.id,
      tenantId: tenantHyd.id,
      title: 'Test Authentication Flow',
      description: 'Run integration test suite across multi-tenant session tokens.',
      assignedTo: userPriya.id,
      priority: 'High',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  const task5 = await prisma.task.create({
    data: {
      boardId: boardWebDev.id,
      columnId: hydCols1.colDone.id,
      tenantId: tenantHyd.id,
      title: 'Deploy Dashboard Framework',
      description: 'Set up Vite, Tailwind CSS, and core layout components.',
      assignedTo: userRahul.id,
      priority: 'Low',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  // Mobile App tasks
  await prisma.task.create({
    data: {
      boardId: boardMobDev.id,
      columnId: hydCols2.colTodo.id,
      tenantId: tenantHyd.id,
      title: 'Implement Push Notification Tokens',
      description: 'Integrate FCM service worker and payload routing.',
      assignedTo: userPriya.id,
      priority: 'Medium',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  // 7. Create Bangalore Tasks (Confidential from Hyderabad!)
  console.log('Creating Bangalore tasks (isolated data)...');
  await prisma.task.create({
    data: {
      boardId: boardCrm.id,
      columnId: blrCols1.colTodo.id,
      tenantId: tenantBlr.id,
      title: 'Customer Lead Scoring Algorithm',
      description: 'Bangalore confidential sales pipeline algorithm and predictive weights.',
      assignedTo: userSneha.id,
      priority: 'Urgent',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  await prisma.task.create({
    data: {
      boardId: boardCrm.id,
      columnId: blrCols1.colInProgress.id,
      tenantId: tenantBlr.id,
      title: 'Salesforce Webhook Ingestion',
      description: 'Receive event stream and sync opportunity stages into PostgreSQL.',
      assignedTo: userSneha.id,
      priority: 'High',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  // Mumbai tasks
  await prisma.task.create({
    data: {
      boardId: boardSupport.id,
      columnId: mumCols.colTodo.id,
      tenantId: tenantMum.id,
      title: 'Zendesk Ticket Migration',
      description: 'Extract legacy tickets and load into Mumbai database schema.',
      assignedTo: userKiran.id,
      priority: 'Medium',
      dueDate: nextWeek,
      position: 0,
      version: 1
    }
  });

  // 8. Create Activity Logs
  console.log('Creating activity logs...');
  await prisma.activityLog.create({
    data: {
      tenantId: tenantHyd.id,
      userId: userRahul.id,
      entityType: 'Board',
      entityId: boardWebDev.id,
      action: 'Created',
      details: { name: boardWebDev.name }
    }
  });

  await prisma.activityLog.create({
    data: {
      tenantId: tenantHyd.id,
      userId: userRahul.id,
      entityType: 'Task',
      entityId: task1.id,
      action: 'Created',
      details: { title: task1.title, column: 'To Do' }
    }
  });

  await prisma.activityLog.create({
    data: {
      tenantId: tenantHyd.id,
      userId: userArjun.id,
      entityType: 'Task',
      entityId: task3.id,
      action: 'Moved',
      details: { title: task3.title, from: 'To Do', to: 'In Progress' }
    }
  });

  console.log('✅ Seeding completed successfully!');
  console.log('\n--- Test Accounts Ready ---');
  console.log('1. Rahul Sharma (Org Admin @ ABC, Hyderabad) -> rahul@abctech.com / Password123!');
  console.log('2. Priya Patel (Tenant Admin @ Hyderabad)     -> priya@abctech.com / Password123!');
  console.log('3. Arjun Verma (Member @ Hyderabad)           -> arjun@abctech.com / Password123!');
  console.log('4. Sneha Reddy (Tenant Admin @ Bangalore)     -> sneha@abctech.com / Password123!');
  console.log('5. Kiran Desai (Member @ Mumbai, XYZ Sol)     -> kiran@xyzsol.com / Password123!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
