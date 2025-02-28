import { PublicClientApplication, AuthenticationResult, AccountInfo, PopupRequest, InteractionRequiredAuthError, BrowserAuthError } from '@azure/msal-browser';
import { msalConfig, graphScopes } from '../config';

class AuthService {
  private msalInstance: PublicClientApplication;
  private initialized: boolean = false;
  private initPromise: Promise<void>;
  private interactionInProgress: boolean = false;
  
  constructor() {
    console.log('AuthService: Initializing...');
    this.msalInstance = new PublicClientApplication(msalConfig);
    
    // Initialize immediately and store the promise
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('AuthService: Starting initialization...');
      
      // This is the critical step - we must await the initialization
      await this.msalInstance.initialize();
      
      console.log('AuthService: MSAL core initialized');
      console.log('Current URL:', window.location.href);
      console.log('Redirect URI:', msalConfig.auth.redirectUri);
      
      // Handle redirect after login
      console.log('AuthService: Handling redirect promise...');
      const result = await this.msalInstance.handleRedirectPromise().catch(error => {
        console.error("Error handling redirect:", error);
        return null;
      });
      
      if (result) {
        console.log("Redirect login successful", result);
        // Set active account when we get a successful redirect result
        const account = this.msalInstance.getActiveAccount() || this.msalInstance.getAllAccounts()[0];
        if (account) {
          this.msalInstance.setActiveAccount(account);
          console.log("Set active account after redirect:", account.username);
        }
      } else {
        console.log("No redirect result found or user not logged in yet");
        // Try to set active account from stored accounts
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          this.msalInstance.setActiveAccount(accounts[0]);
          console.log("Set active account from stored accounts:", accounts[0].username);
        }
      }
      
      this.initialized = true;
      console.log("MSAL initialized successfully");
      
