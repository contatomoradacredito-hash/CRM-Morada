import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Copy,
  CheckCircle2,
  User,
  Building,
  Phone,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ClientProcess } from '../types';
import { STAGE_CONFIGS } from '../utils/constants';
import { formatCurrency, formatMonthYear, generateWhatsAppMessage } from '../utils/formatters';

interface WhatsAppMessengerProps {
  processes: ClientProcess[];
  initialSelectedProcess?: ClientProcess;
}

export const WhatsAppMessenger: React.FC<WhatsAppMessengerProps> = ({
  processes,
  initialSelectedProcess,
}) => {
  const [selectedProcessId, setSelectedProcessId] = useState<string>(
    initialSelectedProcess?.id || processes[0]?.id || ''
  );
  const [recipientType, setRecipientType] = useState<'CLIENTE' | 'CORRETOR' | 'VENDEDOR'>('CLIENTE');
  const [customText, setCustomText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const selectedProcess = processes.find((p) => p.id === selectedProcessId) || processes[0];

  // Generate message based on selected process & recipient
  const messageText = customText || (selectedProcess ? generateWhatsAppMessage(selectedProcess, recipientType) : '');

  const handleProcessChange = (procId: string) => {
    setSelectedProcessId(procId);
    setCustomText('');
  };

  const handleRecipientChange = (type: 'CLIENTE' | 'CORRETOR' | 'VENDEDOR') => {
    setRecipientType(type);
    setCustomText('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    let targetPhone = '';
    if (recipientType === 'CLIENTE') {
      targetPhone = selectedProcess?.clientPhone || '';
    } else if (recipientType === 'CORRETOR') {
      targetPhone = selectedProcess?.partnerRealtorPhone || '';
    }
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const phoneParam = cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : '';
    const encoded = encodeURIComponent(messageText);
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-600" />
            <span>Central de Mensagens WhatsApp & Atualizações de Status</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mantenha clientes, corretores parceiros e vendedores informados em cada etapa do financiamento com textos formatados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Process & Recipient Selection (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <span>1. Selecione o Processo</span>
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cliente / Processo Ativo
            </label>
            <select
              id="select-whatsapp-process"
              value={selectedProcessId}
              onChange={(e) => handleProcessChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              {processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.clientName} - {p.bank} ({STAGE_CONFIGS[p.stage]?.shortLabel})
                </option>
              ))}
            </select>
          </div>

          {selectedProcess && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">Banco Operador:</span>
                <span className="font-bold">{selectedProcess.bank}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">Fase Atual:</span>
                <span className="font-bold text-emerald-700">{STAGE_CONFIGS[selectedProcess.stage]?.label}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-400">Financiamento:</span>
                <span className="font-bold">{formatCurrency(selectedProcess.financingValue)}</span>
              </div>
              {selectedProcess.partnerRealtorName && (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400">Corretor Parceiro:</span>
                  <span className="font-medium">{selectedProcess.partnerRealtorName}</span>
                </div>
              )}
            </div>
          )}

          {/* Recipient Selection */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              2. Destinatário da Mensagem
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRecipientChange('CLIENTE')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  recipientType === 'CLIENTE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Comprador</span>
                <span className="text-[10px] font-normal opacity-80">(Cliente)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRecipientChange('CORRETOR')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  recipientType === 'CORRETOR'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Corretor</span>
                <span className="text-[10px] font-normal opacity-80">(Parceiro)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRecipientChange('VENDEDOR')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                  recipientType === 'VENDEDOR'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Vendedor</span>
                <span className="text-[10px] font-normal opacity-80">(Imóvel)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Message Preview & Dispatch (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>3. Pré-visualização da Mensagem</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Pode editar o texto abaixo
              </span>
            </div>

            {/* Editable Textarea for Message */}
            <textarea
              id="textarea-whatsapp-message"
              rows={11}
              value={messageText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 font-mono leading-relaxed focus:outline-none focus:border-emerald-500 focus:bg-white resize-y"
              placeholder="Digite ou personalize a mensagem para o WhatsApp..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              id="btn-whatsapp-copy"
              onClick={handleCopy}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Mensagem</span>
                </>
              )}
            </button>

            <button
              id="btn-whatsapp-send-direct"
              onClick={handleOpenWhatsApp}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-emerald-900/30 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
