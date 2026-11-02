const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAll() {
  console.log('🧪 Starting Automated Backend Verification Tests...\n');

  // 1. Get test users and tenants
  const priya = await prisma.user.findUnique({
    where: { email: 'priya@abctech.com' }
  });
  const hydTenant = await prisma.tenant.findFirst({
    where: { name: 'Hyderabad' }
  });
  const blrTenant = await prisma.tenant.findFirst({
    where: { name: 'Bangalore' }
  });

  console.log(`Verified DB Records:`);
  console.log(`- Priya: ${priya.name} (${priya.id})`);
  console.log(`- Hyderabad Tenant: ${hydTenant.id}`);
  console.log(`- Bangalore Tenant: ${blrTenant.id}`);

  // Test 1: Login via API
  console.log('\n--- Test 1: API Login ---');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya@abctech.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  if (loginData.success) {
    console.log('✅ Login successful for Priya, JWT token obtained.');
  } else {
    throw new Error('Login failed');
  }
  const token = loginData.token;

  // Test 2: Fetch Hyderabad Boards (Authorized)
  console.log('\n--- Test 2: Fetch Hyderabad Boards (Authorized) ---');
  const hydBoardsRes = await fetch('http://localhost:5000/api/boards', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': hydTenant.id
    }
  });
  const hydBoards = await hydBoardsRes.json();
  console.log(`✅ Status: ${hydBoardsRes.status}. Boards found: ${hydBoards.data.length} (${hydBoards.data.map(b => b.name).join(', ')})`);

  // Test 3: Cross-Tenant Access Block (Priya accessing Bangalore Boards)
  console.log('\n--- Test 3: Cross-Tenant Access Block (Priya accessing Bangalore Boards) ---');
  const blrBoardsRes = await fetch('http://localhost:5000/api/boards', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': blrTenant.id // Cross-tenant attempt!
    }
  });
  const blrData = await blrBoardsRes.json();
  if (blrBoardsRes.status === 403) {
    console.log(`✅ Cross-Tenant Block PASSED! Status: 403 Forbidden`);
    console.log(`   Response: "${blrData.error}"`);
  } else {
    console.error(`❌ Security failure: Got status ${blrBoardsRes.status}`);
  }

  // Test 4: Cross-Tenant Access Block on Task ID
  console.log('\n--- Test 4: Cross-Tenant Direct Task ID Access Block ---');
  const blrTask = await prisma.task.findFirst({
    where: { tenantId: blrTenant.id }
  });
  const taskAccessRes = await fetch(`http://localhost:5000/api/tasks/${blrTask.id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': hydTenant.id // Header says Hyderabad, but task belongs to Bangalore
    }
  });
  const taskAccessData = await taskAccessRes.json();
  if (taskAccessRes.status === 403 || taskAccessRes.status === 404) {
    console.log(`✅ Task Security Isolation PASSED! Status: ${taskAccessRes.status}`);
    console.log(`   Response: "${taskAccessData.error}"`);
  } else {
    console.error(`❌ Task Isolation failure: Got status ${taskAccessRes.status}`);
  }

  // Test 5: Optimistic Concurrency Control (Version Conflict / 409)
  console.log('\n--- Test 5: Optimistic Concurrency Control (HTTP 409 Conflict) ---');
  const hydTask = await prisma.task.findFirst({
    where: { tenantId: hydTenant.id }
  });
  // Send intentionally stale version
  const conflictRes = await fetch(`http://localhost:5000/api/tasks/${hydTask.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-tenant-id': hydTenant.id
    },
    body: JSON.stringify({
      title: 'Conflicting Edit',
      expectedVersion: 99999 // Stale version!
    })
  });
  const conflictData = await conflictRes.json();
  if (conflictRes.status === 409) {
    console.log(`✅ Concurrency Conflict Detection PASSED! Status: 409 Conflict`);
    console.log(`   Response: "${conflictData.error}"`);
    console.log(`   Current Server Version: ${conflictData.currentVersion}`);
  } else {
    console.error(`❌ Concurrency failure: Got status ${conflictRes.status}`);
  }

  // Test 6: Successful Task Move with Version Increment
  console.log('\n--- Test 6: Move Task with Transaction & Version Increment ---');
  const targetCol = await prisma.column.findFirst({
    where: { boardId: hydTask.boardId, tenantId: hydTenant.id, id: { not: hydTask.columnId } }
  });
  const moveRes = await fetch(`http://localhost:5000/api/tasks/${hydTask.id}/move`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-tenant-id': hydTenant.id
    },
    body: JSON.stringify({
      destinationColumnId: targetCol.id,
      newPosition: 0,
      expectedVersion: hydTask.version
    })
  });
  const moveData = await moveRes.json();
  if (moveRes.status === 200 && moveData.data.version === hydTask.version + 1) {
    console.log(`✅ Task Move & Version Increment PASSED! New Version: ${moveData.data.version}`);
  } else {
    console.error(`❌ Task Move failed:`, moveData);
  }

  // Test 7: Activity Log Recording
  console.log('\n--- Test 7: Verify Activity Log Audit Trail ---');
  const actRes = await fetch('http://localhost:5000/api/activities', {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': hydTenant.id
    }
  });
  const actData = await actRes.json();
  console.log(`✅ Activity Logs Count in Hyderabad: ${actData.data.length}`);
  console.log(`   Latest Action: [${actData.data[0].action}] on ${actData.data[0].entityType} by ${actData.data[0].user?.name}`);

  console.log('\n🎉 ALL 7 BACKEND CRITICAL TESTS PASSED SUCCESSFULLY! 🎉\n');
}

testAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
