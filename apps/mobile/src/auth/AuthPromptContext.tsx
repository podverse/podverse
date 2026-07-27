import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

type AuthPromptContextValue = {
  onRequestLogin: () => void;
  onRequestSignUp: () => void;
};

const AuthPromptContext = createContext<AuthPromptContextValue | null>(null);

export function AuthPromptProvider({
  children,
  onRequestLogin,
  onRequestSignUp,
}: PropsWithChildren<AuthPromptContextValue>) {
  return (
    <AuthPromptContext.Provider value={{ onRequestLogin, onRequestSignUp }}>
      {children}
    </AuthPromptContext.Provider>
  );
}

export function useAuthPrompt(): AuthPromptContextValue {
  const value = useContext(AuthPromptContext);
  if (value === null) {
    throw new Error('useAuthPrompt must be used within AuthPromptProvider');
  }
  return value;
}
