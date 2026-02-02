"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Save, Loader2 } from 'lucide-react';
import { addDoc, deleteDoc, doc, onSnapshot, query } from "firebase/firestore";

import { db, appId, getSmartCollection } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { PlantationRecord } from "@/types";
import { PLANTATION_TRANSLATIONS } from "@/lib/translations";
import { StandardHeader } from "@/components/ui/StandardHeader";
import { TabNav } from "@/components/ui/TabNav";

export default function PlantationPage() {
    const router = useRouter();
    const { user, loginId, language, toggleLanguage, loading: authLoading } = useAuth();
    const t = PLANTATION_TRANSLATIONS[language] || PLANTATION_TRANSLATIONS['en']; // Re-applying fix: Prevents crash if language is invalid

    const [activeTab, setActiveTab] = useState<'entry' | 'report' | 'history'>('entry');
    const [records, setRecords] = useState<PlantationRecord[]>([]);

    // Entry Form States
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<'Expense' | 'Income'>('Expense');
    const [activity, setActivity] = useState('pruning');
    const [durationDays, setDurationDays] = useState('');
    const [peopleCount, setPeopleCount] = useState('');
    const [wagePerPerson, setWagePerPerson] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [note, setNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Report States
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());

    // Generate years dynamically: 2024 to Current Year + 1
    const years = useMemo(() => {
        const startYear = 2024;
        const endYear = currentYear + 1;
        const yearList = [];
        for (let i = startYear; i <= endYear; i++) {
            yearList.push(i);
        }
        return yearList;
    }, [currentYear]);

    // Activities List
    const activities = Object.entries(t.activities).map(([key, label]) => ({ key, label }));

    // Fetch Records
    useEffect(() => {
        if (!loginId) return;
        const colRef = getSmartCollection(db, appId, `plantation_records_${loginId}`);
        const q = query(colRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlantationRecord));
            setRecords(docs.sort((a, b) => b.createdAt - a.createdAt));
        });
        return () => unsubscribe();
    }, [loginId]);

    // Auto-calculate Total Amount
    useEffect(() => {
        if (type === 'Expense') {
            const days = parseFloat(durationDays) || 0;
            const people = parseFloat(peopleCount) || 0;
            const wage = parseFloat(wagePerPerson) || 0;
            if (days > 0 && people > 0 && wage > 0) {
                setTotalAmount((days * people * wage).toString());
            }
        }
    }, [durationDays, peopleCount, wagePerPerson, type]);

    const handleSave = async () => {
        if (!totalAmount || parseFloat(totalAmount) <= 0) {
            alert("Invalid Amount");
            return;
        }

        setIsSaving(true);
        try {
            const record: PlantationRecord = {
                type,
                activity: activity === 'other' ? 'Other' : activity, // Simplify for now
                date: entryDate,
                amount: parseFloat(totalAmount),
                durationDays: parseFloat(durationDays) || 0,
                peopleCount: parseFloat(peopleCount) || 0,
                wagePerPerson: parseFloat(wagePerPerson) || 0,
                note,
                createdAt: Date.now()
            };

            const colRef = getSmartCollection(db, appId, `plantation_records_${loginId}`);
            await addDoc(colRef, record);

            // Reset Form
            setTotalAmount('');
            setDurationDays('');
            setPeopleCount('');
            setWagePerPerson('');
            setNote('');
            alert("Saved!");
        } catch (e) {
            console.error(e);
            alert("Error saving record");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRecord = async (id: string) => {
        if (confirm("Delete this record?")) {
            await deleteDoc(doc(getSmartCollection(db, appId, `plantation_records_${loginId}`), id));
        }
    };

    // Report Calculations
    const getYearlyReport = () => {
        const yearRecords = records.filter(r => r.date.startsWith(selectedYear));
        const income = yearRecords.filter(r => r.type === 'Income').reduce((s, r) => s + r.amount, 0);
        const expense = yearRecords.filter(r => r.type === 'Expense').reduce((s, r) => s + r.amount, 0);

        // Group by activity for chart
        const activityMap: Record<string, number> = {};
        yearRecords.filter(r => r.type === 'Expense').forEach(r => {
            // @ts-ignore
            const label = t.activities[r.activity] || r.activity;
            activityMap[label] = (activityMap[label] || 0) + r.amount;
        });

        const chartData = Object.entries(activityMap).map(([name, value]) => ({ name, value }));

        return { income, expense, profit: income - expense, chartData };
    };

    const reportData = getYearlyReport();

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-orange-600" size={48} /></div>;
    if (!user) { router.push('/'); return null; }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
            <StandardHeader
                title={t.title}
                subtitle={t.subtitle}
                onBack={() => router.push('/')}
                language={language}
                onToggleLanguage={toggleLanguage}
            />

            <div className="p-4 max-w-md mx-auto mt-4 relative z-20">
                <TabNav
                    tabs={[
                        { id: 'entry', label: t.navEntry },
                        { id: 'history', label: t.history },
                        { id: 'report', label: t.navReport }
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {activeTab === 'entry' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-2">
                            <button onClick={() => setType('Expense')} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${type === 'Expense' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 bg-white text-gray-400'}`}>{t.expense}</button>
                            <button onClick={() => setType('Income')} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${type === 'Income' ? 'border-green-500 bg-green-50 text-green-600' : 'border-gray-100 bg-white text-gray-400'}`}>{t.income}</button>
                        </div>

                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t.date}</label>
                                <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="w-full p-2 font-bold border-b border-gray-200 outline-none bg-transparent text-slate-800" />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t.activity}</label>
                                <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full p-2 font-bold border-b border-gray-200 outline-none bg-transparent text-slate-800">
                                    {activities.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                                </select>
                            </div>

                            {type === 'Expense' && (
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="col-span-2 text-xs font-bold text-slate-400">{t.autoCalc}</div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{t.duration}</label>
                                        <input type="number" placeholder="0" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="w-full p-1 font-bold border-b border-gray-200 outline-none bg-transparent text-slate-800" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{t.people}</label>
                                        <input type="number" placeholder="0" value={peopleCount} onChange={e => setPeopleCount(e.target.value)} className="w-full p-1 font-bold border-b border-gray-200 outline-none bg-transparent text-slate-800" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{t.wage}</label>
                                        <input type="number" placeholder="0" value={wagePerPerson} onChange={e => setWagePerPerson(e.target.value)} className="w-full p-1 font-bold border-b border-gray-200 outline-none bg-transparent text-slate-800" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t.amount}</label>
                                <div className="flex items-center">
                                    <span className="text-lg font-bold text-gray-400 mr-1">₹</span>
                                    <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className={`w-full p-2 text-2xl font-bold border-b border-gray-200 outline-none bg-transparent ${type === 'Income' ? 'text-green-600' : 'text-red-500'}`} placeholder="0" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">{t.note}</label>
                                <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full p-2 font-medium border-b border-gray-200 outline-none bg-transparent text-slate-800" placeholder="..." />
                            </div>
                        </div>

                        <button onClick={handleSave} disabled={isSaving} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />} {t.save}
                        </button>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-3 animate-fade-in">
                        {records.map(rec => (
                            <div key={rec.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">
                                        {/* @ts-ignore */}
                                        {t.activities[rec.activity] || rec.activity}
                                        <span className="text-xs font-normal text-gray-400 ml-2">({rec.date})</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {rec.type === 'Expense' && rec.durationDays ?
                                            `${rec.durationDays}d x ${rec.peopleCount}p @ ₹${rec.wagePerPerson}` :
                                            rec.note || '-'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold ${rec.type === 'Income' ? 'text-green-600' : 'text-red-500'}`}>
                                        {rec.type === 'Income' ? '+' : '-'} ₹{rec.amount}
                                    </div>
                                    <button onClick={() => rec.id && deleteRecord(rec.id)} className="text-xs text-red-300 mt-1 hover:text-red-500">Delete</button>
                                </div>
                            </div>
                        ))}
                        {records.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No records found.</p>}
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                            <span className="text-sm font-bold text-gray-500">{t.selectYear}</span>
                            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="font-bold text-slate-800 bg-transparent outline-none">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                <div className="text-xs font-bold text-green-600 uppercase mb-1 flex items-center gap-1"><TrendingUp size={14} /> {t.totalIncome}</div>
                                <div className="text-xl font-bold text-green-700">₹{reportData.income.toLocaleString()}</div>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <div className="text-xs font-bold text-red-500 uppercase mb-1 flex items-center gap-1"><TrendingDown size={14} /> {t.totalExpense}</div>
                                <div className="text-xl font-bold text-red-600">₹{reportData.expense.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="bg-slate-800 p-5 rounded-2xl shadow-lg text-white text-center">
                            <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t.netProfit}</div>
                            <div className={`text-3xl font-bold ${reportData.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                ₹{reportData.profit.toLocaleString()}
                            </div>
                        </div>

                        {reportData.chartData.length > 0 && (
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-64">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 text-center">Expense Breakdown</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={reportData.chartData} layout="vertical" margin={{ left: 20 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#666' }} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
