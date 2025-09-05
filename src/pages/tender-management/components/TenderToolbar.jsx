import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TenderToolbar = ({
  selectedCount,
  totalCount,
  viewMode,
  onViewModeChange,
  onNewTender,
  onExport,
  onBulkAction,
  // 👇 NUEVO: métricas dinámicas
  stats = { active: 0, awarded: 0, inDelivery: 0, critical: 0 }
}) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const exportOptions = [
    {
      value: 'excel',
      label: currentLanguage === 'es' ? 'Exportar a Excel' : 'Export to Excel',
      icon: 'FileSpreadsheet'
    },
    {
      value: 'csv',
      label: currentLanguage === 'es' ? 'Exportar a CSV' : 'Export to CSV',
      icon: 'FileText'
    },
    {
      value: 'pdf',
      label: currentLanguage === 'es' ? 'Exportar a PDF' : 'Export to PDF',
      icon: 'FileDown'
    }
  ];

  const bulkActions = [
    {
      value: 'update_status',
      label: currentLanguage === 'es' ? 'Actualizar Estado' : 'Update Status',
      icon: 'Edit'
    },
    {
      value: 'assign_manager',
      label: currentLanguage === 'es' ? 'Asignar Gerente' : 'Assign Manager',
      icon: 'User'
    },
    {
      value: 'set_priority',
      label: currentLanguage === 'es' ? 'Establecer Prioridad' : 'Set Priority',
      icon: 'Flag'
    },
    {
      value: 'archive',
      label: currentLanguage === 'es' ? 'Archivar' : 'Archive',
      icon: 'Archive'
    }
  ];

  const handleExport = (format) => {
    onExport(format);
    setShowExportMenu(false);
  };

  const handleBulkAction = (action) => {
    onBulkAction(action);
    setShowBulkMenu(false);
  };

  // Asegura números válidos
  const safe = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
  const s = {
    active: safe(stats.active),
    awarded: safe(stats.awarded),
    inDelivery: safe(stats.inDelivery),
    critical: safe(stats.critical)
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        {/* Left Section - Results Info */}
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {currentLanguage === 'es'
              ? `Mostrando ${totalCount} licitaciones`
              : `Showing ${totalCount} tenders`}
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-primary">
                {selectedCount} {currentLanguage === 'es' ? 'seleccionadas' : 'selected'}
              </span>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  iconName="ChevronDown"
                  iconPosition="right"
                >
                  {currentLanguage === 'es' ? 'Acciones' : 'Actions'}
                </Button>

                {showBulkMenu && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-10">
                    {bulkActions.map((action) => (
                      <button
                        key={action.value}
                        onClick={() => handleBulkAction(action.value)}
                        className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Icon name={action.icon} size={16} className="mr-2" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={currentLanguage === 'es' ? 'Vista de tabla' : 'Table view'}
            >
              <Icon name="Table" size={16} />
            </button>
            <button
              onClick={() => onViewModeChange('card')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'card'
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={currentLanguage === 'es' ? 'Vista de tarjetas' : 'Card view'}
            >
              <Icon name="Grid3X3" size={16} />
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              iconName="Download"
              iconPosition="left"
            >
              {currentLanguage === 'es' ? 'Exportar' : 'Export'}
            </Button>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-10">
                {exportOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleExport(option.value)}
                    className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon name={option.icon} size={16} className="mr-2" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New Tender Button */}
          <Button variant="default" onClick={onNewTender} iconName="Plus" iconPosition="left">
            {currentLanguage === 'es' ? 'Nueva Licitación' : 'New Tender'}
          </Button>
        </div>
      </div>

      {/* Quick Stats (dinámicos) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{s.active}</div>
          <div className="text-xs text-muted-foreground">
            {currentLanguage === 'es' ? 'Activas' : 'Active'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{s.awarded}</div>
          <div className="text-xs text-muted-foreground">
            {currentLanguage === 'es' ? 'Adjudicadas' : 'Awarded'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{s.inDelivery}</div>
          <div className="text-xs text-muted-foreground">
            {currentLanguage === 'es' ? 'En Entrega' : 'In Delivery'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{s.critical}</div>
          <div className="text-xs text-muted-foreground">
            {currentLanguage === 'es' ? 'Críticas' : 'Critical'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenderToolbar;
