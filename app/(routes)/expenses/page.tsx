"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Mic, MicOff, Save, Trash2, Utensils, Users, Layers, Loader2, Plus, X, Download, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { addDoc, deleteDoc, doc, onSnapshot, query } from "firebase/firestore";
import { db, appId, getSmartCollection } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Expense, Category } from "@/types";
import { EXPENSE_TRANSLATIONS } from "@/lib/translations";
import { DEFAULT_CATEGORIES_CONFIG } from "@/lib/constants";
import { StandardHeader } from "@/components/ui/StandardHeader";

// Extend with SpeechRecognition if needed locally or move to types
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export default function ExpensesPage() {
    const router = useRouter();
    const { user, loginId, language, toggleLanguage, loading: authLoading } = useAuth();

    const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const [isListening, setIsListening] = useState<boolean>(false);
    const [transcript, setTranscript] = useState<string>('');

    const [selectedProperty, setSelectedProperty] = useState<string>('General');
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [customCategories, setCustomCategories] = useState<Category[]>([]);
    const [viewMode, setViewMode] = useState<'entry' | 'report'>('entry');

    const [reportType, setReportType] = useState<'month' | 'year'>('month');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const getTodayDate = (): string => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [amount, setAmount] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [entryDate, setEntryDate] = useState<string>(getTodayDate());
    const [feedback, setFeedback] = useState<string>('');

    const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
    const [addCategoryModal, setAddCategoryModal] = useState<{ isOpen: boolean; name: string }>({ isOpen: false, name: '' });
    const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const recognitionRef = useRef<any>(null);
    const t = EXPENSE_TRANSLATIONS[language] || EXPENSE_TRANSLATIONS['en']; // Re-applying fix: Prevents crash if language is invalid

    // Fetch Expenses
    useEffect(() => {
        if (!loginId) return;
        setIsDataLoading(true);
        const collectionName = `expenses_${loginId}`;
        const expensesRef = getSmartCollection(db, appId, collectionName);
        const q = query(expensesRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedData: Expense[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...(doc.data() as Omit<Expense, 'id'>)
            }));
            fetchedData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setExpenses(fetchedData);
            setIsDataLoading(false);
        });
        return () => unsubscribe();
    }, [loginId]);

    // Fetch Categories
    useEffect(() => {
        if (!loginId) return;
        const collectionName = `categories_${loginId}`;
        const categoriesRef = getSmartCollection(db, appId, collectionName);
        const q = query(categoriesRef);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedCats: Category[] = [];
            snapshot.docs.forEach(doc => {
                const d = doc.data();
                if (d && typeof d.label === 'string' && typeof d.color === 'string') {
                    fetchedCats.push({ id: doc.id, label: d.label, color: d.color, createdAt: d.createdAt });
                }
            });
            setCustomCategories(fetchedCats);
        });
        return () => unsubscribe();
    }, [loginId]);

    const allCategories = useMemo(() => {
        return [
            ...DEFAULT_CATEGORIES_CONFIG.map(c => ({
                ...c,
                // @ts-ignore
                label: (t && t[`cat_${c.id}`]) ? t[`cat_${c.id}`] : c.id
            })),
            ...customCategories
        ];
    }, [language, customCategories, t]);

    const getCategoryLabel = (id: string): string => {
        const cat = allCategories.find(c => c.id === id);
        return cat ? cat.label : (id || 'Other');
    };

    // Voice setup
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = language === 'kn' ? 'kn-IN' : 'en-IN';
                recognition.interimResults = false;
                recognition.onstart = () => { setIsListening(true); setFeedback(t.listening); };
                recognition.onend = () => setIsListening(false);
                recognition.onresult = (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    processVoiceCommand(text);
                    setIsListening(false);
                    recognition.stop();
                };
                recognition.onerror = () => { setFeedback(t.voiceError); setIsListening(false); };
                recognitionRef.current = recognition;
            } else {
                setFeedback(t.voiceUnavailable);
            }
        }
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [language]);

    const processVoiceCommand = (text: string) => {
        const lowerText = text.toLowerCase();

        const numbers = text.match(/\d+/);
        if (numbers) setAmount(numbers[0]);
        let found = false;
        const keywords = {
            Food: ['ಊಟ', 'ರೇಷನ್', 'ಅಕ್ಕಿ', 'ಆಹಾರ', 'food', 'ration', 'rice'],
            Salary: ['ಸಂಬಳ', 'ಗೂಲಿ', 'ಕೂಲಿ', 'salary', 'wages'],
            Electricity: ['ಕರೆಂಟ್', 'ಬಿಲ್', 'current', 'bill', 'electricity'],
            Repair: ['ರಿಪೇರಿ', 'repair', 'fix'],
            Fuel: ['ಪೆಟ್ರೋಲ್', 'ಡೀಸೆಲ್', 'petrol', 'diesel', 'fuel']
        };
        let detectedCat = 'Other';
        for (const [catKey, words] of Object.entries(keywords)) {
            if (words.some(w => lowerText.includes(w))) {
                detectedCat = catKey;
                found = true;
                break;
            }
        }
        if (!found) {
            const dynamicMatch = allCategories.find(c => c.label && lowerText.includes(c.label.toLowerCase()));
            if (dynamicMatch) detectedCat = dynamicMatch.id;
        }
        setCategory(detectedCat);
        setNote(text);
        setFeedback(`${t.identified}: ₹${numbers ? numbers[0] : ''} | ${getCategoryLabel(detectedCat)}`);
    };

    const toggleListening = () => {
        if (isListening) recognitionRef.current?.stop();
        else { recognitionRef.current?.start(); setTranscript(''); setAmount(''); setCategory(''); }
    };

    const handleSave = async () => {
        if (!amount || !category) { setFeedback(t.validationError); return; }
        if (!loginId) { setFeedback(t.loginWait); return; }
        const newExp: Expense = { property: selectedProperty, amount: parseFloat(amount), category, note: transcript || note || 'Manual Entry', date: entryDate, createdAt: Date.now() };
        setIsSaving(true);
        try {
            setFeedback(t.saving);
            const collectionName = `expenses_${loginId}`;
            await addDoc(getSmartCollection(db, appId, collectionName), newExp);
            setAmount(''); setCategory(''); setTranscript(''); setNote(''); setEntryDate(getTodayDate()); setFeedback(t.saved);
        } catch (e: any) { setFeedback(t.saveError); } finally { setIsSaving(false); }
    };

    const saveNewCategory = async () => {
        if (!addCategoryModal.name.trim() || !loginId) return;
        setIsAddingCategory(true);
        const hue = Math.floor(Math.random() * 360);
        const randomColor = `hsl(${hue}, 70%, 50%)`;
        try {
            const newCatRef = await addDoc(getSmartCollection(db, appId, `categories_${loginId}`), { label: addCategoryModal.name, color: randomColor, createdAt: Date.now() });
            setCategory(newCatRef.id); setAddCategoryModal({ isOpen: false, name: '' });
        } catch (e) { alert("Failed"); } finally { setIsAddingCategory(false); }
    };

    const confirmDelete = async () => {
        if (!loginId || !deleteConfirmation.id) return;
        setIsDeleting(true);
        try { await deleteDoc(doc(getSmartCollection(db, appId, `expenses_${loginId}`), deleteConfirmation.id)); setDeleteConfirmation({ isOpen: false, id: null }); setFeedback(t.deleted); } catch (e) { setFeedback("Error"); } finally { setIsDeleting(false); }
    };

    const exportExpensesToCSV = () => {
        const dataToExport = getFilteredData();
        if (dataToExport.length === 0) { alert("No data"); return; }
        const header = ["Date", "Property", "Category", "Amount", "Note"];
        const rows = dataToExport.map(e => [e.date, e.property, getCategoryLabel(e.category), e.amount, `"${e.note.replace(/"/g, '""')}"`]);
        rows.sort((a, b) => new Date(a[0] as string).getTime() - new Date(b[0] as string).getTime());
        const csvContent = "data:text/csv;charset=utf-8," + header.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `expenses_${loginId}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const getFilteredData = () => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth() + 1;
        const monthString = month < 10 ? `0${month}` : `${month}`;
        const yearString = `${year}`;
        return expenses.filter(e => {
            if (reportType === 'month') return e.date.startsWith(`${yearString}-${monthString}`);
            else return e.date.startsWith(yearString);
        });
    };

    const filteredData = getFilteredData();
    const totalSpent = filteredData.reduce((acc, cur) => acc + cur.amount, 0);
    const foodTotal = filteredData.filter(e => e.category === 'Food').reduce((acc, cur) => acc + cur.amount, 0);
    const salaryTotal = filteredData.filter(e => e.category === 'Salary').reduce((acc, cur) => acc + cur.amount, 0);
    const otherTotal = totalSpent - (foodTotal + salaryTotal);
    const chartData = allCategories.map(cat => ({ name: cat.label, value: filteredData.filter(e => e.category === cat.id).reduce((acc, cur) => acc + cur.amount, 0), color: cat.color })).filter(d => d.value > 0);

    const changeDate = (dir: number) => { const newDate = new Date(selectedDate); if (reportType === 'month') newDate.setMonth(selectedDate.getMonth() + dir); else newDate.setFullYear(selectedDate.getFullYear() + dir); setSelectedDate(newDate); };
    const formatDisplayDate = () => { if (reportType === 'month') return selectedDate.toLocaleDateString(language === 'kn' ? 'kn-IN' : 'en-US', { month: 'long', year: 'numeric' }); else return selectedDate.getFullYear() + (language === 'kn' ? ' ರ ವಾರ್ಷಿಕ ಲೆಕ್ಕ' : ' Annual Report'); };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-green-600" size={48} /></div>;
    if (!user) { router.push('/'); return null; }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24 relative">
            <StandardHeader
                title={t.appTitle}
                subtitle={language === 'kn' ? 'ಖರ್ಚು ಮತ್ತು ವರದಿ' : 'Track Expenses & Reports'}
                onBack={() => router.push('/')}
                language={language}
                onToggleLanguage={toggleLanguage}
            />

            {viewMode === 'entry' ? (
                <div className="p-5 flex flex-col items-center animate-fade-in mt-4 relative z-20">
                    <div className="w-full bg-white p-6 rounded-3xl shadow-xl shadow-green-900/5 border border-white/50 mb-6 flex flex-col items-center">
                        <div className="relative mb-2">
                            {isListening && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></span>}
                            <button onClick={toggleListening} className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 ${isListening ? 'bg-red-500 text-white' : 'bg-gradient-to-br from-slate-700 to-slate-800 text-white'}`}>
                                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                            </button>
                        </div>
                        <p className="text-center font-bold text-slate-400 text-xs uppercase tracking-wide mb-4">{t.pressToSpeak}</p>

                        <div className="w-full bg-slate-50 p-4 rounded-2xl text-center min-h-[60px] flex flex-col justify-center border border-slate-100">
                            {transcript ? (
                                <p className="text-lg font-medium text-slate-800 italic">"{transcript}"</p>
                            ) : (
                                <p className="text-sm text-slate-400 italic">{t.feedbackDefault}</p>
                            )}
                            {feedback && <p className="text-xs text-emerald-600 mt-2 font-bold bg-emerald-50 py-1 px-2 rounded-lg self-center">{feedback}</p>}
                        </div>
                    </div>

                    <div className="w-full mb-6 space-y-3">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                            <label className="text-xs text-slate-400 font-bold mr-2 whitespace-nowrap uppercase tracking-wider flex items-center gap-1"><Calendar size={12} /> {t.date}</label>
                            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="flex-1 text-lg font-bold outline-none bg-transparent text-right text-slate-800" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{t.amount}</label>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full text-2xl font-bold outline-none bg-transparent text-slate-800 placeholder:text-slate-200" placeholder="0" />
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">{t.category}</label>
                                <select value={category} onChange={(e) => { if (e.target.value === 'NEW') { setAddCategoryModal({ isOpen: true, name: '' }) } else { setCategory(e.target.value) } }} className="w-full text-md font-bold outline-none bg-transparent mt-1 text-slate-800">
                                    <option value="">{t.selectCategory}</option>
                                    {allCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    <option value="NEW" className="font-bold text-emerald-600">{t.addCategory}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex justify-center items-center gap-2 transition-all ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20'}`}>{isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}{isSaving ? t.saving : t.save}</button>
                </div>
            ) : (
                <div className="p-4 animate-fade-in pb-24 mt-4 relative z-20">
                    <div className="bg-white p-2 rounded-2xl shadow-sm mb-4 flex justify-between items-center border border-slate-100">
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl">
                            <button onClick={() => setReportType('month')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'month' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>{t.month}</button>
                            <button onClick={() => setReportType('year')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'year' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>{t.year}</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => changeDate(-1)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"><ChevronLeft size={16} /></button>
                            <span className="text-xs font-bold text-slate-600 min-w-[90px] text-center">{formatDisplayDate()}</span>
                            <button onClick={() => changeDate(1)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2rem] shadow-xl mb-6 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">{t.totalExpense}</p>
                        <h2 className="text-4xl font-bold relative z-10">₹{totalSpent.toLocaleString()}</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <div className="bg-emerald-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"><Utensils size={14} className="text-emerald-500" /></div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.cat_Food}</p>
                            <p className="text-sm font-bold text-slate-800">₹{foodTotal}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <div className="bg-blue-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"><Users size={14} className="text-blue-500" /></div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.cat_Salary}</p>
                            <p className="text-sm font-bold text-slate-800">₹{salaryTotal}</p>
                        </div>
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <div className="bg-orange-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"><Layers size={14} className="text-orange-500" /></div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{t.cat_Other}</p>
                            <p className="text-sm font-bold text-slate-800">₹{otherTotal}</p>
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] shadow-sm mb-6 border border-slate-100">
                        <h3 className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{t.graphDetails}</h3>
                        <div className="h-64 relative">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${value}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-bold text-sm">{t.noExpenses}</div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="font-bold text-slate-700 text-sm">{t.detailedList}</h3>
                        <button onClick={exportExpensesToCSV} className="text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-emerald-100 font-bold transition"><Download size={12} /> CSV</button>
                    </div>
                    <div className="space-y-3 min-h-[200px]">{!isDataLoading && filteredData.map(item => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center border border-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: allCategories.find(c => c.id === item.category)?.color || '#999' }}></div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{getCategoryLabel(item.category)}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">{item.date} • <span className="italic">{item.note}</span></p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-800 text-sm">₹{item.amount}</span>
                                <button onClick={() => setDeleteConfirmation({ isOpen: true, id: item.id || null })} className="text-slate-300 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}</div>
                </div>
            )}

            <div className="fixed bottom-6 left-10 right-10 bg-white/90 backdrop-blur-md rounded-full shadow-2xl p-1.5 flex justify-between items-center z-50 border border-slate-200">
                <button onClick={() => setViewMode('entry')} className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${viewMode === 'entry' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>{t.write}</button>
                <button onClick={() => setViewMode('report')} className={`flex-1 py-3 rounded-full font-bold text-sm transition-all ${viewMode === 'report' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>{t.view}</button>
            </div>

            {deleteConfirmation.isOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in"><h3 className="text-xl font-bold text-slate-900 mb-2">{t.deleteConfirmTitle}</h3><p className="text-slate-500 mb-8 text-sm leading-relaxed">{t.deleteConfirmDesc}</p><div className="flex gap-3"><button onClick={() => setDeleteConfirmation({ isOpen: false, id: null })} className="flex-1 py-3.5 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">{t.cancel}</button><button onClick={confirmDelete} className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-red-500 shadow-lg shadow-red-500/30 hover:bg-red-600 flex items-center justify-center gap-2 transition-all">{isDeleting && <Loader2 className="animate-spin" size={18} />}{isDeleting ? t.deleting : t.delete}</button></div></div></div>)}
            {addCategoryModal.isOpen && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4"><div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in relative"><button onClick={() => setAddCategoryModal({ isOpen: false, name: '' })} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors"><X size={24} /></button><h3 className="text-xl font-bold text-slate-900 mb-6">{t.addCategoryTitle}</h3><div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all"><label className="text-xs text-slate-400 font-bold block mb-1 uppercase tracking-wider">{t.categoryName}</label><input type="text" value={addCategoryModal.name} onChange={(e) => setAddCategoryModal({ ...addCategoryModal, name: e.target.value })} className="w-full bg-transparent text-lg font-bold outline-none text-slate-900 placeholder:text-slate-300 placeholder:font-normal" autoFocus placeholder={t.exampleCategory} /></div><button onClick={saveNewCategory} disabled={isAddingCategory || !addCategoryModal.name.trim()} className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 hover:scale-[1.02] flex items-center justify-center gap-2 transition-all">{isAddingCategory ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}{isAddingCategory ? t.adding : t.add}</button></div></div>)}
        </div>
    );
}
