import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  Play,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  AiDiagnosticReport,
  BranchCode,
  LectureItem,
  MockTestAttempt,
  SyllabusSubject,
} from '../types/gate';
import { SubjectDiagnosticMetric, TopicWeaknessItem } from '../utils/analytics';
import { GATE_BRANCHES } from '../data/gateInitialData';
import { DaRadarSpotlight } from './DaRadarSpotlight';

interface OverviewAnalyticsViewProps {
  activeBranch: BranchCode;
  subjectMetrics: SubjectDiagnosticMetric[];
  daSubjectMetrics: SubjectDiagnosticMetric[];
  daSubjects: SyllabusSubject[];
  weakTopicItems: TopicWeaknessItem[];
  totalStudiedHours: number;
  totalTargetHours: number;
  overallCoveragePct: number;
  overallAccuracyPct: number;
  totalAttemptedQuestions: number;
  totalNegativeMarksLost: number;
  completedLecturesCount: number;
  totalLecturesCount: number;
  last14Days: { date: string; label: string; minutes: number; questions: number }[];
  recentAttempts: MockTestAttempt[];
  lectures: LectureItem[];
  savedDiagnostic?: AiDiagnosticReport;
  onSaveDiagnostic: (branch: BranchCode, report: AiDiagnosticReport) => void;
  onSwitchBranch: (branch: BranchCode) => void;
  onLaunchSubjectMock: (subjectId: string, topicFilter?: string, aiMode?: boolean, targetBranch?: BranchCode) => void;
  onNavigateToLecture: (lectureId?: string, subjectId?: string) => void;
  onNavigateToDailyLog: (subjectId?: string, targetBranch?: BranchCode) => void;
}

