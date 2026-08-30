import React, { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreHorizontal,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  FileSpreadsheet,
  Building,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
} from 'lucide-react';
import { BankPartner, ClientProcess, ProcessStage } from '../types';
import { BANK_CONFIGS, CREDIT_TYPE_LABELS, STAGE_CONFIGS } from '../utils/constants';
import { formatCPF, formatCurrency, formatDate, formatMonthYear, formatPhone } from '../utils/formatters';

interface ProcessTableProps {
  processes: ClientProcess[];
  onSelectProcess: (process: ClientProcess) => void;
  onAdvanceStage: (processId: string, nextStage: ProcessStage) => void;
  onDeleteProcess: (processId: string) => void;
  onQuickWhatsApp: (process: ClientProcess) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const ProcessTable: React.FC<ProcessTableProps> = ({
  processes,
  onSelectProcess,
  onAdvanceStage,
  onDeleteProcess,
  onQuickWhatsApp,
  searchQuery,
  setSearchQuery,
}) => {
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'clientName' | 'financingValue' | 'commissionAmount' | 'createdAt' | 'stage'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter
  const filtered = processes.filter((p) => {
    if (stageFilter !== 'ALL' && p.stage !== stageFilter) return false;
    if (bankFilter !== 'ALL' && p.bank !== bankFilter) return false;
    if (monthFilter !== 'ALL' && p.estimatedIssuanceMonth !== monthFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.clientName.toLowerCase().includes(q);
      const matchCpf = p.clientCpf.includes(q.replace(/\D/g, ''));
      const matchBank = p.bank.toLowerCase().includes(q);
      const matchRealtor = p.partnerRealtorName?.toLowerCase().includes(q) || false;
      const matchProposal = p.proposalNumber?.toLowerCase().includes(q) || false;
      const matchCity = p.propertyCity.toLowerCase().includes(q);
      if (!matchName && !matchCpf && !matchBank && !matchRealtor && !matchProposal && !matchCity) {
        return false;
      }
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'clientName') {
      comparison = a.clientName.localeCompare(b.clientName);
    } else if (sortField === 'financingValue') {
      comparison = a.financingValue - b.financingValue;
    } else if (sortField === 'commissionAmount') {
      comparison = a.commissionAmount - b.commissionAmount;
    } else if (sortField === 'stage') {
      comparison = (STAGE_CONFIGS[a.stage]?.order || 0) - (STAGE_CONFIGS[b.stage]?.order || 0);
    } else {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const uniqueMonths: string[] = Array.from(new Set(processes.map((p) => p.estimatedIssuanceMonth))).filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-table-search"
              type="text"
              placeholder="Buscar cliente, CPF, banco, corretor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Etapa:</span>
            <select
              id="select-table-stage"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none text-xs"
            >
              <option value="ALL">Todas as Fases ({processes.length})</option>
              {Object.values(STAGE_CONFIGS).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({processes.filter((p) => p.stage === s.id).length})
                </option>
              ))}
            </select>
          </div>

          {/* Bank Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Banco:</span>
            <select
              id="select-table-bank"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none text-xs"
            >
              <option value="ALL">Todos os Bancos</option>
              {Object.keys(BANK_CONFIGS).map((b) => (
                <option key={b} value={b}>
                  {b} ({processes.filter((p) => p.bank === b).length})
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Previsão:</span>
            <select
              id="select-table-month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none text-xs"
            >
              <option value="ALL">Todos os Meses</option>
              {uniqueMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthYear(m)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Exibindo <span className="font-bold text-slate-800">{sorted.length}</span> de {processes.length} processos
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">
                  <button
                    onClick={() => handleSort('clientName')}
                    className="flex items-center gap-1 hover:text-emerald-700 cursor-pointer"
                  >
                    <span>Cliente / Imóvel</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">Banco Parceiro</th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => handleSort('stage')}
                    className="flex items-center gap-1 hover:text-emerald-700 cursor-pointer"
                  >
                    <span>Fase do Processo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => handleSort('financingValue')}
                    className="flex items-center gap-1 hover:text-emerald-700 cursor-pointer"
                  >
                    <span>Valor Financiado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    onClick={() => handleSort('commissionAmount')}
                    className="flex items-center gap-1 hover:text-emerald-700 cursor-pointer"
                  >
                    <span>Comissão Morada</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4">Previsão Emissão</th>
                <th className="py-3 px-4">Corretor / Origem</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhum processo encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                sorted.map((proc) => {
                  const stageConfig = STAGE_CONFIGS[proc.stage];
                  const bankConfig = BANK_CONFIGS[proc.bank] || BANK_CONFIGS['Outra Instituição'];

                  return (
                    <tr
                      key={proc.id}
                      id={`row-process-${proc.id}`}
                      onClick={() => onSelectProcess(proc)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Client info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {proc.clientName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>{formatCPF(proc.clientCpf)}</span>
                          <span>•</span>
                          <span>{formatPhone(proc.clientPhone)}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {proc.propertyCity}/{proc.propertyState} • {CREDIT_TYPE_LABELS[proc.creditType]?.short}
                        </div>
                      </td>

                      {/* Bank */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${bankConfig.badgeBg}`}>
                          {proc.bank}
                        </span>
                        {proc.proposalNumber && (
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            Prop: {proc.proposalNumber}
                          </div>
                        )}
                      </td>

                      {/* Stage */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          id={`table-select-stage-${proc.id}`}
                          value={proc.stage}
                          onChange={(e) => onAdvanceStage(proc.id, e.target.value as ProcessStage)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-md border ${stageConfig.badgeColor} bg-white cursor-pointer focus:outline-none`}
                        >
                          {Object.values(STAGE_CONFIGS).map((s) => (
                            <option key={s.id} value={s.id} className="bg-white text-slate-900">
                              {s.label}
                            </option>
                          ))}
                        </select>
                        {proc.hasPendingIssues && (
                          <div className="text-[10px] text-rose-600 font-medium flex items-center gap-0.5 mt-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Pendência</span>
                          </div>
                        )}
                      </td>

                      {/* Financing value */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">
                          {formatCurrency(proc.financingValue)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Imóvel: {formatCurrency(proc.propertyValue)}
                        </div>
                      </td>

                      {/* Commission */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-emerald-700 font-mono">
                          {formatCurrency(proc.commissionAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {proc.commissionPercentage}% do banco
                        </div>
                      </td>

                      {/* Forecast Month */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700">
                          {formatMonthYear(proc.estimatedIssuanceMonth)}
                        </div>
                        {proc.estimatedDisbursementDate && (
                          <div className="text-[10px] text-emerald-600">
                            Liberação: {formatDate(proc.estimatedDisbursementDate)}
                          </div>
                        )}
                      </td>

                      {/* Partner Realtor */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-700 font-medium">
                          {proc.partnerRealtorName || 'Direto'}
                        </div>
                        {proc.partnerRealtorCommissionPct ? (
                          <div className="text-[10px] text-slate-400">
                            Repasse: {proc.partnerRealtorCommissionPct}%
                          </div>
                        ) : null}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-table-whatsapp-${proc.id}`}
                            onClick={() => onQuickWhatsApp(proc)}
                            title="Atualizar via WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            id={`btn-table-details-${proc.id}`}
                            onClick={() => onSelectProcess(proc)}
                            title="Abrir Detalhes"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
