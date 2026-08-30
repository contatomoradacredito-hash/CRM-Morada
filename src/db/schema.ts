import {
  pgTable,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * Users / Assessores / Administradores
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: varchar('uid', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('ASSESSOR').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Client Processes (Financiamento Imobiliário & Crédito com Garantia)
 */
export const clientProcesses = pgTable('client_processes', {
  id: varchar('id', { length: 64 }).primaryKey(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientCpf: varchar('client_cpf', { length: 32 }).notNull(),
  clientPhone: varchar('client_phone', { length: 32 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  spouseName: varchar('spouse_name', { length: 255 }),
  spouseCpf: varchar('spouse_cpf', { length: 32 }),

  // Operação Financeira
  creditType: varchar('credit_type', { length: 64 }).notNull(),
  propertyValue: numeric('property_value', { precision: 14, scale: 2 }).notNull(),
  financingValue: numeric('financing_value', { precision: 14, scale: 2 }).notNull(),
  downPaymentValue: numeric('down_payment_value', { precision: 14, scale: 2 }).default('0'),
  amortizationSystem: varchar('amortization_system', { length: 16 }).default('SAC').notNull(),
  interestRateAnnual: numeric('interest_rate_annual', { precision: 6, scale: 2 }).notNull(),
  termMonths: integer('term_months').notNull(),

  // Banco & Proposta
  bank: varchar('bank', { length: 100 }).notNull(),
  otherApprovedBanks: jsonb('other_approved_banks').$type<string[]>(),
  proposalNumber: varchar('proposal_number', { length: 100 }),
  agency: varchar('agency', { length: 50 }),
  bankManagerName: varchar('bank_manager_name', { length: 150 }),
  bankManagerContact: varchar('bank_manager_contact', { length: 100 }),

  // Assessoria & Comissões
  commissionPercentage: numeric('commission_percentage', { precision: 5, scale: 2 }).notNull(),
  commissionAmount: numeric('commission_amount', { precision: 14, scale: 2 }).notNull(),
  commissionStatus: varchar('commission_status', { length: 50 }).default('PREVISTA').notNull(),
  commissionPaidAt: timestamp('commission_paid_at'),

  // Parceria Imobiliária / Corretor
  partnerRealtorName: varchar('partner_realtor_name', { length: 150 }),
  partnerRealtorPhone: varchar('partner_realtor_phone', { length: 50 }),
  partnerRealtorCommissionPct: numeric('partner_realtor_commission_pct', { precision: 5, scale: 2 }),

  // Previsões e Datas
  estimatedIssuanceMonth: varchar('estimated_issuance_month', { length: 10 }).notNull(), // ex: 2026-09
  estimatedIssuanceDate: varchar('estimated_issuance_date', { length: 30 }),
  estimatedDisbursementDate: varchar('estimated_disbursement_date', { length: 30 }),

  // Imóvel & Cartório
  propertyAddress: text('property_address'),
  propertyCity: varchar('property_city', { length: 100 }).notNull(),
  propertyState: varchar('property_state', { length: 10 }).notNull(),
  registryOfficeName: varchar('registry_office_name', { length: 150 }),
  rgiProtocolNumber: varchar('rgi_protocol_number', { length: 100 }),
  itbiGuideNumber: varchar('itbi_guide_number', { length: 100 }),

  // Fluxo de Etapas & Prioridade
  stage: varchar('stage', { length: 64 }).notNull(),
  stageUpdatedAt: timestamp('stage_updated_at').defaultNow().notNull(),
  priority: varchar('priority', { length: 20 }).default('NORMAL').notNull(),

  // Detalhes & Rastreabilidade
  notes: jsonb('notes').default([]).notNull(),
  checklist: jsonb('checklist').default([]).notNull(),
  stageHistory: jsonb('stage_history').default([]).notNull(),

  // Pendências
  hasPendingIssues: boolean('has_pending_issues').default(false),
  pendingIssueDescription: text('pending_issue_description'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Bank Commission Rules & Benchmarks
 */
export const bankRules = pgTable('bank_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  bankName: varchar('bank_name', { length: 100 }).notNull().unique(),
  defaultCommissionPct: numeric('default_commission_pct', { precision: 5, scale: 2 }).notNull(),
  homeEquityCommissionPct: numeric('home_equity_commission_pct', { precision: 5, scale: 2 }).notNull(),
  averageApprovalDays: integer('average_approval_days').default(3).notNull(),
  averageContractDays: integer('average_contract_days').default(18).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
