import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calculator, Plus, Edit2, ArrowRightLeft, Trash2, ArrowLeft, 
  CheckCircle, AlertCircle, Info, Calendar, X, RefreshCw, Layers
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './ExternalBudgetManagement.css';

function ExternalBudgetManagement() {
  const { fiscalYearId } = useParams();
  const navigate = useNavigate();

  const [fiscalYears, setFiscalYears] = useState([]);
  const [selectedFiscalYearId, setSelectedFiscalYearId] = useState('');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 新規枠作成フォーム
  const [newBudgetForm, setNewBudgetForm] = useState({
    name: '',
    description: '',
    cashAmount: '',
    amazonGiftAmount: '',
    otherAmount: ''
  });
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // 金額編集モーダル
  const [editingBudget, setEditingBudget] = useState(null);
  const [editBudgetForm, setEditBudgetForm] = useState({
    name: '',
    description: '',
    cashAmount: '',
    amazonGiftAmount: '',
    otherAmount: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // 資産振替モーダル
  const [convertTargetBudget, setConvertTargetBudget] = useState(null);
  const [convertForm, setConvertForm] = useState({
    fromType: 2, // AmazonGift
    toType: 1,   // Cash
    amount: '',
    convertedAmount: '',
    note: ''
  });
  const [isSubmittingConvert, setIsSubmittingConvert] = useState(false);

  // 年度一覧の取得
  useEffect(() => {
    const fetchFiscalYears = async () => {
      try {
        const res = await api.get('/FiscalYear');
        const sorted = (res.data || []).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        setFiscalYears(sorted);

        // URLパラメータで指定された年度、またはアクティブ年度、または先頭年度を選択
        if (fiscalYearId && sorted.some(f => f.id === fiscalYearId)) {
          setSelectedFiscalYearId(fiscalYearId);
        } else {
          const active = sorted.find(f => f.isActive) || sorted[0];
          if (active) setSelectedFiscalYearId(active.id);
        }
      } catch (err) {
        console.error('年度一覧の取得に失敗しました', err);
      }
    };
    fetchFiscalYears();
  }, [fiscalYearId]);

  // 選択年度が切り替わったときのデータ取得
  useEffect(() => {
    if (!selectedFiscalYearId) return;

    const currentFy = fiscalYears.find(f => f.id === selectedFiscalYearId);
    setSelectedFiscalYear(currentFy || null);

    const fetchBudgets = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/ExternalBudget?fiscalYearId=${selectedFiscalYearId}`);
        setBudgets(res.data || []);
      } catch (err) {
        console.error('部費外予算一覧の取得に失敗しました', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBudgets();
  }, [selectedFiscalYearId, fiscalYears]);

  // モーダル開閉時のスクロール制御
  useEffect(() => {
    if (editingBudget || convertTargetBudget) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingBudget, convertTargetBudget]);

  const reloadBudgets = async () => {
    if (!selectedFiscalYearId) return;
    try {
      const res = await api.get(`/ExternalBudget?fiscalYearId=${selectedFiscalYearId}`);
      setBudgets(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 新規枠作成
  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!selectedFiscalYearId) return;

    const cash = parseInt(newBudgetForm.cashAmount, 10) || 0;
    const amazon = parseInt(newBudgetForm.amazonGiftAmount, 10) || 0;
    const other = parseInt(newBudgetForm.otherAmount, 10) || 0;
    const total = cash + amazon + other;

    if (total <= 0) {
      alert('現金・Amazonギフトカード・その他のいずれかに1円以上の枠を入力してください。');
      return;
    }

    setIsSubmittingNew(true);
    try {
      await api.post('/ExternalBudget', {
        fiscalYearId: selectedFiscalYearId,
        name: newBudgetForm.name,
        description: newBudgetForm.description,
        cashAmount: cash,
        amazonGiftAmount: amazon,
        otherAmount: other,
        totalAmount: total
      });
      alert('新しい部費外予算枠を追加しました。');
      setNewBudgetForm({
        name: '',
        description: '',
        cashAmount: '',
        amazonGiftAmount: '',
        otherAmount: ''
      });
      await reloadBudgets();
    } catch (err) {
      console.error(err);
      alert(`エラー: ${err.response?.data?.message || err.response?.data || '登録に失敗しました'}`);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // 編集モーダルを開く
  const handleOpenEditModal = (b) => {
    setEditingBudget(b);
    setEditBudgetForm({
      name: b.name,
      description: b.description || '',
      cashAmount: b.cashAmount,
      amazonGiftAmount: b.amazonGiftAmount,
      otherAmount: b.otherAmount
    });
  };

  // 金額編集・増額実行
  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    if (!editingBudget) return;

    const cash = parseInt(editBudgetForm.cashAmount, 10) || 0;
    const amazon = parseInt(editBudgetForm.amazonGiftAmount, 10) || 0;
    const other = parseInt(editBudgetForm.otherAmount, 10) || 0;
    const total = cash + amazon + other;

    if (total <= 0) {
      alert('現金・Amazonギフトカード・その他のいずれかに1円以上の枠を入力してください。');
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await api.put(`/ExternalBudget/${editingBudget.id}`, {
        name: editBudgetForm.name,
        description: editBudgetForm.description,
        cashAmount: cash,
        amazonGiftAmount: amazon,
        otherAmount: other
      });
      alert('部費外予算の枠・情報を更新しました。');
      setEditingBudget(null);
      await reloadBudgets();
    } catch (err) {
      console.error(err);
      alert(`エラー: ${err.response?.data?.message || err.response?.data || '更新に失敗しました'}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // 資産振替モーダルを開く
  const handleOpenConvertModal = (b) => {
    setConvertTargetBudget(b);
    setConvertForm({
      fromType: 2, // AmazonGift
      toType: 1,   // Cash
      amount: '',
      convertedAmount: '',
      note: ''
    });
  };

  // 資産振替（換金）実行
  const handleExecuteConvert = async (e) => {
    e.preventDefault();
    if (!convertTargetBudget) return;

    const amt = parseInt(convertForm.amount, 10) || 0;
    const convAmt = parseInt(convertForm.convertedAmount, 10) || amt;

    if (amt <= 0) {
      alert('振替金額は1円以上を入力してください。');
      return;
    }
    if (convertForm.fromType === convertForm.toType) {
      alert('振替元と振替先には異なる形態を指定してください。');
      return;
    }

    setIsSubmittingConvert(true);
    try {
      await api.post(`/ExternalBudget/${convertTargetBudget.id}/convert`, {
        fromType: parseInt(convertForm.fromType, 10),
        toType: parseInt(convertForm.toType, 10),
        amount: amt,
        convertedAmount: convAmt,
        note: convertForm.note
      });
      alert('資産振替（換金）が完了しました。');
      setConvertTargetBudget(null);
      await reloadBudgets();
    } catch (err) {
      console.error(err);
      alert(`エラー: ${err.response?.data?.message || err.response?.data || '振替に失敗しました。'}`);
    } finally {
      setIsSubmittingConvert(false);
    }
  };

  // 削除
  const handleDeleteBudget = async (budgetId, name) => {
    if (!window.confirm(`「${name}」を削除しますか？\n（※すでに申請で使用されている場合は削除できません）`)) return;
    try {
      await api.delete(`/ExternalBudget/${budgetId}`);
      alert('削除しました。');
      await reloadBudgets();
    } catch (err) {
      console.error(err);
      alert(`エラー: ${err.response?.data || '削除に失敗しました'}`);
    }
  };

  // 年度全体のサマリー計算
  const totalAllocated = budgets.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const totalUsed = budgets.reduce((acc, b) => acc + (b.usedAmount || 0), 0);
  const totalRemaining = budgets.reduce((acc, b) => acc + (b.remainingAmount || 0), 0);
  const totalCashRemaining = budgets.reduce((acc, b) => acc + (b.remainingCashAmount || 0), 0);
  const totalAmazonRemaining = budgets.reduce((acc, b) => acc + (b.remainingAmazonGiftAmount || 0), 0);
  const totalOtherRemaining = budgets.reduce((acc, b) => acc + (b.remainingOtherAmount || 0), 0);

  const newTotalCalc = (parseInt(newBudgetForm.cashAmount, 10) || 0) +
                       (parseInt(newBudgetForm.amazonGiftAmount, 10) || 0) +
                       (parseInt(newBudgetForm.otherAmount, 10) || 0);

  return (
    <div className="ext-management-container fade-in">
      <PageHeader 
        title="部費外予算の管理" 
        backTo="/fiscal-years" 
      />

      <main className="ext-management-content">
        
        {/* 上部コントロール：年度セレクター & 説明バナー */}
        <div className="ext-top-bar">
          <div className="ext-year-selector">
            <Calendar size={18} className="text-pink-600" />
            <span className="year-label">対象年度:</span>
            <select
              value={selectedFiscalYearId}
              onChange={(e) => {
                setSelectedFiscalYearId(e.target.value);
                navigate(`/external-budgets/${e.target.value}`, { replace: true });
              }}
              className="year-select"
            >
              {fiscalYears.map(fy => (
                <option key={fy.id} value={fy.id}>
                  {fy.yearName} {fy.isActive ? '（進行中・当年度）' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="ext-info-badge">
            <Info size={15} />
            <span>OB・OG寄付金、特別助成金、アマギフ等の財源を部費とは別に管理・充当できます</span>
          </div>
        </div>

        {/* 全体統計サマリーダッシュボード */}
        <section className="ext-summary-dashboard">
          <div className="ext-summary-card total">
            <span className="card-label">部費外 総予算枠</span>
            <span className="card-value">¥{totalAllocated.toLocaleString()}</span>
            <span className="card-sub">{budgets.length}件の枠が登録中</span>
          </div>

          <div className="ext-summary-card used">
            <span className="card-label">充当・消化済額</span>
            <span className="card-value">¥{totalUsed.toLocaleString()}</span>
            <span className="card-sub">
              消化率: {totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0}%
            </span>
          </div>

          <div className="ext-summary-card remaining">
            <span className="card-label">実質利用可能残高</span>
            <span className="card-value text-emerald">¥{totalRemaining.toLocaleString()}</span>
            <span className="card-sub">部費を消費せず充当可能</span>
          </div>

          <div className="ext-summary-card assets">
            <span className="card-label">資産形態別 残高内訳</span>
            <div className="assets-breakdown">
              <span className="asset-tag cash">💵 現金: ¥{totalCashRemaining.toLocaleString()}</span>
              <span className="asset-tag amazon">🎁 アマギフ: ¥{totalAmazonRemaining.toLocaleString()}</span>
              <span className="asset-tag other">🏷️ その他: ¥{totalOtherRemaining.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* 2カラムメインレイアウト */}
        <div className="ext-main-layout">
          
          {/* 左カラム：登録済み部費外予算一覧 */}
          <div className="ext-list-column">
            <div className="column-header">
              <h2>
                <Layers size={20} className="text-pink-600" />
                登録済みの部費外予算枠 ({budgets.length}件)
              </h2>
              <button 
                onClick={reloadBudgets} 
                className="reload-btn"
                title="最新情報に更新"
              >
                <RefreshCw size={15} />
                更新
              </button>
            </div>

            {isLoading ? (
              <div className="ext-loading-box">データを読み込み中...</div>
            ) : budgets.length === 0 ? (
              <div className="ext-empty-box">
                <p>現在登録されている部費外予算枠はありません。</p>
                <span>右側のフォームから新しい予算枠（OB寄付金、アマギフ枠など）を追加してください。</span>
              </div>
            ) : (
              <div className="ext-budgets-grid">
                {budgets.map(b => {
                  const usedPct = b.totalAmount > 0 ? Math.min(Math.round((b.usedAmount / b.totalAmount) * 100), 100) : 0;
                  return (
                    <div key={b.id} className="ext-budget-card">
                      <div className="card-header-row">
                        <div>
                          <h3 className="budget-name">{b.name}</h3>
                          {b.description && <p className="budget-desc">{b.description}</p>}
                        </div>
                        <span className="usage-badge">消化率 {usedPct}%</span>
                      </div>

                      {/* サマリーバー */}
                      <div className="budget-summary-strip">
                        <div className="strip-item">
                          <span className="strip-label">枠総額</span>
                          <span className="strip-val">¥{b.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="strip-item">
                          <span className="strip-label">消化済</span>
                          <span className="strip-val text-pink">¥{b.usedAmount.toLocaleString()}</span>
                        </div>
                        <div className="strip-item">
                          <span className="strip-label">実質残高</span>
                          <span className="strip-val text-emerald">¥{b.remainingAmount.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* プログレスバー */}
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${usedPct}%` }} />
                      </div>

                      {/* 形態別残高カード */}
                      <div className="asset-types-grid">
                        <div className="asset-box cash">
                          <div className="asset-header">💵 現金</div>
                          <div className="asset-rem">¥{b.remainingCashAmount.toLocaleString()}</div>
                          <div className="asset-sub">枠: ¥{b.cashAmount.toLocaleString()}</div>
                        </div>

                        <div className="asset-box amazon">
                          <div className="asset-header">🎁 Amazonギフト</div>
                          <div className="asset-rem">¥{b.remainingAmazonGiftAmount.toLocaleString()}</div>
                          <div className="asset-sub">枠: ¥{b.amazonGiftAmount.toLocaleString()}</div>
                        </div>

                        <div className="asset-box other">
                          <div className="asset-header">🏷️ その他</div>
                          <div className="asset-rem">¥{b.remainingOtherAmount.toLocaleString()}</div>
                          <div className="asset-sub">枠: ¥{b.otherAmount.toLocaleString()}</div>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="card-actions">
                        <button 
                          type="button"
                          onClick={() => handleOpenEditModal(b)}
                          className="action-btn edit"
                          title="枠名や各形態の金額を変更・増額します"
                        >
                          <Edit2 size={14} />
                          金額変更・編集
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleOpenConvertModal(b)}
                          className="action-btn convert"
                          title="アマギフと現金の相互振替・換金処理"
                        >
                          <ArrowRightLeft size={14} />
                          資産振替 (換金)
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteBudget(b.id, b.name)}
                          className="action-btn delete"
                          title="削除"
                        >
                          <Trash2 size={14} />
                          削除
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 右カラム：新規枠追加カード（スティッキー） */}
          <div className="ext-form-column">
            <div className="sticky-form-card">
              <h3 className="form-card-title">
                <Plus size={18} className="text-pink-600" />
                新しい部費外予算枠を追加
              </h3>
              <p className="form-card-sub">
                【{selectedFiscalYear?.yearName || '当年度'}】に新しい財源枠（自由用途や寄付金等）を作成します。
              </p>

              <form onSubmit={handleCreateBudget} className="create-budget-form">
                <div className="form-group">
                  <label>
                    予算枠の名称 <span className="req">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="例: OB・OG寄付金、自由用途プール"
                    className="form-input"
                    value={newBudgetForm.name}
                    onChange={e => setNewBudgetForm({ ...newBudgetForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>使途・備考</label>
                  <input 
                    type="text" 
                    placeholder="例: 自由用途、または備品購入・大会遠征専用"
                    className="form-input"
                    value={newBudgetForm.description}
                    onChange={e => setNewBudgetForm({ ...newBudgetForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>
                    形態別の初期予算枠（円） <span className="req">*いずれか1つ以上</span>
                  </label>
                  <div className="form-asset-inputs">
                    <div className="asset-input-row cash">
                      <span>💵 現金</span>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        className="form-input"
                        value={newBudgetForm.cashAmount}
                        onChange={e => setNewBudgetForm({ ...newBudgetForm, cashAmount: e.target.value })}
                      />
                    </div>
                    <div className="asset-input-row amazon">
                      <span>🎁 Amazonギフト</span>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        className="form-input"
                        value={newBudgetForm.amazonGiftAmount}
                        onChange={e => setNewBudgetForm({ ...newBudgetForm, amazonGiftAmount: e.target.value })}
                      />
                    </div>
                    <div className="asset-input-row other">
                      <span>🏷️ その他</span>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="0"
                        className="form-input"
                        value={newBudgetForm.otherAmount}
                        onChange={e => setNewBudgetForm({ ...newBudgetForm, otherAmount: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="total-calc-display">
                  <span>合計枠総額:</span>
                  <strong className="calc-amount">¥{newTotalCalc.toLocaleString()}</strong>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmittingNew}
                  className="submit-create-btn"
                >
                  <Plus size={18} />
                  {isSubmittingNew ? '作成中...' : 'この枠を追加する'}
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* 金額変更・編集モーダル */}
      {editingBudget && (
        <div className="ext-modal-overlay" onClick={() => setEditingBudget(null)}>
          <div className="ext-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Edit2 size={18} className="text-blue-600" />
                部費外予算の金額変更・編集
              </h3>
              <button onClick={() => setEditingBudget(null)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <p className="modal-lead">
              手持ちの入金や増額に合わせて金額枠をいつでも変更できます。<br/>
              ※既に申請に充当済みの金額を下回る減額はできません。
            </p>

            <form onSubmit={handleUpdateBudget} className="modal-form-wrapper">
              <div className="modal-body">
                <div className="form-group">
                  <label>予算枠の名称 <span className="req">*</span></label>
                  <input 
                    type="text" 
                    required 
                    className="form-input"
                    value={editBudgetForm.name}
                    onChange={e => setEditBudgetForm({ ...editBudgetForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>使途・備考</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={editBudgetForm.description}
                    onChange={e => setEditBudgetForm({ ...editBudgetForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>形態別の枠金額 (円) <span className="req">*</span></label>
                  <div className="edit-asset-grid">
                    <div className="edit-asset-box cash">
                      <span className="box-title">💵 現金</span>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={editBudgetForm.cashAmount}
                        onChange={e => setEditBudgetForm({ ...editBudgetForm, cashAmount: e.target.value })}
                      />
                      <span className="box-used">
                        充当済: ¥{(editingBudget.cashAmount - editingBudget.remainingCashAmount).toLocaleString()}
                      </span>
                    </div>

                    <div className="edit-asset-box amazon">
                      <span className="box-title">🎁 Amazonギフト</span>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={editBudgetForm.amazonGiftAmount}
                        onChange={e => setEditBudgetForm({ ...editBudgetForm, amazonGiftAmount: e.target.value })}
                      />
                      <span className="box-used">
                        充当済: ¥{(editingBudget.amazonGiftAmount - editingBudget.remainingAmazonGiftAmount).toLocaleString()}
                      </span>
                    </div>

                    <div className="edit-asset-box other">
                      <span className="box-title">🏷️ その他</span>
                      <input 
                        type="number" 
                        min="0"
                        className="form-input"
                        value={editBudgetForm.otherAmount}
                        onChange={e => setEditBudgetForm({ ...editBudgetForm, otherAmount: e.target.value })}
                      />
                      <span className="box-used">
                        充当済: ¥{(editingBudget.otherAmount - editingBudget.remainingOtherAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setEditingBudget(null)} className="btn-cancel">
                  キャンセル
                </button>
                <button type="submit" disabled={isSubmittingEdit} className="btn-save">
                  {isSubmittingEdit ? '保存中...' : '変更を保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 資産振替（換金）モーダル */}
      {convertTargetBudget && (
        <div className="ext-modal-overlay" onClick={() => setConvertTargetBudget(null)}>
          <div className="ext-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <ArrowRightLeft size={18} className="text-pink-600" />
                資産振替・換金処理
              </h3>
              <button onClick={() => setConvertTargetBudget(null)} className="close-btn">
                <X size={20} />
              </button>
            </div>

            <div className="convert-target-info">
              対象予算: <strong>{convertTargetBudget.name}</strong><br/>
              現在の残高: 現金 ¥{convertTargetBudget.remainingCashAmount.toLocaleString()} / アマギフ ¥{convertTargetBudget.remainingAmazonGiftAmount.toLocaleString()} / その他 ¥{convertTargetBudget.remainingOtherAmount.toLocaleString()}
            </div>

            <form onSubmit={handleExecuteConvert} className="modal-form-wrapper">
              <div className="modal-body">
                <div className="convert-types-row">
                  <div className="form-group">
                    <label>振替元 (減額)</label>
                    <select 
                      value={convertForm.fromType} 
                      onChange={e => setConvertForm({ ...convertForm, fromType: parseInt(e.target.value, 10) })}
                      className="form-input"
                    >
                      <option value={1}>💵 現金 (残: ¥{convertTargetBudget.remainingCashAmount.toLocaleString()})</option>
                      <option value={2}>🎁 Amazonギフト (残: ¥{convertTargetBudget.remainingAmazonGiftAmount.toLocaleString()})</option>
                      <option value={3}>🏷️ その他 (残: ¥{convertTargetBudget.remainingOtherAmount.toLocaleString()})</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>振替先 (加算)</label>
                    <select 
                      value={convertForm.toType} 
                      onChange={e => setConvertForm({ ...convertForm, toType: parseInt(e.target.value, 10) })}
                      className="form-input"
                    >
                      <option value={1}>💵 現金</option>
                      <option value={2}>🎁 Amazonギフト</option>
                      <option value={3}>🏷️ その他</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>振替元から減額する金額 (円)</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    placeholder="例: 10000"
                    className="form-input"
                    value={convertForm.amount}
                    onChange={e => {
                      const val = e.target.value;
                      setConvertForm({ ...convertForm, amount: val, convertedAmount: val });
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>
                    振替先へ加算される金額 (円)
                    <span className="note-sub">※換金手数料等がある場合に変更</span>
                  </label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    placeholder="例: 9500"
                    className="form-input"
                    value={convertForm.convertedAmount}
                    onChange={e => setConvertForm({ ...convertForm, convertedAmount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>備考・理由</label>
                  <input 
                    type="text" 
                    placeholder="例: 金券ショップで換金、端数受取など"
                    className="form-input"
                    value={convertForm.note}
                    onChange={e => setConvertForm({ ...convertForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setConvertTargetBudget(null)} className="btn-cancel">
                  キャンセル
                </button>
                <button type="submit" disabled={isSubmittingConvert} className="btn-save pink">
                  {isSubmittingConvert ? '処理中...' : '振替を実行する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ExternalBudgetManagement;
