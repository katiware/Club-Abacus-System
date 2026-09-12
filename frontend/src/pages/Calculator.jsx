import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator as CalcIcon } from 'lucide-react';
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
        
        // 必要な情報だけをマッピング
        const mapped = needsCash.map(app => ({
          id: app.id.substring(0, 8),
          originalId: app.id,
          applicant: app.user?.name || '不明',
          amount: app.totalAmount,
          type: app.type === 'Advance' ? '事前出金' : '立替精算'
        }));
        
        setPayouts(mapped);
      } catch (err) {
        console.error('Failed to fetch payouts', err);
        setError('データの取得に失敗しました。管理者権限を確認してください。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayouts();
  }, []);

  // Calculate denominations for a specific amount
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

  // Calculate totals across all payouts
  const totalDenominations = useMemo(() => {
    const totals = {};
    DENOMINATIONS.forEach(d => totals[d.value] = 0);
    
    payouts.forEach(payout => {
      const breakdown = calculateDenominations(payout.amount);
      DENOMINATIONS.forEach(d => {
        totals[d.value] += breakdown[d.value];
      });
    });
    
    return totals;
  }, [payouts]);

  const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="calc-container fade-in">
      <PageHeader 
        title={<><CalcIcon size={20} className="header-icon" /> 金種計算（現金準備用）</>} 
        backTo="/top" 
      />

      <main className="calc-content">
        {error && <div className="p-4 bg-white rounded shadow text-red-500 mb-4">{error}</div>}
        
        <div className="calc-grid">
          
          <div className="calc-section summary-section">
            <h2>必要な金種合計</h2>
            <div className="total-amount-display">
              <span className="total-label">総出金額</span>
              <span className="total-value">¥{totalAmount.toLocaleString()}</span>
            </div>
            
            <div className="denominations-list">
              {DENOMINATIONS.map(denom => (
                <div key={denom.value} className="denom-item">
                  <span className="denom-label">{denom.label}</span>
                  <span className="denom-count">
                    <strong>{totalDenominations[denom.value]}</strong> 枚
                  </span>
                  <span className="denom-subtotal">
                    (¥{(denom.value * totalDenominations[denom.value]).toLocaleString()})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="calc-section details-section">
            <h2>精算対象者内訳 ({payouts.length}件)</h2>
            {isLoading ? (
              <div className="text-gray-500 p-4">読み込み中...</div>
            ) : payouts.length === 0 ? (
              <div className="text-gray-500 p-4">現在、現金払い出しが必要な申請はありません。</div>
            ) : (
              <div className="payout-cards">
                {payouts.map(payout => {
                  const breakdown = calculateDenominations(payout.amount);
                  return (
                    <div key={payout.id} className="payout-card" onClick={() => navigate(`/applications/${payout.originalId}`)}>
                      <div className="payout-header">
                        <div className="payout-info">
                          <span className="payout-applicant">{payout.applicant}</span>
                          <span className="payout-id">{payout.id} ({payout.type})</span>
                        </div>
                        <span className="payout-amount">¥{payout.amount.toLocaleString()}</span>
                      </div>
                      <div className="payout-breakdown">
                        {DENOMINATIONS.filter(d => breakdown[d.value] > 0).map(d => (
                          <span key={d.value} className="breakdown-pill">
                            {d.label} × {breakdown[d.value]}
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
