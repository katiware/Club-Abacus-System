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
  const [uploadingApp, setUploadingApp] = useState(null);
  const [file, setFile] = useState(null);
  const [actualAmount, setActualAmount] = useState('');
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

  const openUploadModal = (app) => {
    setUploadingApp(app);
    setFile(null);
    setActualAmount(app.totalAmount || '');
  };

  const closeUploadModal = () => {
    setUploadingApp(null);
    setFile(null);
    setActualAmount('');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file || !uploadingApp) return;

    setIsSubmitting(true);

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (file.size > MAX_FILE_SIZE) {
      alert(`ファイルサイズが10MBを超えています。`);
      setIsSubmitting(false);
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      alert(`ファイル形式はJPG/PNG/WEBP/PDFのみ対応しています。`);
      setIsSubmitting(false);
      return;
    }

    try {
      // 未確定金額がある場合は先に確定させる
      if (uploadingApp.isAmountVariable && !uploadingApp.isAmountFinalized) {
        if (!actualAmount) {
          alert("実際の請求額を入力してください。");
          setIsSubmitting(false);
          return;
        }
        await api.put(`/Expense/${uploadingApp.id}/amount`, Number(actualAmount), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const fileFormData = new FormData();
      fileFormData.append('file', file);
      const docType = uploadingApp.type === 'Advance' ? 'Quotation' : 'Receipt';
      fileFormData.append('documentType', docType);

      await api.post(`/expenses/${uploadingApp.id}/documents`, fileFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('証憑ファイルを提出しました。');
      closeUploadModal();
      fetchMyApplications();
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
      case 'Remanded':
        return <span className="status-badge warning-text"><AlertCircle size={14} /> 差し戻し中</span>;
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
  const getTitle = (app) => {
    if (app.title) return app.title;
    if (!app.expenseItems || app.expenseItems.length === 0) return '品目なし';
    const firstItem = app.expenseItems[0].itemName;
    return app.expenseItems.length > 1 ? `${firstItem} ほか${app.expenseItems.length - 1}件` : firstItem;
  };

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
              <div key={app.id} className="app-card" onClick={() => navigate(`/applications/${app.id}`)}>
                <div className="app-card-header">
                  <span className="app-id">ID: {app.id.substring(0, 8)}</span>
                  <span className="app-date">{new Date(app.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="app-title">{getTitle(app)}</h3>
                <div className="app-details">
                  <span className="app-amount">
                    {app.isAmountVariable && !app.isAmountFinalized ? `~¥${app.totalAmount.toLocaleString()} (目安)` : `¥${app.totalAmount.toLocaleString()}`}
                  </span>
                  {app.isAmountVariable && !app.isAmountFinalized && (
                    <span className="status-badge warning" style={{backgroundColor: '#ffeeba', color: '#856404', marginLeft: '8px', fontSize: '11px'}}>金額未確定</span>
                  )}
                  <span className={`app-type ${app.type === 'Advance' ? 'type-advance' : 'type-reimburse'}`} style={{marginLeft: 'auto'}}>
                    {getTypeStr(app.type)} ({getReceiptTypeStr(app.receiptType)})
                  </span>
                </div>
                <div className="app-footer">
                  {getStatusBadge(app.status)}
                  {needsUpload(app) && (
                    <button 
                      className="upload-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openUploadModal(app);
                      }}
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
      {uploadingApp && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>証憑の提出 {uploadingApp.isAmountVariable && !uploadingApp.isAmountFinalized ? 'と金額の確定' : ''}</h2>
            <p>対象のファイル（画像、PDF）をアップロードしてください。</p>
            
            <form onSubmit={handleUploadSubmit}>
              {uploadingApp.isAmountVariable && !uploadingApp.isAmountFinalized && (
                <div className="amount-update-section" style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px'}}>
                  <h3 style={{fontSize: '14px', marginBottom: '8px', color: '#495057'}}>実際の請求額を入力してください</h3>
                  <div style={{display: 'flex', alignItems: 'center'}}>
                    <span style={{marginRight: '8px'}}>¥</span>
                    <input 
                      type="number" 
                      value={actualAmount}
                      onChange={(e) => setActualAmount(e.target.value)}
                      className="modal-input"
                      style={{padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', width: '100%'}}
                      required
                    />
                  </div>
                </div>
              )}
              
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
