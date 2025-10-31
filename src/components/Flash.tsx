import React from 'react';

interface FlashProps {
  message: string;
  onRetry?: () => void;
  variant?: 'normal' | 'error';
}

export const Flash: React.FC<FlashProps> = ({ message, onRetry, variant = 'normal' }) => {
  const className = variant === 'error' ? 'flash-error' : 'flash-normal';
  const buttonClassName = variant === 'error' ? 'flash-error-button' : 'flash-normal-button';

  return (
    <div className={className}>
      {message}
      {onRetry && (
        <button onClick={onRetry} className={buttonClassName}>
          Riprova
        </button>
      )}
    </div>
  );
};
