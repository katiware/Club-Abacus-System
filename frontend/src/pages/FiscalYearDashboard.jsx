import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, FileText, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import api from '../services/api';
import './TopPage.css';

function FiscalYearDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summaryData, setSummaryData] = useState({
    pendingCount: 0,
    overdueCount: 0,
    budgetBalance: 0,
    unfinalizedCount: 0,
    yearName: '',
    totalBudget: 0,
    settledTotal: 0,
    totalRequestsCount: 0,
    categoryTotals: {}
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get(`/Expense/summary?viewMode=all&fiscalYearId=${id}`);
        setSummaryData(response.data);
      } catch (err) {
        console.error('Failed to fetch summary data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [id]);

  const { pendingCount, budgetBalance, yearName, totalBudget, settledTotal, totalRequestsCount, categoryTotals } = summaryData;

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="top-page-container fade-in">
      <PageHeader title={`${yearName} ダッシュボード`} backTo="/fiscal-years" />

      <main className="top-page-content" style={{ marginTop: '20px' }}>
        <section className="dashboard-section">
          
          <div className="dashboard-grid">
            <div className="dashboard-card primary">
              <div className="card-icon"><Calculator size={24} /></div>
              <div className="card-content">
                <h3>部費残高</h3>
                <p className="amount">¥{budgetBalance.toLocaleString()}</p>
                <span className="subtitle">予算総額: ¥{totalBudget.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="dashboard-card" style={{ backgroundColor: '#e6fcf5', borderLeft: '4px solid #12b886' }}>
              <div className="card-icon" style={{ backgroundColor: '#c3fae8', color: '#0ca678' }}><FileText size={24} /></div>
              <div className="card-content">
                <h3>確定済み支出</h3>
                <p className="amount" style={{ color: '#0ca678' }}>¥{settledTotal.toLocaleString()}</p>
                <span className="subtitle">総申請数: {totalRequestsCount}件</span>
              </div>
            </div>

            <div className="dashboard-card warning">
              <div className="card-icon"><AlertTriangle size={24} /></div>
              <div className="card-content">
                <h3>承認待ち</h3>
                <p className="amount">{pendingCount}件</p>
                <span className="subtitle">早めの対応をお願いします</span>
              </div>
            </div>
          </div>

          {categoryTotals && Object.keys(categoryTotals).length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#343a40', marginBottom: '16px' }}>カテゴリ別使用額</h3>
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {Object.entries(categoryTotals).map(([cat, total]) => (
                  <div key={cat} className="dashboard-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#6c757d', fontWeight: '500' }}>{cat}</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#212529' }}>¥{total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default FiscalYearDashboard;
