import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Construction,
  Target,
  Siren,
  Plus,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Shield,
  BookOpen,
  Calendar,
  Sparkles,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  PhoneCall,
  CheckCircle,
  X,
  Hand
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { apiUrl } from '../config/api';
import { User, SafetyEvent } from '../types';

interface EmployeeDashboardProps {
  user: User;
  onNavigateTo: (page: string) => void;
  triggerStateRefresh?: boolean;
}

// Default realistic sample reports matching the reference screenshot
const DEMO_REPORTS = [
  {
    id: 'RKA-2024-00012',
    type: 'Unsafe Act',
    typeIcon: AlertTriangle,
    typeColor: 'text-amber-500',
    title: 'Worker not wearing safety helmet',
    submittedOn: '18 May 2024',
    status: 'Under Review',
    sifPotential: 'Medium'
  },
  {
    id: 'RKA-2024-00011',
    type: 'Unsafe Condition',
    typeIcon: Construction,
    typeColor: 'text-orange-500',
    title: 'Oil leak near flange connection',
    submittedOn: '16 May 2024',
    status: 'Investigating',
    sifPotential: 'High'
  },
  {
    id: 'RKA-2024-00010',
    type: 'Near Miss',
    typeIcon: Target,
    typeColor: 'text-emerald-500',
    title: 'Caught foot while walking',
    submittedOn: '14 May 2024',
    status: 'Closed',
    sifPotential: 'Low'
  },
  {
    id: 'RKA-2024-00009',
    type: 'Incident',
    typeIcon: Siren,
    typeColor: 'text-red-500',
    title: 'Valve opened without isolation',
    submittedOn: '12 May 2024',
    status: 'Closed',
    sifPotential: 'High'
  },
  {
    id: 'RKA-2024-00008',
    type: 'Unsafe Condition',
    typeIcon: Construction,
    typeColor: 'text-orange-500',
    title: 'Loose grating on platform',
    submittedOn: '10 May 2024',
    status: 'Under Review',
    sifPotential: 'Medium'
  }
];

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  user,
  onNavigateTo,
  triggerStateRefresh
}) => {
  const [realReports, setRealReports] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);

  // AI Instant scanner state
  const [aiDraftText, setAiDraftText] = useState('');
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const fetchReports = () => {
    if (!user?.email) return;
    setLoading(true);
    fetch(apiUrl(`/api/events?reporter_email=${encodeURIComponent(user.email)}`))
      .then(res => (res.ok ? res.json() : []))
      .then(data => setRealReports(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Error fetching employee reports:', err);
        setRealReports([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, [user?.email, triggerStateRefresh]);

  // Format display reports strictly from realReports (fallback only if truly empty for demo)
  const displayReports = useMemo(() => {
    if (realReports.length > 0) {
      return realReports.map((r, i) => {
        let typeIcon = AlertTriangle;
        let typeColor = 'text-amber-500';
        const t = (r.report_type || '').toLowerCase();
        if (t.includes('condition')) {
          typeIcon = Construction;
          typeColor = 'text-orange-500';
        } else if (t.includes('near miss')) {
          typeIcon = Target;
          typeColor = 'text-emerald-500';
        } else if (t.includes('incident')) {
          typeIcon = Siren;
          typeColor = 'text-red-500';
        }

        let statusStr = 'Under Review';
        const s = (r.status || '').toLowerCase();
        if (s.includes('closed') || s.includes('resolved') || s.includes('completed')) statusStr = 'Closed';
        else if (s.includes('progress') || s.includes('action') || s.includes('investigat')) statusStr = 'Investigating';

        let sifStr = 'Medium';
        const score = r.sif_risk_score ?? 5;
        if (score >= 6.5 || (r.risk_level || '').toUpperCase() === 'CRITICAL' || (r.risk_level || '').toUpperCase() === 'HIGH') {
          sifStr = 'High';
        } else if (score <= 4.0) {
          sifStr = 'Low';
        }

        const dateStr = new Date(r.timestamp).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        return {
          id: r.report_code || r.id,
          type: r.report_type || 'Unsafe Observation',
          typeIcon,
          typeColor,
          title: r.description || `${r.hazard_category || 'Observation'} at ${r.unit || 'Site'}`,
          submittedOn: dateStr,
          status: statusStr,
          sifPotential: sifStr
        };
      });
    }
    return [];
  }, [realReports]);

  // Exact calculated statistics (strictly calculated, no fallback constants!)
  const totalCount = realReports.length;
  const closedCount = displayReports.filter(r => r.status === 'Closed').length;
  const reviewCount = displayReports.filter(r => r.status === 'Under Review').length;
  const investigatingCount = displayReports.filter(r => r.status === 'Investigating').length;
  const highRiskCount = displayReports.filter(r => r.sifPotential === 'High').length;

  // Dynamic calculated trends and subtitles
  const trends = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthCount = realReports.filter(r => {
      const d = new Date(r.timestamp);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const lastMonthCount = realReports.filter(r => {
      const d = new Date(r.timestamp);
      const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    }).length;

    let submittedText = `${totalCount} total submitted`;
    let submittedDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (lastMonthCount > 0) {
      const diff = Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
      submittedText = `${Math.abs(diff)}% vs last month`;
      submittedDirection = diff >= 0 ? 'up' : 'down';
    } else if (thisMonthCount > 0) {
      submittedText = `${thisMonthCount} submitted this month`;
      submittedDirection = 'up';
    }

    const closedPct = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;
    const closedText = totalCount > 0 ? `${closedPct}% resolution rate` : '0% resolution rate';
    const closedDirection: 'up' | 'down' | 'neutral' = closedCount > 0 ? 'up' : 'neutral';

    const reviewPct = totalCount > 0 ? Math.round((reviewCount / totalCount) * 100) : 0;
    const reviewText = totalCount > 0 ? `${reviewPct}% under review` : '0 under review';
    const reviewDirection: 'up' | 'down' | 'neutral' = reviewCount > 0 ? 'down' : 'neutral';

    const highRiskPct = totalCount > 0 ? Math.round((highRiskCount / totalCount) * 100) : 0;
    const highRiskText = highRiskCount > 0 ? `${highRiskPct}% high risk` : 'Zero high risk';
    const highRiskDirection: 'up' | 'down' | 'neutral' = highRiskCount > 0 ? 'down' : 'neutral';

    return {
      submitted: { text: submittedText, direction: submittedDirection },
      closed: { text: closedText, direction: closedDirection },
      review: { text: reviewText, direction: reviewDirection },
      highRisk: { text: highRiskText, direction: highRiskDirection }
    };
  }, [realReports, totalCount, closedCount, reviewCount, highRiskCount]);

  // Donut chart distribution (strictly calculated)
  const chartData = useMemo(() => {
    return [
      { name: 'Closed', value: closedCount, color: '#10B981' },
      { name: 'Under Review', value: reviewCount, color: '#F59E0B' },
      { name: 'Investigating', value: investigatingCount, color: '#3B82F6' },
      { name: 'Overdue', value: 0, color: '#EF4444' }
    ];
  }, [closedCount, reviewCount, investigatingCount]);

  const totalChartReports = totalCount;

  const pieChartData = useMemo(() => {
    if (totalChartReports === 0) {
      return [{ name: 'Empty', value: 1, color: '#E2E8F0' }];
    }
    const filtered = chartData.filter(d => d.value > 0);
    return filtered.length > 0 ? filtered : [{ name: 'Empty', value: 1, color: '#E2E8F0' }];
  }, [totalChartReports, chartData]);

  const handleStartReportWithCategory = (cat: string) => {
    setSelectedCategory(cat);
    onNavigateTo('report-issue');
  };

  const handleAnalyzeDraft = () => {
    if (!aiDraftText.trim()) return;
    setAiAnalyzing(true);
    setTimeout(() => {
      const text = aiDraftText.toLowerCase();
      const isHigh = text.includes('height') || text.includes('isolation') || text.includes('fall') || text.includes('fire');
      setAiResult({
        score: isHigh ? 8.2 : 5.1,
        risk: isHigh ? 'HIGH SIF POTENTIAL' : 'MEDIUM RISK',
        rule: isHigh ? 'Working at Height / Energy Isolation' : 'General Operational Safety',
        barrier: isHigh ? 'Barrier Lapse: Missing harness tethering / LOTO lock' : 'Guardrail inspection recommended',
        action: 'Notify area supervisor immediately & isolate energy feed before proceeding.'
      });
      setAiAnalyzing(false);
    }, 900);
  };

  return (
    <div className="font-sans text-slate-800 space-y-6 max-w-[1400px] mx-auto pb-16">

      {/* Top Welcome Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center text-amber-500 shrink-0">
            <Hand className="h-6 w-6 sm:h-7 sm:w-7 animate-wave" />
          </span>
          <span>Welcome, {user?.name || 'Arun Kumar'}!</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Stay vigilant, stay safe. Your reports make the workplace safer.
        </p>
      </div>

      {/* TOP 4 STAT CARDS (Reports Submitted, Reports Closed, Under Review, High Risk Reports) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Reports Submitted */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-[#EFF6FF] text-[#1E56D0] flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Reports Submitted</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
            </div>
          </div>
          <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-bold ${
            trends.submitted.direction === 'up' ? 'text-emerald-600' : trends.submitted.direction === 'down' ? 'text-red-500' : 'text-slate-400'
          }`}>
            {trends.submitted.direction === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
            {trends.submitted.direction === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
            {trends.submitted.direction === 'neutral' && <Minus className="h-3.5 w-3.5" />}
            <span>{trends.submitted.text}</span>
          </div>
        </div>

        {/* Card 2: Reports Closed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-[#ECFDF5] text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Reports Closed</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{closedCount}</div>
            </div>
          </div>
          <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-bold ${
            closedCount > 0 ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            {closedCount > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            <span>{trends.closed.text}</span>
          </div>
        </div>

        {/* Card 3: Under Review */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-[#FFFBEB] text-amber-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Under Review</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{reviewCount}</div>
            </div>
          </div>
          <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-bold ${
            reviewCount > 0 ? 'text-amber-600' : 'text-slate-400'
          }`}>
            {reviewCount > 0 ? <Clock className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            <span>{trends.review.text}</span>
          </div>
        </div>

        {/* Card 4: High Risk Reports */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-2xl bg-[#FAF5FF] text-purple-600 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">High Risk Reports</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{highRiskCount}</div>
            </div>
          </div>
          <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-bold ${
            highRiskCount > 0 ? 'text-red-500' : 'text-emerald-600'
          }`}>
            {highRiskCount > 0 ? <ShieldAlert className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
            <span>{trends.highRisk.text}</span>
          </div>
        </div>

      </div>

      {/* MAIN TWO-COLUMN LAYOUT (70% Left / 30% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN (8 cols out of 12) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section 1: Submit New Safety Report */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-black text-slate-900">Submit New Safety Report</h2>
              <p className="text-xs text-slate-500 mt-0.5">Report unsafe acts, conditions, near misses or incidents</p>
            </div>

            {/* 4 Category Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* Card 1: Unsafe Act */}
              <button
                onClick={() => handleStartReportWithCategory('Unsafe Act')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-amber-400 hover:bg-amber-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="text-xs font-black text-slate-900">Unsafe Act</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report unsafe behavior</p>
              </button>

              {/* Card 2: Unsafe Condition */}
              <button
                onClick={() => handleStartReportWithCategory('Unsafe Condition')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-orange-400 hover:bg-orange-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Construction className="h-5 w-5" />
                </div>
                <div className="text-xs font-black text-slate-900">Unsafe Condition</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report hazardous condition</p>
              </button>

              {/* Card 3: Near Miss */}
              <button
                onClick={() => handleStartReportWithCategory('Near Miss')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-emerald-400 hover:bg-emerald-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Target className="h-5 w-5" />
                </div>
                <div className="text-xs font-black text-slate-900">Near Miss</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report near miss events</p>
              </button>

              {/* Card 4: Incident */}
              <button
                onClick={() => handleStartReportWithCategory('Incident')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-red-400 hover:bg-red-50/20 transition-all text-center flex flex-col items-center justify-center group cursor-pointer"
              >
                <div className="h-10 w-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                  <Siren className="h-5 w-5" />
                </div>
                <div className="text-xs font-black text-slate-900">Incident</div>
                <p className="text-[10px] text-slate-400 mt-0.5">Report actual incident</p>
              </button>

            </div>

            {/* Centered Primary Submit Button */}
            <div className="flex justify-center pt-1">
              <button
                onClick={() => onNavigateTo('report-issue')}
                className="px-6 py-2.5 rounded-xl bg-[#1E56D0] hover:bg-[#1848B0] text-white font-bold text-xs shadow-sm flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Submit New Report</span>
              </button>
            </div>
          </div>

          {/* Section 2: My Reports Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900">My Reports</h2>
                <p className="text-xs text-slate-500 mt-0.5">Track the status of your submitted reports</p>
              </div>
              <button
                onClick={() => onNavigateTo('my-report')}
                className="px-3 py-1.5 rounded-xl border border-[#1E56D0] text-[#1E56D0] hover:bg-blue-50 text-xs font-bold transition cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100">
                    <th className="py-3 px-3">Report ID</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-3">Submitted On</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">SIF Potential</th>
                    <th className="py-3 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {displayReports.slice(0, 5).map(report => {
                    const TypeIcon = report.typeIcon;
                    return (
                      <tr key={report.id} className="hover:bg-slate-50/60 transition">
                        
                        {/* Report ID */}
                        <td className="py-3.5 px-3">
                          <button
                            onClick={() => onNavigateTo('my-report')}
                            className="font-bold text-[#1E56D0] hover:underline cursor-pointer"
                          >
                            {report.id}
                          </button>
                        </td>

                        {/* Type Icon */}
                        <td className="py-3.5 px-2">
                          <TypeIcon className={`h-4 w-4 ${report.typeColor}`} />
                        </td>

                        {/* Title */}
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 font-semibold">
                          {report.title}
                        </td>

                        {/* Submitted On */}
                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                          {report.submittedOn}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {report.status === 'Under Review' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-300 text-amber-700 bg-amber-50">
                              Under Review
                            </span>
                          )}
                          {report.status === 'Investigating' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-blue-300 text-blue-700 bg-blue-50">
                              Investigating
                            </span>
                          )}
                          {report.status === 'Closed' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-300 text-emerald-700 bg-emerald-50">
                              Closed
                            </span>
                          )}
                        </td>

                        {/* SIF Potential */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {report.sifPotential === 'High' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200 text-red-700 bg-red-50">
                              High
                            </span>
                          )}
                          {report.sifPotential === 'Medium' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 text-amber-700 bg-amber-50">
                              Medium
                            </span>
                          )}
                          {report.sifPotential === 'Low' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200 text-emerald-700 bg-emerald-50">
                              Low
                            </span>
                          )}
                        </td>

                        {/* Action Menu */}
                        <td className="py-3.5 px-2 text-center text-slate-400">
                          <button
                            onClick={() => onNavigateTo('my-report')}
                            className="p-1 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          >
                            <MoreVertical className="h-4 w-4 inline" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs">
                &lt;
              </button>
              <button className="h-7 w-7 rounded-lg bg-[#1E56D0] text-white flex items-center justify-center text-xs font-bold">
                1
              </button>
              <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-xs font-bold">
                2
              </button>
              <button className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 text-xs">
                &gt;
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (4 cols out of 12) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Card 1: Quick Actions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Quick Actions</h3>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTo('report-issue')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-[#1E56D0] flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#1E56D0]">Submit New Report</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>

              <button
                onClick={() => onNavigateTo('my-report')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Search className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">Check Report Status</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          {/* Card 2: Safety Tip of the Day */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#EFF6FF] via-[#E0F2FE] to-[#EFF6FF] p-5 border border-blue-100 shadow-xs">
            <div className="relative z-10 space-y-3 max-w-[210px]">
              <div className="flex items-center gap-1.5 text-[#1E56D0]">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-black">Safety Tip of the Day</span>
              </div>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                Always follow Lockout/Tagout procedure before starting maintenance.
              </p>
              <button
                onClick={() => setShowTipsModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#1E56D0] hover:bg-[#1848B0] text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                View More Tips
              </button>
            </div>

            {/* Cute safety worker avatar illustration */}
            <div className="absolute -bottom-2 -right-3 pointer-events-none opacity-95">
              <svg width="120" height="130" viewBox="0 0 120 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background factory skyline silhouette */}
                <path d="M10 100L25 85V100H45V75L60 90V100H100V120H10V100Z" fill="#BFDBFE" opacity="0.6"/>
                {/* Yellow Safety Helmet */}
                <ellipse cx="65" cy="42" rx="20" ry="12" fill="#FBBF24"/>
                <path d="M45 42C45 30 54 22 65 22C76 22 85 30 85 42H45Z" fill="#F59E0B"/>
                <rect x="58" y="24" width="14" height="4" rx="2" fill="#FDE68A"/>
                {/* Face */}
                <ellipse cx="65" cy="52" rx="14" ry="15" fill="#FED7AA"/>
                {/* Eyes & Smile */}
                <circle cx="60" cy="50" r="1.5" fill="#374151"/>
                <circle cx="70" cy="50" r="1.5" fill="#374151"/>
                <path d="M61 58C63 60 67 60 69 58" stroke="#374151" strokeWidth="1.5" strokeLinecap="round"/>
                {/* Neck */}
                <rect x="61" y="66" width="8" height="6" fill="#FDBA74"/>
                {/* High Visibility Vest & Torso */}
                <path d="M45 72C40 76 38 88 38 100H92C92 88 90 76 85 72L75 70L65 74L55 70L45 72Z" fill="#F59E0B"/>
                {/* Blue Shirt Collar */}
                <path d="M55 70L65 80L75 70L69 68L65 72L61 68L55 70Z" fill="#2563EB"/>
                {/* Reflective Stripes */}
                <rect x="48" y="80" width="8" height="20" fill="#E2E8F0"/>
                <rect x="74" y="80" width="8" height="20" fill="#E2E8F0"/>
                {/* Thumbs up hand */}
                <ellipse cx="36" cy="78" rx="6" ry="6" fill="#FED7AA"/>
                <rect x="33" y="70" width="4" height="8" rx="2" fill="#FED7AA"/>
              </svg>
            </div>
          </div>

          {/* Card 3: My Report Summary (Donut Chart) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900">My Report Summary</h3>

            <div className="flex items-center justify-between gap-4">
              
              {/* Donut Chart with Center Total */}
              <div className="h-36 w-36 relative shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={58}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900">{totalChartReports}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">Total</span>
                </div>
              </div>

              {/* Legend with exact percentages */}
              <div className="flex-1 space-y-2 text-xs">
                {chartData.map(item => {
                  const pct = totalChartReports > 0 ? ((item.value / totalChartReports) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={item.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600 font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">
                        {item.value} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Timeframe Dropdown */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>This Month</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 cursor-pointer" />
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
        <div>© 2024 RAKSHA. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-slate-600 transition">Privacy Policy</a>
          <span>|</span>
          <a href="#" className="hover:text-slate-600 transition">Terms of Service</a>
        </div>
      </footer>

      {/* AI Analysis Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#1E56D0]">
                <Cpu className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">GATI AI Precursor Hazard Scanner</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Type or paste your observation notes to run real-time SIF prediction and matched Life-Saving Rule checks before filing.
            </p>

            <textarea
              rows={3}
              value={aiDraftText}
              onChange={e => setAiDraftText(e.target.value)}
              placeholder="e.g. Scaffolding plank not clamped securely on 3rd level of Drilling Rig A..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#1E56D0] focus:bg-white transition"
            />

            <button
              onClick={handleAnalyzeDraft}
              disabled={aiAnalyzing || !aiDraftText.trim()}
              className="w-full py-2.5 rounded-xl bg-[#1E56D0] hover:bg-[#1848B0] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {aiAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{aiAnalyzing ? 'Analyzing with GATI Engine...' : 'Run Instant AI Scan'}</span>
            </button>

            {aiResult && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">Predicted Risk:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                    {aiResult.risk} ({aiResult.score})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Life-Saving Rule:</span>{' '}
                  <span className="font-bold text-slate-800">{aiResult.rule}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold">Barrier Status:</span>{' '}
                  <span className="text-slate-700">{aiResult.barrier}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50/80 text-blue-900 border border-blue-200 text-[11px]">
                  <strong>Recommended Action:</strong> {aiResult.action}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts & Notifications Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-black text-slate-900">Active Field Safety Alerts</h3>
              </div>
              <button
                onClick={() => setShowAlertsModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>High Wind Warning — Rig Floor 01</span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  Wind speeds exceeding 35 knots. Crane lifts and working at height suspended until 16:00 hrs.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Report Status Update</span>
                </div>
                <p className="text-[11px] text-blue-700 mt-1">
                  Report <strong>RKA-2024-00010</strong> was reviewed and marked <strong>Closed</strong> with corrective work order #WO-4812.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Shield className="h-4 w-4" />
                  <span>PPE Compliance Audit Complete</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Duliajan Site scored 98% in morning tool-box compliance inspection.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Tips Modal */}
      {showTipsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-[#1E56D0]">
                <Shield className="h-5 w-5" />
                <h3 className="text-sm font-black text-slate-900">Refinery Safety Tips & SOPs</h3>
              </div>
              <button
                onClick={() => setShowTipsModal(false)}
                className="h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-800">1. Lockout / Tagout (LOTO)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Always verify zero energy state with multimeter/test gauge before touching isolated breakers.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-800">2. Fall Arrest Double Lanyards</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Maintain 100% tie-off when transitioning across scaffold sections above 1.8 meters.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="font-bold text-slate-800">3. Confined Space Gas Testing</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Perform continuous 4-gas atmospheric testing (O2, LEL, CO, H2S) prior to entry.</p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTipsModal(false);
                onNavigateTo('learning');
              }}
              className="w-full py-2.5 rounded-xl bg-[#1E56D0] hover:bg-[#1848B0] text-white font-bold text-xs text-center transition cursor-pointer"
            >
              Open Full Learning Center
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
