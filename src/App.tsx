import React, { useState, useEffect } from 'react';
import { MsalProvider } from '@azure/msal-react';
import { Toaster } from 'react-hot-toast';
import authService from './services/authService';
import DepartmentSelector from './components/DepartmentSelector';
import AttendanceForm from './components/AttendanceForm';
import SubmissionTracker from './components/SubmissionTracker';
import UserProfile from './components/UserProfile';
import { Department } from './types';
import { ClipboardList, AlertCircle, Mail, Lock, ArrowRight } from 'lucide-react';

function App() {
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authenticating, setAuthenticating] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginInProgress, setLoginInProgress] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [useDirectLogin, setUseDirectLogin] = useState<boolean>(true); // Default to direct login
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Function to check authentication status
  const checkAuthStatus = async () => {
    try {
      console.log('App: Checking authentication status...');
      setAuthenticating(true);
      setAuthError(null);
      
      // Wait for MSAL to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const account = authService.getAccount();
      console.log('App: Account check result:', account ? 'Account found' : 'No account found');
      
      if (account) {
        // Try to get a token to verify the account is valid
        try {
          await authService.getToken();
          setIsAuthenticated(true);
          setUserInfo({
            name: account.name || 'User',
            email: account.username || ''
          });
          console.log('App: User is authenticated with valid token');
        } catch (error) {
          console.error('Token acquisition failed, user needs to login again:', error);
          setIsAuthenticated(false);
          setAuthError('Your session has expired. Please sign in again.');
        }
      } else {
        // Don't automatically login, just show the login button
        setIsAuthenticated(false);
        console.log('App: User is not authenticated');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
      setAuthError('Failed to check authentication status');
    } finally {
      setAuthenticating(false);
      console.log('App: Authentication check complete');
    }
  };

  useEffect(() => {
    console.log('App: Initial render');
    checkAuthStatus();
  }, []);

  const handleLogin = async () => {
    try {
      console.log('App: Login button clicked');
      // If login is already in progress, don't start another one
      if (loginInProgress) {
        console.log('App: Login already in progress, ignoring click');
        return;
      }
      
      setLoginInProgress(true);
      setAuthenticating(true);
      setAuthError(null);
      
      console.log('App: Starting login process...');
      const result = await authService.login();
      
      // After login, check if we have an account
      const account = authService.getAccount();
      if (account) {
        console.log('App: Login successful, account found');
        setIsAuthenticated(true);
        setUserInfo({
          name: account.name || 'User',
          email: account.username || ''
        });
      } else {
        console.log('App: No account found after login attempt');
        if (result) {
          // We got a result but no account, which is strange
          console.warn('Login result but no account:', result);
          setAuthError('Login was successful but account information is missing. Please try again.');
        } else {
          // This is normal for redirect flow
          setAuthError('Login was initiated. If you are not redirected, please try again.');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // Provide more specific error message if available
      if (error.message) {
        setAuthError(`Failed to sign in: ${error.message}`);
      } else {
        setAuthError('Failed to sign in. Please try again.');
      }
    } finally {
      setAuthenticating(false);
      setLoginInProgress(false);
      console.log('App: Login process complete');
    }
  };

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('App: Direct login form submitted');
      if (loginInProgress) {
        return;
      }
      
      setLoginInProgress(true);
      setAuthenticating(true);
      setAuthError(null);
      
      // Simple validation
      if (!email || !password) {
        setAuthError('Please enter both email and password');
        setAuthenticating(false);
        setLoginInProgress(false);
        return;
      }
      
      // For demo purposes, accept any email/password combination
      // In a real app, you would validate against a backend
      
      // Create a mock user
      setIsAuthenticated(true);
      setUserInfo({
        name: email.split('@')[0] || 'User',
        email: email
      });
      
      // Store in localStorage for persistence
      localStorage.setItem('mockUser', JSON.stringify({
        name: email.split('@')[0] || 'User',
        email: email
      }));
      
      console.log('App: Direct login successful');
    } catch (error: any) {
      console.error('Direct login error:', error);
      setAuthError(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setAuthenticating(false);
      setLoginInProgress(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('App: Logout button clicked');
      setAuthenticating(true);
      
      // Clear mock user
      localStorage.removeItem('mockUser');
      
      // Also try MSAL logout
      try {
        await authService.logout();
      } catch (error) {
        console.error('MSAL logout error (non-critical):', error);
      }
      
      setIsAuthenticated(false);
      setUserInfo(null);
      setSelectedDepartment(null);
      
      // Clear any local storage or session storage related to auth
      localStorage.removeItem('msal.token.keys');
      localStorage.removeItem('msal.idtoken');
      localStorage.removeItem('msal.accessToken');
      localStorage.removeItem('msal.refreshToken');
      console.log('App: Logout complete, storage cleared');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setAuthenticating(false);
    }
  };

  const handleDepartmentSelect = (department: Department) => {
    console.log('App: Department selected:', department);
    setSelectedDepartment(department);
  };

  const handleBack = () => {
    console.log('App: Navigating back to department selection');
    setSelectedDepartment(null);
  };

  const handleSubmitSuccess = () => {
    console.log('App: Attendance submitted successfully');
    // Stay on the same page but show the updated tracker
    // You could also navigate back to department selection if preferred
  };

  console.log('App: Rendering with state:', { 
    authenticating, 
    isAuthenticated, 
    selectedDepartment: selectedDepartment || 'none' 
  });

  // Check for stored mock user on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser && !isAuthenticated && !authenticating) {
      try {
        const user = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUserInfo(user);
        console.log('App: Restored user from localStorage');
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('mockUser');
      }
    }
  }, [authenticating]);

  if (authenticating) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Initializing application...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we set up the attendance system</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-blue-500 mb-4">
            <ClipboardList className="w-12 h-12 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Smart Attendance Register</h1>
          
          {useDirectLogin ? (
            <>
              <p className="mb-6">Sign in with your email and password</p>
              
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{authError}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleDirectLogin} className="space-y-4 mb-6">
                <div className="text-left">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                
                <div className="text-left">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={loginInProgress}
                  className={`w-full px-6 py-3 bg-blue-600 text-white rounded-lg transition-colors ${
                    loginInProgress ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                  }`}
                >
                  {loginInProgress ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⟳</span>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
              
              <div className="text-sm">
                <button 
                  onClick={() => setUseDirectLogin(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Use Microsoft Sign In instead
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-6">Please sign in with your Microsoft account to continue.</p>
              
              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
                  <div className="flex">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{authError}</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleLogin}
                disabled={loginInProgress}
                className={`w-full px-6 py-3 bg-blue-600 text-white rounded-lg transition-colors ${
                  loginInProgress ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {loginInProgress ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Signing in...
                  </>
                ) : (
                  'Sign In with Microsoft'
                )}
              </button>
              
              <div className="mt-4 text-sm">
                <button 
                  onClick={() => setUseDirectLogin(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Use email and password instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <MsalProvider instance={authService.getMsalInstance()}>
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          {/* User profile header */}
          {userInfo && (
            <UserProfile 
              name={userInfo.name} 
              email={userInfo.email} 
              onLogout={handleLogout} 
            />
          )}
          
          {selectedDepartment ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              <div className="lg:col-span-2">
                <AttendanceForm 
                  department={selectedDepartment} 
                  onBack={handleBack}
                  onSubmitSuccess={handleSubmitSuccess}
                />
              </div>
              <div>
                <SubmissionTracker />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
              <div className="lg:col-span-2">
                <DepartmentSelector onSelect={handleDepartmentSelect} />
              </div>
              <div>
                <SubmissionTracker />
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster position="top-right" />
    </MsalProvider>
  );
}

export default App;