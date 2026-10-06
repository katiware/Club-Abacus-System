import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Shield, ShieldOff, Trash2, Check, X, AlertCircle, Edit, Upload } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './UserManagement.css';

function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // モーダル用ステート
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', roleId: '' });
  const [addError, setAddError] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editError, setEditError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/User'),
        api.get('/Role')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error(err);
      setError('データの取得に失敗しました。管理者権限があるか確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (user) => {
    setEditUser({ ...user });
    setShowEditModal(true);
    setEditError(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    try {
      await api.put(`/User/${editUser.id}`, { roleId: editUser.roleId, isActive: editUser.isActive });
      
      const role = roles.find(r => r.id === editUser.roleId);
      setUsers(users.map(u => u.id === editUser.id ? { ...u, roleId: editUser.roleId, roleName: role ? role.name : u.roleName, isActive: editUser.isActive } : u));
      
      setShowEditModal(false);
      setEditUser(null);
      alert('ユーザー情報を更新しました。');
    } catch (err) {
      console.error(err);
      setEditError(err.response?.data?.message || err.response?.data?.[0]?.description || '更新に失敗しました。');
    }
  };

  const handleDelete = async (id, name) => {
    const input = window.prompt(`【危険な操作】\n${name} のアカウントを無効化（論理削除）しようとしています。\n確認のため、削除する部員の名前（${name}）を入力してください。`);
    if (input === name) {
      try {
        await api.delete(`/User/${id}`);
        setUsers(users.map(u => u.id === id ? { ...u, isActive: false } : u));
        alert('アカウントを無効化しました。');
      } catch (err) {
        console.error(err);
        alert('削除に失敗しました。');
      }
    } else if (input !== null) {
      alert('入力された名前が一致しませんでした。操作をキャンセルします。');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddError(null);
    try {
      const response = await api.post('/User', newUser);
      setUsers([...users, response.data]);
      setShowAddModal(false);
      setNewUser({ name: '', email: '', roleId: '' });
      alert('新しい部員を追加しました！');
    } catch (err) {
      console.error(err);
      setAddError(err.response?.data?.message || err.response?.data?.[0]?.description || '追加に失敗しました。');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`${file.name} をアップロードして一括登録を実行しますか？\n(※A列:学籍番号, B列:氏名, C列:メールアドレス, D列:入学年度)`)) {
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const response = await api.post('/User/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(response.data.message);
      if (response.data.errors && response.data.errors.length > 0) {
        alert('一部の行でエラーがありました。詳細はコンソールまたはログをご確認ください。\n' + response.data.errors.slice(0, 5).join('\n') + (response.data.errors.length > 5 ? '\n...' : ''));
      }
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.response?.data || 'ファイルのアップロードに失敗しました。');
    } finally {
      setIsLoading(false);
      e.target.value = null;
    }
  };

  if (isLoading) return <div className="p-8 text-center">読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="user-management-container fade-in">
      <PageHeader title="部員管理" backTo="/top">
        <div style={{ display: 'flex', gap: '8px' }}>
          <label className="secondary-btn" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
            <Upload size={18} />
            一括追加 (Excel)
            <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          <button className="primary-btn" onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} />
            新規部員追加
          </button>
        </div>
      </PageHeader>

      <div style={{ padding: '0 24px', color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
        ※ 部員の権限変更やアカウントの有効/無効の切り替えを行うことができます。卒業生や退部者のアカウントは適宜無効化してください。
      </div>

      <main className="page-content">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>氏名</th>
                <th>メールアドレス</th>
                <th>権限</th>
                <th>ステータス</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={`table-row ${!user.isActive ? 'inactive-row' : ''}`}>
                  <td className="font-medium">{user.name}</td>
                  <td className="text-gray-500">{user.email}</td>
                  <td>
                    <span 
                      className={`role-badge ${user.roleName === 'ADMIN' ? 'role-admin' : 'role-member'}`}
                      style={{ cursor: 'default' }}
                    >
                      {user.roleName === 'ADMIN' ? <Shield size={14} /> : <ShieldOff size={14} />}
                      {user.roleName === 'ADMIN' ? '管理者' : (user.roleName || '未割当')}
                    </span>
                  </td>
                  <td>
                    <span 
                      className={`status-toggle ${user.isActive ? 'status-active' : 'status-inactive'}`}
                      style={{ cursor: 'default' }}
                    >
                      {user.isActive ? <Check size={14} /> : <X size={14} />}
                      {user.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="icon-action-btn" 
                        onClick={() => openEditModal(user)}
                        title="編集"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        className="icon-action-btn danger-text" 
                        onClick={() => handleDelete(user.id, user.name)}
                        title="無効化"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-8 text-gray-500">部員データがありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* 新規追加モーダル */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>新規部員追加</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="modal-body">
              {addError && (
                <div className="error-banner">
                  <AlertCircle size={16} />
                  {addError}
                </div>
              )}
              <div className="form-group">
                <label>氏名</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>メールアドレス</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>権限</label>
                <select
                  value={newUser.roleId}
                  onChange={e => setNewUser({ ...newUser, roleId: e.target.value })}
                  required
                >
                  <option value="">選択してください</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>
                  キャンセル
                </button>
                <button type="submit" className="primary-btn">
                  追加する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {showEditModal && editUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>部員情報編集</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="modal-body">
              {editError && (
                <div className="error-banner">
                  <AlertCircle size={16} />
                  {editError}
                </div>
              )}
              <div className="form-group">
                <label>氏名</label>
                <input 
                  type="text" 
                  value={editUser.name} 
                  disabled
                  className="bg-gray-100"
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>メールアドレス</label>
                <input 
                  type="email" 
                  value={editUser.email} 
                  disabled
                  className="bg-gray-100"
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>権限</label>
                <select 
                  value={editUser.roleId || ''} 
                  onChange={e => setEditUser({...editUser, roleId: e.target.value})} 
                  required
                >
                  <option value="">選択してください</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>ステータス</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="radio" 
                      name="isActive" 
                      checked={editUser.isActive === true} 
                      onChange={() => setEditUser({...editUser, isActive: true})} 
                    />
                    有効
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="radio" 
                      name="isActive" 
                      checked={editUser.isActive === false} 
                      onChange={() => setEditUser({...editUser, isActive: false})} 
                    />
                    無効
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowEditModal(false)}>
                  キャンセル
                </button>
                <button type="submit" className="primary-btn">
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
