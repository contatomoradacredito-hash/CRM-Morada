import { BankCommissionRule, BankPartner, CreditAnalysisStatus, CreditType, ProcessChecklistItem, ProcessStage } from '../types';

export interface StageConfig {
  id: ProcessStage;
  order: number;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
  borderColor: string;
  textColor: string;
  bgColor: string;
  bgLight: string;
  iconName: string;
}

export const STAGE_CONFIGS: Record<ProcessStage, StageConfig> = {
  SIMULATION_COLLECTION: {
    id: 'SIMULATION_COLLECTION',
    order: 1,
    label: '1. Simulação',
    shortLabel: 'Simulação',
    description: 'Simulação de taxas, formulação da proposta e alinhamento dos cenários de crédito.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-700',
    bgColor: 'bg-amber-500',
    bgLight: 'bg-amber-50/70',
    iconName: 'Calculator',
  },
  CREDIT_ANALYSIS: {
    id: 'CREDIT_ANALYSIS',
    order: 2,
    label: '2. Análise de Crédito',
    shortLabel: 'Análise de Crédito',
    description: 'Fichas enviadas aos bancos parceiros com substatus: Em Análise, Aprovado ou Recusado.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-600',
    bgLight: 'bg-blue-50/70',
    iconName: 'CheckCircle2',
  },
  PROPERTY_VALUATION: {
    id: 'PROPERTY_VALUATION',
    order: 3,
    label: '3. Engenharia & Vistoria',
    shortLabel: 'Vistoria / Laudo',
    description: 'Agendamento e realização de vistoria técnica do imóvel pelo engenheiro credenciado do banco.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    borderColor: 'border-indigo-400',
    textColor: 'text-indigo-700',
    bgColor: 'bg-indigo-600',
    bgLight: 'bg-indigo-50/70',
    iconName: 'Home',
  },
  LEGAL_COMPLIANCE: {
    id: 'LEGAL_COMPLIANCE',
    order: 4,
    label: '4. Análise Jurídica / Dossiê',
    shortLabel: 'Jurídico',
    description: 'Conferência de certidões do comprador, vendedor e matrícula atualizada do imóvel.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-600',
    bgLight: 'bg-purple-50/70',
    iconName: 'FileCheck2',
  },
  VALUE_CONFIRMATION: {
    id: 'VALUE_CONFIRMATION',
    order: 5,
    label: '5. Confirmação de Valores',
    shortLabel: 'Confirmação de Valores',
    description: 'Revisão e ajuste final dos valores da operação, prazo de financiamento, taxa de juros e parcelas antes de solicitar a emissão da minuta contratual.',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-800',
    bgColor: 'bg-amber-600',
    bgLight: 'bg-amber-50/70',
    iconName: 'SlidersHorizontal',
  },
  CONTRACT_ISSUANCE: {
    id: 'CONTRACT_ISSUANCE',
    order: 6,
    label: '6. Emissão de Contrato',
    shortLabel: 'Emissão Contrato',
    description: 'Minuta gerada e validação final do banco para envio da via física ou assinatura digital.',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    borderColor: 'border-cyan-400',
    textColor: 'text-cyan-700',
    bgColor: 'bg-cyan-600',
    bgLight: 'bg-cyan-50/70',
    iconName: 'FileText',
  },
  CONTRACT_SIGNATURE: {
    id: 'CONTRACT_SIGNATURE',
    order: 7,
    label: '7. Assinatura do Contrato',
    shortLabel: 'Assinaturas',
    description: 'Assinatura presencial ou digital pelo Comprador, Cônjuge, Vendedor e Instituição.',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    borderColor: 'border-teal-400',
    textColor: 'text-teal-700',
    bgColor: 'bg-teal-600',
    bgLight: 'bg-teal-50/70',
    iconName: 'PenTool',
  },
  PROPERTY_REGISTRY: {
    id: 'PROPERTY_REGISTRY',
    order: 8,
    label: '8. Cartório de Imóveis (RGI & ITBI)',
    shortLabel: 'Cartório / RGI',
    description: 'Pagamento de guia de ITBI e protocolo do contrato no Cartório de Registro de Imóveis.',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-600',
    bgLight: 'bg-orange-50/70',
    iconName: 'Building2',
  },
  DISBURSEMENT_COMPLETED: {
    id: 'DISBURSEMENT_COMPLETED',
    order: 9,
    label: '9. Recursos Liberados ao Vendedor',
    shortLabel: 'Recursos Liberados',
    description: 'Matrícula registrada entregue ao banco; saldo liberado na conta do vendedor.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-600',
    bgLight: 'bg-emerald-50/70',
    iconName: 'Coins',
  },
  COMMISSION_PAID: {
    id: 'COMMISSION_PAID',
    order: 10,
    label: '10. Concluído & Comissionado',
    shortLabel: 'Comissão Paga',
    description: 'Processo arquivado com sucesso e honorários de comissão pagos à Morada Crédito.',
    badgeColor: 'bg-green-100 text-green-800 border-green-300',
    borderColor: 'border-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-600',
    bgLight: 'bg-green-50/70',
    iconName: 'CheckCheck',
  },
  DECLINED_CANCELLED: {
    id: 'DECLINED_CANCELLED',
    order: 11,
    label: 'Declinado / Cancelado',
    shortLabel: 'Declinado',
    description: 'Processo cancelado por desistência ou crédito não aprovado pelos bancos.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    borderColor: 'border-rose-400',
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-600',
    bgLight: 'bg-rose-50/70',
    iconName: 'XCircle',
  },
};

