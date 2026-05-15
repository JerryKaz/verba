import React, { useState } from 'react';
import { ArrowRightLeft, Calendar, Filter, History, Languages, RotateCcw, Scan, Search, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TranslationResult, LANGUAGES } from '../types';

interface HistorySidebarProps {
  history: TranslationResult[];
  onSelect: (item: TranslationResult) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function HistorySidebar({ history, onSelect, onDelete, onClear, isOpen, onClose }: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sourceLangFilter, setSourceLangFilter] = useState('all');
  const [targetLangFilter, setTargetLangFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all'); // all, today, week, month

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.translatedText.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSource = sourceLangFilter === 'all' || item.sourceLang === sourceLangFilter;
    const matchesTarget = targetLangFilter === 'all' || item.targetLang === targetLangFilter;
    
    let matchesDate = true;
    if (dateRange !== 'all') {
      const now = Date.now();
      const itemTime = item.timestamp;
      const diffDays = (now - itemTime) / (1000 * 60 * 60 * 24);
      
      if (dateRange === 'today') matchesDate = diffDays < 1;
      else if (dateRange === 'week') matchesDate = diffDays < 7;
      else if (dateRange === 'month') matchesDate = diffDays < 30;
    }

    return matchesSearch && matchesSource && matchesTarget && matchesDate;
  });

  const resetFilters = () => {
    setSearchQuery('');
    setSourceLangFilter('all');
    setTargetLangFilter('all');
    setDateRange('all');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed inset-y-0 left-0 w-80 bg-white/95 backdrop-blur-xl border-r border-slate-100 z-50 flex flex-col shadow-[20px_0_50px_rgba(0,0,0,0.02)] lg:shadow-none lg:static lg:translate-x-0"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-[0.2em]">Activity Log</h2>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2.5 hover:bg-slate-50 rounded-full lg:hidden transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </motion.button>
        </div>

        {/* Search & Filter Controls */}
        <div className="px-6 pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F5F5F7] border-none rounded-2xl py-2.5 pl-10 pr-4 text-[13px] font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-2xl transition-all ${showFilters ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-[#F5F5F7] text-slate-400 hover:text-slate-600'}`}
            >
              <Filter className="w-4 h-4" />
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0, scale: 0.95 }}
                animate={{ height: 'auto', opacity: 1, scale: 1 }}
                exit={{ height: 0, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="overflow-hidden space-y-4 bg-[#FBFBFD] p-5 rounded-3xl border border-slate-50 shadow-sm"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Origin</label>
                    <select
                      value={sourceLangFilter}
                      onChange={(e) => setSourceLangFilter(e.target.value)}
                      className="w-full bg-white border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-50/50 appearance-none cursor-pointer"
                    >
                      <option value="all">All Sources</option>
                      {LANGUAGES.map(l => <option key={`src-${l.code}`} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Result</label>
                    <select
                      value={targetLangFilter}
                      onChange={(e) => setTargetLangFilter(e.target.value)}
                      className="w-full bg-white border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-50/50 appearance-none cursor-pointer"
                    >
                      <option value="all">All Targets</option>
                      {LANGUAGES.filter(l => l.code !== 'auto').map(l => <option key={`tgt-${l.code}`} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-white border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-50/50 appearance-none cursor-pointer"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Past 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={resetFilters}
                  className="w-full py-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-[0.1em] bg-white border border-slate-100 rounded-xl shadow-sm"
                >
                  Reset Filters
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-5">
              <div className="w-16 h-16 bg-[#F5F5F7] rounded-[24px] flex items-center justify-center text-slate-200">
                <History className="w-8 h-8" />
              </div>
              <p className="text-[12px] text-slate-300 font-bold uppercase tracking-widest">
                {searchQuery || sourceLangFilter !== 'all' || targetLangFilter !== 'all' || dateRange !== 'all' 
                  ? 'No Matches Found' 
                  : 'No History Yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((item, i) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative bg-[#FBFBFD] hover:bg-white border border-transparent hover:border-blue-100 rounded-2xl p-4 transition-all cursor-pointer hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)] ring-1 ring-black/0 hover:ring-black/5"
                  onClick={() => onSelect(item)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded-md">{item.sourceLang === 'auto' ? 'AUTO' : item.sourceLang.toUpperCase()}</span>
                      <ArrowRightLeft className="w-2.5 h-2.5 text-blue-500" />
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md">{item.targetLang.toUpperCase()}</span>
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold uppercase">
                      {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-600 line-clamp-2 font-semibold leading-relaxed tracking-tight">
                    {item.sourceText}
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="absolute -top-1 -right-1 p-2 bg-white shadow-lg border border-slate-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="p-8 border-t border-slate-50 bg-white/50">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClear}
              className="w-full py-3 px-5 flex items-center justify-center gap-2.5 text-[11px] font-bold text-red-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all uppercase tracking-widest border border-red-50 shadow-sm"
            >
              Clear All History
            </motion.button>
          </div>
        )}
      </motion.aside>
    </>
  );
}
