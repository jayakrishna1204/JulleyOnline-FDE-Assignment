"""
Agentic Decision Engine
Interprets user prompt, selects appropriate tool, executes on verified context,
and synthesizes natural language insight with full execution traces.
"""
from typing import Dict, Any, List
from tools import KanbanTools

class KanbanAgent:
    def __init__(self, tenant_info: Dict[str, Any], tasks: List[Dict[str, Any]], activities: List[Dict[str, Any]]):
        self.tenant_info = tenant_info
        self.tools = KanbanTools(tenant_info, tasks, activities)

    def run(self, prompt: str) -> Dict[str, Any]:
        p = prompt.strip().lower()
        tools_executed = []
        reasoning = []

        # 1. Intent Detection & Tool Selection
        if any(w in p for w in ["overdue", "late", "delay", "behind schedule"]):
            reasoning.append("User requested overdue tasks status. Selected tool: 'get_overdue_tasks'.")
            tools_executed.append("get_overdue_tasks")
            overdue = self.tools.get_overdue_tasks()

            if not overdue:
                content = f"✅ Great news! There are **no overdue tasks** in the **{self.tenant_info.get('tenantName')}** branch."
            else:
                lines = [f"⚠️ Found **{len(overdue)} overdue task(s)** in {self.tenant_info.get('tenantName')}:"]
                for t in overdue:
                    lines.append(f"- **{t['title']}** (Priority: {t['priority']}, Assignee: {t['assignee']}, Status: {t['status']})")
                content = "\n".join(lines)

        elif any(w in p for w in ["urgent", "high priority", "critical", "blocking"]):
            reasoning.append("User inquired about high-priority or urgent work items. Selected tool: 'get_urgent_tasks'.")
            tools_executed.append("get_urgent_tasks")
            urgent = self.tools.get_urgent_tasks()

            if not urgent:
                content = f"There are currently no pending high/urgent tasks in **{self.tenant_info.get('tenantName')}**."
            else:
                lines = [f"🚨 **High & Urgent Tasks in {self.tenant_info.get('tenantName')}**:"]
                for t in urgent:
                    lines.append(f"- **[{t['priority']}]** {t['title']} — assigned to *{t['assignee']}* ({t['status']})")
                content = "\n".join(lines)

        elif any(w in p for w in ["activity", "history", "recent", "log", "who did what", "audit"]):
            reasoning.append("User requested audit history. Selected tool: 'get_activity_logs'.")
            tools_executed.append("get_activity_logs")
            logs = self.tools.get_activity_logs(limit=5)

            if not logs:
                content = f"No recent activity logs recorded for **{self.tenant_info.get('tenantName')}**."
            else:
                lines = [f"📋 **Recent Activity Trail for {self.tenant_info.get('tenantName')}**:"]
                for log in logs:
                    lines.append(f"- **{log.get('user', 'User')}** performed **{log.get('action')}** on {log.get('entityType')}")
                content = "\n".join(lines)

        else:
            # Default: Board progress and completion summary
            reasoning.append("User asked for general overview or board summary. Selected tool: 'get_board_summary'.")
            tools_executed.append("get_board_summary")
            summary = self.tools.get_board_summary()

            content = (
                f"📊 **Executive Summary for {summary['tenant_name']} Branch**\n"
                f"Board: *{summary['board_name']}*\n\n"
                f"- **Total Work Items:** {summary['total_tasks']}\n"
                f"- **To Do:** {summary['to_do']}\n"
                f"- **In Progress:** {summary['in_progress']}\n"
                f"- **Testing:** {summary['testing']}\n"
                f"- **Done:** {summary['done']}\n"
                f"- **Completion Rate:** {summary['completion_rate_percentage']}%\n"
                f"- **Overdue Count:** {summary['overdue_count']}\n\n"
                f"*(Data strictly verified and isolated to tenant: {self.tenant_info.get('tenantName')})*"
            )

        return {
            "source": "Python FastAPI Agent Service",
            "prompt": prompt,
            "reasoning": reasoning,
            "tools_used": tools_executed,
            "response": content
        }
