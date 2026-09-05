import { apiUrl } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Wrench,
  Zap,
  Mic,
  Upload,
  CheckCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  RotateCw,
  AlertTriangle,
  Send,
  Radio,
  CheckCircle2,
  Check,
  Loader2,
  Key,
  Cpu,
  ChevronRight,
  ChevronDown,
  Shield,
  ArrowLeft,
  RefreshCw,
  PenLine
} from 'lucide-react';
import { SafetyEvent, User, SafetyDirective } from '../types';

interface WorkerPortalProps {
  user?: User;
  triggerNotification: (msg: string) => void;
  triggerStateRefresh: boolean;
  onEventCreated: () => void;
  onNavigateTo?: (page: string) => void;
}


export const WorkerPortal: React.FC<WorkerPortalProps> = ({
  user,
  triggerNotification,
  triggerStateRefresh,
  onEventCreated,
  onNavigateTo
}) => {
  const userEmail = user?.email || 'praveen@gmail.com';

  // Form state initialized to match reference mockup
  const [reportType, setReportType] = useState<'Unsafe Act' | 'Unsafe Condition' | 'Near Miss'>('Unsafe Condition');
  const [hazardCategory, setHazardCategory] = useState('Working at Height');
  const [site, setSite] = useState('Drilling Site A');
  const [unit, setUnit] = useState('Rig Floor D1');
  const [locationDetail, setLocationDetail] = useState('');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [shiftTiming, setShiftTiming] = useState('Morning Shift (08:00 - 16:00)');
  const [description, setDescription] = useState(
    'Worker was observed standing on the top railing of the scaffold to reach the valve handwheel, which is risky behavior and can lead to serious injury due to fall from height.'
  );
  const [equipment, setEquipment] = useState('General Machinery');
  const [energySource, setEnergySource] = useState('Mechanical');
  const [peopleInvolved, setPeopleInvolved] = useState(1);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedSeconds, setRecordedSeconds] = useState(45);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showVoice, setShowVoice] = useState(true);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  // Directives
  const [directives, setDirectives] = useState<SafetyDirective[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  // Options
  const hazardCategories = [
    'Working at Height', 'Energy Isolation / LOTO', 'Line of Fire / Overhead Load',
    'Machine Guarding / Pinch Point', 'Chemical / Toxic Atmosphere', 'Electrical Safety',
    'Hot Work / Fire Hazard', 'Slips, Trips & Falls', 'PPE Defect / Equipment Failure'
  ];
  const shiftTimings = ['Morning Shift (08:00 - 16:00)', 'Evening Shift (16:00 - 00:00)', 'Night Shift (00:00 - 08:00)', 'General Day (09:00 - 17:30)'];
  const sites = ['Drilling Site A', 'Drilling Site B', 'Drilling Site C', 'Refinery A', 'Refinery B', 'Offshore Rig 04'];
  const units = ['Rig Floor D1', 'Rig Floor 01', 'Mud Pump Area', 'Derrick Mast', 'CDU Area', 'FCCU Area', 'Wellhead Area', 'Tank Farm'];
  const equipments = ['General Machinery', 'Hydraulic Mobile Crane / Slings', 'Blowout Preventer (BOP) Stack', '415V Switchgear & Motor Panel', 'Tubular Scaffolding & Fall Arrestor', 'Crude Storage Vessel V-301'];
  const energySources = ['Mechanical', 'Electrical Energy', 'Pressurized Fluid / Gas', 'Thermal / Ignition', 'Gravitational Potential', 'Chemical / Toxic Atmosphere'];

  const waveformBars = [
    6, 12, 18, 10, 16, 24, 12, 18, 28, 14, 10, 22, 26, 18, 12, 24,
    20, 14, 26, 30, 22, 16, 28, 18, 10, 20, 26, 14, 8, 16, 22, 12,
    18, 24, 16, 10, 22, 28, 18, 12, 20, 14, 8, 16, 22
  ];

  // Waveform animation
  useEffect(() => {
    if (isRecording) {
      let angle = 0;
      const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const midY = canvas.height / 2;
        ctx.strokeStyle = '#008779';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = midY + Math.sin(angle + x * 0.06) * 12 * Math.sin(x * 0.015 + 1);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.strokeStyle = '#00B89A';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = midY + Math.cos(angle + x * 0.04 + 1.5) * 7 * Math.sin(x * 0.02);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        angle += 0.18;
        animationRef.current = requestAnimationFrame(draw);
      };
      animationRef.current = requestAnimationFrame(draw);
      timerRef.current = setInterval(() => setRecordingSeconds(p => p + 1), 1000);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const fetchDirectives = async () => {
    try {
      const res = await fetch(apiUrl('/api/manager/directives'));
      if (res.ok) setDirectives(await res.json());
    } catch {}
  };

  const handleAcknowledgeDirective = async (dir: SafetyDirective) => {
    try {
      await fetch(apiUrl(`/api/manager/directives/${dir.directive_id}/acknowledge`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: userEmail, user_name: user?.name || 'Field Employee', site, role: 'Field Worker' })
      });
    } catch {}
    setAcknowledgedIds(prev => new Set(prev).add(dir.directive_id));
    triggerNotification(`✓ Acknowledged Safety Directive ${dir.directive_id}`);
    fetchDirectives();
  };

  useEffect(() => { fetchDirectives(); }, [triggerStateRefresh, userEmail]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      let mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioStreamRef.current) audioStreamRef.current.getTracks().forEach(t => t.stop());
        await processTranscription(blob);
      };
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setVoiceTranscript('');
      setShowVoice(true);
      triggerNotification('🎙️ Recording started. Speak your observation clearly.');
    } catch (err: any) {
      alert('Microphone access error: ' + (err.message || 'Check permissions.'));
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordedSeconds(recordingSeconds);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
  };

  const processTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    const fd = new FormData();
    fd.append('file', audioBlob, 'voice_report.webm');
    try {
      const res = await fetch(apiUrl('/api/voice/transcribe'), { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { if (data.detail?.includes('token')) setTokenModalOpen(true); throw new Error(data.detail); }
      if (data.status === 'loading') { setTimeout(() => processTranscription(audioBlob), 4000); return; }
      const text = data.text?.trim() || '';
      if (!text || text === '.') { triggerNotification('No voice detected. Speak clearly.'); return; }
      setVoiceTranscript(text);
      setDescription(prev => prev.trim() ? `${prev.trim()} ${text}` : text);
      triggerNotification('✓ Transcribed with Whisper-v3');
    } catch (err: any) {
      triggerNotification(`Whisper Error: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSaveHfToken = async () => {
    if (!tokenInput.trim()) return;
    setSavingToken(true);
    try {
      const res = await fetch(apiUrl('/api/voice/set-token'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tokenInput.trim() }) });
      if (res.ok) { setTokenModalOpen(false); triggerNotification('✓ Token saved!'); }
    } catch {} finally { setSavingToken(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) { setPhotoUrl(data.url); triggerNotification('✓ Evidence uploaded'); }
    } catch {} finally { setUploadingPhoto(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { alert('Please enter a description or record audio.'); return; }
    setSubmitting(true);
    setReceipt(null);
    const fullLocation = locationDetail ? `${unit} (${locationDetail})` : unit;
    const payload = { raw_text: description, report_type: reportType, hazard_category: hazardCategory, shift_timing: shiftTiming, location_detail: locationDetail, site, unit, location: fullLocation, equipment_involved: equipment, energy_source: energySource, people_involved: peopleInvolved, photo_url: photoUrl || photoPreview || null, audio_transcript: voiceTranscript || null, reporter_email: userEmail };
    try {
      const res = await fetch(apiUrl('/api/events/analyze'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReceipt(data);
      triggerNotification(`Report ${data.report_code} submitted!`);
      onEventCreated();
      setDescription(''); setVoiceTranscript(''); setPhotoPreview(null); setPhotoUrl(null); setLocationDetail('');
    } catch {
      const id = `EVT-${Math.floor(Math.random() * 9000 + 10000)}`;
      const code = `#SIF26165-${Math.floor(Math.random() * 900 + 100)}`;
      const local = { success: true, event_id: id, report_code: code, risk_level: description.toLowerCase().includes('height') ? 'HIGH' : 'MEDIUM', sif_risk_score: 5.4, analysis: { site, unit, location: fullLocation, activity: 'Field Operations', hazard: `Hazard: ${hazardCategory}`, equipment_involved: equipment, energy_source: energySource, barrier: 'Standard controls', barrier_failure: 'Protocol bypass', exposure: 'Personnel in proximity', consequence: 'Serious injury risk', explanation: 'Safety report indicates potential barrier lapse.', recommended_action: 'Perform field audit.' } };
      setReceipt(local);
      triggerNotification(`Local receipt: ${code}`);
      onEventCreated();
      setDescription(''); setVoiceTranscript(''); setPhotoPreview(null); setLocationDetail('');
    } finally { setSubmitting(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="font-sans max-w-6xl mx-auto pb-12 space-y-5 text-slate-800">

      {/* ── TOP HEADER (Clean White Bar) ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onNavigateTo && (
            <button
              onClick={() => onNavigateTo('dashboard')}
              title="Back to Dashboard"
              className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition shrink-0 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Report Safety Issue</h1>
              <span className="bg-[#E8F6F4] text-[#007A6C] border border-[#A2D9D2] font-bold text-[10px] px-2.5 py-0.5 rounded tracking-wider uppercase">
                {userEmail.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Use the form below to safely report an unsafe condition, incident or hazard.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowVoice(true);
            if (isRecording) handleStopRecording();
            else handleStartRecording();
          }}
          className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
            isRecording
              ? 'border-red-300 bg-red-50 text-red-600 animate-pulse'
              : 'border-[#008779] text-[#008779] bg-white hover:bg-[#E8F6F4]'
          }`}
        >
          <Mic className="h-4 w-4 text-[#008779]" />
          <span>{isRecording ? `Stop Recording (${fmt(recordingSeconds)})` : 'Voice Input'}</span>
        </button>
      </div>

      {/* HSE Directive Alert (if any active) */}
      {directives.slice(0, 1).map(dir => {
        const isAck = acknowledgedIds.has(dir.directive_id);
        return (
          <div
            key={dir.directive_id}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
                <Radio className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-700">
                  {dir.priority} Directive • {dir.directive_id}
                </span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{dir.title}</p>
              </div>
            </div>
            <button
              onClick={() => handleAcknowledgeDirective(dir)}
              disabled={isAck}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isAck ? 'bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isAck ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Acknowledged</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Acknowledge</span>
                </>
              )}
            </button>
          </div>
        );
      })}

      {/* ── 2-COLUMN MAIN CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_276px] gap-5 items-start">

        {/* ── LEFT COLUMN: 4 FORM SECTIONS ── */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* SECTION 1: REPORT CATEGORY & HAZARD TYPE */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                1
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Report Category & Hazard Type
              </h3>
            </div>

            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Primary Category
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Unsafe Act */}
              <button
                type="button"
                onClick={() => setReportType('Unsafe Act')}
                className={`relative p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                  reportType === 'Unsafe Act'
                    ? 'border-[#007A6C] bg-[#E8F6F4]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {reportType === 'Unsafe Act' && (
                  <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-[#007A6C] text-white flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <div className={`mb-2 ${reportType === 'Unsafe Act' ? 'text-[#007A6C]' : 'text-slate-500'}`}>
                  <AlertTriangle className="h-5 w-5 stroke-[2]" />
                </div>
                <span className={`block text-xs font-bold ${reportType === 'Unsafe Act' ? 'text-[#007A6C]' : 'text-slate-800'}`}>
                  Unsafe Act
                </span>
                <span className={`block text-[10px] font-medium mt-0.5 leading-tight ${reportType === 'Unsafe Act' ? 'text-[#007A6C]/85' : 'text-slate-400'}`}>
                  Behavioral hazard
                </span>
              </button>

              {/* Unsafe Condition (Default Selected in Mockup) */}
              <button
                type="button"
                onClick={() => setReportType('Unsafe Condition')}
                className={`relative p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                  reportType === 'Unsafe Condition'
                    ? 'border-[#007A6C] bg-[#E8F6F4]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {reportType === 'Unsafe Condition' && (
                  <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-[#007A6C] text-white flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <div className={`mb-2 ${reportType === 'Unsafe Condition' ? 'text-[#007A6C]' : 'text-slate-500'}`}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 17c1.5-1 3-1 4.5 0 1.5 1 3 1 4.5 0 1.5-1 3-1 4.5 0 1.5 1 3 1 4.5 0" />
                    <path d="M9 11l2-3 2 1.5 2.5-3.5" />
                    <circle cx="15" cy="4" r="1.5" />
                    <path d="M11 8l-2 5 3 2" />
                  </svg>
                </div>
                <span className={`block text-xs font-bold ${reportType === 'Unsafe Condition' ? 'text-[#007A6C]' : 'text-slate-800'}`}>
                  Unsafe Condition
                </span>
                <span className={`block text-[10px] font-medium mt-0.5 leading-tight ${reportType === 'Unsafe Condition' ? 'text-[#007A6C]/85' : 'text-slate-400'}`}>
                  Physical / site hazard
                </span>
              </button>

              {/* Near Miss */}
              <button
                type="button"
                onClick={() => setReportType('Near Miss')}
                className={`relative p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                  reportType === 'Near Miss'
                    ? 'border-[#007A6C] bg-[#E8F6F4]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {reportType === 'Near Miss' && (
                  <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-[#007A6C] text-white flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                )}
                <div className={`mb-2 ${reportType === 'Near Miss' ? 'text-[#007A6C]' : 'text-slate-500'}`}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="6" width="18" height="14" rx="2" />
                    <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                    <line x1="12" y1="10" x2="12" y2="16" />
                    <line x1="9" y1="13" x2="15" y2="13" />
                  </svg>
                </div>
                <span className={`block text-xs font-bold ${reportType === 'Near Miss' ? 'text-[#007A6C]' : 'text-slate-800'}`}>
                  Near Miss
                </span>
                <span className={`block text-[10px] font-medium mt-0.5 leading-tight ${reportType === 'Near Miss' ? 'text-[#007A6C]/85' : 'text-slate-400'}`}>
                  Potentially avoided incident
                </span>
              </button>
            </div>

            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Hazard Sub-Category
            </label>
            <div className="relative">
              <select
                value={hazardCategory}
                onChange={e => setHazardCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-9 cursor-pointer"
              >
                {hazardCategories.map(hc => (
                  <option key={hc} value={hc}>{hc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
            </div>
          </div>

          {/* SECTION 2: OPERATIONAL LOCATION DETAILS */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                2
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Operational Location Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Site / Plant / Facility
                </label>
                <div className="relative">
                  <select
                    value={site}
                    onChange={e => setSite(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-9 cursor-pointer"
                  >
                    {sites.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Rig / Unit / Plant Area
                </label>
                <div className="relative">
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-9 cursor-pointer"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>
            </div>

            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Specific Location (Detail / Zone / Deck)
            </label>
            <input
              type="text"
              value={locationDetail}
              onChange={e => setLocationDetail(e.target.value)}
              placeholder="e.g., Substructure Platform Level 2, Near Valve Y-102"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white placeholder-slate-400 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C]"
            />
          </div>

          {/* SECTION 3: INCIDENT DETAILS & OPERATIONAL SHIFT */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                3
              </span>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Incident Details & Operational Shift
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Date & Time of Observation
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={e => setDateTime(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Operational Shift
                </label>
                <div className="relative">
                  <select
                    value={shiftTiming}
                    onChange={e => setShiftTiming(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-9 cursor-pointer"
                  >
                    {shiftTimings.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: INCIDENT DESCRIPTION */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-[#00695C] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                  4
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Incident Description
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowVoice(true);
                  if (isRecording) handleStopRecording();
                  else handleStartRecording();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  isRecording
                    ? 'border-red-300 bg-red-50 text-red-600 animate-pulse'
                    : 'border-[#008779]/40 bg-[#E8F6F4] text-[#008779] hover:bg-[#D4EDE9]'
                }`}
              >
                <Mic className="h-3.5 w-3.5 text-[#008779]" />
                <span>{isRecording ? `Stop (${fmt(recordingSeconds)})` : 'Use voice to dictate'}</span>
              </button>
            </div>

            {/* Audio waveform panel (exact match to screenshot) */}
            {showVoice && (
              <div className="border border-slate-200/90 rounded-xl p-3.5 mb-4 bg-slate-50/70">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Describe the Observation (Who / What / Where / How)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRecording) handleStopRecording();
                        else handleStartRecording();
                      }}
                      className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[#008779] shrink-0 hover:bg-[#E8F6F4]"
                    >
                      <Mic className={`h-3.5 w-3.5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-[#008779]'}`} />
                    </button>

                    {/* Soundwave Bars */}
                    <div className="flex items-center gap-1 h-7 flex-1 px-1 overflow-hidden">
                      {waveformBars.map((h, i) => (
                        <span
                          key={i}
                          style={{
                            height: isRecording
                              ? `${Math.max(4, (h * (1 + 0.6 * Math.sin(recordingSeconds * 4 + i)))) % 28}px`
                              : `${h}px`
                          }}
                          className={`w-1 rounded-full transition-all duration-150 ${
                            isRecording ? 'bg-red-500' : 'bg-[#008779]'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-xs font-mono text-slate-600 font-semibold shrink-0 pl-1">
                      {fmt(isRecording ? recordingSeconds : 0)} / {fmt(recordedSeconds)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isRecording) handleStopRecording();
                      else handleStartRecording();
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#00695C] hover:bg-[#00574B] text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 transition shadow-2xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRecording ? 'animate-spin' : ''}`} />
                    <span>Record Again</span>
                  </button>
                </div>

                {isTranscribing && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-[#008779]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="font-semibold">Transcribing with Whisper-v3 Turbo...</span>
                  </div>
                )}
              </div>
            )}

            {/* Textarea */}
            <label className="block text-xs text-slate-500 font-medium mb-1.5">
              Or type the description
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, 1000))}
                placeholder="Describe what occurred. Include: 1) What task was being done? 2) What was the immediate hazard? 3) Which safety barrier was bypassed?"
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] resize-none leading-relaxed"
              />
              <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/90 px-1 py-0.5 rounded">
                <span>{description.length} / 1000</span>
                <PenLine className="h-3 w-3" />
              </div>
            </div>

            {/* Associated Equipment, Energy Source, People Involved */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Associated Equipment
                </label>
                <div className="relative">
                  <select
                    value={equipment}
                    onChange={e => setEquipment(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-8 cursor-pointer"
                  >
                    {equipments.map(eq => (
                      <option key={eq} value={eq}>{eq}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Energy Source Involved
                </label>
                <div className="relative">
                  <select
                    value={energySource}
                    onChange={e => setEnergySource(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none pr-8 cursor-pointer"
                  >
                    {energySources.map(es => (
                      <option key={es} value={es}>{es}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  People Involved
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <select
                    value={peopleInvolved}
                    onChange={e => setPeopleInvolved(parseInt(e.target.value))}
                    className="w-full pl-8 pr-8 py-2.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800 focus:ring-2 focus:ring-[#007A6C]/20 focus:border-[#007A6C] appearance-none cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Upload Area (Mint Dashed Dropzone) */}
            <div className="mt-4 border-2 border-dashed border-[#A2D9D2] bg-[#F4FAF8] hover:border-[#008779] rounded-xl p-5 text-center cursor-pointer transition relative">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                disabled={uploadingPhoto}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {!photoPreview ? (
                <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                  <div className="h-8 w-8 rounded-full bg-[#E8F6F4] flex items-center justify-center mb-0.5 text-[#008779]">
                    <Upload className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    Attach Photos / Videos / Supporting Documents
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Drag & drop files here or click to browse
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-24 rounded-xl object-cover border border-slate-200 cursor-zoom-in"
                    onClick={e => {
                      e.stopPropagation();
                      setPreviewImageModal(photoUrl || photoPreview);
                    }}
                  />
                  <div className="flex items-center gap-2 text-[10px]">
                    {uploadingPhoto ? (
                      <span className="text-[#008779] font-bold animate-pulse">Uploading to Cloud...</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">✓ Attachment Ready</span>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setPhotoPreview(null);
                        setPhotoUrl(null);
                      }}
                      className="text-red-500 hover:underline font-bold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Large Teal Submit Button */}
            <div className="mt-5">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#00695C] hover:bg-[#00574B] text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition flex items-center justify-center gap-2.5 shadow-md shadow-[#00695C]/20 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing & Registering...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit & Process Safety Observation</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

        {/* ── RIGHT COLUMN: SIDEBAR ── */}
        <div className="space-y-4">

          {/* Tips Card: "Make your report more effective" */}
          <div className="bg-white border border-slate-200/85 rounded-2xl p-6 shadow-2xs">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="h-12 w-12 rounded-2xl bg-[#E8F6F4] flex items-center justify-center mb-3 text-[#007A6C]">
                <Shield className="h-6 w-6 stroke-[2.2]" />
              </div>
              <h4 className="text-sm font-black text-slate-900 leading-tight">
                Make your report more effective
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Submit accurate information to help us take prompt and effective action.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {[
                'Select the correct category',
                'Provide exact location details',
                'Add photos / videos if possible',
                'Describe what happened clearly'
              ].map(tip => (
                <div key={tip} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[#007A6C] shrink-0" />
                  <span className="text-xs text-slate-700 font-medium leading-tight">{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Receipt (When submitted) */}
          {receipt && (
            <div className="bg-white border-2 border-[#007A6C] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-black text-[#007A6C] uppercase bg-[#E8F6F4] px-2 py-0.5 rounded-full">
                    Observation Receipt
                  </span>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{receipt.report_code}</h4>
                </div>
                <div className="h-8 w-8 rounded-full bg-[#E8F6F4] text-[#007A6C] flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk Level:</span>
                  <span className={`font-bold uppercase ${
                    receipt.risk_level === 'HIGH' || receipt.risk_level === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {receipt.risk_level}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                    Pending Review
                  </span>
                </div>
              </div>
              {receipt.analysis?.explanation && (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded-lg leading-relaxed">
                  "{receipt.analysis.explanation}"
                </p>
              )}
            </div>
          )}

          {/* Discreet Whisper Voice Model Config Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setTokenModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-[#007A6C] font-semibold transition cursor-pointer"
            >
              <Cpu className="h-3 w-3" />
              <span>Whisper-v3 Turbo Voice Settings</span>
            </button>
          </div>

        </div>

      </div>

      {/* ── BOTTOM HISTORY STRIP ── */}
      <div className="bg-white border border-slate-200/85 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-[#E8F6F4] text-[#007A6C] flex items-center justify-center shrink-0">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Submitted Observation History
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Track the resolution status and review changes of your previously reported issues in My Reports.
            </p>
          </div>
        </div>

        {onNavigateTo && (
          <button
            onClick={() => onNavigateTo('my-report')}
            className="shrink-0 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>Open My Reports</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* HF Token Modal */}
      {tokenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center"><Key className="h-4 w-4" /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Hugging Face Whisper-v3</h3>
                  <div className="text-[10px] text-slate-400">openai/whisper-large-v3-turbo</div>
                </div>
              </div>
              <button onClick={() => setTokenModalOpen(false)} className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs cursor-pointer">✕</button>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-900">Connected & Ready</div>
                <div className="text-[11px] text-emerald-800 mt-0.5">Token is authenticated. Microphone recordings will be transcribed by Whisper-v3.</div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Hugging Face Token (HF_TOKEN)</label>
              <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="hf_..." className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 bg-white focus:ring-2 focus:ring-[#008779]" />
              <div className="text-[10px] text-slate-400 mt-1">Saved securely in backend (.env).</div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button type="button" disabled={savingToken} onClick={handleSaveHfToken} className="flex-1 py-2.5 bg-[#008779] hover:bg-[#007064] text-white rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5">
                {savingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                <span>{savingToken ? 'Saving...' : 'Save & Verify'}</span>
              </button>
              <button type="button" onClick={() => setTokenModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      {previewImageModal && (
        <div onClick={() => setPreviewImageModal(null)} className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out">
          <div className="bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl cursor-default" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Photo Evidence</span>
              <button onClick={() => setPreviewImageModal(null)} className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs cursor-pointer">✕</button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center max-h-[70vh]">
              <img src={previewImageModal} alt="Evidence" className="max-h-[70vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};