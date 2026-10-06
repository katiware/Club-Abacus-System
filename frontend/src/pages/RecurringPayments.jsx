import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Trash2, Play, Pause, Settings, Calendar, X } from 'lucide-react';
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

function RecurringPayments() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');

  const token = localStorage.getItem('authToken');
  const decoded = token ? parseJwt(token) : null;
  
  // JWTからIDを取得するフォールバック（複数のクレームキーを試す）
  const jwtUserId = decoded ? (
    decoded.nameid || 
    decoded.sub || 
    decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    decoded.id ||
    ''
  ) : '';
  const jwtUserName = decoded ? (decoded.name || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '自分') : '自分';

  const [currentUserId, setCurrentUserId] = useState(jwtUserId);

  const [newTemplate, setNewTemplate] = useState({
    userId: currentUserId,
    templateName: '',
    recurringFrequency: 0,
    expenseType: 0,
    receiptType: 1,
    itemName: '',
    amount: '',
    isAmountVariable: false,
    payee: '',
    category: '',
    description: '',
    purchaseUrl: '',
    nextGenerationDate: ''
  });
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
      // テンプレートは全ユーザー取得可能 (バックエンドで権限に応じた絞り込みが行われる)
      const resTemplates = await api.get('/RecurringExpense');
      setTemplates(resTemplates.data);
    } catch (err) {
      console.error('Failed to fetch templates', err);
      setError('定期支払いデータの取得に失敗しました。');
    }

    try {
      // ユーザー一覧は管理者のみ取得可能。失敗してもページ全体を壊さない
      const resUsers = await api.get('/User');
      setUsers(resUsers.data);
    } catch (err) {
      console.warn('Failed to fetch users (might not be admin)', err);
      // 管理者でない場合は、自分自身だけを選択肢に入れる
      if (meId) {
        setUsers([{ id: meId, name: `${meName} (自分)` }]);
      } else {
        setUsers([{ id: 'unknown', name: '自分 (ID取得失敗)' }]);
      }
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplatesAndUsers();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    // 0: Active, 1: Inactive
    const newStatus = currentStatus === 0 || currentStatus === 'Active' ? 1 : 0;
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
    if (window.confirm(`${name} の定期支払いテンプレートを削除しますか？`)) {
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
    if (window.confirm(`${name} の申請を手動で臨時生成しますか？\n（承認待ちとして生成され、次回生成日も1周期進みます）`)) {
      try {
        const res = await api.post(`/RecurringExpense/${id}/generate`);
        if (window.confirm('手動生成に成功しました。\n生成された申請の詳細画面（承認・編集）を開きますか？\n「キャンセル」を押すとこの画面にとどまります。')) {
          navigate(`/applications/${res.data.expenseRequestId}`);
        }
      } catch (err) {
        console.error('Failed to generate manual', err);
        alert(err.response?.data || '生成に失敗しました。');
      }
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (modalMode === 'add') {
        await api.post('/RecurringExpense', newTemplate);
        alert('新しい定期支払いテンプレートを作成しました！');
      } else {
        await api.put(`/RecurringExpense/${newTemplate.id}`, newTemplate);
        alert('テンプレートを更新しました！');
      }
      setShowAddModal(false);
      setNewTemplate({
        userId: currentUserId,
        templateName: '',
        recurringFrequency: 0,
        expenseType: 0,
        receiptType: 1,
        itemName: '',
        amount: '',
        isAmountVariable: false,
        payee: '',
        category: '',
        description: '',
        purchaseUrl: '',
        nextGenerationDate: ''
      });
      await fetchTemplatesAndUsers();
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.message || err.response?.data || '作成に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFreqString = (freq) => freq === 'Monthly' || freq === 0 ? '毎月' : '毎年';
  const isActive = (status) => status === 'Active' || status === 0;

  return (
    <div className="recurring-payments-container fade-in">
      <PageHeader title="定期支払い管理" backTo="/top">
        <button className="primary-btn" onClick={() => {
          setModalMode('add');
          setNewTemplate({
            userId: currentUserId || (users.length > 0 ? users[0].id : ''), 
            templateName: '', recurringFrequency: 0,
            expenseType: 0, receiptType: 1, itemName: '', amount: '',
            isAmountVariable: false, payee: '', category: '', description: '',
            purchaseUrl: '', nextGenerationDate: ''
          });
          setShowAddModal(true);
        }}>
          <Plus size={18} />
          新規テンプレート作成
        </button>
      </PageHeader>

      <main className="page-content bg-transparent p-0 shadow-none">
        {error && <div className="p-4 bg-white rounded-lg shadow text-red-500 text-center mb-4">{error}</div>}
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : templates.length === 0 && !error ? (
          <div className="p-8 bg-white rounded-lg shadow text-center text-gray-500">定期支払いテンプレートがありません。</div>
        ) : (
          <div className="template-grid">
            {templates.map(tpl => {
              const active = isActive(tpl.templateStatus);
              return (
                <div key={tpl.id} className={`template-card ${!active ? 'inactive' : ''}`} onClick={() => setSelectedTemplate(tpl)} style={{ cursor: 'pointer' }}>
                  <div className="tpl-header">
                    <div className="tpl-badge">{getFreqString(tpl.recurringFrequency)}</div>
                    <div className="tpl-actions">
                      <button className="icon-btn danger-text" onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id, tpl.templateName); }} title="削除"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h3 className="tpl-title">{tpl.templateName}</h3>
                  <div className="tpl-amount">¥{tpl.amount.toLocaleString()}</div>
                  
                  <div className="tpl-meta">
                    <Calendar size={14} />
                    次回生成日: <strong>{tpl.nextGenerationDate}</strong>
                  </div>

                  <div className="tpl-footer" style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={`status-toggle-btn ${active ? 'active' : 'paused'}`}
                      onClick={(e) => { e.stopPropagation(); toggleStatus(tpl.id, tpl.templateStatus); }}
                      style={{ flex: 1 }}
                    >
                      {active ? <Pause size={16} /> : <Play size={16} />}
                      {active ? '一時停止する' : '再開する'}
                    </button>
                    {active && (
                      <button 
                        className="status-toggle-btn"
                        style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                        onClick={(e) => handleGenerateManual(e, tpl.id, tpl.templateName)}
                        title="バッチが失敗した時などの保険用（手動で生成して日付を進めます）"
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
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>テンプレート詳細</h2>
              <button className="icon-btn" onClick={() => setSelectedTemplate(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>テンプレート名:</strong> {selectedTemplate.templateName}</div>
              <div><strong>ユーザー:</strong> {selectedTemplate.user?.name || '不明'}</div>
              <div><strong>頻度:</strong> {getFreqString(selectedTemplate.recurringFrequency)}</div>
              <div><strong>次回生成日:</strong> {selectedTemplate.nextGenerationDate}</div>
              <div><strong>区分:</strong> {selectedTemplate.expenseType === 0 ? '立替払い' : '事前出金'}</div>
              <div><strong>領収書タイプ:</strong> {selectedTemplate.receiptType === 0 ? '実店舗(紙)' : 'Web購入(PDF等)'}</div>
              <div><strong>品目名:</strong> {selectedTemplate.itemName}</div>
              <div><strong>金額:</strong> ¥{selectedTemplate.amount.toLocaleString()} {selectedTemplate.isAmountVariable ? '(変動あり)' : ''}</div>
              <div><strong>カテゴリ:</strong> {CATEGORY_MAP[selectedTemplate.category] || selectedTemplate.category}</div>
              <div><strong>支払先:</strong> {selectedTemplate.payee}</div>
              {selectedTemplate.purchaseUrl && (
                <div><strong>購入先URL:</strong> <a href={selectedTemplate.purchaseUrl} target="_blank" rel="noopener noreferrer">{selectedTemplate.purchaseUrl}</a></div>
              )}
              {selectedTemplate.description && (
                <div><strong>備考:</strong> <br/><span style={{ whiteSpace: 'pre-wrap' }}>{selectedTemplate.description}</span></div>
              )}
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '10px' }}>
              <button className="primary-btn" onClick={() => {
                setModalMode('edit');
                setNewTemplate({ ...selectedTemplate });
                setSelectedTemplate(null);
                setShowAddModal(true);
              }}>編集する</button>
              <button className="secondary-btn" onClick={() => setSelectedTemplate(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート作成・編集モーダル */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? '新規テンプレート作成' : 'テンプレート編集'}</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {submitError && (
                <div className="p-3 bg-red-100 text-red-700 rounded-md">
                  {submitError}
                </div>
              )}
              
              <div className="form-group">
                <label>対象ユーザー</label>
                <select 
                  className="form-input"
                  value={newTemplate.userId}
                  onChange={(e) => setNewTemplate({...newTemplate, userId: e.target.value})}
                  required
                >
                  <option value="">選択してください</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* テンプレート名 (申請タイトル兼用) */}
              <div className="form-group">
                <label>テンプレート名 (兼 申請タイトル)</label>
                <input 
                  type="text" className="form-input" required
                  value={newTemplate.templateName}
                  onChange={(e) => setNewTemplate({...newTemplate, templateName: e.target.value})}
                  placeholder="例: {年月} AWS利用料"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>頻度</label>
                  <select 
                    className="form-input"
                    value={newTemplate.recurringFrequency}
                    onChange={(e) => setNewTemplate({...newTemplate, recurringFrequency: parseInt(e.target.value)})}
                  >
                    <option value={0}>毎月</option>
                    <option value={1}>毎年</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>次回生成日</label>
                  <input 
                    type="date" className="form-input" required
                    value={newTemplate.nextGenerationDate}
                    onChange={(e) => setNewTemplate({...newTemplate, nextGenerationDate: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>区分</label>
                  <select 
                    className="form-input"
                    value={newTemplate.expenseType}
                    onChange={(e) => setNewTemplate({...newTemplate, expenseType: parseInt(e.target.value)})}
                  >
                    <option value={0}>立替払い</option>
                    <option value={1}>事前出金</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>領収書タイプ</label>
                  <select 
                    className="form-input"
                    value={newTemplate.receiptType}
                    onChange={(e) => setNewTemplate({...newTemplate, receiptType: parseInt(e.target.value)})}
                  >
                    <option value={1}>Web購入(PDF等)</option>
                    <option value={0}>実店舗(紙)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>品目名</label>
                <input 
                  type="text" className="form-input" required
                  value={newTemplate.itemName}
                  onChange={(e) => setNewTemplate({...newTemplate, itemName: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>金額（予定）</label>
                  <input 
                    type="number" className="form-input" required min="1"
                    value={newTemplate.amount}
                    onChange={(e) => setNewTemplate({...newTemplate, amount: e.target.value === '' ? '' : Number(e.target.value)})}
                  />
                </div>
                <div className="form-group" style={{ paddingBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={newTemplate.isAmountVariable}
                      onChange={(e) => setNewTemplate({...newTemplate, isAmountVariable: e.target.checked})}
                    />
                    為替等で金額が変動する
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>支払先</label>
                  <input 
                    type="text" className="form-input" required
                    value={newTemplate.payee}
                    onChange={(e) => setNewTemplate({...newTemplate, payee: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>カテゴリ</label>
                  <select 
                    className="form-input" required
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                  >
                    <option value="">選択してください</option>
                    <option value="SERVER">サーバー・インフラ代</option>
                    <option value="EQUIPMENT">備品購入</option>
                    <option value="EVENT">イベント・大会費用</option>
                    <option value="BOOKS">書籍・技術書</option>
                    <option value="OTHER">その他</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>購入先URL{newTemplate.receiptType === 1 ? ' (必須)' : '（任意）'}</label>
                <input 
                  type="url" className="form-input"
                  required={newTemplate.receiptType === 1}
                  value={newTemplate.purchaseUrl}
                  onChange={(e) => setNewTemplate({...newTemplate, purchaseUrl: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>備考・詳細（任意）</label>
                <textarea 
                  className="form-input" rows="2"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                ></textarea>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>
                  キャンセル
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? '保存中...' : (modalMode === 'add' ? '作成する' : '更新する')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecurringPayments;
