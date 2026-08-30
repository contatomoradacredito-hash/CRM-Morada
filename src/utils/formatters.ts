import { BankPartner, ClientProcess, ProcessStage } from '../types';
import { STAGE_CONFIGS } from './constants';

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00%';
  return `${value.toFixed(decimals).replace('.', ',')}%`;
}

export function formatCPF(cpf: string | undefined | null): string {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  // CNPJ
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function formatDate(isoString: string | undefined | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatDateWithTime(isoString: string | undefined | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatMonthYear(yyyyMm: string): string {
  if (!yyyyMm || !yyyyMm.includes('-')) return yyyyMm;
  const [year, month] = yyyyMm.split('-');
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const idx = parseInt(month, 10) - 1;
  return `${monthNames[idx] || month} de ${year}`;
}

export function getDaysDifference(isoDateString: string): number {
  if (!isoDateString) return 0;
  const date = new Date(isoDateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateSimulation(
  propertyValue: number,
  financingValue: number,
  termMonths: number,
  annualInterestRate: number,
  system: 'SAC' | 'PRICE'
) {
  const downPayment = Math.max(0, propertyValue - financingValue);
  const ltv = propertyValue > 0 ? (financingValue / propertyValue) * 100 : 0;
  const monthlyRate = Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1;

  let firstInstallment = 0;
  let lastInstallment = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  if (financingValue <= 0 || termMonths <= 0) {
    return {
      downPayment,
      ltv,
      firstInstallment: 0,
      lastInstallment: 0,
      totalPaid: 0,
      totalInterest: 0,
      monthlyRatePercent: monthlyRate * 100,
    };
  }

  if (system === 'SAC') {
    // Amortização constante
    const monthlyAmortization = financingValue / termMonths;
    firstInstallment = monthlyAmortization + financingValue * monthlyRate;
    lastInstallment = monthlyAmortization + monthlyAmortization * monthlyRate;
    totalInterest = ((firstInstallment + lastInstallment) / 2 - monthlyAmortization) * termMonths;
    totalPaid = financingValue + totalInterest;
  } else {
    // Tabela PRICE (Prestação constante)
    if (monthlyRate > 0) {
      firstInstallment =
        (financingValue * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);
    } else {
      firstInstallment = financingValue / termMonths;
    }
    lastInstallment = firstInstallment;
    totalPaid = firstInstallment * termMonths;
    totalInterest = totalPaid - financingValue;
  }

  return {
    downPayment,
    ltv,
    firstInstallment,
    lastInstallment,
    totalPaid,
    totalInterest,
    monthlyRatePercent: monthlyRate * 100,
  };
}

export function generateWhatsAppMessage(
  process: ClientProcess,
  target: 'CLIENTE' | 'CORRETOR' | 'VENDEDOR'
): string {
  const stageInfo = STAGE_CONFIGS[process.stage];
  const greeting = 'Olá!';
  const formattedFinancing = formatCurrency(process.financingValue);
  const bankName = process.bank;

  if (target === 'CLIENTE') {
    return `${greeting} *${process.clientName}*, aqui é da *Morada Crédito Imobiliário*! 🏡

Passando para te atualizar sobre o andamento do seu processo de financiamento no *${bankName}*:

📌 *Fase Atual:* ${stageInfo.label}
📝 *Status:* ${stageInfo.description}
💰 *Valor Financiado:* ${formattedFinancing}
${process.rgiProtocolNumber ? `📜 *Protocolo RGI:* ${process.rgiProtocolNumber}\n` : ''}${process.hasPendingIssues && process.pendingIssueDescription ? `⚠️ *Atenção:* ${process.pendingIssueDescription}\n` : ''}
Qualquer dúvida estamos à inteira disposição para acelerar a sua conquista!

*Morada Crédito Imobiliário* — Assessoria Especializada`;
  }

  if (target === 'CORRETOR') {
    return `${greeting} *${process.partnerRealtorName || 'Parceiro'}*, atualização de processo da *Morada Crédito Imobiliário* 📈

👤 *Cliente:* ${process.clientName}
🏦 *Banco Operador:* ${bankName}
💰 *Valor Financiamento:* ${formattedFinancing}
📍 *Etapa Atual:* ${stageInfo.label}
📅 *Previsão de Emissão:* ${formatMonthYear(process.estimatedIssuanceMonth)}
${process.rgiProtocolNumber ? `📜 *Prenotação RGI:* ${process.rgiProtocolNumber}\n` : ''}
Seguimos acompanhando de perto para a liberação rápida dos recursos e fechamento do negócio!`;
  }

  // Vendedor
  return `${greeting} Atualização de status da venda do imóvel com financiamento imobiliário via *Morada Crédito Imobiliário*:

👤 *Comprador:* ${process.clientName}
🏦 *Banco Concessor:* ${bankName}
📍 *Etapa Atual:* ${stageInfo.label}
ℹ️ *Próximo Passo:* ${stageInfo.description}
${process.estimatedDisbursementDate ? `📆 *Previsão de Liberação de Recursos:* ${formatDate(process.estimatedDisbursementDate)}\n` : ''}
Estamos à disposição para qualquer esclarecimento.`;
}
