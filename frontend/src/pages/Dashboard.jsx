import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Settings, Calculator, FileText } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>ダッシュボード</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/apply')} className="new-apply-button">
            <Plus size={16} />
            新規申請
          </button>
          <button onClick={() => navigate('/my-applications')} className="action-button">
            <FileText size={16} />
            申請履歴・提出
          </button>
          <button onClick={() => navigate('/admin')} className="action-button">
            <Settings size={16} />
            管理画面
          </button>
          <button onClick={() => navigate('/calculator')} className="action-button">
            <Calculator size={16} />
            金種計算
          </button>
          <button onClick={handleLogout} className="logout-button">
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      </header>
      <main className="dashboard-content">
        <p>ここに経費申請や承認状況の概要を表示します。</p>
        <div className="dashboard-widgets">
          <div className="widget-card">
            <h3>承認待ちの申請</h3>
            <p className="widget-value">3 件</p>
          </div>
          <div className="widget-card">
            <h3>未報告のアラート</h3>
            <p className="widget-value alert">1 件</p>
          </div>
          <div className="widget-card">
            <h3>予算残高</h3>
            <p className="widget-value">¥125,000</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
