import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import CommunicationEntry from './CommunicationEntry';

const CommunicationTimeline = ({ communications, filters, onExport }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [expandedEntries, setExpandedEntries] = useState(new Set());
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const labels = {
    en: {
      communicationsTimeline: 'Communications Timeline',
      sortBy: 'Sort by',
      date: 'Date',
      type: 'Type',
      subject: 'Subject',
      participants: 'Participants',
      ascending: 'Ascending',
      descending: 'Descending',
      exportReport: 'Export Report',
      noCommunications: 'No communications found',
      noCommunicationsDesc: 'Try adjusting your filters or create a new communication.',
      loadMore: 'Load More',
      showingResults: 'Showing {count} of {total} communications'
    },
    es: {
      communicationsTimeline: 'Cronología de Comunicaciones',
      sortBy: 'Ordenar por',
      date: 'Fecha',
      type: 'Tipo',
      subject: 'Asunto',
      participants: 'Participantes',
      ascending: 'Ascendente',
      descending: 'Descendente',
      exportReport: 'Exportar Reporte',
      noCommunications: 'No se encontraron comunicaciones',
      noCommunicationsDesc: 'Intenta ajustar tus filtros o crear una nueva comunicación.',
      loadMore: 'Cargar Más',
      showingResults: 'Mostrando {count} de {total} comunicaciones'
    }
  };

  const t = labels?.[currentLanguage];

  const sortOptions = [
    { value: 'date', label: t?.date },
    { value: 'type', label: t?.type },
    { value: 'subject', label: t?.subject },
    { value: 'participants', label: t?.participants }
  ];

  const handleExpand = (communicationId) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded?.has(communicationId)) {
      newExpanded?.delete(communicationId);
    } else {
      newExpanded?.add(communicationId);
    }
    setExpandedEntries(newExpanded);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedCommunications = [...communications]?.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'type':
        aValue = a?.type;
        bValue = b?.type;
        break;
      case 'subject':
        aValue = a?.subject?.toLowerCase();
        bValue = b?.subject?.toLowerCase();
        break;
      case 'participants':
        aValue = a?.participants?.length;
        bValue = b?.participants?.length;
        break;
      default:
        aValue = a?.date;
        bValue = b?.date;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const groupCommunicationsByDate = (communications) => {
    const groups = {};
    
    communications?.forEach(comm => {
      const date = new Date(comm.date);
      const dateKey = date?.toDateString();
      
      if (!groups?.[dateKey]) {
        groups[dateKey] = [];
      }
      groups?.[dateKey]?.push(comm);
    });

    return groups;
  };

  const groupedCommunications = groupCommunicationsByDate(sortedCommunications);

  const formatDateGroup = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday?.setDate(yesterday?.getDate() - 1);

    if (date?.toDateString() === today?.toDateString()) {
      return currentLanguage === 'es' ? 'Hoy' : 'Today';
    } else if (date?.toDateString() === yesterday?.toDateString()) {
      return currentLanguage === 'es' ? 'Ayer' : 'Yesterday';
    } else {
      return new Intl.DateTimeFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })?.format(date);
    }
  };

  if (communications?.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Icon name="MessageSquare" size={64} className="mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t?.noCommunications}</h3>
          <p className="text-muted-foreground">{t?.noCommunicationsDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">{t?.communicationsTimeline}</h2>
        
        <div className="flex items-center space-x-4">
          {/* Sort Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">{t?.sortBy}:</span>
            <div className="flex items-center space-x-1">
              {sortOptions?.map((option) => (
                <Button
                  key={option?.value}
                  variant={sortBy === option?.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleSort(option?.value)}
                  iconName={sortBy === option?.value ? (sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown') : undefined}
                  iconPosition="right"
                >
                  {option?.label}
                </Button>
              ))}
            </div>
          </div>

          <Button variant="outline" iconName="Download" onClick={onExport}>
            {t?.exportReport}
          </Button>
        </div>
      </div>
      {/* Results Count */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {t?.showingResults?.replace('{count}', communications?.length)?.replace('{total}', communications?.length)}
        </p>
      </div>
      {/* Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedCommunications)?.map(([dateKey, dayComms]) => (
          <div key={dateKey}>
            {/* Date Header */}
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-32">
                <h3 className="text-lg font-semibold text-foreground">
                  {formatDateGroup(dateKey)}
                </h3>
              </div>
              <div className="flex-1 h-px bg-border ml-4"></div>
            </div>

            {/* Communications for this date */}
            <div className="space-y-4 ml-36">
              {dayComms?.map((communication) => (
                <CommunicationEntry
                  key={communication?.id}
                  communication={communication}
                  onExpand={handleExpand}
                  isExpanded={expandedEntries?.has(communication?.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunicationTimeline;