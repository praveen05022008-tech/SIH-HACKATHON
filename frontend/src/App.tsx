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
import { SafetyManager } from './pages/SafetyManager';
import { apiUrl } from './config/api';

function App() {
  // Persistent user state from localStorage
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('raksha_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Persistent navigation state from localStorage
  const [currentPage, setCurrentPage] = useState<string>(() => {
    try {
      const savedPage = localStorage.getItem('raksha_current_page');
      if (savedPage) return savedPage;
      const savedUser = localStorage.getItem('raksha_auth_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.role === 'Employee' || u.role === 'Field Worker') return 'worker-portal';
        if (u.role === 'Officer' || u.role === 'Safety Officer') return 'dashboard';
        if (u.role === 'Manager' || u.role === 'Safety Manager') return 'manager';
        if (u.role === 'Admin') return 'settings';
      }
    } catch {}
    return 'dashboard';
  });

  const [selectedEvent, setSelectedEvent] = useState<SafetyEvent | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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

  // Sync user state changes to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('raksha_auth_user', JSON.stringify(user));
      if (user.token) {
        localStorage.setItem('raksha_auth_token', user.token);
      }
    } else {
      localStorage.removeItem('raksha_auth_user');
      localStorage.removeItem('raksha_auth_token');
      localStorage.removeItem('raksha_current_page');
    }
  }, [user]);

  // Sync page changes to localStorage
  useEffect(() => {
    if (user && currentPage) {
      localStorage.setItem('raksha_current_page', currentPage);
    }
  }, [currentPage, user]);

  // Verify and refresh session on mount
  useEffect(() => {
    const token = localStorage.getItem('raksha_auth_token');
    const savedUserStr = localStorage.getItem('raksha_auth_user');
    if (!token && !savedUserStr) return;

    let userEmail = '';
    try {
      if (savedUserStr) {
        userEmail = JSON.parse(savedUserStr).email;
      }
    } catch {}

    fetch(apiUrl('/api/auth/me'), {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'X-User-Email': userEmail || ''
      }
    })
      .then(async (res) => {
        if (res.ok) {
          return res.json();
        }
        if (res.status === 401 || res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          console.warn('Session expired or invalidated:', errData);
          handleLogout();
        }
        return null;
      })
      .then((freshUserData) => {
        if (freshUserData && freshUserData.email) {
          setUser(prev => ({
            ...(prev || {}),
            ...freshUserData,
            token: freshUserData.token || token
          }));
        }
      })
      .catch((err) => {
        console.warn('Session verification notice:', err);
      });
  }, []);

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
    if (loggedInUser.token) {
      localStorage.setItem('raksha_auth_token', loggedInUser.token);
    }
    localStorage.setItem('raksha_auth_user', JSON.stringify(loggedInUser));
    
    // Role based routing redirection
    let defaultPage = 'dashboard';
    if (loggedInUser.role === 'Employee' || loggedInUser.role === 'Field Worker') {
      defaultPage = 'worker-portal';
    } else if (loggedInUser.role === 'Officer' || loggedInUser.role === 'Safety Officer') {
      defaultPage = 'dashboard';
    } else if (loggedInUser.role === 'Manager' || loggedInUser.role === 'Safety Manager') {
      defaultPage = 'manager';
    } else if (loggedInUser.role === 'Admin') {
      defaultPage = 'settings';
    }
    
    setCurrentPage(defaultPage);
    localStorage.setItem('raksha_current_page', defaultPage);
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
      defaultPage = 'manager';
    } else if (email === 'admin@refinery.safe' || email === 'admin@sifdemo.com') {
      name = 'System Administrator';
      role = 'Admin';
      defaultPage = 'settings';
    }

    const updatedUser: User = {
      email,
      name,
      role,
      token: `token-${role.toLowerCase().replace(' ', '-')}-session`
    };
    
    setUser(updatedUser);
    localStorage.setItem('raksha_auth_user', JSON.stringify(updatedUser));
    localStorage.setItem('raksha_auth_token', updatedUser.token || '');
    localStorage.setItem('raksha_current_page', defaultPage);
    setCurrentPage(defaultPage);
    setSelectedEvent(null);
    triggerNotification(`Switched persona to: ${name} (${role})`);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedEvent(null);
    setCurrentPage('dashboard');
    localStorage.removeItem('raksha_auth_user');
    localStorage.removeItem('raksha_auth_token');
    localStorage.removeItem('raksha_current_page');
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
    if (user?.role === 'Safety Manager' && currentPage === 'manager') {
      return 'HSE Manager Command Center';
    }
    if (user?.role === 'Admin' && currentPage === 'settings') {
      return 'System Administration Console';
    }

    const titles: Record<string, string> = {
      manager: 'HSE Manager Command Center',
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

  // Strict role-based route guard enforcement
  useEffect(() => {
    if (!user) return;
    const isEmployee = user.role === 'Employee' || user.role === 'Field Worker';
    const isOfficer = user.role === 'Officer' || user.role === 'Safety Officer';
    const isManager = user.role === 'Manager' || user.role === 'Safety Manager';

    if (isEmployee && currentPage !== 'worker-portal') {
      setCurrentPage('worker-portal');
      setSelectedEvent(null);
    } else if ((isOfficer || isManager) && (currentPage === 'settings' || currentPage === 'worker-portal')) {
      setCurrentPage(isManager ? 'manager' : 'dashboard');
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
          if (user.role === 'Employee' || user.role === 'Field Worker') return;
          setSelectedEvent(null);
          setCurrentPage(page);
          setIsMobileMenuOpen(false);
        }} 
        systemStatus={systemStatus} 
        userRole={user.role}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container Layout */}
      <div className="flex-1 pl-0 md:pl-64 flex flex-col min-h-screen w-full overflow-x-hidden">
        
        {/* Top Header widgets */}
        <Topbar 
          user={user} 
          onLogout={handleLogout} 
          title={getPageTitle()}
          notifications={notifications}
          clearNotifications={() => setNotifications([])}
          onSwitchPersona={handleSwitchPersona}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 pt-20 px-3 sm:px-6 lg:px-8 pb-12 overflow-y-auto">
          {currentPage === 'dashboard' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Dashboard 
              onViewEvent={handleViewEvent} 
              triggerNotification={triggerNotification} 
              triggerStateRefresh={triggerStateRefresh} 
              onNavigateTo={setCurrentPage}
              userRole={user.role}
              userName={user.name}
            />
          )}

          {currentPage === 'inbox' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Inbox 
              onViewEvent={handleViewEvent} 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sif' && !['Employee', 'Field Worker'].includes(user.role) && (
            <SifIntelligence 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'lsr' && !['Employee', 'Field Worker'].includes(user.role) && (
            <LifeSavingRules 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'precursors' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Precursors 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'sites' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Sites 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'review' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Review 
              reviewerName={user.name} 
              onReviewSubmitted={handleRefreshApp}
              triggerStateRefresh={triggerStateRefresh}
            />
          )}

          {currentPage === 'learning' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Learning 
              triggerStateRefresh={triggerStateRefresh} 
            />
          )}

          {currentPage === 'reports' && !['Employee', 'Field Worker'].includes(user.role) && (
            <Reports />
          )}

          {currentPage === 'manager' && (
            <SafetyManager
              triggerNotification={triggerNotification}
              triggerStateRefresh={triggerStateRefresh}
              userName={user?.name}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'settings' && (
            <AdminConsole
              initialTab="dashboard"
              onResetDb={handleRefreshApp}
              triggerNotification={triggerNotification}
              onNavigateTo={(page) => {
                setSelectedEvent(null);
                setCurrentPage(page);
              }}
            />
          )}

          {currentPage === 'admin-requests' && (
            <AdminConsole
              initialTab="requests"
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
