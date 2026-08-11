import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { LogIn } from 'lucide-react';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // API call to the backend for authentication
      // const response = await api.post('/auth/login', { email, password });
      // const { token } = response.data;
      // localStorage.setItem('authToken', token);

      // Mock successful login for now
      localStorage.setItem('authToken', 'dummy_token');
      navigate('/dashboard');
    } catch (err) {
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <LogIn size={40} className="login-icon" />
          <h2>Club Abacus System</h2>
          <p>部費・経費管理システムへログイン</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="login-button">
            ログイン
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
