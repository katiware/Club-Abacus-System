import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Trash2, Play, Pause, Settings, Calendar, X, HelpCircle, CheckCircle2, AlertCircle, Edit2, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './RecurringPayments.css';

const CATEGORY_MAP = {
  'SERVER': 'サーバー・インフラ代',
  'EQUIPMENT': '備品購入',
  'EVENT': 'イベント・大会費用',
  'BOOKS': '書籍・技術書',
  'OTHER': 'その他'
};

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
};

export default function RecurringPayments() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [showGuide, setShowGuide] = useState(true);

  const token = localStorage.getItem('authToken');
  const decoded = token ? parseJwt(token) : null;
  
  const jwtUserId = decoded ? (
    decoded.nameid || 
    decoded.sub || 
    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    decoded.id ||
    ''
  ) : '';
  const jwtUserName = decoded ? (decoded.name || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '自分') : '自分';

  const [currentUserId, setCurrentUserId] = useState(jwtUserId);

  const getInitialFormState = (uid = currentUserId) => ({
    id: null,
    userId: uid || (users.length > 0 ? users[0].id : ''),
    templateName: '',
    recurringFrequency: 'Monthly',
    expenseType: 'Reimbursement',
    receiptType: 'Digital',
    itemName: '',
    amount: '',
    isAmountVariable: false,
    payee: '',
    category: 'SERVER',
    description: '',
    purchaseUrl: '',
    nextGenerationDate: new Date().toISOString().split('T')[0]
  });

  const [formData, setFormData] = useState(getInitialFormState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fetchTemplatesAndUsers = async () => {
    setLoading(true);
    setError(null);
    let meId = '';
    let meName = '';
    
    try {
      const resMe = await api.get('/User/me');
      meId = resMe.data.id || jwtUserId;
      meName = resMe.data.name || jwtUserName;
      setCurrentUserId(meId);
    } catch (err) {
      console.warn('Failed to fetch /User/me', err);
      meId = jwtUserId;
      meName = jwtUserName;
    }

    try {
      const resTemplates = await api.get('/RecurringExpense');
      setTemplates(resTemplates.data || []);
    } catch (err) {
      console.error('Failed to fetch templates', err);
      setError('定期支払いデータの取得に失敗しました。');
    }

    try {
      const resUsers = await api.get('/User');
      setUsers(resUsers.data || []);
    } catch (err) {
      console.warn('Failed to fetch users (might not be admin)', err);
      if (meId) {
        setUsers([{ id: meId, name: `${meName} (自分)` }]);
      } else {
        setUsers([{ id: 'unknown', name: '自分' }]);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplatesAndUsers();
  }, []);

  const getFreqString = (freq) => (freq === 'Monthly' || freq === 0 ? '毎月' : '毎年');
  const getExpenseTypeString = (type) => (type === 'Advance' || type === 1 ? '事前出金' : '立替払い');
  const getReceiptTypeString = (type) => (type === 'Paper' || type === 1 ? '実店舗(紙)' : 'Web購入(PDF等)');
  const isActive = (status) => status === 'Active' || status === 0;

  const toggleStatus = async (id, currentStatus) => {
    const active = isActive(currentStatus);
    const newStatus = active ? 'Inactive' : 'Active';
    try {
      await api.put(`/RecurringExpense/${id}`, {
        templateStatus: newStatus
      });
      await fetchTemplatesAndUsers();
    } catch (err) {
      console.error('Failed to toggle status', err);
      alert('ステータスの変更に失敗しました。');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`「${name}」の定期支払いテンプレートを削除しますか？\n（過去に生成された申請履歴は削除されません）`)) {
      try {
        await api.delete(`/RecurringExpense/${id}`);
        await fetchTemplatesAndUsers();
      } catch (err) {
        console.error('Failed to delete template', err);
        alert('テンプレートの削除に失敗しました。');
      }
    }
  };

  const handleGenerateManual = async (e, id, name) => {
    e.stopPropagation();
    if (window.confirm(`「${name}」の申請を手動で臨時生成しますか？\n（承認待ちとして申請が作成され、次回生成日も1周期進みます）`)) {
      try {
        const res = await api.post(`/RecurringExpense/${id}/generate`);
        if (window.confirm('申請の手動生成に成功しました！\n生成された申請の詳細画面（承認・確認）を開きますか？')) {
          navigate(`/applications/${res.data.expenseRequestId}`);
        } else {
          await fetchTemplatesAndUsers();
        }
      } catch (err) {
        console.error('Failed to generate manual', err);
        alert(err.response?.data?.message || err.response?.data || '生成に失敗しました。');
      }
    }
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData(getInitialFormState(currentUserId));
    setSubmitError(null);
    setShowAddModal(true);
  };

  const openEditModal = (tpl) => {
    setModalMode('edit');
    setFormData({
      id: tpl.id,
      userId: tpl.userId || currentUserId,
      templateName: tpl.templateName || '',
      recurringFrequency: tpl.recurringFrequency === 1 || tpl.recurringFrequency === 'Yearly' ? 'Yearly' : 'Monthly',
      expenseType: tpl.expenseType === 1 || tpl.expenseType === 'Advance' ? 'Advance' : 'Reimbursement',
      receiptType: tpl.receiptType === 1 || tpl.receiptType === 'Paper' ? 'Paper' : 'Digital',
      itemName: tpl.itemName || '',
      amount: tpl.amount ?? '',
      isAmountVariable: !!tpl.isAmountVariable,
      payee: tpl.payee || '',
      category: tpl.category || 'SERVER',
      description: tpl.description || '',
      purchaseUrl: tpl.purchaseUrl || '',
      nextGenerationDate: tpl.nextGenerationDate ? String(tpl.nextGenerationDate).slice(0, 10) : ''
    });
    setSelectedTemplate(null);
    setSubmitError(null);
    setShowAddModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const amountNum = Number(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setSubmitError('金額は1以上の数値を入力してください。');
      setIsSubmitting(false);
      return;
    }

    if (formData.receiptType === 'Digital' && (!formData.purchaseUrl || !formData.purchaseUrl.trim())) {
      setSubmitError('Web購入(PDF等)の場合は購入先・サービスURLを必ず入力してください。');
      setIsSubmitting(false);
      return;
    }

    try {
      if (modalMode === 'add') {
        const payload = {
          userId: formData.userId,
          templateName: formData.templateName,
          recurringFrequency: formData.recurringFrequency,
          expenseType: formData.expenseType,
          receiptType: formData.receiptType,
          itemName: formData.itemName,
          amount: amountNum,
          isAmountVariable: Boolean(formData.isAmountVariable),
          payee: formData.payee,
          category: formData.category,
          description: formData.description,
          purchaseUrl: formData.purchaseUrl,
          nextGenerationDate: formData.nextGenerationDate
        };
        await api.post('/RecurringExpense', payload);
        alert('新しい定期支払いテンプレートを作成しました！');
      } else {
        const payload = {
          templateName: formData.templateName,
          itemName: formData.itemName,
          amount: amountNum,
          isAmountVariable: Boolean(formData.isAmountVariable),
          payee: formData.payee,
          category: formData.category,
          description: formData.description,
          purchaseUrl: formData.purchaseUrl,
          nextGenerationDate: formData.nextGenerationDate,
          recurringFrequency: formData.recurringFrequency,
          expenseType: formData.expenseType,
          receiptType: formData.receiptType
        };
        await api.put(`/RecurringExpense/${formData.id}`, payload);
        alert('テンプレート情報を更新しました！');
      }
      setShowAddModal(false);
      await fetchTemplatesAndUsers();
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.message || err.response?.data || '保存に失敗しました。入力内容を確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="recurring-payments-container fade-in">
      <PageHeader title="定期支払い管理" backTo="/top">
        <button className="primary-btn" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={18} />
          新規テンプレート作成
        </button>
      </PageHeader>

      {/* 補足説明ガイド */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 'bold' }}>
            <HelpCircle size={18} color="#3b82f6" />
            <span>定期支払いテンプレートとは？</span>
          </div>
          <button 
            type="button" 
            onClick={() => setShowGuide(!showGuide)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}
          >
            {showGuide ? '説明を閉じる ▲' : '説明を表示する ▼'}
          </button>
        </div>
        {showGuide && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#475569', lineHeight: '1.6', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>自動起票</strong>: 指定した「次回生成日」になると、深夜バッチで自動的に「承認待ち」の申請が作成されます。</li>
              <li><strong>金額の変動</strong>: 為替（AWS・ドル建て等）や通信量で月ごとに金額が変わる場合は「為替等で金額が変動する」にチェックを入れてください。申請後に正確な実額へ更新できます。</li>
              <li><strong>一時停止 / 再開</strong>: 利用停止期間中はカード下部の「一時停止する」を押すことで、次回の自動起票をストップできます。</li>
              <li><strong>手動生成</strong>: テストや前倒し申請を行いたい場合は、「手動生成」ボタンから即座に申請を作成できます。</li>
            </ul>
          </div>
        )}
      </div>

      <main className="page-content bg-transparent p-0 shadow-none">
        {error && <div className="p-4 bg-white rounded-lg shadow text-red-500 text-center mb-4">{error}</div>}
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : templates.length === 0 && !error ? (
          <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">
            <p style={{ margin: '0 0 12px 0' }}>登録されている定期支払いテンプレートはありません。</p>
            <button className="primary-btn" onClick={openAddModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> 最初のテンプレートを登録
            </button>
          </div>
        ) : (
          <div className="template-grid">
            {templates.map(tpl => {
              const active = isActive(tpl.templateStatus);
              return (
                <div key={tpl.id} className={`template-card ${!active ? 'inactive' : ''}`} onClick={() => setSelectedTemplate(tpl)} style={{ cursor: 'pointer' }}>
                  <div className="tpl-header">
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="tpl-badge">{getFreqString(tpl.recurringFrequency)}</span>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '3px 8px', 
                        borderRadius: '10px', 
                        backgroundColor: active ? '#dcfce7' : '#f1f5f9',
                        color: active ? '#15803d' : '#64748b',
                        fontWeight: '600'
                      }}>
                        {active ? '稼働中' : '停止中'}
                      </span>
                    </div>
                    <div className="tpl-actions">
                      <button 
                        className="icon-btn"
                        onClick={(e) => { e.stopPropagation(); openEditModal(tpl); }}
                        title="編集"
                        style={{ color: '#475569', padding: '4px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="icon-btn danger-text" 
                        onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id, tpl.templateName); }} 
                        title="削除"
                        style={{ padding: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="tpl-title">{tpl.templateName}</h3>
                  <div className="tpl-amount">
                    ¥{tpl.amount?.toLocaleString() ?? 0}
                    {tpl.isAmountVariable && (
                      <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px', fontWeight: 'normal' }}>
                        (変動有)
                      </span>
                    )}
                  </div>
                  
                  <div className="tpl-meta" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      次回生成: <strong>{tpl.nextGenerationDate}</strong>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {tpl.user?.name || '担当者未設定'}
                    </span>
                  </div>

                  <div className="tpl-footer" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={`status-toggle-btn ${active ? 'active' : 'paused'}`}
                      onClick={(e) => { e.stopPropagation(); toggleStatus(tpl.id, tpl.templateStatus); }}
                      style={{ flex: 1 }}
                    >
                      {active ? <Pause size={15} /> : <Play size={15} />}
                      {active ? '一時停止' : '再開'}
                    </button>
                    {active && (
                      <button 
                        className="status-toggle-btn"
                        style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                        onClick={(e) => handleGenerateManual(e, tpl.id, tpl.templateName)}
                        title="次回生成日を待たずに今すぐ申請を起票します"
                      >
                        手動生成
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* テンプレート詳細モーダル */}
      {selectedTemplate && (
        <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}>
          <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>テンプレート詳細</h2>
              <button className="icon-btn" onClick={() => setSelectedTemplate(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>テンプレート名:</span>
                <strong style={{ color: '#1e293b' }}>{selectedTemplate.templateName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>担当部員:</span>
                <span>{selectedTemplate.user?.name || '不明'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>ステータス:</span>
                <span style={{ fontWeight: '600', color: isActive(selectedTemplate.templateStatus) ? '#16a34a' : '#64748b' }}>
                  {isActive(selectedTemplate.templateStatus) ? '稼働中' : '一時停止中'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>起票周期:</span>
                <span>{getFreqString(selectedTemplate.recurringFrequency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>次回自動生成日:</span>
                <strong>{selectedTemplate.nextGenerationDate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>精算区分:</span>
                <span>{getExpenseTypeString(selectedTemplate.expenseType)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>領収書タイプ:</span>
                <span>{getReceiptTypeString(selectedTemplate.receiptType)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>品目名:</span>
                <span>{selectedTemplate.itemName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>基準金額:</span>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                  ¥{selectedTemplate.amount?.toLocaleString() ?? 0} {selectedTemplate.isAmountVariable ? '(変動あり)' : ''}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>カテゴリ:</span>
                <span>{CATEGORY_MAP[selectedTemplate.category] || selectedTemplate.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>支払先:</span>
                <span>{selectedTemplate.payee}</span>
              </div>
              {selectedTemplate.purchaseUrl && (
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>購入先URL:</span>
                  <a href={selectedTemplate.purchaseUrl} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {selectedTemplate.purchaseUrl} <ExternalLink size={13} />
                  </a>
                </div>
              )}
              {selectedTemplate.description && (
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '4px' }}>備考:</span>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                    {selectedTemplate.description}
                  </p>
                </div>
              )}
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '10px', marginTop: '16px' }}>
              <button className="primary-btn" onClick={() => openEditModal(selectedTemplate)}>
                <Edit2 size={15} style={{ marginRight: '6px' }} />
                編集する
              </button>
              <button className="secondary-btn" onClick={() => setSelectedTemplate(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート作成・編集モーダル */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? '新規定期支払いテンプレート作成' : 'テンプレート編集'}</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {submitError && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span>{submitError}</span>
                </div>
              )}
              
              {/* 対象ユーザー */}
              <div className="form-group">
                <label>申請者 (担当部員) <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  className="form-input"
                  value={formData.userId}
                  onChange={(e) => setFormData({...formData, userId: e.target.value})}
                  required
                  disabled={modalMode === 'edit'}
                >
                  <option value="">選択してください</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <small style={{ color: '#64748b', fontSize: '11px' }}>
                  {modalMode === 'edit' ? '※ 作成済みの担当者は変更できません' : '申請者として自動起票される部員を選択します'}
                </small>
              </div>

              {/* テンプレート名 (申請タイトル兼用) */}
              <div className="form-group">
                <label>テンプレート名 (兼 申請タイトル) <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" className="form-input" required
                  value={formData.templateName}
                  onChange={(e) => setFormData({...formData, templateName: e.target.value})}
                  placeholder="例: AWS利用料, GitHub Teamプラン"
                />
                <small style={{ color: '#64748b', fontSize: '11px' }}>起票される申請のタイトルとして使用されます。</small>
              </div>

              {/* 頻度 & 次回生成日 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>起票周期 <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    className="form-input"
                    value={formData.recurringFrequency}
                    onChange={(e) => setFormData({...formData, recurringFrequency: e.target.value})}
                  >
                    <option value="Monthly">毎月 (月次)</option>
                    <option value="Yearly">毎年 (年次)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>次回自動生成日 <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="date" className="form-input" required
                    value={formData.nextGenerationDate}
                    onChange={(e) => setFormData({...formData, nextGenerationDate: e.target.value})}
                  />
                </div>
              </div>

              {/* 区分 & 領収書タイプ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>精算区分 <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    className="form-input"
                    value={formData.expenseType}
                    onChange={(e) => setFormData({...formData, expenseType: e.target.value})}
                  >
                    <option value="Reimbursement">立替払い (部員が支払後、後日精算)</option>
                    <option value="Advance">事前出金 (部活費を事前受領して支払)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>領収書タイプ <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    className="form-input"
                    value={formData.receiptType}
                    onChange={(e) => setFormData({...formData, receiptType: e.target.value})}
                  >
                    <option value="Digital">Web購入 (PDF・明細ダウンロード)</option>
                    <option value="Paper">実店舗 (紙の領収書)</option>
                  </select>
                </div>
              </div>

              {/* 品目名 */}
              <div className="form-group">
                <label>品目名 <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" className="form-input" required
                  value={formData.itemName}
                  onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                  placeholder="例: クラウドサーバー月額利用料"
                />
              </div>

              {/* 金額 & 変動フラグ */}
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>金額（予定・基準額） <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="number" className="form-input" required min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value === '' ? '' : e.target.value})}
                    placeholder="例: 3500"
                  />
                </div>
                <div className="form-group" style={{ paddingTop: '28px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input 
                      type="checkbox"
                      checked={formData.isAmountVariable}
                      onChange={(e) => setFormData({...formData, isAmountVariable: e.target.checked})}
                    />
                    <span>為替等で金額が変動する</span>
                  </label>
                </div>
              </div>

              {/* 支払先 & カテゴリ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>支払先 <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" className="form-input" required
                    value={formData.payee}
                    onChange={(e) => setFormData({...formData, payee: e.target.value})}
                    placeholder="例: Amazon Web Services, さくらインターネット"
                  />
                </div>
                <div className="form-group">
                  <label>カテゴリ <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    className="form-input" required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="SERVER">サーバー・インフラ代</option>
                    <option value="EQUIPMENT">備品購入</option>
                    <option value="EVENT">イベント・大会費用</option>
                    <option value="BOOKS">書籍・技術書</option>
                    <option value="OTHER">その他</option>
                  </select>
                </div>
              </div>

              {/* 購入先URL */}
              <div className="form-group">
                <label>
                  購入先・サービスURL
                  {formData.receiptType === 'Digital' ? (
                    <> <span style={{ color: '#ef4444' }}>* (必須)</span></>
                  ) : (
                    ' (任意)'
                  )}
                </label>
                <input 
                  type="url" className="form-input"
                  required={formData.receiptType === 'Digital'}
                  value={formData.purchaseUrl}
                  onChange={(e) => setFormData({...formData, purchaseUrl: e.target.value})}
                  placeholder={formData.receiptType === 'Digital' ? "https://aws.amazon.com/ など (必須)" : "https://... (任意)"}
                />
              </div>

              {/* 備考 */}
              <div className="form-group">
                <label>備考・詳細説明 (任意)</label>
                <textarea 
                  className="form-input" rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="決済クレジットカードや定期更新の目的など"
                ></textarea>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
                  キャンセル
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? '保存中...' : (modalMode === 'add' ? 'テンプレートを作成する' : '変更を保存する')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
