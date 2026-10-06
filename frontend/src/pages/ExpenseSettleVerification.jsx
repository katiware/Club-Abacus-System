import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';
import api from '../services/api';

function ExpenseSettleVerification() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docBlobs, setDocBlobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/Expense/${id}`);
      setApp(res.data);
      if (res.data.expenseDocuments) {
        setDocuments(res.data.expenseDocuments);
        loadPreviews(res.data.expenseDocuments);
        if (res.data.expenseDocuments.length > 0) {
          setActiveDoc(res.data.expenseDocuments[0]);
        }
      }
    } catch (err) {
      console.error(err);
      alert('データ取得エラー');
    } finally {
      setLoading(false);
    }
  };

  const loadPreviews = async (docs) => {
    const blobs = {};
    for (const doc of docs) {
      try {
        const blobRes = await api.get(`/expenses/${id}/documents/${doc.id}/file`, { responseType: 'blob' });
        blobs[doc.id] = URL.createObjectURL(blobRes.data);
      } catch (e) {
        console.error(e);
      }
    }
    setDocBlobs(blobs);
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async (newStatus) => {
    try {
      await api.put(`/Expense/${id}/confirm`, { status: newStatus });
      alert('精算を完了しました。');
      navigate('/admin');
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data || 'エラーが発生しました。');
    }
  };

  const handleRemand = async () => {
    const reason = window.prompt('差し戻し理由を入力してください:');
    if (!reason) return;
    try {
      await api.post(`/Expense/${id}/remand`, { reason });
      alert('差し戻しました。');
      navigate('/admin');
    } catch (err) {
      alert('エラーが発生しました。');
    }
  };

  if (loading) return <div style={{padding: '20px'}}>読み込み中...</div>;
  if (!app) return <div style={{padding: '20px'}}>データがありません。</div>;

  const isPdf = activeDoc && activeDoc.contentType === 'application/pdf';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <header style={{ backgroundColor: 'white', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4b5563' }}>
            <ArrowLeft size={20} style={{ marginRight: '4px' }} /> 戻る
          </button>
          <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 'bold' }}>証憑と最終金額の照合・精算確認</h1>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 左側: 証憑ビューア */}
        <div style={{ flex: '1', backgroundColor: '#374151', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {documents.length > 0 ? (
            <>
              <div style={{ padding: '12px', display: 'flex', gap: '8px', overflowX: 'auto', backgroundColor: '#1f2937' }}>
                {documents.map((doc, idx) => (
                  <button 
                    key={doc.id}
                    onClick={() => setActiveDoc(doc)}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: activeDoc?.id === doc.id ? '#4f46e5' : '#4b5563', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    証憑 {idx + 1}: {doc.originalFileName}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                {activeDoc && docBlobs[activeDoc.id] ? (
                  isPdf ? (
                    <iframe 
                      src={`${docBlobs[activeDoc.id]}#toolbar=0`} 
                      style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'white' }} 
                      title="PDF Preview"
                    />
                  ) : (
                    <img 
                      src={docBlobs[activeDoc.id]} 
                      alt="Receipt" 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                    />
                  )
                ) : (
                  <div style={{ color: 'white' }}>読み込み中またはプレビュー不可...</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
              <div>
                <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>アップロードされた証憑はありません（紙提出など）</p>
              </div>
            </div>
          )}
        </div>

        {/* 右側: 申請情報とアクション */}
        <div style={{ width: '450px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e5e7eb', overflowY: 'auto' }}>
          <div style={{ padding: '24px', flex: 1 }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' }}>申請データ</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>申請者</div>
              <div style={{ fontWeight: 'bold' }}>{app.user?.name || '不明'}</div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '4px' }}>申請タイトル</div>
              <div style={{ fontWeight: 'bold' }}>{app.title}</div>
            </div>

            <div style={{ marginBottom: '20px', backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '4px' }}>最終確定金額 (左の証憑と合致しているか確認)</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>
                ¥{app.totalAmount?.toLocaleString()}
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginTop: '24px', marginBottom: '12px' }}>明細</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {app.expenseItems?.map((item, idx) => (
                <div key={idx} style={{ padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.itemName}</div>
                  <div style={{ color: '#4b5563', fontSize: '0.9rem' }}>金額: ¥{item.unitPrice?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '24px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px', textAlign: 'center' }}>
              証憑の金額と上記の金額が一致していることを確認し、精算を完了してください。
            </p>
            <button 
              onClick={() => handleAction('Settled')}
              style={{ width: '100%', padding: '14px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '12px' }}
            >
              <CheckCircle size={20} /> 金額ヨシ！精算を完了する
            </button>
            <button 
              onClick={handleRemand}
              style={{ width: '100%', padding: '14px', backgroundColor: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <AlertCircle size={20} /> 金額が合わないため差し戻す
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpenseSettleVerification;
