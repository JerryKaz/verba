import { Camera, RefreshCw, ScanText, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useRef, useState } from 'react';
import { translateDocument } from '../services/ai';

interface DocumentScannerProps {
  onResult: (original: string, translation: string) => void;
  targetLang: string;
}

export function DocumentScanner({ onResult, targetLang }: DocumentScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      setPreview(dataUrl);
      stopCamera();
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setShowCamera(false);
  };

  const processImage = async () => {
    if (!preview) return;
    setIsScanning(true);
    try {
      const { text, translation } = await translateDocument(preview, targetLang);
      onResult(text, translation);
      setPreview(null);
    } catch (err) {
      console.error(err);
      alert("Failed to process document.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-6 md:p-10 border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] space-y-6 md:space-y-10 ring-1 ring-black/5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2 md:gap-3">
            <ScanText className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            Document Scanner
          </h3>
          <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 md:mt-2">Professional OCR Engine</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!preview && !showCamera ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8"
          >
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 246, 255, 0.5)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-4 md:gap-8 p-10 md:p-16 border-2 border-dashed border-slate-100 bg-slate-50/30 rounded-[28px] md:rounded-[32px] hover:border-blue-200 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 md:opacity-10">
                <Upload className="w-16 h-16 md:w-24 md:h-24" />
              </div>
              <div className="p-4 md:p-5 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl md:rounded-2xl group-hover:shadow-blue-100 transition-all">
                <Upload className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-slate-800 text-[14px] md:text-[15px] tracking-tight">Upload File</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">PDF • IMAGE • SCAN</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*"
              />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "rgba(239, 246, 255, 0.5)" }}
              whileTap={{ scale: 0.98 }}
              onClick={startCamera}
              className="flex flex-col items-center justify-center gap-4 md:gap-8 p-10 md:p-16 border-2 border-dashed border-slate-100 bg-slate-50/30 rounded-[28px] md:rounded-[32px] hover:border-blue-200 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 md:opacity-10">
                <Camera className="w-16 h-16 md:w-24 md:h-24" />
              </div>
              <div className="p-4 md:p-5 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl md:rounded-2xl group-hover:shadow-blue-100 transition-all">
                <Camera className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
              </div>
              <div className="text-center">
                <span className="block font-bold text-slate-800 text-[14px] md:text-[15px] tracking-tight">Live Capture</span>
                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">Real-time Analysis</span>
              </div>
            </motion.button>
          </motion.div>
        ) : showCamera ? (
          <motion.div 
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-[28px] md:rounded-[32px] overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-900 shadow-2xl shadow-slate-200"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 border-[20px] md:border-[60px] border-black/20 pointer-events-none"></div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 md:w-64 md:h-64 border border-white/30 rounded-3xl border-dashed"></div>
            </div>
            <div className="absolute bottom-6 md:bottom-10 left-0 right-0 flex justify-center items-center gap-6 md:gap-12">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={stopCamera}
                className="p-4 md:p-5 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full text-white hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={capturePhoto}
                className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-2xl"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 border-2 border-slate-100 rounded-full flex items-center justify-center">
                   <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full"></div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 md:space-y-8"
          >
            <div className="relative rounded-[32px] md:rounded-[40px] overflow-hidden bg-[#FBFBFD] border border-slate-100 aspect-video group shadow-inner">
              <img src={preview!} alt="Preview" className="w-full h-full object-contain p-4" />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setPreview(null)}
                className="absolute top-4 md:top-6 right-4 md:right-6 p-2 md:p-3 bg-slate-900/10 backdrop-blur-xl rounded-xl md:rounded-2xl text-slate-800 hover:bg-slate-900/20 transition-all border border-white/20 shadow-sm"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={processImage}
              disabled={isScanning}
              className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-[20px] md:rounded-[24px] font-bold text-[11px] md:text-[12px] flex items-center justify-center gap-3 md:gap-4 hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-slate-200 uppercase tracking-[0.2em]"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <ScanText className="w-5 h-5" />
                  Process Document
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
