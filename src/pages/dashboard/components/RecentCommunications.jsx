import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const RecentCommunications = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const communications = [
    {
      id: 1,
      type: 'Email',
      subject: currentLanguage === 'es' ? 'Actualización Estado Manufactura - TND-2024-001' : 'Manufacturing Status Update - TND-2024-001',
      sender: 'Rajesh Kumar',
      company: 'Pinnacle Life Science India',
      timestamp: '2024-08-08 14:30',
      hasAttachment: true,
      priority: 'high',
      relatedTo: 'TND-2024-001'
    },
    {
      id: 2,
      type: 'WhatsApp',
      subject: currentLanguage === 'es' ? 'Confirmación Embarque Aéreo' : 'Air Shipment Confirmation',
      sender: 'María González',
      company: 'Agente Aduanas Chile',
      timestamp: '2024-08-08 13:15',
      hasAttachment: false,
      priority: 'medium',
      relatedTo: 'IMP-2024-008'
    },
    {
      id: 3,
      type: 'Phone',
      subject: currentLanguage === 'es' ? 'Llamada - Retraso en QC Lote #4521' : 'Call - QC Delay Batch #4521',
      sender: 'Dr. Priya Sharma',
      company: 'Quality Control Dept.',
      timestamp: '2024-08-08 11:45',
      hasAttachment: false,
      priority: 'high',
      relatedTo: 'QC-2024-015'
    },
    {
      id: 4,
      type: 'Email',
      subject: currentLanguage === 'es' ? 'Documentos Exportación Listos' : 'Export Documents Ready',
      sender: 'Carlos Mendoza',
      company: 'Logistics Coordinator',
      timestamp: '2024-08-08 10:20',
      hasAttachment: true,
      priority: 'medium',
      relatedTo: 'EXP-2024-012'
    },
    {
      id: 5,
      type: 'Meeting',
      subject: currentLanguage === 'es' ? 'Reunión Planificación Q4 2024' : 'Q4 2024 Planning Meeting',
      sender: 'Ana Rodríguez',
      company: 'Supply Chain Manager',
      timestamp: '2024-08-07 16:00',
      hasAttachment: true,
      priority: 'low',
      relatedTo: 'PLAN-2024-Q4'
    }
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Email':
        return 'Mail';
      case 'WhatsApp':
        return 'MessageCircle';
      case 'Phone':
        return 'Phone';
      case 'Meeting':
        return 'Users';
      default:
        return 'MessageSquare';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-amber-600 bg-amber-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return currentLanguage === 'es' ? 'Hace unos minutos' : 'A few minutes ago';
    } else if (diffHours < 24) {
      return currentLanguage === 'es' ? `Hace ${diffHours}h` : `${diffHours}h ago`;
    } else {
      return date?.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {currentLanguage === 'es' ? 'Comunicaciones Recientes' : 'Recent Communications'}
        </h3>
        <Icon name="MessageSquare" size={20} className="text-slate-400" />
      </div>
      <div className="space-y-4">
        {communications?.map((comm) => (
          <div key={comm?.id} className="border border-slate-100 rounded-lg p-4 hover:bg-slate-50 transition-colors duration-200">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${getPriorityColor(comm?.priority)}`}>
                <Icon name={getTypeIcon(comm?.type)} size={16} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-slate-900 text-sm leading-tight pr-2">
                    {comm?.subject}
                  </h4>
                  {comm?.hasAttachment && (
                    <Icon name="Paperclip" size={14} className="text-slate-400 flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div>
                    <span className="font-medium">{comm?.sender}</span>
                    <span className="mx-1">•</span>
                    <span>{comm?.company}</span>
                  </div>
                  <span>{formatTimestamp(comm?.timestamp)}</span>
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {comm?.relatedTo}
                  </span>
                  <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                    {currentLanguage === 'es' ? 'Ver' : 'View'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-slate-100">
        <button className="w-full text-center text-blue-600 hover:text-blue-700 font-medium text-sm">
          {currentLanguage === 'es' ? 'Ver Todas las Comunicaciones' : 'View All Communications'}
        </button>
      </div>
    </div>
  );
};

export default RecentCommunications;