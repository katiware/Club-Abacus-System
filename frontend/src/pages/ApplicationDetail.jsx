import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileImage, Download, Clock, UploadCloud, FileText, ExternalLink, AlertCircle, Edit2, Send } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';
import './ApplicationDetail.css';

const CATEGORY_MAP = {
  'SERVER': 'サーバー・インフラ代',
  'EQUIPMENT': '備品購入',
  'EVENT': 'イベント・大会費用',
  'BOOKS': '書籍・技術書',
  'OTHER': 'その他'
};

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
  const [actualAmount, setActualAmount] = useState('');
  const [error, setError] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editItems, setEditItems] = useState([]);

  const token = localStorage.getItem('authToken');
  const decodedToken = token ? jwtDecode(token) : null;
  const currentUserId = decodedToken?.sub;
  const userRole = localStorage.getItem('userRole') || 'MEMBER';

  const fetchAppDetail = async () => {
    if (!id || id.startsWith('EXP-')) return;
    setLoading(true);
    try {
      const res = await api.get(`/Expense/${id}`);
      setApp(res.data);
      setActualAmount(res.data.totalAmount || '');
      
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

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (uploadFile.size > MAX_FILE_SIZE) {
      setUploadMessage({ type: 'error', text: `ファイルサイズが10MBを超えています。` });
      setUploading(false);
      return;
    }
    if (!allowedTypes.includes(uploadFile.type)) {
      setUploadMessage({ type: 'error', text: `ファイル形式はJPG/PNG/WEBP/PDFのみ対応しています。` });
      setUploading(false);
      return;
    }

    try {
      if (app.isAmountVariable && !app.isAmountFinalized) {
        if (!actualAmount) {
          setUploadMessage({ type: 'error', text: '実際の請求額を入力してください。' });
          setUploading(false);
          return;
        }
        await api.put(`/Expense/${id}/amount`, Number(actualAmount), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

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

  const handleAction = async (newStatus) => {
    if (newStatus === 'Rejected') {
      const confirmReject = window.confirm('本当にこの申請を却下しますか？却下すると申請者は修正できません。');
      if (!confirmReject) return;
    }

    try {
      if (newStatus === 'Rejected') {
        await api.put(`/Expense/${id}/reject`, { reason: "管理者による却下" });
      } else {
        await api.put(`/Expense/${id}/approve`, { newStatus });
      }
      alert('ステータスを更新しました');
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || '処理に失敗しました。';
      alert(`エラー: ${errMsg}`);
    }
  };

  const handleRemand = async () => {
    const reason = window.prompt('差し戻し理由を入力してください:\n（部員はこの理由を見て内容を修正します）');
    if (!reason) return;

    try {
      await api.post(`/Expense/${id}/remand`, { reason });
      alert('申請を差し戻しました。');
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      alert('差し戻し処理に失敗しました。');
    }
  };

  const handleResubmit = async () => {
    const confirmSubmit = window.confirm('この内容で再提出しますか？');
    if (!confirmSubmit) return;

    try {
      await api.post(`/Expense/${id}/submit`);
      alert('再提出しました。');
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      alert('再提出に失敗しました。');
    }
  };

  const openEditModal = () => {
    setEditTitle(app.title || '');
    if (app.expenseItems && app.expenseItems.length > 0) {
      setEditItems(app.expenseItems.map(item => ({
        title: item.itemName || '',
        amount: item.unitPrice || '',
        category: item.category || '',
        purchaseUrl: item.purchaseUrl || '',
        details: item.description || ''
      })));
    } else {
      setEditItems([{ title: '', amount: '', category: '', purchaseUrl: '', details: '' }]);
    }
    setShowEditModal(true);
  };

  const handleEditItemChange = (index, field, value) => {
    const newItems = [...editItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditItems(newItems);
  };

  const handleAddEditItem = () => {
    setEditItems([...editItems, { title: '', amount: '', category: '', purchaseUrl: '', details: '' }]);
  };

  const handleRemoveEditItem = (index) => {
    if (editItems.length > 1) {
      setEditItems(editItems.filter((_, i) => i !== index));
    }
  };

  const handleEditSave = async () => {
    try {
      const payload = {
        title: editTitle,
        type: app.type,
        receiptType: app.receiptType,
        expenseItems: editItems.map(item => ({
          itemName: item.title,
          unitPrice: parseInt(item.amount, 10),
          quantity: 1,
          payee: '未指定',
          category: item.category,
          description: item.details || null,
          purchaseUrl: (app.receiptType === 'Digital' || app.receiptType === 'Amazon') ? item.purchaseUrl : null
        }))
      };
      await api.put(`/Expense/${id}`, payload);
      alert('内容を保存しました。（※ まだ承認待ちにはなっていません。「再提出」ボタンを押してください）');
      setShowEditModal(false);
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。');
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
      case 'Rejected': return <span className="detail-status bg-red-100 text-red-800"><AlertCircle size={16}/> 却下</span>;
      case 'Remanded': return <span className="detail-status status-remanded"><AlertCircle size={16}/> 差し戻し中</span>;
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
          {app.isAmountVariable && !app.isAmountFinalized && (
            <div className="warning-banner" style={{backgroundColor: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center'}}>
              <AlertCircle size={20} style={{marginRight: '8px'}} />
              <span><strong>金額未確定:</strong> 為替レートなどによる金額変動が設定されている申請です。証憑提出時に実際の請求額を入力して金額を確定させてください。</span>
            </div>
          )}
          <section className="detail-card">
            <h2>基本情報</h2>
            <div className="info-grid">
              <div className="info-item full-width" style={{marginBottom: '16px'}}>
                <span className="info-label">申請タイトル</span>
                <span className="info-value" style={{fontWeight: 'bold', fontSize: '1.2rem'}}>{app.title || 'タイトルなし'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">申請者</span>
                <span className="info-value">{applicantName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">申請日</span>
                <span className="info-value">{dateStr}</span>
              </div>
              <div className="info-item">
                <span className="info-label">区分 / 方法</span>
                <span className="info-value">{typeStr} / {methodStr}</span>
              </div>
              <div className="info-item full-width amount-highlight">
                <span className="info-label">申請合計金額</span>
                <span className="info-value amount-text">
                  {app.isAmountVariable && !app.isAmountFinalized ? `~¥${app.totalAmount.toLocaleString()} (目安)` : `¥${app.totalAmount.toLocaleString()}`}
                  {app.isAmountVariable && !app.isAmountFinalized && (
                    <span className="status-badge warning" style={{backgroundColor: '#ffeeba', color: '#856404', marginLeft: '12px', fontSize: '12px', fontWeight: 'normal'}}>金額未確定</span>
                  )}
                </span>
              </div>
            </div>

            <h3 style={{marginTop: '24px', marginBottom: '16px', fontSize: '1.2rem', color: '#374151', paddingBottom: '8px', borderBottom: '1px solid #e5e7eb'}}>申請明細</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {app.expenseItems && app.expenseItems.map((item, idx) => (
                <div key={idx} style={{padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
                  <div style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px', color: '#111827'}}>{item.itemName}</div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.95rem'}}>
                    <div><span style={{color: '#6b7280'}}>金額:</span> ¥{item.unitPrice?.toLocaleString()}</div>
                    <div><span style={{color: '#6b7280'}}>カテゴリ:</span> {CATEGORY_MAP[item.category] || item.category}</div>
                  </div>
                  {item.purchaseUrl && (
                    <div style={{marginTop: '8px', fontSize: '0.95rem'}}>
                      <span style={{color: '#6b7280'}}>購入URL:</span> <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" style={{color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all'}}>{item.purchaseUrl}</a>
                    </div>
                  )}
                  {item.description && (
                    <div style={{marginTop: '8px', fontSize: '0.95rem', whiteSpace: 'pre-wrap'}}>
                      <span style={{color: '#6b7280'}}>詳細:</span><br/>{item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="info-grid" style={{marginTop: '24px'}}>
              {app.status === 'Remanded' && app.rejectionReason && (
                <div className="info-item full-width mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="info-label text-orange-700 font-bold mb-1"><AlertCircle size={16} className="inline mr-1" />差し戻し理由（修正してください）</span>
                  <span className="info-value text-orange-900">{app.rejectionReason}</span>
                </div>
              )}
              {app.status === 'PendingApproval' && app.rejectionReason && (
                <div className="info-item full-width mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="info-label text-blue-700 font-bold mb-1"><AlertCircle size={16} className="inline mr-1" />前回差し戻し時の理由</span>
                  <span className="info-value text-blue-900">{app.rejectionReason}</span>
                </div>
              )}
              {app.status === 'Rejected' && app.rejectionReason && (
                <div className="info-item full-width mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <span className="info-label text-red-700 font-bold mb-1"><AlertCircle size={16} className="inline mr-1" />却下理由</span>
                  <span className="info-value text-red-800">{app.rejectionReason}</span>
                </div>
              )}
            </div>

            <div className="action-buttons-row mt-6">
              {userRole === 'ADMIN' && (
                <>
                  {(app.status === 'PendingApproval' || app.status === 'WaitingConfirmation') && (
                    <>
                      <button className="btn-approve" onClick={() => handleAction(app.status === 'PendingApproval' ? 'Approved' : 'Settled')}>
                        <CheckCircle size={18} />
                        {app.status === 'PendingApproval' ? '事前承認する' : '証憑を確認して精算完了する'}
                      </button>
                      <button className="btn-reject" onClick={handleRemand} style={{ backgroundColor: '#f97316', color: 'white' }}>
                        <AlertCircle size={18} />
                        差し戻す
                      </button>
                      <button className="btn-reject" onClick={() => handleAction('Rejected')}>
                        <XCircle size={18} />
                        却下する
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
                </>
              )}

              {/* User Actions */}
              {app.userId === currentUserId && (app.status === 'Draft' || app.status === 'Remanded') && (
                <>
                  <button className="btn-edit" onClick={openEditModal}>
                    <Edit2 size={18} />
                    内容を編集する
                  </button>
                  <button className="btn-save" onClick={handleResubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Send size={18} />
                    再提出する (承認待ちへ)
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

                  {app.isAmountVariable && !app.isAmountFinalized && (
                    <div className="amount-update-section" style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                      <h4 style={{fontSize: '13px', marginBottom: '8px', color: '#495057'}}>実際の請求額を入力してください</h4>
                      <div style={{display: 'flex', alignItems: 'center'}}>
                        <span style={{marginRight: '8px'}}>¥</span>
                        <input 
                          type="number" 
                          value={actualAmount}
                          onChange={(e) => setActualAmount(e.target.value)}
                          style={{padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', width: '100%'}}
                          required
                        />
                      </div>
                    </div>
                  )}

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

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxHeight: '90vh', overflowY: 'auto', width: '90%', maxWidth: '600px'}}>
            <h3>申請内容の編集</h3>
            
            <div className="modal-form-group" style={{marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px'}}>
              <label>申請タイトル</label>
              <input 
                type="text" 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                placeholder="例: 8月分サーバー代など"
                style={{width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box'}}
              />
            </div>
            
            {editItems.map((item, index) => (
              <div key={index} style={{border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', marginBottom: '16px', position: 'relative'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px'}}>
                  <h4 style={{margin: 0}}>明細 {index + 1}</h4>
                  {editItems.length > 1 && (
                    <button type="button" onClick={() => handleRemoveEditItem(index)} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer'}}>削除</button>
                  )}
                </div>
                
                <div className="modal-form-group">
                  <label>用途・品目</label>
                  <input 
                    type="text" 
                    value={item.title} 
                    onChange={e => handleEditItemChange(index, 'title', e.target.value)} 
                  />
                </div>
                <div className="modal-form-group">
                  <label>金額 (円)</label>
                  <input 
                    type="number" 
                    value={item.amount} 
                    onChange={e => handleEditItemChange(index, 'amount', e.target.value)} 
                  />
                </div>
                <div className="modal-form-group">
                  <label>カテゴリ</label>
                  <select 
                    value={item.category} 
                    onChange={e => handleEditItemChange(index, 'category', e.target.value)}
                  >
                    <option value="">選択してください</option>
                    <option value="SERVER">サーバー・インフラ代</option>
                    <option value="EQUIPMENT">備品購入</option>
                    <option value="EVENT">イベント・大会費用</option>
                    <option value="BOOKS">書籍・技術書</option>
                    <option value="OTHER">その他</option>
                  </select>
                </div>
                {(app.receiptType === 'Digital' || app.receiptType === 'Amazon') && (
                  <div className="modal-form-group">
                    <label>購入元URL</label>
                    <input 
                      type="url" 
                      value={item.purchaseUrl} 
                      onChange={e => handleEditItemChange(index, 'purchaseUrl', e.target.value)} 
                    />
                  </div>
                )}
                <div className="modal-form-group">
                  <label>詳細</label>
                  <textarea 
                    value={item.details} 
                    onChange={e => handleEditItemChange(index, 'details', e.target.value)} 
                    rows="2"
                    style={{width: '100%', padding: '8px', border: '1px solid #ced4da', borderRadius: '4px'}}
                  />
                </div>
              </div>
            ))}
            
            <button type="button" onClick={handleAddEditItem} style={{width: '100%', padding: '10px', background: '#f3f4f6', border: '1px dashed #d1d5db', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px'}}>
              + 明細を追加する
            </button>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>キャンセル</button>
              <button className="btn-save" onClick={handleEditSave}>保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationDetail;
