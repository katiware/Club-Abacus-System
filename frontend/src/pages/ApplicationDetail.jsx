import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileImage, Download, Clock, UploadCloud, FileText, ExternalLink } from 'lucide-react';
import api from '../services/api';
import './ApplicationDetail.css';

function ApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentBlobs, setDocumentBlobs] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('Receipt');
  const [uploadMessage, setUploadMessage] = useState(null);

  // Mock application data as initial/fallback state
  const [app, setApp] = useState({
    id: id || 'EXP-1001',
    applicant: '山田 太郎',
    title: 'AWSサーバー代 (8月分)',
    amount: 12500,
    type: '立替払い',
    method: 'Web購入',
    category: 'サーバー・インフラ',
    date: '2026-08-09',
    description: '部室のWebサーバーおよびデータベースサーバーの今月分の利用料です。',
    status: 'APPROVED',
    history: [
      { date: '2026-08-09 10:00', action: '申請作成', user: '山田 太郎' },
      { date: '2026-08-09 15:30', action: '承認完了', user: '佐藤 管理者' },
    ]
  });

  const fetchDocuments = async () => {
    if (!id || id.startsWith('EXP-')) return;
    try {
      const res = await api.get(`/expenses/${id}/documents`);
      setDocuments(res.data || []);
      
      // Load image blobs for safe inline preview with auth token
      const blobs = {};
      for (const doc of res.data || []) {
        if (doc.contentType?.startsWith('image/')) {
          try {
            const blobRes = await api.get(`/expenses/${id}/documents/${doc.id}/file`, { responseType: 'blob' });
            blobs[doc.id] = URL.createObjectURL(blobRes.data);
          } catch (e) {
            console.error('Failed to load document preview blob:', e);
          }
        }
      }
      setDocumentBlobs(blobs);
    } catch (err) {
      console.warn('Could not fetch real documents from API, using fallback:', err);
    }
  };

  useEffect(() => {
    const fetchAppDetail = async () => {
      if (!id || id.startsWith('EXP-')) return;
      setLoading(true);
      try {
        const res = await api.get(`/Expense/${id}`);
        const data = res.data;
        if (data) {
          const firstItem = data.expenseItems?.[0];
          setApp(prev => ({
            ...prev,
            id: data.id,
            applicant: data.user?.userName || '申請部員',
            title: firstItem?.itemName || '経費申請',
            amount: data.totalAmount || 0,
            type: data.type === 1 || data.type === 'Advance' ? '事前出金' : '立替払い',
            method: data.receiptType === 1 || data.receiptType === 'Paper' ? '実店舗購入' : 'Web購入',
            category: firstItem?.category || '使途カテゴリ',
            date: new Date(data.createdAt).toISOString().split('T')[0],
            description: firstItem?.description || '',
            status: typeof data.status === 'number' ? getStatusString(data.status) : data.status,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch real expense detail, using fallback:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppDetail();
    fetchDocuments();
  }, [id]);

  const getStatusString = (statusCode) => {
    switch (statusCode) {
      case 10: return 'DRAFT';
      case 20: return 'PENDING_APPROVAL';
      case 30: return 'APPROVED';
      case 40: return 'WAITING_CONFIRMATION';
      case 50: return 'UNIVERSITY_SUBMITTED';
      case 60: return 'SETTLED';
      case 99: return 'REJECTED';
      default: return 'APPROVED';
    }
  };

  const handleDownload = async (docId, fileName) => {
    try {
      const res = await api.get(`/expenses/${id}/documents/${docId}/file?download=true`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('ファイルのダウンロードに失敗しました。');
    }
  };

  const handleViewPdf = async (docId) => {
    try {
      const res = await api.get(`/expenses/${id}/documents/${docId}/file`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch (err) {
      console.error('View PDF error:', err);
      alert('PDFファイルの表示に失敗しました。');
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('documentType', uploadDocType);

      await api.post(`/expenses/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadMessage({ type: 'success', text: '証憑をアップロードしました。' });
      setUploadFile(null);
      await fetchDocuments();

      // If document was Receipt and status was Approved, refresh status to WAITING_CONFIRMATION
      if (uploadDocType === 'Receipt' && (app.status === 'APPROVED' || app.status === 'Approved')) {
        setApp(prev => ({ ...prev, status: 'WAITING_CONFIRMATION' }));
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || 'アップロードに失敗しました。';
      setUploadMessage({ type: 'error', text: typeof errMsg === 'string' ? errMsg : 'アップロードに失敗しました。' });
    } finally {
      setUploading(false);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL': return <span className="detail-status status-pending">承認待ち</span>;
      case 'APPROVED': return <span className="detail-status status-waiting">事前承認済 (証憑提出待ち)</span>;
      case 'WAITING_CONFIRMATION': return <span className="detail-status status-waiting">最終確認待</span>;
      case 'COMPLETED':
      case 'SETTLED': return <span className="detail-status status-completed">精算完了</span>;
      default: return <span className="detail-status">{status}</span>;
    }
  };

  const getDocTypeLabel = (docType) => {
    if (docType === 0 || docType === 'Receipt') return '領収書';
    if (docType === 1 || docType === 'Quotation') return '見積書';
    if (docType === 2 || docType === 'Invoice') return '適格請求書 (Amazon)';
    return '証憑書類';
  };

  return (
    <div className="application-detail-container fade-in">
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeft size={20} />
          戻る
        </button>
        <h1>申請詳細 ({app.id})</h1>
        <div className="header-spacer"></div>
        {renderStatusBadge(app.status)}
      </header>

      <main className="detail-layout">
        <div className="detail-main-col">
          <section className="detail-card">
            <h2>基本情報</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">申請者</span>
                <span className="info-value">{app.applicant}</span>
              </div>
              <div className="info-item">
                <span className="info-label">申請日</span>
                <span className="info-value">{app.date}</span>
              </div>
              <div className="info-item">
                <span className="info-label">カテゴリ</span>
                <span className="info-value">{app.category}</span>
              </div>
              <div className="info-item">
                <span className="info-label">区分 / 方法</span>
                <span className="info-value">{app.type} / {app.method}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">用途・品目</span>
                <span className="info-value large-text">{app.title}</span>
              </div>
              <div className="info-item full-width amount-highlight">
                <span className="info-label">申請金額</span>
                <span className="info-value amount-text">¥{app.amount.toLocaleString()}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">詳細説明</span>
                <span className="info-value desc-text">{app.description || '詳細なし'}</span>
              </div>
            </div>

            <div className="action-buttons-row">
              {app.status === 'WAITING_CONFIRMATION' && (
                <>
                  <button className="btn-approve">
                    <CheckCircle size={18} />
                    証憑を確認して完了する
                  </button>
                  <button className="btn-reject">
                    <XCircle size={18} />
                    不備として差し戻す
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="detail-card mt-4">
            <h2><Clock size={18} className="inline-icon" /> 処理履歴</h2>
            <div className="history-timeline">
              {app.history.map((h, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <div className="timeline-action">{h.action}</div>
                    <div className="timeline-meta">{h.date} - {h.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="detail-side-col">
          <section className="detail-card receipt-card">
            <div className="card-header-flex">
              <h2><FileImage size={18} className="inline-icon" /> 証憑書類</h2>
            </div>

            {documents.length > 0 ? (
              <div className="document-list">
                {documents.map((doc) => (
                  <div key={doc.id} className="document-item-card">
                    <div className="doc-item-header">
                      <span className="badge-doc-type">{getDocTypeLabel(doc.documentType)}</span>
                      <button 
                        className="icon-btn" 
                        title="ダウンロード"
                        onClick={() => handleDownload(doc.id, doc.originalFileName)}
                      >
                        <Download size={16} />
                      </button>
                    </div>

                    <div className="doc-preview-area">
                      {doc.contentType?.startsWith('image/') && documentBlobs[doc.id] ? (
                        <img 
                          src={documentBlobs[doc.id]} 
                          alt={doc.originalFileName} 
                          className="receipt-img" 
                        />
                      ) : (
                        <div className="pdf-doc-placeholder" onClick={() => handleViewPdf(doc.id)}>
                          <FileText size={40} className="pdf-icon" />
                          <span className="file-name-text">{doc.originalFileName}</span>
                          <span className="click-view-hint"><ExternalLink size={12} /> クリックして表示</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="receipt-preview">
                {app.receiptUrl ? (
                  <img src={app.receiptUrl} alt="領収書プレビュー" className="receipt-img" />
                ) : (
                  <div className="no-receipt">未提出、または実店舗（紙）での提出</div>
                )}
              </div>
            )}

            {/* 証憑のアップロード・差し替えフォーム */}
            <div className="receipt-upload-box">
              <h3>証憑の提出・差し替え</h3>
              {uploadMessage && (
                <div className={`upload-msg ${uploadMessage.type}`}>
                  {uploadMessage.text}
                </div>
              )}
              <form onSubmit={handleUploadDocument}>
                <div className="upload-input-group">
                  <select 
                    value={uploadDocType} 
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="doc-type-select"
                  >
                    <option value="Receipt">領収書</option>
                    <option value="Quotation">見積書</option>
                    <option value="Invoice">適格請求書 (Amazon)</option>
                  </select>
                </div>

                <div className="upload-file-picker">
                  <input 
                    type="file" 
                    id="receipt-file-input"
                    accept=".pdf,image/*" 
                    onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn-upload-receipt"
                  disabled={!uploadFile || uploading}
                >
                  <UploadCloud size={16} />
                  {uploading ? 'アップロード中...' : 'アップロードする'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ApplicationDetail;
