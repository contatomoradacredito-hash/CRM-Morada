import React from 'react';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Table,
  Calculator,
  MessageSquare,
  BarChart3,
  Calendar,
  Database,
  User,
  LogOut,
} from 'lucide-react';
import { MoradaLogo } from './MoradaLogo';
import { ClientProcess } from '../types';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'pipeline' | 'table' | 'financial' | 'simulator' | 'whatsapp';
  setActiveTab: (tab: 'pipeline' | 'table' | 'financial' | 'simulator' | 'whatsapp') => void;
  onOpenNewProcess: () => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: string[];
  onExportCSV: () => void;
  onExportJSON: () => void;
  onResetData: () => void;
  onOpenDataManagement: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  processes: ClientProcess[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewProcess,
  selectedMonth,
  setSelectedMonth,
  availableMonths,
  onExportCSV,
  onExportJSON,
  onResetData,
  onOpenDataManagement,
  searchQuery,
  setSearchQuery,
  processes,
}) => {
  const { user, logout } = useAuth();

  // Quick calculations for header
  const activeProcesses = processes.filter(
    (p) => p.stage !== 'DECLINED_CANCELLED' && p.stage !== 'COMMISSION_PAID'
  );
  const totalActiveVolume = activeProcesses.reduce((acc, p) => acc + p.financingValue, 0);
  const totalForecastCommission = processes
    .filter((p) => selectedMonth === 'ALL' || p.estimatedIssuanceMonth === selectedMonth)
    .filter((p) => p.stage !== 'DECLINED_CANCELLED')
    .reduce((acc, p) => acc + p.commissionAmount, 0);

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      {/* Top Banner with Brand and Global Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3.5 gap-3 border-b border-slate-800/80 font-bold not-italic">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-slate-700/50">
              <MoradaLogo className="w-full h-full" color="#277D53" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                Morada Crédito Imobiliário
              </h1>
              <p className="text-xs text-slate-400 font-normal">
                Gestão de Processos
              </p>
            </div>
          </div>

          {/* Quick Filter & Month Selector & New Action */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Filter Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400 font-medium hidden sm:inline">Previsão:</span>
              <select
                id="select-month-filter"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-slate-900 text-white">Todos os Meses</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {formatMonthYear(m)}
                  </option>
                ))}
              </select>
            </div>

            {/* Export & Tools Menu */}
            <div className="flex items-center gap-1">
              <button
                id="btn-open-database-mgmt"
                onClick={onOpenDataManagement}
                title="Base de Dados Firebase Firestore Conectada (ai-studio-moradacrditoimob-6e7a570c-55e9-474a-80f6-856fbe85f1be)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Firebase Nuvem</span>
              </button>

              <button
                id="btn-export-csv"
                onClick={onExportCSV}
                title="Exportar para Planilha Excel (CSV)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">Excel</span>
              </button>

              <button
                id="btn-export-json"
                onClick={onExportJSON}
                title="Fazer Backup dos Dados (JSON)"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Primary New Process Button */}
            <button
              id="btn-new-process-header"
              onClick={onOpenNewProcess}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm shadow-emerald-900/50 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Processo</span>
            </button>

            {/* User Profile & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700/80">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 border border-emerald-400 text-white flex items-center justify-center font-bold text-xs shadow-inner">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <div className="hidden xl:block text-left">
                    <p className="font-bold text-slate-100 text-xs leading-none truncate max-w-[140px]">
                      {user.displayName || 'Deiglison Lima'}
                    </p>
                    <p className="text-[10px] font-extrabold text-amber-400 leading-tight flex items-center gap-1">
                      <span>👑 Administrador</span>
                    </p>
                  </div>
                </div>

                <button
                  id="btn-logout"
                  onClick={() => logout()}
                  title="Sair do CRM"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between overflow-x-auto py-2 gap-4 no-scrollbar">
          <nav className="flex items-center gap-1">
            <button
              id="tab-btn-pipeline"
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'pipeline'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Funil de Fases (Pipeline)</span>
              <span className="ml-1 bg-slate-800 text-slate-300 text-[11px] px-1.5 py-0.2 rounded-full">
                {activeProcesses.length}
              </span>
            </button>

            <button
              id="tab-btn-table"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Table className="w-4 h-4 text-cyan-400" />
              <span>Lista & Filtros</span>
              <span className="ml-1 bg-slate-800 text-slate-300 text-[11px] px-1.5 py-0.2 rounded-full">
                {processes.length}
              </span>
            </button>

            <button
              id="tab-btn-financial"
              onClick={() => setActiveTab('financial')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'financial'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Previsão & Comissões</span>
              <span className="ml-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-mono">
                {formatCurrency(totalForecastCommission)}
              </span>
            </button>

            <button
              id="tab-btn-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calculator className="w-4 h-4 text-indigo-400" />
              <span>Simulador de Crédito</span>
            </button>

            <button
              id="tab-btn-whatsapp"
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-teal-400" />
              <span>Mensagens WhatsApp</span>
            </button>
          </nav>

          {/* Quick Search bar */}
          <div className="relative min-w-[200px] max-w-xs hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-global-search"
              type="text"
              placeholder="Buscar cliente, banco, CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
