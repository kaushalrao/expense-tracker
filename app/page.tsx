"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Leaf, UserCheck, Key, Mail, LogOut, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { MAIN_TRANSLATIONS } from "@/lib/translations";
import { DashboardTile } from "@/components/ui/DashboardTile";
import { BeforeInstallPromptEvent } from "@/types";

export default function FarmVoiceApp() {
  const router = useRouter();
  const { user, loginId, loading, language, toggleLanguage, logout } = useAuth();
  const t = MAIN_TRANSLATIONS[language];

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // @ts-ignore
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    // @ts-ignore
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    // @ts-ignore
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(t.authError);
    }
  };

  const menuItems = [
    {
      title: t.dashboard_Expenses,
      subtitle: t.appTitle,
      icon: <Book />,
      gradient: "from-emerald-400 to-green-600",
      iconColorClass: "text-emerald-800/20",
      path: '/expenses'
    },
    {
      title: t.dashboard_Plantation,
      subtitle: t.plantationPlaceholder,
      icon: <Leaf />,
      gradient: "from-amber-400 to-orange-600",
      iconColorClass: "text-amber-900/20",
      path: '/plantation'
    },
    {
      title: t.dashboard_StayManager,
      subtitle: t.stayManagerPlaceholder,
      icon: <UserCheck />,
      gradient: "from-blue-400 to-indigo-600",
      iconColorClass: "text-blue-900/20",
      path: '/stay-manager'
    }
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0f172a]"><Loader2 className="animate-spin text-white" size={48} /><p className="text-white ml-2">{t.loadingData}</p></div>;
  }

  // Not Logged In
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#0f172a] font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-green-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[100px]"></div>

        <div className="w-full max-w-md bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl relative z-10 animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t.appTitle}</h1>
            <p className="text-blue-200 font-medium">{isSignUp ? t.signUp : t.loginPrompt}</p>
          </div>

          {authError && <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-xl text-xs mb-6 font-bold">{authError}</div>}

          <form onSubmit={handleAuthAction} className="space-y-4">
            <div className="text-left group">
              <label className="text-xs font-bold text-gray-400 ml-1 block mb-2 uppercase tracking-wider">{t.emailLabel}</label>
              <div className="flex items-center bg-black/20 border border-white/10 rounded-xl p-3 focus-within:border-green-500/50 focus-within:bg-black/30 transition-all">
                <Mail size={18} className="text-gray-400 mr-3 group-focus-within:text-green-400 transition-colors" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="w-full bg-transparent outline-none text-white font-medium placeholder:text-gray-600" autoFocus required />
              </div>
            </div>
            <div className="text-left group">
              <label className="text-xs font-bold text-gray-400 ml-1 block mb-2 uppercase tracking-wider">{t.passwordLabel}</label>
              <div className="flex items-center bg-black/20 border border-white/10 rounded-xl p-3 focus-within:border-green-500/50 focus-within:bg-black/30 transition-all">
                <Key size={18} className="text-gray-400 mr-3 group-focus-within:text-green-400 transition-colors" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-transparent outline-none text-white font-medium placeholder:text-gray-600" required minLength={6} />
              </div>
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4">{isSignUp ? t.signUp : t.loginButton}</button>
          </form>
          <p className="text-xs text-gray-400 mt-8 font-medium">{isSignUp ? t.hasAccount : t.noAccount} <button onClick={() => setIsSignUp(!isSignUp)} className="text-green-400 font-bold hover:text-green-300 ml-1 underline decoration-2 underline-offset-2">{isSignUp ? t.signIn : t.signUp}</button></p>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-[#0f172a] font-sans p-6 flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-600/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex justify-between items-center mb-8 z-10">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-white tracking-tight">{t.dashboard_Welcome}</h1>
          <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mt-1 opacity-80">{loginId}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleLanguage} className="bg-white/10 backdrop-blur-md p-3 rounded-2xl shadow-lg text-white font-bold text-xs border border-white/10 hover:bg-white/20 transition-all">
            {language === 'kn' ? 'EN' : 'KN'}
          </button>
          <button onClick={logout} className="bg-red-500/10 backdrop-blur-md p-3 rounded-2xl shadow-lg text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <h2 className="text-sm font-bold text-gray-400 mb-6 uppercase tracking-wider z-10 ml-1">{t.dashboard_SelectOption}</h2>

      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 content-start z-10 pb-20">
        {menuItems.map(item => (
          <DashboardTile
            key={item.path}
            title={item.title}
            subtitle={item.subtitle}
            icon={item.icon}
            gradient={item.gradient}
            iconColorClass={item.iconColorClass}
            onClick={() => router.push(item.path)}
          />
        ))}
      </div>

      <div className="mt-auto pt-6 text-center z-10">
        <p className="text-xs font-bold text-gray-600 tracking-widest uppercase">Farm Manager</p>
      </div>
    </div>
  );
}