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
  getUserProfile,
} from '../lib/firebase';
import { TenantRole } from '../types';

export interface CRMUser {
  uid: string;
  email: string;
  displayName: string;
  role?: TenantRole;
  tenantId?: string;
  photoURL?: string;
  providerId?: string;
}

interface AuthContextType {
  user: CRMUser | null;
  firebaseUser: User | null;
  loading: boolean;
  pendingAccess: boolean;
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
  const [pendingAccess, setPendingAccess] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      if (currentFbUser) {
        setFirebaseUser(currentFbUser);
        const profile = await getUserProfile(currentFbUser.uid);
        if (profile) {
          setUser({
            uid: currentFbUser.uid,
            email: currentFbUser.email || profile.email,
            displayName:
              currentFbUser.displayName ||
              profile.displayName ||
              currentFbUser.email?.split('@')[0] ||
              'Usuário',
            role: profile.role,
            tenantId: profile.tenantId,
            photoURL: currentFbUser.photoURL || undefined,
            providerId: currentFbUser.providerData?.[0]?.providerId || 'password',
          });
          setPendingAccess(false);
        } else {
          setUser(null);
          setPendingAccess(true);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        setPendingAccess(false);
      }
      setLoading(false);
    });

    getRedirectResult(auth).catch((err) => {
      console.warn('Erro ao processar retorno do Google Redirect:', err);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      throw new Error('Informe o e-mail e a senha.');
    }
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
    } catch (err: any) {
      console.warn('Erro na autenticação por senha:', err);
      throw new Error('E-mail ou senha inválidos.');
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
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

  const register = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !pass) {
      throw new Error('Informe o e-mail e uma senha.');
    }
    if (pass.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (cred.user && cleanName) {
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (e) {
        console.warn('Erro ao atualizar perfil do Firebase Auth:', e);
      }
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
      throw new Error('Informe o e-mail para envio do link de redefinição.');
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
        pendingAccess,
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
