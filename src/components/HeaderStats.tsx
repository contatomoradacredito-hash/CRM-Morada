import React from 'react';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Coins,
} from 'lucide-react';
import { ClientProcess } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/formatters';

interface HeaderStatsProps {
  processes: ClientProcess[];
  selectedMonth: string;
  onFilterByStage?: (stage: string) => void;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  processes,
  selectedMonth,
}) => {
  // Filter processes by selected month if not ALL
  const filteredProcesses =
    selectedMonth === 'ALL'
      ? processes
      : processes.filter((p) => p.estimatedIssuanceMonth === selectedMonth);

  const activeProcesses = filteredProcesses.filter(
    (p) => p.stage !== 'DECLINED_CANCELLED' && p.stage !== 'COMMISSION_PAID'
  );

  const totalVolume = activeProcesses.reduce((sum, p) => sum + p.financingValue, 0);

  const totalForecastCommission = filteredProcesses
    .filter((p) => p.stage !== 'DECLINED_CANCELLED')
    .reduce((sum, p) => sum + p.commissionAmount, 0);

  const paidCommission = filteredProcesses
    .filter((p) => p.stage === 'COMMISSION_PAID' || p.commissionStatus === 'PAGA')
    .reduce((sum, p) => sum + p.commissionAmount, 0);

  const readyForInvoiceCommission = filteredProcesses
    .filter(
      (p) =>
        p.stage === 'DISBURSEMENT_COMPLETED' ||
        p.commissionStatus === 'DISPONIVEL_FATURAMENTO'
    )
    .reduce((sum, p) => sum + p.commissionAmount, 0);

  const pendingRegistryCount = filteredProcesses.filter(
    (p) => p.stage === 'PROPERTY_REGISTRY' || p.stage === 'CONTRACT_SIGNATURE'
  ).length;

  const urgentOrPendingCount = filteredProcesses.filter(
    (p) => p.hasPendingIssues || p.priority === 'URGENTE'
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 my-4">
      {/* 1. Volume Total Financiado (VGV) */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              VGV em Andamento
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(totalVolume)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="font-medium text-slate-700">{activeProcesses.length} processos ativos</span>
          <span className="text-blue-600 font-semibold flex items-center text-[11px]">
            {selectedMonth === 'ALL' ? 'Geral' : formatMonthYear(selectedMonth)}
          </span>
        </div>
      </div>

      {/* 2. Previsão de Faturamento / Comissões */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-emerald-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              Previsão de Faturamento
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-900 mt-1">
              {formatCurrency(totalForecastCommission)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-emerald-100">
          <span className="text-emerald-800 font-medium">
            Média de 1.2% a 1.5%
          </span>
          <span className="text-emerald-700 font-semibold text-[11px]">
            Honorários Bancários
          </span>
        </div>
      </div>

      {/* 3. Recursos Liberados / Faturar */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Faturado / Recebido
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(paidCommission)}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="text-amber-700 font-medium text-[11px]">
            {formatCurrency(readyForInvoiceCommission)} pronto p/ nota
          </span>
          <span className="text-slate-400 text-[11px]">
            Liquidado
          </span>
        </div>
      </div>

      {/* 4. Processos em Reta Final (Cartório / Assinatura) */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Reta Final (Cartório/Assinatura)
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
              {pendingRegistryCount} <span className="text-xs font-normal text-slate-500">processos</span>
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span className="text-slate-600 font-medium">Emissão e RGI</span>
          {urgentOrPendingCount > 0 ? (
            <span className="text-rose-600 font-semibold flex items-center gap-1 text-[11px]">
              <AlertTriangle className="w-3 h-3" /> {urgentOrPendingCount} c/ pendência
            </span>
          ) : (
            <span className="text-emerald-600 font-medium flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3 h-3" /> Tudo em dia
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
