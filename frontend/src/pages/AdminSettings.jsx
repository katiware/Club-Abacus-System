import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save, Bell, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import './AdminSettings.css';

function AdminSettings() {
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState('https://discord.com/api/webhooks/...');
  const [notifyOnNew, setNotifyOnNew] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);

  const handleSaveSettings = () => {
    alert("設定を保存しました。");
  };

  return (
    <div className="admin-settings-container fade-in">
      <PageHeader title="管理者設定" backTo="/top">
        <button className="primary-btn" onClick={handleSaveSettings}>
          <Save size={18} />
          設定を保存
        </button>
      </PageHeader>

      <main className="settings-grid">
        {/* System Settings Card */}
        <section className="settings-card">
          <div className="card-header">
            <div className="icon-wrapper bg-blue-100">
              <Bell size={20} className="text-blue-600" />
            </div>
            <h2>通知・システム設定</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Discord Webhook URL</label>
              <input 
                type="password" 
                className="form-input" 
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="help-text">システムの各種通知を送信するDiscordチャンネルのWebhook URLです。</p>
            </div>
            
            <div className="toggle-group">
              <label className="toggle-label">
                <input type="checkbox" checked={notifyOnNew} onChange={() => setNotifyOnNew(!notifyOnNew)} />
                <span className="toggle-text">新規申請時に通知する</span>
              </label>
              <label className="toggle-label">
                <input type="checkbox" checked={notifyOnComplete} onChange={() => setNotifyOnComplete(!notifyOnComplete)} />
                <span className="toggle-text">精算完了時に通知する</span>
              </label>
            </div>

            <button className="primary-btn mt-4" onClick={handleSaveSettings}>
              <Save size={18} />
              設定を保存する
            </button>
          </div>
        </section>

      </main>
    </div>
  );
}

export default AdminSettings;
