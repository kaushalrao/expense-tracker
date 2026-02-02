import React from 'react';
import { TabNavProps } from '@/types';

export const TabNav = ({ tabs, activeTab, onTabChange }: TabNavProps) => (
    <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-slate-800 text-white shadow' : 'text-gray-500'}`}
            >
                {tab.label}
            </button>
        ))}
    </div>
);
