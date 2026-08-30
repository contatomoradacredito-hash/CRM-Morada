import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from '../lib/firebase';

export interface CRMUser {
  uid: string;
  email: string;
  displayName: string;
  role?: string;
}

interface StoredUserAccount {
  uid: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
}

interface AuthContextType {
  user: CRMUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginAsDemo: () => Promise<void>;
}

const SESSION_STORAGE_KEY = 'morada_crm_auth_session_v1';
const USERS_DB_KEY = 'morada_crm_registered_users_v1';

// Default Admin account for Morada Crédito
const DEFAULT_DEMO_USER: StoredUserAccount = {
  uid: 'morada_admin_demo_01',
  email: 'contato@moradacredito.com.br',
  passwordHash: 'Morada@2026',
  displayName: 'Diretoria Morada Crédito',
  createdAt: new Date().toISOString(),
};

function getStoredUsers(): StoredUserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      const initial = [DEFAULT_DEMO_USER];
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Ensure default demo exists
      if (!parsed.some((u) => u.email.toLowerCase() === DEFAULT_DEMO_USER.email.toLowerCase())) {
        parsed.unshift(DEFAULT_DEMO_USER);
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
    return [DEFAULT_DEMO_USER];
  } catch {
    return [DEFAULT_DEMO_USER];
  }
}

function saveStoredUsers(users: StoredUserAccount[]) {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving stored users:', e);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CRMUser | null>(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase Auth state if active
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const crmUser: CRMUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'usuario@moradacredito.com.br',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário CRM',
        };
        setUser(crmUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(crmUser));
      }
      setLoading(false);
    });

    // Check existing local session
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {}

    setLoading(false);
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Try Firebase Authentication first
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      if (cred.user) {
        const crmUser: CRMUser = {
          uid: cred.user.uid,
          email: cred.user.email || cleanEmail,
          displayName: cred.user.displayName || cleanEmail.split('@')[0],
        };
        setUser(crmUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(crmUser));
        return;
      }
    } catch (fbError: any) {
      console.warn('Firebase login attempt fallback to local auth:', fbError.code || fbError.message);
      
      // If error is wrong password or user not found, check local database
      const users = getStoredUsers();
      const match = users.find((u) => u.email.toLowerCase() === cleanEmail);

      if (match) {
        if (match.passwordHash === pass) {
          const crmUser: CRMUser = {
            uid: match.uid,
            email: match.email,
            displayName: match.displayName,
          };
          setUser(crmUser);
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(crmUser));
          return;
        } else {
          throw new Error('Senha incorreta para o e-mail informado.');
        }
      }

      // If neither Firebase nor local user matches
      if (fbError.code === 'auth/wrong-password' || fbError.code === 'auth/invalid-credential') {
        throw new Error('Senha incorreta. Verifique suas credenciais.');
      } else if (fbError.code === 'auth/user-not-found') {
        throw new Error('Usuário não cadastrado. Crie uma conta na aba "Criar Conta".');
      } else {
        throw new Error('E-mail ou senha não conferem com nenhum cadastro no CRM.');
      }
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    // Try Firebase registration first
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (userCredential.user) {
        if (cleanName) {
          try {
            await updateProfile(userCredential.user, { displayName: cleanName });
          } catch {}
        }
        const crmUser: CRMUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || cleanEmail,
          displayName: cleanName,
        };
        setUser(crmUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(crmUser));

        // Save copy to local registry as backup
        const users = getStoredUsers().filter((u) => u.email.toLowerCase() !== cleanEmail);
        users.push({
          uid: userCredential.user.uid,
          email: cleanEmail,
          passwordHash: pass,
          displayName: cleanName,
          createdAt: new Date().toISOString(),
        });
        saveStoredUsers(users);
        return;
      }
    } catch (fbError: any) {
      console.warn('Firebase register attempt fallback to local auth:', fbError.code || fbError.message);

      // Handle local registration
      const users = getStoredUsers();
      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (existing) {
        throw new Error('Este e-mail já está cadastrado. Faça login ou recupere sua senha.');
      }

      const newUid = `crm_user_${Date.now()}`;
      const newUser: StoredUserAccount = {
        uid: newUid,
        email: cleanEmail,
        passwordHash: pass,
        displayName: cleanName,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      saveStoredUsers(users);

      const crmUser: CRMUser = {
        uid: newUid,
        email: cleanEmail,
        displayName: cleanName,
      };
      setUser(crmUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(crmUser));
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {}
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (fbError) {
      // Check if user exists in local database
      const users = getStoredUsers();
      const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
      if (!exists) {
        throw new Error('E-mail não encontrado na base de usuários.');
      }
    }
  };

  const loginAsDemo = async () => {
    const demoEmail = DEFAULT_DEMO_USER.email;
    const demoPass = DEFAULT_DEMO_USER.passwordHash;

    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
    } catch {
      // Immediate local login as Morada Crédito administrator
      const crmUser: CRMUser = {
        uid: DEFAULT_DEMO_USER.uid,
        email: DEFAULT_DEMO_USER.email,
        displayName: DEFAULT_DEMO_USER.displayName,
        role: 'ADMIN',
      };
      setUser(crmUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(crmUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        resetPassword,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
