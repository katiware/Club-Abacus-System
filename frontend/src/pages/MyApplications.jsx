import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, UploadCloud, CheckCircle, Clock } from 'lucide-react';
import './MyApplications.css';

function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for upload modal
  const [uploadingAppId, setUploadingAppId] = useState(null);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMyApplications = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setApplications([
        {
          id: 'EXP-1004',
          title: '技術書購入',
          amount: 3200,
          type: '立替払い',
          method: 'Web購入',
          status: 'PENDING_APPROVAL',
          date: '2026-08-11'
        },
        {
          id: 'EXP-0995',
          title: 'AWSサーバー代 (7月分)',
          amount: 12500,
          type: '立替払い',
          method: 'Web購入',
          status: 'APPROVED', // Needs receipt upload
          date: '2026-08-01'
        },
        {
          id: 'EXP-0988',
          title: '大会エントリー費用',
          amount: 30000,
          type: '事前出金',
          method: 'Web購入',
          status: 'WAITING_CONFIRMATION',
          date: '2026-07-20'
        },
        {
          id: 'EXP-0950',
          title: '新入生歓迎会 備品',
          amount: 8300,
          type: '立替払い',
          method: '実店舗購入',
          status: 'COMPLETED',
          date: '2026-04-15'
        }
      ]);
      setIsLoading(false);
    };

    fetchMyApplications();
  }, []);

  const openUploadModal = (id) => {
    setUploadingAppId(id);
    setFile(null);
  };

  const closeUploadModal = () => {
    setUploadingAppId(null);
    setFile(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Optimistic update
    setApplications(prev => 
      prev.map(app => 
        app.id === uploadingAppId 
          ? { ...app, status: 'WAITING_CONFIRMATION' } 
          : app
      )
    );
    
    setIsSubmitting(false);
    closeUploadModal();
    alert('証憑ファイルを提出しました。管理者の最終確認をお待ちください。');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <span className="status-badge pending"><Clock size={14} /> 承認待ち</span>;
      case 'APPROVED':
        return <span className="status-badge approved"><CheckCircle size={14} /> 承認済（証憑提出待ち）</span>;
      case 'WAITING_CONFIRMATION':
        return <span className="status-badge waiting"><Clock size={14} /> 最終確認待ち</span>;
      case 'COMPLETED':
        return <span className="status-badge completed"><CheckCircle size={14} /> 完了</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const needsUpload = (app) => {
    // 承認済であり、かつ証憑アップロードが必要な状態
    // (立替払いのWeb購入、または事前出金の事後報告など)
    return app.status === 'APPROVED' && app.method === 'Web購入';
  };

  return (
    <div className="my-apps-container">
      <header className="my-apps-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          ダッシュボードへ戻る
        </button>
        <h1>申請履歴・証憑提出</h1>
      </header>

      <main className="my-apps-content">
        {isLoading ? (
          <div className="loading-state">読み込み中...</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">申請履歴がありません。</div>
        ) : (
          <div className="cards-wrapper">
            {applications.map(app => (
              <div key={app.id} className="app-card">
                <div className="app-card-header">
                  <span className="app-id">{app.id}</span>
                  <span className="app-date">{app.date}</span>
                </div>
                <h3 className="app-title">{app.title}</h3>
                <div className="app-details">
                  <span className="app-amount">¥{app.amount.toLocaleString()}</span>
                  <span className={`app-type ${app.type === '事前出金' ? 'type-advance' : 'type-reimburse'}`}>
                    {app.type} ({app.method})
                  </span>
                </div>
                <div className="app-footer">
                  {getStatusBadge(app.status)}
                  {needsUpload(app) && (
                    <button 
                      className="upload-btn"
                      onClick={() => openUploadModal(app.id)}
                    >
                      <UploadCloud size={16} />
                      領収書を提出
                    </button>
                  )}
                  {app.status === 'APPROVED' && app.method === '実店舗購入' && (
                    <span className="store-note">※紙の領収書を会計担当に直接お渡しください。</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {uploadingAppId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>領収書の提出 ({uploadingAppId})</h2>
            <p>対象の領収書または請求書のファイル（画像、PDF）をアップロードしてください。</p>
            
            <form onSubmit={handleUploadSubmit}>
              <div className="file-drop-area">
                <UploadCloud size={32} className="upload-icon" />
                <p>クリックしてファイルを選択するか、ドラッグ＆ドロップしてください</p>
                <input 
                  type="file" 
                  className="file-input" 
                  onChange={handleFileChange}
                  accept=".pdf,image/*" 
                />
                {file && (
                  <div className="file-name">
                    <FileText size={16} />
                    {file.name}
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeUploadModal} disabled={isSubmitting}>
                  キャンセル
                </button>
                <button type="submit" className="submit-btn" disabled={!file || isSubmitting}>
                  {isSubmitting ? '送信中...' : '提出する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyApplications;
