import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import './PageHeader.css';

export function PageHeader({ title, backTo, children }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="common-page-header">
      <div className="header-left">
        <button onClick={handleBack} className="header-btn back-btn">
          <ArrowLeft size={18} />
          戻る
        </button>
        <button onClick={() => navigate('/top')} className="header-btn home-btn" title="トップへ戻る">
          <Home size={18} />
          トップ
        </button>
        <h1>{title}</h1>
      </div>
      
      {children && (
        <div className="header-actions">
          {children}
        </div>
      )}
    </header>
  );
}
