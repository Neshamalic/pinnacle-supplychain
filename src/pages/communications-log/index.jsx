import React, { useState, useEffect, useMemo } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import Button from '../../components/ui/Button';

import CommunicationFilters from './components/CommunicationFilters';
import CommunicationTimeline from './components/CommunicationTimeline';
import CommunicationModal from './components/CommunicationModal';

// ✅ Conectar a tu API de Sheets
import { useSheet } from '../../lib/sheetsApi';
import { mapCommunications } from '../../lib/adapters';

const CommunicationsLog = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [filteredCommunications, setFilteredCommunications] = useState([]);

  // ✅ Trae datos reales desde la hoja "communications"
  const { rows: comms, loading, error } = useSheet('communications', mapCommunications);
  const data = comms ?? [];

  // Guardamos idioma preferido
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // 🔧 Adaptación para que la UI tenga las mismas llaves que usaba el mock:
  // - date: usamos createdDate
  // - participants: convertimos string a arreglo de {name,email}
  // - linkedEntities: derivado de linked_type/linked_id
  // - attachments: por ahora vacío ([])
  const uiComms = useMemo(() => {
    const toParticipants = (str) => {
      if (!str) return [];
      return String(str)
        .split(/[,;]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .map((txt, i) => ({
          name: txt,
          email: txt.includes('@') ? txt : `${txt.replace(/\s+/g, '.').toLowerCase()}@example.com`,
          avatar: undefined
        }));
    };

    return data.map(c => ({
      id: c.id,
      type: (c.type || '').toLowerCase(), // email / whatsapp / phone / meeting...
      subject: c.subject || '',
      preview: c.preview || '',
      content: c.content || '',
      date: c.createdDate || '',          // <- clave que esperaba el mock
      participants: toParticipants(c.participants),
      linkedEntities:
        c.linked_type || c.linked_id
          ? [{ type: c.linked_type || 'other', id: c.linked_id || '' }]
          : [],
      attachments: [],                    // si luego agregas, aquí llegan
      unread: !!c.unread
    }));
  }, [data]);

  // 📌 Aplicar filtros cada vez que cambie "filters" o lleguen nuevos datos
  useEffect(() => {
    let filtered = uiComms;

    // Texto libre
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(comm =>
        comm.subject?.toLowerCase()?.includes(q) ||
        comm.content?.toLowerCase()?.includes(q) ||
        comm.preview?.toLowerCase()?.includes(q) ||
        (comm.participants || []).some(p => p?.name?.toLowerCase()?.includes(q))
      );
    }

    // Tipo (email / whatsapp / phone / meeting / etc.)
    if (filters?.communicationType) {
      filtered = filtered.filter(comm => comm.type === filters.communicationType);
    }

    // Participante (email exacto o nombre contenido)
    if (filters?.participants) {
      const p = String(filters.participants).toLowerCase();
      filtered = filtered.filter(comm =>
        (comm.participants || []).some(pp =>
          pp?.email?.toLowerCase() === p || pp?.name?.toLowerCase()?.includes(p)
        )
      );
    }

    // Entidad vinculada (tender / order / import)
    if (filters?.linkedEntity) {
      filtered = filtered.filter(comm =>
        (comm.linkedEntities || []).some(e => e?.type === filters.linkedEntity)
      );
    }

    // Con adjuntos (por ahora todos [] → quedará vacío si activas este filtro)
    if (filters?.hasAttachments) {
      filtered = filtered.filter(comm => (comm.attachments || []).length > 0);
    }

    // Rango de fechas (sobre "date")
    if (filters?.dateRange) {
      const now = new Date();
      let startDate = null;
      let endDate = null;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'thisWeek':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'last30Days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          startDate = filters.startDate ? new Date(filters.startDate) : null;
          endDate = filters.endDate ? new Date(filters.endDate) : null;
          break;
        default:
          break;
      }

      if (startDate) {
        filtered = filtered.filter(comm => {
          if (!comm.date) return false;
          const d = new Date(comm.date);
          if (filters.dateRange === 'custom' && endDate) {
            return d >= startDate && d <= endDate;
          }
          return d >= startDate;
        });
      }
    }

    // Orden por fecha descendente (más nuevo primero)
    filtered = filtered.sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });

    setFilteredCommunications(filtered);
  }, [filters, uiComms]);

  const labels = {
    en: {
      communicationsLog: 'Communications Log',
      newCommunication: 'New Communication'
    },
    es: {
      communicationsLog: 'Registro de Comunicaciones',
      newCommunication: 'Nueva Comunicación'
    }
  };
  const t = labels[currentLanguage];

  const handleFiltersChange = (newFilters) => setFilters(newFilters);

  const handleSaveCommunication = (communicationData) => {
    // Aquí más adelante podemos hacer POST a tu Apps Script (route=write)
    console.log('Saving communication:', communicationData);
  };

  const handleExport = () => {
    // Acá puedes exportar a CSV/Excel con los datos de filteredCommunications
    console.log('Exporting communications report...');
  };

  // ⏳ Estados de carga / error
  if (loading) return <div style={{ padding: 16 }}>Loading communications…</div>;
  if (error)   return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="p-6 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div>
              <Breadcrumb />
              <h1 className="text-3xl font-bold text-foreground mt-2">{t.communicationsLog}</h1>
            </div>
            <Button iconName="Plus" onClick={() => setIsModalOpen(true)}>
              {t.newCommunication}
            </Button>
          </div>
        </div>

        <div className="flex">
          <CommunicationFilters
            onFiltersChange={handleFiltersChange}
            totalCount={filteredCommunications.length}
          />

          <CommunicationTimeline
            communications={filteredCommunications}
            filters={filters}
            onExport={handleExport}
          />
        </div>
      </main>

      <CommunicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCommunication}
      />
    </div>
  );
};

export default CommunicationsLog;
