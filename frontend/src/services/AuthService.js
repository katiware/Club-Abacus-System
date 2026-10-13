import api from './api';

const AuthService = {
  loginWithGoogle: async (credential) => {
    const response = await api.post('/auth/login', { credential });
    return response.data; // { token, user }
  },

  registerWithGoogle: async (credential) => {
    const response = await api.post('/auth/register', { credential });
    return response.data; // { token, user }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },

  quickLogin: async (emailOrRole) => {
    const isEmail = emailOrRole.includes('@');
    const param = isEmail ? `email=${encodeURIComponent(emailOrRole)}` : `role=${encodeURIComponent(emailOrRole)}`;
    const response = await api.post(`/DevData/quick-login?${param}`);
    return response.data;
  },

  seedDevData: async () => {
    const response = await api.post('/DevData/seed');
    return response.data;
  }
};

export default AuthService;

