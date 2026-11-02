const prisma = require('../config/database');
const { AI_SERVICE_URL } = require('../config/environment');

/**
 * Handle AI Kanban Assistant requests
 * Calls Python agentic service or provides deterministic fallback
 */
async function chatWithAssistant(req, res, next) {
  try {
    const { message, boardId } = req.body;
    const tenantId = req.tenantId;
    const userId = req.user.id;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message prompt is required'
      });
    }

    // 1. Gather trusted tenant data (never trust client to supply raw data)
    const [tasks, activities, board] = await Promise.all([
      prisma.task.findMany({
        where: { tenantId, ...(boardId ? { boardId } : {}) },
        include: {
          column: { select: { name: true } },
          assignee: { select: { name: true } }
        }
      }),
      prisma.activityLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { name: true } } }
      }),
      boardId ? prisma.board.findFirst({ where: { id: boardId, tenantId } }) : null
    ]);

    const tenantInfo = {
      tenantId,
      tenantName: req.tenant.name,
      organizationName: req.tenant.organization?.name,
      boardName: board ? board.name : 'All Boards'
    };

    const taskContext = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.column?.name,
      priority: t.priority,
      assignee: t.assignee?.name || 'Unassigned',
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      isOverdue: t.dueDate ? new Date(t.dueDate) < new Date() && t.column?.name !== 'Done' : false
    }));

    const activityContext = activities.map((a) => ({
      action: a.action,
      entityType: a.entityType,
      user: a.user?.name || 'System',
      time: a.createdAt.toISOString(),
      details: a.details
    }));

    // 2. Try calling the Python Agentic AI Service using runtime binding
    let agentResult = null;
    try {
      // Resolve bound variable at runtime inside function
      const aiBaseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const targetUrl = new URL(
        'api/agent/chat',
        aiBaseUrl.endsWith('/') ? aiBaseUrl : `${aiBaseUrl}/`
      ).toString();

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          tenantInfo,
          tasks: taskContext,
          activities: activityContext,
          userId,
          userRole: req.userRole
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (response.ok) {
        agentResult = await response.json();
      }
    } catch (err) {
      // Python AI service offline or taking too long, fallback to built-in agent engine
    }

    // 3. Built-in Agent Engine fallback if Python service is offline
    if (!agentResult) {
      agentResult = executeLocalAgentLogic(message, tenantInfo, taskContext, activityContext);
    }

    res.json({
      success: true,
      data: agentResult
    });
  } catch (error) {
    next(error);
  }
}

function executeLocalAgentLogic(prompt, tenantInfo, tasks, activities) {
  const lower = prompt.toLowerCase();
  const toolsUsed = [];

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'Done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress').length;
  const todoTasks = tasks.filter((t) => t.status === 'To Do').length;
  const testingTasks = tasks.filter((t) => t.status === 'Testing').length;
  const overdueTasks = tasks.filter((t) => t.isOverdue);
  const urgentTasks = tasks.filter((t) => t.priority === 'Urgent' || t.priority === 'High');

  let answer = '';

  if (lower.includes('overdue') || lower.includes('late') || lower.includes('delayed')) {
    toolsUsed.push({ tool: 'get_overdue_tasks', params: { tenantId: tenantInfo.tenantId } });
    if (overdueTasks.length === 0) {
      answer = `Great news! There are currently **no overdue tasks** in the ${tenantInfo.tenantName} branch.`;
    } else {
      answer = `### ⚠️ Overdue Tasks in ${tenantInfo.tenantName}:\nFound **${overdueTasks.length} overdue task(s)**:\n` +
        overdueTasks.map((t) => `- **${t.title}** (Priority: ${t.priority}, Assignee: ${t.assignee}, Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'})`).join('\n');
    }
  } else if (lower.includes('urgent') || lower.includes('priority')) {
    toolsUsed.push({ tool: 'get_high_priority_tasks', params: { tenantId: tenantInfo.tenantId } });
    answer = `### 🚨 High / Urgent Tasks in ${tenantInfo.tenantName}:\n` +
      urgentTasks.map((t) => `- **[${t.priority}]** ${t.title} (Status: ${t.status}, Assigned to: ${t.assignee})`).join('\n');
  } else if (lower.includes('activity') || lower.includes('history') || lower.includes('recent') || lower.includes('today')) {
    toolsUsed.push({ tool: 'get_activity_logs', params: { tenantId: tenantInfo.tenantId, limit: 5 } });
    answer = `### 📋 Recent Activities for ${tenantInfo.tenantName}:\n` +
      activities.slice(0, 5).map((a) => `- **${a.user}** ${a.action.toLowerCase()} a ${a.entityType.toLowerCase()} (${new Date(a.time).toLocaleTimeString()})`).join('\n');
  } else {
    toolsUsed.push({ tool: 'get_board_summary', params: { tenantId: tenantInfo.tenantId } });
    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    answer = `### 📊 ${tenantInfo.tenantName} Board Summary (${tenantInfo.boardName})\n` +
      `- **Total Tasks:** ${totalTasks}\n` +
      `- **To Do:** ${todoTasks}\n` +
      `- **In Progress:** ${inProgressTasks}\n` +
      `- **Testing:** ${testingTasks}\n` +
      `- **Done:** ${doneTasks}\n` +
      `- **Completion Rate:** ${completionRate}%\n` +
      `- **Overdue Tasks:** ${overdueTasks.length}\n\n` +
      `*All metrics strictly filtered for isolated branch: ${tenantInfo.tenantName} (${tenantInfo.organizationName})*`;
  }

  return {
    source: 'Deterministic AI Agent Engine',
    prompt,
    toolsUsed,
    response: answer,
    tenantContext: {
      tenantName: tenantInfo.tenantName,
      totalTasks
    }
  };
}

module.exports = {
  chatWithAssistant
};
