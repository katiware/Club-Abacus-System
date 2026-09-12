import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Shield, ShieldOff, Trash2, Check, X, AlertCircle } from 'lucide-react';
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

  const getNextRole = (currentRoleName) => {
    // ADMIN <-> MEMBER (SystemAdminなどはそのままか、必要に応じて変更)
    if (currentRoleName === 'ADMIN') return roles.find(r => r.name === 'MEMBER');
    return roles.find(r => r.name === 'ADMIN');
  };

  const toggleRole = async (user) => {
    const nextRole = getNextRole(user.roleName);
    if (!nextRole) {
      alert('変更可能な権限が見つかりません。');
      return;
    }

    try {
      await api.put(`/User/${user.id}`, { roleId: nextRole.id });
      // 画面更新
      setUsers(users.map(u => u.id === user.id ? { ...u, roleId: nextRole.id, roleName: nextRole.name } : u));
    } catch (err) {
      console.error(err);
      alert('権限の変更に失敗しました。');
    }
  };

  const toggleActive = async (user) => {
    const newStatus = !user.isActive;
    try {
      await api.put(`/User/${user.id}`, { isActive: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
    } catch (err) {
      console.error(err);
      alert('ステータスの変更に失敗しました。');
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

  if (isLoading) return <div className="p-8 text-center">読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="user-management-container fade-in">
      <PageHeader title="部員管理" backTo="/top">
        <button className="primary-btn" onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} />
          新規部員追加
        </button>
      </PageHeader>

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
                    <button 
                      className={`role-badge ${user.roleName === 'ADMIN' ? 'role-admin' : 'role-member'}`}
                      onClick={() => toggleRole(user)}
                      title="権限を切り替える"
                    >
                      {user.roleName === 'ADMIN' ? <Shield size={14} /> : <ShieldOff size={14} />}
                      {user.roleName === 'ADMIN' ? '管理者' : (user.roleName || '未割当')}
                    </button>
                  </td>
                  <td>
                    <button 
                      className={`status-toggle ${user.isActive ? 'status-active' : 'status-inactive'}`}
                      onClick={() => toggleActive(user)}
                    >
                      {user.isActive ? <Check size={14} /> : <X size={14} />}
                      {user.isActive ? '有効' : '無効'}
                    </button>
                  </td>
                  <td>
                    <button 
                      className="icon-action-btn danger-text" 
                      onClick={() => handleDelete(user.id, user.name)}
                      title="無効化"
                    >
                      <Trash2 size={18} />
                    </button>
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
                  onChange={e => setNewUser({...newUser, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>メールアドレス</label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={e => setNewUser({...newUser, email: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>権限</label>
                <select 
                  value={newUser.roleId} 
                  onChange={e => setNewUser({...newUser, roleId: e.target.value})} 
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
    </div>
  );
}

export default UserManagement;
