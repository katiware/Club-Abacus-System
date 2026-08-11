import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FileText, ArrowLeft, UploadCloud, AlertTriangle } from 'lucide-react';
import './ExpenseForm.css';

function ExpenseForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    expenseType: 'PAY_OUT_OF_POCKET', // 'PAY_OUT_OF_POCKET' (立替払い) | 'ADVANCE_PAYMENT' (事前出金)
    purchaseMethod: 'WEB', // 'WEB' (Web購入) | 'STORE' (実店舗購入)
    category: '',
    details: '',
    remarks: '',
    isRecurring: false,
    recurringFrequency: 'MONTHLY',
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isHighAmount = parseInt(formData.amount, 10) >= 50000;
  const requiresFileUpload = formData.expenseType === 'ADVANCE_PAYMENT' || (formData.expenseType === 'PAY_OUT_OF_POCKET' && formData.purchaseMethod === 'WEB');

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
    if (requiresFileUpload && !file) {
      setError(formData.expenseType === 'ADVANCE_PAYMENT' ? '事前出金の場合は、見積書等のファイルのアップロードが必須です。' : 'Web購入の立替払いの場合は、領収書等のファイルのアップロードが必須です。');
      return;
    }

    if (!formData.category) {
      setError('使途カテゴリを選択してください。');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('amount', formData.amount);
      submitData.append('expenseType', formData.expenseType);
      submitData.append('purchaseMethod', formData.purchaseMethod);
      submitData.append('category', formData.category);
      submitData.append('details', formData.details);
      submitData.append('remarks', formData.remarks);
      submitData.append('isRecurring', formData.isRecurring);
      if(formData.isRecurring) {
        submitData.append('recurringFrequency', formData.recurringFrequency);
      }
      if (file) {
        submitData.append('receipt', file);
      }

      // await api.post('/expenses', submitData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('申請の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="expense-container">
      <header className="expense-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          戻る
        </button>
        <h1>新規経費申請</h1>
      </header>

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

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="isRecurring" checked={formData.isRecurring} onChange={handleInputChange} />
              定期支払いとして登録する
            </label>
          </div>

          {formData.isRecurring && (
            <div className="form-group recurring-options">
              <label>支払い頻度</label>
              <div className="radio-group">
                <label className={`radio-label ${formData.recurringFrequency === 'MONTHLY' ? 'selected' : ''}`}>
                  <input type="radio" name="recurringFrequency" value="MONTHLY" checked={formData.recurringFrequency === 'MONTHLY'} onChange={handleInputChange} />
                  毎月
                </label>
                <label className={`radio-label ${formData.recurringFrequency === 'YEARLY' ? 'selected' : ''}`}>
                  <input type="radio" name="recurringFrequency" value="YEARLY" checked={formData.recurringFrequency === 'YEARLY'} onChange={handleInputChange} />
                  毎年
                </label>
              </div>
            </div>
          )}

          {requiresFileUpload && (
            <div className="file-upload-section required">
              <label>
                {formData.expenseType === 'ADVANCE_PAYMENT' ? '見積書または請求書ファイル' : '領収書ファイル'}
                <span className="badge-required">必須</span>
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
