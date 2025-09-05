import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const MAX_FILE_MB = 10;
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png'
];
const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];

const CommunicationModal = ({ isOpen, onClose, onSave }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [formData, setFormData] = useState({
    type: '',
    subject: '',
    content: '',
    participants: [],
    linkedEntities: [],
    attachments: []
  });
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState([]);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const labels = {
    en: {
      newCommunication: 'New Communication',
      communicationType: 'Communication Type',
      selectType: 'Select type...',
      email: 'Email',
      whatsapp: 'WhatsApp',
      phone: 'Phone',
      meeting: 'Meeting',
      subject: 'Subject',
      subjectPlaceholder: 'Enter communication subject...',
      content: 'Content',
      contentPlaceholder: 'Enter communication details...',
      participants: 'Participants',
      selectParticipants: 'Select participants...',
      linkedEntities: 'Linked Entities',
      selectEntities: 'Select linked entities...',
      attachments: 'Attachments',
      dragDropFiles: 'Drag and drop files here, or click to select',
      supportedFormats:
        'Supported formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)',
      cancel: 'Cancel',
      save: 'Save Communication',
      removeFile: 'Remove file',
      fileTypeErr: 'Some files were skipped due to unsupported type.',
      fileSizeErr: `Some files exceeded ${MAX_FILE_MB}MB and were skipped.`
    },
    es: {
      newCommunication: 'Nueva Comunicación',
      communicationType: 'Tipo de Comunicación',
      selectType: 'Seleccionar tipo...',
      email: 'Email',
      whatsapp: 'WhatsApp',
      phone: 'Teléfono',
      meeting: 'Reunión',
      subject: 'Asunto',
      subjectPlaceholder: 'Ingrese el asunto de la comunicación...',
      content: 'Contenido',
      contentPlaceholder: 'Ingrese los detalles de la comunicación...',
      participants: 'Participantes',
      selectParticipants: 'Seleccionar participantes...',
      linkedEntities: 'Entidades Vinculadas',
      selectEntities: 'Seleccionar entidades vinculadas...',
      attachments: 'Archivos Adjuntos',
      dragDropFiles: 'Arrastra y suelta archivos aquí, o haz clic para seleccionar',
      supportedFormats:
        'Formatos soportados: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Máx 10MB)',
      cancel: 'Cancelar',
      save: 'Guardar Comunicación',
      removeFile: 'Eliminar archivo',
      fileTypeErr: 'Algunos archivos se omitieron por tipo no permitido.',
      fileSizeErr: `Algunos archivos superaron ${MAX_FILE_MB}MB y se omitieron.`
    }
  };

  const t = labels[currentLanguage];

  const communicationTypeOptions = [
    { value: '', label: t.selectType },
    { value: 'email', label: t.email },
    { value: 'whatsapp', label: t.whatsapp },
    { value: 'phone', label: t.phone },
    { value: 'meeting', label: t.meeting }
  ];

  const participantOptions = [
    { value: 'carlos.rodriguez@pinnacle.cl', label: 'Carlos Rodriguez (carlos.rodriguez@pinnacle.cl)' },
    { value: 'maria.gonzalez@pinnacle.cl', label: 'Maria Gonzalez (maria.gonzalez@pinnacle.cl)' },
    { value: 'juan.silva@pinnacle.cl', label: 'Juan Silva (juan.silva@pinnacle.cl)' },
    { value: 'ana.martinez@pinnacle.cl', label: 'Ana Martinez (ana.martinez@pinnacle.cl)' },
    { value: 'rajesh.kumar@pinnaclelife.in', label: 'Rajesh Kumar (rajesh.kumar@pinnaclelife.in)' },
    { value: 'priya.sharma@pinnaclelife.in', label: 'Priya Sharma (priya.sharma@pinnaclelife.in)' },
    { value: 'amit.patel@pinnaclelife.in', label: 'Amit Patel (amit.patel@pinnaclelife.in)' }
  ];

  const entityOptions = [
    { value: 'tender-2024-001', label: 'Tender #2024-001 - Antibiotics Supply' },
    { value: 'tender-2024-002', label: 'Tender #2024-002 - Cardiovascular Medications' },
    { value: 'order-PO-2024-045', label: 'Order #PO-2024-045 - Amoxicillin 500mg' },
    { value: 'order-PO-2024-046', label: 'Order #PO-2024-046 - Metformin 850mg' },
    { value: 'import-IMP-2024-012', label: 'Import #IMP-2024-012 - Q1 Antibiotics Shipment' },
    { value: 'import-IMP-2024-013', label: 'Import #IMP-2024-013 - Diabetes Medications' }
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const extOf = (name = '') => {
    const parts = String(name).split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  };

  const handleDrag = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (e?.type === 'dragenter' || e?.type === 'dragover') {
      setDragActive(true);
    } else if (e?.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragActive(false);

    if (e?.dataTransfer?.files && e?.dataTransfer?.files[0]) {
      handleFiles(e?.dataTransfer?.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e?.target?.files && e?.target?.files[0]) {
      handleFiles(e?.target?.files);
    }
  };

  const handleFiles = (files) => {
    const errors = [];
    const next = [];

    Array.from(files).forEach((file) => {
      const sizeMB = file.size / 1024 / 1024;
      const okSize = sizeMB <= MAX_FILE_MB;
      const ext = extOf(file.name);
      const okType = ALLOWED_MIME.includes(file.type) || ALLOWED_EXT.includes(ext);

      if (!okType) errors.push('type');
      if (!okSize) errors.push('size');

      if (okType && okSize) {
        next.push({
          id: Date.now() + Math.random(),
          name: file.name,
          size: `${sizeMB.toFixed(2)} MB`,
          type: file.type,
          file
        });
      }
    });

    const newErrors = [];
    if (errors.includes('type')) newErrors.push(t.fileTypeErr);
    if (errors.includes('size')) newErrors.push(t.fileSizeErr);
    setUploadErrors(newErrors);

    if (next.length) {
      setFormData((prev) => ({
        ...prev,
        attachments: [...prev.attachments, ...next]
      }));
    }
  };

  const removeAttachment = (attachmentId) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((att) => att.id !== attachmentId)
    }));
  };

  // Parsea "order-PO-2024-046" -> { linked_type: 'order', linked_id: 'PO-2024-046' }
  const parseLinked = (value) => {
    if (!value) return { linked_type: '', linked_id: '' };
    const [type, ...rest] = String(value).split('-');
    return { linked_type: type, linked_id: rest.join('-') };
  };

  const handleSave = () => {
    const participantsStr = Array.isArray(formData.participants)
      ? formData.participants.join(', ')
      : '';

    const firstLinked = Array.isArray(formData.linkedEntities) && formData.linkedEntities.length
      ? parseLinked(formData.linkedEntities[0])
      : { linked_type: '', linked_id: '' };

    const cleanAttachments = formData.attachments.map((a) => ({
      name: a.name,
      size: a.size,
      type: a.type
    }));

    const payload = {
      // ✳️ shape compatible con mapCommunications
      id: Date.now(),
      createdDate: new Date().toISOString(),
      type: formData.type,
      subject: formData.subject,
      content: formData.content,
      preview:
        (formData.content || '').slice(0, 150) +
        ((formData.content || '').length > 150 ? '...' : ''),
      participants: participantsStr,
      linked_type: firstLinked.linked_type,
      linked_id: firstLinked.linked_id,
      attachments: cleanAttachments
    };

    onSave?.(payload);

    // reset
    setFormData({
      type: '',
      subject: '',
      content: '',
      participants: [],
      linkedEntities: [],
      attachments: []
    });
    setUploadErrors([]);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{t.newCommunication}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Communication Type */}
          <Select
            label={t.communicationType}
            options={communicationTypeOptions}
            value={formData.type}
            onChange={(value) => handleInputChange('type', value)}
            required
          />

          {/* Subject */}
          <Input
            label={t.subject}
            type="text"
            placeholder={t.subjectPlaceholder}
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e?.target?.value)}
            required
          />

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t.content} *
            </label>
            <textarea
              className="w-full h-32 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder={t.contentPlaceholder}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e?.target?.value)}
              required
            />
          </div>

          {/* Participants */}
          <Select
            label={t.participants}
            options={participantOptions}
            value={formData.participants}
            onChange={(value) => handleInputChange('participants', value)}
            multiple
            searchable
            placeholder={t.selectParticipants}
          />

          {/* Linked Entities */}
          <Select
            label={t.linkedEntities}
            options={entityOptions}
            value={formData.linkedEntities}
            onChange={(value) => handleInputChange('linkedEntities', value)}
            multiple
            searchable
            placeholder={t.selectEntities}
          />

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t.attachments}
            </label>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Icon name="Upload" size={32} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-foreground font-medium mb-2">{t.dragDropFiles}</p>
                <p className="text-sm text-muted-foreground">{t.supportedFormats}</p>
              </label>
            </div>

            {/* Upload errors */}
            {uploadErrors.length > 0 && (
              <div className="mt-3 space-y-1">
                {uploadErrors.map((err, i) => (
                  <div
                    key={i}
                    className="flex items-center text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1"
                  >
                    <Icon name="AlertTriangle" size={12} className="mr-1" />
                    {err}
                  </div>
                ))}
              </div>
            )}

            {/* Attachment List */}
            {formData.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {formData.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between bg-muted rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon name="FileText" size={16} className="text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{attachment.name}</div>
                        <div className="text-xs text-muted-foreground">{attachment.size}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconName="X"
                      onClick={() => removeAttachment(attachment.id)}
                      title={t.removeFile}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.type || !formData.subject || !formData.content}
          >
            {t.save}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommunicationModal;
