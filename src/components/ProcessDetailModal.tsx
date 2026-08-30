import React, { useState } from 'react';
import {
  X,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  Save,
  MessageCircle,
  FileText,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Edit3,
  Award,
  ArrowRight,
  ArrowLeft,
  Check,
  SlidersHorizontal,
  Scale,
  Percent,
  Calculator,
  Search,
  Tag,
  Sparkles,
  BookOpen,
  StickyNote,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  BankPartner,
  ClientProcess,
  CommissionStatus,
  CreditAnalysisStatus,
  CreditType,
  PriorityLevel,
  ProcessChecklistItem,
  ProcessNote,
  ProcessStage,
} from '../types';
import {
  BANK_CONFIGS,
  CREDIT_ANALYSIS_STATUS_CONFIGS,
  CREDIT_TYPE_LABELS,
  PIPELINE_STAGES,
  STAGE_CONFIGS,
  canAdvanceToStage,
} from '../utils/constants';
import {
  formatCPF,
  formatCurrency,
  formatDate,
  formatDateWithTime,
  formatMonthYear,
  formatPhone,
} from '../utils/formatters';

interface ProcessDetailModalProps {
  process: ClientProcess | null;
  onClose: () => void;
  onSave: (updatedProcess: ClientProcess) => void;
  onDelete: (processId: string) => void;
  onOpenWhatsApp: (process: ClientProcess) => void;
  onAdvanceStage?: (processId: string, nextStage: ProcessStage) => void;
}

const NOTE_TEMPLATES = [
  { label: '📞 Ligação c/ Cliente', text: 'Contato telefônico realizado com o cliente. Alinhado próximos passos.', category: 'CLIENTE' as const },
  { label: '🏛️ Retorno do Banco', text: 'Contato com o gerente/mesa de crédito do banco operador.', category: 'BANCO' as const },
  { label: '📋 Pendência Documental', text: 'Solicitado envio de documentação complementar para continuidade do processo.', category: 'PENDENCIA' as const },
  { label: '🏠 Vistoria Agendada', text: 'Engenharia/vistoria do imóvel agendada com perito credenciado.', category: 'ENGENHARIA' as const },
  { label: '⚖️ Análise Jurídica', text: 'Dossiê em análise pelo setor jurídico e certidões em conferência.', category: 'JURIDICO' as const },
  { label: '📜 Cartório / RGI', text: 'Contrato prenotado no Cartório de Registro de Imóveis competente.', category: 'CARTORIO' as const },
  { label: '🤝 Alinhamento c/ Corretor', text: 'Status e evolução do processo informados ao corretor/imobiliária parceira.', category: 'CORRETOR' as const },
];