export const PIPELINE_STAGES: ProcessStage[] = [
  'SIMULATION_COLLECTION',
  'CREDIT_ANALYSIS',
  'PROPERTY_VALUATION',
  'LEGAL_COMPLIANCE',
  'VALUE_CONFIRMATION',
  'CONTRACT_ISSUANCE',
  'CONTRACT_SIGNATURE',
  'PROPERTY_REGISTRY',
  'DISBURSEMENT_COMPLETED',
];

export interface CreditStatusConfig {
  id: CreditAnalysisStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeActiveBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
}

export const CREDIT_ANALYSIS_STATUS_CONFIGS: Record<CreditAnalysisStatus, CreditStatusConfig> = {
  EM_ANALISE: {
    id: 'EM_ANALISE',
    label: 'Em Análise',
    shortLabel: 'Em Análise',
    description: 'Proposta em análise cadastral e de risco nos bancos parceiros.',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-300',
    badgeActiveBg: 'bg-amber-500 text-white border-amber-600',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-400',
    dotColor: 'bg-amber-500',
  },
  APROVADO: {
    id: 'APROVADO',
    label: 'Aprovado',
    shortLabel: 'Aprovado',
    description: 'Crédito aprovado pelo banco. Liberado para avançar para Engenharia e Análise Jurídica.',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    badgeActiveBg: 'bg-emerald-600 text-white border-emerald-700',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-500',
    dotColor: 'bg-emerald-500',
  },
  RECUSADO: {
    id: 'RECUSADO',
    label: 'Recusado',
    shortLabel: 'Recusado',
    description: 'Crédito recusado ou reprovado pela instituição financeira.',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-300',
    badgeActiveBg: 'bg-rose-600 text-white border-rose-700',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-400',
    dotColor: 'bg-rose-500',
  },
};

/**
 * Validates whether a process can advance to a target stage based on business rules.
 * Business Rule: Stage 3 (PROPERTY_VALUATION), Stage 4 (LEGAL_COMPLIANCE), and subsequent stages
 * can ONLY be reached if credit analysis is "APROVADO".
 */
