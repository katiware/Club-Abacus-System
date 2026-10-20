import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Save, Lock, Unlock, AlertTriangle, Edit2, Trash2, RotateCcw, X, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './FiscalYearSettings.css';

function FiscalYearSettings() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'USER';
  const isAdmin = userRole === 'ADMIN';
  const [fiscalYears, setFiscalYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    yearName: '',
    startDate: '',
    endDate: '',
    totalBudget: ''
  });

  // 編集モーダル用の状態
  const [editingYear, setEditingYear] = useState(null);
  const [editFormData, setEditFormData] = useState({
    yearName: '',
    startDate: '',
    endDate: '',
    totalBudget: ''
  });
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  const fetchFiscalYears = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/FiscalYear');
      setFiscalYears(response.data || []);
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
          errMsg = Object.values(err.response.data.errors).flat().join('\n');
        } else {
          errMsg = JSON.stringify(err.response.data);
        }
      }
      alert(`エラー:\n${errMsg}`);
    }
  };

  // 編集モーダルを開く
  const handleOpenEdit = (fy) => {
    setEditingYear(fy);
    setEditFormData({
      yearName: fy.yearName || '',
      startDate: fy.startDate || '',
      endDate: fy.endDate || '',
      totalBudget: fy.totalBudget ?? ''
    });
  };

  // 編集内容を保存
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingYear) return;
    setIsEditingSubmitting(true);
    try {
      await api.put(`/FiscalYear/${editingYear.id}`, {
        yearName: editFormData.yearName,
        startDate: editFormData.startDate,
        endDate: editFormData.endDate,
        totalBudget: parseInt(editFormData.totalBudget, 10)
      });
      alert('年度設定を更新しました。');
      setEditingYear(null);
      await fetchFiscalYears();
    } catch (err) {
      console.error(err);
      alert(`更新エラー:\n${err.response?.data?.message || err.response?.data || '更新に失敗しました'}`);
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  // 年度締め処理
  const handleClose = async (id, name) => {
    if (window.confirm(`「${name}」を締め処理しますか？\n締めると自動的に当年度の申請は締め切られます。`)) {
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

  // 誤って締めた年度の締め解除（再オープン）
  const handleReopen = async (id, name) => {
    if (window.confirm(`【管理者リカバリー】\n「${name}」の締め処理を取り消して再開しますか？\n（誤って締めてしまった場合の救済機能です）`)) {
      try {
        await api.post(`/FiscalYear/${id}/reopen`);
        alert('年度の締め処理を取り消し、再開しました。');
        await fetchFiscalYears();
      } catch (err) {
        alert(`エラー: ${err.response?.data?.message || err.response?.data || '締め解除に失敗しました'}`);
      }
    }
  };

  // 誤って開始した年度の未開始への巻き戻し
  const handleStop = async (id, name) => {
    if (window.confirm(`【管理者リカバリー】\n「${name}」の進行を停止して「未開始」ステータスに戻しますか？\n（誤って開始ボタンを押してしまった場合の救済機能です）`)) {
      try {
        await api.post(`/FiscalYear/${id}/stop`);
        alert('年度の進行を停止し、未開始状態に戻しました。');
        await fetchFiscalYears();
      } catch (err) {
        alert(`エラー: ${err.response?.data?.message || err.response?.data || '停止に失敗しました'}`);
      }
    }
  };

  // 誤って作成した年度の削除
  const handleDelete = async (id, name) => {
    if (window.confirm(`【管理者リカバリー】\n「${name}」の設定を完全に削除しますか？\n（※この年度内の申請データが存在しない場合のみ削除できます）`)) {
      try {
        await api.delete(`/FiscalYear/${id}`);
        alert('年度を削除しました。');
        await fetchFiscalYears();
      } catch (err) {
        alert(`削除エラー:\n${err.response?.data || '削除できませんでした。申請データが存在する可能性があります。'}`);
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

        {/* 管理者向けリカバリーガイド */}
        {isAdmin && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#166534', lineHeight: '1.6' }}>
            <strong>🛡️ システム管理者用リカバリー機能:</strong>
            <span style={{ display: 'block', marginTop: '4px' }}>
              設定ミス時の保険として、各年度カードの「編集」から期間・予算の修正、「未開始に戻す」で開始ミスの取り消しが可能です。（※主将会計には表示・許可されません）
            </span>
          </div>
        )}

        {/* 新規年度登録 */}
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
                  <label>年度名 <span style={{ color: '#ef4444' }}>*</span></label>
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
                  <label>開始日 <span style={{ color: '#ef4444' }}>*</span></label>
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
                  <label>終了日 <span style={{ color: '#ef4444' }}>*</span></label>
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
                  <label>今年度予算総額（円） <span style={{ color: '#ef4444' }}>*</span></label>
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
                  <p className="help-text">ここで登録した予算額は、ダッシュボードでの予算残高計算に使用されます（後から編集も可能です）。</p>
                </div>
              </div>
              <button type="submit" className="primary-btn">
                <Save size={18} />
                登録する
              </button>
            </form>
          </div>
        </section>

        {/* 登録済み年度一覧 */}
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
                {fiscalYears.map(fy => {
                  const activeYear = fiscalYears.find(f => f.isActive && f.id !== fy.id);
                  return (
                    <div 
                      key={fy.id} 
                      className={`year-card ${fy.isClosed ? 'closed' : ''}`}
                      onClick={() => navigate(`/fiscal-year-dashboard/${fy.id}`)}
                      style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '20px' }}
                      title="クリックしてこの年度のダッシュボードを開く"
                    >
                      <div className="year-info" style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ margin: 0 }}>
                            {fy.yearName}
                            <span className={`badge-status ${fy.isClosed ? 'closed' : (fy.isActive ? 'active' : 'pending')}`}>
                              {fy.isClosed ? '締め済' : (fy.isActive ? '進行中' : '開始前')}
                            </span>
                            {fy.isApplicationsStopped && (
                              <span style={{ fontSize: '11px', marginLeft: '6px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                申請停止中
                              </span>
                            )}
                          </h3>

                          {/* 編集・削除等の共通操作アイコン (管理者専用保険) */}
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                              <button 
                                type="button"
                                className="icon-btn" 
                                title="年度設定を編集 (管理者専用)" 
                                onClick={() => handleOpenEdit(fy)}
                                style={{ padding: '6px', color: '#2563eb', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                type="button"
                                className="icon-btn danger-text" 
                                title="年度を削除 (管理者専用)" 
                                onClick={() => handleDelete(fy.id, fy.yearName)}
                                style={{ padding: '6px', color: '#ef4444', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="year-meta" style={{ marginTop: '8px', color: '#64748b', fontSize: '13px', display: 'flex', gap: '20px' }}>
                          <span>期間: <strong>{fy.startDate} 〜 {fy.endDate}</strong></span>
                          <span>予算総額: <strong>¥{fy.totalBudget?.toLocaleString() ?? 0}</strong></span>
                        </div>
                      </div>

                      {/* アクションボタン群 */}
                      <div className="year-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }} onClick={e => e.stopPropagation()}>
                        <button 
                          className="secondary-btn" 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/fiscal-year-dashboard/${fy.id}`);
                          }}
                        >
                          📊 ダッシュボード
                        </button>
                        <button 
                          className="secondary-btn" 
                          style={{ color: '#db2777', borderColor: '#f472b6' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/external-budgets/${fy.id}`);
                          }}
                          title="この年度の部費外予算（OB寄付金、アマギフ等）の専用管理ページを開きます"
                        >
                          💰 部費外予算の管理
                        </button>

                        {/* 開始前年度 */}
                        {!fy.isClosed && !fy.isActive && (
                          <button 
                            className="primary-btn" 
                            style={{ 
                              backgroundColor: '#12b886',
                              cursor: 'pointer'
                            }}
                            title={activeYear ? `進行中の${activeYear.yearName}を締めて、この年度を開始します` : '年度を開始します'}
                            onClick={async (e) => {
                              e.stopPropagation();
                              let confirmMsg = `「${fy.yearName}」を開始しますか？`;
                              if (activeYear) {
                                confirmMsg = `現在【${activeYear.yearName}】が進行中です。\n「${fy.yearName}」を開始すると、前年度（${activeYear.yearName}）は自動的に締め切られ、スムーズに新年度に移行します。\n開始してもよろしいですか？`;
                              }
                              if (!window.confirm(confirmMsg)) return;

                              try {
                                const res = await api.post(`/FiscalYear/${fy.id}/start?autoClosePrevious=true`);
                                alert(res.data?.message || '年度を開始しました。');
                                await fetchFiscalYears();
                              } catch (err) {
                                alert(`エラー: ${err.response?.data?.message || err.response?.data || '開始に失敗しました'}`);
                              }
                            }}
                          >
                            年度を開始する
                          </button>
                        )}

                        {/* 進行中年度 */}
                        {!fy.isClosed && fy.isActive && (
                          <>
                            <button 
                              className="secondary-btn" 
                              style={{ color: '#4c6ef5', borderColor: '#4c6ef5' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendAlerts(fy.id);
                              }}
                            >
                              締め前アラート
                            </button>
                            <button 
                              className="secondary-btn" 
                              style={{ color: fy.isApplicationsStopped ? '#12b886' : '#f59f00', borderColor: fy.isApplicationsStopped ? '#12b886' : '#f59f00' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleApplications(fy.id);
                              }}
                            >
                              {fy.isApplicationsStopped ? '申請を再開' : '申請を一時停止'}
                            </button>
                            {isAdmin && (
                              <button 
                                className="secondary-btn" 
                                style={{ color: '#64748b', borderColor: '#cbd5e1' }}
                                title="【管理者保険】誤って開始してしまった場合、未開始に戻します"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStop(fy.id, fy.yearName);
                                }}
                              >
                                <RotateCcw size={14} style={{ marginRight: '4px' }} />
                                未開始に戻す
                              </button>
                            )}
                            <button 
                              className="secondary-btn" 
                              style={{ color: '#ef4444', borderColor: '#fca5a5', backgroundColor: '#fff5f5' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClose(fy.id, fy.yearName);
                              }}
                            >
                              <Lock size={14} style={{ marginRight: '4px' }} />
                              年度を締める
                            </button>
                          </>
                        )}

                        {/* 締め済み年度 */}
                        {fy.isClosed && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <Lock size={13} /> 締め済み
                            </span>
                            {isAdmin && (
                              <button
                                className="secondary-btn"
                                style={{ color: '#4f46e5', borderColor: '#c7d2fe', padding: '6px 12px', fontSize: '12px' }}
                                title="【管理者保険】誤って締めてしまった年度の締め処理を取り消して再開します"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReopen(fy.id, fy.yearName);
                                }}
                              >
                                <RotateCcw size={13} style={{ marginRight: '4px' }} />
                                締め解除（再開）
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 年度編集モーダル */}
      {editingYear && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: '#fff', padding: '24px', borderRadius: '12px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>年度設定の編集（修正）</h3>
              <button 
                type="button" 
                onClick={() => setEditingYear(null)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                    年度名 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    value={editFormData.yearName} 
                    onChange={(e) => setEditFormData({ ...editFormData, yearName: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                      開始日 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="date" 
                      required 
                      className="form-input" 
                      value={editFormData.startDate} 
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                      終了日 <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input 
                      type="date" 
                      required 
                      className="form-input" 
                      value={editFormData.endDate} 
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' }}>
                    今年度予算総額（円） <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    className="form-input" 
                    value={editFormData.totalBudget} 
                    onChange={(e) => setEditFormData({ ...editFormData, totalBudget: e.target.value })} 
                  />
                  <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    予算超過警告やダッシュボード残高計算に即座に反映されます。
                  </small>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="secondary-btn" 
                  onClick={() => setEditingYear(null)}
                  disabled={isEditingSubmitting}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="primary-btn" 
                  disabled={isEditingSubmitting}
                >
                  {isEditingSubmitting ? '保存中...' : '変更を保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default FiscalYearSettings;
