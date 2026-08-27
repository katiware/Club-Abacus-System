import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Eye } from 'lucide-react';
import './AllApplications.css';

function AllApplications() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for all applications
  const applications = [
    { id: 'EXP-1001', date: '2026-08-09', applicant: '山田 太郎', title: 'AWSサーバー代 (8月分)', amount: 12500, type: '立替払い', status: 'PENDING_APPROVAL' },
    { id: 'EXP-1002', date: '2026-08-10', applicant: '佐藤 花子', title: '新入生歓迎会 備品', amount: 8300, type: '立替払い', status: 'COMPLETED' },
    { id: 'EXP-1003', date: '2026-08-10', applicant: '鈴木 一郎', title: '大会エントリー費用', amount: 30000, type: '事前出金', status: 'WAITING_CONFIRMATION' },
    { id: 'EXP-1004', date: '2026-08-11', applicant: '高橋 次郎', title: '技術書購入', amount: 3200, type: '立替払い', status: 'REJECTED' },
    { id: 'EXP-1005', date: '2026-08-12', applicant: '伊藤 美咲', title: '部室用プリンターインク', amount: 4500, type: '立替払い', status: 'APPROVED' },
    { id: 'EXP-1006', date: '2026-08-13', applicant: '山田 太郎', title: 'ドメイン更新料', amount: 1500, type: '立替払い', status: 'COMPLETED' },
  ];

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL': return <span className="status-badge status-pending">承認待ち</span>;
      case 'APPROVED': return <span className="status-badge status-approved">承認済(提出待)</span>;
      case 'WAITING_CONFIRMATION': return <span className="status-badge status-waiting">最終確認待</span>;
      case 'COMPLETED': return <span className="status-badge status-completed">完了</span>;
      case 'REJECTED': return <span className="status-badge status-rejected">差戻し</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  const filteredApps = applications.filter(app => 
    app.title.includes(searchTerm) || app.applicant.includes(searchTerm) || app.id.includes(searchTerm)
  );

  return (
    <div className="all-applications-container fade-in">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          ダッシュボードへ戻る
        </button>
        <h1>台帳管理 (全ての申請)</h1>
      </header>

      <main className="page-content">
        <div className="controls-bar">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="申請ID, 申請者, 用途で検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="filter-button">
            <Filter size={18} />
            フィルター
          </button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
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
              {filteredApps.map(app => (
                <tr key={app.id} className="table-row">
                  <td className="font-mono text-sm">{app.id}</td>
                  <td>{app.date}</td>
                  <td>{app.applicant}</td>
                  <td className="font-medium">{app.title}</td>
                  <td className="amount-cell">¥{app.amount.toLocaleString()}</td>
                  <td><span className="type-badge">{app.type}</span></td>
                  <td>{renderStatusBadge(app.status)}</td>
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
              ))}
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-state-cell">該当する申請が見つかりません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default AllApplications;
