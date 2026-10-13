import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import AuthService from '../services/AuthService';
import { LogIn, Shield, Briefcase, User, Sparkles, RefreshCw } from 'lucide-react';
import './Login.css';

function Login() {
  const [error, setError] = useState(null);
  const [devMessage, setDevMessage] = useState(null);
  const [loadingSeed, setLoadingSeed] = useState(false);
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
      navigate('/top', { replace: true });
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
      
      navigate('/top');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || '登録に失敗しました。');
    }
  };

  const handleGoogleFailure = () => {
    setError('Googleでの処理がキャンセルされたか、失敗しました。');
  };

  // 開発用クイックログイン処理
  const handleQuickLogin = async (emailOrRole) => {
    setError(null);
    setDevMessage(null);
    try {
      const data = await AuthService.quickLogin(emailOrRole);
      localStorage.setItem('authToken', data.token);
      if (data.user?.role) {
        localStorage.setItem('userRole', data.user.role);
      }
      navigate('/top');
    } catch (err) {
      console.error('Quick login failed:', err);
      setError(err.response?.data?.message || 'クイックログインに失敗しました。');
    }
  };

  // 開発用テストデータ一括シード処理
  const handleSeedData = async () => {
    if (loadingSeed) return;
    setLoadingSeed(true);
    setError(null);
    setDevMessage(null);
    try {
      const res = await AuthService.seedDevData();
      setDevMessage(res.message || 'テストデータを初期化・投入しました！');
    } catch (err) {
      console.error('Seed dev data failed:', err);
      setError(err.response?.data?.message || 'テストデータの投入に失敗しました。');
    } finally {
      setLoadingSeed(false);
    }
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
          {devMessage && <div className="success-message">{devMessage}</div>}
          
          <div className="google-login-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
            
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
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px', textAlign: 'center' }}>
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

          {/* 🛠️ 開発・検証用クイックログイン＆テストデータ */}
          <div className="dev-section" style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px dashed #cbd5e1',
            width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={14} color="#f59e0b" /> 開発用クイックログイン
              </span>
              <button
                type="button"
                onClick={handleSeedData}
                disabled={loadingSeed}
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  color: '#475569',
                  cursor: loadingSeed ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="全ステータスのテスト申請データと年度、ユーザーを一括生成"
              >
                <RefreshCw size={12} className={loadingSeed ? 'spin' : ''} />
                {loadingSeed ? '投入中...' : 'データ一括生成'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@example.com')}
                style={{
                  padding: '9px 8px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s'
                }}
              >
                <Shield size={14} /> 管理者 (山田)
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('manager@example.com')}
                style={{
                  padding: '9px 8px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  color: '#1e40af',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s'
                }}
              >
                <Briefcase size={14} /> 主将会計 (鈴木)
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('tanaka@example.com')}
                style={{
                  padding: '9px 8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s'
                }}
              >
                <User size={14} /> 部員 (田中)
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('sato@example.com')}
                style={{
                  padding: '9px 8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  color: '#334155',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background-color 0.15s'
                }}
              >
                <User size={14} /> 部員 (佐藤)
              </button>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center' }}>
              ※ クリックするだけで各ロール権限のアカウントとしてログインします
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