export const OverviewAnalyticsView: React.FC<OverviewAnalyticsViewProps> = ({
  activeBranch,
  subjectMetrics,
  daSubjectMetrics,
  daSubjects,
  weakTopicItems,
  totalStudiedHours,
  totalTargetHours,
  overallCoveragePct,
  overallAccuracyPct,
  totalAttemptedQuestions,
  totalNegativeMarksLost,
  completedLecturesCount,
  totalLecturesCount,
  last14Days,
  recentAttempts,
  lectures,
  savedDiagnostic,
  onSaveDiagnostic,
  onSwitchBranch,
  onLaunchSubjectMock,
  onNavigateToLecture,
  onNavigateToDailyLog,
}) => {
  const [isGeneratingDiagnostic, setIsGeneratingDiagnostic] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Weak Area' | 'Revision Needed' | 'Strong'>('ALL');

  const branchInfo = GATE_BRANCHES.find((b) => b.code === activeBranch) || GATE_BRANCHES[0];

  const filteredSubjects = subjectMetrics.filter((s) =>
    statusFilter === 'ALL' ? true : s.statusCategory === statusFilter
  );

  const handleGenerateAiDiagnostics = async () => {
    setIsGeneratingDiagnostic(true);
    setDiagnosticError(null);
    try {
      const recentSummary =
        recentAttempts.length > 0
          ? {
              testsTaken: recentAttempts.length,
              latestTestTitle: recentAttempts[0].title,
              latestScore: `${recentAttempts[0].scoredMarks} / ${recentAttempts[0].totalMarks}`,
              negativeLostTotal: totalNegativeMarksLost,
            }
          : { testsTaken: 0 };

      const response = await fetch('/api/gemini/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: activeBranch,
          branchName: branchInfo.name,
          totalStudyHours: totalStudiedHours,
          subjectMetrics: subjectMetrics.map((s) => ({
            subject: s.subjectName,
            weightageMarks: s.weightageMarks,
            coveragePct: s.syllabusCoveragePct,
            accuracyPct: s.accuracyPct,
            negativeLost: s.negativeMarksLost,
            status: s.statusCategory,
          })),
          weakTopics: weakTopicItems.map((w) => ({
            topic: w.topicName,
            subject: w.subjectName,
            reason: w.reason,
          })),
          recentTestSummary: recentSummary,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.diagnostic) {
        throw new Error(data.error || 'Could not generate diagnostic report.');
      }

      onSaveDiagnostic(activeBranch, {
        ...data.diagnostic,
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        branch: activeBranch,
      });
    } catch (err: unknown) {
      setDiagnosticError(
        err instanceof Error ? err.message : 'Unable to reach AI diagnostic service.'
      );
    } finally {
      setIsGeneratingDiagnostic(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Hero Split: Readiness Command Summary + 14-Day Study Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-mono font-medium text-slate-700">{branchInfo.paperCode}</span>
              <span aria-hidden="true">·</span>
              <span>Qualifying Cutoff: {branchInfo.QualifyingCutoff} Marks</span>
              <span aria-hidden="true">·</span>
              <span>IIT Target: {branchInfo.topRankTarget}+ Marks</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
              {branchInfo.name} Preparation Telemetry
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
              Track your syllabus mastery against real GATE subject weightages, audit marks lost to
              negative marking, and convert weak topics into targeted practice sets.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                onLaunchSubjectMock(
                  weakTopicItems[0]?.subjectId || subjectMetrics[0]?.subjectId || 'ALL',
                  weakTopicItems[0]?.topicName,
                  false
                )
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <Target className="w-3.5 h-3.5" />
              Drill Weakest Subject Mock
            </button>
            <button
              onClick={() => onNavigateToDailyLog()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log Today&apos;s Study Hours
            </button>
            <button
              onClick={() => onNavigateToLecture()}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Lecture Playlists
            </button>
          </div>
        </div>

        {/* 14-Day Study Consistency Cadence */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">14-Day Study Consistency</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily logged minutes &amp; PYQ problems solved
              </p>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-lg font-bold text-slate-900">
                {totalStudiedHours} <span className="text-xs font-normal text-slate-500">/ {totalTargetHours}h</span>
              </div>
              <div className="text-xs text-slate-500">Total Logged</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-14 gap-1.5 items-end h-24 pt-4">
            {last14Days.map((day) => {
              const heightPct = Math.min(100, Math.max(12, Math.round((day.minutes / 240) * 100)));
              const isStudied = day.minutes > 0;
              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center justify-end h-full group relative"
                  title={`${day.label}: ${day.minutes} mins (${day.questions} questions)`}
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-sm transition-opacity ${
                      day.minutes >= 120
                        ? 'bg-blue-600'
                        : isStudied
                        ? 'bg-blue-300'
                        : 'bg-slate-100'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
            <span>{last14Days[0]?.label}</span>
            <span>Today ({last14Days[last14Days.length - 1]?.minutes || 0}m logged)</span>
          </div>
        </div>
      </section>

      {/* Full-Width 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Syllabus Mastery Coverage</div>
          <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-2xl font-bold text-slate-900">{overallCoveragePct}%</span>
            <span className="text-xs text-slate-500">
              {subjectMetrics.length} Core Subjects
            </span>
          </div>
          <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${overallCoveragePct}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Mock Test Accuracy</div>
          <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-2xl font-bold text-slate-900">
              {totalAttemptedQuestions > 0 ? `${overallAccuracyPct}%` : '—'}
            </span>
            <span className="text-xs text-slate-500">
              {totalAttemptedQuestions} Qs Attempted
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {overallAccuracyPct >= 75
              ? 'Strong conceptual conversion'
              : 'Focus on NAT & 2-mark accuracy'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">Negative Marking Audit</div>
          <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-2xl font-bold text-red-600">
              -{totalNegativeMarksLost.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">Marks Lost</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Penalty from incorrect 1M (-0.33) &amp; 2M (-0.66) MCQs
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-500 font-medium">YouTube Lecture Progress</div>
          <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-2xl font-bold text-slate-900">
              {completedLecturesCount} / {totalLecturesCount}
            </span>
            <span className="text-xs text-slate-500">Lectures Watched</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Synced with branch syllabus topics
          </p>
        </div>
      </section>

      {/* GATE DA (Data Science & AI) Multi-Axis Radar Chart & Subject Progress Spotlight */}
      <DaRadarSpotlight
        activeBranch={activeBranch}
        daSubjectMetrics={daSubjectMetrics}
        daSubjects={daSubjects}
        onSwitchToDaBranch={() => onSwitchBranch('DA')}
        onLaunchDaSubjectMock={(subjectId, aiMode) =>
          onLaunchSubjectMock(subjectId, undefined, aiMode, 'DA')
        }
        onLogDaSubjectProgress={(subjectId) => onNavigateToDailyLog(subjectId, 'DA')}
      />

      {/* Personalized AI GATE Diagnostic Plan */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              Personalized GATE Diagnostic Plan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Synthesizes your mock accuracy, negative marks &amp; syllabus gaps into a 7-day remediation plan
            </p>
          </div>
          <button
            onClick={handleGenerateAiDiagnostics}
            disabled={isGeneratingDiagnostic}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingDiagnostic ? 'animate-spin' : ''}`} />
            {savedDiagnostic ? 'Refresh Analysis' : 'Generate Plan'}
          </button>
        </div>

          {diagnosticError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {diagnosticError}
            </div>
          )}

          {isGeneratingDiagnostic ? (
            <div className="py-8 space-y-4 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-5/6" />
              <div className="pt-4 space-y-2">
                <div className="h-12 bg-slate-100 rounded-lg w-full" />
                <div className="h-12 bg-slate-100 rounded-lg w-full" />
              </div>
            </div>
          ) : savedDiagnostic ? (
            <div className="mt-4 space-y-5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Projected Score Band</span>
                <span className="font-mono font-bold text-sm text-blue-600 tabular-nums">
                  {savedDiagnostic.estimatedGateScoreBand}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                {savedDiagnostic.executiveSummary}
              </p>

              <div className="space-y-2.5">
                <h3 className="text-xs font-semibold text-slate-900">Root-Cause Findings</h3>
                {savedDiagnostic.rootCauseAnalysis.map((rc, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{rc.issueTitle}</span>
                      <span
                        className={`font-medium ${
                          rc.severity === 'Critical'
                            ? 'text-red-600'
                            : rc.severity === 'Moderate'
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {rc.severity}
                      </span>
                    </div>
                    <p className="text-slate-600">{rc.diagnosis}</p>
                    <p className="text-blue-700 font-medium pt-0.5">Fix: {rc.fixAction}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-900">7-Day Remediation Schedule</h3>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {savedDiagnostic.sevenDayPlan.map((step, idx) => (
                    <div key={idx} className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-mono font-semibold text-slate-800">
                          {step.dayLabel}
                        </span>
                        <span>{step.focusSubject}</span>
                      </div>
                      <div className="font-medium text-slate-900">{step.targetTopic}</div>
                      <p className="text-slate-600">{step.actionPlan}</p>
                      <div className="text-[11px] font-mono text-slate-500 pt-0.5">
                        Target: {step.targetMetric}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <TrendingUp className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="max-w-xs mx-auto space-y-1">
                <p className="text-sm font-medium text-slate-900">
                  Ready to Analyze Your {activeBranch} Telemetry
                </p>
                <p className="text-xs text-slate-500">
                  Click &ldquo;Generate Plan&rdquo; to run a custom diagnostic on your subject
                  coverage, accuracy rate, and negative marking losses.
                </p>
              </div>
            </div>
          )}
      </section>

      {/* Subject-Wise Mastery & Accuracy Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Subject-Wise GATE Mastery &amp; Test Conversion Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare official GATE mark weightage against your logged study hours and mock test accuracy
            </p>
          </div>

          {/* Interactive Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            {(['ALL', 'Weak Area', 'Revision Needed', 'Strong'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Subjects' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-5">Subject</th>
                <th className="py-3 px-4 text-right">GATE Weightage</th>
                <th className="py-3 px-4 text-right">Study Hours</th>
                <th className="py-3 px-4 text-right">Syllabus Coverage</th>
                <th className="py-3 px-4 text-right">Mock Accuracy</th>
                <th className="py-3 px-4 text-right">Neg. Marks Lost</th>
                <th className="py-3 px-4">Diagnostic Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSubjects.map((sub) => (
                <tr key={sub.subjectId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900">{sub.subjectName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {sub.subjectCode}
                      {sub.weakTopics.length > 0 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>Focus: {sub.weakTopics[0]}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                    {sub.weightageMarks} Marks
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                    {sub.studiedHours} / {sub.targetHours}h
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${sub.syllabusCoveragePct}%` }}
                        />
                      </div>
                      <span className="text-slate-800 font-medium">{sub.syllabusCoveragePct}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs">
                    {sub.accuracyPct !== null ? (
                      <span
                        className={`font-semibold ${
                          sub.accuracyPct >= 75
                            ? 'text-emerald-600'
                            : sub.accuracyPct >= 60
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {sub.accuracyPct}% ({sub.correctCount}/{sub.questionsAttempted})
                      </span>
                    ) : (
                      <span className="text-slate-400">No tests yet</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs">
                    {sub.negativeMarksLost > 0 ? (
                      <span className="text-red-600 font-medium">-{sub.negativeMarksLost}</span>
                    ) : (
                      <span className="text-slate-400">0.00</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {sub.statusCategory === 'Weak Area' && (
                      <span className="text-red-600 font-medium flex items-center gap-1 whitespace-nowrap">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Weak Area
                      </span>
                    )}
                    {sub.statusCategory === 'Revision Needed' && (
                      <span className="text-amber-600 font-medium flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        Revision Needed
                      </span>
                    )}
                    {sub.statusCategory === 'Strong' && (
                      <span className="text-emerald-600 font-medium flex items-center gap-1 whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Strong
                      </span>
                    )}
                    {sub.statusCategory === 'Untested' && (
                      <span className="text-slate-500 font-medium flex items-center gap-1 whitespace-nowrap">
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        Untested
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => onLaunchSubjectMock(sub.subjectId, undefined, false)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Take Mock Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
