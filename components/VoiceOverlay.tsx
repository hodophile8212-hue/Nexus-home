import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, Activity } from 'lucide-react';

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  onToggleMic: () => void;
  volumeLevel: number; // 0 to 1 for visualizing audio
}

const VoiceOverlay: React.FC<VoiceOverlayProps> = ({ isOpen, onClose, isListening, onToggleMic, volumeLevel }) => {
  if (!isOpen) return null;

  // Simple visualizer bars
  const bars = [1, 2, 3, 4, 5];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300">
      <div className="w-full max-w-md p-8 flex flex-col items-center">
        
        {/* Visualizer Circle */}
        <div className="relative mb-12">
           <div className={`absolute inset-0 rounded-full bg-brand-500/20 blur-3xl transition-transform duration-100 ease-linear`} 
                style={{ transform: `scale(${1 + volumeLevel * 2})` }}
           />
           <div className="w-32 h-32 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center relative z-10 shadow-2xl shadow-brand-500/10">
                <div className="flex items-center gap-1 h-12">
                    {bars.map((i) => (
                        <div 
                            key={i}
                            className="w-2 bg-brand-400 rounded-full transition-all duration-75"
                            style={{ 
                                height: `${Math.max(10, volumeLevel * 100 * (Math.random() + 0.5))}px`,
                                opacity: isListening ? 1 : 0.3
                            }}
                        />
                    ))}
                </div>
           </div>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-2">Nexus Assistant</h2>
        <p className="text-slate-400 mb-12 text-center">Listening... Ask to turn on lights or set temperature.</p>

        <div className="flex items-center gap-6">
            <button 
                onClick={onToggleMic}
                className={`p-4 rounded-full transition-colors ${isListening ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
            >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            <button 
                onClick={onClose}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
            >
                <X size={24} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceOverlay;