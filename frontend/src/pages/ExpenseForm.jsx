import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FileText, ArrowLeft, UploadCloud, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import './ExpenseForm.css';

const CATEGORY_MAP = {
  'SERVER': 'サーバー・インフラ代',
  'EQUIPMENT': '備品購入',
  'EVENT': 'イベント・大会費用',
  'BOOKS': '書籍・技術書',
  'OTHER': 'その他'
};

function ExpenseForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    expenseType: 'PAY_OUT_OF_POCKET', // 'PAY_OUT_OF_POCKET' (立替払い) | 'ADVANCE_PAYMENT' (事前出金)
    purchaseMethod: 'WEB', // 'WEB' (Web購入) | 'STORE' (実店舗購入) | 'AMAZON' (Amazon購入)
    reminderFrequency: '7',
  });
  const [expenseItems, setExpenseItems] = useState([
    { title: '', amount: '', category: '', purchaseUrl: '', details: '', remarks: '', isProductUndecided: false }
  ]);
  const [file, setFile] = useState(null);
  const [amazonInvoice, setAmazonInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const totalAmount = expenseItems.reduce((sum, item) => sum + (parseInt(item.amount, 10) || 0), 0);
  const isHighAmount = totalAmount >= 50000;
  const requiresFileUpload = formData.expenseType === 'ADVANCE_PAYMENT';
  const showFileUpload = true; // 実店舗購入も含め、すべての購入方法で証憑提出画面を表示する

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleItemChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    setExpenseItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [name]: type === 'checkbox' ? checked : value };
      return newItems;
    });
  };

  const addItem = () => {
    setExpenseItems((prev) => [
      ...prev,
      { title: '', amount: '', category: '', purchaseUrl: '', details: '', remarks: '', isProductUndecided: false }
    ]);
  };

  const removeItem = (index) => {
    if (expenseItems.length > 1) {
      setExpenseItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    for (let i = 0; i < expenseItems.length; i++) {
      const item = expenseItems[i];
      if (!item.title || item.title.trim() === '') {
        setError(`${i + 1}件目の用途・品目名を入力してください。`);
        return;
      }
      if (item.title.length > 255) {
        setError(`${i + 1}件目の用途・品目名は255文字以内で入力してください。`);
        return;
      }
      if ((formData.purchaseMethod === 'WEB' || formData.purchaseMethod === 'AMAZON') && !item.isProductUndecided && !item.purchaseUrl) {
        setError(`${i + 1}件目がWeb購入またはAmazon購入の場合は、購入元URLを入力してください。（未定の場合はチェックを入れてください）`);
        return;
      }

      const parsedAmount = parseInt(item.amount, 10);
      if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 2000000000) {
        setError(`${i + 1}件目に有効な金額（1〜2,000,000,000円）を入力してください。`);
        return;
      }

      if (!item.category) {
        setError(`${i + 1}件目の使途カテゴリを選択してください。`);
        return;
      }
    }

    if (requiresFileUpload && !file) {
      setError('事前出金の場合は、見積書等のファイルのアップロードが必須です。');
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`証憑ファイル (${file.name}) のサイズが10MBを超えています。`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        setError(`証憑ファイル (${file.name}) はJPG/PNG/WEBP/PDFのみ対応しています。`);
        return;
      }
    }

    if (formData.purchaseMethod === 'AMAZON' && amazonInvoice) {
      if (amazonInvoice.size > MAX_FILE_SIZE) {
        setError(`適格請求書ファイル (${amazonInvoice.name}) のサイズが10MBを超えています。`);
        return;
      }
      if (!allowedTypes.includes(amazonInvoice.type)) {
        setError(`適格請求書ファイル (${amazonInvoice.name}) はJPG/PNG/WEBP/PDFのみ対応しています。`);
        return;
      }
    }

    if (!formData.title || formData.title.trim() === '') {
      setError('申請タイトルを入力してください。');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);
    setShowConfirmModal(false);
    try {
      const expenseType = formData.expenseType === 'ADVANCE_PAYMENT' ? 'Advance' : 'Reimbursement';
      const receiptType = formData.purchaseMethod === 'STORE' ? 'Paper' : 'Digital';

      const requestPayload = {
        title: formData.title,
        type: expenseType,
        receiptType: receiptType,
        expenseItems: expenseItems.map(item => ({
          itemName: item.title,
          unitPrice: parseInt(item.amount, 10),
          quantity: 1,
          payee: formData.purchaseMethod === 'AMAZON' ? 'Amazon' : '未指定',
          category: item.category,
          description: [item.details, item.remarks].filter(Boolean).join('\n') || null,
          purchaseUrl: (formData.purchaseMethod === 'WEB' || formData.purchaseMethod === 'AMAZON') && !item.isProductUndecided ? item.purchaseUrl : null,
          isProductUndecided: item.isProductUndecided || false
        }))
      };

      // 1. 経費申請の作成
      const response = await api.post('/Expense', requestPayload);
      const createdRequest = response.data;
      const requestId = createdRequest.id;

      // 2. 証憑ファイルがある場合のみアップロード
      if (file) {
        const fileFormData = new FormData();
        fileFormData.append('file', file);
        const docType = formData.expenseType === 'ADVANCE_PAYMENT' ? 'Quotation' : 'Receipt';
        fileFormData.append('documentType', docType);

        await api.post(`/expenses/${requestId}/documents`, fileFormData);
      }

      // Amazon購入で適格請求書がある場合のみ追加アップロード
      if (formData.purchaseMethod === 'AMAZON' && amazonInvoice) {
        const invoiceFormData = new FormData();
        invoiceFormData.append('file', amazonInvoice);
        invoiceFormData.append('documentType', 'Invoice');

        await api.post(`/expenses/${requestId}/documents`, invoiceFormData);
      }

      // 3. 申請を提出（PendingApprovalへ進める）
      await api.post(`/Expense/${requestId}/submit`);

      navigate('/top');
    } catch (err) {
      console.error(err);
      let errorMsg = '申請の送信に失敗しました。';
      if (err.response?.data?.errors) {
        const validationErrors = Object.values(err.response.data.errors).flat();
        errorMsg = validationErrors.join('\n');
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (typeof err.response?.data === 'string' && err.response.data.trim() !== '') {
        errorMsg = err.response.data;
      } else {
        errorMsg = '申請の送信に失敗しました。詳細: ' + JSON.stringify(err.response?.data || err.message);
      }
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="expense-container">
      <PageHeader title="新規経費申請" backTo="/top" />

      <main className="expense-content">
        <form className="expense-form" onSubmit={handleSubmit}>
          {error && <div className="error-alert">{error}</div>}

          {isHighAmount && (
            <div className="warning-alert">
              <AlertTriangle size={20} />
              <span>5万円以上の申請（合計）です。事前の備品購入申請書の提出が別途必要になります。</span>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>申請タイトル <span className="badge-required">必須</span></label>
            <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="例: 8月分サーバー代および備品購入" className="input-field" style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ced4da', boxSizing: 'border-box' }} />
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>申請タイプ</label>
              <div className="radio-group">
                <label className={`radio-label ${formData.expenseType === 'PAY_OUT_OF_POCKET' ? 'selected' : ''}`}>
                  <input type="radio" name="expenseType" value="PAY_OUT_OF_POCKET" checked={formData.expenseType === 'PAY_OUT_OF_POCKET'} onChange={handleInputChange} />
                  立替払い
                </label>
                <label className={`radio-label ${formData.expenseType === 'ADVANCE_PAYMENT' ? 'selected' : ''}`}>
                  <input type="radio" name="expenseType" value="ADVANCE_PAYMENT" checked={formData.expenseType === 'ADVANCE_PAYMENT'} onChange={handleInputChange} />
                  事前出金
                </label>
              </div>
            </div>

            <div className="form-group half">
              <label>購入方法</label>
              <div className="radio-group">
                <label className={`radio-label ${formData.purchaseMethod === 'WEB' ? 'selected' : ''}`}>
                  <input type="radio" name="purchaseMethod" value="WEB" checked={formData.purchaseMethod === 'WEB'} onChange={handleInputChange} />
                  Web購入
                </label>
                <label className={`radio-label ${formData.purchaseMethod === 'STORE' ? 'selected' : ''}`}>
                  <input type="radio" name="purchaseMethod" value="STORE" checked={formData.purchaseMethod === 'STORE'} onChange={handleInputChange} />
                  実店舗購入
                </label>
                <label className={`radio-label ${formData.purchaseMethod === 'AMAZON' ? 'selected' : ''}`}>
                  <input type="radio" name="purchaseMethod" value="AMAZON" checked={formData.purchaseMethod === 'AMAZON'} onChange={handleInputChange} />
                  Amazon購入
                </label>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reminderFrequency">証憑提出リマインド頻度</label>
            <select id="reminderFrequency" name="reminderFrequency" value={formData.reminderFrequency} onChange={handleInputChange} className="custom-select">
              <option value="3">3日ごと</option>
              <option value="7">7日ごと (デフォルト)</option>
              <option value="14">14日ごと</option>
              <option value="0">通知しない</option>
            </select>
          </div>

          <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #eee' }} />
          <h3>明細</h3>

          {expenseItems.map((item, index) => (
            <div key={index} className="expense-item-card fade-in" style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px', position: 'relative', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, color: '#4b5563' }}>明細 {index + 1}</h4>
                {expenseItems.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={16} />
                    削除
                  </button>
                )}
              </div>

              <div className="form-group">
                <label>用途・品目名 <span className="badge-required">必須</span></label>
                <input type="text" name="title" value={item.title} onChange={(e) => handleItemChange(index, e)} required placeholder="例: AWS利用料 (2026年8月分)" />
              </div>

              <div className="form-group">
                <label>金額 (円) <span className="badge-required">必須</span></label>
                <input type="number" name="amount" value={item.amount} onChange={(e) => handleItemChange(index, e)} required min="1" placeholder="0" />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>使途カテゴリ <span className="badge-required">必須</span></label>
                  <select name="category" value={item.category} onChange={(e) => handleItemChange(index, e)} required className="custom-select">
                    <option value="">選択してください</option>
                    <option value="SERVER">サーバー・インフラ代</option>
                    <option value="EQUIPMENT">備品購入</option>
                    <option value="EVENT">イベント・大会費用</option>
                    <option value="BOOKS">書籍・技術書</option>
                    <option value="OTHER">その他</option>
                  </select>
                </div>
              </div>

              {(formData.purchaseMethod === 'WEB' || formData.purchaseMethod === 'AMAZON') && (
                <>
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal', cursor: 'pointer', color: '#4b5563' }}>
                      <input type="checkbox" name="isProductUndecided" checked={item.isProductUndecided || false} onChange={(e) => handleItemChange(index, e)} style={{ marginRight: '8px', width: '16px', height: '16px' }} />
                      具体的な商品は未定（Discordで相談する）
                    </label>
                  </div>
                  {!item.isProductUndecided && (
                    <div className="form-group">
                      <label>購入元URL <span className="badge-required">必須</span></label>
                      <input type="url" name="purchaseUrl" value={item.purchaseUrl} onChange={(e) => handleItemChange(index, e)} placeholder="https://www.amazon.co.jp/..." required className="input-field" />
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label>用途詳細</label>
                <textarea name="details" value={item.details} onChange={(e) => handleItemChange(index, e)} placeholder="購入理由や詳細な説明を入力してください" rows="3"></textarea>
              </div>

              <div className="form-group">
                <label>備考欄</label>
                <textarea name="remarks" value={item.remarks} onChange={(e) => handleItemChange(index, e)} placeholder="特記事項があれば入力してください" rows="2"></textarea>
              </div>
            </div>
          ))}

          <button type="button" onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', marginBottom: '30px' }}>
            <Plus size={18} />
            明細を追加する
          </button>


          {showFileUpload && (
            <div className={`file-upload-section ${requiresFileUpload ? 'required' : ''}`}>
              <label>
                {formData.expenseType === 'ADVANCE_PAYMENT' ? '見積書または請求書ファイル' : '領収書ファイル'}
                {requiresFileUpload ? <span className="badge-required">必須</span> : <span className="badge-optional" style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>任意 (後から提出可能)</span>}
              </label>
              {!requiresFileUpload && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                  ※立替払いで既に購入済み（事後申請）の場合のみ添付してください。購入前の方は空のままで進み、後日マイページから提出してください。
                </div>
              )}
              <div className="file-drop-area">
                <UploadCloud size={32} className="upload-icon" />
                <p>クリックしてファイルを選択するか、ドラッグ＆ドロップしてください</p>
                <input type="file" className="file-input" onChange={handleFileChange} accept=".pdf,image/*" />
                {file && (
                  <div className="file-name">
                    <FileText size={16} />
                    {file.name}
                  </div>
                )}
              </div>

              {formData.purchaseMethod === 'AMAZON' && (
                <div style={{ marginTop: '20px' }}>
                  <label>
                    適格請求書ファイル (Amazon)
                    <span className="badge-optional" style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>任意 (後から提出可能)</span>
                  </label>
                  <div className="file-drop-area">
                    <UploadCloud size={32} className="upload-icon" />
                    <p>クリックしてファイルを選択するか、ドラッグ＆ドロップしてください</p>
                    <input type="file" className="file-input" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAmazonInvoice(e.target.files[0]);
                      }
                    }} accept=".pdf,image/*" />
                    {amazonInvoice && (
                      <div className="file-name">
                        <FileText size={16} />
                        {amazonInvoice.name}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              確認画面へ
            </button>
          </div>
        </form>
      </main>

      {showConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <h2>申請内容の確認</h2>
            <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <p><strong>タイトル:</strong> {formData.title}</p>
              <p><strong>合計金額:</strong> ¥{totalAmount.toLocaleString()}</p>
              <p><strong>申請タイプ:</strong> {formData.expenseType === 'ADVANCE_PAYMENT' ? '事前出金' : '立替払い'}</p>
              <h4 style={{ marginTop: '16px', marginBottom: '8px', fontSize: '14px', color: '#4b5563' }}>明細</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {expenseItems.map((item, idx) => (
                  <li key={idx} style={{ padding: '8px 0', borderBottom: idx < expenseItems.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{idx + 1}. {item.title}</span>
                      <span>¥{parseInt(item.amount, 10).toLocaleString()}</span>
                    </div>
                    {item.category && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>カテゴリ: {CATEGORY_MAP[item.category] || item.category}</div>}
                  </li>
                ))}
              </ul>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting} style={{ padding: '12px 24px', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>
                修正する
              </button>
              <button type="button" className="submit-button" onClick={handleConfirmedSubmit} disabled={isSubmitting} style={{ padding: '12px 24px', margin: 0 }}>
                {isSubmitting ? '送信中...' : '確定して送信'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpenseForm;
