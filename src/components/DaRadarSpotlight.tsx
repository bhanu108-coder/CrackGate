import React, { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Layers,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { BranchCode, SyllabusSubject } from '../types/gate';
import { SubjectDiagnosticMetric } from '../utils/analytics';

interface DaRadarSpotlightProps {
  activeBranch: BranchCode;
  daSubjectMetrics: SubjectDiagnosticMetric[];
  daSubjects: SyllabusSubject[];
  onSwitchToDaBranch: () => void;
  onLaunchDaSubjectMock: (subjectId: string, aiMode?: boolean) => void;
  onLogDaSubjectProgress: (subjectId: string) => void;
}

const SHORT_DA_LABELS: Record<string, string> = {
  'da-prob': 'Prob. & Stats',
  'da-la': 'Linear Algebra',
  'da-calc': 'Calculus & Opt.',
  'da-pdsa': 'Python & DSA',
  'da-dbdw': 'DBMS & DW',
  'da-ml': 'Machine Learning',
  'da-ai': 'Artificial Intel.',
  'da-ga': 'Gen. Aptitude',
};

type RadarMetricMode = 'composite' | 'syllabus' | 'hours';

export const DaRadarSpotlight: React.FC<DaRadarSpotlightProps> = ({
  activeBranch,
  daSubjectMetrics,
  daSubjects,
  onSwitchToDaBranch,
  onLaunchDaSubjectMock,
  onLogDaSubjectProgress,
}) => {
  const [metricMode, setMetricMode] = useState<RadarMetricMode>('composite');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    daSubjectMetrics[0]?.subjectId || 'da-ml'
  );

  // Compute radar values (0-100) for all 8 GATE DA subjects
  const radarNodes = useMemo(() => {
    const count = daSubjectMetrics.length || 1;
    const centerX = 190;
    const centerY = 180;
    const maxRadius = 118;

    return daSubjectMetrics.map((metric, idx) => {
      const hoursPct =
        metric.targetHours > 0
          ? Math.min(100, Math.round((metric.studiedHours / metric.targetHours) * 100))
          : 0;
      const syllabusPct = metric.syllabusCoveragePct;
      const compositePct =
        metric.accuracyPct !== null
          ? Math.round(syllabusPct * 0.5 + hoursPct * 0.2 + metric.accuracyPct * 0.3)
          : Math.round(syllabusPct * 0.65 + hoursPct * 0.35);

      const value =
        metricMode === 'syllabus'
          ? syllabusPct
          : metricMode === 'hours'
          ? hoursPct
          : compositePct;

      // Angle starting from top (-PI / 2)
      const angle = (Math.PI * 2 * idx) / count - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const axisX = centerX + maxRadius * cos;
      const axisY = centerY + maxRadius * sin;

      const valRadius = (Math.max(8, value) / 100) * maxRadius;
      const pointX = centerX + valRadius * cos;
      const pointY = centerY + valRadius * sin;

      const benchmarkRadius = 0.8 * maxRadius; // 80% target readiness contour
      const benchX = centerX + benchmarkRadius * cos;
      const benchY = centerY + benchmarkRadius * sin;

      const labelRadius = maxRadius + 28;
      const labelX = centerX + labelRadius * cos;
      const labelY = centerY + labelRadius * sin;

      return {
        ...metric,
        shortLabel: SHORT_DA_LABELS[metric.subjectId] || metric.subjectName.slice(0, 14),
        hoursPct,
        syllabusPct,
        compositePct,
        value,
        angle,
        axisX,
        axisY,
        pointX,
        pointY,
        benchX,
        benchY,
        labelX,
        labelY,
      };
    });
  }, [daSubjectMetrics, metricMode]);

  const activeNode =
    radarNodes.find((n) => n.subjectId === selectedSubjectId) || radarNodes[0];
  const activeSyllabusSubject = daSubjects.find(
    (s) => s.id === activeNode?.subjectId
  );

  const overallDaMastery = useMemo(() => {
    if (radarNodes.length === 0) return 0;
    const weightedSum = radarNodes.reduce(
      (acc, n) => acc + n.value * n.weightageMarks,
      0
    );
    const totalWeight = radarNodes.reduce((acc, n) => acc + n.weightageMarks, 0) || 100;
    return Math.round(weightedSum / totalWeight);
  }, [radarNodes]);

  const polygonPoints = radarNodes.map((n) => `${n.pointX},${n.pointY}`).join(' ');
  const benchmarkPoints = radarNodes.map((n) => `${n.benchX},${n.benchY}`).join(' ');

  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span className="font-mono font-semibold text-blue-600">GATE DA</span>
            <span aria-hidden="true">·</span>
            <span>Data Science &amp; Artificial Intelligence</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">8 Syllabus Domains (100 Marks)</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Data Science &amp; AI (DA) Multi-Axis Mastery Radar &amp; Syllabus Breakdown
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Mode Segmented Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'composite', label: 'Composite Mastery' },
                { id: 'syllabus', label: 'Syllabus Coverage' },
                { id: 'hours', label: 'Study Hours %' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMetricMode(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  metricMode === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeBranch !== 'DA' && (
            <button
              type="button"
              onClick={onSwitchToDaBranch}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Switch Active Stream to DA
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Split: SVG Radar Chart (Left 5 cols) + Interactive DA Subject Bars & Topic Inspector (Right 7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Column: 8-Axis Spider / Radar Chart */}
        <div className="lg:col-span-5 p-6 flex flex-col justify-between items-center bg-slate-50/40">
          <div className="w-full flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              8-Domain Mastery Topology
            </span>
            <span className="font-mono tabular-nums font-bold text-blue-600">
              Weighted Readiness: {overallDaMastery}%
            </span>
          </div>

          {/* Interactive SVG Radar */}
          <div className="w-full max-w-[380px] my-2">
            <svg
              viewBox="0 0 380 360"
              className="w-full h-auto overflow-visible select-none"
              role="img"
              aria-label="GATE DA 8-Subject Mastery Radar Chart"
            >
              {/* Concentric Octagonal Grid Rings (25%, 50%, 75%, 100%) */}
              {[0.25, 0.5, 0.75, 1].map((ringRatio) => {
                const ringPoints = radarNodes
                  .map((n) => {
                    const r = 118 * ringRatio;
                    const x = 190 + r * Math.cos(n.angle);
                    const y = 180 + r * Math.sin(n.angle);
                    return `${x},${y}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={ringRatio}
                    points={ringPoints}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Ring Percentage Labels on Top Vertical Axis */}
              {[25, 50, 75, 100].map((pct) => (
                <text
                  key={pct}
                  x={194}
                  y={180 - (pct / 100) * 118 + 3}
                  className="fill-slate-400 text-[9px] font-mono"
                >
                  {pct}%
                </text>
              ))}

              {/* Radial Spokes from Center to Each of the 8 DA Subjects */}
              {radarNodes.map((n) => (
                <line
                  key={`axis-${n.subjectId}`}
                  x1={190}
                  y1={180}
                  x2={n.axisX}
                  y2={n.axisY}
                  stroke={
                    selectedSubjectId === n.subjectId ? '#93C5FD' : '#E2E8F0'
                  }
                  strokeWidth={selectedSubjectId === n.subjectId ? '1.75' : '1'}
                />
              ))}

              {/* 80% Target Benchmark Contour (Emerald Dashed) */}
              <polygon
                points={benchmarkPoints}
                fill="none"
                stroke="#16A34A"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />

              {/* Student Current Mastery Polygon (Royal Cobalt) */}
              <polygon
                points={polygonPoints}
                fill="rgba(37, 99, 235, 0.16)"
                stroke="#2563EB"
                strokeWidth="2.25"
              />

              {/* Interactive Vertex Points & Labels */}
              {radarNodes.map((n) => {
                const isSelected = selectedSubjectId === n.subjectId;
                const textAnchor =
                  Math.abs(n.labelX - 190) < 15
                    ? 'middle'
                    : n.labelX > 190
                    ? 'start'
                    : 'end';

                return (
                  <g
                    key={n.subjectId}
                    onClick={() => setSelectedSubjectId(n.subjectId)}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={n.pointX}
                      cy={n.pointY}
                      r={isSelected ? 6 : 4.5}
                      fill={isSelected ? '#1D4ED8' : '#2563EB'}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={n.labelX}
                      y={n.labelY - 4}
                      textAnchor={textAnchor}
                      className={`text-[10px] transition-colors ${
                        isSelected
                          ? 'fill-blue-700 font-bold'
                          : 'fill-slate-700 font-medium group-hover:fill-slate-900'
                      }`}
                    >
                      {n.shortLabel}
                    </text>
                    <text
                      x={n.labelX}
                      y={n.labelY + 8}
                      textAnchor={textAnchor}
                      className={`text-[9px] font-mono ${
                        isSelected ? 'fill-blue-600 font-bold' : 'fill-slate-500'
                      }`}
                    >
                      {n.value}% · {n.weightageMarks}M
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Radar Legend */}
          <div className="w-full pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-blue-600 inline-block" />
              <span>Current DA Mastery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 border-b border-dashed border-emerald-600 inline-block" />
              <span>80% IIT Rank Benchmark</span>
            </div>
          </div>
        </div>

        {/* Right Column: All 8 GATE DA Subjects Progress List + Selected Subject Topic Breakdown */}
        <div className="lg:col-span-7 p-6 flex flex-col justify-between space-y-6">
          {/* 8-Subject Progress Bars */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                All 8 GATE DA Syllabus Areas (Click any subject to inspect topics)
              </span>
              <span className="font-mono">Weightage · Hours · Mastery</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {radarNodes.map((node) => {
                const isSelected = node.subjectId === selectedSubjectId;
                return (
                  <button
                    key={node.subjectId}
                    type="button"
                    onClick={() => setSelectedSubjectId(node.subjectId)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-600'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {node.subjectName}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-600 tabular-nums shrink-0">
                        {node.value}%
                      </span>
                    </div>

                    <div className="mt-1.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          node.value >= 75
                            ? 'bg-emerald-600'
                            : node.value >= 55
                            ? 'bg-blue-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${node.value}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>{node.weightageMarks} Marks</span>
                      <span>
                        {node.studiedHours}/{node.targetHours}h
                      </span>
                      <span
                        className={
                          node.statusCategory === 'Weak Area'
                            ? 'text-red-600 font-sans font-medium'
                            : node.statusCategory === 'Strong'
                            ? 'text-emerald-600 font-sans font-medium'
                            : 'text-amber-600 font-sans font-medium'
                        }
                      >
                        {node.statusCategory}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected DA Subject Topic Drilldown */}
          {activeNode && activeSyllabusSubject && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <span>{activeSyllabusSubject.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeNode.weightageMarks} Marks Official Weightage</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeNode.studiedHours}h / {activeNode.targetHours}h Studied
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    {activeNode.subjectName} — Topic Mastery Breakdown
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLogDaSubjectProgress(activeNode.subjectId)}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Log Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchDaSubjectMock(activeNode.subjectId, false)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Target className="w-3.5 h-3.5" />
                    Practice DA Mock
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeSyllabusSubject.topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-2.5 rounded-lg bg-white border border-slate-200/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate" title={topic.name}>
                        {topic.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {topic.studiedHours}/{topic.targetHours}h
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-medium whitespace-nowrap shrink-0 flex items-center gap-1 ${
                        topic.status === 'mastered'
                          ? 'text-emerald-600'
                          : topic.status === 'revised'
                          ? 'text-blue-600'
                          : topic.status === 'in_progress'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}
                    >
                      {topic.status === 'mastered' && <CheckCircle2 className="w-3 h-3" />}
                      {topic.status === 'revised' && <CheckCircle2 className="w-3 h-3" />}
                      {topic.status === 'in_progress' && <Clock className="w-3 h-3" />}
                      {topic.status === 'not_started' && <AlertTriangle className="w-3 h-3" />}
                      {topic.status === 'mastered'
                        ? 'Mastered'
                        : topic.status === 'revised'
                        ? 'Revised'
                        : topic.status === 'in_progress'
                        ? 'Studying'
                        : 'Not Started'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
