"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut, signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Language } from "@/types";

declare const __initial_auth_token: string | undefined;

interface AuthContextType {
    user: User | null;
    loginId: string;
    loading: boolean;
    language: Language;
    toggleLanguage: () => void;
    logout: () => void;
    setLanguage: (lang: Language) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loginId: "",
    loading: true,
    language: "kn",
    toggleLanguage: () => { },
    logout: () => { },
    setLanguage: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loginId, setLoginId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [language, setLanguageState] = useState<Language>("kn");

    useEffect(() => {
        // Initial Auth Token Logic
        const initAuth = async () => {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                }
            } catch (error) {
                console.error("Auth Error:", error);
            }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const safeId = currentUser.email ? currentUser.email.replace(/[^a-zA-Z0-9]/g, '_') : (currentUser.uid || 'anonymous');
                setLoginId(safeId);
            } else {
                setLoginId("");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedLang = localStorage.getItem('farm_app_language') as Language;
            if (storedLang === 'kn' || storedLang === 'en') {
                setLanguageState(storedLang);
            } else {
                setLanguageState('en'); // Default fallback
            }
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('farm_app_language', lang);
    }

    const toggleLanguage = () => {
        const newLang = language === 'kn' ? 'en' : 'kn';
        setLanguage(newLang);
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loginId, loading, language, toggleLanguage, logout, setLanguage }}>
            {children}
        </AuthContext.Provider>
    );
};
