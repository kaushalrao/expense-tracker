"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, IndianRupee, Users, History, Save, Plus, Trash2, Download, Loader2 } from 'lucide-react';
import { addDoc, deleteDoc, doc, onSnapshot, query } from "firebase/firestore";

import { db, appId, getSmartCollection } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Worker, DailyRecord, Payment, DailyEntry } from "@/types";
import { STAY_TRANSLATIONS } from "@/lib/translations";
import { StandardHeader } from "@/components/ui/StandardHeader";
import { TabNav } from "@/components/ui/TabNav";

export default function StayManagerPage() {
    const router = useRouter();
    const { user, loginId, language, toggleLanguage, loading: authLoading } = useAuth();
    const t = STAY_TRANSLATIONS[language] || STAY_TRANSLATIONS['en']; // Re-applying fix: Prevents crash if language is invalid

    const [activeTab, setActiveTab] = useState('daily');
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [records, setRecords] = useState<DailyRecord[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);

    const [newWorkerName, setNewWorkerName] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedWorkerForPay, setSelectedWorkerForPay] = useState<Worker | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [dailyEntries, setDailyEntries] = useState<Record<string, DailyEntry>>({});

    // Sync Data
    useEffect(() => {
        if (!loginId) return;
        const getRef = (colSuffix: string) => getSmartCollection(db, appId, `${colSuffix}_${loginId}`);

        const unsubWorkers = onSnapshot(query(getRef('stay_workers')), (snapshot) => {
            setWorkers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Worker)));
        });
        const unsubRecords = onSnapshot(query(getRef('stay_records')), (snapshot) => {
            setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyRecord)));
        });
        const unsubPayments = onSnapshot(query(getRef('stay_payments')), (snapshot) => {
            setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
        });

        return () => { unsubWorkers(); unsubRecords(); unsubPayments(); };
    }, [loginId]);

    const addWorker = async () => {
        if (newWorkerName.trim()) {
            try {
                const colRef = getSmartCollection(db, appId, `stay_workers_${loginId}`);
                await addDoc(colRef, { name: newWorkerName, joinedAt: new Date().toISOString() });
                setNewWorkerName('');
            } catch (e) { alert(t.addError); }
        }
    };

    const removeWorker = async (id: string) => {
        if (window.confirm(t.confirmDelete)) {
            try {
                const colRef = getSmartCollection(db, appId, `stay_workers_${loginId}`);
                await deleteDoc(doc(colRef, id));
            } catch (e) { alert(t.deleteError); }
        }
    };

    const handleEntryChange = (workerId: string, field: 'base' | 'extra', value: string) => {
        setDailyEntries((prev) => ({
            ...prev,
            [workerId]: { ...prev[workerId], [field]: parseFloat(value) || 0 }
        }));
    };

    const saveDailyEntries = async () => {
        const newRecords: Omit<DailyRecord, 'id'>[] = [];
        workers.forEach(worker => {
            const entry = dailyEntries[worker.id];
            if (entry && ((entry.base || 0) > 0 || (entry.extra || 0) > 0)) {
                newRecords.push({
                    workerId: worker.id,
                    workerName: worker.name,
                    date: selectedDate,
                    base: entry.base || 0,
                    extra: entry.extra || 0,
                    total: (entry.base || 0) + (entry.extra || 0),
                    createdAt: Date.now()
                });
            }
        });

        if (newRecords.length > 0) {
            try {
                const colRef = getSmartCollection(db, appId, `stay_records_${loginId}`);
                await Promise.all(newRecords.map(rec => addDoc(colRef, rec)));
                setDailyEntries({});
                alert(t.savedSuccess);
            } catch (e) { alert(t.saveError); }
        } else { alert(t.enterSalary); }
    };

    const calculateBalance = (workerId: string) => {
        const earned = records.filter(r => r.workerId === workerId).reduce((sum, r) => sum + r.total, 0);
        const paid = payments.filter(p => p.workerId === workerId).reduce((sum, p) => sum + p.amount, 0);
        return earned - paid;
    };

    const handlePayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0 || !selectedWorkerForPay) return;
        try {
            const colRef = getSmartCollection(db, appId, `stay_payments_${loginId}`);
            await addDoc(colRef, {
                workerId: selectedWorkerForPay.id,
                workerName: selectedWorkerForPay.name,
                date: new Date().toISOString().split('T')[0],
                amount: parseFloat(paymentAmount),
                note: paymentNote,
                createdAt: Date.now()
            });
            setShowPaymentModal(false); setPaymentAmount(''); setPaymentNote(''); setSelectedWorkerForPay(null);
            alert(t.paymentSuccess);
        } catch (e) { alert(t.paymentSaveError); }
    };

    const exportToCSV = () => {
        const header = ["Date", "Type", "Worker", "Amount", "Details"];
        const rows: (string | number)[][] = [];
        records.forEach(r => rows.push([r.date, "Daily Wage", r.workerName, r.total, `Base: ${r.base} Extra: ${r.extra}`]));
        payments.forEach(p => rows.push([p.date, "Payment", p.workerName, p.amount, p.note]));
        rows.sort((a, b) => new Date(b[0] as string).getTime() - new Date(a[0] as string).getTime());
        const csvContent = "data:text/csv;charset=utf-8," + header.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `milan_farm_report_${loginId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
    if (!user) { router.push('/'); return null; }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
            <StandardHeader
                title={t.title}
                subtitle={t.managerSubtitle}
                onBack={() => router.push('/')}
                language={language}
                onToggleLanguage={toggleLanguage}
            />

            <div className="p-4 max-w-md mx-auto mt-4 relative z-20">
                <TabNav
                    tabs={[
                        { id: 'daily', label: t.navDaily },
                        { id: 'payment', label: t.navPayment },
                        { id: 'workers', label: t.navWorkers },
                        { id: 'history', label: t.navHistory }
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                {activeTab === 'daily' && (
                    <div className="animate-fade-in">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2"><FileText size={20} /> {t.dailyEntryTitle}</h2>
                        <div className="mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                            <label className="block text-sm font-medium text-slate-500 mb-1">{t.selectDate}</label>
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800" />
                        </div>
                        {workers.length === 0 ? (
                            <div className="text-center p-8 text-gray-400 bg-white rounded-xl border-dashed border-2 border-gray-300"><p>{t.emptyList}</p><p className="text-sm mt-2">{t.emptyListSub}</p></div>
                        ) : (
                            <div className="space-y-4">
                                {workers.map(worker => (
                                    <div key={worker.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                                        <div className="font-bold text-lg text-slate-800 mb-2">{worker.name}</div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-xs text-gray-500 font-bold">{t.dailyWage}</label><input type="number" placeholder="0" value={dailyEntries[worker.id]?.base || ''} onChange={(e) => handleEntryChange(worker.id, 'base', e.target.value)} className="w-full p-2 border rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                                            <div><label className="text-xs text-green-600 font-bold">{t.extra}</label><input type="number" placeholder="0" value={dailyEntries[worker.id]?.extra || ''} onChange={(e) => handleEntryChange(worker.id, 'extra', e.target.value)} className="w-full p-2 border rounded-xl bg-green-50 text-slate-900 outline-none focus:ring-2 focus:ring-green-500/20" /></div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={saveDailyEntries} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-blue-700 transition flex justify-center items-center gap-2 mt-4"><Save size={20} /> {t.save}</button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'payment' && (
                    <div className="animate-fade-in">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2"><IndianRupee size={20} /> {t.paymentsTitle}</h2>
                        <div className="space-y-3">
                            {workers.map(worker => {
                                const balance = calculateBalance(worker.id);
                                return (
                                    <div key={worker.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100">
                                        <div><div className="font-bold text-slate-800">{worker.name}</div><div className={`text-sm mt-1 font-bold ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>{t.balance}: ₹{balance}</div></div>
                                        <button onClick={() => { setSelectedWorkerForPay(worker); setShowPaymentModal(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-blue-700 transition">{t.pay}</button>
                                    </div>
                                );
                            })}
                            {workers.length === 0 && <p className="text-center text-gray-500">{t.noWorkers}</p>}
                        </div>
                        <div className="mt-8">
                            <h3 className="text-md font-bold text-slate-600 mb-2">{t.recentPayments}</h3>
                            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
                                {payments.slice().reverse().slice(0, 5).map(pay => (
                                    <div key={pay.id} className="border-b last:border-0 p-3 flex justify-between items-start border-slate-100">
                                        <div><div className="font-bold text-sm text-slate-800">{pay.workerName}</div><div className="text-xs text-gray-500">{pay.date}</div>{pay.note && <div className="text-xs text-gray-400 mt-1 italic">"{pay.note}"</div>}</div>
                                        <div className="font-bold text-green-600">₹{pay.amount}</div>
                                    </div>
                                ))}
                                {payments.length === 0 && <div className="p-4 text-center text-xs text-gray-400">{t.noPayments}</div>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'workers' && (
                    <div className="animate-fade-in">
                        <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2"><Users size={20} /> {t.workersTitle}</h2>
                        <div className="flex gap-2 mb-6">
                            <input type="text" placeholder={t.newWorkerPlaceholder} value={newWorkerName} onChange={(e) => setNewWorkerName(e.target.value)} className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white shadow-sm" />
                            <button onClick={addWorker} className="bg-blue-600 text-white p-3 rounded-xl shadow-md hover:bg-blue-700 transition"><Plus size={24} /></button>
                        </div>
                        <div className="space-y-2">
                            {workers.map(worker => (
                                <div key={worker.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-100">
                                    <span className="font-bold text-lg text-slate-800">{worker.name}</span>
                                    <button onClick={() => removeWorker(worker.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition"><Trash2 size={20} /></button>
                                </div>
                            ))}
                            {workers.length === 0 && <p className="text-center text-gray-500 mt-4">{t.emptyList}</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><History size={20} /> {t.historyTitle}</h2><button onClick={exportToCSV} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-slate-200 border border-slate-300 font-bold transition"><Download size={14} /> {t.download}</button></div>
                        <div className="space-y-2">
                            {records.slice().sort((a, b) => b.createdAt - a.createdAt).map(rec => (
                                <div key={rec.id} className="bg-white p-3 rounded-2xl shadow-sm flex justify-between border-l-4 border-blue-400">
                                    <div><div className="font-bold text-slate-800">{rec.workerName}</div><div className="text-xs text-gray-500">{rec.date}</div></div>
                                    <div className="text-right"><div className="font-bold text-slate-800">₹{rec.total}</div><div className="text-xs text-gray-500">({t.dailyWage}: {rec.base} + {t.extra}: {rec.extra})</div></div>
                                </div>
                            ))}
                            {records.length === 0 && <p className="text-center text-gray-500">{t.noRecords}</p>}
                        </div>
                    </div>
                )}
            </div>

            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-in">
                        <h3 className="text-xl font-bold mb-1 text-slate-900">{t.paymentModalTitle}</h3>
                        <p className="text-gray-500 mb-6 text-sm">{t.workerLabel}: <span className="font-bold text-black">{selectedWorkerForPay?.name}</span></p>
                        <div className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.amountLabel}</label><input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-2xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" autoFocus /></div>
                            <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t.noteLabel}</label><input type="text" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="..." /></div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition">{t.cancel}</button>
                            <button onClick={handlePayment} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition">{t.pay}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
