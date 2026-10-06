import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './Admin.css';

function Admin() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/Expense/all');
      // 未処理タスクのみをフィルタリング
      const pendingTasks = response.data.filter(app => 
        app.status === 'PendingApproval' || 
        app.status === 'Approved' ||
        app.status === 'Advance_MoneyHandedOver' ||
        app.status === 'UniversitySubmitted' ||
        app.status === 'WaitingConfirmation'
      );
      setApplications(pendingTasks);
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



  const renderStatus = (status) => {
    switch (status) {
      case 'PendingApproval': return <span style={{ color: '#e65100', fontWeight: 'bold' }}>承認待ち</span>;
      case 'Approved': return <span style={{ color: '#1565c0', fontWeight: 'bold' }}>事前承認済</span>;
      case 'Advance_MoneyHandedOver': return <span style={{ color: '#1565c0', fontWeight: 'bold' }}>承認済(手渡し済)</span>;
      case 'UniversitySubmitted': return <span style={{ color: '#1565c0', fontWeight: 'bold' }}>大学へ提出済</span>;
      case 'WaitingConfirmation': return <span style={{ color: '#1565c0', fontWeight: 'bold' }}>最終確認待</span>;
      default: return status;
    }
  };



  const getTypeStr = (type) => type === 'Reimbursement' ? '立替払い' : '事前出金';
  const getTitle = (app) => app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].itemName : '品目なし';

  return (
    <div className="admin-container fade-in">
      <PageHeader title="管理画面 - 未処理タスク一覧" backTo="/top" />

      <main className="admin-content">
        {error && <div className="p-4 text-red-500 text-center">{error}</div>}
        
        {isLoading ? (
          <div className="loading-state">読み込み中...</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">現在、未処理のタスクはありません。</div>
        ) : (
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>申請ID</th>
                  <th>申請日</th>
                  <th>申請者</th>
                  <th>用途・品目</th>
                  <th>金額</th>
                  <th>区分</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td className="cell-id">{app.id.substring(0, 8)}</td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                    <td>{app.user?.name || '不明'}</td>
                    <td className="cell-title">{getTitle(app)}</td>
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
                        詳細を見る・処理する
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