export const ProcessDetailModal: React.FC<ProcessDetailModalProps> = ({
  process,
  onClose,
  onSave,
  onDelete,
  onOpenWhatsApp,
  onAdvanceStage,
}) => {
  if (!process) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'checklist' | 'history' | 'notes' | 'financial'>('details');
  const [formData, setFormData] = useState<ClientProcess>({ ...process });
  
  // Notes State
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [newNoteCategory, setNewNoteCategory] = useState<ProcessNote['category']>('GERAL');
  const [quickNoteText, setQuickNoteText] = useState<string>('');
  const [quickNoteCategory, setQuickNoteCategory] = useState<ProcessNote['category']>('GERAL');
  const [notesSearchQuery, setNotesSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODAS');

  // Checklist State
  const [newChecklistTitle, setNewChecklistTitle] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [blockedAdvanceInfo, setBlockedAdvanceInfo] = useState<{
    targetStage: ProcessStage;
    reason?: string;
  } | null>(null);

  // Recalculate commission when financingValue or commissionPercentage changes
  const handleFinancingOrCommissionChange = (financingVal: number, commPct: number) => {
    const amount = (financingVal * commPct) / 100;
    setFormData((prev) => ({
      ...prev,
      financingValue: financingVal,
      commissionPercentage: commPct,
      commissionAmount: amount,
    }));
    setHasUnsavedChanges(true);
  };

  const handleStageChange = (newStage: ProcessStage, forceApproveCredit: boolean = false) => {
    if (newStage === formData.stage && !forceApproveCredit) return;

    const effectiveCreditStatus = forceApproveCredit ? 'APROVADO' : formData.creditAnalysisStatus;
    const check = canAdvanceToStage(newStage, effectiveCreditStatus);

    if (!check.allowed) {
      setBlockedAdvanceInfo({
        targetStage: newStage,
        reason: check.reason,
      });
      return;
    }

    if (newStage === 'DISBURSEMENT_COMPLETED' || newStage === 'COMMISSION_PAID') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }

    const historyEntry = {
      id: `sh_${Date.now()}`,
      fromStage: formData.stage,
      toStage: newStage,
      changedAt: new Date().toISOString(),
      note: forceApproveCredit
        ? `Crédito Aprovado e fase alterada para ${STAGE_CONFIGS[newStage]?.label || newStage}`
        : `Fase alterada para ${STAGE_CONFIGS[newStage]?.label || newStage}`,
    };

    setFormData((prev) => ({
      ...prev,
      stage: newStage,
      creditAnalysisStatus: effectiveCreditStatus,
      stageUpdatedAt: new Date().toISOString(),
      stageHistory: [historyEntry, ...prev.stageHistory],
    }));
    setHasUnsavedChanges(true);
    setBlockedAdvanceInfo(null);
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setFormData((prev) => {
      const updatedChecklist = prev.checklist.map((item) => {
        if (item.id === itemId) {
          const nextCompleted = !item.completed;
          return {
            ...item,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }
        return item;
      });
      return { ...prev, checklist: updatedChecklist };
    });
    setHasUnsavedChanges(true);
  };

  const handleAddCustomChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    const newItem: ProcessChecklistItem = {
      id: `custom_${Date.now()}`,
      stage: formData.stage,
      title: newChecklistTitle.trim(),
      category: 'GERAL' as any,
      required: false,
      completed: false,
    };

    setFormData((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newItem],
    }));
    setNewChecklistTitle('');
    setHasUnsavedChanges(true);
  };

  // Add Note from main notes tab
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: ProcessNote = {
      id: `n_${Date.now()}`,
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
      author: 'Deiglison Lima',
      category: newNoteCategory,
    };

    setFormData((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }));
    setNewNoteText('');
    setHasUnsavedChanges(true);
  };

  // Quick Add Note from sidebar on Tab 1
  const handleQuickAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;

    const newNote: ProcessNote = {
      id: `n_${Date.now()}`,
      text: quickNoteText.trim(),
      createdAt: new Date().toISOString(),
      author: 'Deiglison Lima',
      category: quickNoteCategory,
    };

    setFormData((prev) => ({
      ...prev,
      notes: [newNote, ...prev.notes],
    }));
    setQuickNoteText('');
    setHasUnsavedChanges(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Deseja excluir esta anotação?')) {
      setFormData((prev) => ({
        ...prev,
        notes: prev.notes.filter((n) => n.id !== noteId),
      }));
      setHasUnsavedChanges(true);
    }
  };

  const handleSaveAll = () => {
    onSave(formData);
    setHasUnsavedChanges(false);
    onClose();
  };

  const allOrderedStages: ProcessStage[] = [
    'SIMULATION_COLLECTION',
    'CREDIT_ANALYSIS',
    'PROPERTY_VALUATION',
    'LEGAL_COMPLIANCE',
    'VALUE_CONFIRMATION',
    'CONTRACT_ISSUANCE',
    'CONTRACT_SIGNATURE',
    'PROPERTY_REGISTRY',
    'DISBURSEMENT_COMPLETED',
    'COMMISSION_PAID',
  ];

  const getNextStage = (current: ProcessStage): ProcessStage | null => {
    const idx = allOrderedStages.indexOf(current);
    if (idx >= 0 && idx < allOrderedStages.length - 1) {
      return allOrderedStages[idx + 1];
    }
    return null;
  };

  const nextStage = getNextStage(formData.stage);
  const stageConfig = STAGE_CONFIGS[formData.stage] || STAGE_CONFIGS['SIMULATION_COLLECTION'];
  const bankConfig = BANK_CONFIGS[formData.bank] || BANK_CONFIGS['Outra Instituição'];

  // Checklist counts
  const totalChecklist = formData.checklist.length;
  const completedChecklist = formData.checklist.filter((c) => c.completed).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const currentStageIndex = PIPELINE_STAGES.indexOf(formData.stage as any);

  // Filtered Notes
  const filteredNotes = formData.notes.filter((note) => {
    if (selectedCategoryFilter !== 'TODAS' && note.category !== selectedCategoryFilter) {
      return false;
    }
    if (notesSearchQuery.trim()) {
      const q = notesSearchQuery.toLowerCase();
      return note.text.toLowerCase().includes(q) || note.author.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-3 lg:p-4">
      {/* Broad Screen Modal Canvas */}
      <div className="bg-white w-full max-w-[97vw] 2xl:max-w-[1640px] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh] max-h-[95vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-xl font-black text-white tracking-tight">
                  {formData.clientName}
                </h3>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border ${bankConfig.badgeBg}`}>
                  {formData.bank}
                </span>
                <span className="text-xs text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded">
                  {formatCPF(formData.clientCpf)}
                </span>
                {formData.proposalNumber && (
                  <span className="text-xs text-emerald-300 font-mono bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                    Proposta: {formData.proposalNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{CREDIT_TYPE_LABELS[formData.creditType]?.label}</span>
                <span>•</span>
                <span>{formData.propertyCity}/{formData.propertyState}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  Financiamento: {formatCurrency(formData.financingValue)}
                </span>
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {nextStage && (
              <button
                id="modal-btn-advance-top"
                onClick={() => {
                  handleStageChange(nextStage);
                  if (onAdvanceStage) {
                    onAdvanceStage(formData.id, nextStage);
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-xs cursor-pointer active:scale-95"
              >
                <span>Avançar p/ {STAGE_CONFIGS[nextStage]?.shortLabel || nextStage}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              id="modal-btn-whatsapp"
              onClick={() => onOpenWhatsApp(formData)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              id="modal-btn-save"
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black transition shadow-xs cursor-pointer border border-slate-200"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>Salvar</span>
            </button>

            <button
              id="modal-btn-close"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual 10-Step Interactive Pipeline Stepper */}
        <div className="bg-slate-950 px-3 sm:px-6 py-2.5 border-b border-slate-800 shrink-0">
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5 sm:gap-2">
            {PIPELINE_STAGES.map((sKey, index) => {
              const cfg = STAGE_CONFIGS[sKey];
              const isCurrent = formData.stage === sKey;
              const isPast = currentStageIndex >= 0 && index < currentStageIndex;

              return (
                <button
                  key={sKey}
                  type="button"
                  id={`stepper-stage-${sKey}`}
                  onClick={() => handleStageChange(sKey)}
                  title={`Mudar para ${cfg.label}`}
                  className={`flex flex-col items-center gap-1 group transition cursor-pointer p-1 rounded-lg ${
                    isCurrent ? 'bg-slate-900/90 ring-1 ring-emerald-500/40' : 'hover:bg-slate-900/50'
                  }`}
                >
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCurrent
                        ? `${cfg.bgColor} text-white ring-4 ring-emerald-500/30 scale-105 shadow-md`
                        : isPast
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : index + 1}
                  </div>
                  <span
                    className={`text-[10px] font-bold tracking-tight text-center leading-tight truncate w-full ${
                      isCurrent
                        ? 'text-emerald-400'
                        : isPast
                        ? 'text-slate-300'
                        : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  >
                    {cfg.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Quick Switcher Banner */}
        <div className="bg-slate-100 px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Fase do Processo:</span>
            <select
              id="modal-select-stage"
              value={formData.stage}
              onChange={(e) => handleStageChange(e.target.value as ProcessStage)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
            >
              {Object.values(STAGE_CONFIGS).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {nextStage && (
              <button
                type="button"
                onClick={() => handleStageChange(nextStage)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Avançar p/ {STAGE_CONFIGS[nextStage]?.shortLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Priority Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-600 font-bold">Prioridade:</span>
              <select
                id="modal-select-priority"
                value={formData.priority}
                onChange={(e) => {
                  setFormData({ ...formData, priority: e.target.value as PriorityLevel });
                  setHasUnsavedChanges(true);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            {/* Pending Issue checkbox */}
            <label className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 cursor-pointer shadow-2xs hover:bg-rose-100 transition">
              <input
                id="modal-checkbox-pending"
                type="checkbox"
                checked={formData.hasPendingIssues || false}
                onChange={(e) => {
                  setFormData({ ...formData, hasPendingIssues: e.target.checked });
                  setHasUnsavedChanges(true);
                }}
                className="rounded text-rose-600 w-4 h-4 cursor-pointer"
              />
              <span>Com Pendência Ativa</span>
            </label>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 gap-2 sm:gap-6 overflow-x-auto no-scrollbar shrink-0">
          <button
            id="modal-tab-details"
            onClick={() => setActiveTab('details')}
            className={`py-3 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Dados da Operação & Anotações Rápidas</span>
          </button>

          <button
            id="modal-tab-notes"
            onClick={() => setActiveTab('notes')}
            className={`py-3 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <StickyNote className="w-4 h-4 text-emerald-600" />
            <span>Anotações & Histórico de Contato</span>
            <span className="bg-emerald-100 text-emerald-800 font-mono text-xs px-2 py-0.5 rounded-full font-bold">
              {formData.notes.length}
            </span>
          </button>

          <button
            id="modal-tab-checklist"
            onClick={() => setActiveTab('checklist')}
            className={`py-3 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Checklist Documental</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
              {completedChecklist}/{totalChecklist}
            </span>
          </button>

          <button
            id="modal-tab-history"
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Linha do Tempo</span>
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
              {formData.stageHistory.length}
            </span>
          </button>

          <button
            id="modal-tab-financial"
            onClick={() => setActiveTab('financial')}
            className={`py-3 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'financial'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Comissão & Faturamento</span>
            <span className="text-emerald-700 font-mono text-xs font-bold">
              {formatCurrency(formData.commissionAmount)}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
          
          {/* TAB 1: DETAILS & QUICK ANNOTATIONS - WIDE 12-COLUMN DUAL LAYOUT */}
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEFT COLUMN: PRIMARY PROCESS DATA & FORMS (7 COLS) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Card 0: Status da Análise de Crédito (Gatekeeper) */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <ShieldAlert className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span>Análise de Crédito Bancária (Fase 2)</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${CREDIT_ANALYSIS_STATUS_CONFIGS[formData.creditAnalysisStatus || 'EM_ANALISE']?.badgeBg} ${CREDIT_ANALYSIS_STATUS_CONFIGS[formData.creditAnalysisStatus || 'EM_ANALISE']?.textColor}`}>
                            {CREDIT_ANALYSIS_STATUS_CONFIGS[formData.creditAnalysisStatus || 'EM_ANALISE']?.label}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Controle de aprovação mandatória para liberação das etapas seguintes.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Substatus Selection Pills */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Definir Substatus da Análise:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        id="modal-credit-status-em-analise"
                        onClick={() => {
                          setFormData({ ...formData, creditAnalysisStatus: 'EM_ANALISE' });
                          setHasUnsavedChanges(true);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                          !formData.creditAnalysisStatus || formData.creditAnalysisStatus === 'EM_ANALISE'
                            ? 'border-amber-500 bg-amber-50/80 text-amber-950 ring-2 ring-amber-400/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-amber-400 mt-0.5 shrink-0 flex items-center justify-center">
                          <Clock className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">🟡 Em Análise</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                            Dossiê em triagem no banco operador.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        id="modal-credit-status-aprovado"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            creditAnalysisStatus: 'APROVADO',
                            creditApprovalDate: formData.creditApprovalDate || new Date().toISOString(),
                          });
                          setHasUnsavedChanges(true);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                          formData.creditAnalysisStatus === 'APROVADO'
                            ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-emerald-600 mt-0.5 shrink-0 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-900">🟢 Crédito Aprovado</div>
                          <div className="text-[11px] text-emerald-700 mt-0.5 leading-tight">
                            Crédito deferido pelo banco.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        id="modal-credit-status-recusado"
                        onClick={() => {
                          setFormData({ ...formData, creditAnalysisStatus: 'RECUSADO' });
                          setHasUnsavedChanges(true);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                          formData.creditAnalysisStatus === 'RECUSADO'
                            ? 'border-rose-500 bg-rose-50/80 text-rose-950 ring-2 ring-rose-400/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-rose-500 mt-0.5 shrink-0 flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-rose-900">🔴 Crédito Recusado</div>
                          <div className="text-[11px] text-rose-700 mt-0.5 leading-tight">
                            Reprovado no risco. Impede avanço.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 1: Cliente e Cônjuge */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Dados do Cliente / Proponente & Cônjuge</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome Completo</label>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => {
                          setFormData({ ...formData, clientName: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">CPF</label>
                      <input
                        type="text"
                        value={formData.clientCpf}
                        onChange={(e) => {
                          setFormData({ ...formData, clientCpf: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
                      <input
                        type="text"
                        value={formData.clientPhone}
                        onChange={(e) => {
                          setFormData({ ...formData, clientPhone: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">E-mail</label>
                      <input
                        type="email"
                        value={formData.clientEmail || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, clientEmail: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Cônjuge</label>
                      <input
                        type="text"
                        value={formData.spouseName || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, spouseName: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Se casado(a)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">CPF Cônjuge</label>
                      <input
                        type="text"
                        value={formData.spouseCpf || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, spouseCpf: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="CPF do cônjuge"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Instituição Bancária & Proposta */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span>Instituição Financeira & Proposta</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Banco Operador</label>
                      <select
                        value={formData.bank}
                        onChange={(e) => {
                          const newB = e.target.value as BankPartner;
                          const rule = BANK_CONFIGS[newB];
                          const pct = rule?.defaultCommissionPercentage || formData.commissionPercentage;
                          setFormData((prev) => ({
                            ...prev,
                            bank: newB,
                            commissionPercentage: pct,
                            commissionAmount: (prev.financingValue * pct) / 100,
                          }));
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {Object.keys(BANK_CONFIGS).map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº Proposta no Banco</label>
                      <input
                        type="text"
                        value={formData.proposalNumber || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, proposalNumber: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Ex: ITU-2026-98124"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Crédito</label>
                      <select
                        value={formData.creditType}
                        onChange={(e) => {
                          setFormData({ ...formData, creditType: e.target.value as CreditType });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {Object.entries(CREDIT_TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card 3: 5. Confirmação & Ajuste de Valores da Operação */}
                {(() => {
                  const monthlyRate = Math.pow(1 + (formData.interestRateAnnual || 10.5) / 100, 1 / 12) - 1;
                  const downPayment = Math.max(0, formData.propertyValue - formData.financingValue);
                  const ltvPct = formData.propertyValue > 0 ? ((formData.financingValue / formData.propertyValue) * 100).toFixed(1) : '80.0';
                  
                  const sacAmort = formData.termMonths > 0 ? formData.financingValue / formData.termMonths : 0;
                  const sacP1 = sacAmort + (formData.financingValue * monthlyRate);
                  const sacPFin = sacAmort + (sacAmort * monthlyRate);

                  const priceP = formData.termMonths > 0 && monthlyRate > 0
                    ? formData.financingValue * (monthlyRate * Math.pow(1 + monthlyRate, formData.termMonths)) / (Math.pow(1 + monthlyRate, formData.termMonths) - 1)
                    : 0;

                  const isCurrentStage = formData.stage === 'VALUE_CONFIRMATION';

                  return (
                    <div
                      id="card-value-confirmation-stage"
                      className={`p-4 sm:p-5 rounded-2xl border-2 transition shadow-xs space-y-4 ${
                        isCurrentStage
                          ? 'bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white border-amber-500 ring-2 ring-amber-400/20'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                            isCurrentStage ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                          }`}>
                            <SlidersHorizontal className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider flex items-center gap-2">
                              <span>5. Confirmação & Ajuste de Valores</span>
                              {isCurrentStage && (
                                <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                                  Fase Ativa
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Ajuste e validação dos parâmetros definitivos da operação antes da minuta de contrato.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Main Financial Value Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Valor do Imóvel / Avaliação (R$)
                          </label>
                          <input
                            type="number"
                            step="1000"
                            value={formData.propertyValue}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setFormData({ ...formData, propertyValue: val });
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-black text-slate-900"
                          />
                        </div>

                        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-300">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-emerald-900">
                              Valor Financiado Aprovado (R$)
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const val80 = Math.round(formData.propertyValue * 0.8);
                                handleFinancingOrCommissionChange(val80, formData.commissionPercentage);
                              }}
                              className="text-[10px] bg-emerald-200 text-emerald-900 hover:bg-emerald-300 px-2 py-0.5 rounded font-bold transition cursor-pointer"
                            >
                              Aplicar 80% (LTV Max)
                            </button>
                          </div>
                          <input
                            type="number"
                            step="1000"
                            value={formData.financingValue}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              handleFinancingOrCommissionChange(val, formData.commissionPercentage);
                            }}
                            className="w-full bg-white border border-emerald-400 rounded-lg px-3 py-2 text-sm font-black text-emerald-950 font-mono"
                          />
                        </div>
                      </div>

                      {/* Simulation Indicators */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Entrada do Cliente</span>
                          <span className="text-xs font-black text-slate-800 block mt-0.5">{formatCurrency(downPayment)}</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">% Financiado (LTV)</span>
                          <span className="text-xs font-black text-indigo-700 block mt-0.5">{ltvPct}%</span>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">1ª Parcela ({formData.amortizationSystem})</span>
                          <span className="text-xs font-black text-emerald-800 block mt-0.5">
                            {formatCurrency(formData.amortizationSystem === 'SAC' ? sacP1 : priceP)}
                          </span>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Taxa Anual</span>
                          <span className="text-xs font-black text-slate-900 block mt-0.5">{formData.interestRateAnnual}% a.a.</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Card 4: Imóvel, Cartório & Prazos */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2 text-emerald-800">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Imóvel, Cartório de Registro (RGI) & Prazos</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cidade / UF</label>
                      <div className="grid grid-cols-3 gap-1">
                        <input
                          type="text"
                          placeholder="Cidade"
                          value={formData.propertyCity}
                          onChange={(e) => {
                            setFormData({ ...formData, propertyCity: e.target.value });
                            setHasUnsavedChanges(true);
                          }}
                          className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="UF"
                          value={formData.propertyState}
                          onChange={(e) => {
                            setFormData({ ...formData, propertyState: e.target.value });
                            setHasUnsavedChanges(true);
                          }}
                          className="col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-slate-900 text-center font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cartório de Registro (RGI)</label>
                      <input
                        type="text"
                        placeholder="Ex: 13º Cartório de Imóveis de SP"
                        value={formData.registryOfficeName || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, registryOfficeName: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº Prenotação / Protocolo</label>
                      <input
                        type="text"
                        placeholder="Ex: PRE-849.201/26"
                        value={formData.rgiProtocolNumber || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, rgiProtocolNumber: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-indigo-900 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Mês Previsão de Emissão</label>
                      <input
                        type="month"
                        value={formData.estimatedIssuanceMonth}
                        onChange={(e) => {
                          setFormData({ ...formData, estimatedIssuanceMonth: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Previsão Liberação de Recursos</label>
                      <input
                        type="date"
                        value={formData.estimatedDisbursementDate || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, estimatedDisbursementDate: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Corretor Parceiro / Imobiliária</label>
                      <input
                        type="text"
                        placeholder="Ex: Marcos (Prime Imóveis)"
                        value={formData.partnerRealtorName || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, partnerRealtorName: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: DEDICATED ANNOTATIONS, OBSERVATIONS & ACTION BOARD (5 COLS) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* 1. GENERAL OBSERVATIONS AREA (Sempre visível para atualização contínua) */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/30 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <Edit3 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
                          Observações Gerais da Operação
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Resumo contínuo da negociação, particularidades e detalhes do cliente.
                        </p>
                      </div>
                    </div>
                  </div>

                  <textarea
                    id="modal-general-observations"
                    rows={4}
                    value={formData.generalObservations || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, generalObservations: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Digite anotações gerais sobre o processo, perfil do cliente, combinados de entrada, comissões, prazos acordados ou particularidades do imóvel..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white leading-relaxed font-normal"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formData.generalObservations?.length || 0} caracteres</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Salva com o processo</span>
                    </span>
                  </div>
                </div>

                {/* 2. QUICK NOTE COMPOSER & RECENT FEED */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                        <StickyNote className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wider">
                          Anotações Rápidas & Registro
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Adicione notas rápidas com data e categoria em 1 clique.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('notes')}
                      className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                    >
                      Ver todas ({formData.notes.length})
                    </button>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {NOTE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setQuickNoteText(tmpl.text);
                          setQuickNoteCategory(tmpl.category);
                        }}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 transition cursor-pointer"
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>

                  {/* Quick Composer Form */}
                  <form onSubmit={handleQuickAddNote} className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={quickNoteText}
                      onChange={(e) => setQuickNoteText(e.target.value)}
                      placeholder="Registrar ligação, retorno do banco, cartório ou cliente..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={quickNoteCategory}
                        onChange={(e) => setQuickNoteCategory(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="GERAL">Geral</option>
                        <option value="CLIENTE">Cliente / Vendedor</option>
                        <option value="BANCO">Banco Operador</option>
                        <option value="JURIDICO">Jurídico / Dossiê</option>
                        <option value="ENGENHARIA">Engenharia / Vistoria</option>
                        <option value="CARTORIO">Cartório de Imóveis</option>
                        <option value="CORRETOR">Corretor / Parceiro</option>
                        <option value="PENDENCIA">Pendência</option>
                      </select>

                      <button
                        type="submit"
                        disabled={!quickNoteText.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gravar Nota</span>
                      </button>
                    </div>
                  </form>

                  {/* Recent Notes Feed (3 latest) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Últimos Registros no Processo ({formData.notes.length}):
                    </span>
                    {formData.notes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Nenhuma anotação gravada ainda.</p>
                    ) : (
                      formData.notes.slice(0, 3).map((n) => (
                        <div key={n.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {n.category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{formatDateWithTime(n.createdAt)}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(n.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer"
                                title="Excluir nota"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-800 text-[11px] leading-snug">{n.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. PENDING ISSUE ACTIVE BOX */}
                {formData.hasPendingIssues && (
                  <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                          Pendência Ativa do Processo
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, hasPendingIssues: false, pendingIssueDescription: '' });
                          setHasUnsavedChanges(true);
                        }}
                        className="text-[11px] text-rose-800 hover:text-rose-950 font-bold bg-white px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                      >
                        Resolver / Limpar
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={formData.pendingIssueDescription || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, pendingIssueDescription: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Descreva a pendência ou motivo do travamento deste processo..."
                      className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs text-rose-950 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Progresso do Dossiê Documental</h4>
                  <p className="text-xs text-slate-500">
                    {completedChecklist} de {totalChecklist} requisitos atendidos ({checklistPercent}%)
                  </p>
                </div>
                <div className="w-48 bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              </div>

              {/* Add Custom Item */}
              <form onSubmit={handleAddCustomChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar exigência ou documento extra ao checklist deste processo..."
                  value={newChecklistTitle}
                  onChange={(e) => setNewChecklistTitle(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Checklist grouped by stages */}
              <div className="space-y-3">
                {PIPELINE_STAGES.map((st) => {
                  const stageItems = formData.checklist.filter((c) => c.stage === st);
                  if (stageItems.length === 0) return null;
                  const isCurrent = formData.stage === st;

                  return (
                    <div
                      key={st}
                      className={`bg-white rounded-2xl border p-4 shadow-2xs ${
                        isCurrent ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{STAGE_CONFIGS[st].label}</span>
                          {isCurrent && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                              Fase Atual
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {stageItems.filter((i) => i.completed).length}/{stageItems.length} concluídos
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {stageItems.map((item) => (
                          <label
                            key={item.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl transition cursor-pointer ${
                              item.completed ? 'bg-emerald-50/60 text-slate-600' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklistItem(item.id)}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <div className="flex-1 text-xs">
                              <span className={item.completed ? 'line-through text-slate-500 font-medium' : 'font-semibold'}>
                                {item.title}
                              </span>
                              {item.completedAt && (
                                <span className="block text-[10px] text-emerald-700">
                                  Concluído em: {formatDateWithTime(item.completedAt)}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                              {item.category}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider mb-4">
                  Linha do Tempo de Evolução das Fases
                </h4>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {formData.stageHistory.map((h, idx) => {
                    const toConfig = STAGE_CONFIGS[h.toStage];
                    return (
                      <div key={h.id || idx} className="flex items-start gap-3.5 relative pl-1">
                        <div className={`w-7 h-7 rounded-full ${toConfig.bgColor} text-white flex items-center justify-center text-xs font-bold z-10 shrink-0 shadow-xs`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{toConfig.label}</span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatDateWithTime(h.changedAt)}
                            </span>
                          </div>
                          {h.note && (
                            <p className="text-xs text-slate-600 mt-1">{h.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPANDED FULL-FEATURED NOTES STUDIO */}
          {activeTab === 'notes' && (
            <div className="space-y-5 max-w-5xl mx-auto">
              
              {/* Note Composer Box */}
              <form onSubmit={handleAddNote} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-emerald-600" />
                    <span>Adicionar Anotação / Registro de Contato</span>
                  </h4>
                  <span className="text-xs text-slate-400">Total registrado: {formData.notes.length}</span>
                </div>

                {/* Fast Templates */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {NOTE_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNewNoteText(tmpl.text);
                        setNewNoteCategory(tmpl.category);
                      }}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 transition cursor-pointer"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Digite a anotação sobre ligação com banco, cartório, corretor ou cliente..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 font-bold">Categoria:</span>
                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
                    >
                      <option value="GERAL">Geral</option>
                      <option value="CLIENTE">Cliente / Vendedor</option>
                      <option value="BANCO">Banco Operador</option>
                      <option value="JURIDICO">Jurídico / Dossiê</option>
                      <option value="ENGENHARIA">Engenharia / Vistoria</option>
                      <option value="CARTORIO">Cartório de Imóveis</option>
                      <option value="CORRETOR">Corretor / Parceiro</option>
                      <option value="PENDENCIA">Pendência</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={!newNoteText.trim()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gravar Anotação</span>
                  </button>
                </div>
              </form>

              {/* Filters & Search for Notes */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {['TODAS', 'GERAL', 'CLIENTE', 'BANCO', 'JURIDICO', 'ENGENHARIA', 'CARTORIO', 'CORRETOR', 'PENDENCIA'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        selectedCategoryFilter === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={notesSearchQuery}
                    onChange={(e) => setNotesSearchQuery(e.target.value)}
                    placeholder="Buscar anotações..."
                    className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 w-48"
                  />
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {filteredNotes.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                    Nenhuma anotação encontrada para os filtros selecionados.
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <div key={note.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{note.author}</span>
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                            {note.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[11px]">{formatDateWithTime(note.createdAt)}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Excluir anotação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {note.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIAL */}
          {activeTab === 'financial' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Detalhamento da Comissão & Honorários de Assessoria</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Financiado</span>
                    <span className="text-base font-black text-slate-900 mt-1 block">
                      {formatCurrency(formData.financingValue)}
                    </span>
                  </div>

                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Comissão Morada Crédito</span>
                    <span className="text-base font-black text-emerald-900 mt-1 block font-mono">
                      {formatCurrency(formData.commissionAmount)} ({formData.commissionPercentage}%)
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Status da Comissão</span>
                    <select
                      value={formData.commissionStatus}
                      onChange={(e) => {
                        setFormData({ ...formData, commissionStatus: e.target.value as CommissionStatus });
                        setHasUnsavedChanges(true);
                      }}
                      className="mt-1 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-900 w-full cursor-pointer"
                    >
                      <option value="PREVISTA">Prevista (Em Andamento)</option>
                      <option value="AGUARDANDO_REGISTRO">Aguardando Registro / RGI</option>
                      <option value="DISPONIVEL_FATURAMENTO">Disponível p/ Nota Fiscal</option>
                      <option value="PAGA">Paga / Liquidada na Conta</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
                  </div>
                </div>

                {/* Partner Realtor Commission Share */}
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-xs text-slate-800">Repasse ao Corretor Parceiro</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nome do Corretor</label>
                      <input
                        type="text"
                        value={formData.partnerRealtorName || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, partnerRealtorName: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">% de Repasse (sobre VGV)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={formData.partnerRealtorCommissionPct || 0}
                        onChange={(e) => {
                          setFormData({ ...formData, partnerRealtorCommissionPct: Number(e.target.value) });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Valor do Repasse (R$)</label>
                      <div className="font-mono text-xs font-bold text-slate-800 pt-1.5">
                        {formatCurrency(
                          formData.partnerRealtorCommissionPct
                            ? (formData.financingValue * formData.partnerRealtorCommissionPct) / 100
                            : 0
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            id="modal-btn-delete-process"
            onClick={() => {
              if (confirm(`Tem certeza que deseja excluir o processo de ${formData.clientName}?`)) {
                onDelete(formData.id);
                onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Processo</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              id="modal-btn-cancel"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-300 cursor-pointer"
            >
              Fechar
            </button>

            <button
              id="modal-btn-save-confirm"
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>

        {/* Credit Approval Block Alert in Modal */}
        {blockedAdvanceInfo && (
          <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Aprovação de Crédito Obrigatória</h3>
                    <p className="text-[11px] text-slate-400">Gatekeeper de Fases</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBlockedAdvanceInfo(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                  <p className="font-semibold leading-relaxed">
                    Para avançar para a fase <strong className="text-slate-950">{STAGE_CONFIGS[blockedAdvanceInfo.targetStage]?.label}</strong>, a Análise de Crédito deve estar com status <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Aprovado</span>.
                  </p>
                  <p className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60">
                    Status atual: <span className="font-bold uppercase tracking-wider">{formData.creditAnalysisStatus === 'RECUSADO' ? 'Recusado' : 'Em Análise'}</span>
                  </p>
                </div>

                <p className="text-xs text-slate-600">
                  Deseja registrar a aprovação do crédito agora e mudar para esta etapa?
                </p>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBlockedAdvanceInfo(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancelar / Manter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleStageChange(blockedAdvanceInfo.targetStage, true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprovar Crédito e Avançar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
