import { useState, useEffect } from 'react';
import { User, SafetyEvent } from './types';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inbox } from './pages/Inbox';
import { SifIntelligence } from './pages/SifIntelligence';
import { LifeSavingRules } from './pages/LifeSavingRules';
import { Precursors } from './pages/Precursors';
import { Sites } from './pages/Sites';
import { Review } from './pages/Review';
import { Learning } from './pages/Learning';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { AdminConsole } from './pages/AdminConsole';
import { Detail } from './pages/Detail';
import { WorkerPortal } from './pages/WorkerPortal';
import { TakeAction } from './pages/TakeAction';
import { TrackActions } from './pages/TrackActions';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);
  
  // Theme state (dark / light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('raksha_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('raksha_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

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
    } else if (loggedInUser.role === 'Safety Officer') {
      defaultPage = 'dashboard';
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
    
    if (email === 'worker@refinery.safe' || email === 'field.worker@sifdemo.com') {
      name = 'Field Employee / Worker';
      role = 'Field Worker';
      defaultPage = 'worker-portal';
    } else if (email === 'officer@refinery.safe' || email === 'officer@sifdemo.com') {
      name = 'Safety Officer Lead';
      role = 'Safety Officer';
      defaultPage = 'dashboard';
    } else if (email === 'reviewer@refinery.safe') {
      name = 'Demo Reviewer';
      role = 'Safety Officer';
      defaultPage = 'dashboard';
    } else if (email === 'manager@refinery.safe' || email === 'manager@sifdemo.com') {
      name = 'HSE Manager / Lead';
      role = 'Safety Manager';
      defaultPage = 'dashboard';
    } else if (email === 'admin@refinery.safe' || email === 'admin@sifdemo.com') {
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
      return `Safety Alert: ${selectedEvent.id}`;
    }
    if (user?.role === 'Field Worker' || currentPage === 'worker-portal') {
      return 'Field Worker Safety Portal';
    }
    if (user?.role === 'Safety Officer' && currentPage === 'inbox') {
      return 'Safety Officer Intelligence Console';
    }
    if (user?.role === 'Safety Manager' && currentPage === 'dashboard') {
      return 'Safety Manager Compliance Suite';
    }
    if (user?.role === 'Admin' && currentPage === 'settings') {
      return 'System Administration Console';
    }

    const titles: Record<string, string> = {
      dashboard: user?.role === 'Safety Officer' ? 'Safety Officer Dashboard' : 'Executive Safety Dashboard',
      inbox: 'Safety Alerts',
      analysis: 'Report Analysis Engine',
      sif: 'SIF Risk Intelligence',
      lsr: 'Life-Saving Rules Conformance',
      precursors: 'Recurring Precursor Patterns',
      sites: 'Sites Operational Risk Context',
      review: 'Review & Validate',
      learning: 'GATI Continuous Learning Centre',
      reports: 'Compliance Reports Exporter',
      settings: 'Settings & DB Calibration',
      'worker-portal': 'Field Employee / Worker Safety Portal',
      'take-action': 'Take Action',
      'track-actions': 'Track Actions'
    };
    return titles[currentPage] || 'RAKSHA AI Platform';
  };

  // Field Worker route guard enforcement
  useEffect(() => {
    if (user && user.role === 'Field Worker' && currentPage !== 'worker-portal') {
      setCurrentPage('worker-portal');
      setSelectedEvent(null);
    }
  }, [user, currentPage]);

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
          if (user.role === 'Field Worker') return;
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
        <main className="flex-1 pt-20 px-8 pb-12 overflow-y-auto">
          {currentPage === 'dashboard' && user.role !== 'Field Worker' && (
            <Dashboard 
              onViewEvent={handleViewEvent} 
              triggerNotification={triggerNotification} 
              triggerStateRefresh={triggerStateRefresh} 
              onNavigateTo={setCurrentPage}
              userRole={user.role}
              userName={user.name}
            />
          )}

          {currentPage === 'inbox' && user.role !== 'Field Worker' && (
            <Inbox 
              onViewEvent={handleViewEvent} 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sif' && user.role !== 'Field Worker' && (
            <SifIntelligence 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'lsr' && user.role !== 'Field Worker' && (
            <LifeSavingRules 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'precursors' && user.role !== 'Field Worker' && (
            <Precursors 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sites' && user.role !== 'Field Worker' && (
            <Sites 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'review' && user.role !== 'Field Worker' && (
            <Review 
              reviewerName={user.name} 
              onReviewSubmitted={handleRefreshApp}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'learning' && user.role !== 'Field Worker' && (
            <Learning 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'reports' && user.role !== 'Field Worker' && (
            <Reports />
          )}

          {currentPage === 'settings' && (
            <AdminConsole
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'worker-portal' && (
            <WorkerPortal 
              user={user}
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              onEventCreated={handleRefreshApp}
            />
          )}

          {currentPage === 'take-action' && (
            <TakeAction 
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'track-actions' && (
            <TrackActions 
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
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
