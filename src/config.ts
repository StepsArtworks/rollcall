// Microsoft Graph API configuration
export const msalConfig = {
  auth: {
    clientId: 'afcd965b-4101-40a3-8b2f-502b0a7d9896', // Your Azure AD application ID
    authority: 'https://login.microsoftonline.com/26558ce4-448f-410a-a4e1-f4917b8f9e11', // Your Azure AD tenant ID
    redirectUri: `${window.location.origin}/rollcall/`, // Include /rollcall/ in the redirect URI
    navigateToLoginRequestUrl: true,
    postLogoutRedirectUri: `${window.location.origin}/rollcall/`, // Add explicit logout redirect
  },
  cache: {
    cacheLocation: 'localStorage', // This is more reliable than sessionStorage
    storeAuthStateInCookie: true, // Enable cookies for IE/Edge browsers
  },
  system: {
    allowRedirectInIframe: true,
    iframeHashTimeout: 10000,
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // Error
            console.error('[MSAL]', message);
            break;
          case 1: // Warning
            console.warn('[MSAL]', message);
            break;
          case 2: // Info
            console.info('[MSAL]', message);
            break;
          case 3: // Verbose
            console.debug('[MSAL]', message);
            break;
        }
      },
      piiLoggingEnabled: false,
      logLevel: 2, // Info level logging for production
    }
  }
};

// Log the configuration for debugging
console.log('MSAL Config (without sensitive data):', {
  redirectUri: msalConfig.auth.redirectUri,
  postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
  cacheLocation: msalConfig.cache.cacheLocation,
  storeAuthStateInCookie: msalConfig.cache.storeAuthStateInCookie
});

// Update scopes to include all granted permissions
export const graphScopes = [
  'User.Read',
  'Files.ReadWrite.All',
  'Sites.ReadWrite.All',
  'ChannelMessage.Send',
  'Group.ReadWrite.All',
  'TeamMember.Read.All',
  'openid',  // Add OpenID Connect scopes
  'profile', // Add profile scope
  'email',    // Add email scope
  'Sites.Read.All',
  'Files.Read.All'
];

// Teams and Excel file configuration
export const teamsConfig = {
  teamName: 'Rollcall',
  channelName: 'Attendance',
  fileName: 'Attendance Register.xlsx'
};