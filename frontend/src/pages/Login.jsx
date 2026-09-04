import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { LogIn } from 'lucide-react';
import './Login.css';

function Login() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', {
        credential: credentialResponse.credential
      });
      
      const { token, user } = response.data;
      localStorage.setItem('authToken', token);
      
      // user.Role may be passed from the backend
      if (user && user.role) {
        localStorage.setItem('userRole', user.role);
      }
      
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'ログインに失敗しました。');
    }
  };

  const handleGoogleFailure = () => {
    setError('Googleでのログインがキャンセルされたか、失敗しました。');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <LogIn size={40} className="login-icon" />
          <h2>Club Abacus System</h2>
          <p>部費・経費管理システムへログイン</p>
        </div>
        <div className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="google-login-wrapper" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleFailure}
              useOneTap
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
