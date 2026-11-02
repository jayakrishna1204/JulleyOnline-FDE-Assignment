from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os

from agent import KanbanAgent

app = FastAPI(
    title="JulleyOnline Agentic AI Assistant",
    description="Multi-Tenant Kanban Intelligence & Analysis Agent",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str
    tenantInfo: Dict[str, Any]
    tasks: List[Dict[str, Any]] = Field(default_factory=list)
    activities: List[Dict[str, Any]] = Field(default_factory=list)
    userId: Optional[str] = None
    userRole: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "JulleyOnline Agentic AI Service",
        "runtime": "Python / FastAPI",
        "tenant_isolation_mode": "strict_context_injection"
    }

@app.post("/api/agent/chat")
def chat_with_agent(req: ChatRequest):
    if not req.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    agent = KanbanAgent(
        tenant_info=req.tenantInfo,
        tasks=req.tasks,
        activities=req.activities
    )

    result = agent.run(req.prompt)
    return result

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("AI_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
