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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BankPartner, ClientProcess, CommissionStatus, CreditType, PriorityLevel, ProcessChecklistItem, ProcessNote, ProcessStage } from '../types';
import { BANK_CONFIGS, CREDIT_TYPE_LABELS, PIPELINE_STAGES, STAGE_CONFIGS } from '../utils/constants';
import { formatCPF, formatCurrency, formatDate, formatDateWithTime, formatMonthYear, formatPhone } from '../utils/formatters';

interface ProcessDetailModalProps {
  process: ClientProcess | null;
  onClose: () => void;
  onSave: (updatedProcess: ClientProcess) => void;
  onDelete: (processId: string) => void;
  onOpenWhatsApp: (process: ClientProcess) => void;
  onAdvanceStage?: (processId: string, nextStage: ProcessStage) => void;
}

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
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [newNoteCategory, setNewNoteCategory] = useState<ProcessNote['category']>('GERAL');
  const [newChecklistTitle, setNewChecklistTitle] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

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

  const handleStageChange = (newStage: ProcessStage) => {
    if (newStage === formData.stage) return;
    
    // If completed or paid, trigger confetti
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
      note: `Fase alterada para ${STAGE_CONFIGS[newStage]?.label || newStage}`,
    };

    setFormData((prev) => ({
      ...prev,
      stage: newStage,
      stageUpdatedAt: new Date().toISOString(),
      stageHistory: [historyEntry, ...prev.stageHistory],
    }));
    setHasUnsavedChanges(true);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {formData.clientName}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bankConfig.badgeBg}`}>
                  {formData.bank}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatCPF(formData.clientCpf)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {CREDIT_TYPE_LABELS[formData.creditType]?.label} • {formData.propertyCity}/{formData.propertyState}
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {nextStage && (
              <button
                id="modal-btn-advance-top"
                onClick={() => {
                  handleStageChange(nextStage);
                  if (onAdvanceStage) {
                    onAdvanceStage(formData.id, nextStage);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition shadow-xs cursor-pointer active:scale-95"
              >
                <span>Avançar p/ {STAGE_CONFIGS[nextStage]?.shortLabel || nextStage}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id="modal-btn-whatsapp"
              onClick={() => onOpenWhatsApp(formData)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              id="modal-btn-save"
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>Salvar</span>
            </button>

            <button
              id="modal-btn-close"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visual 8-Step Interactive Pipeline Stepper */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 overflow-x-auto no-scrollbar">
          <div className="flex items-center min-w-[700px] justify-between relative">
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
                  className={`flex flex-col items-center gap-1 group transition cursor-pointer relative z-10 px-1`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCurrent
                        ? `${cfg.bgColor} text-white ring-4 ring-emerald-500/30 scale-110 shadow-md`
                        : isPast
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : index + 1}
                  </div>
                  <span
                    className={`text-[10px] font-bold tracking-tight whitespace-nowrap ${
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

        {/* Stage Switcher Banner */}
        <div className="bg-slate-100 p-3 sm:px-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase">Fase do Processo:</span>
            <select
              id="modal-select-stage"
              value={formData.stage}
              onChange={(e) => handleStageChange(e.target.value as ProcessStage)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
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
                className="px-2 py-1 rounded bg-slate-900 hover:bg-emerald-600 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>Avançar p/ {STAGE_CONFIGS[nextStage]?.shortLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Priority Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Prioridade:</span>
              <select
                id="modal-select-priority"
                value={formData.priority}
                onChange={(e) => {
                  setFormData({ ...formData, priority: e.target.value as PriorityLevel });
                  setHasUnsavedChanges(true);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
              >
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>

            {/* Pending Issue checkbox */}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 cursor-pointer">
              <input
                id="modal-checkbox-pending"
                type="checkbox"
                checked={formData.hasPendingIssues || false}
                onChange={(e) => {
                  setFormData({ ...formData, hasPendingIssues: e.target.checked });
                  setHasUnsavedChanges(true);
                }}
                className="rounded text-rose-600"
              />
              <span>Com Pendência</span>
            </label>
          </div>
        </div>

        {/* Pending description field if checked */}
        {formData.hasPendingIssues && (
          <div className="bg-rose-50/80 px-4 py-2 border-b border-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <input
              id="modal-input-pending-desc"
              type="text"
              placeholder="Descreva a pendência ou motivo do travamento do processo..."
              value={formData.pendingIssueDescription || ''}
              onChange={(e) => {
                setFormData({ ...formData, pendingIssueDescription: e.target.value });
                setHasUnsavedChanges(true);
              }}
              className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1 text-xs text-rose-900 focus:outline-none"
            />
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-4 sm:px-5 gap-4 overflow-x-auto no-scrollbar">
          <button
            id="modal-tab-details"
            onClick={() => setActiveTab('details')}
            className={`py-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'details'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Dados do Financiamento & Imóvel
          </button>

          <button
            id="modal-tab-checklist"
            onClick={() => setActiveTab('checklist')}
            className={`py-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'checklist'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📁 Checklist Documental</span>
            <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
              {completedChecklist}/{totalChecklist}
            </span>
          </button>

          <button
            id="modal-tab-history"
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⏱️ Linha do Tempo</span>
            <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
              {formData.stageHistory.length}
            </span>
          </button>

          <button
            id="modal-tab-notes"
            onClick={() => setActiveTab('notes')}
            className={`py-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>💬 Anotações Internas</span>
            <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
              {formData.notes.length}
            </span>
          </button>

          <button
            id="modal-tab-financial"
            onClick={() => setActiveTab('financial')}
            className={`py-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'financial'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>💰 Comissão & Faturamento</span>
            <span className="text-emerald-700 font-mono text-[11px]">
              {formatCurrency(formData.commissionAmount)}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Card 1: Cliente e Cônjuge */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Dados do Cliente / Proponente</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={formData.clientName}
                      onChange={(e) => {
                        setFormData({ ...formData, clientName: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">CPF</label>
                    <input
                      type="text"
                      value={formData.clientCpf}
                      onChange={(e) => {
                        setFormData({ ...formData, clientCpf: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={formData.clientPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, clientPhone: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={formData.clientEmail || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, clientEmail: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nome do Cônjuge</label>
                    <input
                      type="text"
                      value={formData.spouseName || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, spouseName: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">CPF Cônjuge</label>
                    <input
                      type="text"
                      value={formData.spouseCpf || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, spouseCpf: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Operação Financeira & Banco */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Operação de Crédito & Instituição</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Banco Operador</label>
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      {Object.keys(BANK_CONFIGS).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nº Proposta no Banco</label>
                    <input
                      type="text"
                      value={formData.proposalNumber || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, proposalNumber: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Ex: ITU-2026-98124"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo de Crédito</label>
                    <select
                      value={formData.creditType}
                      onChange={(e) => {
                        setFormData({ ...formData, creditType: e.target.value as CreditType });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      {Object.entries(CREDIT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Valor do Imóvel (R$)</label>
                    <input
                      type="number"
                      step="5000"
                      value={formData.propertyValue}
                      onChange={(e) => {
                        setFormData({ ...formData, propertyValue: Number(e.target.value) });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Valor Financiado (R$)</label>
                    <input
                      type="number"
                      step="5000"
                      value={formData.financingValue}
                      onChange={(e) => handleFinancingOrCommissionChange(Number(e.target.value), formData.commissionPercentage)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Prazo (Meses)</label>
                    <input
                      type="number"
                      value={formData.termMonths}
                      onChange={(e) => {
                        setFormData({ ...formData, termMonths: Number(e.target.value) });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Taxa a.a. (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={formData.interestRateAnnual}
                      onChange={(e) => {
                        setFormData({ ...formData, interestRateAnnual: Number(e.target.value) });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Imóvel, Cartório & Prazos */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Imóvel, Cartório de Registro (RGI) & Prazos</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cidade / UF</label>
                    <div className="grid grid-cols-3 gap-1">
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={formData.propertyCity}
                        onChange={(e) => {
                          setFormData({ ...formData, propertyCity: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="UF"
                        value={formData.propertyState}
                        onChange={(e) => {
                          setFormData({ ...formData, propertyState: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="col-span-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 text-center font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cartório de Registro (RGI)</label>
                    <input
                      type="text"
                      placeholder="Ex: 13º Cartório de Imóveis de SP"
                      value={formData.registryOfficeName || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, registryOfficeName: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Número de Protocolo / Prenotação</label>
                    <input
                      type="text"
                      placeholder="Ex: PRE-849.201/26"
                      value={formData.rgiProtocolNumber || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, rgiProtocolNumber: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-indigo-900 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mês Previsão de Emissão</label>
                    <input
                      type="month"
                      value={formData.estimatedIssuanceMonth}
                      onChange={(e) => {
                        setFormData({ ...formData, estimatedIssuanceMonth: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Previsão Liberação de Recursos</label>
                    <input
                      type="date"
                      value={formData.estimatedDisbursementDate || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, estimatedDisbursementDate: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Corretor Parceiro / Imobiliária</label>
                    <input
                      type="text"
                      placeholder="Ex: Marcos (Prime Imóveis)"
                      value={formData.partnerRealtorName || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, partnerRealtorName: e.target.value });
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {/* Progress Summary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Progresso do Dossiê Documental</h4>
                  <p className="text-xs text-slate-500">
                    {completedChecklist} de {totalChecklist} requisitos atendidos ({checklistPercent}%)
                  </p>
                </div>
                <div className="w-36 bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
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
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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
                      className={`bg-white rounded-xl border p-3.5 shadow-2xs ${
                        isCurrent ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{STAGE_CONFIGS[st].label}</span>
                          {isCurrent && (
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
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
                            className={`flex items-start gap-2.5 p-2 rounded-lg transition cursor-pointer ${
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
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
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
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-xs text-slate-900 mb-3">Linha do Tempo de Evolução das Fases</h4>
                <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {formData.stageHistory.map((h, idx) => {
                    const toConfig = STAGE_CONFIGS[h.toStage];
                    return (
                      <div key={h.id || idx} className="flex items-start gap-3 relative pl-1">
                        <div className={`w-6 h-6 rounded-full ${toConfig.bgColor} text-white flex items-center justify-center text-[10px] font-bold z-10 shrink-0 shadow-xs`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{toConfig.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatDateWithTime(h.changedAt)}
                            </span>
                          </div>
                          {h.note && (
                            <p className="text-[11px] text-slate-600 mt-0.5">{h.note}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Box */}
              <form onSubmit={handleAddNote} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <span>Adicionar Anotação / Registro de Contato</span>
                </h4>
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Digite a anotação sobre ligação com banco, cartório, corretor ou cliente..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-medium">Categoria:</span>
                    <select
                      value={newNoteCategory}
                      onChange={(e) => setNewNoteCategory(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      <option value="GERAL">Geral</option>
                      <option value="BANCO">Banco Operador</option>
                      <option value="JURIDICO">Jurídico / Dossiê</option>
                      <option value="CARTORIO">Cartório de Imóveis</option>
                      <option value="CLIENTE">Cliente / Vendedor</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gravar Nota</span>
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2.5">
                {formData.notes.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">Nenhuma anotação registrada ainda.</p>
                ) : (
                  formData.notes.map((note) => (
                    <div key={note.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-100 pb-1">
                        <span className="font-bold text-slate-700">{note.author}</span>
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded uppercase font-semibold">
                            {note.category}
                          </span>
                          <span>{formatDateWithTime(note.createdAt)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap pt-0.5">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIAL */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Detalhamento da Comissão & Honorários de Assessoria</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Financiado</span>
                    <span className="text-base font-black text-slate-900 mt-1 block">
                      {formatCurrency(formData.financingValue)}
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Comissão Morada Crédito</span>
                    <span className="text-base font-black text-emerald-900 mt-1 block font-mono">
                      {formatCurrency(formData.commissionAmount)} ({formData.commissionPercentage}%)
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Status da Comissão</span>
                    <select
                      value={formData.commissionStatus}
                      onChange={(e) => {
                        setFormData({ ...formData, commissionStatus: e.target.value as CommissionStatus });
                        setHasUnsavedChanges(true);
                      }}
                      className="mt-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 w-full"
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
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
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
        <div className="bg-slate-100 p-3 sm:px-5 border-t border-slate-200 flex items-center justify-between">
          <button
            id="modal-btn-delete-process"
            onClick={() => {
              if (confirm(`Tem certeza que deseja excluir o processo de ${formData.clientName}?`)) {
                onDelete(formData.id);
                onClose();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Processo</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="modal-btn-cancel"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-300 cursor-pointer"
            >
              Fechar
            </button>

            <button
              id="modal-btn-save-confirm"
              onClick={handleSaveAll}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
