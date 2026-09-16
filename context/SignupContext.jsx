import React, { createContext, useContext, useMemo, useState } from "react";

const SignupContext = createContext(null);

const initialSignup = {
  email: "",
  code: "",
  verificationToken: "", // 서버에서 주는 토큰이 있으면 저장
  password: "",
  profile: {
    displayName: "", // public display name — the only name other members see
    firstName: "", // legal name: identity verification only
    lastName: "",
    dob: "", // "YYYY-MM-DD" 같은 문자열 추천
  },
};

export function SignupProvider({ children }) {
  const [signup, setSignup] = useState(initialSignup);

  // 필드별 업데이트 helper들 (screen에서 쓰기 편함)
  const actions = useMemo(() => {
    return {
      setEmail: (email) =>
        setSignup((prev) => ({ ...prev, email })),

      setCode: (code) =>
        setSignup((prev) => ({ ...prev, code })),

      setVerificationToken: (verificationToken) =>
        setSignup((prev) => ({ ...prev, verificationToken })),

      setPassword: (password) =>
        setSignup((prev) => ({ ...prev, password })),

      setProfile: (patch) =>
        setSignup((prev) => ({
          ...prev,
          profile: { ...prev.profile, ...patch },
        })),

      resetSignup: () => setSignup(initialSignup),
    };
  }, []);

  const value = useMemo(() => ({ signup, ...actions }), [signup, actions]);

  return (
    <SignupContext.Provider value={value}>
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error("useSignup must be used within SignupProvider");
  return ctx;
}
