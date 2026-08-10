import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText } from 'lucide-react';
import './Admin.css';

function Admin() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock fetching pending applications
    const fetchApplications = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setApplications([
        {
          id: 'EXP-1001',
          applicant: '山田 太郎',
          title: 'AWSサーバー代 (8月分)',
          amount: 12500,
          type: '立替払い',
          method: 'Web購入',
          status: 'PENDING_APPROVAL',
          date: '2026-08-09'
        },
        {
          id: 'EXP-1002',
          applicant: '佐藤 花子',
          title: '新入生歓迎会 備品',
          amount: 8300,
          type: '立替払い',
          method: '実店舗購入',
          status: 'PENDING_APPROVAL',
          date: '2026-08-10'
        },
        {
          id: 'EXP-1003',
          applicant: '鈴木 一郎',
          title: '大会エントリー費用',
          amount: 30000,
          type: '事前出金',
          method: 'Web購入',
          status: 'PENDING_APPROVAL',
          date: '2026-08-10'
        }
      ]);
      setIsLoading(false);
    };

    fetchApplications();
  }, []);

  const handleApprove = (id) => {
    // Optimistic UI update
    setApplications(prev => prev.filter(app => app.id !== id));
    // Here you would make an API call to update status to APPROVED
    alert(`${id} を承認しました。`);
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          ダッシュボードへ戻る
        </button>
        <h1>管理画面 - 承認待ち一覧</h1>
      </header>

      <main className="admin-content">
        {isLoading ? (
          <div className="loading-state">読み込み中...</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">現在、承認待ちの申請はありません。</div>
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
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td className="cell-id">{app.id}</td>
                    <td>{app.date}</td>
                    <td>{app.applicant}</td>
                    <td className="cell-title">{app.title}</td>
                    <td className="cell-amount">¥{app.amount.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${app.type === '事前出金' ? 'badge-advance' : 'badge-reimburse'}`}>
                        {app.type}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <button className="action-btn view-btn" title="詳細を見る">
                        <FileText size={16} />
                        詳細
                      </button>
                      <button 
                        className="action-btn approve-btn" 
                        title="承認する"
                        onClick={() => handleApprove(app.id)}
                      >
                        <CheckCircle size={16} />
                        承認
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
