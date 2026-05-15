import { ArrowRightLeft, AudioLines, BookMarked, Check, CloudOff, Copy, DownloadCloud, FileSearch, FileText, Languages, Mic, MicOff, Monitor, Moon, Play, Plus, Settings2, Sun, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { generatePhonetic, translateText, clearTranslationCache, analyzeDocument } from '../services/ai';
import { LANGUAGES } from '../types';
import mammoth from 'mammoth';

interface GlossaryEntry {
  id: string;
  source: string;
  target: string;
}

interface TranslationViewProps {
  onTranslated: (source: string, result: string, sLang: string, tLang: string) => void;
  initialSource?: string;
  initialResult?: string;
  initialSLang?: string;
  initialTLang?: string;
  isOnline?: boolean;
}

export function TranslationView({ onTranslated, initialSource = "", initialResult = "", initialSLang = "auto", initialTLang = "es", isOnline = true }: TranslationViewProps) {
  const [sourceText, setSourceText] = useState(initialSource);
  const [translatedText, setTranslatedText] = useState(initialResult);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState(initialSLang);
  const [targetLang, setTargetLang] = useState(initialTLang);
  const [phoneticText, setPhoneticText] = useState("");
  const [isPhoneticLoading, setIsPhoneticLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('lingoscan_theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const recognitionRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Persistence for offline packs
  const [downloadedPacks, setDownloadedPacks] = useState<string[]>(() => {
    const saved = localStorage.getItem('lingoscan_offline_packs');
    return saved ? JSON.parse(saved) : ['en', 'es'];
  });
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [showPackManager, setShowPackManager] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ summary: string; themes: string[]; wordCount: number; complexity: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(() => {
    const saved = localStorage.getItem('verba_glossary');
    return saved ? JSON.parse(saved) : [];
  });
  const [newEntry, setNewEntry] = useState({ source: "", target: "" });

  useEffect(() => {
    localStorage.setItem('verba_glossary', JSON.stringify(glossary));
  }, [glossary]);

  useEffect(() => {
    localStorage.setItem('lingoscan_offline_packs', JSON.stringify(downloadedPacks));
  }, [downloadedPacks]);

  useEffect(() => {
    localStorage.setItem('lingoscan_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      handleChange();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setResolvedTheme(theme as 'light' | 'dark');
    }
  }, [theme]);

  useEffect(() => {
    setSourceText(initialSource);
    setTranslatedText(initialResult);
    setPhoneticText("");
    setError(null);
    if (initialSLang) setSourceLang(initialSLang);
    if (initialTLang) setTargetLang(initialTLang);
  }, [initialSource, initialResult, initialSLang, initialTLang]);

  useEffect(() => {
    if (sourceText.trim()) {
      handleTranslate(sourceText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLang, targetLang]);

  const handleTranslate = async (text: string = sourceText) => {
    if (!text.trim()) {
      setTranslatedText("");
      setPhoneticText("");
      setError(null);
      return;
    }
    setIsTranslating(true);
    setPhoneticText("");
    setError(null);
    try {
      const res = await translateText(text, sourceLang, targetLang, glossary.map(g => ({ source: g.source, target: g.target })));
      setTranslatedText(res);
      onTranslated(text, res, sourceLang, targetLang);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to translate");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownloadPack = (langCode: string) => {
    if (isDownloading) return;
    setIsDownloading(langCode);
    
    // Simulate gradual progress if we had a progress state, but for now simple delay
    setTimeout(() => {
      setDownloadedPacks(prev => [...new Set([...prev, langCode])]);
      setIsDownloading(null);
    }, 2500);
  };

  const removePack = (langCode: string) => {
    if (langCode === 'en' || langCode === 'es') return; // Keep core packs
    setDownloadedPacks(prev => prev.filter(p => p !== langCode));
  };

  const handlePhonetic = async () => {
    if (!translatedText) return;
    setIsPhoneticLoading(true);
    try {
      const ph = await generatePhonetic(translatedText, targetLang);
      setPhoneticText(ph);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPhoneticLoading(false);
    }
  };

  const swapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const speakText = (text: string, lang: string) => {
    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = sourceLang === 'auto' ? 'en-US' : sourceLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setSourceText(""); // Clear for new dictation
    };
    
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setSourceText(currentText);
      
      if (finalTranscript) {
        handleTranslate(finalTranscript);
      }
    };

    recognition.start();
  };

  const addGlossaryEntry = () => {
    if (!newEntry.source.trim() || !newEntry.target.trim()) return;
    const entry: GlossaryEntry = {
      id: Math.random().toString(36).substring(7),
      source: newEntry.source.trim(),
      target: newEntry.target.trim(),
    };
    setGlossary(prev => [...prev, entry]);
    setNewEntry({ source: "", target: "" });
  };

  const removeGlossaryEntry = (id: string) => {
    setGlossary(prev => prev.filter(e => e.id !== id));
  };

  const handleDocumentAnalysis = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAnalysisResult(null);
    setError(null);

    try {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          const data = base64.split(',')[1];
          const result = await analyzeDocument({ data, mimeType: file.type });
          setAnalysisResult(result);
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        const result = await analyzeDocument(value);
        setAnalysisResult(result);
        setIsAnalyzing(false);
      } else {
        throw new Error("Unsupported file format. Please use PDF, DOCX or Images.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze document");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      {/* Pack Manager Overlay */}
      <AnimatePresence>
        {showPackManager && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPackManager(false)}
              className="absolute inset-0 bg-slate-900/10 backdrop-blur-md z-40 rounded-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-[0.15em] flex items-center gap-2">
                    <DownloadCloud className="w-4 h-4 text-blue-600" />
                    Offline Assets
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Storage & Connection Manager</p>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPackManager(false)}
                  className="p-2.5 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </motion.button>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {LANGUAGES.filter(l => l.code !== 'auto').map((lang, i) => {
                  const isDownloaded = downloadedPacks.includes(lang.code);
                  const downloading = isDownloading === lang.code;
                  
                  return (
                    <motion.div 
                      key={lang.code}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F5F5F7] transition-all group items-center"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold ${isDownloaded ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400'}`}>
                          {lang.code.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-800 tracking-tight">{lang.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isDownloaded ? 'Cached Local' : 'Cloud Only'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isDownloaded ? (
                          <>
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                              <Check className="w-4 h-4" />
                            </div>
                            {lang.code !== 'en' && lang.code !== 'es' && (
                              <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removePack(lang.code)}
                                className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove Pack"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            )}
                          </>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDownloadPack(lang.code)}
                            disabled={!!isDownloading}
                            className={`p-2.5 rounded-xl transition-all ${downloading ? 'bg-blue-50 text-blue-600' : 'bg-white border border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600 shadow-sm'}`}
                          >
                            {downloading ? <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              <div className="p-5 bg-[#FBFBFD] border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em]">Total Session Footprint</p>
                  <p className="text-[11px] text-slate-700 font-bold mt-0.5">~{downloadedPacks.length * 45}MB Secure Data</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    clearTranslationCache();
                    alert("Common translation cache cleared successfully.");
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 text-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:border-red-100 hover:bg-red-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wipe Cache
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Glossary Overlay */}
      <AnimatePresence>
        {showGlossary && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGlossary(false)}
              className="absolute inset-0 bg-slate-900/10 backdrop-blur-md z-40 rounded-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-[0.15em] flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-blue-600" />
                    Linguistic Glossary
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Custom Override Definitions</p>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowGlossary(false)}
                  className="p-2.5 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </motion.button>
              </div>

              <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Original Term</label>
                    <input 
                      type="text"
                      value={newEntry.source}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, source: e.target.value }))}
                      placeholder="e.g. AcmeCorp"
                      className="w-full px-3 py-2.5 text-[12px] font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Translation</label>
                    <input 
                      type="text"
                      value={newEntry.target}
                      onChange={(e) => setNewEntry(prev => ({ ...prev, target: e.target.value }))}
                      placeholder="e.g. Acme-Société"
                      className="w-full px-3 py-2.5 text-[12px] font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={addGlossaryEntry}
                  disabled={!newEntry.source.trim() || !newEntry.target.trim()}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Define Override
                </button>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {glossary.length === 0 ? (
                  <div className="py-12 text-center">
                    <BookMarked className="w-8 h-8 text-slate-100 mx-auto mb-3" />
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">No definitions active</p>
                  </div>
                ) : (
                  glossary.map((entry, i) => (
                    <motion.div 
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-[#F5F5F7] transition-all group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase">Original</span>
                          <p className="text-[13px] font-bold text-slate-800 tracking-tight">{entry.source}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-bold uppercase">Target</span>
                          <p className="text-[13px] font-bold text-blue-600 tracking-tight">{entry.target}</p>
                        </div>
                      </div>
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeGlossaryEntry(entry.id)}
                        className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Controls */}
      {/* Document Analysis Overlay */}
      <AnimatePresence>
        {showAnalysis && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isAnalyzing && setShowAnalysis(false)}
              className="absolute inset-0 bg-slate-900/10 backdrop-blur-md z-40 rounded-3xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] z-50 overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div>
                  <h3 className="text-[13px] font-bold text-slate-800 uppercase tracking-[0.15em] flex items-center gap-2">
                    <FileSearch className="w-4 h-4 text-blue-600" />
                    Semantic Analysis
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Deep Linguistic Extraction</p>
                </div>
                {!isAnalyzing && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAnalysis(false)}
                    className="p-2.5 hover:bg-slate-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </motion.button>
                )}
              </div>

              <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-slate-50 border-t-blue-600 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-blue-600 animate-pulse" />
                         </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] font-bold text-slate-800 uppercase tracking-widest">Processing Linguistic Data</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Extracting themes & semantic structures...</p>
                    </div>
                  </div>
                ) : analysisResult ? (
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Executive Summary</label>
                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[14px] text-slate-700 leading-relaxed font-medium">{analysisResult.summary}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50/50 border border-blue-50 rounded-2xl">
                         <label className="text-[8px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Volume</label>
                         <p className="text-[13px] font-bold text-blue-600">{analysisResult.wordCount} Semantic Units</p>
                      </div>
                      <div className="p-4 bg-purple-50/50 border border-purple-50 rounded-2xl">
                         <label className="text-[8px] font-bold text-purple-400 uppercase tracking-widest block mb-1">Complexity</label>
                         <p className="text-[13px] font-bold text-purple-600">{analysisResult.complexity}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Dominant Themes</label>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.themes.map((theme, i) => (
                          <motion.span 
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="px-4 py-2 bg-white border border-slate-100 text-slate-600 rounded-xl text-[11px] font-bold shadow-sm"
                          >
                            {theme}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <X className="w-12 h-12 text-red-100 mx-auto mb-4" />
                    <p className="text-[13px] font-bold text-slate-800 uppercase tracking-widest">Analysis Fault</p>
                    <p className="text-[11px] text-slate-500 mt-2">{error}</p>
                  </div>
                ) : null}
              </div>

              {!isAnalyzing && (
                <div className="p-5 bg-[#FBFBFD] border-t border-slate-100 flex justify-end">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAnalysis(false)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-100"
                  >
                    Acknowledge
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-3 bg-white/80 backdrop-blur-md p-1.5 sm:p-2 border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
        <div className="flex items-center gap-1 sm:gap-2">
          <motion.button
            whileHover={{ backgroundColor: "rgba(241, 245, 249, 1)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowPackManager(true)}
            className="p-2 sm:p-3 bg-slate-50 text-slate-500 hover:text-blue-600 rounded-xl sm:rounded-[14px] transition-all flex items-center gap-2 group whitespace-nowrap"
          >
            <Settings2 className="w-4 sm:w-4.5 h-4 sm:h-4.5 group-hover:rotate-45 transition-transform duration-500" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hidden xs:inline">Storage</span>
          </motion.button>

          <motion.button
            whileHover={{ backgroundColor: "rgba(241, 245, 249, 1)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowGlossary(true)}
            className="p-2 sm:p-3 bg-slate-50 text-slate-500 hover:text-blue-600 rounded-xl sm:rounded-[14px] transition-all flex items-center gap-2 group whitespace-nowrap"
          >
            <BookMarked className="w-4 sm:w-4.5 h-4 sm:h-4.5 group-hover:scale-110 transition-transform duration-500" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hidden xs:inline">Glossary</span>
          </motion.button>

          <motion.button
            whileHover={{ backgroundColor: "rgba(241, 245, 249, 1)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.pdf,.docx,image/*';
              input.onchange = (e) => handleDocumentAnalysis(e as any);
              input.click();
            }}
            className="p-2 sm:p-3 bg-slate-50 text-slate-500 hover:text-blue-600 rounded-xl sm:rounded-[14px] transition-all flex items-center gap-2 group whitespace-nowrap"
          >
            <FileText className="w-4 sm:w-4.5 h-4 sm:h-4.5 group-hover:scale-110 transition-transform duration-500" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hidden xs:inline">Analysis</span>
          </motion.button>
        </div>
        
        <div className="w-px h-6 sm:h-8 bg-slate-100 hidden sm:block" />

        <div className="flex items-center gap-3 sm:gap-5 px-1 sm:px-3">
          <div className="flex flex-col gap-1 sm:gap-1.5 min-w-[70px] sm:min-w-[90px]">
            <div className="flex justify-between items-center">
              <label className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rate</label>
              <span className="text-[8px] sm:text-[9px] font-bold text-blue-600">{speechRate}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        <div className="w-px h-6 sm:h-8 bg-slate-100 hidden md:block" />

        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl sm:rounded-2xl">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <motion.button
              key={t}
              whileTap={{ scale: 0.9 }}
              onClick={() => setTheme(t)}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all relative ${
                theme === t 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
              }`}
              title={`${t.charAt(0).toUpperCase() + t.slice(1)} Mode`}
            >
              {t === 'light' && <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
              {t === 'dark' && <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
              {t === 'system' && <Monitor className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
              {theme === t && (
                <motion.div
                  layoutId="activeTheme"
                  className="absolute inset-0 bg-white rounded-lg sm:rounded-xl -z-10 shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          ))}
        </div>

        <div className="hidden sm:block w-px h-8 bg-slate-100" />

        <div className="flex-1 flex items-center gap-2 min-w-[200px] w-full sm:w-auto">
          <div className="relative flex-1">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="w-full py-2 sm:py-2.5 pl-3 pr-8 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-700 bg-[#F5F5F7] hover:bg-[#EBEBEF] border-none focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
              {downloadedPacks.includes(sourceLang) && <DownloadCloud className="w-3 h-3 text-blue-500" />}
              <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-slate-400 rotate-45 transform -translate-y-0.5" />
            </div>
          </div>

          <motion.button
            whileHover={{ rotate: 180 }}
            whileTap={{ scale: 0.8 }}
            onClick={swapLanguages}
            className="p-2 sm:p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 shrink-0"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </motion.button>

          <div className="relative flex-1">
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full py-2 sm:py-2.5 pl-3 pr-8 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-700 bg-[#F5F5F7] hover:bg-[#EBEBEF] border-none focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer"
            >
              {LANGUAGES.filter(l => l.code !== 'auto').map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
              {downloadedPacks.includes(targetLang) && <DownloadCloud className="w-3 h-3 text-blue-500" />}
              <div className="w-1.5 h-1.5 border-b-2 border-r-2 border-slate-400 rotate-45 transform -translate-y-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Input Areas */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-0 border rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex-1 min-h-[550px] ring-1 ring-black/5 transition-colors duration-500 ${
        resolvedTheme === 'dark' 
          ? 'bg-slate-900 border-slate-800' 
          : 'bg-white border-slate-100'
      }`}>
        {/* Source */}
        <div className={`flex flex-col p-6 md:p-10 border-b lg:border-b-0 lg:border-r transition-colors duration-500 ${
          resolvedTheme === 'dark' ? 'border-slate-800' : 'border-slate-50'
        }`}>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Source Input</span>
            <div className="flex gap-1">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={startListening}
                className={`p-2.5 md:p-3 rounded-2xl transition-all ${
                  isListening 
                    ? 'bg-red-50 text-red-600 shadow-inner' 
                    : resolvedTheme === 'dark'
                      ? 'hover:bg-slate-800 text-slate-500 hover:text-blue-400'
                      : 'hover:bg-slate-50 text-slate-400 hover:text-blue-600'
                }`}
                title="Dictate Source"
              >
                {isListening ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => speakText(sourceText, sourceLang)}
                className={`p-2.5 md:p-3 rounded-2xl transition-all ${
                  isSpeaking 
                    ? 'bg-blue-50 text-blue-600' 
                    : resolvedTheme === 'dark'
                      ? 'hover:bg-slate-800 text-slate-500 hover:text-blue-400'
                      : 'hover:bg-slate-50 text-slate-400 hover:text-blue-600'
                }`}
                title="Speak Source"
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => copyToClipboard(sourceText)}
                className={`p-2.5 md:p-3 rounded-2xl transition-all ${
                  resolvedTheme === 'dark'
                    ? 'hover:bg-slate-800 text-slate-500 hover:text-blue-400'
                    : 'hover:bg-slate-50 text-slate-400 hover:text-blue-600'
                }`}
                title="Copy Source"
              >
                <Copy className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            onBlur={() => handleTranslate()}
            placeholder="Enter text to translate..."
            className={`flex-1 w-full text-lg md:text-2xl placeholder:text-slate-200 bg-transparent border-none focus:ring-0 resize-none font-semibold leading-[1.6] transition-colors duration-500 ${
              resolvedTheme === 'dark' ? 'text-white' : 'text-slate-800'
            }`}
          />
          <div className="pt-6 md:pt-8 flex justify-between items-center">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{sourceText.length} Characters</span>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTranslate()}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg transition-all ${
                resolvedTheme === 'dark'
                  ? 'bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-500'
                  : 'bg-slate-900 text-white shadow-slate-100 hover:bg-black'
              }`}
            >
              Translate
            </motion.button>
          </div>
        </div>

        {/* Target */}
        <div className={`flex flex-col p-6 md:p-10 transition-colors duration-500 ${
          resolvedTheme === 'dark' ? 'bg-slate-900/50' : 'bg-[#FBFBFD]/50'
        }`}>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2 md:w-2.5 h-2 md:h-2.5 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Target Translation</span>
            </div>
            <div className="flex items-center gap-1">
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handlePhonetic}
                disabled={isPhoneticLoading || !translatedText}
                className={`p-2.5 md:p-3 rounded-2xl shadow-sm border transition-all disabled:opacity-50 ${
                  resolvedTheme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400'
                    : 'bg-white border-slate-100 text-slate-400 hover:text-blue-600'
                }`}
                title="Generate Phonetic Guide"
              >
                <AudioLines className={`w-5 h-5 ${isPhoneticLoading ? 'animate-pulse' : ''}`} />
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => speakText(translatedText, targetLang)}
                className={`p-2.5 md:p-3 rounded-2xl shadow-sm border transition-all ${
                  isSpeaking 
                    ? 'text-blue-600 border-blue-100' 
                    : resolvedTheme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400'
                      : 'bg-white border-slate-100 text-slate-400 hover:text-blue-600'
                }`}
                title="Speak Translation"
              >
                {isSpeaking ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => copyToClipboard(translatedText)}
                className={`p-2.5 md:p-3 rounded-2xl shadow-sm border transition-all ${
                  resolvedTheme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400'
                    : 'bg-white border-slate-100 text-slate-400 hover:text-blue-600'
                }`}
                title="Copy Result"
              >
                <Copy className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
          
          <div className={`flex-1 overflow-y-auto text-lg md:text-2xl font-semibold leading-[1.6] transition-colors duration-500 ${
            resolvedTheme === 'dark' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {isTranslating ? (
              <div className="space-y-6">
                <div className="h-6 bg-slate-100 rounded-lg w-full animate-pulse"></div>
                <div className="h-6 bg-slate-100 rounded-lg w-[94%] animate-pulse delay-75"></div>
                <div className="h-6 bg-slate-100 rounded-lg w-[85%] animate-pulse delay-150"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-6">
                <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center text-red-500">
                  <CloudOff className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-slate-800 uppercase tracking-widest">Translation Error</h4>
                  <p className="text-[12px] text-slate-500 mt-2 max-w-xs leading-relaxed font-medium">{error}</p>
                </div>
                {!downloadedPacks.includes(targetLang) && (
                  <motion.button 
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleDownloadPack(targetLang)}
                    disabled={isDownloading === targetLang}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {isDownloading === targetLang ? (
                      <>Syncing Assets...</>
                    ) : (
                      <>
                        <DownloadCloud className="w-4 h-4" />
                        Download {LANGUAGES.find(l => l.code === targetLang)?.name} Pack
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            ) : translatedText ? (
              <AnimatePresence mode="wait">
                <motion.p
                  key={translatedText}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`whitespace-pre-wrap font-bold transition-colors duration-500 ${
                    resolvedTheme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                  }`}
                >
                  {translatedText}
                </motion.p>
              </AnimatePresence>
            ) : (
              <p className={`font-bold transition-colors duration-500 ${
                resolvedTheme === 'dark' ? 'text-slate-700' : 'text-slate-200'
              }`}>Waiting for input...</p>
            )}

            {(phoneticText || isPhoneticLoading) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`mt-8 p-6 backdrop-blur-md border rounded-[24px] relative group/phonetic shadow-sm transition-colors duration-500 ${
                  resolvedTheme === 'dark' 
                    ? 'bg-blue-900/20 border-blue-900/50' 
                    : 'bg-blue-50/50 border-blue-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AudioLines className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] block">Phonetic Guide</span>
                  </div>
                  {!isPhoneticLoading && phoneticText && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => speakText(translatedText, targetLang)}
                      className={`p-1.5 rounded-lg transition-all ${
                        isSpeaking 
                          ? 'bg-blue-100 text-blue-700' 
                          : resolvedTheme === 'dark'
                            ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60'
                            : 'bg-blue-100/50 text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Play Pronunciation"
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </motion.button>
                  )}
                </div>
                {isPhoneticLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`w-1 h-3 bg-blue-300 rounded-full animate-bounce`} style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Generating...</span>
                  </div>
                ) : (
                  <p className={`text-[15px] font-mono font-medium tracking-tight leading-relaxed transition-colors duration-500 ${
                    resolvedTheme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                  }`}>{phoneticText}</p>
                )}
                <button 
                  onClick={() => setPhoneticText("")}
                  className="absolute top-4 right-4 p-1.5 text-blue-200 hover:text-blue-500 opacity-0 group-hover/phonetic:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </div>
          
          <div className="pt-8 flex justify-end">
             <motion.button 
               whileTap={{ scale: 0.95 }}
               className={`px-6 py-2.5 rounded-2xl border text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all duration-500 ${
                 resolvedTheme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-100 text-slate-800 hover:bg-slate-50'
               }`}
              >
                Save Transcript
             </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
