import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, FileText, AlertTriangle, AlertCircle, CheckCircle, Clock, Info, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './TopPage.css';

function FiscalYearDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState({
    pendingCount: 0,
    waitingConfirmationCount: 0,
    settledCount: 0,
    draftCount: 0,
    overdueCount: 0,
    budgetBalance: 0,
    effectiveBalance: 0,
    isBudgetOver: false,
    isPendingOver: false,
    unfinalizedCount: 0,
    yearName: '',
    totalBudget: 0,
    settledTotal: 0,
    approvedTotal: 0,
    pendingTotal: 0,
    futureRecurringTotal: 0,
    totalRequestsCount: 0,
    totalRequestsCount: 0,
    categoryTotals: {},
    externalBudgetTotal: 0,
    externalBudgetUsedTotal: 0
  });

  const [externalBudgets, setExternalBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const [sumRes, extRes] = await Promise.all([
          api.get(`/Expense/summary?viewMode=all&fiscalYearId=${id}`),
          api.get(`/ExternalBudget?fiscalYearId=${id}`)
        ]);
        setSummaryData(sumRes.data);
        setExternalBudgets(extRes.data || []);
      } catch (err) {
        console.error('Failed to fetch summary data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [id]);

  const { 
    pendingCount, 
    waitingConfirmationCount, 
    settledCount,
    draftCount,
    budgetBalance, 
    effectiveBalance,
    isBudgetOver,
    isPendingOver,
    yearName, 
    totalBudget, 
    settledTotal, 
    approvedTotal,
    pendingTotal,
    futureRecurringTotal,
    totalRequestsCount, 
    categoryTotals 
  } = summaryData;

  const totalCommitted = (settledTotal || 0) + (approvedTotal || 0) + (futureRecurringTotal || 0);
  const usagePercent = totalBudget > 0 ? Math.min(Math.round((totalCommitted / totalBudget) * 100), 100) : 0;
  const rawPercent = totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0;

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="top-page-container fade-in">
      <PageHeader title={`${yearName || '年度'} 予算・実績ダッシュボード`} backTo="/fiscal-years" />

      <main className="top-page-content" style={{ marginTop: '20px' }}>
        
        {/* 予算超過アラートバナー */}
        {isBudgetOver && (
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <AlertCircle size={28} className="text-red-600 flex-shrink-0" />
            <div>
              <h4 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: '0 0 4px 0' }}>⚠️ 予算超過警告（予算上限を超えています）</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                確定支出 ＋ 承認済枠 ＋ 定期支払い見込の合計（¥{totalCommitted.toLocaleString()}）が、年度予算総額（¥{totalBudget.toLocaleString()}）を超過しています。新規の承認を控えるか、追加予算の調整を行ってください。
              </p>
            </div>
          </div>
        )}

        {!isBudgetOver && isPendingOver && (
          <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', padding: '16px 20px', borderRadius: '10px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <AlertTriangle size={26} className="text-amber-600 flex-shrink-0" />
            <div>
              <h4 style={{ fontWeight: 'bold', fontSize: '1.05rem', margin: '0 0 4px 0' }}>注意: 申請中の案件を含めると予算を超過する可能性があります</h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                現在承認待ちの申請（合計 ¥{pendingTotal.toLocaleString()}）をすべて承認すると、年度予算の上限を超える見込みです。承認時に優先順位を確認してください。
              </p>
            </div>
          </div>
        )}

        <section className="dashboard-section">
          
          {/* 予算消化バー */}
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>部費予算消化率</span>
                <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: rawPercent > 100 ? '#dc2626' : '#111827' }}>
                  {rawPercent}% <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 'normal' }}>({totalCommitted.toLocaleString()} / {totalBudget.toLocaleString()} 円)</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>実質利用可能残高</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: effectiveBalance < 0 ? '#dc2626' : '#059669' }}>
                  ¥{effectiveBalance.toLocaleString()}
                </div>
              </div>
            </div>

            {/* プログレスバー */}
            <div style={{ height: '14px', backgroundColor: '#e5e7eb', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
              <div 
                style={{ 
                  width: `${totalBudget > 0 ? Math.min((settledTotal / totalBudget) * 100, 100) : 0}%`, 
                  backgroundColor: '#10b981', 
                  transition: 'width 0.4s' 
                }} 
                title={`確定支出: ¥${settledTotal.toLocaleString()}`}
              />
              <div 
                style={{ 
                  width: `${totalBudget > 0 ? Math.min((approvedTotal / totalBudget) * 100, 100) : 0}%`, 
                  backgroundColor: '#3b82f6', 
                  transition: 'width 0.4s' 
                }} 
                title={`事前承認済枠: ¥${approvedTotal.toLocaleString()}`}
              />
              <div 
                style={{ 
                  width: `${totalBudget > 0 ? Math.min((futureRecurringTotal / totalBudget) * 100, 100) : 0}%`, 
                  backgroundColor: '#8b5cf6', 
                  transition: 'width 0.4s' 
                }} 
                title={`定期支払い見込: ¥${futureRecurringTotal.toLocaleString()}`}
              />
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '0.85rem', color: '#4b5563', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                確定支出: ¥{(settledTotal || 0).toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                承認済枠: ¥{(approvedTotal || 0).toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                定期支払予定: ¥{(futureRecurringTotal || 0).toLocaleString()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#e5e7eb' }} />
                未枠残高: ¥{(Math.max(0, effectiveBalance)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* 主要メトリクスグリッド */}
          <div className="dashboard-grid">
            <div className="dashboard-card primary">
              <div className="card-icon"><Calculator size={24} /></div>
              <div className="card-content">
                <h3>部費残高 (確定ベース)</h3>
                <p className="amount">¥{budgetBalance.toLocaleString()}</p>
                <span className="subtitle">予算総額: ¥{totalBudget.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="dashboard-card" style={{ backgroundColor: '#e6fcf5', borderLeft: '4px solid #12b886' }}>
              <div className="card-icon" style={{ backgroundColor: '#c3fae8', color: '#0ca678' }}><FileText size={24} /></div>
              <div className="card-content">
                <h3>精算完了・確定支出</h3>
                <p className="amount" style={{ color: '#0ca678' }}>¥{settledTotal.toLocaleString()}</p>
                <span className="subtitle">精算済件数: {settledCount}件</span>
              </div>
            </div>

            <div className="dashboard-card warning">
              <div className="card-icon"><AlertTriangle size={24} /></div>
              <div className="card-content">
                <h3>要対応の申請</h3>
                <p className="amount">{pendingCount + waitingConfirmationCount}件</p>
                <span className="subtitle">承認待ち: {pendingCount}件 / 証憑確認待ち: {waitingConfirmationCount}件</span>
              </div>
            </div>
          </div>

          {/* 申請件数サマリーバー */}
          <div style={{ marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div style={{ backgroundColor: '#f9fafb', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>総申請件数</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#111827' }}>{totalRequestsCount} 件</div>
            </div>
            <div style={{ backgroundColor: '#fffbeb', padding: '14px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.8rem', color: '#92400e' }}>承認待ち (要判定)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#d97706' }}>{pendingCount} 件</div>
            </div>
            <div style={{ backgroundColor: '#eff6ff', padding: '14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.8rem', color: '#1e40af' }}>証憑確認待ち</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2563eb' }}>{waitingConfirmationCount} 件</div>
            </div>
            <div style={{ backgroundColor: '#ecfdf5', padding: '14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.8rem', color: '#065f46' }}>精算完了</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#059669' }}>{settledCount} 件</div>
            </div>
          </div>

          {/* カテゴリ別支出集計 */}
          {categoryTotals && Object.keys(categoryTotals).length > 0 && (
            <div style={{ marginTop: '36px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1f2937', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} className="text-blue-600" />
                カテゴリ別使用実績
              </h3>
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {Object.entries(categoryTotals).map(([cat, total]) => {
                  const catPercent = totalCommitted > 0 ? Math.round((total / totalCommitted) * 100) : 0;
                  return (
                    <div key={cat} className="dashboard-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.95rem', color: '#374151', fontWeight: '600' }}>{cat}</span>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', backgroundColor: '#f3f4f6', padding: '2px 8px', borderRadius: '10px' }}>{catPercent}%</span>
                      </div>
                      <span style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827' }}>¥{total.toLocaleString()}</span>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${catPercent}%`, height: '100%', backgroundColor: '#3b82f6' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 部費外予算（特別予算・自己負担等）の消化状況 */}
          {externalBudgets && externalBudgets.length > 0 && (
            <div style={{ marginTop: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calculator size={20} className="text-pink-600" />
                  部費外予算（OB寄付金・特別助成等）の状況
                </h3>
                <button 
                  onClick={() => navigate('/fiscal-years')}
                  style={{ fontSize: '0.85rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  部費外予算の設定・追加
                </button>
              </div>

              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {externalBudgets.map(b => {
                  const usedPct = b.totalAmount > 0 ? Math.min(Math.round((b.usedAmount / b.totalAmount) * 100), 100) : 0;
                  return (
                    <div key={b.id} className="dashboard-card" style={{ padding: '20px', backgroundColor: 'white', borderTop: '4px solid #ec4899', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#111827' }}>{b.name}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#be185d', backgroundColor: '#fdf2f8', padding: '2px 8px', borderRadius: '12px' }}>
                          消化率 {usedPct}%
                        </span>
                      </div>
                      
                      {b.description && (
                        <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 12px 0' }}>{b.description}</p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>残高: </span>
                          <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#059669' }}>¥{(b.remainingAmount || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          枠: ¥{b.totalAmount.toLocaleString()}
                        </div>
                      </div>

                      <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${usedPct}%`, height: '100%', backgroundColor: '#ec4899', transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 補足ガイド */}
          <div style={{ marginTop: '36px', padding: '20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', fontWeight: 'bold', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={18} className="text-blue-500" />
              💡 予算管理・計算ルールについて
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#64748b', lineHeight: '1.6' }}>
              <li><strong>部費残高の計算基準:</strong> 各申請で「部費外充当」された金額は部費予算を消費しません。実質部費負担分のみが差し引かれます。</li>
              <li><strong>確定支出:</strong> 大学UNIPAへの申請が完了した申請、および部員への精算手渡しが完了した経費の実質部費負担合計です。</li>
              <li><strong>事前承認済枠:</strong> 事前承認され、部員による購入や証憑提出・精算を待っている経費の実質部費負担合計です。</li>
              <li><strong>定期支払予定:</strong> 登録されている有効な定期支払いテンプレートが今年度中に自動生成する見込み金額です。</li>
              <li><strong>大学却下時の予算復元:</strong> 大学への申請において不認可・却下となった場合、確保されていた部費予算は即座に解放（復活）されます。</li>
            </ul>
          </div>

        </section>
      </main>
    </div>
  );
}

export default FiscalYearDashboard;

