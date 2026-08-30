import React, { useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  Home,
  FileCheck2,
  FileText,
  PenTool,
  Building2,
  Coins,
  CheckCheck,
  XCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  AlertCircle,
  Filter,
  MessageCircle,
  TrendingUp,
  Sparkles,
  Database,
  RefreshCw,
  MoreVertical,
  Layers,
  ShieldAlert,
  Check,
  X,
  SlidersHorizontal,
  Scale,
} from 'lucide-react';
import { BankPartner, ClientProcess, CreditAnalysisStatus, ProcessStage } from '../types';
import {
  BANK_CONFIGS,
  CREDIT_ANALYSIS_STATUS_CONFIGS,
  CREDIT_TYPE_LABELS,
  PIPELINE_STAGES,
  STAGE_CONFIGS,
  canAdvanceToStage,
} from '../utils/constants';
import { formatCurrency, formatMonthYear, getDaysDifference } from '../utils/formatters';

interface PipelineBoardProps {
  processes: ClientProcess[];
  onSelectProcess: (process: ClientProcess) => void;
  onAdvanceStage: (processId: string, nextStage: ProcessStage) => void;
  onUpdateCreditStatus?: (processId: string, status: CreditAnalysisStatus) => void;
  onOpenNewProcess: () => void;
  onOpenNewProcessWithMonth?: (month: string) => void;
  onResetData?: () => void;
  onOpenDataManagement?: () => void;
  onQuickWhatsApp: (process: ClientProcess) => void;
  selectedBankFilter: string;
  setSelectedBankFilter: (bank: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  processes,
  onSelectProcess,
  onAdvanceStage,
  onUpdateCreditStatus,
  onOpenNewProcess,
  onOpenNewProcessWithMonth,
  onResetData,
  onOpenDataManagement,
  onQuickWhatsApp,
  selectedBankFilter,
  setSelectedBankFilter,
  searchQuery,
  setSearchQuery,
}) => {
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [blockedModal, setBlockedModal] = useState<{
    process: ClientProcess;
    targetStage: ProcessStage;
    reason?: string;
  } | null>(null);

  const handleAttemptAdvance = (proc: ClientProcess, targetStage: ProcessStage) => {
    const check = canAdvanceToStage(targetStage, proc.creditAnalysisStatus);
    if (!check.allowed) {
      setBlockedModal({
        process: proc,
        targetStage,
        reason: check.reason,
      });
      return;
    }
    onAdvanceStage(proc.id, targetStage);
  };

  // Filter processes
  const filteredProcesses = processes.filter((p) => {
    // Bank filter
    if (selectedBankFilter !== 'ALL' && p.bank !== selectedBankFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.clientName?.toLowerCase().includes(q) || false;
      const matchCpf = (p.clientCpf || '').includes(q.replace(/\D/g, ''));
      const matchBank = p.bank?.toLowerCase().includes(q) || false;
      const matchRealtor = p.partnerRealtorName?.toLowerCase().includes(q) || false;
      const matchProposal = p.proposalNumber?.toLowerCase().includes(q) || false;
      const matchCity = p.propertyCity?.toLowerCase().includes(q) || false;
      if (!matchName && !matchCpf && !matchBank && !matchRealtor && !matchProposal && !matchCity) {
        return false;
      }
    }

    return true;
  });

  // Calculate next and previous stage helpers
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

  const getPrevStage = (current: ProcessStage): ProcessStage | null => {
    const idx = allOrderedStages.indexOf(current);
    if (idx > 0) {
      return allOrderedStages[idx - 1];
    }
    return null;
  };

  const getStageIcon = (iconName: string) => {
    switch (iconName) {
      case 'Calculator':
        return <Calculator className="w-4 h-4" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Home':
        return <Home className="w-4 h-4" />;
      case 'FileCheck2':
        return <FileCheck2 className="w-4 h-4" />;
      case 'SlidersHorizontal':
      case 'Scale':
        return <SlidersHorizontal className="w-4 h-4" />;
      case 'FileText':
        return <FileText className="w-4 h-4" />;
      case 'PenTool':
        return <PenTool className="w-4 h-4" />;
      case 'Building2':
        return <Building2 className="w-4 h-4" />;
      case 'Coins':
        return <Coins className="w-4 h-4" />;
      case 'CheckCheck':
        return <CheckCheck className="w-4 h-4" />;
      case 'XCircle':
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const isFilterActive = selectedBankFilter !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="space-y-4">
      {/* If Base is empty, show zero-state */}
      {processes.length === 0 && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-500/30 animate-in fade-in duration-200">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-3">
              <Database className="w-3.5 h-3.5" />
              <span>Base Limpa e Pronta</span>
            </div>
            <h2 className="text-xl font-black text-white">
              Sua esteira da Morada Crédito está pronta para novos lançamentos
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Cadastre suas propostas de financiamento imobiliário e home equity. O funil permite acompanhar cada fase da aprovação bancária até a liberação dos recursos e comissão.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                id="btn-zero-state-new"
                onClick={onOpenNewProcess}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cadastrar Primeira Proposta</span>
              </button>

              {onResetData && (
                <button
                  id="btn-zero-state-restore-sample"
                  onClick={onResetData}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Carregar Base Demonstrativa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Active Alert Banner */}
      {isFilterActive && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Filtro ativo: exibindo <strong>{filteredProcesses.length}</strong> de <strong>{processes.length}</strong> propostas.
              {selectedBankFilter !== 'ALL' && <span className="ml-1">Banco: <strong>{selectedBankFilter}</strong>.</span>}
              {searchQuery.trim() && <span className="ml-1">Busca: &ldquo;{searchQuery}&rdquo;.</span>}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedBankFilter('ALL');
              setSearchQuery('');
            }}
            className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold transition text-xs shrink-0 cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Quick Bank & View Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Banco:
          </span>
          <button
            id="filter-bank-all"
            onClick={() => setSelectedBankFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              selectedBankFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({processes.length})
          </button>
          {Object.keys(BANK_CONFIGS).map((b) => {
            const count = processes.filter((p) => p.bank === b).length;
            if (count === 0 && selectedBankFilter !== b) return null;
            return (
              <button
                key={b}
                id={`filter-bank-${b.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSelectedBankFilter(b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedBankFilter === b
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {b} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-process-top-board"
            onClick={onOpenNewProcess}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Proposta</span>
          </button>

          <button
            id="toggle-show-archived"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              showArchived
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{showArchived ? 'Ocultar Concluídos' : 'Ver Concluídos & Cancelados'}</span>
          </button>
        </div>
      </div>

      {/* Main Kanban Board (Horizontal Scrolling Columns) */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div className="flex gap-3.5 min-w-[1750px] items-start">
          {PIPELINE_STAGES.map((stageKey) => {
            const config = STAGE_CONFIGS[stageKey] || STAGE_CONFIGS['SIMULATION_COLLECTION'];
            // If stageKey is SIMULATION_COLLECTION, also catch processes with unknown/invalid stage names
            const stageProcesses = filteredProcesses.filter((p) => {
              if (p.stage === stageKey) return true;
              if (stageKey === 'SIMULATION_COLLECTION') {
                return !PIPELINE_STAGES.includes(p.stage as any) && p.stage !== 'COMMISSION_PAID' && p.stage !== 'DECLINED_CANCELLED';
              }
              return false;
            });

            const totalStageVolume = stageProcesses.reduce((s, p) => s + (p.financingValue || 0), 0);
            const totalStageCommission = stageProcesses.reduce((s, p) => s + (p.commissionAmount || 0), 0);

            return (
              <div
                key={stageKey}
                id={`stage-column-${stageKey}`}
                className="w-[280px] shrink-0 bg-slate-100/90 rounded-xl p-3 border border-slate-200 flex flex-col max-h-[calc(100vh-210px)] min-h-[460px]"
              >
                {/* Column Header */}
                <div className="pb-2.5 mb-2 border-b border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`p-1.5 rounded-lg text-white ${config.bgColor}`}>
                        {getStageIcon(config.iconName)}
                      </span>
                      <h3 className="font-bold text-xs text-slate-800 tracking-tight leading-snug">
                        {config.label}
                      </h3>
                    </div>
                    <span className="bg-white text-slate-700 font-extrabold text-xs px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                      {stageProcesses.length}
                    </span>
                  </div>

                  {/* Stage Metrics Subhead */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 bg-white/70 px-2 py-1 rounded-md border border-slate-200/50">
                    <span className="font-medium">{formatCurrency(totalStageVolume)}</span>
                    <span className="text-emerald-700 font-semibold font-mono">
                      {formatCurrency(totalStageCommission)}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                  {stageProcesses.length === 0 ? (
                    <div className="h-36 flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs">
                      <p>Nenhum processo nesta fase</p>
                    </div>
                  ) : (
                    stageProcesses.map((proc) => {
                      const bankConfig = BANK_CONFIGS[proc.bank] || BANK_CONFIGS['Outra Instituição'];
                      const daysInStage = getDaysDifference(proc.stageUpdatedAt || proc.createdAt);
                      const nextStage = getNextStage(proc.stage);
                      const prevStage = getPrevStage(proc.stage);

                      return (
                        <div
                          key={proc.id}
                          id={`card-process-${proc.id}`}
                          onClick={() => onSelectProcess(proc)}
                          className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-400/80 transition-all cursor-pointer group relative flex flex-col justify-between"
                        >
                          {/* Priority or Alert Indicator */}
                          {proc.hasPendingIssues && (
                            <div className="mb-2 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                              <span className="truncate">{proc.pendingIssueDescription || 'Pendência ativa'}</span>
                            </div>
                          )}

                          {/* Bank & Type Badge */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bankConfig.badgeBg}`}
                            >
                              {proc.bank}
                            </span>
                            {proc.priority === 'URGENTE' && (
                              <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide animate-pulse">
                                Urgente
                              </span>
                            )}
                            {proc.priority === 'ALTA' && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                Alta
                              </span>
                            )}
                          </div>

                          {/* Client Name */}
                          <h4 className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-700 transition line-clamp-1">
                            {proc.clientName}
                          </h4>

                          <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">
                            {CREDIT_TYPE_LABELS[proc.creditType]?.short || 'Financiamento'} • {proc.propertyCity || 'Imóvel'}/{proc.propertyState || 'BR'}
                          </p>

                          {/* Financial Values */}
                          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 text-xs mb-2">
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="text-[10px] uppercase font-semibold text-slate-400">Financiado:</span>
                              <span className="font-bold text-slate-900">{formatCurrency(proc.financingValue)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1 text-slate-600 pt-1 border-t border-slate-200/50">
                              <span className="text-[10px] uppercase font-semibold text-slate-400">Comissão:</span>
                              <span className="font-bold text-emerald-700 font-mono">
                                {formatCurrency(proc.commissionAmount)} ({proc.commissionPercentage}%)
                              </span>
                            </div>
                          </div>

                          {/* Protocol & Details */}
                          {proc.proposalNumber && (
                            <div className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded mb-2 font-mono flex items-center justify-between">
                              <span className="text-slate-400">Proposta:</span>
                              <span className="font-bold">{proc.proposalNumber}</span>
                            </div>
                          )}

                          {/* Meta: Days in Stage & Estimated Month */}
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {daysInStage === 0 ? 'Hoje' : `${daysInStage}d nesta fase`}
                            </span>
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              Prev: {formatMonthYear(proc.estimatedIssuanceMonth).split(' ')[0]}
                            </span>
                          </div>

                          {/* Credit Analysis Substatus (Interactive on Stage 2, Badge on other stages) */}
                          {proc.stage === 'CREDIT_ANALYSIS' ? (
                            <div
                              className="mb-2 p-2 rounded-lg bg-slate-50 border border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                                <span>Status da Análise:</span>
                                <span className={CREDIT_ANALYSIS_STATUS_CONFIGS[proc.creditAnalysisStatus || 'EM_ANALISE']?.textColor}>
                                  {CREDIT_ANALYSIS_STATUS_CONFIGS[proc.creditAnalysisStatus || 'EM_ANALISE']?.label}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1">
                                <button
                                  type="button"
                                  id={`btn-credit-analysis-${proc.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateCreditStatus?.(proc.id, 'EM_ANALISE');
                                  }}
                                  className={`py-1 px-0.5 text-[10px] font-bold rounded flex items-center justify-center gap-0.5 transition ${
                                    !proc.creditAnalysisStatus || proc.creditAnalysisStatus === 'EM_ANALISE'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                                  <span>Análise</span>
                                </button>
                                <button
                                  type="button"
                                  id={`btn-credit-approved-${proc.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateCreditStatus?.(proc.id, 'APROVADO');
                                  }}
                                  className={`py-1 px-0.5 text-[10px] font-bold rounded flex items-center justify-center gap-0.5 transition ${
                                    proc.creditAnalysisStatus === 'APROVADO'
                                      ? 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-400'
                                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                  }`}
                                >
                                  <Check className="w-3 h-3 text-emerald-300" />
                                  <span>Aprovado</span>
                                </button>
                                <button
                                  type="button"
                                  id={`btn-credit-rejected-${proc.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdateCreditStatus?.(proc.id, 'RECUSADO');
                                  }}
                                  className={`py-1 px-0.5 text-[10px] font-bold rounded flex items-center justify-center gap-0.5 transition ${
                                    proc.creditAnalysisStatus === 'RECUSADO'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                  }`}
                                >
                                  <X className="w-3 h-3 text-rose-300" />
                                  <span>Recusado</span>
                                </button>
                              </div>
                            </div>
                          ) : proc.stage === 'VALUE_CONFIRMATION' ? (
                            <div className="mb-2 bg-gradient-to-br from-amber-50 to-amber-100/70 p-2 rounded-lg border border-amber-300 text-[11px] text-amber-950 space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                                <span className="flex items-center gap-1">
                                  <SlidersHorizontal className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Ajuste de Valores:</span>
                                </span>
                                <span className="font-mono bg-amber-200/80 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                  {proc.interestRateAnnual}% a.a.
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold">
                                <div>
                                  <span className="text-amber-800/70 block text-[9px]">Prazo:</span>
                                  <span className="font-bold">{proc.termMonths} meses</span>
                                </div>
                                <div>
                                  <span className="text-amber-800/70 block text-[9px]">Financiado:</span>
                                  <span className="font-bold text-emerald-800">{formatCurrency(proc.financingValue)}</span>
                                </div>
                              </div>
                            </div>
                          ) : proc.stage !== 'SIMULATION_COLLECTION' && proc.creditAnalysisStatus === 'APROVADO' ? (
                            <div className="mb-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Crédito Aprovado</span>
                            </div>
                          ) : null}

                          {/* Notes or General Observation Snippet */}
                          {(proc.generalObservations || (proc.notes && proc.notes.length > 0)) && (
                            <div
                              className="mb-2 bg-amber-50/70 border border-amber-200/80 rounded-lg p-1.5 text-[10px] text-slate-700 space-y-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectProcess(proc);
                              }}
                            >
                              <div className="flex items-center justify-between text-[9px] font-bold text-amber-900">
                                <span className="flex items-center gap-1">
                                  <MessageCircle className="w-3 h-3 text-amber-600" />
                                  <span>{proc.notes && proc.notes.length > 0 ? 'Última Nota / Obs' : 'Observação'}</span>
                                </span>
                                {proc.notes && proc.notes.length > 0 && (
                                  <span className="bg-amber-200/90 text-amber-950 px-1 py-0.2 rounded font-mono font-bold">
                                    {proc.notes.length}
                                  </span>
                                )}
                              </div>
                              <p className="line-clamp-1 italic text-slate-600 text-[10px]">
                                {proc.notes && proc.notes.length > 0 ? proc.notes[0].text : proc.generalObservations}
                              </p>
                            </div>
                          )}

                          {/* Quick Stage Mover Selector */}
                          <div
                            className="mb-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-semibold text-slate-500 shrink-0">Mover:</span>
                            <select
                              id={`select-move-stage-${proc.id}`}
                              value={proc.stage}
                              onChange={(e) => handleAttemptAdvance(proc, e.target.value as ProcessStage)}
                              className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
                            >
                              {Object.values(STAGE_CONFIGS).map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Quick Action Footer */}
                          <div
                            className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Previous stage button */}
                            {prevStage ? (
                              <button
                                id={`btn-prev-stage-${proc.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttemptAdvance(proc, prevStage);
                                }}
                                title={`Voltar para ${STAGE_CONFIGS[prevStage]?.shortLabel || prevStage}`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs transition cursor-pointer flex items-center gap-0.5"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div className="w-6" />
                            )}

                            {/* WhatsApp Quick Button */}
                            <button
                              id={`btn-whatsapp-${proc.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickWhatsApp(proc);
                              }}
                              title="Enviar atualização via WhatsApp"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold transition cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Zap</span>
                            </button>

                            {/* Next Stage Button */}
                            {nextStage && (
                              <button
                                id={`btn-next-stage-${proc.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAttemptAdvance(proc, nextStage);
                                }}
                                title={`Avançar para ${STAGE_CONFIGS[nextStage]?.shortLabel || nextStage}`}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[10px] font-bold transition cursor-pointer shadow-xs active:scale-95 ${
                                  proc.stage === 'CREDIT_ANALYSIS' && proc.creditAnalysisStatus === 'APROVADO'
                                    ? 'bg-emerald-600 hover:bg-emerald-500'
                                    : 'bg-slate-900 hover:bg-emerald-600'
                                }`}
                              >
                                <span>Avançar</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Quick Add at bottom of column */}
                {stageKey === 'SIMULATION_COLLECTION' && (
                  <button
                    id="btn-column-quick-add"
                    onClick={onOpenNewProcess}
                    className="mt-2 w-full py-1.5 px-2 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Proposta</span>
                  </button>
                )}
              </div>
            );
          })}

          {/* Archived / Completed Columns if enabled */}
          {showArchived && (
            <>
              {/* Completed & Paid Column */}
              {(() => {
                const config = STAGE_CONFIGS['COMMISSION_PAID'];
                const stageProcesses = filteredProcesses.filter((p) => p.stage === 'COMMISSION_PAID');
                const totalStageVolume = stageProcesses.reduce((s, p) => s + p.financingValue, 0);
                const totalStageCommission = stageProcesses.reduce((s, p) => s + p.commissionAmount, 0);

                return (
                  <div
                    key="COMMISSION_PAID"
                    id="stage-column-COMMISSION_PAID"
                    className="w-[280px] shrink-0 bg-green-50/80 rounded-xl p-3 border border-green-200 flex flex-col max-h-[calc(100vh-210px)] min-h-[460px]"
                  >
                    <div className="pb-2.5 mb-2 border-b border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1.5 rounded-lg text-white ${config.bgColor}`}>
                            <CheckCheck className="w-4 h-4" />
                          </span>
                          <h3 className="font-bold text-xs text-green-900 tracking-tight leading-snug">
                            {config.label}
                          </h3>
                        </div>
                        <span className="bg-green-100 text-green-800 font-extrabold text-xs px-2 py-0.5 rounded-full border border-green-300">
                          {stageProcesses.length}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-green-800 bg-white/70 px-2 py-1 rounded-md border border-green-200">
                        <span className="font-medium">{formatCurrency(totalStageVolume)}</span>
                        <span className="text-green-700 font-semibold font-mono">
                          {formatCurrency(totalStageCommission)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                      {stageProcesses.map((proc) => (
                        <div
                          key={proc.id}
                          onClick={() => onSelectProcess(proc)}
                          className="bg-white rounded-xl p-3 border border-green-200 shadow-xs hover:shadow-md transition cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-green-800 bg-green-100 px-1.5 py-0.5 rounded">
                              {proc.bank}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Comissão Paga
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{proc.clientName}</h4>
                          <div className="text-xs font-mono font-bold text-green-700 mt-1">
                            {formatCurrency(proc.commissionAmount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Declined Column */}
              {(() => {
                const config = STAGE_CONFIGS['DECLINED_CANCELLED'];
                const stageProcesses = filteredProcesses.filter((p) => p.stage === 'DECLINED_CANCELLED');

                return (
                  <div
                    key="DECLINED_CANCELLED"
                    id="stage-column-DECLINED_CANCELLED"
                    className="w-[280px] shrink-0 bg-rose-50/80 rounded-xl p-3 border border-rose-200 flex flex-col max-h-[calc(100vh-210px)] min-h-[460px]"
                  >
                    <div className="pb-2.5 mb-2 border-b border-rose-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1.5 rounded-lg text-white ${config.bgColor}`}>
                            <XCircle className="w-4 h-4" />
                          </span>
                          <h3 className="font-bold text-xs text-rose-900 tracking-tight leading-snug">
                            {config.label}
                          </h3>
                        </div>
                        <span className="bg-rose-100 text-rose-800 font-extrabold text-xs px-2 py-0.5 rounded-full border border-rose-300">
                          {stageProcesses.length}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                      {stageProcesses.map((proc) => (
                        <div
                          key={proc.id}
                          onClick={() => onSelectProcess(proc)}
                          className="bg-white rounded-xl p-3 border border-rose-200 shadow-xs hover:shadow-md transition cursor-pointer"
                        >
                          <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{proc.clientName}</h4>
                          <p className="text-[10px] text-rose-700 mt-1 line-clamp-2">
                            {proc.declineReason || 'Processo arquivado/declinado'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Credit Approval Block Modal */}
      {blockedModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Aprovação de Crédito Obrigatória</h3>
                  <p className="text-[11px] text-slate-400">Controle de avanço do funil</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockedModal(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                <p className="font-semibold leading-relaxed">
                  Para avançar o processo de <strong className="text-slate-950">{blockedModal.process.clientName}</strong> para a etapa de{' '}
                  <strong className="text-slate-950">{STAGE_CONFIGS[blockedModal.targetStage]?.label}</strong>, o crédito bancário precisa estar com status <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Aprovado</span>.
                </p>
                <p className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60">
                  Status atual: <span className="font-bold uppercase tracking-wider">{blockedModal.process.creditAnalysisStatus === 'RECUSADO' ? 'Recusado' : 'Em Análise'}</span>
                </p>
              </div>

              <p className="text-xs text-slate-600">
                Deseja alterar o status da Análise de Crédito para <strong>Aprovado</strong> e avançar agora?
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBlockedModal(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar / Manter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateCreditStatus) {
                      onUpdateCreditStatus(blockedModal.process.id, 'APROVADO');
                    }
                    onAdvanceStage(blockedModal.process.id, blockedModal.targetStage);
                    setBlockedModal(null);
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
  );
};
