import React from 'react';
import { Firestore } from "firebase/firestore";

// --- Interfaces ---
export interface Expense {
    id?: string;
    property: string;
    amount: number;
    category: string;
    note: string;
    date: string;
    createdAt: number;
}

export interface PlantationRecord {
    id?: string;
    type: 'Expense' | 'Income';
    activity: string; // e.g. Pruning, Harvesting
    date: string;
    amount: number;
    durationDays?: number;
    peopleCount?: number;
    wagePerPerson?: number;
    note?: string;
    createdAt: number;
}

export interface Category {
    id: string;
    label: string;
    color: string;
    icon?: React.ReactNode;
    createdAt?: number;
}

export interface Worker {
    id: string;
    name: string;
    joinedAt: string;
}

export interface DailyRecord {
    id?: string;
    workerId: string;
    workerName: string;
    date: string;
    base: number;
    extra: number;
    total: number;
    createdAt: number;
}

export interface Payment {
    id?: string;
    workerId: string;
    workerName: string;
    date: string;
    amount: number;
    note: string;
    createdAt: number;
}

export interface DailyEntry {
    base?: number;
    extra?: number;
}

export interface BeforeInstallPromptEvent extends Event {
    prompt: () => void;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface StandardHeaderProps {
    title: string;
    subtitle?: string;
    onBack: () => void;
    language?: 'kn' | 'en';
    onToggleLanguage?: () => void;
    children?: React.ReactNode;
    rightActions?: React.ReactNode;
}

export interface DashboardTileProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    gradient: string;
    iconColorClass: string;
    onClick: () => void;
}

export interface TabNavProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onTabChange: (id: any) => void;
}

export interface StayManagerProps {
    db: Firestore;
    appId: string;
    loginId: string;
    onBack: () => void;
    language: 'kn' | 'en';
    onToggleLanguage: () => void;
}

export interface PlantationManagerProps {
    db: Firestore;
    appId: string;
    loginId: string;
    onBack: () => void;
    language: 'kn' | 'en';
    onToggleLanguage: () => void;
}

export interface ExpenseDiaryProps {
    db: Firestore;
    appId: string;
    loginId: string;
    onBack: () => void;
    language: 'kn' | 'en';
    onToggleLanguage: () => void;
    handleLogout: () => void;
    onDeferredPrompt: BeforeInstallPromptEvent | null;
    handleInstallClick: () => void;
}

export type Language = 'kn' | 'en';
