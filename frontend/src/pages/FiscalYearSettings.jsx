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
      let errMsg = '登録に失敗しました。';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.message) {
          errMsg = err.response.data.message;
        } else if (err.response.data.errors) {
          // ASP.NET Core Validation errors
          errMsg = Object.values(err.response.data.errors).flat().join('\n');
        } else {
          errMsg = JSON.stringify(err.response.data);
        }
      }
      alert(`エラー:\n${errMsg}`);
    }
  };

  const handleClose = async (id, name) => {
    if (window.confirm(`${name} を締め処理しますか？この操作は取り消せません。`)) {
      try {
        await api.post(`/FiscalYear/${id}/close`);
        alert('年度を締めました。');
        await fetchFiscalYears();
      } catch (err) {
        if (err.response && err.response.status === 409) {
          const forceConfirm = window.confirm(err.response.data.message);
          if (forceConfirm) {
            try {
              await api.post(`/FiscalYear/${id}/close?force=true`);
              alert('締め処理が完了し、未完了の申請は却下されました。');
              await fetchFiscalYears();
            } catch (forceErr) {
              alert(`エラー: ${forceErr.response?.data?.message || forceErr.response?.data || '締め処理に失敗しました'}`);
            }
          }
        } else {
          alert(`エラー: ${err.response?.data?.message || err.response?.data || '締め処理に失敗しました'}`);
        }
      }
    }
  };

  const handleToggleApplications = async (id) => {
    try {
      await api.post(`/FiscalYear/${id}/toggle-applications`);
      fetchFiscalYears();
    } catch (err) {
      alert(`エラー: ${err.response?.data || '変更に失敗しました'}`);
    }
  };

  const handleSendAlerts = async (id) => {
    if (window.confirm('現在申請途中のすべての申請者および承認者に、締め切り前のアラート通知を送信しますか？')) {
      try {
        alert('【通知送信完了】\n設定されたWebhookを通じて通知が送信されました。（※現在はモック動作です）');
      } catch (err) {
        alert('エラーが発生しました。');
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
                        <span className={`badge-status ${fy.isClosed ? 'closed' : (fy.isActive ? 'active' : 'pending')}`}>
                          {fy.isClosed ? '締め済' : (fy.isActive ? '進行中' : '開始前')}
                        </span>
                      </h3>
                      <div className="year-meta">
                        <span>期間: {fy.startDate} 〜 {fy.endDate}</span>
                        <span>予算総額: ¥{fy.totalBudget.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="year-actions" style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="secondary-btn" 
                        onClick={() => navigate(`/fiscal-year-dashboard/${fy.id}`)}
                      >
                        ダッシュボードを開く
                      </button>
                      {!fy.isClosed && !fy.isActive && (
                        <button 
                          className="primary-btn" 
                          style={{ backgroundColor: '#12b886' }}
                          onClick={async () => {
                            try {
                              await api.post(`/FiscalYear/${fy.id}/start`);
                              alert('年度を開始しました。');
                              await fetchFiscalYears();
                            } catch (err) {
                              alert(`エラー: ${err.response?.data || '開始に失敗しました'}`);
                            }
                          }}
                        >
                          年度を開始する
                        </button>
                      )}
                      {!fy.isClosed && fy.isActive && (
                        <>
                          <button 
                            className="secondary-btn" 
                            style={{ color: '#4c6ef5', borderColor: '#4c6ef5' }}
                            onClick={() => handleSendAlerts(fy.id)}
                          >
                            締め前アラート送信
                          </button>
                          <button 
                            className="secondary-btn" 
                            style={{ color: fy.isApplicationsStopped ? '#12b886' : '#f59f00', borderColor: fy.isApplicationsStopped ? '#12b886' : '#f59f00' }}
                            onClick={() => handleToggleApplications(fy.id)}
                          >
                            {fy.isApplicationsStopped ? '新規申請を再開' : '新規申請を停止'}
                          </button>
                        </>
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
