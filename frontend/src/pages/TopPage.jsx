import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Settings, Calculator, FileText, AlertTriangle, Users, BookOpen, Clock, User, Shield } from 'lucide-react';
import api from '../services/api';
import './TopPage.css';

function TopPage() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'USER';

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const [summaryData, setSummaryData] = useState({
    pendingCount: 0,
    overdueCount: 0,
    budgetBalance: 0
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/Expense/summary');
        setSummaryData(response.data);
      } catch (err) {
        console.error('Failed to fetch summary data', err);
      }
    };
    fetchSummary();
  }, []);

  const { pendingCount, overdueCount, budgetBalance } = summaryData;

  return (
    <div className="top-page-container">
      <header className="top-page-header">
        <div className="header-brand">
          <h1>Club Abacus System</h1>
          <span className={`role-badge ${userRole === 'ADMIN' ? 'admin' : 'user'}`}>
            {userRole === 'ADMIN' ? <Shield size={14} /> : <User size={14} />}
            {userRole === 'ADMIN' ? '管理者' : '一般部員'}
          </span>
        </div>
        <div className="header-actions">
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      </header>

      <main className="top-page-content fade-in">
        
        {/* ダッシュボード領域（アラート・統計） */}
        <section className="dashboard-section">
          <h2>ダッシュボード</h2>
          
          {overdueCount > 0 && (
            <div className="overdue-alert-banner">
              <AlertTriangle size={24} />
              <div className="overdue-alert-text">
                <strong>未報告のアラート:</strong> 事前出金の領収書提出期限（翌月20日）が迫っている、または過ぎている申請が {overdueCount} 件あります。速やかに提出してください。
              </div>
              <button className="overdue-action-btn" onClick={() => navigate('/my-applications')}>提出画面へ</button>
            </div>
          )}

          <div className="dashboard-widgets">
            <div className="widget-card">
              <h3>承認待ちの申請</h3>
              <p className="widget-value">{pendingCount} 件</p>
            </div>
            <div className="widget-card">
              <h3>未報告のアラート</h3>
              <p className={`widget-value ${overdueCount > 0 ? 'alert' : ''}`}>{overdueCount} 件</p>
            </div>
            {userRole === 'ADMIN' && (
              <div className="widget-card">
                <h3>今年度予算残高</h3>
                <p className="widget-value">¥{budgetBalance.toLocaleString()}</p>
              </div>
            )}
          </div>
        </section>

        {/* ナビゲーションメニュー領域 */}
        <section className="navigation-section">
          <h2>メニュー</h2>
          
          <div className="menu-group">
            <h3 className="group-title">一般機能</h3>
            <div className="menu-grid">
              <button onClick={() => navigate('/apply')} className="menu-btn primary-menu">
                <Plus size={24} />
                <span>新規申請</span>
              </button>
              <button onClick={() => navigate('/my-applications')} className="menu-btn">
                <FileText size={24} />
                <span>自分の申請履歴</span>
              </button>
              <button onClick={() => navigate('/profile')} className="menu-btn">
                <User size={24} />
                <span>プロフィール設定</span>
              </button>
            </div>
          </div>

          {userRole === 'ADMIN' && (
            <div className="menu-group admin-group">
              <h3 className="group-title admin-title">
                <Shield size={16} /> 管理者専用機能
              </h3>
              <div className="menu-grid">
                <button onClick={() => navigate('/admin')} className="menu-btn admin-btn">
                  <AlertTriangle size={24} />
                  <span>要確認の申請</span>
                </button>
                <button onClick={() => navigate('/calculator')} className="menu-btn admin-btn">
                  <Calculator size={24} />
                  <span>金種計算</span>
                </button>
                <button onClick={() => navigate('/all-applications')} className="menu-btn admin-btn">
                  <BookOpen size={24} />
                  <span>全申請一覧（台帳）</span>
                </button>
                <button onClick={() => navigate('/users')} className="menu-btn admin-btn">
                  <Users size={24} />
                  <span>部員管理</span>
                </button>
                <button onClick={() => navigate('/recurring-payments')} className="menu-btn admin-btn">
                  <Clock size={24} />
                  <span>定期支払い管理</span>
                </button>
                <button onClick={() => navigate('/fiscal-years')} className="menu-btn admin-btn">
                  <Calculator size={24} />
                  <span>年度・予算管理</span>
                </button>
                <button onClick={() => navigate('/admin-settings')} className="menu-btn admin-btn">
                  <Settings size={24} />
                  <span>システム設定</span>
                </button>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default TopPage;
