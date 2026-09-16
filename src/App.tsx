/**
 * Morada Crédito Imobiliário
 * Correspondente Bancário | Financiamento Imobiliário
 */

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ClientProcess, CreditAnalysisStatus, CreditType, ProcessStage } from './types';
import {
  exportProcessesToCSV,
  exportProcessesToJSON,
  getAvailableMonths,
  loadProcesses,
  saveProcesses,
  reloadDefaultProcesses,
  mergeProcessesLists,
  StorageScope,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { HeaderStats } from './components/HeaderStats';
import { PipelineBoard } from './components/PipelineBoard';
import { ProcessTable } from './components/ProcessTable';
import { FinancialDashboard } from './components/FinancialDashboard';
import { CreditSimulator } from './components/CreditSimulator';
import { WhatsAppMessenger } from './components/WhatsAppMessenger';
import { ProcessDetailModal } from './components/ProcessDetailModal';
import { NewProcessModal } from './components/NewProcessModal';
import { DataManagementModal } from './components/DataManagementModal';
import { LoginScreen } from './components/LoginScreen';
import { CREDIT_ANALYSIS_STATUS_CONFIGS, STAGE_CONFIGS } from './utils/constants';
import { AuthProvider, useAuth } from './context/AuthContext';
import { USE_MOCK_DATA } from './config';
import {
  syncProcessesToFirestore,
  saveProcessToFirestore,
  deleteProcessFromFirestore,
  loadProcessesFromFirestore,
  subscribeToProcesses,
  getTenant,
} from './lib/firebase';
import { Building2 } from 'lucide-react';

function CRMApp() {
  const { user, loading, pendingAccess, logout } = useAuth();
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-2xl animate-pulse">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Carregando Morada Crédito Imobiliário...</p>
      </div>
    );
  }

  if (pendingAccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-amber-400" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <p className="text-sm font-bold text-slate-100">Acesso pendente</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sua conta foi autenticada, mas ainda não está vinculada a nenhuma empresa. Fale com o administrador para liberar seu acesso.
          </p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
        >
          Sair
        </button>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }


  const scope = USE_MOCK_DATA
    ? { uid: 'mock', tenantId: 'mock', role: 'OWNER' }
    : user.tenantId
      ? { uid: user.uid, tenantId: user.tenantId, role: user.role ?? 'ANALYST' }
      : null;
  if (!scope) return <LoginScreen />;
  return <CRMWorkspace key={JSON.stringify(scope)} scope={scope} />;
}

