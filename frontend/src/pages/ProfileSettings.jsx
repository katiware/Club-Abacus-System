import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Save, AlertCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './ProfileSettings.css';

function ProfileSettings() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: '',
    email: '',
    roleName: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/User/me');
        setUser({
          name: response.data.name || '',
          email: response.data.email || '',
          roleName: response.data.roleName || 'USER'
        });
      } catch (err) {
        console.error(err);
        setError('プロフィールの取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleNameChange = (e) => {
    setUser(prev => ({ ...prev, name: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/User/me', { name: user.name });
      alert("プロフィール設定を保存しました。");
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <div className="profile-settings-container fade-in">
      <PageHeader title="プロフィール設定" backTo="/top" />
      <main>
        {error && <div className="p-4 text-red-500">{error}</div>}
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="avatar-circle">
              <User size={40} />
            </div>
            <div className="avatar-info">
              <h2>{user.name}</h2>
              <span className="role-tag">{user.roleName === 'ADMIN' ? '管理者' : '一般部員'}</span>
            </div>
          </div>

          <div className="profile-form">
            <div className="form-group">
              <label><User size={16} /> 氏名</label>
              <input type="text" value={user.name} onChange={handleNameChange} className="form-input" />
            </div>
            <div className="form-group readonly">
              <label><Mail size={16} /> メールアドレス (Google認証)</label>
              <input type="text" value={user.email} readOnly className="form-input bg-gray" />
            </div>


            <div className="form-actions">
              <button className="primary-btn" onClick={handleSave} disabled={isSaving}>
                <Save size={18} />
                {isSaving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfileSettings;
