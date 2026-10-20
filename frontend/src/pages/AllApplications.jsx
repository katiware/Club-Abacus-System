import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Eye, Clock, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './AllApplications.css';

function AllApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState(null);

  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState('');
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
        return <span className="status-badge">{status}</span>;
    }
  };

  const getTypeStr = (type) => type === 'Reimbursement' ? '立替払い' : '事前出金';
  const getTitle = (app) => app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].itemName : '品目なし';

  const filteredApplications = applications.filter(app => {
    const matchesSearch = getTitle(app).includes(searchTerm) || 
                          (app.user?.name || '').includes(searchTerm) || 
                          app.id.includes(searchTerm);
    
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'PENDING') return matchesSearch && app.status === 'PendingApproval';
    if (statusFilter === 'APPROVED') return matchesSearch && app.status === 'Approved';
    if (statusFilter === 'ADVANCE_HANDED') return matchesSearch && app.status === 'Advance_MoneyHandedOver';
    if (statusFilter === 'CONFIRMING') return matchesSearch && app.status === 'WaitingConfirmation';
    if (statusFilter === 'WAITING_SUBMISSION') return matchesSearch && app.status === 'WaitingUniversitySubmission';
    if (statusFilter === 'SUBMITTED') return matchesSearch && app.status === 'UniversitySubmitted';
    if (statusFilter === 'COMPLETED') return matchesSearch && app.status === 'Settled';
    
    return matchesSearch;
  });

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
        <div className="filters-section">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="申請ID、申請者、タイトルで検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-dropdown" style={{ marginRight: '16px' }}>
            <Filter size={18} className="filter-icon" />
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
          
          <div className="filter-dropdown">
            <Filter size={18} className="filter-icon" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">すべてのステータス</option>
              <option value="PENDING">承認待ち</option>
              <option value="APPROVED">事前承認済</option>
              <option value="ADVANCE_HANDED">事前出金渡し済</option>
              <option value="CONFIRMING">領収書確認待ち</option>
              <option value="WAITING_SUBMISSION">大学へ提出待ち</option>
              <option value="SUBMITTED">大学へ提出済</option>
              <option value="COMPLETED">完了</option>
            </select>
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
                    <td><span className={`type-badge ${app.type === 'Advance' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{getTypeStr(app.type)}</span></td>
                    <td className="font-medium text-right">
                      <div>¥{app.totalAmount.toLocaleString()}</div>
                      {app.externalBudgetAmount > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#db2777', marginTop: '2px' }} title={`うち部費外充当: ¥${app.externalBudgetAmount.toLocaleString()}`}>
                          部費: ¥{(app.totalAmount - app.externalBudgetAmount).toLocaleString()} / 外: ¥{app.externalBudgetAmount.toLocaleString()}
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
