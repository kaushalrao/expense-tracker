import React from 'react';
import { DashboardTileProps } from '@/types';

export const DashboardTile = ({ title, subtitle, icon, gradient, iconColorClass, onClick }: DashboardTileProps) => (
    <button onClick={onClick} className={`relative p-5 rounded-[2rem] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all group aspect-square flex flex-col justify-between overflow-hidden bg-gradient-to-br ${gradient}`}>
        {/* Decorative Background Icon */}
        <div className={`absolute -bottom-4 -right-4 ${iconColorClass} opacity-20 group-hover:scale-110 transition-transform duration-500`}>
            {React.cloneElement(icon as React.ReactElement, { size: 120 })}
        </div>
        {/* Abstract Shine */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

        <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-lg relative z-10">
            {React.cloneElement(icon as React.ReactElement, { size: 24 })}
        </div>
        <div className="text-left relative z-10">
            <h3 className="text-lg font-bold text-white leading-tight mb-1 drop-shadow-md">{title}</h3>
            <p className="text-[10px] text-white font-bold opacity-80 uppercase tracking-wider line-clamp-1">{subtitle}</p>
        </div>
    </button>
);
