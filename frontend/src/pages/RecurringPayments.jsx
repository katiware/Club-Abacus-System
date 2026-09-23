import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Trash2, Play, Pause, Settings, Calendar } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './RecurringPayments.css';

function RecurringPayments() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/RecurringExpense');
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to fetch recurring templates', err);
      setError('テンプレートの取得に失敗しました。管理者権限が必要です。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    // 0: Active, 1: Inactive
    const newStatus = currentStatus === 0 || currentStatus === 'Active' ? 1 : 0;
    try {
      await api.put(`/RecurringExpense/${id}`, {
        templateStatus: newStatus
      });
      await fetchTemplates();
    } catch (err) {
      console.error('Failed to toggle status', err);
      alert('ステータスの変更に失敗しました。');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`${name} の定期支払いテンプレートを削除しますか？`)) {
      try {
        await api.delete(`/RecurringExpense/${id}`);
        await fetchTemplates();
      } catch (err) {
        console.error('Failed to delete template', err);
        alert('テンプレートの削除に失敗しました。');
      }
    }
  };

  const handleGenerateManual = async (id, name) => {
    if (window.confirm(`${name} の申請を手動で臨時生成しますか？\n（下書きとして生成され、次回生成日も1周期進みます）`)) {
      try {
        const res = await api.post(`/RecurringExpense/${id}/generate`);
        alert('手動生成に成功しました。生成された申請の詳細画面へ移動します。');
        navigate(`/application/${res.data.expenseRequestId}`);
      } catch (err) {
        console.error('Failed to generate manual', err);
        alert(err.response?.data || '生成に失敗しました。');
      }
    }
  };

  const getFreqString = (freq) => freq === 'Monthly' || freq === 0 ? '毎月' : '毎年';
  const isActive = (status) => status === 'Active' || status === 0;

  return (
    <div className="recurring-payments-container fade-in">
      <PageHeader title="定期支払い管理" backTo="/top">
        <button className="primary-btn" onClick={() => alert('新規作成UIは未実装です')}>
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
                <div key={tpl.id} className={`template-card ${!active ? 'inactive' : ''}`}>
                  <div className="tpl-header">
                    <div className="tpl-badge">{getFreqString(tpl.recurringFrequency)}</div>
                    <div className="tpl-actions">
                      <button className="icon-btn danger-text" onClick={() => handleDelete(tpl.id, tpl.templateName)} title="削除"><Trash2 size={16} /></button>
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
                      onClick={() => toggleStatus(tpl.id, tpl.templateStatus)}
                      style={{ flex: 1 }}
                    >
                      {active ? <Pause size={16} /> : <Play size={16} />}
                      {active ? '一時停止する' : '再開する'}
                    </button>
                    {active && (
                      <button 
                        className="status-toggle-btn"
                        style={{ flex: 1, backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
                        onClick={() => handleGenerateManual(tpl.id, tpl.templateName)}
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
    </div>
  );
}

export default RecurringPayments;
