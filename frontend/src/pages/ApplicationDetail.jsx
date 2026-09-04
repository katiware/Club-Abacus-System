import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileImage, Download, Clock } from 'lucide-react';
import './ApplicationDetail.css';

function ApplicationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Mock application data
  const app = {
    id: id || 'EXP-1001',
    applicant: '山田 太郎',
    title: 'AWSサーバー代 (8月分)',
    amount: 12500,
    type: '立替払い',
    method: 'Web購入',
    category: 'サーバー・インフラ',
    date: '2026-08-09',
    description: '部室のWebサーバーおよびデータベースサーバーの今月分の利用料です。',
    status: 'WAITING_CONFIRMATION',
    receiptUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    history: [
      { date: '2026-08-09 10:00', action: '申請作成', user: '山田 太郎' },
      { date: '2026-08-09 15:30', action: '承認完了', user: '佐藤 管理者' },
      { date: '2026-08-10 09:15', action: '領収書アップロード', user: '山田 太郎' },
    ]
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL': return <span className="detail-status status-pending">承認待ち</span>;
      case 'WAITING_CONFIRMATION': return <span className="detail-status status-waiting">最終確認待</span>;
      case 'COMPLETED': return <span className="detail-status status-completed">完了</span>;
      default: return <span className="detail-status">{status}</span>;
    }
  };

  return (
    <div className="application-detail-container fade-in">
      <header className="page-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeft size={20} />
          戻る
        </button>
        <h1>申請詳細 ({app.id})</h1>
        <div className="header-spacer"></div>
        {renderStatusBadge(app.status)}
      </header>

      <main className="detail-layout">
        <div className="detail-main-col">
          <section className="detail-card">
            <h2>基本情報</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">申請者</span>
                <span className="info-value">{app.applicant}</span>
              </div>
              <div className="info-item">
                <span className="info-label">申請日</span>
                <span className="info-value">{app.date}</span>
              </div>
              <div className="info-item">
                <span className="info-label">カテゴリ</span>
                <span className="info-value">{app.category}</span>
              </div>
              <div className="info-item">
                <span className="info-label">区分 / 方法</span>
                <span className="info-value">{app.type} / {app.method}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">用途・品目</span>
                <span className="info-value large-text">{app.title}</span>
              </div>
              <div className="info-item full-width amount-highlight">
                <span className="info-label">申請金額</span>
                <span className="info-value amount-text">¥{app.amount.toLocaleString()}</span>
              </div>
              <div className="info-item full-width">
                <span className="info-label">詳細説明</span>
                <span className="info-value desc-text">{app.description}</span>
              </div>
            </div>

            <div className="action-buttons-row">
              {app.status === 'WAITING_CONFIRMATION' && (
                <>
                  <button className="btn-approve">
                    <CheckCircle size={18} />
                    証憑を確認して完了する
                  </button>
                  <button className="btn-reject">
                    <XCircle size={18} />
                    不備として差し戻す
                  </button>
                </>
              )}
            </div>
          </section>

          <section className="detail-card mt-4">
            <h2><Clock size={18} className="inline-icon" /> 処理履歴</h2>
            <div className="history-timeline">
              {app.history.map((h, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <div className="timeline-action">{h.action}</div>
                    <div className="timeline-meta">{h.date} - {h.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="detail-side-col">
          <section className="detail-card receipt-card">
            <div className="card-header-flex">
              <h2><FileImage size={18} className="inline-icon" /> 証憑 (領収書)</h2>
              <button className="icon-btn" title="ダウンロード"><Download size={18} /></button>
            </div>
            <div className="receipt-preview">
              {app.receiptUrl ? (
                <img src={app.receiptUrl} alt="領収書プレビュー" className="receipt-img" />
              ) : (
                <div className="no-receipt">未提出、または実店舗（紙）での提出</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ApplicationDetail;
