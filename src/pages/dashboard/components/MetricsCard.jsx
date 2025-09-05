import React from 'react';
import Icon from '../../../components/AppIcon';

const MetricsCard = ({ title, value, subtitle, icon, trend, color = 'blue', onClick }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-emerald-50',
          icon: 'bg-emerald-100 text-emerald-600',
          text: 'text-emerald-600',
          border: 'border-emerald-200'
        };
      case 'yellow':
        return {
          bg: 'bg-amber-50',
          icon: 'bg-amber-100 text-amber-600',
          text: 'text-amber-600',
          border: 'border-amber-200'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          icon: 'bg-red-100 text-red-600',
          text: 'text-red-600',
          border: 'border-red-200'
        };
      default:
        return {
          bg: 'bg-blue-50',
          icon: 'bg-blue-100 text-blue-600',
          text: 'text-blue-600',
          border: 'border-blue-200'
        };
    }
  };

  const colors = getColorClasses();

  return (
    <div 
      className={`${colors?.bg} ${colors?.border} border rounded-lg p-6 cursor-pointer hover:shadow-md transition-all duration-200`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className={`${colors?.icon} p-3 rounded-lg`}>
          <Icon name={icon} size={24} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <Icon 
            name={trend?.direction === 'up' ? 'TrendingUp' : 'TrendingDown'} 
            size={16} 
            className={trend?.direction === 'up' ? 'text-emerald-500' : 'text-red-500'}
          />
          <span className={`ml-1 text-sm ${trend?.direction === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend?.value}
          </span>
          <span className="ml-1 text-sm text-slate-500">{trend?.label}</span>
        </div>
      )}
    </div>
  );
};

export default MetricsCard;