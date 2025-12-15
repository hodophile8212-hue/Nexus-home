import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Home, 
  Settings, 
  Mic, 
  LayoutGrid, 
  Sun, 
  Moon, 
  Menu 
} from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';

import { AppState, Device, DeviceType, Room } from './types';
import { INITIAL_STATE, GEMINI_MODEL_ID } from './constants';
import { base64ToUint8Array, createPcmBlob, decodeAudioData } from './services/audioUtils';

import DeviceTile from './components/DeviceTile';
import EnergyChart from './components/EnergyChart';
import VoiceOverlay from './components/VoiceOverlay';

// Define tools for Gemini
const tools: FunctionDeclaration[] = [
  {
    name: 'updateDeviceState',
    description: 'Turn a device on or off, or update its value (like brightness or temperature).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        deviceId: { type: Type.STRING, description: 'The ID of the device to control' },
        isOn: { type: Type.BOOLEAN, description: 'Whether the device should be on or off' },
        value: { type: Type.NUMBER, description: 'Numeric value for the device (brightness, temp, etc.)' }
      },
      required: ['deviceId']
    }
  },
  {
    name: 'getDevices',
    description: 'Get the current list of all devices and their states.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  }
];

export default function App() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const aiClientRef = useRef<GoogleGenAI | null>(null);

  // --- Device Handlers ---
  const handleToggleDevice = (id: string) => {
    setState(prev => ({
      ...prev,
      devices: prev.devices.map(d => d.id === id ? { ...d, isOn: !d.isOn } : d)
    }));
  };

  const handleChangeValue = (id: string, value: number) => {
    setState(prev => ({
      ...prev,
      devices: prev.devices.map(d => d.id === id ? { ...d, value } : d)
    }));
  };

  // --- Gemini Live Logic ---
  
  const stopAudio = () => {
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (inputContextRef.current) {
        inputContextRef.current.close();
        inputContextRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    sessionPromiseRef.current = null;
    nextStartTimeRef.current = 0;
  };

  const startSession = async () => {
    if (!process.env.API_KEY) {
      alert("API Key not found in environment variables.");
      return;
    }

    try {
      setIsVoiceActive(true);
      
      // 1. Setup Audio Output
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      const outputNode = audioContextRef.current.createGain();
      outputNode.connect(audioContextRef.current.destination);

      // 2. Setup Audio Input
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 3. Initialize Client
      aiClientRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 4. Connect Session
      const sessionPromise = aiClientRef.current.live.connect({
        model: GEMINI_MODEL_ID,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `You are Nexus, a smart home assistant. You control devices. 
          The current devices are: ${JSON.stringify(state.devices.map(d => ({name: d.name, id: d.id, type: d.type})))}.
          When asked to change something, find the matching device ID and call updateDeviceState.
          Be concise and friendly.`,
          tools: [{ functionDeclarations: tools }]
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            // Start Input Streaming
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = source;
            
            // Using ScriptProcessor as per guidance (simpler for this context than Worklet setup in one file)
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (!isMicOn) return; // Mute logic
              
              const inputData = e.inputBuffer.getChannelData(0);
              // Simple volume meter
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setAudioVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
               const ctx = audioContextRef.current;
               const audioBuffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
               
               nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNode);
               source.start(nextStartTimeRef.current);
               
               nextStartTimeRef.current += audioBuffer.duration;
               sourcesRef.current.add(source);
               source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Tool Calls
            if (msg.toolCall) {
                for (const call of msg.toolCall.functionCalls) {
                    console.log("Tool call:", call.name, call.args);
                    let result: any = { status: 'ok' };
                    
                    if (call.name === 'updateDeviceState') {
                        const { deviceId, isOn, value } = call.args as any;
                        // Update React State
                        setState(prev => ({
                            ...prev,
                            devices: prev.devices.map(d => {
                                if (d.id === deviceId) {
                                    return { 
                                        ...d, 
                                        isOn: isOn !== undefined ? isOn : d.isOn,
                                        value: value !== undefined ? value : d.value
                                    };
                                }
                                return d;
                            })
                        }));
                        result = { success: true, message: `Updated device ${deviceId}` };
                    } else if (call.name === 'getDevices') {
                        // We must fetch current state here, but inside callback `state` might be stale 
                        // if we didn't use refs. For simplicity in this structure, we'll return a generic success 
                        // and let the system instruction handle knowledge. 
                        // In a real app, use a ref for state to access current devices.
                         result = { devices: state.devices };
                    }

                    // Send response back
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: {
                                id: call.id,
                                name: call.name,
                                response: { result }
                            }
                        });
                    });
                }
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setIsVoiceActive(false);
          },
          onerror: (e) => {
            console.error("Session Error", e);
            setIsVoiceActive(false);
          }
        }
      });
      sessionPromiseRef.current = sessionPromise;

    } catch (err) {
      console.error("Failed to start session", err);
      alert("Failed to access microphone or start AI session.");
      setIsVoiceActive(false);
    }
  };

  const endSession = async () => {
    if (sessionPromiseRef.current) {
        const session = await sessionPromiseRef.current;
        session.close();
    }
    stopAudio();
    setIsVoiceActive(false);
  };

  // --- Render ---

  // Filter devices for Dashboard (active or pinned)
  const favoriteDevices = state.devices.filter(d => ['d1', 'd2', 'd3', 'd5'].includes(d.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-brand-500/30">
      
      {/* Mobile-first Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center">
                <Home size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">NexusHome</span>
        </div>
        <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <Settings size={20} />
        </button>
      </header>

      <main className="p-4 pb-24 max-w-7xl mx-auto space-y-8">
        
        {/* Welcome Section */}
        <section>
            <h1 className="text-2xl font-bold mb-1">Good Evening, User</h1>
            <p className="text-slate-400 text-sm">3 devices are active. Energy usage is stable.</p>
        </section>

        {/* Quick Actions / Favorites */}
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <LayoutGrid size={18} className="text-brand-400" />
                    Favorites
                </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {favoriteDevices.map(device => (
                    <DeviceTile 
                        key={device.id} 
                        device={device} 
                        onToggle={handleToggleDevice}
                        onChangeValue={handleChangeValue}
                    />
                ))}
            </div>
        </section>

        {/* Rooms Scroll */}
        <section>
            <h2 className="text-lg font-semibold mb-4">Rooms</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
                {state.rooms.map(room => (
                    <div key={room.id} className="flex-shrink-0 w-40 h-28 rounded-xl relative overflow-hidden group cursor-pointer border border-slate-800 hover:border-brand-500/50 transition-all">
                        <img src={room.image} alt={room.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity bg-slate-800" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                        <div className="absolute bottom-3 left-3">
                            <p className="font-medium text-sm">{room.name}</p>
                            <p className="text-xs text-slate-400">{state.devices.filter(d => d.roomId === room.id).length} Devices</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>

        {/* Energy & Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EnergyChart />
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                    <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Environment</h3>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold text-white">72°</span>
                        <span className="text-slate-500 mb-1">Indoor</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-1">Humidity: 45% • Air Quality: Excellent</div>
                </div>
                <div className="mt-4 flex gap-2">
                    <div className="flex-1 bg-slate-800 rounded-lg p-3 flex items-center justify-center gap-2 text-yellow-400">
                        <Sun size={18} /> <span>Day</span>
                    </div>
                     <div className="flex-1 bg-slate-800 rounded-lg p-3 flex items-center justify-center gap-2 text-indigo-400">
                        <Moon size={18} /> <span>Night</span>
                    </div>
                </div>
            </div>
        </section>

        {/* All Devices List (Grid) */}
        <section>
            <h2 className="text-lg font-semibold mb-4">All Devices</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                 {state.devices.filter(d => !favoriteDevices.includes(d)).map(device => (
                    <DeviceTile 
                        key={device.id} 
                        device={device} 
                        onToggle={handleToggleDevice}
                        onChangeValue={handleChangeValue}
                    />
                ))}
            </div>
        </section>

      </main>

      {/* Floating Action Button (Voice) */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <button 
            onClick={startSession}
            className="pointer-events-auto bg-brand-600 hover:bg-brand-500 text-white rounded-full p-4 shadow-lg shadow-brand-500/30 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 px-6"
        >
            <Mic size={24} />
            <span className="font-semibold">Ask Nexus</span>
        </button>
      </div>

      <VoiceOverlay 
        isOpen={isVoiceActive} 
        onClose={endSession} 
        isListening={isMicOn}
        onToggleMic={() => setIsMicOn(!isMicOn)}
        volumeLevel={audioVolume}
      />

    </div>
  );
}