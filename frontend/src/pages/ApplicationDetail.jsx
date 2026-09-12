import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileImage, Download, Clock, UploadCloud, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './ApplicationDetail.css';

function ApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [documentBlobs, setDocumentBlobs] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDocType, setUploadDocType] = useState('Receipt');
  const [uploadMessage, setUploadMessage] = useState(null);
  const [error, setError] = useState(null);

  const fetchAppDetail = async () => {
    if (!id || id.startsWith('EXP-')) return;
    setLoading(true);
    try {
      const res = await api.get(`/Expense/${id}`);
      setApp(res.data);
      
      if (res.data.expenseDocuments) {
        setDocuments(res.data.expenseDocuments);
        loadPreviews(res.data.expenseDocuments);
      } else {
        await fetchDocuments();
      }
    } catch (err) {
      console.error('Failed to fetch detail', err);
      setError('申請データの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/expenses/${id}/documents`);
      setDocuments(res.data || []);
      loadPreviews(res.data || []);
    } catch (err) {
      console.warn('Could not fetch documents:', err);
    }
  };

  const loadPreviews = async (docs) => {
    const blobs = {};
    for (const doc of docs) {
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
  };

  useEffect(() => {
    fetchAppDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      await fetchAppDetail();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || 'アップロードに失敗しました。';
      setUploadMessage({ type: 'error', text: typeof errMsg === 'string' ? errMsg : 'アップロードに失敗しました。' });
    } finally {
      setUploading(false);
    }
  };

  const handleAction = async (actionStatus) => {
    try {
      let endpoint = `/Expense/${id}/approve`;
      if (actionStatus === 'Settled' || actionStatus === 'WaitingConfirmation' || actionStatus === 'UniversitySubmitted' || actionStatus === 'Advance_MoneyHandedOver') {
        endpoint = `/Expense/${id}/confirm`;
      }
      
      let payload = { status: actionStatus };
      if (actionStatus === 'Rejected') {
        const comment = prompt("差し戻しの理由（コメント）を入力してください:");
        if (comment === null) return;
        payload.rejectionReason = comment;
      }

      await api.put(endpoint, payload);
      alert(`ステータスを更新しました。`);
      await fetchAppDetail();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || '処理に失敗しました。';
      alert(`エラー: ${errMsg}`);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PendingApproval': return <span className="detail-status status-pending"><Clock size={16}/> 承認待ち</span>;
      case 'Approved': return <span className="detail-status status-waiting"><CheckCircle size={16}/> 事前承認済</span>;
      case 'Advance_MoneyHandedOver': return <span className="detail-status status-waiting"><CheckCircle size={16}/> 承認済(手渡し済)</span>;
      case 'WaitingConfirmation': return <span className="detail-status status-waiting"><Clock size={16}/> 最終確認待</span>;
      case 'UniversitySubmitted': return <span className="detail-status status-completed">大学へ提出済</span>;
      case 'Settled': return <span className="detail-status status-completed"><CheckCircle size={16}/> 精算完了</span>;
      case 'Rejected': return <span className="detail-status bg-red-100 text-red-800"><AlertCircle size={16}/> 却下・差戻</span>;
      case 'Draft': return <span className="detail-status">下書き</span>;
      default: return <span className="detail-status">{status}</span>;
    }
  };

  const getDocTypeLabel = (docType) => {
    if (docType === 'Receipt' || docType === 0) return '領収書';
    if (docType === 'Quotation' || docType === 1) return '見積書';
    if (docType === 'Invoice' || docType === 2) return '適格請求書 (Amazon)';
    return '証憑書類';
  };

  if (loading) {
    return (
      <div className="application-detail-container">
        <PageHeader title="申請詳細" backTo="/top" />
        <div className="p-8 text-center text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="application-detail-container">
        <PageHeader title="申請詳細" backTo="/top" />
        <div className="p-8 text-center text-red-500">{error || 'データが見つかりません'}</div>
      </div>
    );
  }

  const applicantName = app.user?.name || '不明';
  const title = app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].itemName : '品目なし';
  const category = app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].category : '-';
  const description = app.expenseItems && app.expenseItems.length > 0 ? app.expenseItems[0].description : '';
  const typeStr = app.type === 'Advance' ? '事前出金' : '立替払い';
  const methodStr = app.receiptType === 'Paper' ? '実店舗購入' : 'Web購入';
  const dateStr = new Date(app.createdAt).toLocaleDateString();

  return (
    <div className="application-detail-container fade-in">
      <PageHeader title={`申請詳細 (${app.id.substring(0,8)})`} backTo={-1}>
        {renderStatusBadge(app.status)}
      </PageHeader>

      <main className="detail-layout">
        <div className="detail-main-col">
          <section className="detail-card">
            <h2>基本情報</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">申請者</span>
                <span className="info-value">{applicantName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">申請日</span>
                <span className="info-value">{dateStr}</span>
              </div>
              <div className="info-item">
                <span className="info-label">カテゴリ</span>
                <span className="info-value">{category}</span>
              </div>
              <div className="info-item">
                <span className="info-label">区分 / 方法</span>
                <span className="info-value">{typeStr} / {methodStr}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">用途・品目</span>
                <span className="info-value large-text">{title}</span>
              </div>
              <div className="info-item full-width amount-highlight">
                <span className="info-label">申請金額</span>
                <span className="info-value amount-text">¥{app.totalAmount.toLocaleString()}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">詳細説明</span>
                <span className="info-value desc-text">{description || '詳細なし'}</span>
              </div>
              {app.status === 'Rejected' && app.rejectionReason && (
                <div className="info-item full-width mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="info-label text-red-700 font-bold mb-1"><AlertCircle size={16} className="inline mr-1" />差戻し理由</span>
                  <span className="info-value text-red-800">{app.rejectionReason}</span>
                </div>
              )}
            </div>

            <div className="action-buttons-row mt-6">
              {app.status === 'PendingApproval' && (
                <>
                  <button className="btn-approve" onClick={() => handleAction('Approved')}>
                    <CheckCircle size={18} />
                    事前承認する
                  </button>
                  <button className="btn-reject" onClick={() => handleAction('Rejected')}>
                    <XCircle size={18} />
                    却下・差し戻す
                  </button>
                </>
              )}

              {app.status === 'Approved' && app.type === 'Advance' && (
                <button className="btn-approve" onClick={() => handleAction('Advance_MoneyHandedOver')}>
                  <CheckCircle size={18} />
                  現金を渡し済にする (手渡し)
                </button>
              )}

              {app.status === 'Approved' && app.type === 'Reimbursement' && (
                <button className="btn-approve" onClick={() => handleAction('UniversitySubmitted')}>
                  <CheckCircle size={18} />
                  大学へ申請済にする
                </button>
              )}

              {app.status === 'UniversitySubmitted' && (
                <button className="btn-approve" onClick={() => handleAction('Settled')}>
                  <CheckCircle size={18} />
                  現金を渡し、精算完了する
                </button>
              )}

              {app.status === 'Advance_MoneyHandedOver' && (
                <button className="btn-approve" onClick={() => handleAction('Settled')}>
                  <CheckCircle size={18} />
                  領収書を確認し、精算完了する
                </button>
              )}

              {app.status === 'WaitingConfirmation' && (
                <>
                  <button className="btn-approve" onClick={() => handleAction('Settled')}>
                    <CheckCircle size={18} />
                    証憑を確認して精算完了する
                  </button>
                  <button className="btn-reject" onClick={() => handleAction('Rejected')}>
                    <XCircle size={18} />
                    不備として差し戻す
                  </button>
                </>
              )}
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
                <div className="no-receipt">未提出、または実店舗（紙）での提出</div>
              </div>
            )}

            {/* 証憑のアップロード・差し替えフォーム (承認済・確認待ちなどの時のみ表示) */}
            {(app.status === 'Approved' || app.status === 'WaitingConfirmation' || app.status === 'Advance_MoneyHandedOver') && app.receiptType !== 'Paper' && (
              <div className="receipt-upload-box mt-4">
                <h3>証憑の提出・追加</h3>
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
                    {uploading ? 'アップロード中...' : (!uploadFile ? 'ファイルを選択してください' : 'アップロードする')}
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default ApplicationDetail;
