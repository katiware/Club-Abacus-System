import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import AuthService from '../services/AuthService';
import { LogIn } from 'lucide-react';
import './Login.css';

function Login() {
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pendingCredential, setPendingCredential] = useState(null);
  
  const backendCallbackUrl = 'http://localhost:5001/api/auth/google-callback';

  // Handle redirect from backend
  useEffect(() => {
    const token = searchParams.get('token');
    const role = searchParams.get('role');
    const errorParam = searchParams.get('error');
    const credential = searchParams.get('credential');

    if (token) {
      localStorage.setItem('authToken', token);
      if (role) {
        localStorage.setItem('userRole', role);
      }
      navigate('/dashboard', { replace: true });
    } else if (errorParam === 'not_registered' && credential) {
      setPendingCredential(credential);
      // Remove params from URL for clean UI
      setSearchParams({}, { replace: true });
    } else if (errorParam) {
      setError(errorParam === 'account_disabled' ? 'アカウントが無効化されています。' : '認証に失敗しました。');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, navigate, setSearchParams]);

  const handleRegisterConfirm = async () => {
    if (!pendingCredential) return;
    setError(null);
    try {
      const { token, user } = await AuthService.registerWithGoogle(pendingCredential);
      
      localStorage.setItem('authToken', token);
      if (user && user.role) {
        localStorage.setItem('userRole', user.role);
      }
      
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || '登録に失敗しました。');
    }
  };

  const handleGoogleFailure = () => {
    setError('Googleでの処理がキャンセルされたか、失敗しました。');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <LogIn size={40} className="login-icon" />
          <h2>Club Abacus System</h2>
          <p>部費・経費管理システム</p>
        </div>
        <div className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="google-login-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', marginTop: '20px' }}>
            
            {/* 未登録の場合の登録案内画面 */}
            {pendingCredential ? (
              <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                <p style={{ color: '#495057', marginBottom: '15px', fontWeight: '500' }}>
                  アカウントがシステムに登録されていません。<br/>
                  このGoogleアカウントで新規登録しますか？
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => setPendingCredential(null)}
                    style={{ padding: '10px 15px', border: '1px solid #ced4da', background: '#fff', borderRadius: '4px', cursor: 'pointer', color: '#495057' }}
                  >
                    キャンセル
                  </button>
                  <button 
                    onClick={handleRegisterConfirm}
                    style={{ padding: '10px 20px', border: 'none', background: '#0d6efd', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    登録してログイン
                  </button>
                </div>
              </div>
            ) : (
              /* 通常のログイン・登録兼用ボタン（リダイレクト方式） */
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '12px', textAlign: 'center' }}>
                  Googleアカウントでログインまたは新規登録
                </p>
                <GoogleLogin
                  onSuccess={() => {}} // Not used in redirect mode
                  onError={handleGoogleFailure}
                  ux_mode="redirect"
                  login_uri={backendCallbackUrl}
                />
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
