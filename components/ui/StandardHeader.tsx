import React from 'react';
import { Home as HomeIcon, Globe } from 'lucide-react';
import { StandardHeaderProps } from '@/types';

export const StandardHeader = ({ title, subtitle, onBack, language, onToggleLanguage, children }: StandardHeaderProps) => (
    <div className="bg-slate-900 text-white p-4 rounded-b-3xl shadow-lg sticky top-0 z-50 flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700 border border-slate-600 transition-colors">
                    <HomeIcon size={20} className="text-white" />
                </button>
                <div>
                    <h1 className="text-xl font-bold">{title}</h1>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
            </div>
            {onToggleLanguage && (
                <button onClick={onToggleLanguage} className="bg-slate-800 px-3 py-2 rounded-full border border-slate-700 flex items-center gap-2 hover:bg-slate-700 transition-colors">
                    <Globe size={14} className="text-gray-300" />
                    <span className="text-xs font-bold text-gray-300">{language === 'kn' ? 'EN' : 'KN'}</span>
                </button>
            )}
        </div>
        {children}
    </div>
);
