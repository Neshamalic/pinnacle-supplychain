import React from 'react';
import Icon from '../../../components/AppIcon';

const MetricsCard = ({ title, value, subtitle, trend, trendValue, icon, color = 'blue', alert = false }) => {
  const getColorClasses = () => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-800',
      green: 'bg-green-50 border-green-200 text-green-800',
      amber: 'bg-amber-50 border-amber-200 text-amber-800',
      red: 'bg-red-50 border-red-200 text-red-800'
    };
    return colors?.[color] || colors?.blue;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return 'TrendingUp';
    if (trend === 'down') return 'TrendingDown';
    return 'Minus';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className={`relative p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${getColorClasses()}`}>
      {alert && (
        <div className="absolute -top-2 -right-2">
          <div className="flex items-center justify-center w-6 h-6 bg-red-500 rounded-full">
            <Icon name="AlertTriangle" size={14} color="white" />
          </div>
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        
        <div className="flex flex-col items-end space-y-2">
          <div className={`p-2 rounded-lg ${color === 'blue' ? 'bg-blue-100' : color === 'green' ? 'bg-green-100' : color === 'amber' ? 'bg-amber-100' : 'bg-red-100'}`}>
            <Icon name={icon} size={20} className={color === 'blue' ? 'text-blue-600' : color === 'green' ? 'text-green-600' : color === 'amber' ? 'text-amber-600' : 'text-red-600'} />
          </div>
          
          {trend && trendValue && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              <Icon name={getTrendIcon()} size={14} />
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsCard;