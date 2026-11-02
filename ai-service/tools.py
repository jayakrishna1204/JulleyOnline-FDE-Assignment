"""
Agent Tools for Collaborative Kanban Assistant
All tools operate on verified, tenant-scoped context supplied by the backend.
Cross-tenant execution is architecturally impossible.
"""
from typing import List, Dict, Any
from datetime import datetime

class KanbanTools:
    def __init__(self, tenant_info: Dict[str, Any], tasks: List[Dict[str, Any]], activities: List[Dict[str, Any]]):
        self.tenant_info = tenant_info
        self.tasks = tasks
        self.activities = activities

    def get_board_summary(self) -> Dict[str, Any]:
        """Calculates board statistics, status breakdown, and overall completion rate."""
        total = len(self.tasks)
        done = sum(1 for t in self.tasks if t.get('status') == 'Done')
        in_progress = sum(1 for t in self.tasks if t.get('status') == 'In Progress')
        todo = sum(1 for t in self.tasks if t.get('status') == 'To Do')
        testing = sum(1 for t in self.tasks if t.get('status') == 'Testing')
        overdue = sum(1 for t in self.tasks if t.get('isOverdue'))

        rate = round((done / total * 100), 1) if total > 0 else 0.0

        return {
            "tenant_name": self.tenant_info.get("tenantName"),
            "board_name": self.tenant_info.get("boardName"),
            "total_tasks": total,
            "to_do": todo,
            "in_progress": in_progress,
            "testing": testing,
            "done": done,
            "overdue_count": overdue,
            "completion_rate_percentage": rate
        }

    def get_overdue_tasks(self) -> List[Dict[str, Any]]:
        """Returns all tasks past their due date that are not yet marked as Done."""
        return [
            {
                "title": t.get("title"),
                "priority": t.get("priority"),
                "assignee": t.get("assignee"),
                "due_date": t.get("dueDate"),
                "status": t.get("status")
            }
            for t in self.tasks
            if t.get("isOverdue")
        ]

    def get_urgent_tasks(self) -> List[Dict[str, Any]]:
        """Returns all tasks flagged as Urgent or High priority."""
        return [
            {
                "title": t.get("title"),
                "priority": t.get("priority"),
                "assignee": t.get("assignee"),
                "status": t.get("status")
            }
            for t in self.tasks
            if t.get("priority") in ["Urgent", "High"] and t.get("status") != "Done"
        ]

    def get_tasks(self, status: str = None) -> List[Dict[str, Any]]:
        """Returns tasks filtered by column status."""
        if not status:
            return self.tasks
        return [t for t in self.tasks if t.get("status", "").lower() == status.lower()]

    def get_activity_logs(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Returns the most recent activity logs for this tenant."""
        return self.activities[:limit]
