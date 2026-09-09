import React, { useEffect, useState } from 'react';
import { X, Users, ShieldCheck, Crown, UserCircle2 } from 'lucide-react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getTenantMembers, getTenant } from '../lib/firebase';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  ANALYST: 'Analista',
};

export const MembersModal: React.FC<MembersModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [tenantName, setTenantName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !user?.tenantId) return;
    const tenantId = user.tenantId;
    let active = true;
    setLoading(true);
    Promise.all([getTenantMembers(tenantId), getTenant(tenantId)])
      .then(([list, tenant]) => {
        if (!active) return;
        setMembers(list);
        setTenantName(tenant?.name || tenantId);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, user?.tenantId]);

  if (!isOpen) return null;

  const roleIcon = (role: string) =>
    role === 'OWNER' ? (
      <Crown className="w-3 h-3 text-amber-500" />
    ) : role === 'ADMIN' ? (
      <ShieldCheck className="w-3 h-3 text-emerald-600" />
    ) : (
      <UserCircle2 className="w-3 h-3 text-slate-500" />
    );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Membros da Empresa</h3>
              <p className="text-[11px] text-slate-400">{tenantName || 'Carregando...'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <p className="text-xs text-slate-500 py-6 text-center">Carregando membros...</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Nenhum membro encontrado.</p>
          ) : (
            members.map((m) => (
              <div
                key={m.uid}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(m.displayName || m.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{m.displayName || '(sem nome)'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{m.email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-700 shrink-0 flex items-center gap-1">
                  {roleIcon(m.role)}
                  {ROLE_LABEL[m.role] || m.role}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Adicionar usuários e alterar papéis é feito manualmente nesta fase. O autoatendimento chega na próxima etapa.
          </p>
        </div>
      </div>
    </div>
  );
};
