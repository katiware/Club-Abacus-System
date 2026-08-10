import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FileText, ArrowLeft, UploadCloud } from 'lucide-react';
import './ExpenseForm.css';

function ExpenseForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    expenseType: 'PAY_OUT_OF_POCKET', // 'PAY_OUT_OF_POCKET' (立替払い) | 'ADVANCE_PAYMENT' (事前出金)
    purchaseMethod: 'WEB', // 'WEB' (Web購入) | 'STORE' (実店舗購入)
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    if (formData.expenseType === 'ADVANCE_PAYMENT' && !file) {
      setError('事前出金の場合は、見積書等のファイルのアップロードが必須です。');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create FormData for multipart/form-data upload
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('amount', formData.amount);
      submitData.append('expenseType', formData.expenseType);
      submitData.append('purchaseMethod', formData.purchaseMethod);
      if (file) {
        submitData.append('receipt', file);
      }

      // Mock API call
      // await api.post('/expenses', submitData, {
      //   headers: { 'Content-Type': 'multipart/form-data' }
      // });
      
      // Simulate network delay
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

          <div className="form-group">
            <label htmlFor="title">用途・品目名</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="例: AWS利用料 (2026年8月分)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">金額 (円)</label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              required
              min="1"
              placeholder="0"
            />
          </div>

          <div className="form-row">
            <div className="form-group half">
              <label>申請タイプ</label>
              <div className="radio-group">
                <label className={`radio-label ${formData.expenseType === 'PAY_OUT_OF_POCKET' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="expenseType"
                    value="PAY_OUT_OF_POCKET"
                    checked={formData.expenseType === 'PAY_OUT_OF_POCKET'}
                    onChange={handleInputChange}
                  />
                  立替払い
                </label>
                <label className={`radio-label ${formData.expenseType === 'ADVANCE_PAYMENT' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="expenseType"
                    value="ADVANCE_PAYMENT"
                    checked={formData.expenseType === 'ADVANCE_PAYMENT'}
                    onChange={handleInputChange}
                  />
                  事前出金
                </label>
              </div>
            </div>

            <div className="form-group half">
              <label>購入方法</label>
              <div className="radio-group">
                <label className={`radio-label ${formData.purchaseMethod === 'WEB' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="purchaseMethod"
                    value="WEB"
                    checked={formData.purchaseMethod === 'WEB'}
                    onChange={handleInputChange}
                  />
                  Web購入
                </label>
                <label className={`radio-label ${formData.purchaseMethod === 'STORE' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="purchaseMethod"
                    value="STORE"
                    checked={formData.purchaseMethod === 'STORE'}
                    onChange={handleInputChange}
                  />
                  実店舗購入
                </label>
              </div>
            </div>
          </div>

          {/* Conditional File Upload for Advance Payment */}
          {formData.expenseType === 'ADVANCE_PAYMENT' && (
            <div className="file-upload-section required">
              <label>
                見積書または請求書ファイル
                <span className="badge-required">必須</span>
              </label>
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
