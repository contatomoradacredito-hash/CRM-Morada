import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  User,
} from '../lib/firebase';

export interface CRMUser {
  uid: string;
  email: string;
  displayName: string;
  role?: string;
  photoURL?: string;
  providerId?: string;
}

// Pre-defined authorized CRM administrators
export const AUTHORIZED_ADMIN_EMAILS = [
  'lima@moradacredito.com',
  'deiglisonlima@gmail.com',
];

export const PRIMARY_ADMIN_EMAIL = 'lima@moradacredito.com';
export const SECONDARY_ADMIN_EMAIL = 'deiglisonlima@gmail.com';

export function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some((adm) => adm.toLowerCase() === clean);
}

interface AuthContextType {
  user: CRMUser | null;
  firebaseUser: User | null;
  loading: boolean;
  authorizedEmails: string[];
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGoogleRedirect: () => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendPasswordResetForCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CRMUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen directly to live Firebase Auth state and verify administrator authorization
    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      if (currentFbUser) {
        const userEmail = currentFbUser.email?.toLowerCase() || '';
        
        // Strict guard: verify user belongs to pre-defined CRM Administrator accounts
        if (!isAuthorizedAdmin(userEmail)) {
          console.warn(`Tentativa de acesso com e-mail não autorizado: ${userEmail}`);
          await firebaseSignOut(auth);
          setUser(null);
          setFirebaseUser(null);
          setLoading(false);
          return;
        }

        setFirebaseUser(currentFbUser);
        const crmUser: CRMUser = {
          uid: currentFbUser.uid,
          email: currentFbUser.email || '',
          displayName:
            currentFbUser.displayName ||
            (userEmail.includes('lima') ? 'Deiglison Lima' : 'Administrador Morada'),
          role: 'ADMIN',
          photoURL: currentFbUser.photoURL || undefined,
          providerId: currentFbUser.providerData?.[0]?.providerId || 'password',
        };
        setUser(crmUser);
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setLoading(false);
    });

    // Check if user is returning from a Google signInWithRedirect
    getRedirectResult(auth)
      .then((cred) => {
        if (cred && cred.user) {
          const userEmail = cred.user.email?.toLowerCase() || '';
          if (!isAuthorizedAdmin(userEmail)) {
            firebaseSignOut(auth);
            return;
          }
          setFirebaseUser(cred.user);
          setUser({
            uid: cred.user.uid,
            email: cred.user.email || userEmail,
            displayName: cred.user.displayName || 'Deiglison Lima',
            role: 'ADMIN',
            photoURL: cred.user.photoURL || undefined,
            providerId: 'google.com',
          });
        }
      })
      .catch((err) => {
        console.warn('Erro ao processar retorno do Google Redirect:', err);
      });

    return () => unsubscribe();
  }, []);

  /**
   * Login using Administrator credentials or Firebase Authentication.
   * Only pre-defined CRM Administrators are allowed.
   */
  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      throw new Error('Informe o e-mail e a senha de administrador.');
    }

    // Pre-check authorization before attempt
    if (!isAuthorizedAdmin(cleanEmail)) {
      throw new Error(
        'Acesso restrito. Este sistema é de uso exclusivo do Administrador Morada Crédito.'
      );
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      if (cred.user) {
        const userEmail = cred.user.email?.toLowerCase() || '';
        if (!isAuthorizedAdmin(userEmail)) {
          await firebaseSignOut(auth);
          throw new Error('Acesso restrito. O e-mail autenticado não possui privilégios de Administrador.');
        }

        setFirebaseUser(cred.user);
        setUser({
          uid: cred.user.uid,
          email: cred.user.email || cleanEmail,
          displayName: cred.user.displayName || 'Deiglison Lima',
          role: 'ADMIN',
          photoURL: cred.user.photoURL || undefined,
          providerId: cred.user.providerData?.[0]?.providerId || 'password',
        });
      }
    } catch (err: any) {
      if (err?.message?.startsWith('Acesso restrito')) throw err;
      console.warn('Erro na autenticação por senha:', err);
      throw new Error('E-mail ou senha de administrador inválidos.');
    }
  };

  /**
   * Login using Firebase Google Authentication.
   * Only pre-defined CRM Administrators are allowed.
   */
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      const userEmail = cred.user.email?.toLowerCase() || '';
      if (!isAuthorizedAdmin(userEmail)) {
        await firebaseSignOut(auth);
        throw new Error(
          `Acesso restrito. A conta Google (${userEmail}) não é o Administrador autorizado do CRM Morada Crédito.`
        );
      }

      setFirebaseUser(cred.user);
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || userEmail,
        displayName: cred.user.displayName || 'Deiglison Lima',
        role: 'ADMIN',
        photoURL: cred.user.photoURL || undefined,
        providerId: 'google.com',
      });
    }
  };

  /**
   * Login using Firebase Google Authentication via full page redirect.
   * Useful when popups are blocked by the browser or when running inside an iframe.
   */
  const loginWithGoogleRedirect = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithRedirect(auth, provider);
  };

  /**
   * Initial administrator setup in Firebase Authentication (restricted to authorized admin emails)
   */
  const register = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || 'Deiglison Lima';

    if (!cleanEmail || !pass) {
      throw new Error('Informe o e-mail e uma senha para cadastro inicial do administrador.');
    }
    if (!isAuthorizedAdmin(cleanEmail)) {
      throw new Error('Apenas os e-mails pré-definidos do Administrador podem ser cadastrados no CRM.');
    }
    if (pass.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (cred.user) {
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (e) {
        console.warn('Erro ao atualizar perfil do Firebase Auth:', e);
      }

      setFirebaseUser(cred.user);
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || cleanEmail,
        displayName: cleanName,
        role: 'ADMIN',
        photoURL: cred.user.photoURL || undefined,
        providerId: 'password',
      });
    }
  };

  /**
   * Sign out from Firebase Authentication and clear local session
   */
  const logout = async () => {
    try {
      localStorage.removeItem('morada_admin_session');
    } catch {
      // ignore
    }
    await firebaseSignOut(auth).catch(() => {});
    setUser(null);
    setFirebaseUser(null);
  };

  /**
   * Send password reset email via Firebase Authentication
   */
  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Informe o e-mail do administrador para envio do link de redefinição.');
    }
    if (!isAuthorizedAdmin(cleanEmail)) {
      throw new Error('O e-mail informado não pertence ao Administrador do CRM.');
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  /**
   * Change current user's password directly in Firebase Authentication
   */
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const activeUser = auth.currentUser;
    if (!activeUser) {
      throw new Error('Nenhum usuário administrador autenticado no Firebase.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('A nova senha deve conter pelo menos 6 caracteres.');
    }

    // If current password provided and user has email, reauthenticate first
    if (currentPassword && activeUser.email) {
      try {
        const credential = EmailAuthProvider.credential(activeUser.email, currentPassword);
        await reauthenticateWithCredential(activeUser, credential);
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/wrong-password' ||
          authErr.code === 'auth/invalid-credential'
        ) {
          throw new Error('A senha atual digitada está incorreta.');
        }
        throw authErr;
      }
    }

    // Update password in Firebase Auth
    await updatePassword(activeUser, newPassword);
  };

  /**
   * Send password reset email for currently logged in administrator
   */
  const sendPasswordResetForCurrentUser = async () => {
    const activeUser = auth.currentUser;
    if (!activeUser || !activeUser.email) {
      throw new Error('Administrador não possui e-mail cadastrado.');
    }
    await sendPasswordResetEmail(auth, activeUser.email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        authorizedEmails: AUTHORIZED_ADMIN_EMAILS,
        login,
        loginWithGoogle,
        loginWithGoogleRedirect,
        register,
        logout,
        resetPassword,
        changePassword,
        sendPasswordResetForCurrentUser,
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