function CRMWorkspace({ scope }: { scope: StorageScope }) {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<ClientProcess[]>(() => loadProcesses(scope));
  const [tenantName, setTenantName] = useState('');
  const [isDemoTenant, setIsDemoTenant] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'table' | 'financial' | 'simulator' | 'whatsapp'>('pipeline');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modals & Drawers
  const [selectedProcessForModal, setSelectedProcessForModal] = useState<ClientProcess | null>(null);
  const [isNewProcessModalOpen, setIsNewProcessModalOpen] = useState<boolean>(false);
  const [isDataManagementModalOpen, setIsDataManagementModalOpen] = useState<boolean>(false);
  const [newProcessInitialData, setNewProcessInitialData] = useState<Partial<ClientProcess> | undefined>(undefined);
  const [whatsAppPreselectedProcess, setWhatsAppPreselectedProcess] = useState<ClientProcess | undefined>(undefined);
  
  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setTenantName(scope.tenantId);
      setProcesses(reloadDefaultProcesses(scope));
      return;
    }
    if (!user?.tenantId) {
      setProcesses([]);
      return;
    }
    const tenantId = user.tenantId;
    const viewer = { uid: user.uid, role: user.role ?? 'ANALYST' };

    let isMounted = true;

    async function initializeCloudSync() {
      try {
        const [cloudProcesses, tenant] = await Promise.all([
          loadProcessesFromFirestore(tenantId, viewer),
          getTenant(tenantId),
        ]);
        if (!isMounted) return;
        setTenantName(tenant?.name?.trim() || tenantId);
        if (tenant) setIsDemoTenant(tenant.demoMode);

        if (cloudProcesses === null) return;

        const merged = mergeProcessesLists(scope, loadProcesses(scope), cloudProcesses);
        if (merged.length > 0 || !tenant?.demoMode) {
          saveProcesses(scope, merged);
          setProcesses(merged);
        } else if (tenant.demoMode) {
          const demo = reloadDefaultProcesses(scope);
          setProcesses(demo);
          await syncProcessesToFirestore(scope, demo);
        }
      } catch (err) {
        if (isMounted) setTenantName(tenantId);
        console.warn('Initial cloud sync notice:', err);
      }
    }

    initializeCloudSync();

    const unsubscribe = subscribeToProcesses(tenantId, viewer, (cloudProcesses) => {
      if (!isMounted) return;
      const merged = mergeProcessesLists(scope, loadProcesses(scope), cloudProcesses);
      saveProcesses(scope, merged);
      setProcesses(merged);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  const availableMonths = getAvailableMonths(processes);

  // Handlers
  const handleAdvanceStage = (processId: string, nextStage: ProcessStage) => {
    let updatedProcess: ClientProcess | null = null;

    setProcesses((prev) => {
      const updated = prev.map((p) => {
        if (p.id === processId) {
          if (nextStage === 'DISBURSEMENT_COMPLETED' || nextStage === 'COMMISSION_PAID') {
            try {
              confetti({
                particleCount: 75,
                spread: 65,
                origin: { y: 0.6 },
              });
            } catch {}
          }
          const historyEntry = {
            id: `sh_${Date.now()}`,
            fromStage: p.stage,
            toStage: nextStage,
            changedAt: new Date().toISOString(),
            note: `Fase avançada para ${STAGE_CONFIGS[nextStage]?.label || nextStage}`,
          };
          const procUpdated: ClientProcess = {
            ...p,
            stage: nextStage,
            stageUpdatedAt: new Date().toISOString(),
            stageHistory: [historyEntry, ...(p.stageHistory || [])],
          };
          updatedProcess = procUpdated;
          return procUpdated;
        }
        return p;
      });
      saveProcesses(scope, updated);
      return updated;
    });

    if (updatedProcess && user?.tenantId) {
      saveProcessToFirestore(user.tenantId, updatedProcess);
    }
    showToast(`Processo atualizado para ${STAGE_CONFIGS[nextStage]?.shortLabel || nextStage}`);
  };

  const handleUpdateCreditStatus = (processId: string, status: CreditAnalysisStatus) => {
    let updatedProcess: ClientProcess | null = null;
    setProcesses((prev) => {
      const updated = prev.map((p) => {
        if (p.id === processId) {
          const historyEntry = {
            id: `sh_cs_${Date.now()}`,
            fromStage: p.stage,
            toStage: p.stage,
            changedAt: new Date().toISOString(),
            note: `Status de Análise de Crédito alterado para ${CREDIT_ANALYSIS_STATUS_CONFIGS[status]?.label || status}`,
          };
          const procUpdated: ClientProcess = {
            ...p,
            creditAnalysisStatus: status,
            creditApprovalDate: status === 'APROVADO' ? (p.creditApprovalDate || new Date().toISOString()) : p.creditApprovalDate,
            stageUpdatedAt: new Date().toISOString(),
            stageHistory: [historyEntry, ...(p.stageHistory || [])],
          };
          updatedProcess = procUpdated;
          return procUpdated;
        }
        return p;
      });
      saveProcesses(scope, updated);
      return updated;
    });

    if (updatedProcess && user?.tenantId) {
      saveProcessToFirestore(user.tenantId, updatedProcess);
    }
    showToast(`Análise de crédito atualizada para: ${CREDIT_ANALYSIS_STATUS_CONFIGS[status]?.label || status}`);
  };

  const handleSaveProcess = (updatedProc: ClientProcess) => {
    setProcesses((prev) => {
      const list = prev.map((p) => (p.id === updatedProc.id ? updatedProc : p));
      saveProcesses(scope, list);
      return list;
    });
    if (user?.tenantId) saveProcessToFirestore(user.tenantId, updatedProc);
    showToast(`Processo de ${updatedProc.clientName} salvo com sucesso!`);
  };

  const handleDeleteProcess = (processId: string) => {
    setProcesses((prev) => {
      const list = prev.filter((p) => p.id !== processId);
      saveProcesses(scope, list);
      return list;
    });
    if (user?.tenantId) deleteProcessFromFirestore(scope, processId);
    showToast('Processo excluído.');
  };

  const handleCreateProcess = (newProc: ClientProcess) => {
    const withOwner: ClientProcess = { ...newProc, ownerUid: newProc.ownerUid || user?.uid };
    setProcesses((prev) => {
      const updated = [withOwner, ...prev.filter((p) => p.id !== withOwner.id)];
      saveProcesses(scope, updated);
      return updated;
    });
    if (user?.tenantId) saveProcessToFirestore(user.tenantId, withOwner);
    showToast(`Novo processo de ${withOwner.clientName} adicionado ao funil com sucesso!`);
  };

  const handleCreateProcessFromSim = (simData: {
    clientName: string;
    clientPhone: string;
    creditType: CreditType;
    propertyValue: number;
    financingValue: number;
    downPaymentValue: number;
    termMonths: number;
    interestRateAnnual: number;
    amortizationSystem: 'SAC' | 'PRICE';
    bank: any;
    commissionPercentage: number;
  }) => {
    setNewProcessInitialData(simData);
    setIsNewProcessModalOpen(true);
  };

  const handleQuickWhatsApp = (proc: ClientProcess) => {
    setWhatsAppPreselectedProcess(proc);
    setActiveTab('whatsapp');
  };

  const handleResetData = () => {
    setProcesses(reloadDefaultProcesses(scope));
    showToast('Dados de exemplo carregados localmente.');
  };

  const handleOpenNewProcessWithMonth = (month: string) => {
    setNewProcessInitialData({
      estimatedIssuanceMonth: month,
      stage: month === '2026-08' ? 'PROPERTY_REGISTRY' : 'SIMULATION_COLLECTION',
    });
    setIsNewProcessModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Navigation & Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewProcess={() => {
          setNewProcessInitialData(undefined);
          setIsNewProcessModalOpen(true);
        }}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        availableMonths={availableMonths}
        onExportCSV={() => exportProcessesToCSV(processes)}
        onExportJSON={() => exportProcessesToJSON(processes)}
        onResetData={handleResetData}
        onOpenDataManagement={() => setIsDataManagementModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        processes={processes}
        isDemo={isDemoTenant}
        companyName={tenantName}
      />

      {/* Main Content Area - Wide Full Canvas */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {/* Executive KPI Stats on top */}
        <HeaderStats processes={processes} selectedMonth={selectedMonth} />

        {/* View Switcher */}
        {activeTab === 'pipeline' && (
          <PipelineBoard
            processes={processes}
            onSelectProcess={(proc) => setSelectedProcessForModal(proc)}
            onAdvanceStage={handleAdvanceStage}
            onUpdateCreditStatus={handleUpdateCreditStatus}
            onOpenNewProcess={() => {
              setNewProcessInitialData(undefined);
              setIsNewProcessModalOpen(true);
            }}
            onOpenNewProcessWithMonth={handleOpenNewProcessWithMonth}
            onResetData={handleResetData}
            onOpenDataManagement={() => setIsDataManagementModalOpen(true)}
            onQuickWhatsApp={handleQuickWhatsApp}
            selectedBankFilter={selectedBankFilter}
            setSelectedBankFilter={setSelectedBankFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activeTab === 'table' && (
          <ProcessTable
            processes={processes}
            onSelectProcess={(proc) => setSelectedProcessForModal(proc)}
            onAdvanceStage={handleAdvanceStage}
            onDeleteProcess={handleDeleteProcess}
            onQuickWhatsApp={handleQuickWhatsApp}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}

        {activeTab === 'financial' && (
          <FinancialDashboard
            processes={processes}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            availableMonths={availableMonths}
            onSelectProcess={(proc) => setSelectedProcessForModal(proc)}
            onOpenDataManagement={() => setIsDataManagementModalOpen(true)}
          />
        )}

        {activeTab === 'simulator' && (
          <CreditSimulator onCreateProcessFromSim={handleCreateProcessFromSim} />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppMessenger
            processes={processes}
            initialSelectedProcess={whatsAppPreselectedProcess}
          />
        )}
      </main>

      {/* Process Details Full Modal */}
      {selectedProcessForModal && (
        <ProcessDetailModal
          process={selectedProcessForModal}
          onClose={() => setSelectedProcessForModal(null)}
          onSave={handleSaveProcess}
          onDelete={handleDeleteProcess}
          onOpenWhatsApp={handleQuickWhatsApp}
          onAdvanceStage={handleAdvanceStage}
        />
      )}

      {/* New Process Creation Modal */}
      {isNewProcessModalOpen && (
        <NewProcessModal
          isOpen={isNewProcessModalOpen}
          onClose={() => setIsNewProcessModalOpen(false)}
          onSave={handleCreateProcess}
          initialData={newProcessInitialData}
        />
      )}

      {/* Data Management & Reset Modal */}
      {isDataManagementModalOpen && (
        <DataManagementModal
          isOpen={isDataManagementModalOpen}
          onClose={() => setIsDataManagementModalOpen(false)}
          processes={processes}
          onUpdateProcesses={(updated) => {
            setProcesses(updated);
            saveProcesses(scope, updated);
          }}
          onOpenNewProcessWithMonth={handleOpenNewProcessWithMonth}
          showToast={showToast}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CRMApp />
    </AuthProvider>
  );
}
