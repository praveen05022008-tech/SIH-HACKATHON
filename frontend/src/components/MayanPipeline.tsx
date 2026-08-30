import React from 'react';
import { 
  FileText, 
  BrainCircuit, 
  Compass, 
  ShieldAlert, 
  CheckSquare, 
  Zap 
} from 'lucide-react';

interface MayanPipelineProps {
  activeStage: number; // 0 = not started, 1 = M1, 2 = M2, ..., 6 = M6
  isProcessing?: boolean;
}

export const MayanPipeline: React.FC<MayanPipelineProps> = ({ activeStage, isProcessing = false }) => {
  const stages = [
    { id: 1, name: 'M1 Capture', desc: 'Ingest raw report/evidence', icon: FileText },
    { id: 2, name: 'M2 Understand', desc: 'NLP semantic extraction', icon: BrainCircuit },
    { id: 3, name: 'M3 Context', desc: 'Map operational & hazard parameters', icon: Compass },
    { id: 4, name: 'M4 Classify', desc: 'Evaluate SIF potential & LSR', icon: ShieldAlert },
    { id: 5, name: 'M5 Assure', desc: 'Verify threshold & trigger audit', icon: CheckSquare },
    { id: 6, name: 'M6 Act', desc: 'Dispatch alerts & actions', icon: Zap },
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">SIF-SHIELD AI Intelligent Processing Pipeline</h3>
          <p className="text-xs text-slate-500">Continuous report enrichment and safety classification lifecycle</p>
        </div>
        {isProcessing && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-industrial-blue border border-blue-100 rounded-full text-xs font-semibold animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-industrial-blue"></span>
            Processing Report...
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative mt-6">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = activeStage > stage.id;
          const isActive = activeStage === stage.id;
          const isPending = activeStage < stage.id;

          // Compute style tokens
          let cardBg = 'bg-slate-50 border-slate-200';
          let iconColor = 'text-slate-400';
          let textColor = 'text-slate-800';
          let borderStyle = 'border-dashed';

          if (isActive) {
            cardBg = 'bg-blue-50 border-industrial-blue ring-1 ring-industrial-blue/30 shadow-sm';
            iconColor = 'text-industrial-blue';
            textColor = 'text-industrial-blue font-bold';
            borderStyle = 'border-solid';
          } else if (isCompleted) {
            cardBg = 'bg-emerald-50/60 border-emerald-200';
            iconColor = 'text-emerald-600';
            textColor = 'text-slate-800';
            borderStyle = 'border-solid';
          }

          return (
            <div key={stage.id} className="relative flex flex-col items-center">
              {/* Connector line for large screens */}
              {idx < 5 && (
                <div className={`hidden md:block absolute top-7 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] h-0.5 z-0 ${
                  isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                }`} />
              )}

              {/* Node Card */}
              <div className={`w-full z-10 flex flex-col items-center p-4 rounded-xl border transition-all duration-200 text-center ${cardBg}`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center mb-2.5 ${
                  isActive 
                    ? 'bg-industrial-blue/10 text-industrial-blue' 
                    : isCompleted 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className={`text-xs font-semibold ${textColor}`}>
                  {stage.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {stage.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
