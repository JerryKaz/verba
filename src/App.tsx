import { Globe, History, Menu, ScanText, Type, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { DocumentScanner } from './components/DocumentScanner';
import { HistorySidebar } from './components/HistorySidebar';
import { TranslationView } from './components/TranslationView';
import { AIChatBot } from './components/AIChatBot';
import { TranslationResult } from './types';

export default function App() {
  const [history, setHistory] = useState<TranslationResult[]>([]);
  const [activeTab, setActiveTab] = useState<'text' | 'scanner' | 'assistant'>('text');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Selected history item to display in view
  const [selectedItem, setSelectedItem] = useState<TranslationResult | null>(null);
  const [targetLang, setTargetLang] = useState('es');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('lingoscan_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lingoscan_history', JSON.stringify(history));
  }, [history]);

  const handleTranslated = (sourceText: string, translatedText: string, sourceLang: string, targetLang: string, isOcr = false) => {
    const newResult: TranslationResult = {
      id: Math.random().toString(36).substr(2, 9),
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      timestamp: Date.now(),
      isOcr
    };
    
    // De-duplicate: don't add if the last one is the same
    if (history.length > 0 && history[0].sourceText === sourceText && history[0].targetLang === targetLang) {
      return;
    }

    setHistory(prev => [newResult, ...prev].slice(0, 50));
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm("Clear all translation history?")) {
      setHistory([]);
    }
  };

  const selectHistoryItem = (item: TranslationResult) => {
    setSelectedItem(item);
    setActiveTab(item.isOcr ? 'text' : 'text'); // Open in text view for editing/viewing
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      
      <HistorySidebar 
        history={history}
        onSelect={selectHistoryItem}
        onDelete={deleteHistoryItem}
        onClear={clearHistory}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-[0_0_40px_rgba(0,0,0,0.04)] lg:shadow-none overflow-hidden h-full">
        {/* Header */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden hover:bg-slate-50 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
            </motion.button>
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.div 
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: 0, scale: 1 }}
                className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg sm:rounded-[10px] flex items-center justify-center shadow-lg shadow-blue-200"
              >
                <Globe className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">Verba</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-slate-100/80 p-1 rounded-[14px]">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-[10px] text-[10px] sm:text-[11px] font-bold transition-all duration-200 ${
                activeTab === 'text' ? 'bg-white text-blue-600 shadow-md shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span className="hidden xs:inline uppercase tracking-wider">Text</span>
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-[10px] text-[10px] sm:text-[11px] font-bold transition-all duration-200 ${
                activeTab === 'scanner' ? 'bg-white text-blue-600 shadow-md shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ScanText className="w-3.5 h-3.5" />
              <span className="hidden xs:inline uppercase tracking-wider">Scan</span>
            </button>
            <button
              onClick={() => setActiveTab('assistant')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-[10px] text-[10px] sm:text-[11px] font-bold transition-all duration-200 ${
                activeTab === 'assistant' ? 'bg-white text-blue-600 shadow-md shadow-slate-200/50' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden xs:inline uppercase tracking-wider">Assistant</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#FBFBFD]">
          <div className="max-w-5xl mx-auto p-4 sm:p-10 lg:p-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ 
                  type: "spring",
                  damping: 25,
                  stiffness: 200,
                  mass: 0.5
                }}
              >
                {activeTab === 'text' ? (
                  <TranslationView 
                    isOnline={isOnline}
                    onTranslated={(src, res, sl, tl) => {
                      setTargetLang(tl);
                      handleTranslated(src, res, sl, tl);
                    }}
                    initialSource={selectedItem?.sourceText}
                    initialResult={selectedItem?.translatedText}
                    initialSLang={selectedItem?.sourceLang}
                    initialTLang={selectedItem?.targetLang || targetLang}
                  />
                ) : activeTab === 'scanner' ? (
                  <DocumentScanner 
                    targetLang={targetLang}
                    onResult={(original, translation) => {
                      handleTranslated(original, translation, "auto", targetLang, true);
                      setSelectedItem({
                        id: 'scanner-temp',
                        sourceText: original,
                        translatedText: translation,
                        sourceLang: 'auto',
                        targetLang: targetLang,
                        timestamp: Date.now(),
                        isOcr: true
                      });
                      setActiveTab('text');
                    }}
                  />
                ) : (
                  <AIChatBot />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Feature Highlights */}
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                { icon: Globe, title: "Cloud Engine", desc: "Powered by Gemini for professional-grade translation quality.", color: "bg-blue-50 text-blue-600" },
                { icon: ScanText, title: "Offline Support", desc: "Local dictionaries provide reliable results without connectivity.", color: "bg-purple-50 text-purple-600" },
                { icon: History, title: "History Sync", desc: "Your past translations are securely stored and easily accessible.", color: "bg-emerald-50 text-emerald-600" }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="group p-6 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-10 h-10 ${feature.color} rounded-[14px] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-[13px] uppercase tracking-[0.1em]">{feature.title}</h4>
                  <p className="mt-2 text-[11px] text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* StatusBar Footer */}
        <footer className="h-8 bg-white border-t border-slate-100/50 px-6 flex items-center justify-between text-[9px] shrink-0 font-bold uppercase tracking-widest text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-blue-500 animate-pulse' : 'bg-orange-500'}`}></span>
              {isOnline ? 'Cloud' : 'Offline'}
            </span>
            <span className="text-slate-200">|</span>
            <span>{isOnline ? 'Gemini 1.5' : 'Local Engine'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-300">v1.0.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
