import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ENERGY_DATA } from '../constants';

const EnergyChart: React.FC = () => {
  return (
    <div className="h-full w-full bg-slate-900/50 rounded-xl p-4 border border-slate-800">
      <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4">Weekly Energy Usage (kWh)</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ENERGY_DATA}>
            <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
            />
            <YAxis 
                hide 
            />
            <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                itemStyle={{ color: '#bae6fd' }}
            />
            <Bar dataKey="kwh" radius={[4, 4, 0, 0]}>
              {ENERGY_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.kwh > 18 ? '#f43f5e' : '#0ea5e9'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnergyChart;