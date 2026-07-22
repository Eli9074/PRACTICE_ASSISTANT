export const environment = {
  springUrl: 'https://adk7epgydg.execute-api.us-east-1.amazonaws.com',
  separateUrl: 'http://34.205.107.87:8000',
  stretchUrl: 'http://34.205.107.87:8001',
  cognito: {
    domain: 'https://by-ear-users-domain-2648.auth.us-east-1.amazoncognito.com',
    clientId: '7hooi1s4dj43rotctsd2359ot1',
    redirectUri: 'http://localhost:4200/callback',
    logoutRedirectUri: 'http://localhost:4200/login',
    scope: 'openid email profile',
  },
};
