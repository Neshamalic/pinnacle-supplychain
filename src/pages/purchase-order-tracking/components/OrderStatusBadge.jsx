import React from 'react';

const OrderStatusBadge = ({ status, type = 'manufacturing', currentLanguage }) => {
  const getStatusConfig = () => {
    if (type === 'manufacturing') {
      switch (status) {
        case 'in-process':
          return {
            labelEn: 'In Process',
            labelEs: 'En Proceso',
            className: 'bg-amber-100 text-amber-800 border-amber-200'
          };
        case 'ready':
          return {
            labelEn: 'Ready',
            labelEs: 'Listo',
            className: 'bg-green-100 text-green-800 border-green-200'
          };
        case 'shipped':
          return {
            labelEn: 'Shipped',
            labelEs: 'Enviado',
            className: 'bg-purple-100 text-purple-800 border-purple-200'
          };
        default:
          return {
            labelEn: 'Unknown',
            labelEs: 'Desconocido',
            className: 'bg-gray-100 text-gray-800 border-gray-200'
          };
      }
    } else if (type === 'qc') {
      switch (status) {
        case 'pending':
          return {
            labelEn: 'Pending',
            labelEs: 'Pendiente',
            className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
          };
        case 'approved':
          return {
            labelEn: 'Approved',
            labelEs: 'Aprobado',
            className: 'bg-green-100 text-green-800 border-green-200'
          };
        case 'rejected':
          return {
            labelEn: 'Rejected',
            labelEs: 'Rechazado',
            className: 'bg-red-100 text-red-800 border-red-200'
          };
        default:
          return {
            labelEn: 'Unknown',
            labelEs: 'Desconocido',
            className: 'bg-gray-100 text-gray-800 border-gray-200'
          };
      }
    } else if (type === 'transport') {
      switch (status) {
        case 'sea':
          return {
            labelEn: 'Sea',
            labelEs: 'Marítimo',
            className: 'bg-blue-100 text-blue-800 border-blue-200'
          };
        case 'air':
          return {
            labelEn: 'Air',
            labelEs: 'Aéreo',
            className: 'bg-sky-100 text-sky-800 border-sky-200'
          };
        default:
          return {
            labelEn: 'Unknown',
            labelEs: 'Desconocido',
            className: 'bg-gray-100 text-gray-800 border-gray-200'
          };
      }
    }
  };

  const config = getStatusConfig();
  const label = currentLanguage === 'es' ? config?.labelEs : config?.labelEn;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config?.className}`}>
      {label}
    </span>
  );
};

export default OrderStatusBadge;