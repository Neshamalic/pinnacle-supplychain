import React from 'react';
import Icon from '../../../components/AppIcon';

const ImportStatusCard = ({ title, value, subtitle, icon, color, trend }) => {
  const getColorClasses = (colorType) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200'
    };
    return colors?.[colorType] || colors?.blue;
  };

  const getTrendIcon = () => {
    if (trend > 0) return { name: 'TrendingUp', color: 'text-green-600' };
    if (trend < 0) return { name: 'TrendingDown', color: 'text-red-600' };
    return { name: 'Minus', color: 'text-gray-500' };
  };

  const trendIcon = getTrendIcon();

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
          <Icon name={icon} size={24} />
        </div>
        {trend !== undefined && (
          <div className="flex items-center space-x-1">
            <Icon name={trendIcon?.name} size={16} className={trendIcon?.color} />
            <span className={`text-sm font-medium ${trendIcon?.color}`}>
              {Math.abs(trend)}%
            </span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{value}</h3>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-secondary">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default ImportStatusCard;