export const canAdvanceToStage = (
  targetStage: ProcessStage,
  creditStatus?: CreditAnalysisStatus
): { allowed: boolean; reason?: string } => {
  const STAGES_REQUIRING_APPROVAL: ProcessStage[] = [
    'PROPERTY_VALUATION',     // 3. Engenharia & Vistoria
    'LEGAL_COMPLIANCE',       // 4. Análise Jurídica / Dossiê
    'VALUE_CONFIRMATION',     // 5. Confirmação de Valores
    'CONTRACT_ISSUANCE',      // 6. Emissão do Contrato
    'CONTRACT_SIGNATURE',     // 7. Assinatura do Contrato
    'PROPERTY_REGISTRY',      // 8. Cartório de Imóveis (RGI)
    'DISBURSEMENT_COMPLETED', // 9. Recursos Liberados
    'COMMISSION_PAID',        // 10. Concluído & Comissionado
  ];

  if (STAGES_REQUIRING_APPROVAL.includes(targetStage)) {
    if (creditStatus !== 'APROVADO') {
      const statusLabel = creditStatus === 'RECUSADO' ? 'Recusado' : 'Em Análise';
      return {
        allowed: false,
        reason: `A etapa de ${STAGE_CONFIGS[targetStage]?.label || targetStage} requer que a Análise de Crédito esteja com status "Aprovado" (atualmente: ${statusLabel}).`,
      };
    }
  }

  return { allowed: true };
};

export const BANK_CONFIGS: Record<BankPartner, BankCommissionRule> = {
  'Caixa Econômica Federal': {
    bank: 'Caixa Econômica Federal',
    defaultCommissionPercentage: 1.0,
    homeEquityCommissionPercentage: 1.2,
    averageApprovalDays: 3,
    averageContractDays: 28,
    color: '#005CA9',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
    textColor: 'text-blue-700',
  },
  'Itaú Unibanco': {
    bank: 'Itaú Unibanco',
    defaultCommissionPercentage: 1.25,
    homeEquityCommissionPercentage: 1.5,
    averageApprovalDays: 1,
    averageContractDays: 18,
    color: '#EC7000',
    badgeBg: 'bg-orange-50 border-orange-200 text-orange-800',
    textColor: 'text-orange-700',
  },
  'Bradesco': {
    bank: 'Bradesco',
    defaultCommissionPercentage: 1.2,
    homeEquityCommissionPercentage: 1.4,
    averageApprovalDays: 2,
    averageContractDays: 22,
    color: '#CC092F',
    badgeBg: 'bg-red-50 border-red-200 text-red-800',
    textColor: 'text-red-700',
  },
  'Santander': {
    bank: 'Santander',
    defaultCommissionPercentage: 1.3,
    homeEquityCommissionPercentage: 1.6,
    averageApprovalDays: 2,
    averageContractDays: 20,
    color: '#EA1D25',
    badgeBg: 'bg-red-50 border-red-200 text-red-700',
    textColor: 'text-red-600',
  },
  'Banco do Brasil': {
    bank: 'Banco do Brasil',
    defaultCommissionPercentage: 0.9,
    homeEquityCommissionPercentage: 1.1,
    averageApprovalDays: 4,
    averageContractDays: 30,
    color: '#F8D117',
    badgeBg: 'bg-amber-50 border-amber-300 text-amber-900',
    textColor: 'text-amber-800',
  },
  'Banco Inter': {
    bank: 'Banco Inter',
    defaultCommissionPercentage: 1.4,
    homeEquityCommissionPercentage: 1.8,
    averageApprovalDays: 1,
    averageContractDays: 16,
    color: '#FF7A00',
    badgeBg: 'bg-orange-50 border-orange-300 text-orange-900',
    textColor: 'text-orange-700',
  },
  'Credihome / Loft': {
    bank: 'Credihome / Loft',
    defaultCommissionPercentage: 1.1,
    homeEquityCommissionPercentage: 1.5,
    averageApprovalDays: 2,
    averageContractDays: 19,
    color: '#6366F1',
    badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    textColor: 'text-indigo-700',
  },
  'Banco Bari (Home Equity)': {
    bank: 'Banco Bari (Home Equity)',
    defaultCommissionPercentage: 2.0,
    homeEquityCommissionPercentage: 2.2,
    averageApprovalDays: 2,
    averageContractDays: 25,
    color: '#10B981',
    badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    textColor: 'text-emerald-700',
  },
  'Daycoval': {
    bank: 'Daycoval',
    defaultCommissionPercentage: 1.8,
    homeEquityCommissionPercentage: 2.0,
    averageApprovalDays: 3,
    averageContractDays: 24,
    color: '#0F766E',
    badgeBg: 'bg-teal-50 border-teal-200 text-teal-800',
    textColor: 'text-teal-700',
  },
  'Outra Instituição': {
    bank: 'Outra Instituição',
    defaultCommissionPercentage: 1.0,
    homeEquityCommissionPercentage: 1.2,
    averageApprovalDays: 3,
    averageContractDays: 25,
    color: '#64748B',
    badgeBg: 'bg-slate-50 border-slate-200 text-slate-800',
    textColor: 'text-slate-700',
  },
};

