import React, { useState } from 'react';
import { Navbar } from '../components/Navbar/Navbar';
import { KanbanBoard } from '../components/KanbanBoard/KanbanBoard';
import { AIAssistantDrawer } from '../components/AIAssistant/AIAssistantDrawer';
import { ActivityDrawer } from '../components/Activity/ActivityDrawer';
import { ConcurrencyAndSecurityTester } from '../components/Testing/ConcurrencyAndSecurityTester';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { selectedTenant } = useAuth();
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [testerOpen, setTesterOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Navigation */}
      <Navbar
        onOpenAI={() => setAiDrawerOpen(true)}
        onOpenActivities={() => setActivityDrawerOpen(true)}
        onOpenTester={() => setTesterOpen(true)}
      />

      {/* Main Board View */}
      <main className="flex-1 flex flex-col min-h-0">
        <KanbanBoard />
      </main>

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        tenantName={selectedTenant?.name || 'Current Branch'}
      />

      {/* Activity Trail Drawer */}
      <ActivityDrawer
        isOpen={activityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        tenantName={selectedTenant?.name || 'Current Branch'}
      />

      {/* Concurrency and Security Test Suite Modal */}
      <ConcurrencyAndSecurityTester
        isOpen={testerOpen}
        onClose={() => setTesterOpen(false)}
      />
    </div>
  );
};
