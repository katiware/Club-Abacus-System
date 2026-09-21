import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FileText, ArrowLeft, UploadCloud, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import './ExpenseForm.css';

function ExpenseForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    expenseType: 'PAY_OUT_OF_POCKET', // 'PAY_OUT_OF_POCKET' (立替払い) | 'ADVANCE_PAYMENT' (事前出金)
    purchaseMethod: 'WEB', // 'WEB' (Web購入) | 'STORE' (実店舗購入) | 'AMAZON' (Amazon購入)
    category: '',
    details: '',
    remarks: '',
    isRecurring: false,
    recurringFrequency: 'MONTHLY',
    targetMonth: '',
    recurringDay: 'END_OF_MONTH',
    reminderFrequency: '7',
  });
  const [file, setFile] = useState(null);
  const [amazonInvoice, setAmazonInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmountForCheck = parseInt(formData.amount, 10);
  const isHighAmount = !isNaN(parsedAmountForCheck) && parsedAmountForCheck >= 50000;
  const requiresFileUpload = formData.expenseType === 'ADVANCE_PAYMENT';
  const showFileUpload = true; // 実店舗購入も含め、すべての購入方法で証憑提出画面を表示する

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
    if (!formData.title || formData.title.trim() === '') {
      setError('用途・品目名を入力してください。');
      return;
    }
    if (formData.title.length > 255) {
      setError('用途・品目名は255文字以内で入力してください。');
      return;
    }

    const parsedAmount = parseInt(formData.amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || parsedAmount > 2000000000) {
      setError('有効な金額（1〜2,000,000,000円）を入力してください。');
      return;
    }

    if (requiresFileUpload && !file) {
      setError('事前出金の場合は、見積書等のファイルのアップロードが必須です。');
      return;
    }

    // Amazon購入の場合の適格請求書は、一旦任意（後から提出可能）とする
    // if (formData.purchaseMethod === 'AMAZON' && !amazonInvoice) {
    //   setError('Amazon購入の場合は、適格請求書（見積書）のアップロードも必須です。');
    //   return;
    // }

    if (!formData.category) {
      setError('使途カテゴリを選択してください。');
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

    setIsSubmitting(true);
    try {
      const expenseType = formData.expenseType === 'ADVANCE_PAYMENT' ? 'Advance' : 'Reimbursement';
      const receiptType = formData.purchaseMethod === 'STORE' ? 'Paper' : 'Digital';

      const requestPayload = {
        type: expenseType,
        receiptType: receiptType,
        expenseItems: [
          {
            itemName: formData.title,
            unitPrice: parsedAmount,
            quantity: 1,
            payee: formData.purchaseMethod === 'AMAZON' ? 'Amazon' : '未指定',
            category: formData.category,
            description: [formData.details, formData.remarks].filter(Boolean).join('\n') || null
          }
        ]
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
              <span>5万円以上の申請です。事前の備品購入申請書の提出が別途必要になります。</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">用途・品目名 <span className="badge-required">必須</span></label>
            <input type="text" id="title" name="title" value={formData.title} onChange={handleInputChange} required placeholder="例: AWS利用料 (2026年8月分)" />
          </div>

          <div className="form-group">
            <label htmlFor="amount">金額 (円) <span className="badge-required">必須</span></label>
            <input type="number" id="amount" name="amount" value={formData.amount} onChange={handleInputChange} required min="1" placeholder="0" />
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="category">使途カテゴリ <span className="badge-required">必須</span></label>
              <select id="category" name="category" value={formData.category} onChange={handleInputChange} required className="custom-select">
                <option value="">選択してください</option>
                <option value="SERVER">サーバー・インフラ代</option>
                <option value="EQUIPMENT">備品購入</option>
                <option value="EVENT">イベント・大会費用</option>
                <option value="BOOKS">書籍・技術書</option>
                <option value="OTHER">その他</option>
              </select>
            </div>
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
            <label htmlFor="details">用途詳細</label>
            <textarea id="details" name="details" value={formData.details} onChange={handleInputChange} placeholder="購入理由や詳細な説明を入力してください" rows="3"></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="remarks">備考欄</label>
            <textarea id="remarks" name="remarks" value={formData.remarks} onChange={handleInputChange} placeholder="特記事項があれば入力してください" rows="2"></textarea>
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


          {showFileUpload && (
            <div className={`file-upload-section ${requiresFileUpload ? 'required' : ''}`}>
              <label>
                {formData.expenseType === 'ADVANCE_PAYMENT' ? '見積書または請求書ファイル' : '領収書ファイル'}
                {requiresFileUpload ? <span className="badge-required">必須</span> : <span className="badge-optional" style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>任意 (後から提出可能)</span>}
              </label>
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
              {isSubmitting ? '送信中...' : '申請する'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default ExpenseForm;
