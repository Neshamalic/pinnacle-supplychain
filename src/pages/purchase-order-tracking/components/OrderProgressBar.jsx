import React from 'react';

const OrderProgressBar = ({ status, currentLanguage }) => {
  const getProgressConfig = () => {
    switch (status) {
      case 'in-process':
        return {
          percentage: 33,
          color: 'bg-amber-500',
          bgColor: 'bg-amber-100'
        };
      case 'ready':
        return {
          percentage: 66,
          color: 'bg-green-500',
          bgColor: 'bg-green-100'
        };
      case 'shipped':
        return {
          percentage: 100,
          color: 'bg-purple-500',
          bgColor: 'bg-purple-100'
        };
      default:
        return {
          percentage: 0,
          color: 'bg-gray-500',
          bgColor: 'bg-gray-100'
        };
    }
  };

  const config = getProgressConfig();

  return (
    <div className="w-full">
      <div className={`w-full h-2 rounded-full ${config?.bgColor}`}>
        <div
          className={`h-2 rounded-full transition-all duration-300 ${config?.color}`}
          style={{ width: `${config?.percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{currentLanguage === 'es' ? 'Iniciado' : 'Started'}</span>
        <span>{currentLanguage === 'es' ? 'Listo' : 'Ready'}</span>
        <span>{currentLanguage === 'es' ? 'Enviado' : 'Shipped'}</span>
      </div>
    </div>
  );
};

export default OrderProgressBar;