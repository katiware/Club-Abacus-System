import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator as CalcIcon } from 'lucide-react';
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
  
  // Mock data of approved reimbursements that need cash payout
  const [payouts] = useState([
    { id: 'EXP-0980', applicant: '山田 太郎', amount: 13450 },
    { id: 'EXP-0985', applicant: '佐藤 花子', amount: 8320 },
    { id: 'EXP-0991', applicant: '鈴木 一郎', amount: 25000 },
  ]);

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
    <div className="calc-container">
      <header className="calc-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          <ArrowLeft size={20} />
          ダッシュボードへ戻る
        </button>
        <h1><CalcIcon size={20} className="header-icon" /> 金種計算（出金準備）</h1>
      </header>

      <main className="calc-content">
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
            <h2>精算対象者内訳</h2>
            <div className="payout-cards">
              {payouts.map(payout => {
                const breakdown = calculateDenominations(payout.amount);
                return (
                  <div key={payout.id} className="payout-card">
                    <div className="payout-header">
                      <div className="payout-info">
                        <span className="payout-applicant">{payout.applicant}</span>
                        <span className="payout-id">{payout.id}</span>
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
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default Calculator;
