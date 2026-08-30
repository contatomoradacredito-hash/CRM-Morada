import React, { useState } from 'react';
import {
  Calculator,
  Percent,
  DollarSign,
  Building,
  CheckCircle2,
  Copy,
  Plus,
  Send,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { BankPartner, CreditType } from '../types';
import { BANK_CONFIGS, CREDIT_TYPE_LABELS } from '../utils/constants';
import { calculateSimulation, formatCurrency, formatPercent } from '../utils/formatters';

interface CreditSimulatorProps {
  onCreateProcessFromSim: (simData: {
    clientName: string;
    clientPhone: string;
    creditType: CreditType;
    propertyValue: number;
    financingValue: number;
    downPaymentValue: number;
    termMonths: number;
    interestRateAnnual: number;
    amortizationSystem: 'SAC' | 'PRICE';
    bank: BankPartner;
    commissionPercentage: number;
  }) => void;
}

export const CreditSimulator: React.FC<CreditSimulatorProps> = ({
  onCreateProcessFromSim,
}) => {
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [creditType, setCreditType] = useState<CreditType>('AQUISICAO_RESIDENCIAL');
  const [propertyValue, setPropertyValue] = useState<number>(650000);
  const [financingValue, setFinancingValue] = useState<number>(520000); // 80%
  const [termMonths, setTermMonths] = useState<number>(360);
  const [interestRateAnnual, setInterestRateAnnual] = useState<number>(10.49);
  const [amortizationSystem, setAmortizationSystem] = useState<'SAC' | 'PRICE'>('SAC');
  const [bank, setBank] = useState<BankPartner>('Itaú Unibanco');
  const [commissionPercentage, setCommissionPercentage] = useState<number>(1.25);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Update commission when bank changes
  const handleBankChange = (newBank: BankPartner) => {
    setBank(newBank);
    const rule = BANK_CONFIGS[newBank];
    if (rule) {
      if (creditType === 'HOME_EQUITY') {
        setCommissionPercentage(rule.homeEquityCommissionPercentage);
      } else {
        setCommissionPercentage(rule.defaultCommissionPercentage);
      }
    }
  };

  const handleQuickLTV = (pct: number) => {
    setFinancingValue(Math.round((propertyValue * pct) / 100));
  };

  const handlePropertyValueChange = (val: number) => {
    setPropertyValue(val);
    setFinancingValue(Math.round((val * 0.8))); // default 80%
  };

  const sim = calculateSimulation(
    propertyValue,
    financingValue,
    termMonths,
    interestRateAnnual,
    amortizationSystem
  );

  const estimatedCommissionRevenue = (financingValue * commissionPercentage) / 100;

  const handleCopyProposal = () => {
    const text = `🏡 *PROPOSTA DE FINANCIAMENTO IMOBILIÁRIO*
Assessoria Especializada: *Morada Crédito Imobiliário*

👤 *Cliente:* ${clientName || 'Cliente Proponente'}
🏦 *Instituição Selecionada:* ${bank}
📑 *Modalidade:* ${CREDIT_TYPE_LABELS[creditType]?.label || 'Financiamento'}

💰 *DETALHES DA OPERAÇÃO:*
• *Valor do Imóvel:* ${formatCurrency(propertyValue)}
• *Entrada:* ${formatCurrency(sim.downPayment)} (${(100 - sim.ltv).toFixed(0)}%)
• *Valor Financiado:* ${formatCurrency(financingValue)} (${sim.ltv.toFixed(0)}%)
• *Prazo:* ${termMonths} meses (${(termMonths / 12).toFixed(0)} anos)
• *Taxa de Juros:* ${formatPercent(interestRateAnnual)} ao ano
• *Sistema de Amortização:* ${amortizationSystem}

📊 *ESTIMATIVA DE PARCELAS:*
${amortizationSystem === 'SAC' ? `• *1ª Parcela (Decrescente):* ${formatCurrency(sim.firstInstallment)}\n• *Última Parcela:* ${formatCurrency(sim.lastInstallment)}` : `• *Parcela Fixa (PRICE):* ${formatCurrency(sim.firstInstallment)}`}

✨ *Próximo Passo:* Envio dos documentos básicos para emissão da Carta de Crédito Aprovada sem custos iniciais.

*Deiglison Lima | Morada Crédito Imobiliário*`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleCreateProcess = () => {
    onCreateProcessFromSim({
      clientName: clientName || 'Novo Cliente Simulação',
      clientPhone,
      creditType,
      propertyValue,
      financingValue,
      downPaymentValue: sim.downPayment,
      termMonths,
      interestRateAnnual,
      amortizationSystem,
      bank,
      commissionPercentage,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <span>Simulador de Crédito & Proposta de Financiamento</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Simule condições de crédito com os principais bancos parceiros, calcule a receita de assessoria e gere propostas prontas para o cliente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span>1. Parâmetros da Simulação</span>
          </h3>

          {/* Client Quick Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Cliente
              </label>
              <input
                id="input-sim-client-name"
                type="text"
                placeholder="Ex: João da Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp / Celular
              </label>
              <input
                id="input-sim-client-phone"
                type="text"
                placeholder="Ex: (11) 98765-4321"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Modalidade & Banco */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Crédito
              </label>
              <select
                id="select-sim-credit-type"
                value={creditType}
                onChange={(e) => setCreditType(e.target.value as CreditType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                {Object.entries(CREDIT_TYPE_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Banco Escolhido
              </label>
              <select
                id="select-sim-bank"
                value={bank}
                onChange={(e) => handleBankChange(e.target.value as BankPartner)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                {Object.keys(BANK_CONFIGS).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Property Value & Financing Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor de Avaliação / Imóvel (R$)
              </label>
              <input
                id="input-sim-property-val"
                type="number"
                step="5000"
                value={propertyValue}
                onChange={(e) => handlePropertyValueChange(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Valor Financiado (R$)
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickLTV(80)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                  >
                    80%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLTV(70)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                  >
                    70%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLTV(50)}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold cursor-pointer"
                  >
                    50%
                  </button>
                </div>
              </div>
              <input
                id="input-sim-financing-val"
                type="number"
                step="5000"
                value={financingValue}
                onChange={(e) => setFinancingValue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Prazo, Taxa e Amortização */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Prazo (Meses)
              </label>
              <select
                id="select-sim-term"
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value={420}>420 meses (35 anos)</option>
                <option value={360}>360 meses (30 anos)</option>
                <option value={300}>300 meses (25 anos)</option>
                <option value={240}>240 meses (20 anos)</option>
                <option value={180}>180 meses (15 anos)</option>
                <option value={120}>120 meses (10 anos)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Taxa de Juros (% a.a.)
              </label>
              <input
                id="input-sim-rate"
                type="number"
                step="0.05"
                value={interestRateAnnual}
                onChange={(e) => setInterestRateAnnual(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tabela
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAmortizationSystem('SAC')}
                  className={`py-1 rounded text-xs font-bold transition cursor-pointer ${
                    amortizationSystem === 'SAC'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  SAC
                </button>
                <button
                  type="button"
                  onClick={() => setAmortizationSystem('PRICE')}
                  className={`py-1 rounded text-xs font-bold transition cursor-pointer ${
                    amortizationSystem === 'PRICE'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  PRICE
                </button>
              </div>
            </div>
          </div>

          {/* Commission Configuration for this proposal */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-900 block">
                Comissão da Morada Crédito ({bank})
              </span>
              <span className="text-[11px] text-emerald-700">
                Percentual pago pelo banco à assessoria
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="input-sim-commission-pct"
                type="number"
                step="0.05"
                value={commissionPercentage}
                onChange={(e) => setCommissionPercentage(Number(e.target.value))}
                className="w-18 bg-white border border-emerald-300 rounded px-2 py-1 text-xs font-bold text-emerald-900 text-right focus:outline-none"
              />
              <span className="text-xs font-bold text-emerald-900">%</span>
            </div>
          </div>
        </div>

        {/* Right Output Card: Results & Actions (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-850 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Resultado da Simulação
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-medium">
                {bank}
              </span>
            </div>

            {/* Installments Highlight */}
            <div className="mt-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{amortizationSystem === 'SAC' ? '1ª Parcela (Decrescente)' : 'Parcela Fixa Mensal'}</span>
                <span className="font-mono text-emerald-400">{amortizationSystem}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                {formatCurrency(sim.firstInstallment)}
              </p>
              {amortizationSystem === 'SAC' && (
                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-700">
                  <span>Última Parcela:</span>
                  <span className="font-bold text-slate-200">{formatCurrency(sim.lastInstallment)}</span>
                </div>
              )}
            </div>

            {/* Metrics Breakdown */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Entrada Necessária:</span>
                <span className="font-bold text-white">
                  {formatCurrency(sim.downPayment)} ({(100 - sim.ltv).toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Valor Financiado:</span>
                <span className="font-bold text-white">
                  {formatCurrency(financingValue)} ({sim.ltv.toFixed(0)}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Total de Juros no Prazo:</span>
                <span className="font-mono text-slate-400">
                  {formatCurrency(sim.totalInterest)}
                </span>
              </div>

              {/* Commission Revenue for Morada Crédito */}
              <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300">Receita Morada Crédito:</span>
                  <span className="font-black text-emerald-400 font-mono text-sm">
                    {formatCurrency(estimatedCommissionRevenue)}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-200/80 block mt-0.5">
                  ({commissionPercentage}% comissionamento pago pelo {bank})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              id="btn-sim-create-process"
              onClick={handleCreateProcess}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Processo no CRM com estes Dados</span>
            </button>

            <button
              id="btn-sim-copy-proposal"
              onClick={handleCopyProposal}
              className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700"
            >
              {copiedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Proposta Copiada para o WhatsApp!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Proposta Formatada para WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
