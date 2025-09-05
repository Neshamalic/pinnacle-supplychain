import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuickActions = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const quickActions = [
    {
      id: 'new-tender',
      title: currentLanguage === 'es' ? 'Nueva Licitación' : 'New Tender',
      description: currentLanguage === 'es' ? 'Crear nueva licitación CENABAST' : 'Create new CENABAST tender',
      icon: 'FileText',
      color: 'blue',
      onClick: () => console.log('Navigate to new tender')
    },
    {
      id: 'register-import',
      title: currentLanguage === 'es' ? 'Registrar Importación' : 'Register Import',
      description: currentLanguage === 'es' ? 'Registrar nueva importación desde India' : 'Register new import from India',
      icon: 'Truck',
      color: 'green',
      onClick: () => console.log('Navigate to import registration')
    },
    {
      id: 'log-communication',
      title: currentLanguage === 'es' ? 'Registrar Comunicación' : 'Log Communication',
      description: currentLanguage === 'es' ? 'Agregar nueva comunicación al registro' : 'Add new communication to log',
      icon: 'MessageSquare',
      color: 'purple',
      onClick: () => console.log('Navigate to communication log')
    },
    {
      id: 'demand-forecast',
      title: currentLanguage === 'es' ? 'Actualizar Demanda' : 'Update Demand',
      description: currentLanguage === 'es' ? 'Registrar demanda mensual CENABAST' : 'Register monthly CENABAST demand',
      icon: 'TrendingUp',
      color: 'orange',
      onClick: () => console.log('Navigate to demand forecasting')
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50 hover:bg-blue-100',
          icon: 'bg-blue-100 text-blue-600',
          border: 'border-blue-200'
        };
      case 'green':
        return {
          bg: 'bg-emerald-50 hover:bg-emerald-100',
          icon: 'bg-emerald-100 text-emerald-600',
          border: 'border-emerald-200'
        };
      case 'purple':
        return {
          bg: 'bg-purple-50 hover:bg-purple-100',
          icon: 'bg-purple-100 text-purple-600',
          border: 'border-purple-200'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50 hover:bg-orange-100',
          icon: 'bg-orange-100 text-orange-600',
          border: 'border-orange-200'
        };
      default:
        return {
          bg: 'bg-slate-50 hover:bg-slate-100',
          icon: 'bg-slate-100 text-slate-600',
          border: 'border-slate-200'
        };
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {currentLanguage === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
        </h3>
        <Icon name="Zap" size={20} className="text-slate-400" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickActions?.map((action) => {
          const colors = getColorClasses(action?.color);
          
          return (
            <button
              key={action?.id}
              onClick={action?.onClick}
              className={`${colors?.bg} ${colors?.border} border rounded-lg p-4 text-left transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start space-x-3">
                <div className={`${colors?.icon} p-2 rounded-lg flex-shrink-0`}>
                  <Icon name={action?.icon} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 mb-1">
                    {action?.title}
                  </h4>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {action?.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            iconName="Download" 
            iconPosition="left"
            className="w-full"
          >
            {currentLanguage === 'es' ? 'Exportar Datos' : 'Export Data'}
          </Button>
          <Button 
            variant="outline" 
            iconName="Settings" 
            iconPosition="left"
            className="w-full"
          >
            {currentLanguage === 'es' ? 'Configuración' : 'Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;