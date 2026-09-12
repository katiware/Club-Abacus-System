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

  useEffect(() => {
    const fetchAllApplications = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/Expense/all');
        setApplications(response.data);
      } catch (err) {
        console.error('Failed to fetch all applications', err);
        setError('申請データの取得に失敗しました。管理者権限があるか確認してください。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllApplications();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return <span className="status-badge">下書き</span>;
      case 'PendingApproval':
        return <span className="status-badge pending"><Clock size={14} /> 承認待ち</span>;
      case 'Approved':
      case 'Advance_MoneyHandedOver':
        return <span className="status-badge approved"><CheckCircle size={14} /> 承認済（証憑提出待ち）</span>;
      case 'WaitingConfirmation':
        return <span className="status-badge waiting"><Clock size={14} /> 最終確認待ち</span>;
      case 'UniversitySubmitted':
        return <span className="status-badge"><Clock size={14} /> 大学へ提出済</span>;
      case 'Settled':
        return <span className="status-badge completed"><CheckCircle size={14} /> 完了</span>;
      case 'Rejected':
        return <span className="status-badge danger-text"><AlertCircle size={14} /> 却下</span>;
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
    if (statusFilter === 'APPROVED') return matchesSearch && (app.status === 'Approved' || app.status === 'Advance_MoneyHandedOver');
    if (statusFilter === 'CONFIRMING') return matchesSearch && app.status === 'WaitingConfirmation';
    if (statusFilter === 'COMPLETED') return matchesSearch && app.status === 'Settled';
    
    return matchesSearch;
  });

  return (
    <div className="all-apps-container fade-in">
      <PageHeader title="すべての申請一覧" backTo="/top">
        <button className="secondary-btn">
          <Download size={18} />
          CSVエクスポート
        </button>
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
          
          <div className="filter-dropdown">
            <Filter size={18} className="filter-icon" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">すべてのステータス</option>
              <option value="PENDING">承認待ち</option>
              <option value="APPROVED">承認済（証憑待ち）</option>
              <option value="CONFIRMING">最終確認待ち</option>
              <option value="COMPLETED">完了</option>
            </select>
          </div>
        </div>

        {error && <div className="p-4 text-red-500 text-center">{error}</div>}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
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
                  <td colSpan="8" className="text-center p-8 text-gray-500">読み込み中...</td>
                </tr>
              ) : filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-8 text-gray-500">該当する申請がありません</td>
                </tr>
              ) : (
                filteredApplications.map(app => (
                  <tr key={app.id}>
                    <td className="font-mono text-sm">{app.id.substring(0, 8)}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td className="font-medium">{app.user?.name || '不明'}</td>
                    <td>{getTitle(app)}</td>
                    <td><span className={`type-badge ${app.type === 'Advance' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{getTypeStr(app.type)}</span></td>
                    <td className="font-medium text-right">¥{app.totalAmount.toLocaleString()}</td>
                    <td>{getStatusBadge(app.status)}</td>
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