      // Log accounts for debugging
      const accounts = this.msalInstance.getAllAccounts();
      console.log(`Found ${accounts.length} accounts:`, accounts.map(a => ({ 
        username: a.username, 
        homeAccountId: a.homeAccountId.substring(0, 5) + '...' 
      })));
    } catch (error) {
      console.error("Failed to initialize MSAL:", error);
      this.initialized = false;
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      console.log('AuthService: Waiting for initialization...');
      await this.initPromise.catch(error => {
        console.error("Error during initialization:", error);
        // Re-initialize if there was an error
        this.initPromise = this.initialize();
        return this.initPromise;
      });
      console.log('AuthService: Initialization complete');
    }
  }

  async login(): Promise<AuthenticationResult | null> {
    try {
      console.log('AuthService: Login requested');
      
      // Ensure MSAL is initialized before proceeding
      await this.ensureInitialized();
      
      // Check if interaction is already in progress
      if (this.interactionInProgress) {
        console.warn("Another authentication interaction is in progress. Please wait.");
        throw new Error("Authentication interaction already in progress. Please try again in a moment.");
      }
      
      // First check if we have any accounts already
      const accounts = this.msalInstance.getAllAccounts();
      console.log(`AuthService: Found ${accounts.length} accounts`);
      
      if (accounts.length > 0) {
        // If we have accounts, try to use the first one
        this.msalInstance.setActiveAccount(accounts[0]);
        console.log('AuthService: Set active account', accounts[0].username);
        
        try {
          console.log('AuthService: Attempting silent token acquisition');
          const response = await this.msalInstance.acquireTokenSilent({
            scopes: graphScopes,
            account: accounts[0]
          });
          console.log('AuthService: Silent token acquisition successful');
          return response;
        } catch (error) {
          console.warn("Silent token acquisition failed, proceeding with interactive login", error);
        }
      }
      
      // Set interaction flag
      this.interactionInProgress = true;
      
      try {
        // Try redirect first as it's more reliable for this application
        console.log('AuthService: Starting login with redirect...');
        const loginRequest = {
          scopes: graphScopes,
          prompt: 'select_account'
        };
        
        await this.msalInstance.loginRedirect(loginRequest);
        console.log('AuthService: Redirect initiated');
        return null;
      } catch (error) {
        console.error('Redirect login failed, falling back to popup:', error);
        
        // Fall back to popup if redirect fails
        try {
          console.log('AuthService: Starting login with popup...');
          const response = await this.msalInstance.loginPopup({
            scopes: graphScopes,
            prompt: 'select_account'
          });
          
          console.log('AuthService: Popup login successful', response);
          
          // Set the active account
          if (response.account) {
            this.msalInstance.setActiveAccount(response.account);
            console.log('AuthService: Set active account after login', response.account.username);
          }
          
          // Force a token acquisition to ensure we have a valid token
          if (response.account) {
            try {
              await this.msalInstance.acquireTokenSilent({
                scopes: graphScopes,
                account: response.account
              });
              console.log('AuthService: Token acquired after login');
            } catch (error) {
              console.warn('Failed to acquire token after login', error);
            }
          }
          
          return response;
        } catch (popupError) {
          console.error('Both redirect and popup login failed:', popupError);
          throw popupError;
        }
      } finally {
        // Clear interaction flag when done
        this.interactionInProgress = false;
      }
    } catch (error) {
      // Clear interaction flag on error
      this.interactionInProgress = false;
      console.error('Error during login:', error);
      throw error;
    }
  }

  // Direct login with email and password
  async loginWithCredentials(email: string, password: string): Promise<boolean> {
    try {
      console.log('AuthService: Direct login requested');
      await this.ensureInitialized();
      
      if (this.interactionInProgress) {
        throw new Error("Authentication interaction already in progress. Please try again in a moment.");
      }
      
      this.interactionInProgress = true;
      
      // This is a simplified implementation since we can't actually authenticate with username/password
      // In a real implementation, you would call your backend API to validate credentials
      
      // For demo purposes, we'll create a mock account
      const mockAccount = {
        homeAccountId: `mock-${Date.now()}`,
        environment: 'login.microsoftonline.com',
        tenantId: msalConfig.auth.authority.split('/').pop() || '',
        username: email,
        localAccountId: `local-${Date.now()}`,
        name: email.split('@')[0]
      };
      
      // Store the mock account in localStorage to persist it
      localStorage.setItem('mockAccount', JSON.stringify(mockAccount));
      
      // Wait a bit to simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('AuthService: Direct login successful');
      return true;
    } catch (error) {
      console.error('Error during direct login:', error);
      throw error;
    } finally {
      this.interactionInProgress = false;
    }
  }

  async logout(): Promise<void> {
    try {
      console.log('AuthService: Logout requested');
      await this.ensureInitialized();
      
      // Check if interaction is already in progress
      if (this.interactionInProgress) {
        console.warn("Another authentication interaction is in progress. Please wait.");
        throw new Error("Authentication interaction already in progress. Please try again in a moment.");
      }
      
      const account = this.getAccount();
      if (account) {
        // Set interaction flag
        this.interactionInProgress = true;
        
        try {
          console.log('AuthService: Logging out...');
          // Clear cache before logout
          this.msalInstance.clearCache();
          
          // Try redirect first for this application
          await this.msalInstance.logoutRedirect({
            account,
            postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri
          });
          console.log('AuthService: Redirect logout initiated');
        } catch (error) {
          console.error('Redirect logout failed, falling back to popup:', error);
          
          // Fall back to popup
          try {
            await this.msalInstance.logoutPopup({
              account,
              postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri
            });
            console.log('AuthService: Popup logout successful');
          } catch (popupError) {
            console.error('Both redirect and popup logout failed:', popupError);
            throw popupError;
          }
        } finally {
          // Clear interaction flag when done
          this.interactionInProgress = false;
        }
      } else {
        console.log('AuthService: No account to log out');
      }
      
      // Clear any mock account
      localStorage.removeItem('mockAccount');
      
      // Clear all MSAL-related items from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('msal.') || key.includes('login.windows')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Clear interaction flag on error
      this.interactionInProgress = false;
      console.error('Error during logout:', error);
      throw error;
    }
  }

  async getToken(): Promise<string> {
    try {
      console.log('AuthService: Token requested');
      await this.ensureInitialized();
      const account = this.getAccount();
      
      if (!account) {
        console.error('AuthService: No active account for token request');
        throw new Error('No active account! Please sign in before proceeding.');
      }
      
      try {
        console.log('AuthService: Attempting silent token acquisition');
        const response = await this.msalInstance.acquireTokenSilent({
          scopes: graphScopes,
          account
        });
        
        console.log('AuthService: Silent token acquisition successful');
        return response.accessToken;
      } catch (error) {
        console.warn('Silent token acquisition failed', error);
        
        // If error is not InteractionRequiredAuthError, rethrow it
        if (!(error instanceof InteractionRequiredAuthError)) {
          throw error;
        }
        
        console.log('AuthService: Interactive token acquisition required');
        
        // Check if interaction is already in progress
        if (this.interactionInProgress) {
          console.warn("Another authentication interaction is in progress. Please wait.");
          throw new Error("Authentication interaction already in progress. Please try again in a moment.");
        }
        
        // Set interaction flag
        this.interactionInProgress = true;
        
        try {
          // Try redirect first for this application
          console.log('AuthService: Attempting token acquisition with redirect...');
          await this.msalInstance.acquireTokenRedirect({
            scopes: graphScopes,
            account
          });
          
          // This code won't execute immediately as the page will redirect
          console.log('AuthService: Redirect for token acquisition initiated');
          throw new Error("Redirecting to acquire token...");
        } catch (error) {
          console.error('Redirect token acquisition failed, falling back to popup:', error);
          
          // Fall back to popup
          try {
            const response = await this.msalInstance.acquireTokenPopup({
              scopes: graphScopes,
              account
            });
            
            console.log('AuthService: Popup token acquisition successful');
            return response.accessToken;
          } catch (popupError) {
            console.error('Both redirect and popup token acquisition failed:', popupError);
            throw popupError;
          }
        } finally {
          // Clear interaction flag when done
          this.interactionInProgress = false;
        }
      }
    } catch (error) {
      // Clear interaction flag on error (just in case)
      this.interactionInProgress = false;
      console.error('Error acquiring token:', error);
      throw error;
    }
  }

  getAccount(): AccountInfo | null {
    if (!this.initialized) {
      console.warn('Trying to get account before MSAL is initialized');
      return null;
    }
    
    // First try to get the active account
    const activeAccount = this.msalInstance.getActiveAccount();
    if (activeAccount) {
      return activeAccount;
    }
    
    // If no active account, get all accounts and use the first one
    const accounts = this.msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      // Set the first account as active for future use
      this.msalInstance.setActiveAccount(accounts[0]);
      return accounts[0];
    }
    
    // Check for mock account from direct login
    const mockAccountJson = localStorage.getItem('mockAccount');
    if (mockAccountJson) {
      try {
        return JSON.parse(mockAccountJson) as AccountInfo;
      } catch (e) {
        console.error('Failed to parse mock account', e);
      }
    }
    
    return null;
  }

  getMsalInstance(): PublicClientApplication {
    return this.msalInstance;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  isInteractionInProgress(): boolean {
    return this.interactionInProgress;
  }
}

export const authService = new AuthService();
export default authService;