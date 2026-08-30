export type ProcessStage =
  | 'SIMULATION_COLLECTION'   // 1. Simulação
  | 'CREDIT_ANALYSIS'         // 2. Análise de Crédito
  | 'PROPERTY_VALUATION'      // 3. Engenharia & Vistoria
  | 'LEGAL_COMPLIANCE'        // 4. Análise Jurídica / Dossiê
  | 'VALUE_CONFIRMATION'      // 5. Confirmação de Valores
  | 'CONTRACT_ISSUANCE'       // 6. Emissão do Contrato
  | 'CONTRACT_SIGNATURE'      // 7. Assinatura do Contrato
  | 'PROPERTY_REGISTRY'       // 8. Cartório de Imóveis & ITBI
  | 'DISBURSEMENT_COMPLETED'  // 9. Recursos Liberados ao Vendedor
  | 'COMMISSION_PAID'         // 10. Concluído & Comissionado
  | 'DECLINED_CANCELLED';     // Declinado / Cancelado

export type CreditAnalysisStatus = 'EM_ANALISE' | 'APROVADO' | 'RECUSADO';

export type BankPartner =
  | 'Caixa Econômica Federal'
  | 'Itaú Unibanco'
  | 'Bradesco'
  | 'Santander'
  | 'Banco do Brasil'
  | 'Banco Inter'
  | 'Credihome / Loft'
  | 'Banco Bari (Home Equity)'
  | 'Daycoval'
  | 'Outra Instituição';

export type CreditType =
  | 'AQUISICAO_RESIDENCIAL'
  | 'AQUISICAO_COMERCIAL'
  | 'HOME_EQUITY'
  | 'CONSTRUCAO'
  | 'PORTABILIDADE';

export type CommissionStatus =
  | 'PREVISTA'
  | 'AGUARDANDO_REGISTRO'
  | 'DISPONIVEL_FATURAMENTO'
  | 'PAGA'
  | 'CANCELADA';

export type PriorityLevel = 'NORMAL' | 'ALTA' | 'URGENTE';

export interface ProcessChecklistItem {
  id: string;
  stage: ProcessStage;
  title: string;
  category: 'CLIENTE' | 'VENDEDOR' | 'IMOVEL' | 'BANCO' | 'CARTORIO';
  required: boolean;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface ProcessNote {
  id: string;
  text: string;
  createdAt: string;
  author: string;
  category: 'GERAL' | 'BANCO' | 'JURIDICO' | 'CARTORIO' | 'CLIENTE' | 'ENGENHARIA' | 'CORRETOR' | 'PENDENCIA';
}

export interface StageHistoryEntry {
  id: string;
  fromStage?: ProcessStage;
  toStage: ProcessStage;
  changedAt: string;
  note?: string;
}

export interface ClientProcess {
  id: string;
  clientName: string;
  clientCpf: string;
  clientPhone: string;
  clientEmail?: string;
  spouseName?: string;
  spouseCpf?: string;
  
  // Operação
  creditType: CreditType;
  propertyValue: number;       // Valor do Imóvel / Avaliação
  financingValue: number;      // Valor Financiado
  downPaymentValue: number;    // Valor de Entrada
  amortizationSystem: 'SAC' | 'PRICE';
  interestRateAnnual: number;  // Taxa de juros a.a. ex: 10.49
  termMonths: number;          // Prazo em meses ex: 360 ou 420
  
  // Banco & Proposta
  bank: BankPartner;
  otherApprovedBanks?: BankPartner[];
  proposalNumber?: string;
  agency?: string;
  bankManagerName?: string;
  bankManagerContact?: string;
  
  // Financeiro & Comissão da Assessoria
  commissionPercentage: number;  // Ex: 1.2%
  commissionAmount: number;      // Calculado: financingValue * (commissionPercentage / 100)
  commissionStatus: CommissionStatus;
  commissionPaidAt?: string;
  
  // Parceria / Corretor
  partnerRealtorName?: string;
  partnerRealtorPhone?: string;
  partnerRealtorCommissionPct?: number; // % de repasse ao corretor (ex: 0.2%)
  
  // Prazos & Previsões
  estimatedIssuanceMonth: string; // Formato YYYY-MM ex: "2026-09"
  estimatedIssuanceDate?: string;
  estimatedDisbursementDate?: string;
  
  // Imóvel & Cartório
  propertyAddress?: string;
  propertyCity: string;
  propertyState: string;
  registryOfficeName?: string; // Cartório de Registro de Imóveis (ex: 1º RGI)
  rgiProtocolNumber?: string;  // Número de Prenotação
  itbiGuideNumber?: string;
  
  // Fluxo & Status
  stage: ProcessStage;
  stageUpdatedAt: string;
  createdAt: string;
  priority: PriorityLevel;
  creditAnalysisStatus?: CreditAnalysisStatus; // 'EM_ANALISE' | 'APROVADO' | 'RECUSADO'
  creditApprovalDate?: string;
  creditAnalysisNotes?: string;
  
  // Detalhes & Rastreabilidade
  notes: ProcessNote[];
  checklist: ProcessChecklistItem[];
  stageHistory: StageHistoryEntry[];
  
  // Análise de Riscos / Pendências & Observações
  hasPendingIssues?: boolean;
  pendingIssueDescription?: string;
  generalObservations?: string;
  valuationNotes?: string;
  legalNotes?: string;
}

export interface BankCommissionRule {
  bank: BankPartner;
  defaultCommissionPercentage: number;
  homeEquityCommissionPercentage: number;
  averageApprovalDays: number;
  averageContractDays: number;
  color: string;
  badgeBg: string;
  textColor: string;
}

export interface SimulationParameters {
  propertyValue: number;
  financingValue: number;
  termMonths: number;
  annualInterestRate: number;
  system: 'SAC' | 'PRICE';
  commissionPct: number;
  bank: BankPartner;
  clientName?: string;
  clientPhone?: string;
}
