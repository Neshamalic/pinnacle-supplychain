import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const CommunicationFilters = ({ onFiltersChange, totalCount }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [filters, setFilters] = useState({
    searchQuery: '',
    communicationType: '',
    dateRange: '',
    participants: '',
    linkedEntity: '',
    hasAttachments: false,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const labels = {
    en: {
      filters: 'Filters',
      search: 'Search communications...',
      communicationType: 'Communication Type',
      allTypes: 'All Types',
      email: 'Email',
      whatsapp: 'WhatsApp',
      phone: 'Phone',
      meeting: 'Meeting',
      dateRange: 'Date Range',
      allDates: 'All Dates',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      last30Days: 'Last 30 Days',
      customRange: 'Custom Range',
      participants: 'Participants',
      allParticipants: 'All Participants',
      linkedEntity: 'Linked Entity',
      allEntities: 'All Entities',
      tenders: 'Tenders',
      orders: 'Purchase Orders',
      imports: 'Imports',
      hasAttachments: 'Has Attachments',
      startDate: 'Start Date',
      endDate: 'End Date',
      clearFilters: 'Clear Filters',
      totalResults: 'Total Results'
    },
    es: {
      filters: 'Filtros',
      search: 'Buscar comunicaciones...',
      communicationType: 'Tipo de Comunicación',
      allTypes: 'Todos los Tipos',
      email: 'Email',
      whatsapp: 'WhatsApp',
      phone: 'Teléfono',
      meeting: 'Reunión',
      dateRange: 'Rango de Fechas',
      allDates: 'Todas las Fechas',
      today: 'Hoy',
      thisWeek: 'Esta Semana',
      thisMonth: 'Este Mes',
      last30Days: 'Últimos 30 Días',
      customRange: 'Rango Personalizado',
      participants: 'Participantes',
      allParticipants: 'Todos los Participantes',
      linkedEntity: 'Entidad Vinculada',
      allEntities: 'Todas las Entidades',
      tenders: 'Licitaciones',
      orders: 'Órdenes de Compra',
      imports: 'Importaciones',
      hasAttachments: 'Tiene Archivos Adjuntos',
      startDate: 'Fecha de Inicio',
      endDate: 'Fecha de Fin',
      clearFilters: 'Limpiar Filtros',
      totalResults: 'Resultados Totales'
    }
  };

  const t = labels?.[currentLanguage];

  const communicationTypeOptions = [
    { value: '', label: t?.allTypes },
    { value: 'email', label: t?.email },
    { value: 'whatsapp', label: t?.whatsapp },
    { value: 'phone', label: t?.phone },
    { value: 'meeting', label: t?.meeting }
  ];

  const dateRangeOptions = [
    { value: '', label: t?.allDates },
    { value: 'today', label: t?.today },
    { value: 'thisWeek', label: t?.thisWeek },
    { value: 'thisMonth', label: t?.thisMonth },
    { value: 'last30Days', label: t?.last30Days },
    { value: 'custom', label: t?.customRange }
  ];

  const participantOptions = [
    { value: '', label: t?.allParticipants },
    { value: 'carlos.rodriguez@pinnacle.cl', label: 'Carlos Rodriguez' },
    { value: 'maria.gonzalez@pinnacle.cl', label: 'Maria Gonzalez' },
    { value: 'juan.silva@pinnacle.cl', label: 'Juan Silva' },
    { value: 'ana.martinez@pinnacle.cl', label: 'Ana Martinez' },
    { value: 'rajesh.kumar@pinnaclelife.in', label: 'Rajesh Kumar' },
    { value: 'priya.sharma@pinnaclelife.in', label: 'Priya Sharma' },
    { value: 'amit.patel@pinnaclelife.in', label: 'Amit Patel' }
  ];

  const linkedEntityOptions = [
    { value: '', label: t?.allEntities },
    { value: 'tenders', label: t?.tenders },
    { value: 'orders', label: t?.orders },
    { value: 'imports', label: t?.imports }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      searchQuery: '',
      communicationType: '',
      dateRange: '',
      participants: '',
      linkedEntity: '',
      hasAttachments: false,
      startDate: '',
      endDate: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="w-80 bg-card border-r border-border p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">{t?.filters}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          {t?.clearFilters}
        </Button>
      </div>
      <div className="space-y-6">
        {/* Search */}
        <div>
          <Input
            type="search"
            placeholder={t?.search}
            value={filters?.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e?.target?.value)}
            className="w-full"
          />
        </div>

        {/* Communication Type */}
        <div>
          <Select
            label={t?.communicationType}
            options={communicationTypeOptions}
            value={filters?.communicationType}
            onChange={(value) => handleFilterChange('communicationType', value)}
          />
        </div>

        {/* Date Range */}
        <div>
          <Select
            label={t?.dateRange}
            options={dateRangeOptions}
            value={filters?.dateRange}
            onChange={(value) => handleFilterChange('dateRange', value)}
          />
        </div>

        {/* Custom Date Range */}
        {filters?.dateRange === 'custom' && (
          <div className="space-y-4">
            <Input
              type="date"
              label={t?.startDate}
              value={filters?.startDate}
              onChange={(e) => handleFilterChange('startDate', e?.target?.value)}
            />
            <Input
              type="date"
              label={t?.endDate}
              value={filters?.endDate}
              onChange={(e) => handleFilterChange('endDate', e?.target?.value)}
            />
          </div>
        )}

        {/* Participants */}
        <div>
          <Select
            label={t?.participants}
            options={participantOptions}
            value={filters?.participants}
            onChange={(value) => handleFilterChange('participants', value)}
            searchable
          />
        </div>

        {/* Linked Entity */}
        <div>
          <Select
            label={t?.linkedEntity}
            options={linkedEntityOptions}
            value={filters?.linkedEntity}
            onChange={(value) => handleFilterChange('linkedEntity', value)}
          />
        </div>

        {/* Has Attachments */}
        <div>
          <Checkbox
            label={t?.hasAttachments}
            checked={filters?.hasAttachments}
            onChange={(e) => handleFilterChange('hasAttachments', e?.target?.checked)}
          />
        </div>

        {/* Results Count */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="MessageSquare" size={16} />
            <span>{t?.totalResults}: {totalCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationFilters;