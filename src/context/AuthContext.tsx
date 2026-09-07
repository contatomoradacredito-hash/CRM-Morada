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

interface AuthContextType {
  user: CRMUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
    // Listen directly to live Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (currentFbUser) => {
      setFirebaseUser(currentFbUser);
      if (currentFbUser) {
        const crmUser: CRMUser = {
          uid: currentFbUser.uid,
          email: currentFbUser.email || '',
          displayName:
            currentFbUser.displayName ||
            currentFbUser.email?.split('@')[0] ||
            'Administrador Morada',
          role: 'ADMIN',
          photoURL: currentFbUser.photoURL || undefined,
          providerId: currentFbUser.providerData?.[0]?.providerId || 'password',
        };
        setUser(crmUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Login using Firebase Authentication email and password
   */
  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      throw new Error('Informe o e-mail e a senha para acessar.');
    }
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    if (cred.user) {
      setFirebaseUser(cred.user);
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || cleanEmail,
        displayName:
          cred.user.displayName ||
          cred.user.email?.split('@')[0] ||
          'Administrador Morada',
        role: 'ADMIN',
        photoURL: cred.user.photoURL || undefined,
        providerId: cred.user.providerData?.[0]?.providerId || 'password',
      });
    }
  };

  /**
   * Login using Firebase Google Authentication
   */
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      setFirebaseUser(cred.user);
      setUser({
        uid: cred.user.uid,
        email: cred.user.email || '',
        displayName: cred.user.displayName || 'Administrador Morada',
        role: 'ADMIN',
        photoURL: cred.user.photoURL || undefined,
        providerId: 'google.com',
      });
    }
  };

  /**
   * Create account using Firebase Authentication
   */
  const register = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !pass) {
      throw new Error('Informe o e-mail e uma senha para cadastro.');
    }
    if (pass.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    if (cred.user) {
      if (cleanName) {
        try {
          await updateProfile(cred.user, { displayName: cleanName });
        } catch (e) {
          console.warn('Erro ao atualizar perfil do Firebase Auth:', e);
        }
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
   * Sign out from Firebase Authentication
   */
  const logout = async () => {
    await firebaseSignOut(auth);
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
      throw new Error('Nenhum usuário autenticado no Firebase.');
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
   * Send password reset email for currently logged in user
   */
  const sendPasswordResetForCurrentUser = async () => {
    const activeUser = auth.currentUser;
    if (!activeUser || !activeUser.email) {
      throw new Error('Usuário não possui e-mail cadastrado.');
    }
    await sendPasswordResetEmail(auth, activeUser.email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        loginWithGoogle,
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
