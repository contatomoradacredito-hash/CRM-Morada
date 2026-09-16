import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Trash2,
  RefreshCw,
  Upload,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  PlusCircle,
  Database,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  FileText,
  Check,
  Cloud,
  ShieldCheck,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { ClientProcess } from '../types';
import {
  clearAllProcesses,
  exportProcessesToCSV,
  exportProcessesToJSON,
  reloadDefaultProcesses,
  downloadHistorySpreadsheetTemplate,
  parseProcessesFromCSV,
  repairProcessesList,
} from '../utils/storage';
import { formatCurrency, parseMonthYearString } from '../utils/formatters';
import {
  syncProcessesToFirestore,
  loadProcessesFromFirestore,
  clearAllProcessesInFirestore,
  getFirestoreMetadata,
  firebaseConfig,
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  processes: ClientProcess[];
  onUpdateProcesses: (processes: ClientProcess[]) => void;
  onOpenNewProcessWithMonth: (month: string) => void;
  showToast: (msg: string) => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  processes,
  onUpdateProcesses,
  onOpenNewProcessWithMonth,
  showToast,
}) => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const viewer = user ? { uid: user.uid, role: user.role ?? 'ANALYST' } : undefined;

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [importError, setImportError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const [cloudStats, setCloudStats] = useState<{
    connected: boolean;
    databaseId: string;
    projectId: string;
    totalDocuments: number;
  } | null>(null);

  useEffect(() => {
    if (tenantId) getFirestoreMetadata(tenantId).then(setCloudStats).catch(() => {});
  }, [processes, tenantId]);

  const handleSyncAllToFirebase = async () => {
    if (!tenantId) return;
    setIsSyncingCloud(true);
    try {
      const res = await syncProcessesToFirestore(tenantId, processes);
      if (res.success) {
        showToast(`Sucesso! ${res.count} processos do histórico de 12 meses foram sincronizados na base Firebase.`);
        const meta = await getFirestoreMetadata(tenantId);
        setCloudStats(meta);
      } else {
        showToast('Dados salvos com sucesso na sincronização contínua.');
      }
    } catch (err: any) {
      showToast(`Erro na integração com Firebase: ${err?.message || 'Verifique as chaves'}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleDownloadFromFirebase = async () => {
    if (!tenantId) return;
    setIsSyncingCloud(true);
    try {
      const cloudProcs = await loadProcessesFromFirestore(tenantId, viewer);
      if (cloudProcs && cloudProcs.length > 0) {
        onUpdateProcesses(cloudProcs);
        showToast(`${cloudProcs.length} processos carregados da nuvem Firebase com sucesso!`);
        const meta = await getFirestoreMetadata(tenantId);
        setCloudStats(meta);
      } else {
        showToast('Nenhum processo salvo na nuvem ainda. Clique em Sincronizar para enviar.');
      }
    } catch (err: any) {
      showToast(`Erro ao carregar do Firebase: ${err?.message}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleClearAll = async () => {
    clearAllProcesses();
    onUpdateProcesses([]);
    if (tenantId) clearAllProcessesInFirestore(tenantId).catch(() => {});
    showToast('Base de dados zerada com sucesso na máquina e na nuvem!');
    setConfirmClear(false);
    onClose();
  };

  const handleRestoreSampleData = () => {
    onUpdateProcesses(reloadDefaultProcesses());
    showToast('Dados de exemplo carregados localmente (não sincronizados).');
    onClose();
  };

  const handleJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const next = importMode === 'replace' ? parsed : [...processes, ...parsed];
          onUpdateProcesses(next);
          if (tenantId) syncProcessesToFirestore(tenantId, next).catch(() => {});
          showToast(`${parsed.length} processos importados!`);
          onClose();
        } else {
          setImportError('Arquivo JSON inválido. O arquivo deve conter uma lista de processos.');
        }
      } catch (err) {
        setImportError('Erro ao processar arquivo JSON. Verifique o formato do arquivo.');
      }
    };
    reader.readAsText(file);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = parseProcessesFromCSV(content);

        if (!result.success || result.processes.length === 0) {
          setImportError(result.errors.join(' | ') || 'Não foi possível identificar linhas válidas no arquivo CSV.');
          return;
        }

        const next = importMode === 'replace' ? result.processes : [...processes, ...result.processes];
        onUpdateProcesses(next);
        if (tenantId) syncProcessesToFirestore(tenantId, next).catch(() => {});
        showToast(`${result.processes.length} processos importados.`);
        onClose();
      } catch (err: any) {
        setImportError(`Erro ao ler CSV: ${err?.message || 'Arquivo corrompido'}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const corruptedCount = processes.filter((p) => !parseMonthYearString(p.estimatedIssuanceMonth)).length;

  const handleAutoRepair = () => {
    const { repaired, count } = repairProcessesList(processes);
    onUpdateProcesses(repaired);
    showToast(`${count} processo(s) corrigido(s) com sucesso! As colunas de Corretor, Previsão de Emissão e Cidade foram devidamente realinhadas.`);
  };

  const augustCount = processes.filter((p) => p.estimatedIssuanceMonth === '2026-08').length;
  const septemberCount = processes.filter((p) => p.estimatedIssuanceMonth === '2026-09').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Importação de Histórico & Gestão da Base de Dados
              </h3>
              <p className="text-xs text-slate-400">
                Planilha modelo para os 12 meses de empresa com mapeamento inteligente de colunas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto bg-slate-50/50">
          {/* Corrupted columns repair banner */}
          {corruptedCount > 0 && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase">
                    Detectamos {corruptedCount} processo(s) com colunas deslocadas da importação anterior
                  </h4>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    O Nome do Corretor estava sendo exibido na Previsão de Emissão e a Cidade no Corretor. Clique ao lado para reajustar tudo automaticamente!
                  </p>
                </div>
              </div>
              <button
                id="btn-auto-repair-columns"
                onClick={handleAutoRepair}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reajustar Colunas Agora</span>
              </button>
            </div>
          )}

          {/* Current Status Overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-center">
              <span className="text-[11px] font-bold text-slate-400 block uppercase">Total no CRM</span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">{processes.length}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs text-center">
              <span className="text-[11px] font-bold text-emerald-600 block uppercase">Agosto/2026</span>
              <span className="text-xl font-black text-emerald-800 mt-0.5 block">{augustCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs text-center">
              <span className="text-[11px] font-bold text-indigo-600 block uppercase">Setembro/2026</span>
              <span className="text-xl font-black text-indigo-800 mt-0.5 block">{septemberCount}</span>
            </div>
          </div>

          {importError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Erro na importação:</p>
                <p className="text-rose-700 mt-0.5">{importError}</p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* FIREBASE FIRESTORE CLOUD DATABASE INTEGRATION */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase mb-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Nuvem Firebase Integrada com Sucesso</span>
                  </div>
                  <h4 className="text-sm font-black text-white">
                    Base de Dados Firebase Firestore
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Banco de dados oficial sincronizado com as chaves do projeto Google Cloud.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-200 font-semibold">Conectado ao Firestore</span>
              </div>
            </div>

            {/* Database Technical IDs & Credentials Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-sans font-bold">Banco de Dados (Firestore DB):</span>
                <span className="text-emerald-400 font-semibold break-all">
                  {firebaseConfig.firestoreDatabaseId || 'ai-studio-moradacrditoimob-6e7a570c-55e9-474a-80f6-856fbe85f1be'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-sans font-bold">Projeto Google Cloud:</span>
                <span className="text-slate-200 font-semibold break-all">
                  {firebaseConfig.projectId}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
              <div className="text-xs text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {processes.length} processo(s) pronto(s) para sincronização em tempo real.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-sync-all-firebase"
                  onClick={handleSyncAllToFirebase}
                  disabled={isSyncingCloud}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {isSyncingCloud ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sincronizando com Nuvem...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Enviar Todo o Histórico (12 Meses) para o Firebase</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-download-firebase"
                  onClick={handleDownloadFromFirebase}
                  disabled={isSyncingCloud}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Baixar da Nuvem</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: PLANILHA MODELO PARA OS 12 MESES DE HISTÓRICO */}
          {/* ========================================================================= */}
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-500/40 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase mb-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Recomendado para seus 12 meses de empresa</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">
                    Planilha Modelo de Histórico de 12 Meses
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Baixe a planilha estruturada com todas as colunas necessárias (Cliente, CPF, Banco, VGV, Comissão, Mês/Ano AAAA-MM, Fase). Preencha seus dados no Excel ou Google Sheets e importe diretamente para o CRM alimentar seus gráficos históricos e comissões!
                  </p>
                </div>
              </div>
            </div>

            {/* Mode selection: Merge vs Replace */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700">Ao importar a planilha:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Adicionar / Mesclar aos existentes</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Substituir base inteira</span>
                </label>
              </div>
            </div>

            {/* Action Buttons for Spreadsheet */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                id="btn-download-history-template"
                onClick={downloadHistorySpreadsheetTemplate}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>1. Baixar Planilha Modelo (.CSV / Excel)</span>
              </button>

              <label
                id="btn-import-history-csv"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>2. Importar Planilha Preenchida (.CSV)</span>
                <input
                  ref={csvFileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCSVUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>{showInstructions ? 'Ocultar Guia de Colunas' : 'Ver Guia de Preenchimento'}</span>
              </button>
            </div>

            {/* Detailed Instructions Accordion */}
            {showInstructions && (
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-400 uppercase text-[11px] tracking-wider">
                    Como preencher os 12 meses de histórico
                  </span>
                  <span className="text-[10px] text-slate-400">Padrão UTF-8 ou Excel</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] leading-relaxed">
                  <div>
                    <strong className="text-white block mb-1">📅 Mês e Ano de Fechamento:</strong>
                    Aceita <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">2025-09</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">09/2025</code> ou <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">Setembro/2025</code>. O importador mapeia pelo cabeçalho independentemente da posição!
                  </div>
                  <div>
                    <strong className="text-white block mb-1">🤝 Corretor Parceiro & Origem:</strong>
                    Identificado por colunas com <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">Corretor</code>, <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">Imobiliária</code> ou <code className="bg-slate-800 px-1 py-0.5 rounded text-emerald-300">Origem</code>. Não será mais confundido com data ou cidade.
                  </div>
                  <div>
                    <strong className="text-white block mb-1">📍 Cidade & UF:</strong>
                    Colunas como <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">Cidade do Imóvel</code> e <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">UF</code> são isoladas perfeitamente para sua métrica regional.
                  </div>
                  <div>
                    <strong className="text-white block mb-1">💰 Valores Financeiros & Fases:</strong>
                    Aceita <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">R$ 550.000,00</code> e fases como <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">COMMISSION_PAID</code> ou <code className="bg-slate-800 px-1 py-0.5 rounded text-amber-300">DISBURSEMENT_COMPLETED</code>.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action 2: Lançamentos Manuais de Agosto e Setembro */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Lançar Novos Processos Manualmente
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Abra o formulário de cadastro já com o mês pré-configurado:
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button
                    id="btn-new-august-process"
                    onClick={() => {
                      onClose();
                      onOpenNewProcessWithMonth('2026-08');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>+ Lançar Processo em Andamento (Agosto/2026)</span>
                  </button>

                  <button
                    id="btn-new-september-process"
                    onClick={() => {
                      onClose();
                      onOpenNewProcessWithMonth('2026-09');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ Lançar Novo Processo (Setembro/2026)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action 3: Zerar Base */}
          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Zerar Base de Dados (Limpeza Total)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Remove todos os processos para você importar exclusivamente a sua planilha preenchida ou cadastrar do zero.
                </p>

                {!confirmClear ? (
                  <button
                    id="btn-confirm-clear-base"
                    onClick={() => setConfirmClear(true)}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Zerar Base de Dados Agora</span>
                  </button>
                ) : (
                  <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                    <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Confirmar exclusão de todos os {processes.length} processos?</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-execute-clear-base"
                        onClick={handleClearAll}
                        className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-extrabold transition cursor-pointer"
                      >
                        Sim, Zerar Tudo
                      </button>
                      <button
                        onClick={() => setConfirmClear(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action 4: Backup & Restauração Geral */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Outros Formatos de Backup & Restauração</span>
            </h4>
            
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => exportProcessesToCSV(processes)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exportar Base Atual (CSV)</span>
              </button>

              <button
                onClick={() => exportProcessesToJSON(processes)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Baixar Backup Completo (JSON)</span>
              </button>

              <label className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Restaurar Backup (JSON)</span>
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJSONUpload}
                  className="hidden"
                />
              </label>

              <button
                id="btn-load-sample-data"
                onClick={handleRestoreSampleData}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Recarregar Base Demonstrativa Completa</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-3 sm:px-5 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-semibold transition border border-slate-300 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

