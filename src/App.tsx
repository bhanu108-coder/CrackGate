/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Download, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
import {
  AiDiagnosticReport,
  BranchCode,
  DailyStudyLog,
  GatePulseState,
  LectureItem,
  LectureWatchStatus,
  MockQuestion,
  MockTestAttempt,
  TopicMasteryStatus,
} from './types/gate';
import { DEFAULT_GATE_PULSE_STATE, GATE_BRANCHES } from './data/gateInitialData';
import { computeBranchAnalytics } from './utils/analytics';
import { OverviewAnalyticsView } from './components/OverviewAnalyticsView';
import { DailyProgressView } from './components/DailyProgressView';
import { MockTestView } from './components/MockTestView';
import { LecturesView } from './components/LecturesView';

const STORAGE_KEY = 'crackgate_state_v2';

type ActiveTab = 'overview' | 'progress' | 'mocks' | 'lectures';

export default function App() {
  const [state, setState] = useState<GatePulseState>(() => {
    try {
      localStorage.removeItem('gate_pulse_state_v1');
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GatePulseState;
        if (parsed && Array.isArray(parsed.subjects)) {
          const existingSubjectIds = new Set(parsed.subjects.map((s) => s.id));
          const missingSubjects = DEFAULT_GATE_PULSE_STATE.subjects.filter(
            (s) => !existingSubjectIds.has(s.id)
          );

          return {
            ...parsed,
            subjects: [...missingSubjects, ...parsed.subjects],
            questions: Array.isArray(parsed.questions) ? parsed.questions : [],
            lectures: Array.isArray(parsed.lectures) ? parsed.lectures : [],
            studyLogs: Array.isArray(parsed.studyLogs) ? parsed.studyLogs : [],
            testAttempts: Array.isArray(parsed.testAttempts) ? parsed.testAttempts : [],
          };
        }
      }
    } catch {
      // Fallback to clean zero-state
    }
    return DEFAULT_GATE_PULSE_STATE;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [lastWorkspaceTab, setLastWorkspaceTab] = useState<Exclude<ActiveTab, 'overview'>>('mocks');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Deep-linking context state across views
  const [mockSubjectTarget, setMockSubjectTarget] = useState<string | undefined>(undefined);
  const [mockTopicTarget, setMockTopicTarget] = useState<string | undefined>(undefined);
  const [mockAiModeTarget, setMockAiModeTarget] = useState<boolean | undefined>(undefined);
  const [lectureSelectedId, setLectureSelectedId] = useState<string | undefined>(undefined);
  const [lectureSubjectFilter, setLectureSubjectFilter] = useState<string | undefined>(undefined);
  const [dailyLogSubjectId, setDailyLogSubjectId] = useState<string | undefined>(undefined);

  const selectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== 'overview') {
      setLastWorkspaceTab(tab);
    }
  };

  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => {
      const next = !prev;
      if (next && activeTab === 'overview') {
        setActiveTab(lastWorkspaceTab);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isFocusMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFocusMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const analytics = useMemo(
    () =>
      computeBranchAnalytics(
        state.activeBranch,
        state.subjects,
        state.studyLogs,
        state.testAttempts,
        state.lectures
      ),
    [state.activeBranch, state.subjects, state.studyLogs, state.testAttempts, state.lectures]
  );

  const daAnalytics = useMemo(
    () =>
      computeBranchAnalytics(
        'DA',
        state.subjects,
        state.studyLogs,
        state.testAttempts,
        state.lectures
      ),
    [state.subjects, state.studyLogs, state.testAttempts, state.lectures]
  );

  const daSubjects = useMemo(
    () => state.subjects.filter((s) => s.branch === 'DA'),
    [state.subjects]
  );

  const daysUntilGate = useMemo(() => {
    const target = new Date(state.targetExamDate).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
  }, [state.targetExamDate]);

  // ==================== STATE MUTATION HANDLERS ====================

  const handleBranchSwitch = (branch: BranchCode) => {
    setState((prev) => ({ ...prev, activeBranch: branch }));
    setMockSubjectTarget(undefined);
    setMockTopicTarget(undefined);
    setLectureSelectedId(undefined);
    setLectureSubjectFilter(undefined);
  };

  const handleAddStudyLog = (newLog: Omit<DailyStudyLog, 'id'>) => {
    const addedHours = Number((newLog.durationMinutes / 60).toFixed(1));
    const logItem: DailyStudyLog = {
      ...newLog,
      id: `log-${Date.now()}`,
    };

    setState((prev) => ({
      ...prev,
      studyLogs: [logItem, ...prev.studyLogs],
      subjects: prev.subjects.map((sub) => {
        if (sub.id !== newLog.subjectId) return sub;
        return {
          ...sub,
          topics: sub.topics.map((t) => {
            if (t.id !== newLog.topicId) return t;
            const updatedHours = Number((t.studiedHours + addedHours).toFixed(1));
            const nextStatus: TopicMasteryStatus =
              t.status === 'not_started' ? 'in_progress' : t.status;
            return {
              ...t,
              studiedHours: updatedHours,
              status: nextStatus,
            };
          }),
        };
      }),
    }));
  };

  const handleDeleteStudyLog = (id: string) => {
    setState((prev) => ({
      ...prev,
      studyLogs: prev.studyLogs.filter((l) => l.id !== id),
    }));
  };

  const handleUpdateTopicStatus = (
    subjectId: string,
    topicId: string,
    newStatus: TopicMasteryStatus
  ) => {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((sub) => {
        if (sub.id !== subjectId) return sub;
        return {
          ...sub,
          topics: sub.topics.map((t) =>
            t.id === topicId ? { ...t, status: newStatus } : t
          ),
        };
      }),
    }));
  };

  const handleAddCustomTopic = (
    subjectId: string,
    topicName: string,
    targetHours: number,
    isHighYield: boolean
  ) => {
    setState((prev) => ({
      ...prev,
      subjects: prev.subjects.map((sub) => {
        if (sub.id !== subjectId) return sub;
        return {
          ...sub,
          topics: [
            ...sub.topics,
            {
              id: `custom-topic-${Date.now()}`,
              name: topicName,
              status: 'not_started',
              studiedHours: 0,
              targetHours,
              isHighYield,
            },
          ],
        };
      }),
    }));
  };

  const handleAddCustomQuestions = (newQuestions: MockQuestion[]) => {
    setState((prev) => ({
      ...prev,
      questions: [...newQuestions, ...prev.questions],
    }));
  };

  const handleSaveTestAttempt = (attempt: MockTestAttempt, logStudyMinutes = true) => {
    setState((prev) => {
      const updatedAttempts = [attempt, ...prev.testAttempts];
      if (!logStudyMinutes) {
        return { ...prev, testAttempts: updatedAttempts };
      }

      const firstSubjectId =
        attempt.subjectId !== 'ALL'
          ? attempt.subjectId
          : attempt.questions[0]?.subjectId ||
            prev.subjects.find((s) => s.branch === attempt.branch)?.id ||
            '';
      const firstSub = prev.subjects.find((s) => s.id === firstSubjectId);
      const firstTopicId = firstSub?.topics[0]?.id || '';

      const autoLog: DailyStudyLog = {
        id: `log-mock-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        branch: attempt.branch,
        subjectId: firstSubjectId,
        topicId: firstTopicId,
        durationMinutes: Math.max(15, Math.round(attempt.timeTakenSeconds / 60)),
        questionsSolved: attempt.totalQuestions,
        activityType: 'practice',
        confidence:
          attempt.scoredMarks / Math.max(1, attempt.totalMarks) >= 0.7 ? 4 : 2,
        notes: `Completed mock test "${attempt.title}" (${attempt.scoredMarks}/${attempt.totalMarks} marks, -${attempt.negativeMarksLost} negative marks).`,
      };

      return {
        ...prev,
        testAttempts: updatedAttempts,
        studyLogs: [autoLog, ...prev.studyLogs],
      };
    });
  };

  const handleAddLecture = (lectureData: Omit<LectureItem, 'id' | 'addedAt'>) => {
    const newItem: LectureItem = {
      ...lectureData,
      id: `lec-${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
    };
    setState((prev) => ({
      ...prev,
      lectures: [newItem, ...prev.lectures],
    }));
    setLectureSelectedId(newItem.id);
  };

  const handleUpdateLecture = (
    id: string,
    updates: Partial<Pick<LectureItem, 'watchedMinutes' | 'durationMinutes' | 'status' | 'notes'>>
  ) => {
    setState((prev) => ({
      ...prev,
      lectures: prev.lectures.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  };

  const handleDeleteLecture = (id: string) => {
    setState((prev) => ({
      ...prev,
      lectures: prev.lectures.filter((l) => l.id !== id),
    }));
  };

  const handleCompleteAndLogLecture = (lecture: LectureItem) => {
    handleUpdateLecture(lecture.id, {
      watchedMinutes: lecture.durationMinutes,
      status: 'completed',
    });

    const sub = state.subjects.find((s) => s.id === lecture.subjectId);
    const matchingTopic =
      sub?.topics.find((t) =>
        t.name.toLowerCase().includes(lecture.topicName.toLowerCase().slice(0, 8))
      ) || sub?.topics[0];

    if (sub && matchingTopic) {
      handleAddStudyLog({
        date: new Date().toISOString().split('T')[0],
        branch: lecture.branch,
        subjectId: sub.id,
        topicId: matchingTopic.id,
        durationMinutes: lecture.durationMinutes,
        questionsSolved: 0,
        activityType: 'lecture',
        confidence: 4,
        notes: `Watched YouTube lecture: "${lecture.title}" (${lecture.channelName}).`,
      });
    }
  };

  const handleSaveDiagnostic = (branch: BranchCode, report: AiDiagnosticReport) => {
    setState((prev) => ({
      ...prev,
      diagnosticsByBranch: {
        ...prev.diagnosticsByBranch,
        [branch]: report,
      },
    }));
  };

  const handleExportJsonBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crackgate-${state.activeBranch.toLowerCase()}-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDemoData = () => {
    setState(DEFAULT_GATE_PULSE_STATE);
    localStorage.removeItem(STORAGE_KEY);
  };

  const effectiveWorkspaceTab: Exclude<ActiveTab, 'overview'> =
    activeTab === 'overview' ? lastWorkspaceTab : activeTab;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#overview"
            onClick={(e) => {
              e.preventDefault();
              if (!isFocusMode) {
                selectTab('overview');
              }
            }}
            className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
          >
            CrackGate
          </a>

          {/* Zone 2: Navigation links (hidden in Focus Mode, replaced by minimal active workspace indicator) */}
          {!isFocusMode ? (
            <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
              <a
                href="#overview"
                onClick={(e) => {
                  e.preventDefault();
                  selectTab('overview');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeTab === 'overview'
                    ? 'text-slate-900 border-blue-600 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Overview
              </a>
              <a
                href="#progress"
                onClick={(e) => {
                  e.preventDefault();
                  selectTab('progress');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeTab === 'progress'
                    ? 'text-slate-900 border-blue-600 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Daily Progress
              </a>
              <a
                href="#mocks"
                onClick={(e) => {
                  e.preventDefault();
                  selectTab('mocks');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeTab === 'mocks'
                    ? 'text-slate-900 border-blue-600 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Mock Tests
              </a>
              <a
                href="#lectures"
                onClick={(e) => {
                  e.preventDefault();
                  selectTab('lectures');
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  activeTab === 'lectures'
                    ? 'text-slate-900 border-blue-600 font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Lectures
              </a>
            </nav>
          ) : (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-800">
                GATE {state.activeBranch}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Focus Workspace:{' '}
                <strong className="text-slate-900">
                  {effectiveWorkspaceTab === 'mocks'
                    ? 'Subject Mock Tests'
                    : effectiveWorkspaceTab === 'lectures'
                    ? 'YouTube Lecture Studio'
                    : 'Daily Study Progress'}
                </strong>
              </span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <div className="hidden sm:flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                {(
                  [
                    { id: 'progress', label: 'Progress' },
                    { id: 'mocks', label: 'Mock Tests' },
                    { id: 'lectures', label: 'Lectures' },
                  ] as const
                ).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => selectTab(w.id)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                      effectiveWorkspaceTab === w.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Zone 3: Focus Mode Toggle */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleToggleFocusMode}
              aria-pressed={isFocusMode}
              title={
                isFocusMode
                  ? 'Exit Focus Mode (Esc) to restore navigation and analytics'
                  : 'Enter Focus Mode to hide navigation and analytics'
              }
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                isFocusMode
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  Exit Focus Mode
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  Focus Mode
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Workspace Context Toolbar (Hidden in Focus Mode) */}
      {!isFocusMode && (
        <div className="bg-slate-900 text-slate-200 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
            {/* Multi-Branch Segmented Selector (CS, DA, EC, EE, ME, CE) */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs text-slate-400 whitespace-nowrap mr-1">
                Engineering Stream:
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-slate-800 rounded-lg">
                {GATE_BRANCHES.map((b) => (
                  <button
                    key={b.code}
                    onClick={() => handleBranchSwitch(b.code)}
                    className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      state.activeBranch === b.code
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {b.code} — {b.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Countdown & LocalStorage Export/Reset */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>{daysUntilGate} Days to GATE Exam</span>
              </div>

              <span aria-hidden="true" className="text-slate-700">·</span>

              <button
                onClick={handleExportJsonBackup}
                className="text-slate-300 hover:text-white flex items-center gap-1 whitespace-nowrap cursor-pointer"
                title="Export study logs and mock test history as JSON"
              >
                <Download className="w-3.5 h-3.5" />
                Export Backup
              </button>

              <button
                onClick={handleResetDemoData}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                title="Reset local storage to default seed data"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {!isFocusMode && activeTab === 'overview' && (
          <OverviewAnalyticsView
            activeBranch={state.activeBranch}
            subjectMetrics={analytics.subjectMetrics}
            daSubjectMetrics={daAnalytics.subjectMetrics}
            daSubjects={daSubjects}
            weakTopicItems={analytics.weakTopicItems}
            totalStudiedHours={analytics.totalStudiedHours}
            totalTargetHours={analytics.totalTargetHours}
            overallCoveragePct={analytics.overallCoveragePct}
            overallAccuracyPct={analytics.overallAccuracyPct}
            totalAttemptedQuestions={analytics.totalAttemptedQuestions}
            totalNegativeMarksLost={analytics.totalNegativeMarksLost}
            completedLecturesCount={analytics.completedLecturesCount}
            totalLecturesCount={analytics.totalLecturesCount}
            last14Days={analytics.last14Days}
            recentAttempts={analytics.branchAttempts}
            lectures={state.lectures}
            savedDiagnostic={state.diagnosticsByBranch[state.activeBranch]}
            onSaveDiagnostic={handleSaveDiagnostic}
            onSwitchBranch={handleBranchSwitch}
            onLaunchSubjectMock={(subjectId, topicFilter, aiMode, targetBranch) => {
              if (targetBranch && targetBranch !== state.activeBranch) {
                setState((prev) => ({ ...prev, activeBranch: targetBranch }));
              }
              setMockSubjectTarget(subjectId);
              setMockTopicTarget(topicFilter);
              setMockAiModeTarget(aiMode);
              selectTab('mocks');
            }}
            onNavigateToLecture={(lectureId, subjectId) => {
              setLectureSelectedId(lectureId);
              setLectureSubjectFilter(subjectId);
              selectTab('lectures');
            }}
            onNavigateToDailyLog={(subjectId, targetBranch) => {
              if (targetBranch && targetBranch !== state.activeBranch) {
                setState((prev) => ({ ...prev, activeBranch: targetBranch }));
              }
              setDailyLogSubjectId(subjectId);
              selectTab('progress');
            }}
          />
        )}

        {(isFocusMode ? effectiveWorkspaceTab === 'progress' : activeTab === 'progress') && (
          <DailyProgressView
            activeBranch={state.activeBranch}
            subjects={state.subjects}
            studyLogs={state.studyLogs}
            initialSelectedSubjectId={dailyLogSubjectId}
            isFocusMode={isFocusMode}
            onAddStudyLog={handleAddStudyLog}
            onDeleteStudyLog={handleDeleteStudyLog}
            onUpdateTopicStatus={handleUpdateTopicStatus}
            onAddCustomTopic={handleAddCustomTopic}
          />
        )}

        {(isFocusMode ? effectiveWorkspaceTab === 'mocks' : activeTab === 'mocks') && (
          <MockTestView
            activeBranch={state.activeBranch}
            subjects={state.subjects}
            questions={state.questions}
            testAttempts={state.testAttempts}
            preselectedSubjectId={mockSubjectTarget}
            preselectedTopicFilter={mockTopicTarget}
            preselectedAiMode={mockAiModeTarget}
            isFocusMode={isFocusMode}
            onAddCustomQuestions={handleAddCustomQuestions}
            onSaveTestAttempt={handleSaveTestAttempt}
          />
        )}

        {(isFocusMode ? effectiveWorkspaceTab === 'lectures' : activeTab === 'lectures') && (
          <LecturesView
            activeBranch={state.activeBranch}
            subjects={state.subjects}
            lectures={state.lectures}
            initialSelectedLectureId={lectureSelectedId}
            initialSubjectFilter={lectureSubjectFilter}
            isFocusMode={isFocusMode}
            onAddLecture={handleAddLecture}
            onUpdateLecture={handleUpdateLecture}
            onDeleteLecture={handleDeleteLecture}
            onCompleteAndLogLecture={handleCompleteAndLogLecture}
          />
        )}
      </main>

      {/* Quiet Footer (Hidden in Focus Mode) */}
      {!isFocusMode && (
        <footer className="bg-white border-t border-slate-200 py-5 px-6 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              CrackGate — Graduate Aptitude Test in Engineering Preparation &amp; Telemetry Workspace
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => selectTab('overview')}
                className="hover:text-slate-900 cursor-pointer"
              >
                Weak-Area Analytics
              </button>
              <button
                onClick={() => selectTab('progress')}
                className="hover:text-slate-900 cursor-pointer"
              >
                Daily Study Log
              </button>
              <button
                onClick={() => selectTab('mocks')}
                className="hover:text-slate-900 cursor-pointer"
              >
                Subject Mock Tests
              </button>
              <button
                onClick={() => selectTab('lectures')}
                className="hover:text-slate-900 cursor-pointer"
              >
                YouTube Playlists
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
