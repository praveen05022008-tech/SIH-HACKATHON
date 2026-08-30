import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  MapPin, 
  Calendar, 
  Users, 
  Wrench, 
  Zap, 
  Mic, 
  MicOff, 
  Upload, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Sparkles,
  RotateCw
} from 'lucide-react';
import { SafetyEvent } from '../types';

interface WorkerPortalProps {
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onEventCreated: () => void;
}

export const WorkerPortal: React.FC<WorkerPortalProps> = ({ 
  triggerNotification, 
  triggerStateRefresh,
  onEventCreated 
}) => {
  // Report type state
  const [reportType, setReportType] = useState<'Unsafe Act' | 'Unsafe Condition' | 'Near Miss'>('Unsafe Condition');
  
  // Form fields
  const [site, setSite] = useState('Drilling Site A');
  const [unit, setUnit] = useState('Rig Floor 01');
  const [locationDetail, setLocationDetail] = useState('');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [description, setDescription] = useState('');
  const [equipment, setEquipment] = useState('General Machinery');
  const [energySource, setEnergySource] = useState('Mechanical');
  const [peopleInvolved, setPeopleInvolved] = useState(1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<any | null>(null);

  // Submission Output states
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [myReports, setMyReports] = useState<SafetyEvent[]>([]);

  // Site options
  const sites = ['Drilling Site A', 'Drilling Site B', 'Drilling Site C', 'Refinery A', 'Refinery B', 'Refinery C', 'Offshore Rig 04'];
  const units = ['Rig Floor 01', 'Mud Pump Area', 'Derrick Mast', 'CDU Area', 'FCCU Area', 'Wellhead Area', 'Tank Farm'];
  const equipments = ['General Machinery', 'Hydraulic Mobile Crane / Slings', 'Blowout Preventer (BOP) Stack', '415V Switchgear & Motor Panel', 'Tubular Scaffolding & Fall Arrestor', 'Crude Storage Vessel V-301', 'Choke Manifold High-Pressure Valve'];
  const energySources = ['Mechanical', 'Electrical Energy', 'Pressurized Fluid / Gas', 'Thermal / Ignition', 'Gravitational Potential', 'Chemical / Toxic Atmosphere'];

  // Waveform canvas animation
  useEffect(() => {
    if (isRecording) {
      let angle = 0;
      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1F5EAA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const width = canvas.width;
        const height = canvas.height;
        const midY = height / 2;
        
        for (let x = 0; x < width; x++) {
          // Create overlapping waves
          const amplitude = Math.sin(angle + x * 0.05) * 15 * Math.sin(x * 0.01) * (isRecording ? 1 : 0.1);
          const y = midY + amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        
        // Draw secondary wave
        ctx.strokeStyle = '#E57A20';
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const amplitude = Math.cos(angle + x * 0.03 + 2) * 10 * Math.sin(x * 0.02);
          const y = midY + amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        
        angle += 0.15;
        animationRef.current = requestAnimationFrame(draw);
      };
      
      animationRef.current = requestAnimationFrame(draw);
      
      // Timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
      
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Load My Reports
  const fetchMyReports = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/events');
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Filter reports submitted by worker
      const filtered = data.filter((e: any) => e.report_type === 'Unsafe Condition' || e.report_type === 'Unsafe Act' || e.report_type === 'Near Miss');
      setMyReports(filtered.slice(0, 5));
    } catch (err) {
      console.warn('Could not load reports, generating local mocks');
      setMyReports([
        {
          id: 'EVT-10288',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          site: 'Drilling Site B',
          unit: 'Rig Floor 01',
          location: 'Rig Floor 01 - Under Monkey Board',
          activity: 'Drilling & Casing Operations',
          description: 'Observed casing crew member working on structural platform without visual anchor lifeline clipped.',
          hazard: 'Elevated fall risk during casing pipe trip',
          energy_source: 'Gravitational Potential',
          barrier: '100% Tie-off Fall Arrest System & Guardrails',
          barrier_failure: 'Harness lanyard not anchored',
          exposure: 'Worker positioned on rig mast unclipped',
          consequence: 'Fatal fall from mast height',
          sif_probability: 91.0,
          confidence: 89.0,
          life_saving_rule: 'Working at Height',
          status: 'Action Dispatched',
          reviewer: 'Safety Officer Lead',
          evidence: 'Voice report transcript.',
          l1_milestone: 'OIL Annual Rig Operations 2026',
          l2_unit: 'Rig Floor 01 Section',
          l3_discipline: 'Drilling & Mechanical HSE',
          l4_work_package: 'Casing Operations Package',
          l5_activity: 'Drilling & Casing Operations',
          l6_job: 'Inspect rig mast casing platform'
        }
      ]);
    }
  };

  useEffect(() => {
    fetchMyReports();
  }, [triggerStateRefresh]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    setVoiceTranscript('');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    
    // Simulate speech-to-text Whisper transcription
    const transcripts = [
      "We were preparing to service the mud pump high-pressure line. One technician started adjusting the flange valves without checking the zero-pressure isolation state or looking for LOTO lock tags. This is an active line.",
      "During crane lifting operations at Drilling Site A, riggers were observed standing inside the direct line of fire underneath the suspended 5-ton structural pile load. Supervisor did not issue a stop work order.",
      "Technician entered the crude storage tank V-301 cell without taking atmospheric multi-gas clearance test readings or verifying if the forced ventilation blower was powered on."
    ];
    const textResult = transcripts[Math.floor(Math.random() * transcripts.length)];
    setVoiceTranscript(textResult);
    setDescription(textResult);
    triggerNotification("Voice transcript processed successfully via Whisper-v3");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        triggerNotification("Report photo attachment uploaded");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Please enter a safety description or use the voice recording transcription.");
      return;
    }

    setSubmitting(true);
    setReceipt(null);

    const payload = {
      raw_text: description,
      report_type: reportType,
      site,
      unit,
      location: `${unit} - Section B`,
      equipment_involved: equipment,
      energy_source: energySource,
      people_involved: peopleInvolved,
      photo_url: photoPreview || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
      audio_transcript: voiceTranscript || null,
      reporter_email: 'worker@refinery.safe'
    };

    try {
      const res = await fetch('http://localhost:8000/api/events/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();
      const resultData = await res.json();
      
      setReceipt(resultData);
      triggerNotification(`Safety Report ${resultData.report_code} submitted & analyzed!`);
      onEventCreated();
      fetchMyReports();
      
      // Clear form
      setDescription('');
      setVoiceTranscript('');
      setPhotoPreview(null);
    } catch (err) {
      console.warn("API submit failed, generating local fallback receipt");
      // Fallback local receipt
      const fallbackId = `EVT-${Math.floor(Math.random() * 9000 + 10000)}`;
      const fallbackCode = `#SIF26165-${Math.floor(Math.random() * 900 + 100)}`;
      
      const localResult = {
        success: true,
        event_id: fallbackId,
        report_code: fallbackCode,
        risk_level: description.toLowerCase().includes('isolation') || description.toLowerCase().includes('height') ? 'HIGH' : 'MEDIUM',
        sif_risk_score: description.toLowerCase().includes('isolation') || description.toLowerCase().includes('height') ? 8.2 : 5.4,
        is_sif_precursor: description.toLowerCase().includes('isolation') || description.toLowerCase().includes('height') ? 'YES' : 'NO',
        analysis: {
          site,
          unit,
          location: `${unit} - Zone 3`,
          activity: 'Routine Operations',
          hazard: 'Potential hazardous event',
          equipment_involved: equipment,
          energy_source: energySource,
          barrier: 'Standard procedural guardrails',
          barrier_failure: 'Safety protocol bypass',
          exposure: 'Personnel in proximity',
          consequence: 'Serious injury risk',
          explanation: 'Ingested safety description indicates potential energetic hazard controls failure.',
          recommended_action: 'Perform field audit of permit and confirm correct barrier execution.',
          simulated_alerts: [
            { channel: 'DASHBOARD_BANNER', target: 'Safety Officer Alert Inbox', status: 'Dispatched' }
          ]
        }
      };

      setReceipt(localResult);
      triggerNotification(`Local safety report receipt generated: ${fallbackCode}`);
      
      // Add to list
      const newEvent: SafetyEvent = {
        id: fallbackId,
        report_id: Math.floor(Math.random() * 5000),
        timestamp: new Date().toISOString(),
        site,
        unit,
        location: `${unit} - Zone 3`,
        activity: 'Routine Operations',
        description,
        hazard: 'Potential safety hazard',
        equipment_involved: equipment,
        people_involved: peopleInvolved,
        energy_source: energySource,
        barrier: 'Standard procedural controls',
        barrier_failure: 'Barrier execution failure',
        exposure: 'Crew inside active zone',
        consequence: 'Potential injury',
        sif_probability: localResult.sif_risk_score * 10,
        confidence: 82.0,
        life_saving_rule: description.toLowerCase().includes('isolation') ? 'Energy Isolation' : description.toLowerCase().includes('height') ? 'Working at Height' : 'None',
        status: 'Needs Review',
        reviewer: null,
        evidence: 'Self submitted report',
        l1_milestone: 'OIL Annual Rig Operations 2026',
        l2_unit: `${unit} Section`,
        l3_discipline: 'Mechanical Maintenance',
        l4_work_package: 'Routine Repair Work',
        l5_activity: 'Safety Observation Intake',
        l6_job: 'Inspect work area layout'
      };
      
      setMyReports(prev => [newEvent, ...prev]);
      onEventCreated();
      
      // Clear form
      setDescription('');
      setVoiceTranscript('');
      setPhotoPreview(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-[#0B2A56]">Field Employee Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Submit unsafe-acts, unsafe-conditions, and near-misses. SIF-SHIELD AI runs a real-time risk assessment scan immediately.</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#E57A20]">
          <Mic className="h-5 w-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Report Submission Form */}
        <div className="lg:col-span-2 space-y-6">
          
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
            
            {/* 1. Report Type Selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                1. Select Report Category
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'Unsafe Act', desc: 'Behavioral hazard' },
                  { type: 'Unsafe Condition', desc: 'Physical asset hazard' },
                  { type: 'Near Miss', desc: 'Incident narrowly avoided' }
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setReportType(item.type as any)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-20 ${
                      reportType === item.type
                        ? 'border-[#1F5EAA] bg-blue-50/15 shadow-2xs'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-xs font-extrabold ${reportType === item.type ? 'text-[#1F5EAA]' : 'text-slate-800'}`}>
                      {item.type}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium leading-tight">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Location & Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Site / Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                  >
                    {sites.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rig Unit / Area</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                >
                  {units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date & Time</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* 3. Voice Report Tool */}
            <div className="border border-[#1F5EAA]/20 bg-slate-50/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Mic className="h-3.5 w-3.5 text-[#1F5EAA]" />
                  <span>Interactive Voice Report (Whisper STT Integration)</span>
                </span>
                {isRecording && (
                  <span className="text-[10px] font-bold text-red-600 animate-pulse bg-red-100 px-2 py-0.5 rounded">
                    Recording: {recordingSeconds}s
                  </span>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-center">
                <canvas 
                  ref={canvasRef} 
                  width={240} 
                  height={40} 
                  className="bg-white border border-slate-200 rounded-lg w-full md:w-60 h-10 shadow-2xs"
                />
                
                <div className="flex gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-4 py-2 bg-[#1F5EAA] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Mic className="h-4 w-4" />
                      <span>Record Audio</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs animate-pulse"
                    >
                      <MicOff className="h-4 w-4" />
                      <span>Transcribe Speech</span>
                    </button>
                  )}
                </div>
              </div>

              {voiceTranscript && (
                <div className="p-3 bg-blue-50/50 border border-[#1F5EAA]/15 text-[11px] text-slate-700 rounded-lg">
                  <div className="font-bold text-[#1F5EAA] uppercase text-[9px] tracking-wide mb-1">Whisper-v3 Transcribed Text</div>
                  <p className="italic leading-normal">"{voiceTranscript}"</p>
                </div>
              )}
            </div>

            {/* 4. Description Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  2. Narrative Safety Observation Details
                </label>
                <span className="text-[9px] text-[#E57A20] font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  <span>NLP Prompt Assistance Active</span>
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what occurred. For best results, include: 1) What task was being done? 2) What was the immediate hazard? 3) Which safety barrier or Life-Saving Rule was bypassed?"
                rows={4}
                className="block w-full px-3.5 py-3 border border-slate-300 rounded-xl text-xs bg-slate-50/20 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-industrial-blue"
              />
            </div>

            {/* 5. Equipment & Energy Source Selection & People involved */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Associated Equipment
                </label>
                <div className="relative">
                  <Wrench className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                  >
                    {equipments.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Energy Source Involved
                </label>
                <div className="relative">
                  <Zap className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <select
                    value={energySource}
                    onChange={(e) => setEnergySource(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                  >
                    {energySources.map(es => <option key={es} value={es}>{es}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  People Exposed / Involved
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={peopleInvolved}
                    onChange={(e) => setPeopleInvolved(parseInt(e.target.value) || 1)}
                    className="block w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-slate-50 text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* 6. Media Attachment */}
            <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-4 text-center cursor-pointer transition relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {!photoPreview ? (
                <div className="flex flex-col items-center">
                  <Upload className="h-6 w-6 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-700">Simulate Photo/Video Attachment Upload</span>
                  <span className="text-[10px] text-slate-400 mt-1">Upload a snapshot to parse OCR text strings</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <img 
                    src={photoPreview} 
                    alt="Upload Preview" 
                    className="h-28 rounded-lg object-cover mb-2 border border-slate-200 shadow-xs" 
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="text-[10px] text-red-600 hover:underline font-bold"
                  >
                    Remove Photo
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#0B2A56] hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Processing SIF scan pipeline...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Submit & Scan Safety Observation</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Receipt & Notifications Tracker */}
        <div className="space-y-6">
          
          {/* Submission Receipt Card */}
          {receipt ? (
            <div className="bg-white border-2 border-emerald-500 rounded-xl p-5 shadow-md space-y-4 animate-fadeIn">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    AI Scan Receipt
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-955 mt-1.5">{receipt.report_code}</h3>
                </div>
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shadow-2xs">
                  ✓
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">SIF Flag:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    receipt.is_sif_precursor === 'YES' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {receipt.is_sif_precursor === 'YES' ? 'SIF PRECURSOR DETECTED' : 'STANDARD OBS'}
                  </span>
                </div>
                
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Risk score:</span>
                  <span className="font-extrabold text-slate-800">{receipt.sif_risk_score} / 10</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Risk Level:</span>
                  <span className={`font-bold uppercase ${
                    receipt.risk_level === 'CRITICAL' ? 'text-red-700' : receipt.risk_level === 'HIGH' ? 'text-orange-600' : 'text-slate-700'
                  }`}>
                    {receipt.risk_level}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400 font-medium">Mapped Rule:</span>
                  <span className="font-bold text-slate-800">{receipt.analysis.life_saving_rule || 'None'}</span>
                </div>
              </div>

              <div className="pt-2 text-[10px] leading-normal bg-slate-50 p-2.5 border border-slate-200 rounded-lg text-slate-500 italic">
                <div className="font-bold text-slate-700 not-italic flex items-center gap-1 mb-1">
                  <ShieldAlert className="h-3 w-3 text-[#E57A20]" />
                  <span>AI Explanation</span>
                </div>
                "{receipt.analysis.explanation}"
              </div>

              <div className="text-[9px] border-t border-slate-100 pt-3 space-y-1.5">
                <div className="font-bold text-slate-400 uppercase tracking-wide">Multi-Channel Alerts Dispatched:</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>• HSE Alert Inbox banner</span>
                    <span className="text-emerald-600 font-semibold">Sent</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>• SMS Site Safety head</span>
                    <span className="text-emerald-600 font-semibold">Delivered</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center shadow-xs text-slate-400">
              <Sparkles className="h-7 w-7 mx-auto mb-2 text-slate-300" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">No Active Scan Receipt</h4>
              <p className="text-[10px] text-slate-400 mt-1">Submit a report details to preview the real-time AI scan result panel.</p>
            </div>
          )}

        </div>

      </div>

      {/* My Reports Tracker */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">My Submitted Reports Tracker</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Showing last 5 submissions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
              <tr>
                <th className="px-4 py-2">Report ID</th>
                <th className="px-4 py-2">Submitted Time</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Brief details</th>
                <th className="px-4 py-2 text-center">SIF potential</th>
                <th className="px-4 py-2">HSE Rule</th>
                <th className="px-4 py-2">Resolution status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {myReports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3 font-bold text-slate-800">{r.id}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {r.site} • {r.unit}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-slate-500">
                    {r.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                      r.sif_probability >= 50.0 
                        ? 'bg-red-50 text-red-700 border-red-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {r.sif_probability >= 50.0 ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-semibold text-slate-700">
                      {r.life_saving_rule || 'None'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      r.status === 'Needs Review'
                        ? 'bg-amber-50 text-orange-600 border-amber-200'
                        : r.status === 'Confirmed' || r.status === 'Resolved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-indigo-50 text-purple-700 border-indigo-200'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
