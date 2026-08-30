import React, { useState } from 'react';
import {
  X,
  Building,
  User,
  Phone,
  DollarSign,
  Calendar,
  Save,
  Plus,
  Layers,
  MapPin,
} from 'lucide-react';
import { BankPartner, ClientProcess, CreditType, PriorityLevel, ProcessStage } from '../types';
import { BANK_CONFIGS, CREDIT_TYPE_LABELS, getFullDefaultChecklist } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

interface NewProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newProcess: ClientProcess) => void;
  initialData?: Partial<ClientProcess>;
}

export const NewProcessModal: React.FC<NewProcessModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  if (!isOpen) return null;

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const defaultMonthStr = `${currentYear}-${currentMonth}`;

  const [clientName, setClientName] = useState<string>(initialData?.clientName || '');
  const [clientCpf, setClientCpf] = useState<string>(initialData?.clientCpf || '');
  const [clientPhone, setClientPhone] = useState<string>(initialData?.clientPhone || '');
  const [clientEmail, setClientEmail] = useState<string>(initialData?.clientEmail || '');
  const [spouseName, setSpouseName] = useState<string>(initialData?.spouseName || '');
  const [spouseCpf, setSpouseCpf] = useState<string>(initialData?.spouseCpf || '');

  const [creditType, setCreditType] = useState<CreditType>(initialData?.creditType || 'AQUISICAO_RESIDENCIAL');
  const [propertyValue, setPropertyValue] = useState<number>(initialData?.propertyValue || 500000);
  const [financingValue, setFinancingValue] = useState<number>(initialData?.financingValue || 400000);
  const [downPaymentValue, setDownPaymentValue] = useState<number>(initialData?.downPaymentValue || 100000);
  const [amortizationSystem, setAmortizationSystem] = useState<'SAC' | 'PRICE'>(initialData?.amortizationSystem || 'SAC');
  const [interestRateAnnual, setInterestRateAnnual] = useState<number>(initialData?.interestRateAnnual || 10.49);
  const [termMonths, setTermMonths] = useState<number>(initialData?.termMonths || 360);

  const [bank, setBank] = useState<BankPartner>(initialData?.bank || 'Itaú Unibanco');
  const [proposalNumber, setProposalNumber] = useState<string>(initialData?.proposalNumber || '');
  const [agency, setAgency] = useState<string>(initialData?.agency || '');
  const [commissionPercentage, setCommissionPercentage] = useState<number>(
    initialData?.commissionPercentage || BANK_CONFIGS['Itaú Unibanco'].defaultCommissionPercentage
  );

  const [estimatedIssuanceMonth, setEstimatedIssuanceMonth] = useState<string>(
    initialData?.estimatedIssuanceMonth || defaultMonthStr
  );
  const [propertyCity, setPropertyCity] = useState<string>(initialData?.propertyCity || 'São Paulo');
  const [propertyState, setPropertyState] = useState<string>(initialData?.propertyState || 'SP');
  const [registryOfficeName, setRegistryOfficeName] = useState<string>(initialData?.registryOfficeName || '');
  const [partnerRealtorName, setPartnerRealtorName] = useState<string>(initialData?.partnerRealtorName || '');
  const [partnerRealtorPhone, setPartnerRealtorPhone] = useState<string>(initialData?.partnerRealtorPhone || '');
  const [partnerRealtorCommissionPct, setPartnerRealtorCommissionPct] = useState<number>(
    initialData?.partnerRealtorCommissionPct || 0
  );
  const [priority, setPriority] = useState<PriorityLevel>(initialData?.priority || 'NORMAL');
  const [initialStage, setInitialStage] = useState<ProcessStage>(initialData?.stage || 'SIMULATION_COLLECTION');

  // Handle bank change to auto update default commission
  const handleBankSelect = (newBank: BankPartner) => {
    setBank(newBank);
    const rule = BANK_CONFIGS[newBank];
    if (rule) {
      setCommissionPercentage(
        creditType === 'HOME_EQUITY' ? rule.homeEquityCommissionPercentage : rule.defaultCommissionPercentage
      );
    }
  };

  const handlePropertyValueChange = (val: number) => {
    setPropertyValue(val);
    const fin = Math.round(val * 0.8);
    setFinancingValue(fin);
    setDownPaymentValue(val - fin);
  };

  const handleFinancingChange = (val: number) => {
    setFinancingValue(val);
    setDownPaymentValue(Math.max(0, propertyValue - val));
  };

  const commissionAmount = (financingValue * commissionPercentage) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }

    const newProc: ClientProcess = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientName: clientName.trim(),
      clientCpf: clientCpf.trim() || '000.000.000-00',
      clientPhone: clientPhone.trim() || '(11) 99999-9999',
      clientEmail: clientEmail.trim() || undefined,
      spouseName: spouseName.trim() || undefined,
      spouseCpf: spouseCpf.trim() || undefined,

      creditType,
      propertyValue,
      financingValue,
      downPaymentValue,
      amortizationSystem,
      interestRateAnnual,
      termMonths,

      bank,
      proposalNumber: proposalNumber.trim() || undefined,
      agency: agency.trim() || undefined,

      commissionPercentage,
      commissionAmount,
      commissionStatus: 'PREVISTA',

      partnerRealtorName: partnerRealtorName.trim() || undefined,
      partnerRealtorPhone: partnerRealtorPhone.trim() || undefined,
      partnerRealtorCommissionPct: partnerRealtorCommissionPct || undefined,

      estimatedIssuanceMonth,
      propertyCity: propertyCity.trim() || 'São Paulo',
      propertyState: propertyState.trim() || 'SP',
      registryOfficeName: registryOfficeName.trim() || undefined,

      stage: initialStage,
      stageUpdatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      priority,

      notes: [
        {
          id: `n_${Date.now()}`,
          text: `Processo cadastrado na Morada Crédito Imobiliário com banco ${bank}.`,
          createdAt: new Date().toISOString(),
          author: 'Deiglison Lima',
          category: 'GERAL',
        },
      ],
      checklist: getFullDefaultChecklist(),
      stageHistory: [
        {
          id: `sh_${Date.now()}`,
          toStage: initialStage,
          changedAt: new Date().toISOString(),
          note: 'Processo iniciado',
        },
      ],
    };

    onSave(newProc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Cadastrar Novo Processo de Financiamento
              </h3>
              <p className="text-xs text-slate-400">
                Morada Crédito Imobiliário • Assessoria e Correspondente Bancário
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {/* Section 1: Cliente */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>1. Dados do Cliente / Proponente</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  id="new-client-name"
                  type="text"
                  required
                  placeholder="Ex: João Ferreira da Silva"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
                <input
                  id="new-client-cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={clientCpf}
                  onChange={(e) => setClientCpf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Celular</label>
                <input
                  id="new-client-phone"
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cônjuge (se houver)</label>
                <input
                  type="text"
                  placeholder="Nome do cônjuge"
                  value={spouseName}
                  onChange={(e) => setSpouseName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF Cônjuge</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={spouseCpf}
                  onChange={(e) => setSpouseCpf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Operação & Banco */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>2. Operação Financeira & Instituição Bancária</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Crédito</label>
                <select
                  value={creditType}
                  onChange={(e) => setCreditType(e.target.value as CreditType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {Object.entries(CREDIT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Banco Escolhido</label>
                <select
                  value={bank}
                  onChange={(e) => handleBankSelect(e.target.value as BankPartner)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {Object.keys(BANK_CONFIGS).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nº Proposta no Banco</label>
                <input
                  type="text"
                  placeholder="Ex: ITU-2026-98124"
                  value={proposalNumber}
                  onChange={(e) => setProposalNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor do Imóvel (R$)</label>
                <input
                  type="number"
                  step="5000"
                  value={propertyValue}
                  onChange={(e) => handlePropertyValueChange(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Financiado (R$)</label>
                <input
                  type="number"
                  step="5000"
                  value={financingValue}
                  onChange={(e) => handleFinancingChange(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comissão Banco (%)</label>
                <input
                  type="number"
                  step="0.05"
                  value={commissionPercentage}
                  onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Comissão Morada (R$)</label>
                <div className="font-mono text-xs font-black text-emerald-700 pt-2">
                  {formatCurrency(commissionAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Imóvel, Prazos & Parcerias */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>3. Imóvel, Previsões & Corretor</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={propertyCity}
                  onChange={(e) => setPropertyCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UF</label>
                <input
                  type="text"
                  value={propertyState}
                  onChange={(e) => setPropertyState(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mês Previsão Emissão</label>
                <div className="flex flex-col gap-1.5">
                  <input
                    type="month"
                    value={estimatedIssuanceMonth}
                    onChange={(e) => setEstimatedIssuanceMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEstimatedIssuanceMonth('2026-08')}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer border ${
                        estimatedIssuanceMonth === '2026-08'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Agosto/26
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimatedIssuanceMonth('2026-09')}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition cursor-pointer border ${
                        estimatedIssuanceMonth === '2026-09'
                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      Setembro/26
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fase Atual no CRM</label>
                <select
                  value={initialStage}
                  onChange={(e) => setInitialStage(e.target.value as ProcessStage)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900"
                >
                  <optgroup label="Etapas Iniciais (Novos de Setembro)">
                    <option value="SIMULATION_COLLECTION">1. Simulação & Coleta</option>
                    <option value="CREDIT_ANALYSIS">2. Análise de Crédito</option>
                    <option value="PROPERTY_VALUATION">3. Engenharia & Vistoria</option>
                    <option value="LEGAL_COMPLIANCE">4. Análise Jurídica</option>
                  </optgroup>
                  <optgroup label="Etapas Finais (Em Andamento / Agosto)">
                    <option value="CONTRACT_ISSUANCE">5. Emissão de Contrato</option>
                    <option value="CONTRACT_SIGNATURE">6. Assinatura</option>
                    <option value="PROPERTY_REGISTRY">7. Cartório / RGI</option>
                    <option value="DISBURSEMENT_COMPLETED">8. Recursos Liberados</option>
                    <option value="COMMISSION_PAID">9. Concluído & Comissionado</option>
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Corretor / Imobiliária Parceira</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos (Imobiliária Alpha)"
                  value={partnerRealtorName}
                  onChange={(e) => setPartnerRealtorName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp do Corretor</label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={partnerRealtorPhone}
                  onChange={(e) => setPartnerRealtorPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Repasse ao Corretor (%)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="Ex: 0.20"
                  value={partnerRealtorCommissionPct}
                  onChange={(e) => setPartnerRealtorCommissionPct(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-950/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar e Iniciar Processo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
