import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Settings, Play, Pause, Trash2 } from 'lucide-react';
import './RecurringPayments.css';

function RecurringPayments() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState([
    { id: 'TPL-001', name: 'AWSサーバー代', amount: 12500, frequency: '毎月', nextDate: '2026-09-01', active: true },
    { id: 'TPL-002', name: '部室インターネット回線', amount: 5500, frequency: '毎月', nextDate: '2026-09-01', active: true },
    { id: 'TPL-003', name: 'ドメイン更新料 (example.com)', amount: 1500, frequency: '毎年', nextDate: '2027-04-01', active: false },
  ]);

  const toggleStatus = (id) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, active: !t.active } : t));
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`${name} の定期支払いテンプレートを削除しますか？`)) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  return (
    <div className="recurring-payments-container fade-in">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          戻る
        </button>
        <h1>定期支払い管理</h1>
        <div className="header-spacer"></div>
        <button className="primary-btn">
          <Plus size={18} />
          新規テンプレート
        </button>
      </header>

      <main className="page-content bg-transparent p-0 shadow-none">
        <div className="template-grid">
          {templates.map(tpl => (
            <div key={tpl.id} className={`template-card ${!tpl.active ? 'inactive' : ''}`}>
              <div className="tpl-header">
                <div className="tpl-badge">{tpl.frequency}</div>
                <div className="tpl-actions">
                  <button className="icon-btn" title="編集"><Settings size={16} /></button>
                  <button className="icon-btn danger-text" onClick={() => handleDelete(tpl.id, tpl.name)} title="削除"><Trash2 size={16} /></button>
                </div>
              </div>
              <h3 className="tpl-title">{tpl.name}</h3>
              <div className="tpl-amount">¥{tpl.amount.toLocaleString()}</div>
              
              <div className="tpl-meta">
                <Calendar size={14} />
                次回生成日: <strong>{tpl.nextDate}</strong>
              </div>

              <div className="tpl-footer">
                <button 
                  className={`status-toggle-btn ${tpl.active ? 'active' : 'paused'}`}
                  onClick={() => toggleStatus(tpl.id)}
                >
                  {tpl.active ? <Pause size={16} /> : <Play size={16} />}
                  {tpl.active ? '一時停止する' : '再開する'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default RecurringPayments;
