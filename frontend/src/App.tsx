import { useState, useEffect } from 'react';
import { User, SafetyEvent } from './types';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { Analysis } from './pages/Analysis';
import { SifIntelligence } from './pages/SifIntelligence';
import { LifeSavingRules } from './pages/LifeSavingRules';
import { Precursors } from './pages/Precursors';
import { Sites } from './pages/Sites';
import { Review } from './pages/Review';
import { Learning } from './pages/Learning';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Detail } from './pages/Detail';
import { WorkerPortal } from './pages/WorkerPortal';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);
  
  // Notification system
  const [notifications, setNotifications] = useState<string[]>([
    "Review required: EVT-10291 (High SIF Potential isolated breaker bypass)",
    "3 similar precursor reports detected at CDU Area 4"
  ]);

  // System parameters
  const [systemStatus, setSystemStatus] = useState({
    aiEngine: 'Online',
    gati: 'Learning',
    data: 'Healthy'
  });

  // State refresher trigger to push updates across components when reviews or analyses are completed
  const [triggerStateRefresh, setTriggerStateRefresh] = useState(false);

  const triggerNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev]);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    
    // Role based routing redirection
    let defaultPage = 'dashboard';
    if (loggedInUser.role === 'Field Worker') {
      defaultPage = 'worker-portal';
    } else if (loggedInUser.role === 'AI Pipeline Viewer') {
      defaultPage = 'analysis';
    } else if (loggedInUser.role === 'Safety Officer') {
      defaultPage = 'inbox';
    } else if (loggedInUser.role === 'Admin') {
      defaultPage = 'settings';
    }
    
    setCurrentPage(defaultPage);
    triggerNotification(`Authorized as: ${loggedInUser.name} (${loggedInUser.role})`);
  };

  const handleSwitchPersona = (email: string) => {
    let name = 'Demo User';
    let role = 'Safety Manager';
    let defaultPage = 'dashboard';
    
    if (email === 'worker@refinery.safe') {
      name = 'Field Employee / Worker';
      role = 'Field Worker';
      defaultPage = 'worker-portal';
    } else if (email === 'pipeline@sifshield.ai') {
      name = 'AI Ingestion Pipeline';
      role = 'AI Pipeline Viewer';
      defaultPage = 'analysis';
    } else if (email === 'officer@refinery.safe') {
      name = 'Safety Officer Lead';
      role = 'Safety Officer';
      defaultPage = 'inbox';
    } else if (email === 'reviewer@refinery.safe') {
      name = 'Demo Reviewer';
      role = 'Safety Officer';
      defaultPage = 'inbox';
    } else if (email === 'manager@refinery.safe') {
      name = 'HSE Manager / Lead';
      role = 'Safety Manager';
      defaultPage = 'dashboard';
    } else if (email === 'admin@refinery.safe') {
      name = 'System Administrator';
      role = 'Admin';
      defaultPage = 'settings';
    }

    const updatedUser = {
      email,
      name,
      role,
      token: `mock-jwt-token-for-${role.toLowerCase().replace(' ', '-')}`
    };
    
    setUser(updatedUser);
    setCurrentPage(defaultPage);
    setSelectedEvent(null);
    triggerNotification(`Switched persona to: ${name} (${role})`);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('dashboard');
    setSelectedEvent(null);
  };

  const handleViewEvent = (evt: SafetyEvent) => {
    setSelectedEvent(evt);
    setCurrentPage('detail');
  };

  const handleBackToInbox = () => {
    setSelectedEvent(null);
    setCurrentPage('inbox');
  };

  const handleRefreshApp = () => {
    setTriggerStateRefresh(prev => !prev);
  };

  const getPageTitle = () => {
    if (currentPage === 'detail' && selectedEvent) {
      return `Safety Event: ${selectedEvent.id}`;
    }
    const titles: Record<string, string> = {
      dashboard: 'Executive Safety Dashboard',
      inbox: 'Safety Event Inbox Logs',
      analysis: 'Report Analysis Engine',
      sif: 'SIF Risk Intelligence',
      lsr: 'Life-Saving Rules conformance',
      precursors: 'Recurring Precursor Patterns',
      sites: 'Sites operational Risk Context',
      review: 'HSE Assurance & Review Queue',
      learning: 'GATI Continuous Learning Centre',
      reports: 'Compliance Reports Exporter',
      settings: 'Settings & DB Calibration',
      'worker-portal': 'Field Employee / Worker Safety Portal'
    };
    return titles[currentPage] || 'SIF-SHIELD AI Platform';
  };

  // If not logged in, force Login screen
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex bg-[#F7F9FC] min-h-screen text-[#0B2A56]">
      {/* Left Navigation Sidebar */}
      <Sidebar 
        currentPage={currentPage === 'detail' ? 'inbox' : currentPage} 
        setCurrentPage={(page) => {
          setSelectedEvent(null);
          setCurrentPage(page);
        }} 
        systemStatus={systemStatus} 
        userRole={user.role}
      />

      {/* Main Container Layout */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        
        {/* Top Header widgets */}
        <Topbar 
          user={user} 
          onLogout={handleLogout} 
          title={getPageTitle()}
          notifications={notifications}
          clearNotifications={() => setNotifications([])}
          onSwitchPersona={handleSwitchPersona}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 mt-16 p-8 overflow-y-auto">
          {currentPage === 'dashboard' && (
            <Dashboard 
              onViewEvent={handleViewEvent} 
              triggerNotification={triggerNotification} 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'inbox' && (
            <Inbox 
              onViewEvent={handleViewEvent} 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'analysis' && (
            <Analysis 
              onEventCreated={handleRefreshApp}
              onViewEvent={handleViewEvent}
              triggerNotification={triggerNotification}
            />
          )}

          {currentPage === 'sif' && (
            <SifIntelligence 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'lsr' && (
            <LifeSavingRules 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'precursors' && (
            <Precursors 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sites' && (
            <Sites 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'review' && (
            <Review 
              reviewerName={user.name} 
              onReviewSubmitted={handleRefreshApp}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'learning' && (
            <Learning 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'reports' && (
            <Reports />
          )}

          {currentPage === 'settings' && (
            <Settings 
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
            />
          )}

          {currentPage === 'worker-portal' && (
            <WorkerPortal 
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              onEventCreated={handleRefreshApp}
            />
          )}

          {currentPage === 'detail' && selectedEvent && (
            <Detail 
              event={selectedEvent} 
              onBack={handleBackToInbox} 
              reviewerName={user.name} 
              onReviewSubmitted={handleRefreshApp} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
