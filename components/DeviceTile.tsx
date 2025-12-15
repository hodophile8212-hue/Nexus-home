import React from 'react';
import { Device, DeviceType } from '../types';
import { Lightbulb, Thermometer, Lock, Video, Speaker, Power, LockOpen } from 'lucide-react';

interface DeviceTileProps {
  device: Device;
  onToggle: (id: string) => void;
  onChangeValue?: (id: string, value: number) => void;
}

const DeviceTile: React.FC<DeviceTileProps> = ({ device, onToggle, onChangeValue }) => {
  const getIcon = () => {
    switch (device.type) {
      case DeviceType.LIGHT: return <Lightbulb className={device.isOn ? "text-yellow-400" : "text-slate-400"} />;
      case DeviceType.THERMOSTAT: return <Thermometer className="text-orange-400" />;
      case DeviceType.LOCK: return device.isOn ? <Lock className="text-red-400" /> : <LockOpen className="text-green-400" />;
      case DeviceType.CAMERA: return <Video className="text-blue-400" />;
      case DeviceType.SPEAKER: return <Speaker className="text-purple-400" />;
      default: return <Power />;
    }
  };

  const bgColor = device.isOn ? 'bg-slate-800 border-brand-500/50' : 'bg-slate-900 border-slate-800';
  const textColor = device.isOn ? 'text-slate-100' : 'text-slate-400';

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${bgColor} ${textColor} hover:border-brand-500/30 group relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-full bg-slate-950/50 backdrop-blur-sm transition-colors duration-300 ${device.isOn ? 'text-brand-400' : 'text-slate-600'}`}>
          {getIcon()}
        </div>
        
        {device.type !== DeviceType.THERMOSTAT && (
            <button 
                onClick={() => onToggle(device.id)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ${device.isOn ? 'bg-brand-500' : 'bg-slate-700'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${device.isOn ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
        )}
      </div>

      <h3 className="font-semibold text-lg truncate mb-1">{device.name}</h3>
      <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{device.type}</p>

      {/* Device Specific Controls */}
      <div className="mt-4 min-h-[24px]">
        {device.type === DeviceType.THERMOSTAT && (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{device.value}{device.meta?.unit}</span>
            <div className="flex gap-2">
                <button 
                    onClick={() => onChangeValue?.(device.id, Number(device.value) - 1)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                >-</button>
                 <button 
                    onClick={() => onChangeValue?.(device.id, Number(device.value) + 1)}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                >+</button>
            </div>
          </div>
        )}

        {(device.type === DeviceType.LIGHT || device.type === DeviceType.SPEAKER) && device.isOn && (
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={Number(device.value) || 0} 
                onChange={(e) => onChangeValue?.(device.id, parseInt(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
        )}
         {(device.type === DeviceType.LIGHT || device.type === DeviceType.SPEAKER) && !device.isOn && (
            <div className="text-sm text-slate-600">Off</div>
        )}
        {device.type === DeviceType.LOCK && (
            <div className={`text-sm font-medium ${device.isOn ? 'text-red-400' : 'text-green-400'}`}>
                {device.isOn ? 'Locked' : 'Unlocked'}
            </div>
        )}
      </div>
    </div>
  );
};

export default DeviceTile;