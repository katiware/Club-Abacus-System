import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Save, Bell, AlertTriangle } from 'lucide-react';
import './AdminSettings.css';

function AdminSettings() {
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState('https://discord.com/api/webhooks/...');
  const [notifyOnNew, setNotifyOnNew] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);

  const handleYearReset = () => {
    const input = window.prompt("【危険な操作】\n本当に今年度のデータをリセットして新年度を開始しますか？\nこの操作は取り消せません。\n\n実行する場合は「リセット」と入力してください。");
    if (input === "リセット") {
      alert("新年度の準備が完了しました。");
    } else if (input !== null) {
      alert("入力内容が一致しませんでした。操作をキャンセルします。");
    }
  };

  const handleSaveSettings = () => {
    alert("設定を保存しました。");
  };

  return (
    <div className="admin-settings-container fade-in">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          戻る
        </button>
        <h1>管理者設定</h1>
      </header>

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

        {/* Danger Zone Card */}
        <section className="settings-card danger-zone">
          <div className="card-header">
            <div className="icon-wrapper bg-red-100">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="text-red-600">危険な操作 (Danger Zone)</h2>
          </div>
          <div className="card-body border-t border-red-100">
            <div className="danger-action">
              <div className="danger-info">
                <h3>年度リセット処理</h3>
                <p>現在の全ての申請データをアーカイブ状態にし、残高を0にして新しい年度（4月始まり）を開始します。</p>
              </div>
              <button className="danger-btn" onClick={handleYearReset}>
                <RefreshCw size={18} />
                年度をリセットする
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminSettings;
