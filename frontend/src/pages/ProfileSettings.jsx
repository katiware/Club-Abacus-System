import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, MessageSquare, Save } from 'lucide-react';
import './ProfileSettings.css';

function ProfileSettings() {
  const navigate = useNavigate();

  // Mock user data
  const [discordId, setDiscordId] = useState('taro_yamada#1234');
  const user = {
    name: '山田 太郎',
    email: 'taro.yamada@example.com',
    role: 'ADMIN'
  };

  const handleSave = () => {
    alert("プロフィール設定を保存しました。");
  };

  return (
    <div className="profile-settings-container fade-in">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          戻る
        </button>
        <h1>プロフィール設定</h1>
      </header>

      <main className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="avatar-circle">
              <User size={40} />
            </div>
            <div className="avatar-info">
              <h2>{user.name}</h2>
              <span className="role-tag">{user.role === 'ADMIN' ? '管理者' : '一般部員'}</span>
            </div>
          </div>

          <div className="profile-form">
            <div className="form-group readonly">
              <label><Mail size={16} /> メールアドレス (Google認証)</label>
              <input type="text" value={user.email} readOnly className="form-input bg-gray" />
            </div>

            <div className="form-group">
              <label><MessageSquare size={16} /> Discord ID</label>
              <input 
                type="text" 
                value={discordId} 
                onChange={(e) => setDiscordId(e.target.value)} 
                className="form-input" 
                placeholder="例: username#1234"
              />
              <p className="help-text">システムの通知を個別に受け取るために、Discord IDを登録してください。</p>
            </div>

            <div className="form-actions">
              <button className="primary-btn" onClick={handleSave}>
                <Save size={18} />
                保存する
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfileSettings;
