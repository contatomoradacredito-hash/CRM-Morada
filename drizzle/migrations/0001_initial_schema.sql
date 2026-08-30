-- Migration: 0001_initial_schema.sql
-- Morada Crédito Imobiliário - Database Schema (PostgreSQL / Supabase / Cloud SQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: users (Assessores, Gestores e Administradores)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid VARCHAR(128) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'ASSESSOR' NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: client_processes (Processos de Financiamento e Home Equity)
CREATE TABLE IF NOT EXISTS client_processes (
  id VARCHAR(64) PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  client_cpf VARCHAR(32) NOT NULL,
  client_phone VARCHAR(32) NOT NULL,
  client_email VARCHAR(255),
  spouse_name VARCHAR(255),
  spouse_cpf VARCHAR(32),

  -- Operação Financeira
  credit_type VARCHAR(64) NOT NULL,
  property_value NUMERIC(14, 2) NOT NULL,
  financing_value NUMERIC(14, 2) NOT NULL,
  down_payment_value NUMERIC(14, 2) DEFAULT 0,
  amortization_system VARCHAR(16) DEFAULT 'SAC' NOT NULL,
  interest_rate_annual NUMERIC(6, 2) NOT NULL,
  term_months INTEGER NOT NULL,

  -- Banco & Proposta
  bank VARCHAR(100) NOT NULL,
  other_approved_banks JSONB DEFAULT '[]'::jsonb,
  proposal_number VARCHAR(100),
  agency VARCHAR(50),
  bank_manager_name VARCHAR(150),
  bank_manager_contact VARCHAR(100),

  -- Assessoria & Comissões
  commission_percentage NUMERIC(5, 2) NOT NULL,
  commission_amount NUMERIC(14, 2) NOT NULL,
  commission_status VARCHAR(50) DEFAULT 'PREVISTA' NOT NULL,
  commission_paid_at TIMESTAMP,

  -- Parceria Imobiliária / Corretor
  partner_realtor_name VARCHAR(150),
  partner_realtor_phone VARCHAR(50),
  partner_realtor_commission_pct NUMERIC(5, 2),

  -- Previsões e Datas
  estimated_issuance_month VARCHAR(10) NOT NULL,
  estimated_issuance_date VARCHAR(30),
  estimated_disbursement_date VARCHAR(30),

  -- Imóvel & Cartório
  property_address TEXT,
  property_city VARCHAR(100) NOT NULL,
  property_state VARCHAR(10) NOT NULL,
  registry_office_name VARCHAR(150),
  rgi_protocol_number VARCHAR(100),
  itbi_guide_number VARCHAR(100),

  -- Fluxo de Etapas & Prioridade
  stage VARCHAR(64) NOT NULL,
  stage_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  priority VARCHAR(20) DEFAULT 'NORMAL' NOT NULL,

  -- Detalhes & Rastreabilidade (JSONB)
  notes JSONB DEFAULT '[]'::jsonb NOT NULL,
  checklist JSONB DEFAULT '[]'::jsonb NOT NULL,
  stage_history JSONB DEFAULT '[]'::jsonb NOT NULL,

  -- Pendências
  has_pending_issues BOOLEAN DEFAULT FALSE,
  pending_issue_description TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Table: bank_rules (Parâmetros e comissões por instituição financeira)
CREATE TABLE IF NOT EXISTS bank_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(100) NOT NULL UNIQUE,
  default_commission_pct NUMERIC(5, 2) NOT NULL,
  home_equity_commission_pct NUMERIC(5, 2) NOT NULL,
  average_approval_days INTEGER DEFAULT 3 NOT NULL,
  average_contract_days INTEGER DEFAULT 18 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processes_stage ON client_processes(stage);
CREATE INDEX IF NOT EXISTS idx_processes_bank ON client_processes(bank);
CREATE INDEX IF NOT EXISTS idx_processes_month ON client_processes(estimated_issuance_month);
CREATE INDEX IF NOT EXISTS idx_processes_client_cpf ON client_processes(client_cpf);
