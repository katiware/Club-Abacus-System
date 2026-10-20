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
  const [editReason, setEditReason] = useState('');
  const [editItems, setEditItems] = useState([]);

  // Admin Review Modal State (事前承認用)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState('Approved'); // 'Approved', 'Remanded', 'Rejected'
  const [reviewReason, setReviewReason] = useState('');
  const [externalBudgets, setExternalBudgets] = useState([]);
  const [assignExternalBudget, setAssignExternalBudget] = useState(false);
  const [selectedExternalBudgetId, setSelectedExternalBudgetId] = useState('');
  const [externalBudgetAmount, setExternalBudgetAmount] = useState(0);
  const [externalBudgetAssetType, setExternalBudgetAssetType] = useState('Cash'); // 'Cash' | 'AmazonGift' | 'Other'

  // University Rejection Modal State (大学却下・救済用)
  const [showUnivRejectModal, setShowUnivRejectModal] = useState(false);
  const [univRejectAction, setUnivRejectAction] = useState('Rejected'); // 'Rejected' | 'SwitchToExternal' | 'Remanded'
  const [univRejectReason, setUnivRejectReason] = useState('');
  const [univExternalBudgetId, setUnivExternalBudgetId] = useState('');
  const [univExternalBudgetAmount, setUnivExternalBudgetAmount] = useState(0);
  const [univExternalBudgetAssetType, setUnivExternalBudgetAssetType] = useState('Cash');

  const token = localStorage.getItem('authToken');
  const decodedToken = token ? jwtDecode(token) : null;
  const currentUserId = decodedToken?.sub || decodedToken?.nameid || decodedToken?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  const userRole = localStorage.getItem('userRole') || 'MEMBER';

  const fetchExternalBudgets = async () => {
    try {
      const res = await api.get('/ExternalBudget');
      const list = res.data || [];
      setExternalBudgets(list);
      if (list.length > 0) {
        setSelectedExternalBudgetId(prev => prev || list[0].id);
        setUnivExternalBudgetId(prev => prev || list[0].id);
      }
    } catch (e) {
      console.warn('Failed to fetch external budgets', e);
    }
  };

  const handleOpenReviewModal = () => {
    fetchExternalBudgets();
    setReviewAction('Approved');
    setReviewReason('');
    setAssignExternalBudget(false);
    setExternalBudgetAmount(0);
    setShowReviewModal(true);
  };

  const handleOpenUnivRejectModal = () => {
    fetchExternalBudgets();
    setUnivRejectAction('Rejected');
    setUnivRejectReason('');
    setUnivExternalBudgetAmount(app?.totalAmount || 0);
    setShowUnivRejectModal(true);
  };

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

  const handleExportZip = async () => {
    try {
      const res = await api.get(`/expenses/${id}/documents/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `証憑まとめ_${id.substring(0,8)}_${dateStr}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP Export error:', err);
      alert('ZIPのダウンロードに失敗しました。');
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
      if ((app.isAmountVariable || app.type === 'Advance') && !app.isAmountFinalized) {
        if (!actualAmount) {
          setUploadMessage({ type: 'error', text: '実際の費用（確定金額）を入力してください。' });
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

    if (newStatus === 'Settled' || newStatus === 'WaitingConfirmation') {
      if ((app.isAmountVariable || app.type === 'Advance') && !app.isAmountFinalized) {
        const actualAmtStr = window.prompt(`実際の費用（確定金額）を入力してください。\n見積金額: ${app.totalAmount}円`);
        if (actualAmtStr === null) return; // キャンセル
        const actualAmt = parseInt(actualAmtStr, 10);
        if (isNaN(actualAmt)) {
          alert('有効な金額を入力してください。');
          return;
        }
        try {
          await api.put(`/Expense/${id}/amount`, actualAmt, {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (err) {
          console.error(err);
          alert('金額の更新に失敗しました。');
          return;
        }
      }
    }

    try {
      if (newStatus === 'Rejected') {
        const reason = window.prompt('却下理由を入力してください（任意）:');
        if (reason === null) return; // Cancelled
        await api.put(`/Expense/${id}/approve`, { status: 'Rejected', rejectionReason: reason || "管理者による却下" });
      } else if (newStatus === 'Approved') {
        await api.put(`/Expense/${id}/approve`, { status: 'Approved' });
      } else {
        // Advance_MoneyHandedOver, UniversitySubmitted, Settled are confirmed via /confirm endpoint
        await api.put(`/Expense/${id}/confirm`, { status: newStatus });
      }
      alert('ステータスを更新しました');
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      let errMsg = '処理に失敗しました。';
      if (err.response?.data) {
        errMsg = err.response.data.error || err.response.data.message || (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
      }
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

  const submitReviewAction = async () => {
    if ((reviewAction === 'Remanded' || reviewAction === 'Rejected') && !reviewReason.trim()) {
      alert('却下・差し戻しの場合は理由を入力してください。');
      return;
    }

    if (reviewAction === 'Approved' && assignExternalBudget) {
      const extAmt = Number(externalBudgetAmount) || 0;
      if (extAmt < 0 || extAmt > (app?.totalAmount || 0)) {
        alert(`部費外充当金額は0円以上、申請総額（¥${app?.totalAmount?.toLocaleString()}）以下で入力してください。`);
        return;
      }
      if (!selectedExternalBudgetId) {
        alert('充当する部費外予算を選択してください。');
        return;
      }
    }

    try {
      if (reviewAction === 'Remanded') {
        await api.post(`/Expense/${id}/remand`, { reason: reviewReason });
      } else if (reviewAction === 'Rejected') {
        await api.put(`/Expense/${id}/approve`, { status: 'Rejected', rejectionReason: reviewReason });
      } else {
        const payload = {
          status: 'Approved',
          externalBudgetAmount: assignExternalBudget ? Number(externalBudgetAmount) : 0,
          externalBudgetId: (assignExternalBudget && selectedExternalBudgetId) ? selectedExternalBudgetId : null,
          externalBudgetAssetType: assignExternalBudget ? externalBudgetAssetType : null
        };
        await api.put(`/Expense/${id}/approve`, payload);
      }
      alert('審査を完了しました。');
      setShowReviewModal(false);
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || '処理に失敗しました。';
      alert(`エラー: ${errMsg}`);
    }
  };

  const submitUnivRejectAction = async () => {
    if (!univRejectReason.trim() && univRejectAction !== 'SwitchToExternal') {
      alert('大学からの連絡内容または理由を入力してください。');
      return;
    }

    try {
      if (univRejectAction === 'Rejected') {
        // 完全却下（部費も支払わない）
        await api.put(`/Expense/${id}/confirm`, {
          status: 'Rejected',
          rejectionReason: `大学による却下: ${univRejectReason}`
        });
        alert('大学による却下を反映しました。確保されていた部費予算が解放されました。');
      } else if (univRejectAction === 'SwitchToExternal') {
        // 部費外予算へ振替して精算へ進める
        if (!univExternalBudgetId) {
          alert('充当先の部費外予算を選択してください。');
          return;
        }
        const extAmt = Number(univExternalBudgetAmount) || 0;
        if (extAmt <= 0 || extAmt > (app?.totalAmount || 0)) {
          alert(`充当金額は1円以上、申請総額（¥${app?.totalAmount?.toLocaleString()}）以下で入力してください。`);
          return;
        }
        await api.put(`/Expense/${id}/confirm`, {
          status: 'Settled',
          externalBudgetAmount: extAmt,
          externalBudgetId: univExternalBudgetId,
          externalBudgetAssetType: univExternalBudgetAssetType,
          rejectionReason: univRejectReason ? `大学不認可のため部費外予算へ振替: ${univRejectReason}` : '大学不認可のため部費外予算へ振替'
        });
        alert('部費外予算に振り替え、精算完了として更新しました。部費予算は消費されません。');
      } else if (univRejectAction === 'Remanded') {
        // 書類不備で部員へ差し戻し
        await api.put(`/Expense/${id}/confirm`, {
          status: 'Remanded',
          rejectionReason: `大学からの書類不備指摘: ${univRejectReason}`
        });
        alert('大学からの不備指摘として、部員へ申請を差し戻しました。');
      }

      setShowUnivRejectModal(false);
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || '処理に失敗しました。';
      alert(`エラー: ${errMsg}`);
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
    setEditReason('');
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
    if ((app.status === 'PendingApproval' || app.status === 'Approved') && !editReason.trim()) {
      alert('提出済みの申請を編集する場合は、変更理由を入力してください。');
      return;
    }

    try {
      const payload = {
        title: editTitle,
        type: app.type,
        receiptType: app.receiptType,
        editReason: editReason.trim() || null,
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
      if (app.status === 'Draft' || app.status === 'Remanded') {
        alert('内容を保存しました。（※ まだ承認待ちにはなっていません。「再提出」ボタンを押してください）');
      } else {
        alert('内容を保存し、再度承認待ち状態に戻りました。主将会計へ通知されました。');
      }
      setShowEditModal(false);
      fetchAppDetail();
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。');
    }
  };

  const renderStatusBadge = (status, isEditedAfterApproval) => {
    switch (status) {
      case 'PendingApproval': 
        return isEditedAfterApproval 
          ? <span className="detail-status" style={{backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #fde047'}}><Clock size={16}/> 再承認待 (変更あり)</span>
          : <span className="detail-status status-pending"><Clock size={16}/> 承認待ち</span>;
      case 'Approved': return <span className="detail-status status-waiting"><CheckCircle size={16}/> 事前承認済</span>;
      case 'Advance_MoneyHandedOver': return <span className="detail-status" style={{backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'}}><CheckCircle size={16}/> 事前出金渡し済</span>;
      case 'WaitingConfirmation': return <span className="detail-status status-waiting"><Clock size={16}/> 領収書確認待ち</span>;
      case 'WaitingUniversitySubmission': return <span className="detail-status" style={{backgroundColor: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe'}}><Clock size={16}/> 大学へ提出待ち</span>;
      case 'UniversitySubmitted': return <span className="detail-status status-completed"><Clock size={16}/> 大学へ提出済</span>;
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
  const applicantRole = app.user?.role?.name || app.user?.roleName || '';
  const typeStr = app.type === 'Advance' ? '事前出金' : '立替払い';
  const methodStr = app.receiptType === 'Paper' ? '実店舗購入' : 'Web購入';
  const dateStr = new Date(app.createdAt).toLocaleDateString();

  const renderApplicantWithRole = () => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <strong>{applicantName}</strong>
      {applicantRole === 'ADMIN' && (
        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f3e8ff', color: '#7e22ce', fontWeight: 'bold' }}>管理者</span>
      )}
      {applicantRole === 'MANAGER' && (
        <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: 'bold' }}>主将会計</span>
      )}
    </span>
  );

  return (
    <div className="application-detail-container fade-in">
      <PageHeader title={`申請詳細 (${app.id.substring(0,8)})`} backTo={-1}>
        {renderStatusBadge(app.status, app.isEditedAfterApproval)}
      </PageHeader>

      <main className="detail-layout">
        <div className="detail-main-col">
          {(app.isAmountVariable || app.type === 'Advance') && !app.isAmountFinalized && (
            <div className="warning-banner" style={{backgroundColor: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center'}}>
              <AlertCircle size={20} style={{marginRight: '8px'}} />
              <span><strong>金額未確定:</strong> 見積もりや為替変動による申請です。証憑提出時（または精算時）に実際の費用を入力して確定させてください。</span>
            </div>
          )}

          {/* 追加: 証憑提出の強調メッセージ */}
          {(app.status === 'Approved' || app.status === 'Advance_MoneyHandedOver') && app.userId === currentUserId && app.receiptType !== 'Paper' && (
            <div className="warning-banner" style={{backgroundColor: '#d1fae5', color: '#065f46', padding: '16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'flex-start', border: '1px solid #34d399'}}>
              <CheckCircle size={24} style={{marginRight: '12px', marginTop: '2px', flexShrink: 0}} />
              <div>
                <h3 style={{margin: '0 0 8px 0', fontSize: '1.1rem'}}>申請が承認されました！ 🎉</h3>
                <p style={{margin: 0, fontSize: '0.95rem'}}>
                  購入を完了し、右側の「証憑の提出・追加」パネルから、実際に購入した際の<strong>領収書</strong>や<strong>請求書</strong>の画像をアップロードしてください。<br/>
                  提出が完了すると、管理者が確認を行い精算処理に進みます。
                </p>
              </div>
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
                <span className="info-value">{renderApplicantWithRole()}</span>
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
                  {(app.isAmountVariable || app.type === 'Advance') && !app.isAmountFinalized ? `~¥${app.totalAmount.toLocaleString()} (目安)` : `¥${app.totalAmount.toLocaleString()}`}
                  {(app.isAmountVariable || app.type === 'Advance') && !app.isAmountFinalized && (
                    <span className="status-badge warning" style={{backgroundColor: '#ffeeba', color: '#856404', marginLeft: '12px', fontSize: '12px', fontWeight: 'normal'}}>金額未確定</span>
                  )}
                </span>
                {app.externalBudgetAmount > 0 && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.95rem' }}>
                    <span style={{ backgroundColor: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                      部費負担: ¥{(app.totalAmount - app.externalBudgetAmount).toLocaleString()}
                    </span>
                    <span style={{ backgroundColor: '#fdf2f8', color: '#9d174d', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}>
                      部費外充当: ¥{app.externalBudgetAmount.toLocaleString()} ({app.externalBudget?.name || '部費外予算'}
                      {app.externalBudgetAssetType === 2 || app.externalBudgetAssetType === 'AmazonGift' ? ' - 🎁 Amazonギフトカード' :
                       app.externalBudgetAssetType === 3 || app.externalBudgetAssetType === 'Other' ? ' - 🏷️ その他' : ' - 💵 現金'})
                    </span>
                  </div>
                )}
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
              {app.isEditedAfterApproval && app.editReason && (
                <div className="info-item full-width mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <span className="info-label text-yellow-700 font-bold mb-1"><Edit2 size={16} className="inline mr-1" />前回承認・提出後の変更理由（再承認用）</span>
                  <span className="info-value text-yellow-900">{app.editReason}</span>
                </div>
              )}
            </div>

            <div className="action-buttons-row mt-6">
              {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                <>
                  {app.status === 'PendingApproval' && (
                    app.userId === currentUserId ? (
                      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: '8px', color: '#92400e', width: '100%', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} />
                        <span>※ご自身の申請です。規程上、自己承認はできません（他の役員またはシステム管理者が承認します）。</span>
                      </div>
                    ) : (
                      <button className="btn-approve" onClick={handleOpenReviewModal} style={{ backgroundColor: '#2563eb', padding: '12px 24px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <CheckCircle size={20} style={{marginRight: '8px'}} />
                        購入可否の判定（事前承認・差し戻し・却下）へ進む
                      </button>
                    )
                  )}

                  {app.status === 'Approved' && app.type === 'Advance' && (
                    <button className="btn-approve" onClick={() => handleAction('Advance_MoneyHandedOver')} style={{ backgroundColor: '#0284c7', padding: '12px 24px' }}>
                      <CheckCircle size={18} />
                      現金を渡し済にする (部員へ事前出金の手渡し)
                    </button>
                  )}

                  {app.status === 'Approved' && app.type === 'Reimbursement' && (
                    <>
                      {app.receiptType !== 'Paper' && (!app.expenseDocuments || app.expenseDocuments.length === 0) ? (
                        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '8px', color: '#1e40af', width: '100%', fontSize: '0.9rem' }}>
                          <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                          事前承認済みです。部員による領収書データのアップロードを待っています。
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                          <button className="btn-approve" onClick={() => handleAction('UniversitySubmitted')} style={{ flex: 1, backgroundColor: '#2563eb' }}>
                            <CheckCircle size={18} />
                            大学へ申請済にする
                          </button>
                          <button className="secondary-btn" onClick={() => navigate(`/admin/verify/${app.id}`)} style={{ flex: 1 }}>
                            <FileText size={18} />
                            証憑と金額を確認
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {app.status === 'Advance_MoneyHandedOver' && (
                    <>
                      {(!app.expenseDocuments || app.expenseDocuments.length === 0) && app.receiptType !== 'Paper' ? (
                        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 16px', borderRadius: '8px', color: '#1e40af', width: '100%', fontSize: '0.9rem' }}>
                          <Clock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                          現金手渡し完了。部員による買い物完了と領収書提出を待っています。
                        </div>
                      ) : (
                        <button className="btn-approve" onClick={() => navigate(`/admin/verify/${app.id}`)} style={{ backgroundColor: '#4f46e5', padding: '12px 24px', width: '100%' }}>
                          <FileText size={18} />
                          領収書・最終実費を確認して精算する
                        </button>
                      )}
                    </>
                  )}
                  
                  {app.status === 'WaitingConfirmation' && (
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <button className="btn-approve" onClick={() => navigate(`/admin/verify/${app.id}`)} style={{ flex: 1, backgroundColor: '#4f46e5', padding: '12px 24px' }}>
                        <FileText size={18} />
                        証憑・金額を照合して確認へ進む
                      </button>
                    </div>
                  )}

                  {app.status === 'WaitingUniversitySubmission' && (
                    <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
                      <button className="btn-approve" onClick={() => handleAction('UniversitySubmitted')} style={{ flex: 2, backgroundColor: '#2563eb', padding: '12px 24px' }}>
                        <Send size={18} />
                        大学へ申請済にする (UNIPA提出完了)
                      </button>
                      <button className="secondary-btn" onClick={() => navigate(`/admin/verify/${app.id}`)} style={{ flex: 1 }}>
                        <FileText size={18} />
                        証憑・金額を再確認
                      </button>
                      <button className="secondary-btn" onClick={handleOpenUnivRejectModal} style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444' }}>
                        <XCircle size={18} />
                        大学により却下された
                      </button>
                    </div>
                  )}

                  {app.status === 'UniversitySubmitted' && (
                    <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
                      <button className="btn-approve" onClick={() => handleAction('Settled')} style={{ flex: 2, backgroundColor: '#10b981', padding: '12px 24px' }}>
                        <CheckCircle size={18} />
                        精算完了にする {app.type === 'Reimbursement' ? '(立替金返金済)' : '(帳簿処理完了)'}
                      </button>
                      <button className="secondary-btn" onClick={handleOpenUnivRejectModal} style={{ flex: 1, color: '#ef4444', borderColor: '#ef4444' }}>
                        <XCircle size={18} />
                        大学により却下された
                      </button>
                    </div>
                  )}

                  {app.status === 'Settled' && (
                    <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', color: '#065f46', width: '100%', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={18} />
                      この経費申請は精算完了（帳簿処理済）です。
                    </div>
                  )}
                </>
              )}

              {/* User Actions */}
              {app.userId === currentUserId && (app.status === 'Draft' || app.status === 'Remanded' || app.status === 'PendingApproval' || app.status === 'Approved') && (
                <>
                  <button className="btn-edit" onClick={() => app.status === 'Draft' ? navigate(`/apply/${id}`) : openEditModal()}>
                    <Edit2 size={18} />
                    内容を編集する
                  </button>
                  {(app.status === 'Draft' || app.status === 'Remanded') && (
                    <button className="btn-save" onClick={handleResubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Send size={18} />
                      再提出する (承認待ちへ)
                    </button>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        <div className="detail-side-col">
          <section className="detail-card receipt-card">
            <div className="card-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2><FileImage size={18} className="inline-icon" /> 証憑書類</h2>
              {userRole === 'ADMIN' && documents.length > 0 && (
                <button 
                  onClick={handleExportZip}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#4f46e5', color: 'white', borderRadius: '4px', fontSize: '0.9rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
                >
                  <Download size={16} /> 一括ダウンロード (ZIP)
                </button>
              )}
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

            {/* 証憑のアップロード・差し替えフォーム */}
            {['Draft', 'Remanded', 'Approved', 'WaitingConfirmation', 'Advance_MoneyHandedOver'].includes(app.status) && app.receiptType !== 'Paper' && app.userId === currentUserId && (
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

                  {((app.isAmountVariable || app.type === 'Advance') && !app.isAmountFinalized) && (
                    <div className="amount-update-section" style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                      <h4 style={{fontSize: '13px', marginBottom: '8px', color: '#495057'}}>実際の費用を入力してください</h4>
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

            {(app.status === 'PendingApproval' || app.status === 'Approved') && (
              <div className="modal-form-group" style={{marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '20px', backgroundColor: '#fffbeb', padding: '16px', borderRadius: '8px'}}>
                <label style={{color: '#b45309'}}>変更理由 <span style={{color: 'red'}}>*必須</span></label>
                <textarea 
                  value={editReason} 
                  onChange={e => setEditReason(e.target.value)} 
                  placeholder="例: 商品が値上がりしたため金額を修正しました"
                  rows="2"
                  style={{width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #fcd34d', boxSizing: 'border-box'}}
                />
              </div>
            )}
            
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
      {/* Admin Review Modal */}
      {showReviewModal && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '500px', width: '90%'}}>
            <h3 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '20px' }}>
              事前承認の判定
            </h3>
            
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{fontWeight: 'bold', marginBottom: '8px'}}>申請内容の最終確認</div>
              <div style={{display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '0.9rem'}}>
                <span style={{color: '#6b7280'}}>申請者:</span> <span>{applicantName}</span>
                <span style={{color: '#6b7280'}}>申請金額:</span> <span style={{fontWeight: 'bold', color: '#111827'}}>¥{app.totalAmount.toLocaleString()}</span>
                <span style={{color: '#6b7280'}}>区分:</span> <span>{typeStr}</span>
              </div>
            </div>

            <div className="modal-form-group" style={{ marginBottom: '20px' }}>
              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>判定結果</label>
              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <label style={{ display: 'flex', alignItems: 'center', padding: '12px', border: reviewAction === 'Approved' ? '2px solid #10b981' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: reviewAction === 'Approved' ? '#ecfdf5' : 'white' }}>
                  <input type="radio" name="reviewAction" value="Approved" checked={reviewAction === 'Approved'} onChange={() => setReviewAction('Approved')} style={{ marginRight: '12px' }} />
                  <span style={{ fontWeight: 'bold', color: '#065f46' }}>承認する (購入を許可)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', padding: '12px', border: reviewAction === 'Remanded' ? '2px solid #f59e0b' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: reviewAction === 'Remanded' ? '#fffbeb' : 'white' }}>
                  <input type="radio" name="reviewAction" value="Remanded" checked={reviewAction === 'Remanded'} onChange={() => setReviewAction('Remanded')} style={{ marginRight: '12px' }} />
                  <span style={{ fontWeight: 'bold', color: '#b45309' }}>差し戻す (内容修正を依頼)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', padding: '12px', border: reviewAction === 'Rejected' ? '2px solid #ef4444' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: reviewAction === 'Rejected' ? '#fef2f2' : 'white' }}>
                  <input type="radio" name="reviewAction" value="Rejected" checked={reviewAction === 'Rejected'} onChange={() => setReviewAction('Rejected')} style={{ marginRight: '12px' }} />
                  <span style={{ fontWeight: 'bold', color: '#991b1b' }}>却下する (購入を許可しない)</span>
                </label>
              </div>
            </div>

            {reviewAction === 'Approved' && (
              <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', color: '#0369a1', cursor: 'pointer', marginBottom: assignExternalBudget ? '12px' : 0 }}>
                  <input 
                    type="checkbox" 
                    checked={assignExternalBudget} 
                    onChange={e => setAssignExternalBudget(e.target.checked)} 
                    style={{ marginRight: '8px', width: '18px', height: '18px' }}
                  />
                  部費外予算（OB・OG寄付金・特別助成等）を充当する
                </label>

                {assignExternalBudget && (() => {
                  const curBudget = externalBudgets.find(b => b.id === selectedExternalBudgetId);
                  const cashRem = curBudget?.remainingCashAmount ?? 0;
                  const amazonRem = curBudget?.remainingAmazonGiftAmount ?? 0;
                  const otherRem = curBudget?.remainingOtherAmount ?? 0;
                  const selectedRem = externalBudgetAssetType === 'AmazonGift' ? amazonRem : (externalBudgetAssetType === 'Other' ? otherRem : cashRem);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '4px' }}>充当先の部費外予算枠</label>
                        <select 
                          value={selectedExternalBudgetId} 
                          onChange={e => setSelectedExternalBudgetId(e.target.value)}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          {externalBudgets.length === 0 ? (
                            <option value="">登録済みの部費外予算がありません</option>
                          ) : (
                            externalBudgets.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name} (残高: ¥{b.remainingAmount?.toLocaleString()} / 枠: ¥{b.totalAmount?.toLocaleString()})
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {curBudget && (
                        <div>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563', display: 'block', marginBottom: '6px' }}>使用する資産形態を選択</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', border: externalBudgetAssetType === 'Cash' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', backgroundColor: externalBudgetAssetType === 'Cash' ? '#eff6ff' : 'white', textAlign: 'center' }}>
                              <input type="radio" name="extAssetType" value="Cash" checked={externalBudgetAssetType === 'Cash'} onChange={() => setExternalBudgetAssetType('Cash')} style={{ display: 'none' }} />
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e40af' }}>💵 現金</span>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>残: ¥{cashRem.toLocaleString()}</span>
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', border: externalBudgetAssetType === 'AmazonGift' ? '2px solid #ea580c' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', backgroundColor: externalBudgetAssetType === 'AmazonGift' ? '#fff7ed' : 'white', textAlign: 'center' }}>
                              <input type="radio" name="extAssetType" value="AmazonGift" checked={externalBudgetAssetType === 'AmazonGift'} onChange={() => setExternalBudgetAssetType('AmazonGift')} style={{ display: 'none' }} />
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#c2410c' }}>🎁 アマギフ</span>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>残: ¥{amazonRem.toLocaleString()}</span>
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', border: externalBudgetAssetType === 'Other' ? '2px solid #7c3aed' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', backgroundColor: externalBudgetAssetType === 'Other' ? '#f5f3ff' : 'white', textAlign: 'center' }}>
                              <input type="radio" name="extAssetType" value="Other" checked={externalBudgetAssetType === 'Other'} onChange={() => setExternalBudgetAssetType('Other')} style={{ display: 'none' }} />
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#6d28d9' }}>🏷️ その他</span>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>残: ¥{otherRem.toLocaleString()}</span>
                            </label>
                          </div>
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4b5563' }}>部費外充当金額 (円)</label>
                          <button
                            type="button"
                            onClick={() => {
                              const maxPossible = Math.min(app.totalAmount || 0, selectedRem);
                              setExternalBudgetAmount(maxPossible > 0 ? maxPossible : (app.totalAmount || 0));
                            }}
                            style={{
                              padding: '2px 10px',
                              fontSize: '0.75rem',
                              backgroundColor: '#ec4899',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="申請総額（または選択形態の残高上限）を自動入力"
                          >
                            ⚡ 全額を割り当てる (¥{app.totalAmount?.toLocaleString()})
                          </button>
                        </div>
                        <input 
                          type="number" 
                          value={externalBudgetAmount} 
                          onChange={e => setExternalBudgetAmount(e.target.value)} 
                          max={app.totalAmount}
                          min={0}
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '1.05rem', fontWeight: 'bold' }}
                        />
                        {Number(externalBudgetAmount) > selectedRem && (
                          <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold' }}>
                            ⚠️ 選択した形態の残高（¥{selectedRem.toLocaleString()}）を超過しています。
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '10px', backgroundColor: '#ffffff', borderRadius: '6px', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>部費負担分:</span>
                          <strong style={{ color: '#2563eb' }}>¥{Math.max(0, (app.totalAmount || 0) - (Number(externalBudgetAmount) || 0)).toLocaleString()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>部費外充当分:</span>
                          <strong style={{ color: '#db2777' }}>
                            ¥{(Number(externalBudgetAmount) || 0).toLocaleString()}
                            <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: '#6b7280' }}>
                              ({externalBudgetAssetType === 'AmazonGift' ? '🎁 Amazonギフトカード' : (externalBudgetAssetType === 'Other' ? '🏷️ その他' : '💵 現金')})
                            </span>
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {(reviewAction === 'Remanded' || reviewAction === 'Rejected') && (
              <div className="modal-form-group" style={{ marginBottom: '20px' }}>
                <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px', color: '#ef4444'}}>理由を入力してください (必須)</label>
                <textarea 
                  value={reviewReason} 
                  onChange={e => setReviewReason(e.target.value)} 
                  rows="3"
                  placeholder="申請者に通知される理由を記入してください..."
                  style={{width: '100%', padding: '12px', border: '1px solid #ef4444', borderRadius: '4px'}}
                  required
                />
              </div>
            )}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="btn-cancel" onClick={() => setShowReviewModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer' }}>キャンセル</button>
              <button 
                className="btn-save" 
                onClick={submitReviewAction}
                style={{ padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: reviewAction === 'Approved' ? '#10b981' : reviewAction === 'Remanded' ? '#f59e0b' : '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                確定する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* University Rejection & Mitigation Modal */}
      {showUnivRejectModal && (
        <div className="modal-overlay" onClick={() => setShowUnivRejectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '520px', width: '90%'}}>
            <h3 style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={22} color="#dc2626" />
              大学による却下・不認可の処理
            </h3>
            
            <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '16px' }}>
              大学の申請・提出において却下または不備指摘があった場合の対応方法を選択してください。
            </p>

            <div className="modal-form-group" style={{ marginBottom: '20px' }}>
              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '8px'}}>対応方法の選択</label>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', border: univRejectAction === 'Rejected' ? '2px solid #ef4444' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: univRejectAction === 'Rejected' ? '#fef2f2' : 'white' }}>
                  <input type="radio" name="univRejectAction" value="Rejected" checked={univRejectAction === 'Rejected'} onChange={() => setUnivRejectAction('Rejected')} style={{ marginTop: '4px', marginRight: '12px' }} />
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#991b1b', display: 'block' }}>完全却下（部費も支払わない）</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>大学で認められず、部費からも支出できません。確保されていた部費予算は解放（復活）されます。</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', border: univRejectAction === 'SwitchToExternal' ? '2px solid #db2777' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: univRejectAction === 'SwitchToExternal' ? '#fdf2f8' : 'white' }}>
                  <input type="radio" name="univRejectAction" value="SwitchToExternal" checked={univRejectAction === 'SwitchToExternal'} onChange={() => setUnivRejectAction('SwitchToExternal')} style={{ marginTop: '4px', marginRight: '12px' }} />
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#9d174d', display: 'block' }}>部費外予算（OB寄付金等）に振り替えて支払う</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>大学（部費）からは出ませんが、部活の部費外予算枠から支出して精算完了にします（部費予算は消費されません）。</span>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', padding: '12px', border: univRejectAction === 'Remanded' ? '2px solid #f59e0b' : '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', backgroundColor: univRejectAction === 'Remanded' ? '#fffbeb' : 'white' }}>
                  <input type="radio" name="univRejectAction" value="Remanded" checked={univRejectAction === 'Remanded'} onChange={() => setUnivRejectAction('Remanded')} style={{ marginTop: '4px', marginRight: '12px' }} />
                  <div>
                    <span style={{ fontWeight: 'bold', color: '#b45309', display: 'block' }}>書類不備として部員へ差し戻す</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>領収書や証憑の宛名不備など、部員が修正して大学へ再提出できる場合に選択します。</span>
                  </div>
                </label>
              </div>
            </div>

            {univRejectAction === 'SwitchToExternal' && (() => {
              const curBudget = externalBudgets.find(b => b.id === univExternalBudgetId);
              const cashRem = curBudget?.remainingCashAmount ?? 0;
              const amazonRem = curBudget?.remainingAmazonGiftAmount ?? 0;
              const otherRem = curBudget?.remainingOtherAmount ?? 0;
              const selectedRem = univExternalBudgetAssetType === 'AmazonGift' ? amazonRem : (univExternalBudgetAssetType === 'Other' ? otherRem : cashRem);

              return (
                <div style={{ marginBottom: '16px', padding: '14px', backgroundColor: '#fdf2f8', borderRadius: '8px', border: '1px solid #fbcfe8', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#831843', display: 'block', marginBottom: '4px' }}>振替先の部費外予算</label>
                    <select 
                      value={univExternalBudgetId} 
                      onChange={e => setUnivExternalBudgetId(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #f472b6' }}
                    >
                      {externalBudgets.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} (残高: ¥{b.remainingAmount?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {curBudget && (
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#831843', display: 'block', marginBottom: '6px' }}>使用する資産形態を選択</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', border: univExternalBudgetAssetType === 'Cash' ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', backgroundColor: univExternalBudgetAssetType === 'Cash' ? '#eff6ff' : 'white', textAlign: 'center' }}>
                          <input type="radio" name="univAssetType" value="Cash" checked={univExternalBudgetAssetType === 'Cash'} onChange={() => setUnivExternalBudgetAssetType('Cash')} style={{ display: 'none' }} />
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#1e40af' }}>💵 現金</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>残: ¥{cashRem.toLocaleString()}</span>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', border: univExternalBudgetAssetType === 'AmazonGift' ? '2px solid #ea580c' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', backgroundColor: univExternalBudgetAssetType === 'AmazonGift' ? '#fff7ed' : 'white', textAlign: 'center' }}>
                          <input type="radio" name="univAssetType" value="AmazonGift" checked={univExternalBudgetAssetType === 'AmazonGift'} onChange={() => setUnivExternalBudgetAssetType('AmazonGift')} style={{ display: 'none' }} />
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#c2410c' }}>🎁 アマギフ</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>残: ¥{amazonRem.toLocaleString()}</span>
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', border: univExternalBudgetAssetType === 'Other' ? '2px solid #7c3aed' : '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', backgroundColor: univExternalBudgetAssetType === 'Other' ? '#f5f3ff' : 'white', textAlign: 'center' }}>
                          <input type="radio" name="univAssetType" value="Other" checked={univExternalBudgetAssetType === 'Other'} onChange={() => setUnivExternalBudgetAssetType('Other')} style={{ display: 'none' }} />
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#6d28d9' }}>🏷️ その他</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>残: ¥{otherRem.toLocaleString()}</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#831843' }}>振替充当額 (円)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const maxPossible = Math.min(app.totalAmount || 0, selectedRem);
                          setUnivExternalBudgetAmount(maxPossible > 0 ? maxPossible : (app.totalAmount || 0));
                        }}
                        style={{
                          padding: '2px 10px',
                          fontSize: '0.75rem',
                          backgroundColor: '#be185d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="申請総額（または選択形態の残高上限）を自動入力"
                      >
                        ⚡ 全額を割り当てる (¥{app.totalAmount?.toLocaleString()})
                      </button>
                    </div>
                    <input 
                      type="number" 
                      value={univExternalBudgetAmount} 
                      onChange={e => setUnivExternalBudgetAmount(e.target.value)}
                      max={app.totalAmount}
                      min={1}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #f472b6', fontWeight: 'bold', fontSize: '1.05rem' }}
                    />
                    {Number(univExternalBudgetAmount) > selectedRem && (
                      <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold' }}>
                        ⚠️ 選択した形態の残高（¥{selectedRem.toLocaleString()}）を超過しています。
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="modal-form-group" style={{ marginBottom: '20px' }}>
              <label style={{fontWeight: 'bold', display: 'block', marginBottom: '6px'}}>
                大学からの指摘内容・理由 {univRejectAction !== 'SwitchToExternal' && <span style={{color: '#dc2626'}}>*必須</span>}
              </label>
              <textarea 
                value={univRejectReason} 
                onChange={e => setUnivRejectReason(e.target.value)} 
                rows="3"
                placeholder={univRejectAction === 'Rejected' ? "例: 大学学生課より対象外品目として却下されました" : "大学からの連絡・指摘事項を入力..."}
                style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px'}}
                required={univRejectAction !== 'SwitchToExternal'}
              />
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-cancel" onClick={() => setShowUnivRejectModal(false)} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: 'white', cursor: 'pointer' }}>キャンセル</button>
              <button 
                className="btn-save" 
                onClick={submitUnivRejectAction}
                style={{ padding: '10px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#dc2626', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                確定する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationDetail;
