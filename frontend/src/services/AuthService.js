import api from './api';

const AuthService = {
  loginWithGoogle: async (credential) => {
    const response = await api.post('/auth/login', { credential });
    return response.data; // { token, user }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  }
};

export default AuthService;
