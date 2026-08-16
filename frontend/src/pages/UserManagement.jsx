import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Shield, ShieldOff, Trash2, Check, X } from 'lucide-react';
import './UserManagement.css';

function UserManagement() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([
    { id: '1', name: '山田 太郎', email: 'taro.yamada@example.com', role: 'ADMIN', active: true },
    { id: '2', name: '佐藤 花子', email: 'hanako.sato@example.com', role: 'MEMBER', active: true },
    { id: '3', name: '鈴木 一郎', email: 'ichiro.suzuki@example.com', role: 'MEMBER', active: false },
    { id: '4', name: '高橋 次郎', email: 'jiro.takahashi@example.com', role: 'MEMBER', active: true },
  ]);

  const toggleRole = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' } : u));
  };

  const toggleActive = (id) => {
    setUsers(users.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`${name} のアカウントを削除しますか？この操作は元に戻せません。`)) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="user-management-container fade-in">
      <header className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          戻る
        </button>
        <h1>部員管理</h1>
        <div className="header-spacer"></div>
        <button className="primary-btn">
          <UserPlus size={18} />
          新規部員追加
        </button>
      </header>

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
                <tr key={user.id} className={`table-row ${!user.active ? 'inactive-row' : ''}`}>
                  <td className="font-medium">{user.name}</td>
                  <td className="text-gray-500">{user.email}</td>
                  <td>
                    <button 
                      className={`role-badge ${user.role === 'ADMIN' ? 'role-admin' : 'role-member'}`}
                      onClick={() => toggleRole(user.id)}
                      title="権限を切り替える"
                    >
                      {user.role === 'ADMIN' ? <Shield size={14} /> : <ShieldOff size={14} />}
                      {user.role === 'ADMIN' ? '管理者' : '一般部員'}
                    </button>
                  </td>
                  <td>
                    <button 
                      className={`status-toggle ${user.active ? 'status-active' : 'status-inactive'}`}
                      onClick={() => toggleActive(user.id)}
                    >
                      {user.active ? <Check size={14} /> : <X size={14} />}
                      {user.active ? '有効' : '無効'}
                    </button>
                  </td>
                  <td>
                    <button 
                      className="icon-action-btn danger-text" 
                      onClick={() => handleDelete(user.id, user.name)}
                      title="削除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default UserManagement;
