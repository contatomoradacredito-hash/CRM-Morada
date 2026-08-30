import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PiggyBank,
  Building,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Award,
  Filter,
  BarChart3,
  Percent,
  Sliders,
  ChevronRight,
  History,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { BankPartner, ClientProcess } from '../types';
import { BANK_CONFIGS, STAGE_CONFIGS } from '../utils/constants';
import { formatCurrency, formatMonthYear, formatPercent } from '../utils/formatters';

interface FinancialDashboardProps {
  processes: ClientProcess[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  onSelectProcess: (process: ClientProcess) => void;
  onOpenDataManagement?: () => void;
}

type ChartMetric = 'combined' | 'volume' | 'contracts' | 'commission';

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  processes,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  onSelectProcess,
  onOpenDataManagement,
}) => {
  const [monthlyRevenueGoal, setMonthlyRevenueGoal] = useState<number>(35000);
  const [selectedHistoryYear, setSelectedHistoryYear] = useState<string>('2026');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('combined');

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add('2026');
    processes.forEach((p) => {
      if (p.estimatedIssuanceMonth && p.estimatedIssuanceMonth.includes('-')) {
        years.add(p.estimatedIssuanceMonth.split('-')[0]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [processes]);

  // Month filtered processes (for top section KPI & current month detail)
  const currentMonthProcesses =
    selectedMonth === 'ALL'
      ? processes
      : processes.filter((p) => p.estimatedIssuanceMonth === selectedMonth);

  const activeNonDeclined = currentMonthProcesses.filter((p) => p.stage !== 'DECLINED_CANCELLED');

  const totalVolume = activeNonDeclined.reduce((acc, p) => acc + p.financingValue, 0);
  const totalForecastCommission = activeNonDeclined.reduce((acc, p) => acc + p.commissionAmount, 0);

  const paidCommission = currentMonthProcesses
    .filter((p) => p.stage === 'COMMISSION_PAID' || p.commissionStatus === 'PAGA')
    .reduce((acc, p) => acc + p.commissionAmount, 0);

  const readyForBilling = currentMonthProcesses
    .filter(
      (p) =>
        p.stage === 'DISBURSEMENT_COMPLETED' ||
        p.commissionStatus === 'DISPONIVEL_FATURAMENTO'
    )
    .reduce((acc, p) => acc + p.commissionAmount, 0);

  const pendingRegistryCommission = currentMonthProcesses
    .filter(
      (p) =>
        p.stage === 'PROPERTY_REGISTRY' ||
        p.stage === 'CONTRACT_SIGNATURE' ||
        p.commissionStatus === 'AGUARDANDO_REGISTRO'
    )
    .reduce((acc, p) => acc + p.commissionAmount, 0);

  const inAnalysisCommission = currentMonthProcesses
    .filter((p) =>
      ['SIMULATION_COLLECTION', 'CREDIT_ANALYSIS', 'PROPERTY_VALUATION', 'LEGAL_COMPLIANCE', 'CONTRACT_ISSUANCE'].includes(
        p.stage
      )
    )
    .reduce((acc, p) => acc + p.commissionAmount, 0);

  // Realtor Payouts (Repasses a Corretores)
  const totalRealtorPayouts = activeNonDeclined.reduce((acc, p) => {
    if (p.partnerRealtorCommissionPct && p.partnerRealtorCommissionPct > 0) {
      return acc + (p.financingValue * p.partnerRealtorCommissionPct) / 100;
    }
    return acc;
  }, 0);

  const netMoradaCommission = totalForecastCommission - totalRealtorPayouts;

  // Breakdown by Bank
  const bankStats: Record<
    string,
    { count: number; volume: number; commission: number; avgPct: number }
  > = {};

  activeNonDeclined.forEach((p) => {
    if (!bankStats[p.bank]) {
      bankStats[p.bank] = { count: 0, volume: 0, commission: 0, avgPct: 0 };
    }
    bankStats[p.bank].count += 1;
    bankStats[p.bank].volume += p.financingValue;
    bankStats[p.bank].commission += p.commissionAmount;
  });

  // Calculate percentages
  Object.keys(bankStats).forEach((b) => {
    const item = bankStats[b];
    item.avgPct = item.volume > 0 ? (item.commission / item.volume) * 100 : 0;
  });

  const sortedBanks = Object.entries(bankStats).sort((a, b) => b[1].commission - a[1].commission);

  // Goal percentage
  const goalProgress = monthlyRevenueGoal > 0 ? Math.min(100, Math.round((totalForecastCommission / monthlyRevenueGoal) * 100)) : 0;

  // ==========================================
  // HISTORICAL ANNUAL CHART DATA PREPARATION
  // ==========================================
  const monthLabels = [
    { short: 'Jan', full: 'Janeiro', num: '01' },
    { short: 'Fev', full: 'Fevereiro', num: '02' },
    { short: 'Mar', full: 'Março', num: '03' },
    { short: 'Abr', full: 'Abril', num: '04' },
    { short: 'Mai', full: 'Maio', num: '05' },
    { short: 'Jun', full: 'Junho', num: '06' },
    { short: 'Jul', full: 'Julho', num: '07' },
    { short: 'Ago', full: 'Agosto', num: '08' },
    { short: 'Set', full: 'Setembro', num: '09' },
    { short: 'Out', full: 'Outubro', num: '10' },
    { short: 'Nov', full: 'Novembro', num: '11' },
    { short: 'Dez', full: 'Dezembro', num: '12' },
  ];

  const historicalMonthlyData = useMemo(() => {
    return monthLabels.map(({ short, full, num }) => {
      const monthKey = `${selectedHistoryYear}-${num}`;
      const monthProcesses = processes.filter((p) => p.estimatedIssuanceMonth === monthKey);

      // Processos Fechados / Concluídos (Recursos Liberados ou Comissão Paga)
      const closedProcesses = monthProcesses.filter(
        (p) =>
          p.stage === 'COMMISSION_PAID' ||
          p.stage === 'DISBURSEMENT_COMPLETED' ||
          p.commissionStatus === 'PAGA' ||
          p.commissionStatus === 'DISPONIVEL_FATURAMENTO'
      );

      // Processos Ativos em Esteira (Em andamento)
      const inFlightProcesses = monthProcesses.filter(
        (p) =>
          !['COMMISSION_PAID', 'DISBURSEMENT_COMPLETED', 'DECLINED_CANCELLED'].includes(p.stage)
      );

      const closedVolume = closedProcesses.reduce((sum, p) => sum + p.financingValue, 0);
      const closedCount = closedProcesses.length;
      const closedCommission = closedProcesses.reduce((sum, p) => sum + p.commissionAmount, 0);

      const pipelineVolume = inFlightProcesses.reduce((sum, p) => sum + p.financingValue, 0);
      const pipelineCount = inFlightProcesses.length;

      const totalVolumeMonth = closedVolume + pipelineVolume;
      const totalCountMonth = closedCount + pipelineCount;

      const avgTicket = closedCount > 0 ? closedVolume / closedCount : 0;

      return {
        monthKey,
        shortMonth: short,
        fullMonth: full,
        closedVolume,
        closedCount,
        closedCommission,
        pipelineVolume,
        pipelineCount,
        totalVolumeMonth,
        totalCountMonth,
        avgTicket,
        isCurrentSelected: selectedMonth === monthKey,
      };
    });
  }, [processes, selectedHistoryYear, selectedMonth]);

  // Annual Totals for Highlights
  const annualSummary = useMemo(() => {
    const totalClosedVolume = historicalMonthlyData.reduce((acc, d) => acc + d.closedVolume, 0);
    const totalClosedCount = historicalMonthlyData.reduce((acc, d) => acc + d.closedCount, 0);
    const totalClosedCommission = historicalMonthlyData.reduce((acc, d) => acc + d.closedCommission, 0);
    const totalPipelineVolume = historicalMonthlyData.reduce((acc, d) => acc + d.pipelineVolume, 0);
    const avgAnnualTicket = totalClosedCount > 0 ? totalClosedVolume / totalClosedCount : 0;

    // Find Best Month
    let bestMonth = historicalMonthlyData[0];
    historicalMonthlyData.forEach((d) => {
      if (d.closedVolume > bestMonth.closedVolume) {
        bestMonth = d;
      }
    });

    return {
      totalClosedVolume,
      totalClosedCount,
      totalClosedCommission,
      totalPipelineVolume,
      avgAnnualTicket,
      bestMonth,
    };
  }, [historicalMonthlyData]);

  // Custom Tooltip for Recharts
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 min-w-[220px] text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
            <span className="font-bold text-emerald-400 text-sm">
              {data.fullMonth} de {selectedHistoryYear}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {data.monthKey}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                VGV Fechado:
              </span>
              <span className="font-bold text-white font-mono">{formatCurrency(data.closedVolume)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                Contratos Fechados:
              </span>
              <span className="font-black text-indigo-300 font-mono">{data.closedCount} {data.closedCount === 1 ? 'operação' : 'operações'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Comissão Faturada:</span>
              <span className="font-bold text-emerald-400 font-mono">{formatCurrency(data.closedCommission)}</span>
            </div>

            {data.avgTicket > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Ticket Médio:</span>
                <span className="font-mono text-slate-200">{formatCurrency(data.avgTicket)}</span>
              </div>
            )}

            {data.pipelineVolume > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                  Em Esteira / Pipeline:
                </span>
                <span className="font-mono text-slate-300">{formatCurrency(data.pipelineVolume)} ({data.pipelineCount})</span>
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center">
            Clique na barra para filtrar a visão detalhada deste mês
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Month Selector & Goal */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black tracking-tight">
              Previsão de Faturamento & Comissões
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Acompanhe o faturamento previsto e liquidado da Morada Crédito com base nos percentuais pagos pelas instituições financeiras parceiras.
          </p>
        </div>

        {/* Month Selector & Target Goal Input */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Mês de Emissão</span>
              <select
                id="select-financial-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer pr-2 text-xs"
              >
                <option value="ALL" className="bg-slate-900 text-white">Todos os Meses</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {formatMonthYear(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <div className="text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Meta do Mês (R$)</span>
              <input
                id="input-revenue-goal"
                type="number"
                value={monthlyRevenueGoal}
                onChange={(e) => setMonthlyRevenueGoal(Number(e.target.value))}
                className="bg-transparent text-amber-300 font-bold focus:outline-none w-24 text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Forecast Commission */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Faturamento Previsto
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-950 mt-2">
            {formatCurrency(totalForecastCommission)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-emerald-100">
            <span>VGV: {formatCurrency(totalVolume)}</span>
            <span className="font-semibold text-emerald-700">
              {activeNonDeclined.length} contratos
            </span>
          </div>
        </div>

        {/* Paid / Liquidated */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Comissão Liquidada
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(paidCommission)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Já recebido na conta</span>
            <span className="font-semibold text-teal-700">100% pago</span>
          </div>
        </div>

        {/* Ready to Invoice */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pronto para Nota / Emissão
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(readyForBilling)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Recursos liberados</span>
            <span className="font-semibold text-blue-700">A faturar</span>
          </div>
        </div>

        {/* Net Revenue after Partner Realtor Payout */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Comissão Líquida Morada
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-950 mt-2">
            {formatCurrency(netMoradaCommission)}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Repasses: {formatCurrency(totalRealtorPayouts)}</span>
            <span className="font-semibold text-amber-700">Líquido</span>
          </div>
        </div>
      </div>

      {/* Goal Progress Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>Progresso da Meta de Faturamento</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {goalProgress}% Atingido
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Previsto: <strong className="text-slate-800">{formatCurrency(totalForecastCommission)}</strong> de <strong className="text-slate-800">{formatCurrency(monthlyRevenueGoal)}</strong>
            </p>
          </div>
          <div className="text-xs text-slate-600 font-medium">
            Falta: <strong className="text-emerald-700">{formatCurrency(Math.max(0, monthlyRevenueGoal - totalForecastCommission))}</strong>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500 relative"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HISTORICAL RECHARTS VISUALIZATION: PROCESSOS FECHADOS POR MÊS AO LONGO DO ANO */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Histórico Anual: Volume de Processos Fechados por Mês
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Visão consolidada do VGV financiado, contratos concluídos e faturamento mês a mês ao longo do ano de {selectedHistoryYear}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Metric Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              <button
                id="btn-metric-combined"
                onClick={() => setChartMetric('combined')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartMetric === 'combined'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                VGV & Contratos
              </button>
              <button
                id="btn-metric-volume"
                onClick={() => setChartMetric('volume')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartMetric === 'volume'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                VGV (R$)
              </button>
              <button
                id="btn-metric-contracts"
                onClick={() => setChartMetric('contracts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartMetric === 'contracts'
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Qtd Contratos
              </button>
              <button
                id="btn-metric-commission"
                onClick={() => setChartMetric('commission')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  chartMetric === 'commission'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Comissão (R$)
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-500 uppercase">Ano:</span>
              <select
                id="select-history-year"
                value={selectedHistoryYear}
                onChange={(e) => setSelectedHistoryYear(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Spreadsheet / History Action */}
            {onOpenDataManagement && (
              <button
                id="btn-chart-import-spreadsheet"
                onClick={onOpenDataManagement}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Baixar planilha modelo ou importar 12 meses de histórico"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Importar Planilha (12 Meses)</span>
              </button>
            )}
          </div>
        </div>

        {/* Annual Highlight Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              VGV Fechado em {selectedHistoryYear}
            </span>
            <span className="text-lg sm:text-xl font-black text-slate-900 font-mono mt-0.5 block">
              {formatCurrency(annualSummary.totalClosedVolume)}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
              Total liquidado no ano
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total de Contratos Fechados
            </span>
            <span className="text-lg sm:text-xl font-black text-indigo-900 font-mono mt-0.5 block">
              {annualSummary.totalClosedCount} contratos
            </span>
            <span className="text-[10px] text-indigo-700 font-semibold mt-0.5 block">
              Média de {(annualSummary.totalClosedCount / 12).toFixed(1)} contr./mês
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Comissões Faturadas no Ano
            </span>
            <span className="text-lg sm:text-xl font-black text-emerald-800 font-mono mt-0.5 block">
              {formatCurrency(annualSummary.totalClosedCommission)}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
              Receita acumulada
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Mês Recorde ({selectedHistoryYear})
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 truncate mt-0.5 block">
              {annualSummary.bestMonth.fullMonth}
            </span>
            <span className="text-[10px] text-amber-700 font-bold font-mono mt-0.5 block">
              {formatCurrency(annualSummary.bestMonth.closedVolume)} ({annualSummary.bestMonth.closedCount} contr.)
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-80 sm:h-96 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'combined' ? (
              <ComposedChart
                data={historicalMonthlyData}
                margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedMonth(e.activePayload[0].payload.monthKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortMonth"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) =>
                    val >= 1000000
                      ? `R$ ${(val / 1000000).toFixed(1)}M`
                      : val > 0
                      ? `R$ ${(val / 1000).toFixed(0)}k`
                      : '0'
                  }
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#6366f1', fontSize: 11, fontWeight: 700 }}
                  domain={[0, 'auto']}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                />
                <Bar
                  yAxisId="left"
                  name="Volume Fechado (VGV R$)"
                  dataKey="closedVolume"
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                >
                  {historicalMonthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.isCurrentSelected
                          ? '#047857'
                          : entry.closedVolume > 0
                          ? '#10b981'
                          : '#e2e8f0'
                      }
                      className="cursor-pointer hover:opacity-80 transition"
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  name="Contratos Fechados"
                  type="monotone"
                  dataKey="closedCount"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 7, fill: '#4338ca' }}
                />
              </ComposedChart>
            ) : chartMetric === 'volume' ? (
              <BarChart
                data={historicalMonthlyData}
                margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedMonth(e.activePayload[0].payload.monthKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortMonth"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(val) =>
                    val >= 1000000
                      ? `R$ ${(val / 1000000).toFixed(1)}M`
                      : val > 0
                      ? `R$ ${(val / 1000).toFixed(0)}k`
                      : '0'
                  }
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                />
                <Bar
                  name="Volume Fechado (VGV R$)"
                  dataKey="closedVolume"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                >
                  {historicalMonthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-vol-${index}`}
                      fill={
                        entry.isCurrentSelected
                          ? '#047857'
                          : entry.closedVolume > 0
                          ? '#059669'
                          : '#e2e8f0'
                      }
                      className="cursor-pointer hover:opacity-80 transition"
                    />
                  ))}
                </Bar>
                <Bar
                  name="Em Esteira / Pipeline (R$)"
                  dataKey="pipelineVolume"
                  fill="#94a3b8"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            ) : chartMetric === 'contracts' ? (
              <BarChart
                data={historicalMonthlyData}
                margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedMonth(e.activePayload[0].payload.monthKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortMonth"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#4f46e5', fontSize: 11, fontWeight: 700 }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                />
                <Bar
                  name="Contratos Fechados"
                  dataKey="closedCount"
                  fill="#4f46e5"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                >
                  {historicalMonthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-cnt-${index}`}
                      fill={entry.closedCount > 0 ? '#4f46e5' : '#e2e8f0'}
                      className="cursor-pointer hover:opacity-80 transition"
                    />
                  ))}
                </Bar>
                <Bar
                  name="Contratos em Andamento"
                  dataKey="pipelineCount"
                  fill="#cbd5e1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            ) : (
              <BarChart
                data={historicalMonthlyData}
                margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setSelectedMonth(e.activePayload[0].payload.monthKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="shortMonth"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#d97706', fontSize: 11 }}
                  tickFormatter={(val) =>
                    val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`
                  }
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                />
                <Bar
                  name="Comissão Faturada / Liquidada (R$)"
                  dataKey="closedCommission"
                  fill="#d97706"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                >
                  {historicalMonthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-comm-${index}`}
                      fill={entry.closedCommission > 0 ? '#d97706' : '#e2e8f0'}
                      className="cursor-pointer hover:opacity-80 transition"
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Month selector quick pills from historical bar */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Navegar para o Mês no CRM:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Mês selecionado no topo: <strong className="text-slate-800">{selectedMonth === 'ALL' ? 'Todos os Meses' : formatMonthYear(selectedMonth)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
            {historicalMonthlyData.map((m) => {
              const isCurrent = selectedMonth === m.monthKey;
              const hasData = m.closedCount > 0 || m.pipelineCount > 0;
              return (
                <button
                  key={m.monthKey}
                  onClick={() => setSelectedMonth(m.monthKey)}
                  className={`p-2 rounded-xl text-center border transition cursor-pointer flex flex-col items-center justify-center ${
                    isCurrent
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : hasData
                      ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                      : 'bg-slate-50/70 text-slate-400 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px] font-black">{m.shortMonth}</span>
                  <span
                    className={`text-[9px] font-mono mt-0.5 ${
                      isCurrent
                        ? 'text-emerald-400 font-bold'
                        : m.closedVolume > 0
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {m.closedVolume > 0
                      ? m.closedVolume >= 1000000
                        ? `${(m.closedVolume / 1000000).toFixed(1)}M`
                        : `${(m.closedVolume / 1000).toFixed(0)}k`
                      : m.pipelineVolume > 0
                      ? `${(m.pipelineVolume / 1000).toFixed(0)}k (est)`
                      : '-'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Bank Performance Breakdown & Commission Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bank Performance (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Faturamento por Instituição Financeira</span>
              </h3>
              <p className="text-xs text-slate-500">
                Volume aprovado/financiado e comissão gerada por banco parceiro ({selectedMonth === 'ALL' ? 'Todos os Meses' : formatMonthYear(selectedMonth)})
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {sortedBanks.length} bancos ativos
            </span>
          </div>

          <div className="space-y-3">
            {sortedBanks.map(([bankName, stats]) => {
              const config = BANK_CONFIGS[bankName as BankPartner] || BANK_CONFIGS['Outra Instituição'];
              const shareOfTotal = totalForecastCommission > 0 ? (stats.commission / totalForecastCommission) * 100 : 0;

              return (
                <div
                  key={bankName}
                  className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${config.badgeBg}`}
                      >
                        {bankName}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {stats.count} {stats.count === 1 ? 'processo' : 'processos'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">VGV Financiado</span>
                        <span className="text-xs font-bold text-slate-800">
                          {formatCurrency(stats.volume)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block uppercase font-semibold">Comissão Gerada</span>
                        <span className="text-xs font-black text-emerald-700 font-mono">
                          {formatCurrency(stats.commission)} ({formatPercent(stats.avgPct)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Share Bar */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${shareOfTotal}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold whitespace-nowrap">
                      {shareOfTotal.toFixed(1)}% do total
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Commission Pipeline by Status (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Esteira de Comissões</span>
              </h3>
            </div>

            <div className="space-y-3.5">
              {/* 1. Em Análise / Engenharia / Jurídico */}
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900">1. Em Análise / Dossiê</span>
                  <span className="font-black text-blue-900 font-mono">
                    {formatCurrency(inAnalysisCommission)}
                  </span>
                </div>
                <p className="text-[10px] text-blue-700 mt-1">
                  Propostas em análise de crédito, engenharia ou conformidade jurídica.
                </p>
              </div>

              {/* 2. Aguardando Assinatura & Cartório */}
              <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-900">2. Emissão, Assinatura & RGI</span>
                  <span className="font-black text-amber-900 font-mono">
                    {formatCurrency(pendingRegistryCommission)}
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 mt-1">
                  Contrato em emissão, coleta de assinaturas ou protocolado no Cartório de Imóveis.
                </p>
              </div>

              {/* 3. Recursos Liberados / Aguardando Faturamento */}
              <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-900">3. Recursos Liberados</span>
                  <span className="font-black text-emerald-900 font-mono">
                    {formatCurrency(readyForBilling)}
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">
                  Registro no RGI concluído e recursos liberados ao vendedor. Pronto para NF.
                </p>
              </div>

              {/* 4. Concluído & Comissionado */}
              <div className="p-3 rounded-lg bg-green-50/70 border border-green-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-green-900">4. Comissão Liquidada</span>
                  <span className="font-black text-green-900 font-mono">
                    {formatCurrency(paidCommission)}
                  </span>
                </div>
                <p className="text-[10px] text-green-800 mt-1">
                  Valores recebidos na conta da Morada Crédito Imobiliário.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg">
            💡 <strong>Dica da Assessoria:</strong> Acompanhe as prentações no RGI para antecipar a liberação e garantir o faturamento dentro do mês de previsão.
          </div>
        </div>
      </div>
    </div>
  );
};

