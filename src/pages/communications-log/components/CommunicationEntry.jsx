import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const CommunicationEntry = ({ communication, currentLanguage, onView, onReply }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date?.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type) => {
    const icons = {
      email: 'Mail',
      whatsapp: 'MessageCircle',
      phone: 'Phone',
      meeting: 'Users',
      system: 'Bell'
    };
    return icons?.[type] || 'MessageSquare';
  };

  const getTypeColor = (type) => {
    const colors = {
      email: 'text-blue-600',
      whatsapp: 'text-green-600',
      phone: 'text-purple-600',
      meeting: 'text-orange-600',
      system: 'text-gray-600'
    };
    return colors?.[type] || 'text-gray-600';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      read: {
        color: 'bg-green-100 text-green-800',
        label: currentLanguage === 'es' ? 'Leído' : 'Read'
      },
      unread: {
        color: 'bg-blue-100 text-blue-800',
        label: currentLanguage === 'es' ? 'No Leído' : 'Unread'
      },
      replied: {
        color: 'bg-purple-100 text-purple-800',
        label: currentLanguage === 'es' ? 'Respondido' : 'Replied'
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        label: currentLanguage === 'es' ? 'Pendiente' : 'Pending'
      }
    };

    const config = statusConfig?.[status] || statusConfig?.unread;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const renderProductInfo = (products) => {
    if (!products || products?.length === 0) return null;

    return (
      <div className="mt-2 text-xs text-muted-foreground">
        <span className="font-medium">
          {currentLanguage === 'es' ? 'Productos relacionados:' : 'Related products:'}
        </span>
        <div className="mt-1 space-y-1">
          {products?.slice(0, 2)?.map((product, index) => (
            <div key={index} className="flex items-center justify-between">
              <span>{product?.name}</span>
              <span className="text-xs">
                {product?.packagingUnits} {currentLanguage === 'es' ? 'unidades' : 'units'}
              </span>
            </div>
          ))}
          {products?.length > 2 && (
            <div className="text-xs text-muted-foreground">
              +{products?.length - 2} {currentLanguage === 'es' ? 'más' : 'more'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-card border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
      communication?.status === 'unread' ? 'border-primary/30 bg-primary/5' : 'border-border'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 p-2 rounded-full bg-muted ${getTypeColor(communication?.type)}`}>
            <Icon name={getTypeIcon(communication?.type)} size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-foreground truncate">
                {communication?.subject}
              </h4>
              {getStatusBadge(communication?.status)}
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{communication?.from}</span>
              <span>•</span>
              <span>{formatDate(communication?.date)}</span>
              {communication?.hasAttachment && (
                <>
                  <span>•</span>
                  <Icon name="Paperclip" size={14} />
                </>
              )}
            </div>
            {communication?.relatedTo && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium">
                  {currentLanguage === 'es' ? 'Relacionado con:' : 'Related to:'}
                </span>
                <span className="ml-1">{communication?.relatedTo}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8"
          >
            <Icon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={16} />
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-3">
        <p className="text-sm text-foreground line-clamp-2">
          {communication?.preview}
        </p>
        {renderProductInfo(communication?.products)}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border pt-3 mt-3">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {communication?.content}
              </p>
            </div>

            {/* Attachments */}
            {communication?.attachments && communication?.attachments?.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">
                  {currentLanguage === 'es' ? 'Adjuntos' : 'Attachments'}
                </h5>
                <div className="space-y-2">
                  {communication?.attachments?.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        <Icon name="FileText" size={16} />
                        <span className="text-sm font-medium">{attachment?.name}</span>
                        <span className="text-xs text-muted-foreground">({attachment?.size})</span>
                      </div>
                      <Button variant="ghost" size="sm" iconName="Download">
                        {currentLanguage === 'es' ? 'Descargar' : 'Download'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(communication?.id)}
                iconName="Eye"
                iconPosition="left"
              >
                {currentLanguage === 'es' ? 'Ver Completo' : 'View Full'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReply(communication?.id)}
                iconName="Reply"
                iconPosition="left"
              >
                {currentLanguage === 'es' ? 'Responder' : 'Reply'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconName="Forward"
                iconPosition="left"
              >
                {currentLanguage === 'es' ? 'Reenviar' : 'Forward'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationEntry;