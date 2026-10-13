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

  const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';
  const [viewMode, setViewMode] = useState(isManagerOrAdmin ? 'all' : 'me');
  const [summaryData, setSummaryData] = useState({
    pendingCount: 0,
    waitingConfirmationCount: 0,
    settledCount: 0,
    draftCount: 0,
    overdueCount: 0,
    budgetBalance: 0,
    effectiveBalance: 0,
    isBudgetOver: false,
    isPendingOver: false,
    totalBudget: 0,
    unfinalizedCount: 0,
    yearName: ''
  });

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        let url = `/Expense/summary?viewMode=${viewMode}`;
        const response = await api.get(url);
        setSummaryData(response.data || {});
      } catch (err) {
        console.error('Failed to fetch summary data', err);
      }
    };
    fetchSummary();
  }, [viewMode]);

  const { 
    pendingCount = 0, 
    waitingConfirmationCount = 0, 
    settledCount = 0, 
    draftCount = 0,
    overdueCount = 0, 
    budgetBalance = 0, 
    effectiveBalance = 0, 
    isBudgetOver = false,
    isPendingOver = false,
    totalBudget = 0,
    unfinalizedCount = 0, 
    yearName = ''
  } = summaryData;

  return (
    <div className="top-page-container">
      <header className="top-page-header">
        <div className="header-brand">
          <h1>Club Abacus System</h1>
          <span className={`role-badge ${isManagerOrAdmin ? 'admin' : 'user'}`}>
            {isManagerOrAdmin ? <Shield size={14} /> : <User size={14} />}
            {userRole === 'ADMIN' ? 'システム管理者' : (userRole === 'MANAGER' ? '主将会計' : '一般部員')}
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
          <div className="dashboard-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2>ダッシュボード</h2>
              {yearName && (
                <span style={{ fontSize: '0.85rem', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {yearName}
                </span>
              )}
            </div>
            {isManagerOrAdmin && (
              <div className="view-mode-toggle" style={{ display: 'flex', gap: '5px', backgroundColor: '#f1f3f5', padding: '4px', borderRadius: '8px' }}>
                <button 
                  style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: viewMode === 'all' ? '#fff' : 'transparent', boxShadow: viewMode === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: viewMode === 'all' ? '600' : 'normal', color: viewMode === 'all' ? '#111827' : '#6b7280' }}
                  onClick={() => setViewMode('all')}
                >
                  全体（部活）
                </button>
                <button 
                  style={{ padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: viewMode === 'me' ? '#fff' : 'transparent', boxShadow: viewMode === 'me' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: viewMode === 'me' ? '600' : 'normal', color: viewMode === 'me' ? '#111827' : '#6b7280' }}
                  onClick={() => setViewMode('me')}
                >
                  自分のみ
                </button>
              </div>
            )}
          </div>

          {/* 予算超過アラートバナー */}
          {isManagerOrAdmin && isBudgetOver && (
            <div className="overdue-alert-banner" style={{ backgroundColor: '#fee2e2', borderColor: '#fca5a5', color: '#991b1b', marginBottom: '16px' }}>
              <AlertTriangle size={24} />
              <div className="overdue-alert-text">
                <strong>⚠️ 予算超過警告:</strong> 支出（確定＋承認済枠）が今年度の部費予算総額（¥{totalBudget.toLocaleString()}）を超過しています。
              </div>
              <button className="overdue-action-btn" style={{ backgroundColor: '#dc2626', color: '#fff' }} onClick={() => navigate('/fiscal-years')}>
                予算確認へ
              </button>
            </div>
          )}

          {unfinalizedCount > 0 && (
            <div className="overdue-alert-banner" style={{ backgroundColor: '#fff3cd', color: '#856404', borderColor: '#ffeeba' }}>
              <AlertTriangle size={24} />
              <div className="overdue-alert-text">
                <strong>⚠️ アクションが必要:</strong> 金額の確定が必要な定期払い申請が {unfinalizedCount} 件あります。実際の請求額を入力して確定させてください。
              </div>
              <button className="overdue-action-btn" style={{ backgroundColor: '#ffc107', color: '#212529' }} onClick={() => navigate('/my-applications')}>申請一覧へ</button>
            </div>
          )}

          {overdueCount > 0 && (
            <div className="overdue-alert-banner">
              <AlertTriangle size={24} />
              <div className="overdue-alert-text">
                <strong>未報告のアラート:</strong> 事前出金で現金を受け取ってから30日以上未精算の申請が {overdueCount} 件あります。領収書を提出してください。
              </div>
              <button className="overdue-action-btn" onClick={() => navigate('/my-applications')}>提出画面へ</button>
            </div>
          )}

          {draftCount > 0 && viewMode === 'me' && (
            <div className="overdue-alert-banner" style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0', marginBottom: '16px' }}>
              <Clock size={20} />
              <div className="overdue-alert-text">
                <strong>📝 下書き・修正待ち:</strong> 作成途中または差し戻された申請が {draftCount} 件あります。「申請一覧」から編集して提出してください。
              </div>
              <button className="overdue-action-btn" style={{ backgroundColor: '#16a34a', color: '#fff' }} onClick={() => navigate('/my-applications')}>確認へ</button>
            </div>
          )}

          <div className="dashboard-widgets">
            <div className="widget-card" style={{ cursor: 'pointer' }} onClick={() => navigate(isManagerOrAdmin && viewMode === 'all' ? '/admin' : '/my-applications')}>
              <h3>{viewMode === 'all' ? '要承認の申請' : '承認待ちの申請'}</h3>
              <p className="widget-value" style={{ color: pendingCount > 0 ? '#2563eb' : '#111827' }}>{pendingCount} 件</p>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {viewMode === 'all' ? '管理者の事前承認待ち' : '会計の事前承認待ち'}
              </span>
            </div>
            
            <div className="widget-card" style={{ cursor: 'pointer' }} onClick={() => navigate(isManagerOrAdmin && viewMode === 'all' ? '/admin' : '/my-applications')}>
              <h3>証憑・精算待ち</h3>
              <p className="widget-value" style={{ color: waitingConfirmationCount > 0 ? '#d97706' : '#111827' }}>{waitingConfirmationCount} 件</p>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>事前承認済〜領収書確認中</span>
            </div>

            <div className="widget-card" style={{ cursor: 'pointer' }} onClick={() => navigate(isManagerOrAdmin && viewMode === 'all' ? '/all-applications' : '/my-applications')}>
              <h3>精算完了</h3>
              <p className="widget-value" style={{ color: '#059669' }}>{settledCount} 件</p>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {viewMode === 'all' ? '完了済み実績' : '処理完了済みの申請'}
              </span>
            </div>

            {isManagerOrAdmin && (
              <div className="widget-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/fiscal-years')}>
                <h3>実質予算残高</h3>
                <p className={`widget-value ${isBudgetOver ? 'alert' : ''}`}>¥{effectiveBalance.toLocaleString()}</p>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>予算総額: ¥{totalBudget.toLocaleString()}</span>
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
              <button onClick={() => navigate('/recurring-payments')} className="menu-btn">
                <Clock size={24} />
                <span>定期支払い登録</span>
              </button>
              <button onClick={() => navigate('/profile')} className="menu-btn">
                <User size={24} />
                <span>プロフィール設定</span>
              </button>
            </div>
          </div>

          {isManagerOrAdmin && (
            <div className="menu-group admin-group">
              <h3 className="group-title admin-title">
                <Shield size={16} /> 会計・管理者メニュー
              </h3>
              <div className="menu-grid">
                <button onClick={() => navigate('/admin')} className="menu-btn admin-btn">
                  <AlertTriangle size={24} />
                  <span>要確認のタスク</span>
                </button>
                <button onClick={() => navigate('/all-applications')} className="menu-btn admin-btn">
                  <BookOpen size={24} />
                  <span>全申請台帳・ZIP出力</span>
                </button>
                <button onClick={() => navigate('/fiscal-years')} className="menu-btn admin-btn">
                  <Calculator size={24} />
                  <span>年度・予算管理</span>
                </button>
                <button onClick={() => navigate('/calculator')} className="menu-btn admin-btn">
                  <Calculator size={24} />
                  <span>金種計算ツール</span>
                </button>
                <button onClick={() => navigate('/recurring-payments')} className="menu-btn admin-btn">
                  <Clock size={24} />
                  <span>定期支払い管理</span>
                </button>
                {userRole === 'ADMIN' && (
                  <>
                    <button onClick={() => navigate('/users')} className="menu-btn admin-btn">
                      <Users size={24} />
                      <span>部員管理</span>
                    </button>
                    <button onClick={() => navigate('/admin-settings')} className="menu-btn admin-btn">
                      <Settings size={24} />
                      <span>システム設定</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 簡単な利用ガイド */}
          <div style={{ marginTop: '30px', padding: '18px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#1e293b' }}>
              🔰 初めて申請する方へ（申請の流れ）
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', fontSize: '0.85rem', color: '#475569' }}>
              <div>
                <strong>① 立替払い（基本）:</strong><br />
                部員が立て替えて購入後、Web領収書または紙の原本を提出して大学振込後に現金を受け取ります。
              </div>
              <div>
                <strong>② 事前出金（高額・遠征等）:</strong><br />
                事前に見積書等を提出して部費から出金を受け、購入後に領収書とお釣りを提出して精算します。
              </div>
              <div>
                <strong>③ 定期支払い（月次固定費）:</strong><br />
                サーバー代など毎月発生する支払いを登録すると、毎月の指定日に自動で申請が生成されます。
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

export default TopPage;
