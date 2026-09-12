import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Save, Lock, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './FiscalYearSettings.css';

function FiscalYearSettings() {
  const navigate = useNavigate();
  const [fiscalYears, setFiscalYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    yearName: '',
    startDate: '',
    endDate: '',
    totalBudget: ''
  });

  const fetchFiscalYears = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/FiscalYear');
      setFiscalYears(response.data);
    } catch (err) {
      console.error('Failed to fetch fiscal years', err);
      setError('年度情報の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiscalYears();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/FiscalYear', {
        yearName: formData.yearName,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalBudget: parseInt(formData.totalBudget, 10)
      });
      alert('年度を新しく登録しました。');
      setFormData({ yearName: '', startDate: '', endDate: '', totalBudget: '' });
      await fetchFiscalYears();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data || '登録に失敗しました。';
      alert(`エラー: ${errMsg}`);
    }
  };

  const handleClose = async (id, name) => {
    if (window.confirm(`${name} を締め処理しますか？この操作は取り消せません。`)) {
      try {
        await api.post(`/FiscalYear/${id}/close`);
        alert('年度を締めました。');
        await fetchFiscalYears();
      } catch (err) {
        console.error(err);
        alert('締め処理に失敗しました。');
      }
    }
  };

  return (
    <div className="fiscal-year-settings-container fade-in">
      <PageHeader title="年度・予算管理" backTo="/top" />

      <main className="fiscal-year-content">
        {error && <div className="p-4 bg-white rounded shadow text-red-500 mb-4">{error}</div>}

        <section className="settings-card">
          <div className="card-header">
            <div className="icon-wrapper bg-blue-100">
              <Plus size={20} className="text-blue-600" />
            </div>
            <h2>新規年度の登録</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>年度名</label>
                  <input 
                    type="text" 
                    name="yearName"
                    required
                    placeholder="例: 2026年度" 
                    className="form-input" 
                    value={formData.yearName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>開始日</label>
                  <input 
                    type="date" 
                    name="startDate"
                    required
                    className="form-input" 
                    value={formData.startDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>終了日</label>
                  <input 
                    type="date" 
                    name="endDate"
                    required
                    className="form-input" 
                    value={formData.endDate}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label>今年度予算総額（円）</label>
                  <input 
                    type="number" 
                    name="totalBudget"
                    required
                    min="0"
                    placeholder="例: 200000" 
                    className="form-input" 
                    value={formData.totalBudget}
                    onChange={handleInputChange}
                  />
                  <p className="help-text">ここで登録した予算額は、ダッシュボードでの予算残高計算に使用されます。</p>
                </div>
              </div>
              <button type="submit" className="primary-btn">
                <Save size={18} />
                登録する
              </button>
            </form>
          </div>
        </section>

        <section className="settings-card">
          <div className="card-header">
            <div className="icon-wrapper bg-green-100">
              <Calendar size={20} className="text-green-600" />
            </div>
            <h2>登録済み年度一覧</h2>
          </div>
          <div className="card-body">
            {isLoading ? (
              <p className="text-gray-500">読み込み中...</p>
            ) : fiscalYears.length === 0 ? (
              <p className="text-gray-500">登録されている年度がありません。</p>
            ) : (
              <div className="year-list">
                {fiscalYears.map(fy => (
                  <div key={fy.id} className={`year-card ${fy.isClosed ? 'closed' : ''}`}>
                    <div className="year-info">
                      <h3>
                        {fy.yearName}
                        <span className={`badge-status ${fy.isClosed ? 'closed' : 'active'}`}>
                          {fy.isClosed ? '締め済' : '進行中'}
                        </span>
                      </h3>
                      <div className="year-meta">
                        <span>期間: {fy.startDate} 〜 {fy.endDate}</span>
                        <span>予算総額: ¥{fy.totalBudget.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="year-actions">
                      {!fy.isClosed && (
                        <button 
                          className="secondary-btn" 
                          style={{ color: '#e53e3e', borderColor: '#e53e3e' }}
                          onClick={() => handleClose(fy.id, fy.yearName)}
                        >
                          <Lock size={16} />
                          年度を締める
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default FiscalYearSettings;
