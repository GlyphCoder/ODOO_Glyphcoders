import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export default function Notification({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />;
      case 'error':
        return <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />;
      case 'warning':
        return <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />;
      default:
        return <Info size={20} style={{ color: 'var(--color-info)' }} />;
    }
  };

  return (
    <div className={`notification ${type}`}>
      {getIcon()}
      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
        {message}
      </span>
    </div>
  );
}
