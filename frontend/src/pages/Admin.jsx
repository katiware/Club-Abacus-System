import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, FileText, XCircle, Trash2, 
  AlertTriangle, Search, Filter, RotateCcw, Calendar, 
  DollarSign, Tag, UserCheck, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './Admin.css';

const CATEGORY_MAP = {
  'SERVER': 'サーバー・インフラ代',
  'EQUIPMENT': '備品購入',
  'EVENT': 'イベント・大会費用',
  'BOOKS': '書籍・技術書',
  'OTHER': 'その他'
};

function Admin() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 絞り込みフィルター状態
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTION_REQUIRED'); // 'ALL' | 'ACTION_REQUIRED' | 特定ステータス
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'Reimbursement' | 'Advance'
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc'); // 'createdAt_desc' | 'createdAt_asc' | 'amount_desc' | 'amount_asc'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/Expense/all');
      setApplications(response.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
      setError('タスクの取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // 主将会計が処理すべき「要確認」ステータス定義
  const actionRequiredStatuses = [
    'PendingApproval',            // 事前承認待ち
    'WaitingConfirmation',       // 領収書確認待ち
    'Advance_MoneyHandedOver',   // 事前出金渡し待ち・渡し済
    'WaitingUniversitySubmission'// 大学へ提出待ち
  ];

  // フィルタリング & ソートロジック
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // 1. ステータス絞り込み
      if (filterStatus === 'ACTION_REQUIRED') {
        if (!actionRequiredStatuses.includes(app.status)) return false;
      } else if (filterStatus !== 'ALL') {
        if (app.status !== filterStatus) return false;
      }

      // 2. 区分絞り込み
      if (filterType !== 'ALL' && app.type !== filterType) {
        return false;
      }

      // 3. カテゴリ絞り込み
      if (filterCategory !== 'ALL') {
        const hasCategory = app.expenseItems && app.expenseItems.some(item => item.category === filterCategory);
        if (!hasCategory) return false;
      }

      // 4. 金額絞り込み
      const min = parseInt(filterMinAmount, 10);
      const max = parseInt(filterMaxAmount, 10);
      if (!isNaN(min) && app.totalAmount < min) return false;
      if (!isNaN(max) && app.totalAmount > max) return false;

      // 5. 日付絞り込み
      if (filterStartDate) {
        const appDate = new Date(app.createdAt).toISOString().split('T')[0];
        if (appDate < filterStartDate) return false;
      }
      if (filterEndDate) {
        const appDate = new Date(app.createdAt).toISOString().split('T')[0];
        if (appDate > filterEndDate) return false;
      }

      // 6. キーワード検索 (ID, 申請者名, メール, 品目名, 目的・備考)
      if (filterKeyword.trim()) {
        const q = filterKeyword.toLowerCase().trim();
        const idMatch = app.id?.toLowerCase().includes(q);
        const nameMatch = app.user?.name?.toLowerCase().includes(q);
        const emailMatch = app.user?.email?.toLowerCase().includes(q);
        const itemMatch = app.expenseItems && app.expenseItems.some(i => 
          i.itemName?.toLowerCase().includes(q) || 
          i.payee?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
        );
        const titleMatch = app.title?.toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !emailMatch && !itemMatch && !titleMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'createdAt_desc') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'createdAt_asc') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === 'amount_desc') {
        return b.totalAmount - a.totalAmount;
      }
      if (sortBy === 'amount_asc') {
        return a.totalAmount - b.totalAmount;
      }
      return 0;
    });
  }, [
    applications, filterKeyword, filterStatus, filterType, 
    filterCategory, filterMinAmount, filterMaxAmount, 
    filterStartDate, filterEndDate, sortBy
  ]);

  const handleResetFilters = () => {
    setFilterKeyword('');
    setFilterStatus('ACTION_REQUIRED');
    setFilterType('ALL');
    setFilterCategory('ALL');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSortBy('createdAt_desc');
  };

  const renderStatus = (status) => {
    switch (status) {
      case 'PendingApproval': 
        return <span style={{ color: '#c2410c', backgroundColor: '#ffedd5', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>事前承認待ち</span>;
      case 'Approved': 
        return <span style={{ color: '#1565c0', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>事前承認済</span>;
      case 'Advance_MoneyHandedOver': 
        return <span style={{ color: '#0369a1', backgroundColor: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>事前出金渡し済</span>;
      case 'WaitingConfirmation': 
        return <span style={{ color: '#b45309', backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>領収書確認待ち</span>;
      case 'WaitingUniversitySubmission': 
        return <span style={{ color: '#6d28d9', backgroundColor: '#f3e8ff', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>大学へ提出待ち</span>;
      case 'UniversitySubmitted': 
        return <span style={{ color: '#1d4ed8', backgroundColor: '#dbeafe', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>大学へ提出済</span>;
      case 'Settled': 
        return <span style={{ color: '#15803d', backgroundColor: '#dcfce7', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>精算完了</span>;
      case 'Rejected': 
        return <span style={{ color: '#b91c1c', backgroundColor: '#fee2e2', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>却下</span>;
      default: 
        return status;
    }
  };

  // 申請者の名前と権限（管理者・主将会計）の識別表示
  const renderApplicant = (user) => {
    if (!user) return '不明';
    const roleName = user.role?.name || user.roleName || '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <strong style={{ color: '#1e293b' }}>{user.name}</strong>
          {roleName === 'ADMIN' && (
            <span style={{ 
              fontSize: '10px', 
              padding: '1px 6px', 
              borderRadius: '4px', 
              backgroundColor: '#f3e8ff', 
              color: '#7e22ce', 
              fontWeight: '700',
              border: '1px solid #e9d5ff'
            }}>
              管理者
            </span>
          )}
          {roleName === 'MANAGER' && (
            <span style={{ 
              fontSize: '10px', 
              padding: '1px 6px', 
              borderRadius: '4px', 
              backgroundColor: '#e0e7ff', 
              color: '#3730a3', 
              fontWeight: '700',
              border: '1px solid #c7d2fe'
            }}>
              主将会計
            </span>
          )}
        </div>
        {user.email && (
          <span style={{ fontSize: '11px', color: '#64748b' }}>{user.email}</span>
        )}
      </div>
    );
  };

  const getTypeStr = (type) => type === 'Reimbursement' ? '立替払い' : '事前出金';
  const getTitle = (app) => app.title || (app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].itemName : '品目なし');
  const getCategory = (app) => {
    if (!app.expenseItems || app.expenseItems.length === 0) return '-';
    const cat = app.expenseItems[0].category;
    return CATEGORY_MAP[cat] || cat || '-';
  };

  const actionRequiredCount = applications.filter(a => actionRequiredStatuses.includes(a.status)).length;

  return (
    <div className="admin-container fade-in">
      <PageHeader title="管理画面 - 申請タスク管理" backTo="/top" />

      <main className="admin-content">
        {error && <div className="p-4 text-red-500 text-center mb-4 bg-white rounded shadow">{error}</div>}

        {/* フィルターパネル */}
        <section className="admin-filter-card" style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0'
        }}>
          {/* 上段: キーワード検索 & メインステータス切替 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px', flex: '1 1 300px', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '40px', width: '100%' }}
                  placeholder="申請ID、申請者名、品目名、使途等で検索..."
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button"
                className={`filter-tab-btn ${filterStatus === 'ACTION_REQUIRED' ? 'active' : ''}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: filterStatus === 'ACTION_REQUIRED' ? '#eff6ff' : '#ffffff',
                  borderColor: filterStatus === 'ACTION_REQUIRED' ? '#3b82f6' : '#cbd5e1',
                  color: filterStatus === 'ACTION_REQUIRED' ? '#1d4ed8' : '#475569'
                }}
                onClick={() => setFilterStatus('ACTION_REQUIRED')}
              >
                <AlertTriangle size={15} color={filterStatus === 'ACTION_REQUIRED' ? '#2563eb' : '#64748b'} />
                主将会計 要確認タスク
                <span style={{ 
                  backgroundColor: filterStatus === 'ACTION_REQUIRED' ? '#2563eb' : '#94a3b8', 
                  color: '#fff', 
                  fontSize: '11px', 
                  padding: '1px 6px', 
                  borderRadius: '10px' 
                }}>
                  {actionRequiredCount}
                </span>
              </button>

              <button 
                type="button"
                className={`filter-tab-btn ${filterStatus === 'ALL' ? 'active' : ''}`}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  backgroundColor: filterStatus === 'ALL' ? '#eff6ff' : '#ffffff',
                  borderColor: filterStatus === 'ALL' ? '#3b82f6' : '#cbd5e1',
                  color: filterStatus === 'ALL' ? '#1d4ed8' : '#475569'
                }}
                onClick={() => setFilterStatus('ALL')}
              >
                全申請を表示 ({applications.length})
              </button>

              <button
                type="button"
                className="secondary-btn"
                style={{ height: '40px', padding: '0 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter size={15} />
                詳細絞り込み
                {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <button
                type="button"
                className="secondary-btn"
                style={{ height: '40px', padding: '0 10px', color: '#64748b' }}
                title="フィルターをリセット"
                onClick={handleResetFilters}
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </div>

          {/* 下段: 詳細プロパティ別絞り込み (折りたたみ可能) */}
          {showAdvancedFilters && (
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: '1px solid #f1f5f9', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '12px' 
            }}>
              {/* ステータス */}
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>ステータス</label>
                <select 
                  className="form-input" 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  <option value="ACTION_REQUIRED">主将会計 要確認のみ</option>
                  <option value="ALL">すべて</option>
                  <option value="PendingApproval">事前承認待ち</option>
                  <option value="Approved">事前承認済</option>
                  <option value="Advance_MoneyHandedOver">事前出金渡し済</option>
                  <option value="WaitingConfirmation">領収書確認待ち</option>
                  <option value="WaitingUniversitySubmission">大学へ提出待ち</option>
                  <option value="UniversitySubmitted">大学へ提出済</option>
                  <option value="Settled">精算完了</option>
                  <option value="Rejected">却下</option>
                </select>
              </div>

              {/* 区分 */}
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>区分</label>
                <select 
                  className="form-input" 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  <option value="ALL">すべての区分</option>
                  <option value="Reimbursement">立替払い</option>
                  <option value="Advance">事前出金</option>
                </select>
              </div>

              {/* 使途カテゴリ */}
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>使途カテゴリ</label>
                <select 
                  className="form-input" 
                  value={filterCategory} 
                  onChange={(e) => setFilterCategory(e.target.value)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  <option value="ALL">すべてのカテゴリ</option>
                  <option value="SERVER">サーバー・インフラ代</option>
                  <option value="EQUIPMENT">備品購入</option>
                  <option value="EVENT">イベント・大会費用</option>
                  <option value="BOOKS">書籍・技術書</option>
                  <option value="OTHER">その他</option>
                </select>
              </div>

              {/* 金額範囲 */}
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>金額範囲 (円)</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className="form-input"
                    value={filterMinAmount}
                    onChange={(e) => setFilterMinAmount(e.target.value)}
                    style={{ height: '36px', fontSize: '13px', width: '50%' }}
                  />
                  <span>〜</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className="form-input"
                    value={filterMaxAmount}
                    onChange={(e) => setFilterMaxAmount(e.target.value)}
                    style={{ height: '36px', fontSize: '13px', width: '50%' }}
                  />
                </div>
              </div>

              {/* 申請日範囲 */}
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>申請日 (開始〜終了)</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input 
                    type="date" 
                    className="form-input"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    style={{ height: '36px', fontSize: '12px', width: '50%', padding: '4px' }}
                  />
                  <span>〜</span>
                  <input 
                    type="date" 
                    className="form-input"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    style={{ height: '36px', fontSize: '12px', width: '50%', padding: '4px' }}
                  />
                </div>
              </div>

              {/* ソート */}
              <div>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>並び順</label>
                <select 
                  className="form-input" 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ height: '36px', fontSize: '13px' }}
                >
                  <option value="createdAt_desc">申請日 新しい順</option>
                  <option value="createdAt_asc">申請日 古い順</option>
                  <option value="amount_desc">金額 高い順</option>
                  <option value="amount_asc">金額 低い順</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* リスト件数バー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
          <span style={{ fontSize: '14px', color: '#475569', fontWeight: '500' }}>
            表示件数: <strong>{filteredApplications.length}</strong> 件
            {filterStatus === 'ACTION_REQUIRED' && (
              <span style={{ color: '#c2410c', marginLeft: '6px' }}>（主将会計の要確認タスク）</span>
            )}
          </span>
        </div>
        
        {isLoading ? (
          <div className="loading-state">読み込み中...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-state">
            {filterStatus === 'ACTION_REQUIRED' ? '現在、主将会計が処理すべき要確認タスクはありません。' : '条件に一致する申請はありません。'}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>申請ID</th>
                  <th>申請日</th>
                  <th>申請者 (権限)</th>
                  <th>用途・品目</th>
                  <th>使途</th>
                  <th>金額</th>
                  <th>区分</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map(app => (
                  <tr key={app.id}>
                    <td className="cell-id">{app.id.substring(0, 8)}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>{renderApplicant(app.user)}</td>
                    <td className="cell-title">
                      <div style={{ fontWeight: '600' }}>{getTitle(app)}</div>
                      {app.expenseItems && app.expenseItems.length > 1 && (
                        <span style={{ fontSize: '11px', color: '#64748b' }}>他 {app.expenseItems.length - 1} 品目</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#475569' }}>{getCategory(app)}</span>
                    </td>
                    <td className="cell-amount">¥{app.totalAmount.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${app.type === 'Advance' ? 'badge-advance' : 'badge-reimburse'}`}>
                        {getTypeStr(app.type)}
                      </span>
                    </td>
                    <td>{renderStatus(app.status)}</td>
                    <td className="cell-actions">
                      <button 
                        className="action-btn view-btn" 
                        title="詳細を見る"
                        onClick={() => navigate(`/applications/${app.id}`)}
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <FileText size={16} />
                        詳細・処理
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default Admin;
