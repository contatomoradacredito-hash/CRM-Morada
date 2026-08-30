/**
 * Morada Crédito Imobiliário - CRM
 * Correspondente Bancário | Financiamento Imobiliário
 */

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ClientProcess, CreditType, ProcessStage } from './types';
import { INITIAL_PROCESSES } from './data/defaultData';
import {
  exportProcessesToCSV,
  exportProcessesToJSON,
  getAvailableMonths,
  loadProcesses,
  saveProcesses,
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
import { STAGE_CONFIGS } from './utils/constants';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  syncProcessesToFirestore,
  saveProcessToFirestore,
  deleteProcessFromFirestore,
  loadProcessesFromFirestore,
  subscribeToProcesses,
  mergeProcessesLists,
} from './lib/firebase';
import { Building2 } from 'lucide-react';

function CRMApp() {
  const { user, loading } = useAuth();
  const [processes, setProcesses] = useState<ClientProcess[]>(() => loadProcesses());
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

  // Sync with Firestore & localStorage with non-destructive merge
  useEffect(() => {
    if (!user) return;

    // Load initial processes from Firestore
    loadProcessesFromFirestore().then((cloudProcesses) => {
      if (cloudProcesses && cloudProcesses.length > 0) {
        setProcesses((current) => {
          const merged = mergeProcessesLists(current, cloudProcesses);
          saveProcesses(merged);
          return merged;
        });
      }
    });

    // Subscribe to real-time changes
    const unsubscribe = subscribeToProcesses((cloudProcesses) => {
      setProcesses((current) => {
        const merged = mergeProcessesLists(current, cloudProcesses);
        saveProcesses(merged);
        return merged;
      });
    });

    return () => unsubscribe();
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
      saveProcesses(updated);
      return updated;
    });

    if (updatedProcess) {
      saveProcessToFirestore(updatedProcess);
    }
    showToast(`Processo atualizado para ${STAGE_CONFIGS[nextStage]?.shortLabel || nextStage}`);
  };

  const handleSaveProcess = (updatedProc: ClientProcess) => {
    setProcesses((prev) => {
      const list = prev.map((p) => (p.id === updatedProc.id ? updatedProc : p));
      saveProcesses(list);
      return list;
    });
    saveProcessToFirestore(updatedProc);
    showToast(`Processo de ${updatedProc.clientName} salvo com sucesso!`);
  };

  const handleDeleteProcess = (processId: string) => {
    setProcesses((prev) => {
      const list = prev.filter((p) => p.id !== processId);
      saveProcesses(list);
      return list;
    });
    deleteProcessFromFirestore(processId);
    showToast('Processo excluído.');
  };

  const handleCreateProcess = (newProc: ClientProcess) => {
    setProcesses((prev) => {
      const updated = [newProc, ...prev.filter((p) => p.id !== newProc.id)];
      saveProcesses(updated);
      return updated;
    });
    saveProcessToFirestore(newProc);
    showToast(`Novo processo de ${newProc.clientName} adicionado ao funil com sucesso!`);
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
    setProcesses(INITIAL_PROCESSES);
    saveProcesses(INITIAL_PROCESSES);
    syncProcessesToFirestore(INITIAL_PROCESSES).catch(() => {});
    showToast('Dados de exemplo da Morada Crédito recarregados.');
  };

  const handleOpenNewProcessWithMonth = (month: string) => {
    setNewProcessInitialData({
      estimatedIssuanceMonth: month,
      stage: month === '2026-08' ? 'PROPERTY_REGISTRY' : 'SIMULATION_COLLECTION',
    });
    setIsNewProcessModalOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-2xl animate-pulse">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Carregando Morada Crédito CRM...</p>
      </div>
    );
  }

  // If not logged in, show Login / Register screen
  if (!user) {
    return <LoginScreen />;
  }

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
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Executive KPI Stats on top */}
        <HeaderStats processes={processes} selectedMonth={selectedMonth} />

        {/* View Switcher */}
        {activeTab === 'pipeline' && (
          <PipelineBoard
            processes={processes}
            onSelectProcess={(proc) => setSelectedProcessForModal(proc)}
            onAdvanceStage={handleAdvanceStage}
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
      <NewProcessModal
        isOpen={isNewProcessModalOpen}
        onClose={() => setIsNewProcessModalOpen(false)}
        onSave={handleCreateProcess}
        initialData={newProcessInitialData}
      />

      {/* Data Management & Reset Modal */}
      <DataManagementModal
        isOpen={isDataManagementModalOpen}
        onClose={() => setIsDataManagementModalOpen(false)}
        processes={processes}
        onUpdateProcesses={(updated) => {
          setProcesses(updated);
          saveProcesses(updated);
          syncProcessesToFirestore(updated).catch(() => {});
        }}
        onOpenNewProcessWithMonth={handleOpenNewProcessWithMonth}
        showToast={showToast}
      />
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
