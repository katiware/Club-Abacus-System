import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, UploadCloud, CheckCircle, Clock, Plus, Download, Eye, Paperclip, AlertCircle, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './MyApplications.css';

function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for upload modal
  const [uploadingAppId, setUploadingAppId] = useState(null);
  const [uploadingAppType, setUploadingAppType] = useState(null);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/Expense/me');
      setApplications(response.data);
    } catch (err) {
      console.error('Failed to fetch applications', err);
      setError('申請履歴の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const openUploadModal = (id, type) => {
    setUploadingAppId(id);
    setUploadingAppType(type);
    setFile(null);
  };

  const closeUploadModal = () => {
    setUploadingAppId(null);
    setUploadingAppType(null);
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
    try {
      const fileFormData = new FormData();
      fileFormData.append('file', file);
      const docType = uploadingAppType === 'Advance' ? 'Quotation' : 'Receipt';
      fileFormData.append('documentType', docType);

      await api.post(`/expenses/${uploadingAppId}/documents`, fileFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // 更新するために再フェッチ
      await fetchMyApplications();
      closeUploadModal();
      alert('証憑ファイルを提出しました。');
    } catch (err) {
      console.error(err);
      alert('アップロードに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const needsUpload = (app) => {
    // ステータスが Approved 等で、まだ証憑が揃っていない場合。実店舗購入（紙の領収書）の場合は提出画面を出さない
    return (app.status === 'Approved' || app.status === 'Advance_MoneyHandedOver') && app.receiptType !== 'Paper';
  };

  const getTypeStr = (type) => type === 'Reimbursement' ? '立替払い' : '事前出金';
  const getReceiptTypeStr = (receiptType) => receiptType === 'Paper' ? '実店舗購入' : 'Web購入';
  const getTitle = (app) => app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].itemName : '品目なし';

  return (
    <div className="my-apps-container fade-in">
      <PageHeader title="申請履歴・証憑提出" backTo="/top" />

      <main className="my-apps-content">
        {error && <div className="p-4 text-red-500 text-center">{error}</div>}
        
        {isLoading ? (
          <div className="loading-state">読み込み中...</div>
        ) : applications.length === 0 ? (
          <div className="empty-state">申請履歴がありません。</div>
        ) : (
          <div className="cards-wrapper">
            {applications.map(app => (
              <div key={app.id} className="app-card">
                <div className="app-card-header">
                  <span className="app-id">ID: {app.id.substring(0, 8)}</span>
                  <span className="app-date">{new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="app-title">{getTitle(app)}</h3>
                <div className="app-details">
                  <span className="app-amount">¥{app.totalAmount.toLocaleString()}</span>
                  <span className={`app-type ${app.type === 'Advance' ? 'type-advance' : 'type-reimburse'}`}>
                    {getTypeStr(app.type)} ({getReceiptTypeStr(app.receiptType)})
                  </span>
                </div>
                <div className="app-footer">
                  {getStatusBadge(app.status)}
                  {needsUpload(app) && (
                    <button 
                      className="upload-btn"
                      onClick={() => openUploadModal(app.id, app.type)}
                    >
                      <UploadCloud size={16} />
                      証憑を提出
                    </button>
                  )}
                  {(app.status === 'Approved' || app.status === 'Advance_MoneyHandedOver') && app.receiptType === 'Paper' && (
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
            <h2>証憑の提出</h2>
            <p>対象のファイル（画像、PDF）をアップロードしてください。</p>
            
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
                  {isSubmitting ? '送信中...' : (!file ? 'ファイルを選択してください' : '提出する')}
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