export const CREDIT_TYPE_LABELS: Record<CreditType, { label: string; short: string; isHomeEquity: boolean }> = {
  AQUISICAO_RESIDENCIAL: {
    label: 'Aquisição Residencial',
    short: 'Financiamento Residencial',
    isHomeEquity: false,
  },
  AQUISICAO_COMERCIAL: {
    label: 'Aquisição Comercial',
    short: 'Financiamento Comercial',
    isHomeEquity: false,
  },
  HOME_EQUITY: {
    label: 'Home Equity (Crédito com Garantia)',
    short: 'Home Equity',
    isHomeEquity: true,
  },
  CONSTRUCAO: {
    label: 'Terreno e Construção',
    short: 'Construção',
    isHomeEquity: false,
  },
  PORTABILIDADE: {
    label: 'Portabilidade de Crédito',
    short: 'Portabilidade',
    isHomeEquity: false,
  },
};

export function getDefaultChecklistForStage(stage: ProcessStage): ProcessChecklistItem[] {
  const checklists: Record<ProcessStage, { title: string; category: ProcessChecklistItem['category']; required: boolean }[]> = {
    SIMULATION_COLLECTION: [
      { title: 'Simulação comparativa realizada nos bancos', category: 'BANCO', required: true },
      { title: 'RG / CNH do(s) comprador(es)', category: 'CLIENTE', required: true },
      { title: 'Comprovante de residência atualizado', category: 'CLIENTE', required: true },
      { title: 'Comprovante de renda (Holerites / Extratos / IRPF)', category: 'CLIENTE', required: true },
      { title: 'Certidão de Estado Civil / Casamento', category: 'CLIENTE', required: false },
    ],
    CREDIT_ANALYSIS: [
      { title: 'Ficha proposta assinada pelo proponente', category: 'CLIENTE', required: true },
      { title: 'Proposta inserida no portal do banco parceiro', category: 'BANCO', required: true },
      { title: 'Carta de aprovação de crédito emitida e validada', category: 'BANCO', required: true },
      { title: 'Opção de composição de renda aprovada', category: 'CLIENTE', required: false },
    ],
    PROPERTY_VALUATION: [
      { title: 'Matrícula atualizada do imóvel (cópia)', category: 'IMOVEL', required: true },
      { title: 'Espelho de IPTU do ano vigente', category: 'IMOVEL', required: true },
      { title: 'Taxa de vistoria/engenharia paga pelo cliente', category: 'CLIENTE', required: true },
      { title: 'Vistoria agendada e realizada pelo engenheiro', category: 'BANCO', required: true },
      { title: 'Laudo de avaliação aprovado sem restrições físicas', category: 'BANCO', required: true },
    ],
    LEGAL_COMPLIANCE: [
      { title: 'Certidões Cíveis e Fiscais dos Vendedores', category: 'VENDEDOR', required: true },
      { title: 'Certidão Negativa de Débitos de Tributos Federais', category: 'VENDEDOR', required: true },
      { title: 'Certidão de Ônus Reais e Ações Reipersecutórias', category: 'IMOVEL', required: true },
      { title: 'Declaração de quitação condominial (se apto)', category: 'IMOVEL', required: false },
      { title: 'Parecer Jurídico do Banco Aprovado (Dossiê Conforme)', category: 'BANCO', required: true },
    ],
    VALUE_CONFIRMATION: [
      { title: 'Validação do valor final de financiamento com o cliente', category: 'CLIENTE', required: true },
      { title: 'Alinhamento do prazo acordado (meses / anos)', category: 'CLIENTE', required: true },
      { title: 'Confirmação da taxa de juros nominal e efetiva do banco', category: 'BANCO', required: true },
      { title: 'Validação do sistema de amortização (SAC / PRICE)', category: 'CLIENTE', required: true },
      { title: 'Aprovação da simulação de parcelas e seguros pelo cliente', category: 'CLIENTE', required: true },
      { title: 'Autorização final para emissão da minuta contratual', category: 'CLIENTE', required: true },
    ],
    CONTRACT_ISSUANCE: [
      { title: 'Validação da minuta e dados das partes', category: 'BANCO', required: true },
      { title: 'Conferência de conta de crédito do vendedor', category: 'VENDEDOR', required: true },
      { title: 'Emissão do Contrato com Força de Escritura Pública', category: 'BANCO', required: true },
    ],
    CONTRACT_SIGNATURE: [
      { title: 'Assinatura dos Compradores / Proponentes', category: 'CLIENTE', required: true },
      { title: 'Assinatura dos Vendedores / Proprietários', category: 'VENDEDOR', required: true },
      { title: 'Assinatura e testemunhas da Instituição Financeira', category: 'BANCO', required: true },
      { title: 'Vias originais do contrato em mãos da assessoria', category: 'BANCO', required: true },
    ],
    PROPERTY_REGISTRY: [
      { title: 'Emissão e pagamento da Guia de ITBI Municipal', category: 'CARTORIO', required: true },
      { title: 'Protocolo e Prenotação no Cartório de Registro de Imóveis (RGI)', category: 'CARTORIO', required: true },
      { title: 'Acompanhamento de eventuais notas devolutivas', category: 'CARTORIO', required: false },
      { title: 'Retirada da Matrícula atualizada com Alienação Fiduciária', category: 'CARTORIO', required: true },
    ],
    DISBURSEMENT_COMPLETED: [
      { title: 'Envio da Matrícula registrada ao Banco Operador', category: 'BANCO', required: true },
      { title: 'Conferência de conformidade do registro pelo banco', category: 'BANCO', required: true },
      { title: 'Crédito liberado na conta do vendedor', category: 'VENDEDOR', required: true },
      { title: 'Comprovante de liberação arquivado no processo', category: 'BANCO', required: true },
    ],
    COMMISSION_PAID: [
      { title: 'Emissão da Nota Fiscal de Assessoria / Prestação', category: 'BANCO', required: true },
      { title: 'Comissão recebida na conta da Morada Crédito', category: 'BANCO', required: true },
      { title: 'Repasse de comissão ao corretor parceiro realizado', category: 'CLIENTE', required: false },
    ],
    DECLINED_CANCELLED: [
      { title: 'Motivo da recusa ou cancelamento formalizado', category: 'BANCO', required: true },
    ],
  };

  const items = checklists[stage] || [];
  return items.map((item, index) => ({
    id: `${stage}_${index}_${Date.now()}`,
    stage,
    title: item.title,
    category: item.category,
    required: item.required,
    completed: false,
  }));
}

export function getFullDefaultChecklist(): ProcessChecklistItem[] {
  const allStages: ProcessStage[] = [
    'SIMULATION_COLLECTION',
    'CREDIT_ANALYSIS',
    'PROPERTY_VALUATION',
    'LEGAL_COMPLIANCE',
    'VALUE_CONFIRMATION',
    'CONTRACT_ISSUANCE',
    'CONTRACT_SIGNATURE',
    'PROPERTY_REGISTRY',
    'DISBURSEMENT_COMPLETED',
    'COMMISSION_PAID',
  ];
  return allStages.flatMap((st) => getDefaultChecklistForStage(st));
}
