import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, Eye, Clock, CheckCircle, 
  AlertTriangle, AlertCircle, RotateCcw, ChevronDown, 
  ChevronUp, Calendar, DollarSign, Layers, Tag, X, FileText
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './AllApplications.css';

function AllApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // フィルター用ステート
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
  const [quickStatus, setQuickStatus] = useState('ALL'); // ALL, ACTION_REQUIRED, IN_PROGRESS, COMPLETED, REJECTED
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, Reimbursement, Advance
  const [externalBudgetFilter, setExternalBudgetFilter] = useState('ALL'); // ALL, HAS_EXTERNAL, NO_EXTERNAL, CASH, AMAZON_GIFT, OTHER
  const [receiptTypeFilter, setReceiptTypeFilter] = useState('ALL'); // ALL, Digital, Paper
  const [datePreset, setDatePreset] = useState('ALL'); // ALL, THIS_MONTH, LAST_MONTH, LAST_30_DAYS, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('DATE_DESC'); // DATE_DESC, DATE_ASC, AMOUNT_DESC, AMOUNT_ASC

  // 詳細フィルターの開閉
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // 年度・選択状態
  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isExportingZip, setIsExportingZip] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const fyRes = await api.get('/FiscalYear');
        setFiscalYears(fyRes.data);
        const activeFy = fyRes.data.find(f => f.isActive);
        if (activeFy) setSelectedFiscalYear(activeFy.id);
      } catch (err) {
        console.error('Failed to fetch fiscal years', err);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchAllApplications = async () => {
      setIsLoading(true);
      setSelectedIds([]);
      try {
        const url = selectedFiscalYear ? `/Expense/all?fiscalYearId=${selectedFiscalYear}` : '/Expense/all';
        const response = await api.get(url);
        setApplications(response.data);
      } catch (err) {
        console.error('Failed to fetch all applications', err);
        setError('申請データの取得に失敗しました。管理者権限があるか確認してください。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllApplications();
  }, [selectedFiscalYear]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedIds.length === filteredApplications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredApplications.map(a => a.id));
    }
  };

  const handleExportZip = async (targetIds = selectedIds) => {
    const ids = targetIds.length > 0 ? targetIds : filteredApplications.map(a => a.id);
    if (ids.length === 0) {
      alert('ダウンロード対象の申請がありません。');
      return;
    }

    setIsExportingZip(true);
    try {
      const response = await api.post('/Expense/export-zip', ids, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `証憑まとめ_${new Date().toISOString().slice(0,10)}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP export failed', err);
      alert('証憑ZIPの作成に失敗しました。対象の申請に証憑ファイルがアップロードされているか確認してください。');
    } finally {
      setIsExportingZip(false);
    }
  };

  // フィルターのリセット
  const handleResetFilters = () => {
    setSearchTerm('');
    setQuickStatus('ALL');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setExternalBudgetFilter('ALL');
    setReceiptTypeFilter('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('DATE_DESC');
  };

  // アクティブな詳細フィルターの個数
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (externalBudgetFilter !== 'ALL') count++;
    if (receiptTypeFilter !== 'ALL') count++;
    if (datePreset !== 'ALL' || startDate || endDate) count++;
    if (sortBy !== 'DATE_DESC') count++;
    return count;
  }, [typeFilter, statusFilter, externalBudgetFilter, receiptTypeFilter, datePreset, startDate, endDate, sortBy]);

  const getStatusBadge = (app) => {
    switch (app.status) {
      case 'Draft':
        return <span className="status-badge">下書き</span>;
      case 'PendingApproval':
        return app.isEditedAfterApproval
          ? <span className="status-badge" style={{backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #fde047'}}><Clock size={14} /> 再承認待(変更あり)</span>
          : <span className="status-badge pending"><Clock size={14} /> 承認待ち</span>;
      case 'Approved':
        return <span className="status-badge approved"><CheckCircle size={14} /> 事前承認済</span>;
      case 'Advance_MoneyHandedOver':
        return <span className="status-badge" style={{backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'}}><CheckCircle size={14} /> 事前出金渡し済</span>;
      case 'WaitingConfirmation':
        return <span className="status-badge waiting"><Clock size={14} /> 領収書確認待ち</span>;
      case 'WaitingUniversitySubmission':
        return <span className="status-badge" style={{backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe'}}><Clock size={14} /> 大学へ提出待ち</span>;
      case 'UniversitySubmitted':
        return <span className="status-badge" style={{backgroundColor: '#dbeafe', color: '#1d4ed8'}}><Clock size={14} /> 大学へ提出済</span>;
      case 'Settled':
        return <span className="status-badge completed"><CheckCircle size={14} /> 完了</span>;
      case 'Rejected':
        return <span className="status-badge danger-text"><AlertCircle size={14} /> 却下</span>;
      case 'Remanded':
        return <span className="status-badge warning-text"><AlertCircle size={14} /> 差し戻し中</span>;
      default:
        return <span className="status-badge">{app.status}</span>;
    }
  };

  const getTypeStr = (type) => type === 'Reimbursement' ? '立替払い' : '事前出金';
  const getTitle = (app) => app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].itemName : (app.title || '品目なし');

  // フィルタリング & ソート処理
  const filteredApplications = useMemo(() => {
    let result = applications.filter(app => {
      // 1. キーワード検索
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = (app.title || '').toLowerCase().includes(term);
        const matchesItems = (app.expenseItems || []).some(item => (item.itemName || '').toLowerCase().includes(term));
        const matchesUser = (app.user?.name || '').toLowerCase().includes(term);
        const matchesId = (app.id || '').toLowerCase().includes(term);
        if (!matchesTitle && !matchesItems && !matchesUser && !matchesId) {
          return false;
        }
      }

      // 2. クイックステータス
      if (quickStatus === 'ACTION_REQUIRED') {
        const requiredStatuses = ['PendingApproval', 'WaitingConfirmation', 'WaitingUniversitySubmission'];
        if (!requiredStatuses.includes(app.status)) return false;
      } else if (quickStatus === 'IN_PROGRESS') {
        const progressStatuses = ['Approved', 'Advance_MoneyHandedOver', 'UniversitySubmitted'];
        if (!progressStatuses.includes(app.status)) return false;
      } else if (quickStatus === 'COMPLETED') {
        if (app.status !== 'Settled') return false;
      } else if (quickStatus === 'REJECTED') {
        if (app.status !== 'Rejected' && app.status !== 'Remanded') return false;
      }

      // 3. 詳細ステータス
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PENDING' && app.status !== 'PendingApproval') return false;
        if (statusFilter === 'APPROVED' && app.status !== 'Approved') return false;
        if (statusFilter === 'ADVANCE_HANDED' && app.status !== 'Advance_MoneyHandedOver') return false;
        if (statusFilter === 'CONFIRMING' && app.status !== 'WaitingConfirmation') return false;
        if (statusFilter === 'WAITING_SUBMISSION' && app.status !== 'WaitingUniversitySubmission') return false;
        if (statusFilter === 'SUBMITTED' && app.status !== 'UniversitySubmitted') return false;
        if (statusFilter === 'COMPLETED' && app.status !== 'Settled') return false;
        if (statusFilter === 'REJECTED' && app.status !== 'Rejected') return false;
        if (statusFilter === 'REMANDED' && app.status !== 'Remanded') return false;
        if (statusFilter === 'DRAFT' && app.status !== 'Draft') return false;
      }

      // 4. 申請種別
      if (typeFilter !== 'ALL' && app.type !== typeFilter) {
        return false;
      }

      // 5. 部費外予算充当
      if (externalBudgetFilter === 'HAS_EXTERNAL') {
        if (!app.externalBudgetAmount || app.externalBudgetAmount <= 0) return false;
      } else if (externalBudgetFilter === 'NO_EXTERNAL') {
        if (app.externalBudgetAmount && app.externalBudgetAmount > 0) return false;
      } else if (externalBudgetFilter === 'CASH') {
        if (app.externalBudgetAmount <= 0 || app.externalBudgetAssetType !== 'Cash') return false;
      } else if (externalBudgetFilter === 'AMAZON_GIFT') {
        if (app.externalBudgetAmount <= 0 || app.externalBudgetAssetType !== 'AmazonGift') return false;
      } else if (externalBudgetFilter === 'OTHER') {
        if (app.externalBudgetAmount <= 0 || app.externalBudgetAssetType !== 'Other') return false;
      }

      // 6. 領収書形式
      if (receiptTypeFilter !== 'ALL' && app.receiptType !== receiptTypeFilter) {
        return false;
      }

      // 7. 日付範囲
      const appDate = new Date(app.createdAt);
      const now = new Date();

      if (datePreset === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (appDate < startOfMonth) return false;
      } else if (datePreset === 'LAST_MONTH') {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        if (appDate < startOfLastMonth || appDate > endOfLastMonth) return false;
      } else if (datePreset === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (appDate < thirtyDaysAgo) return false;
      } else if (datePreset === 'CUSTOM') {
        if (startDate) {
          const s = new Date(startDate);
          if (appDate < s) return false;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          if (appDate > e) return false;
        }
      }

      return true;
    });

    // ソート
    result.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortBy === 'DATE_ASC') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortBy === 'AMOUNT_DESC') {
        return b.totalAmount - a.totalAmount;
      } else if (sortBy === 'AMOUNT_ASC') {
        return a.totalAmount - b.totalAmount;
      }
      return 0;
    });

    return result;
  }, [
    applications, searchTerm, quickStatus, statusFilter, typeFilter,
    externalBudgetFilter, receiptTypeFilter, datePreset, startDate, endDate, sortBy
  ]);

  // 集計サマリー
  const summary = useMemo(() => {
    let total = 0;
    let extTotal = 0;
    filteredApplications.forEach(app => {
      total += app.totalAmount;
      extTotal += (app.externalBudgetAmount || 0);
    });
    return {
      count: filteredApplications.length,
      totalAmount: total,
      clubAmount: Math.max(0, total - extTotal),
      externalAmount: extTotal
    };
  }, [filteredApplications]);

  return (
    <div className="all-apps-container fade-in">
      <PageHeader title="すべての申請一覧" backTo="/top">
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="secondary-btn" 
            onClick={() => handleExportZip()}
            disabled={isExportingZip || filteredApplications.length === 0}
            title="現在表示中の申請に紐づく証憑を一括ZIPダウンロードします"
          >
            <Download size={18} />
            {isExportingZip ? 'ZIP作成中...' : '表示中の証憑をZIP出力'}
          </button>
        </div>
      </PageHeader>

      <main className="page-content">
        {/* クイックステータスタブ */}
        <div className="quick-status-tabs">
          {[
            { key: 'ALL', label: 'すべて' },
            { key: 'ACTION_REQUIRED', label: '要対応（会計処理待ち）' },
            { key: 'IN_PROGRESS', label: '精算・手続き進行中' },
            { key: 'COMPLETED', label: '精算完了' },
            { key: 'REJECTED', label: '却下・差し戻し' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`quick-tab-btn ${quickStatus === tab.key ? 'active' : ''}`}
              onClick={() => {
                setQuickStatus(tab.key);
                setStatusFilter('ALL'); // クイックタブ切り替え時は個別ステータスをALLにリセット
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* メインフィルター操作バー */}
        <div className="filters-main-bar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="申請ID、申請者、品目、タイトルで検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => setSearchTerm('')} 
                className="clear-search-btn"
                title="検索ワードを消去"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-dropdown">
            <Calendar size={16} className="filter-icon" />
            <select 
              value={selectedFiscalYear} 
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
            >
              <option value="">すべての年度</option>
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>{fy.yearName}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className={`advanced-toggle-btn ${isAdvancedFiltersOpen || activeAdvancedFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
          >
            <Filter size={16} />
            <span>詳細絞り込み</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="filter-count-badge">{activeAdvancedFilterCount}</span>
            )}
            {isAdvancedFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {(searchTerm || quickStatus !== 'ALL' || activeAdvancedFilterCount > 0) && (
            <button
              type="button"
              className="reset-filters-btn"
              onClick={handleResetFilters}
              title="すべての絞り込み条件をクリア"
            >
              <RotateCcw size={14} />
              <span>リセット</span>
            </button>
          )}
        </div>

        {/* 詳細フィルターパネル */}
        {isAdvancedFiltersOpen && (
          <div className="advanced-filter-panel fade-in">
            <div className="filter-grid">
              
              {/* 申請種別 */}
              <div className="filter-group">
                <label className="filter-label">申請種別</label>
                <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">すべて（立替 & 事前出金）</option>
                  <option value="Reimbursement">立替払いのみ</option>
                  <option value="Advance">事前出金のみ</option>
                </select>
              </div>

              {/* 個別ステータス */}
              <div className="filter-group">
                <label className="filter-label">個別ステータス</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    if (e.target.value !== 'ALL') setQuickStatus('ALL');
                  }}
                  className="filter-select"
                >
                  <option value="ALL">指定なし（すべて）</option>
                  <option value="PENDING">承認待ち</option>
                  <option value="APPROVED">事前承認済</option>
                  <option value="ADVANCE_HANDED">事前出金渡し済</option>
                  <option value="CONFIRMING">領収書確認待ち</option>
                  <option value="WAITING_SUBMISSION">大学へ提出待ち</option>
                  <option value="SUBMITTED">大学へ提出済</option>
                  <option value="COMPLETED">精算完了</option>
                  <option value="REJECTED">却下</option>
                  <option value="REMANDED">差し戻し中</option>
                  <option value="DRAFT">下書き</option>
                </select>
              </div>

              {/* 部費外予算充当 */}
              <div className="filter-group">
                <label className="filter-label">部費外予算充当</label>
                <select 
                  value={externalBudgetFilter} 
                  onChange={(e) => setExternalBudgetFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">すべて</option>
                  <option value="HAS_EXTERNAL">部費外予算 充当あり</option>
                  <option value="NO_EXTERNAL">部費外充当なし（部費のみ）</option>
                  <option value="CASH">充当形態: 現金</option>
                  <option value="AMAZON_GIFT">充当形態: Amazonギフト券</option>
                  <option value="OTHER">充当形態: その他</option>
                </select>
              </div>

              {/* 領収書形式 */}
              <div className="filter-group">
                <label className="filter-label">領収書形式</label>
                <select 
                  value={receiptTypeFilter} 
                  onChange={(e) => setReceiptTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">すべて（電子 & 紙）</option>
                  <option value="Digital">電子領収書 (PDF/画像)</option>
                  <option value="Paper">紙の領収書 (原本提出)</option>
                </select>
              </div>

              {/* 期間プリセット */}
              <div className="filter-group">
                <label className="filter-label">申請日 / 期間</label>
                <select 
                  value={datePreset} 
                  onChange={(e) => setDatePreset(e.target.value)}
                  className="filter-select"
                >
                  <option value="ALL">全期間</option>
                  <option value="THIS_MONTH">今月</option>
                  <option value="LAST_MONTH">先月</option>
                  <option value="LAST_30_DAYS">過去30日間</option>
                  <option value="CUSTOM">日付範囲を指定...</option>
                </select>
              </div>

              {/* 並び順ソート */}
              <div className="filter-group">
                <label className="filter-label">並び順</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="DATE_DESC">申請日: 新しい順</option>
                  <option value="DATE_ASC">申請日: 古い順</option>
                  <option value="AMOUNT_DESC">申請金額: 高い順</option>
                  <option value="AMOUNT_ASC">申請金額: 低い順</option>
                </select>
              </div>

            </div>

            {/* カスタム日付指定 */}
            {datePreset === 'CUSTOM' && (
              <div className="custom-date-range">
                <span className="text-sm text-gray-600 font-medium">指定期間:</span>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
                <span className="text-gray-400">〜</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
                {(startDate || endDate) && (
                  <button 
                    type="button" 
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="clear-date-btn"
                  >
                    クリア
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 適用中フィルタータグ & 集計サマリーバー */}
        <div className="filter-summary-bar">
          <div className="summary-badges">
            <span className="summary-count">
              表示中: <strong>{summary.count}</strong> 件
            </span>
            <span className="summary-divider">|</span>
            <span className="summary-amount">
              申請合計: <strong>¥{summary.totalAmount.toLocaleString()}</strong>
            </span>
            {summary.externalAmount > 0 && (
              <span className="summary-sub-amounts">
                ( 部費: ¥{summary.clubAmount.toLocaleString()} / 部費外: ¥{summary.externalAmount.toLocaleString()} )
              </span>
            )}
          </div>

          {/* 適用中のフィルタータグ一覧 */}
          <div className="active-filter-tags">
            {quickStatus !== 'ALL' && (
              <span className="filter-tag">
                クイック: {quickStatus === 'ACTION_REQUIRED' ? '要対応' : quickStatus === 'IN_PROGRESS' ? '進行中' : quickStatus === 'COMPLETED' ? '完了' : '却下/差戻'}
                <button type="button" onClick={() => setQuickStatus('ALL')}><X size={12} /></button>
              </span>
            )}
            {typeFilter !== 'ALL' && (
              <span className="filter-tag">
                種別: {typeFilter === 'Reimbursement' ? '立替' : '事前出金'}
                <button type="button" onClick={() => setTypeFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {statusFilter !== 'ALL' && (
              <span className="filter-tag">
                ステータス: {statusFilter}
                <button type="button" onClick={() => setStatusFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {externalBudgetFilter !== 'ALL' && (
              <span className="filter-tag">
                部費外: {externalBudgetFilter}
                <button type="button" onClick={() => setExternalBudgetFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {receiptTypeFilter !== 'ALL' && (
              <span className="filter-tag">
                領収書: {receiptTypeFilter === 'Digital' ? '電子' : '紙'}
                <button type="button" onClick={() => setReceiptTypeFilter('ALL')}><X size={12} /></button>
              </span>
            )}
            {datePreset !== 'ALL' && (
              <span className="filter-tag">
                期間: {datePreset === 'THIS_MONTH' ? '今月' : datePreset === 'LAST_MONTH' ? '先月' : datePreset === 'LAST_30_DAYS' ? '過去30日' : `${startDate || '〜'} 〜 ${endDate || ''}`}
                <button type="button" onClick={() => { setDatePreset('ALL'); setStartDate(''); setEndDate(''); }}><X size={12} /></button>
              </span>
            )}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div style={{ margin: '0 0 16px 0', padding: '12px 16px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#3730a3', fontWeight: 'bold' }}>
              {selectedIds.length} 件の申請を選択中
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="primary-btn" 
                style={{ padding: '6px 16px', fontSize: '0.9rem' }}
                onClick={() => handleExportZip(selectedIds)}
                disabled={isExportingZip}
              >
                <Download size={16} />
                {isExportingZip ? 'ZIP作成中...' : '選択した申請の証憑をZIPダウンロード'}
              </button>
              <button 
                className="secondary-btn" 
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                onClick={() => setSelectedIds([])}
              >
                選択解除
              </button>
            </div>
          </div>
        )}

        {error && <div className="p-4 text-red-500 text-center">{error}</div>}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={filteredApplications.length > 0 && selectedIds.length === filteredApplications.length}
                    onChange={selectAllFiltered}
                    title="全選択 / 全解除"
                  />
                </th>
                <th>申請ID</th>
                <th>申請日</th>
                <th>申請者</th>
                <th>タイトル</th>
                <th>種類</th>
                <th>金額</th>
                <th>ステータス</th>
                <th>アクション</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="text-center p-8 text-gray-500">読み込み中...</td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center p-8 text-gray-500">該当する申請がありません</td>
                </tr>
              ) : (
                filteredApplications.map(app => (
                  <tr key={app.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(app.id)}
                        onChange={() => toggleSelect(app.id)}
                      />
                    </td>
                    <td className="font-mono text-sm">{app.id.substring(0, 8)}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="font-medium">{app.user?.name || '不明'}</td>
                    <td>{getTitle(app)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={`type-badge ${app.type === 'Advance' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {getTypeStr(app.type)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {app.receiptType === 'Digital' ? '📄 電子領収書' : '🧾 紙の領収書'}
                        </span>
                      </div>
                    </td>
                    <td className="font-medium text-right">
                      <div>¥{app.totalAmount.toLocaleString()}</div>
                      {app.externalBudgetAmount > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#db2777', marginTop: '2px' }} title={`うち部費外充当: ¥${app.externalBudgetAmount.toLocaleString()}`}>
                          部費: ¥{(app.totalAmount - app.externalBudgetAmount).toLocaleString()}
                          <span style={{ marginLeft: '4px', backgroundColor: '#fdf2f8', padding: '1px 4px', borderRadius: '4px', border: '1px solid #fbcfe8' }}>
                            {app.externalBudgetAssetType === 'Cash' ? '現金' : app.externalBudgetAssetType === 'AmazonGift' ? 'アマギフ' : '外'}: ¥{app.externalBudgetAmount.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>{getStatusBadge(app)}</td>
                    <td>
                      <button 
                        className="icon-action-btn"
                        onClick={() => navigate(`/applications/${app.id}`)}
                        title="詳細を見る"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default AllApplications;
