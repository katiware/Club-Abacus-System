import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator as CalcIcon, Link2, Unlink, Copy, Check, Users, User, ArrowRight, Info } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './Calculator.css';

const DENOMINATIONS = [
  { value: 10000, label: '1万円札' },
  { value: 5000, label: '5千円札' },
  { value: 1000, label: '千円札' },
  { value: 500, label: '500円玉' },
  { value: 100, label: '100円玉' },
  { value: 50, label: '50円玉' },
  { value: 10, label: '10円玉' },
  { value: 5, label: '5円玉' },
  { value: 1, label: '1円玉' },
];

function Calculator() {
  const navigate = useNavigate();
  
  const [payouts, setPayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ユーザーごとの結合状態マップ: { [applicantKey]: boolean }
  // true = 1つにまとめて合算計算 / false = 申請ごとに個別計算
  const [userCombineMap, setUserCombineMap] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchPayouts = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/Expense/all');
        // 現金払い出しが必要な申請のみをフィルタリング
        const needsCash = response.data.filter(app => {
          if (app.type === 'Advance' && app.status === 'Approved') return true;
          if (app.type === 'Reimbursement' && app.status === 'UniversitySubmitted') return true;
          return false;
        });

        // 現金払い出し額の算出（非現金資産形態で充当された部費外予算がある場合は差し引く）
        const getCashPayout = (app) => {
          if (app.externalBudgetAmount > 0 && app.externalBudgetAssetType && app.externalBudgetAssetType !== 'Cash') {
            return Math.max(0, app.totalAmount - app.externalBudgetAmount);
          }
          return app.totalAmount;
        };
        
        // 必要な情報だけをマッピング（現金払い出し額が0超のもの）
        const mapped = needsCash
          .map(app => {
            const cashAmount = getCashPayout(app);
            return {
              id: app.id.substring(0, 8),
              originalId: app.id,
              title: app.title || '申請',
              applicantId: app.userId || app.user?.id || app.user?.name || 'unknown',
              applicant: app.user?.name || '不明',
              amount: cashAmount,
              originalTotal: app.totalAmount,
              externalBudgetAmount: app.externalBudgetAmount || 0,
              externalBudgetAssetType: app.externalBudgetAssetType,
              type: app.type === 'Advance' ? '事前出金' : '立替精算',
              date: new Date(app.createdAt).toLocaleDateString()
            };
          })
          .filter(p => p.amount > 0); // 現金払い出しが発生するもののみ
        
        setPayouts(mapped);

        // 同一人物で2件以上ある人物を特定し、初期状態は「結合（true）」に設定
        const counts = {};
        mapped.forEach(p => {
          counts[p.applicantId] = (counts[p.applicantId] || 0) + 1;
        });

        const initialCombine = {};
        Object.keys(counts).forEach(key => {
          initialCombine[key] = true; // デフォルトで結合
        });
        setUserCombineMap(initialCombine);

      } catch (err) {
        console.error('Failed to fetch payouts', err);
        setError('データの取得に失敗しました。管理者権限を確認してください。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayouts();
  }, []);

  // 人物ごとに申請をグループ化
  const groupedByApplicant = useMemo(() => {
    const groups = {};
    payouts.forEach(p => {
      if (!groups[p.applicantId]) {
        groups[p.applicantId] = {
          applicantId: p.applicantId,
          applicantName: p.applicant,
          items: []
        };
      }
      groups[p.applicantId].items.push(p);
    });
    return Object.values(groups);
  }, [payouts]);

  // 複数申請がある人物のカウント
  const multipleApplicantsCount = useMemo(() => {
    return groupedByApplicant.filter(g => g.items.length > 1).length;
  }, [groupedByApplicant]);

  // 特定の金額に対する金種計算ヘルパー
  const calculateDenominations = (amount) => {
    let remaining = amount;
    const result = {};
    for (const denom of DENOMINATIONS) {
      const count = Math.floor(remaining / denom.value);
      result[denom.value] = count;
      remaining %= denom.value;
    }
    return result;
  };

  // 一括切り替え: すべて結合
  const handleCombineAll = () => {
    const nextMap = {};
    groupedByApplicant.forEach(g => {
      nextMap[g.applicantId] = true;
    });
    setUserCombineMap(nextMap);
  };

  // 一括切り替え: すべて分離（個別）
  const handleSplitAll = () => {
    const nextMap = {};
    groupedByApplicant.forEach(g => {
      nextMap[g.applicantId] = false;
    });
    setUserCombineMap(nextMap);
  };

  // 個人ごとの結合・分離トグル
  const toggleUserCombine = (applicantId) => {
    setUserCombineMap(prev => ({
      ...prev,
      [applicantId]: !prev[applicantId]
    }));
  };

  // 現在の結合状態に基づいて計算される払い出し単位（統合カード or 個別カード）
  const calculatedPayoutUnits = useMemo(() => {
    const units = [];

    groupedByApplicant.forEach(group => {
      const isCombined = userCombineMap[group.applicantId] !== false;

      if (isCombined && group.items.length > 1) {
        // 結合モード: 人物単位で合算
        const totalAmount = group.items.reduce((sum, item) => sum + item.amount, 0);
        units.push({
          key: `group-${group.applicantId}`,
          isGroup: true,
          applicantId: group.applicantId,
          applicantName: group.applicantName,
          amount: totalAmount,
          items: group.items,
          breakdown: calculateDenominations(totalAmount)
        });
      } else {
        // 分離モード（または1件のみ）: 個別の申請単位
        group.items.forEach(item => {
          units.push({
            key: `single-${item.originalId}`,
            isGroup: false,
            applicantId: group.applicantId,
            applicantName: group.applicantName,
            isMultipleUser: group.items.length > 1,
            amount: item.amount,
            items: [item],
            itemInfo: item,
            breakdown: calculateDenominations(item.amount)
          });
        });
      }
    });

    return units;
  }, [groupedByApplicant, userCombineMap]);

  // 現在の金種合計
  const totalDenominations = useMemo(() => {
    const totals = {};
    DENOMINATIONS.forEach(d => totals[d.value] = 0);
    
    calculatedPayoutUnits.forEach(unit => {
      DENOMINATIONS.forEach(d => {
        totals[d.value] += unit.breakdown[d.value];
      });
    });
    
    return totals;
  }, [calculatedPayoutUnits]);

  // 完全分離（すべて個別）だった場合の金種合計（削減枚数の比較用）
  const fullySplitTotalCoins = useMemo(() => {
    let coinCount = 0;
    payouts.forEach(p => {
      const b = calculateDenominations(p.amount);
      DENOMINATIONS.forEach(d => {
        coinCount += b[d.value];
      });
    });
    return coinCount;
  }, [payouts]);

  // 現在の紙幣・硬貨の総枚数
  const currentTotalCoins = useMemo(() => {
    return Object.values(totalDenominations).reduce((sum, count) => sum + count, 0);
  }, [totalDenominations]);

  const savedCoinsCount = fullySplitTotalCoins - currentTotalCoins;

  // 総出金額
  const totalAmount = useMemo(() => {
    return payouts.reduce((sum, p) => sum + p.amount, 0);
  }, [payouts]);

  // 金種メモをクリップボードにコピー
  const handleCopyMemo = () => {
    let text = `【金種計算結果 - 現金準備用】\n`;
    text += `総出金額: ¥${totalAmount.toLocaleString()} (合計 ${currentTotalCoins}枚)\n`;
    text += `対象者数: ${groupedByApplicant.length}名 (申請 ${payouts.length}件)\n`;
    text += `----------------------------------------\n`;
    DENOMINATIONS.forEach(d => {
      if (totalDenominations[d.value] > 0) {
        text += `${d.label.padEnd(6, ' ')}: ${String(totalDenominations[d.value]).padStart(3, ' ')}枚 (¥${(d.value * totalDenominations[d.value]).toLocaleString()})\n`;
      }
    });
    text += `----------------------------------------\n`;
    text += `【受取内訳】\n`;
    calculatedPayoutUnits.forEach(u => {
      if (u.isGroup) {
        text += `・${u.applicantName}: ¥${u.amount.toLocaleString()} (合算 ${u.items.length}件)\n`;
      } else {
        text += `・${u.applicantName}: ¥${u.amount.toLocaleString()} (${u.itemInfo.title} / ${u.itemInfo.type})\n`;
      }
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="calc-container fade-in">
      <PageHeader 
        title={<><CalcIcon size={20} className="header-icon" /> 金種計算（現金準備用）</>} 
        backTo="/top" 
      />

      <main className="calc-content">
        {error && <div className="p-4 bg-white rounded shadow text-red-500 mb-4">{error}</div>}

        {/* 離結合コントロールバー */}
        {!isLoading && payouts.length > 0 && (
          <div className="calc-controls-card">
            <div className="controls-info">
              <span className="controls-title">
                <Users size={18} className="text-blue-600" />
                同一人物の精算まとめ設定
              </span>
              <span className="controls-desc">
                {multipleApplicantsCount > 0 ? (
                  <>同一人物による複数申請が <strong>{multipleApplicantsCount}名</strong> あります。合算して封筒を1つにまとめるか、案件ごとに分けるかを選択できます。</>
                ) : (
                  <>現在、複数申請のある人物はいません（全件個別の対象者です）。</>
                )}
              </span>
            </div>

            {multipleApplicantsCount > 0 && (
              <div className="controls-buttons">
                <button
                  type="button"
                  className="control-btn combine-btn"
                  onClick={handleCombineAll}
                  title="すべての同一人物を合算して計算します"
                >
                  <Link2 size={16} />
                  全員まとめて合算
                </button>
                <button
                  type="button"
                  className="control-btn split-btn"
                  onClick={handleSplitAll}
                  title="すべての申請を案件ごとに個別に計算します"
                >
                  <Unlink size={16} />
                  全員個別に分離
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="calc-grid">
          
          {/* 左カラム: 金種集計サマリー */}
          <div className="calc-section summary-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, padding: 0, border: 'none' }}>必要な金種合計</h2>
              <button 
                type="button" 
                onClick={handleCopyMemo}
                className="copy-memo-btn"
                title="両替メモをクリップボードにコピー"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copied ? 'コピー完了' : 'メモをコピー'}</span>
              </button>
            </div>

            <div className="total-amount-display">
              <span className="total-label">総出金額</span>
              <span className="total-value">¥{totalAmount.toLocaleString()}</span>
              <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.9 }}>
                紙幣・硬貨 合計: <strong>{currentTotalCoins}</strong> 枚
              </div>
            </div>

            {/* 削減枚数メリットバッジ */}
            {savedCoinsCount > 0 && (
              <div className="saved-coins-banner">
                <span className="saved-icon">✨</span>
                <span>同一人物の結合により、紙幣・硬貨が <strong>{savedCoinsCount}枚</strong> 削減されています</span>
              </div>
            )}
            
            <div className="denominations-list">
              {DENOMINATIONS.map(denom => (
                <div key={denom.value} className="denom-item">
                  <span className="denom-label">{denom.label}</span>
                  <span className="denom-count">
                    <strong>{totalDenominations[denom.value]}</strong> 枚
                  </span>
                  <span className="denom-subtotal">
                    ¥{(denom.value * totalDenominations[denom.value]).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 右カラム: 精算対象者一覧（結合/分離カード） */}
          <div className="calc-section details-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, padding: 0, border: 'none' }}>
                精算対象者内訳 ({groupedByApplicant.length}名 / 申請{payouts.length}件)
              </h2>
            </div>

            {isLoading ? (
              <div className="text-gray-500 p-4">読み込み中...</div>
            ) : payouts.length === 0 ? (
              <div className="text-gray-500 p-4">現在、現金払い出しが必要な申請はありません。</div>
            ) : (
              <div className="payout-cards">
                {calculatedPayoutUnits.map(unit => {
                  return unit.isGroup ? (
                    // 【結合カード】同一人物の複数案件を合算
                    <div key={unit.key} className="payout-card group-card">
                      <div className="payout-header">
                        <div className="payout-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="payout-applicant font-bold">{unit.applicantName}</span>
                            <span className="combined-badge">
                              <Link2 size={12} />
                              {unit.items.length}件合算中
                            </span>
                          </div>
                          <span className="payout-id text-gray-500">
                            対象: {unit.items.map(i => `${i.id}(¥${i.amount.toLocaleString()})`).join(' + ')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span className="payout-amount">¥{unit.amount.toLocaleString()}</span>
                          <button
                            type="button"
                            className="split-toggle-btn"
                            onClick={() => toggleUserCombine(unit.applicantId)}
                            title="この人の申請を個別に分けます"
                          >
                            <Unlink size={14} />
                            個別に分ける
                          </button>
                        </div>
                      </div>

                      {/* 内訳案件リスト */}
                      <div className="group-items-list">
                        {unit.items.map(item => (
                          <div 
                            key={item.id} 
                            className="group-item-row"
                            onClick={() => navigate(`/applications/${item.originalId}`)}
                            title="申請詳細を開く"
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="item-id font-mono text-xs">{item.id}</span>
                              <span className="item-type-badge text-xs">{item.type}</span>
                              <span className="item-title text-sm">{item.title}</span>
                            </div>
                            <span className="item-amount font-mono text-sm">¥{item.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      {/* 金種内訳 */}
                      <div className="payout-breakdown">
                        <span className="breakdown-title">準備金種:</span>
                        {DENOMINATIONS.filter(d => unit.breakdown[d.value] > 0).map(d => (
                          <span key={d.value} className="breakdown-pill">
                            {d.label} × {unit.breakdown[d.value]}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // 【個別カード】案件ごとの精算
                    <div key={unit.key} className="payout-card single-card">
                      <div className="payout-header">
                        <div className="payout-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="payout-applicant">{unit.applicantName}</span>
                            {unit.isMultipleUser && (
                              <span className="separate-badge">
                                <Unlink size={12} />
                                個別計算中
                              </span>
                            )}
                          </div>
                          <span className="payout-id">
                            {unit.itemInfo.id} ({unit.itemInfo.type}) - {unit.itemInfo.title}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span className="payout-amount">¥{unit.amount.toLocaleString()}</span>
                          {unit.isMultipleUser && (
                            <button
                              type="button"
                              className="combine-toggle-btn"
                              onClick={() => toggleUserCombine(unit.applicantId)}
                              title="この人のすべての申請を合算して計算します"
                            >
                              <Link2 size={14} />
                              まとめて合算
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="payout-breakdown">
                        <span className="breakdown-title">準備金種:</span>
                        {DENOMINATIONS.filter(d => unit.breakdown[d.value] > 0).map(d => (
                          <span key={d.value} className="breakdown-pill">
                            {d.label} × {unit.breakdown[d.value]}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default Calculator;
