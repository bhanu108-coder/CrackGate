import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  BookOpen,
  RotateCcw,
  Circle,
} from 'lucide-react';
import {
  BranchCode,
  DailyStudyLog,
  StudyActivityType,
  SyllabusSubject,
  TopicMasteryStatus,
} from '../types/gate';

interface DailyProgressViewProps {
  activeBranch: BranchCode;
  subjects: SyllabusSubject[];
  studyLogs: DailyStudyLog[];
  initialSelectedSubjectId?: string;
  isFocusMode?: boolean;
  onAddStudyLog: (log: Omit<DailyStudyLog, 'id'>) => void;
  onDeleteStudyLog: (id: string) => void;
  onUpdateTopicStatus: (
    subjectId: string,
    topicId: string,
    newStatus: TopicMasteryStatus
  ) => void;
  onAddCustomTopic: (
    subjectId: string,
    topicName: string,
    targetHours: number,
    isHighYield: boolean
  ) => void;
}

const STATUS_LABELS: Record<TopicMasteryStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'Studying',
  revised: 'Revised',
  mastered: 'Mastered',
};

const NEXT_STATUS: Record<TopicMasteryStatus, TopicMasteryStatus> = {
  not_started: 'in_progress',
  in_progress: 'revised',
  revised: 'mastered',
  mastered: 'not_started',
};

export const DailyProgressView: React.FC<DailyProgressViewProps> = ({
  activeBranch,
  subjects,
  studyLogs,
  initialSelectedSubjectId,
  onAddStudyLog,
  onDeleteStudyLog,
  onUpdateTopicStatus,
  onAddCustomTopic,
}) => {
  const branchSubjects = subjects.filter((s) => s.branch === activeBranch);
  const branchLogs = studyLogs.filter((l) => l.branch === activeBranch);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSelectedSubjectId || branchSubjects[0]?.id || ''
  );
  const currentSubject =
    branchSubjects.find((s) => s.id === selectedSubjectId) || branchSubjects[0];

  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    currentSubject?.topics[0]?.id || ''
  );
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [durationMinutes, setDurationMinutes] = useState<number>(90);
  const [questionsSolved, setQuestionsSolved] = useState<number>(15);
  const [activityType, setActivityType] = useState<StudyActivityType>('practice');
  const [confidence, setConfidence] = useState<number>(4);
  const [notes, setNotes] = useState<string>('');
  const [logSavedToast, setLogSavedToast] = useState<boolean>(false);

  // Custom topic form state
  const [newTopicSubjectId, setNewTopicSubjectId] = useState<string>(
    branchSubjects[0]?.id || ''
  );
  const [newTopicName, setNewTopicName] = useState<string>('');
  const [newTopicHours, setNewTopicHours] = useState<number>(10);
  const [newTopicHighYield, setNewTopicHighYield] = useState<boolean>(true);
  const [showAddTopicModal, setShowAddTopicModal] = useState<boolean>(false);

  // Filter state for syllabus view
  const [syllabusFilter, setSyllabusFilter] = useState<'ALL' | TopicMasteryStatus>('ALL');

  useEffect(() => {
    const firstSub = branchSubjects.find((s) => s.id === initialSelectedSubjectId) || branchSubjects[0];
    if (firstSub) {
      setSelectedSubjectId(firstSub.id);
      setSelectedTopicId(firstSub.topics[0]?.id || '');
      setNewTopicSubjectId(firstSub.id);
    }
  }, [activeBranch, initialSelectedSubjectId]);

  const handleSubjectChange = (subId: string) => {
    setSelectedSubjectId(subId);
    const sub = branchSubjects.find((s) => s.id === subId);
    if (sub && sub.topics.length > 0) {
      setSelectedTopicId(sub.topics[0].id);
    } else {
      setSelectedTopicId('');
    }
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject || !selectedTopicId || durationMinutes <= 0) return;

    onAddStudyLog({
      date,
      branch: activeBranch,
      subjectId: currentSubject.id,
      topicId: selectedTopicId,
      durationMinutes: Number(durationMinutes),
      questionsSolved: Number(questionsSolved) || 0,
      activityType,
      confidence,
      notes: notes.trim() || `Studied ${currentSubject.name} for ${durationMinutes} mins.`,
    });

    setNotes('');
    setLogSavedToast(true);
    setTimeout(() => setLogSavedToast(false), 2500);
  };

  const handleCreateCustomTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicSubjectId) return;
    onAddCustomTopic(
      newTopicSubjectId,
      newTopicName.trim(),
      Math.max(2, Number(newTopicHours) || 8),
      newTopicHighYield
    );
    setNewTopicName('');
    setShowAddTopicModal(false);
  };

  return (
    <div className="space-y-8">
      {/* Top 2-Column Split: Log Daily Progress Form + Recent Study Log Ledger */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Log Daily Study Session Form */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Add Daily Study Progress (Record Study Session)
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record what you studied today — &ldquo;Logged / Studied Hours&rdquo; simply means the total study time you have completed and saved so far
                </p>
              </div>
              {logSavedToast && (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
            </div>

            <form onSubmit={handleLogSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Activity Type
                  </label>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as StudyActivityType)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  >
                    <option value="practice">PYQ &amp; Numerical Practice</option>
                    <option value="lecture">Video Lecture Study</option>
                    <option value="theory">Standard Book / Concept Notes</option>
                    <option value="revision">Formula &amp; Short Notes Revision</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  GATE Subject ({activeBranch})
                </label>
                <select
                  value={currentSubject?.id || ''}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  {branchSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.weightageMarks}M Weightage)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Syllabus Topic
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  {currentSubject?.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name} ({topic.studiedHours}h studied of {topic.targetHours}h target)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Time Studied (Minutes): <span className="font-mono font-semibold">{durationMinutes}m</span>
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={600}
                    step={5}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    PYQ / Problems Solved
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={questionsSolved}
                    onChange={(e) => setQuestionsSolved(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Topic Confidence Level</span>
                  <span className="font-mono text-slate-600">
                    {confidence} / 5 {confidence <= 2 ? '(Flagged for Revision)' : '(Solid)'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setConfidence(level)}
                      className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer ${
                        confidence === level
                          ? level <= 2
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Key Formulas / Mistake Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Practiced 2-level paging EMAT problems; watch out for TLB miss penalty formula."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Save Study Session
              </button>
            </form>
          </div>
        </div>

        {/* Right: Chronological Study History */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Your Recorded Study Sessions ({activeBranch})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every session you save here adds to your topic&apos;s studied hours and daily streak
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {branchLogs.length} Sessions Saved
              </span>
            </div>

            {branchLogs.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-900">No study logs recorded yet</p>
                <p className="text-xs text-slate-500">
                  Use the form on the left to log your first study session for {activeBranch}.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[430px] overflow-y-auto pr-1">
                {branchLogs.map((log) => {
                  const sub = branchSubjects.find((s) => s.id === log.subjectId);
                  const topic = sub?.topics.find((t) => t.id === log.topicId);
                  return (
                    <div
                      key={log.id}
                      className="py-3.5 flex items-start justify-between gap-4 group"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-medium text-slate-800 tabular-nums">
                            {log.date}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-slate-700">
                            {sub?.name || 'Subject'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{log.activityType}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-blue-600 font-medium">
                            {log.durationMinutes} mins
                          </span>
                          {log.questionsSolved > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums text-slate-700">
                                {log.questionsSolved} Qs solved
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-mono ${
                              log.confidence <= 2 ? 'text-red-600 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            Confidence {log.confidence}/5
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {topic?.name || 'General Syllabus Study'}
                        </div>
                        {log.notes && (
                          <p className="text-xs text-slate-600 leading-relaxed">{log.notes}</p>
                        )}
                      </div>

                      <button
                        onClick={() => onDeleteStudyLog(log.id)}
                        title="Delete log entry"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Full Branch Syllabus Mastery Tracker */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {activeBranch} Official Syllabus Mastery Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any topic&apos;s status button to cycle mastery stage (Not Started → Studying → Revised → Mastered)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['ALL', 'not_started', 'in_progress', 'revised', 'mastered'] as const).map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => setSyllabusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      syllabusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All Topics' : STATUS_LABELS[st]}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setShowAddTopicModal(!showAddTopicModal)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Topic
            </button>
          </div>
        </div>

        {showAddTopicModal && (
          <form
            onSubmit={handleCreateCustomTopic}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
              <select
                value={newTopicSubjectId}
                onChange={(e) => setNewTopicSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              >
                {branchSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">Topic Name</label>
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="e.g., Dijkstras Shortest Path Proof"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Hrs</label>
              <input
                type="number"
                min={2}
                max={50}
                value={newTopicHours}
                onChange={(e) => setNewTopicHours(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <button
                type="submit"
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Add Topic
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branchSubjects.map((subject) => {
            const visibleTopics = subject.topics.filter((t) =>
              syllabusFilter === 'ALL' ? true : t.status === syllabusFilter
            );

            return (
              <div
                key={subject.id}
                className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 font-mono">
                        {subject.code} · {subject.weightageMarks} Marks Weightage
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">{subject.name}</h3>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-slate-600">
                      {subject.topics.filter((t) => t.status === 'mastered' || t.status === 'revised').length}/
                      {subject.topics.length} Done
                    </span>
                  </div>

                  {visibleTopics.length === 0 ? (
                    <p className="py-6 text-xs text-slate-400 text-center">
                      No topics match the selected status filter.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100 mt-2">
                      {visibleTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-900 truncate">
                              {topic.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                              {topic.studiedHours}h studied / {topic.targetHours}h target
                              {topic.isHighYield ? ' · High-Weightage' : ''}
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              onUpdateTopicStatus(
                                subject.id,
                                topic.id,
                                NEXT_STATUS[topic.status]
                              )
                            }
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                              topic.status === 'mastered'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : topic.status === 'revised'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : topic.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {topic.status === 'mastered' && <CheckCircle2 className="w-3 h-3" />}
                            {topic.status === 'revised' && <RotateCcw className="w-3 h-3" />}
                            {topic.status === 'in_progress' && <BookOpen className="w-3 h-3" />}
                            {topic.status === 'not_started' && <Circle className="w-3 h-3" />}
                            {STATUS_LABELS[topic.status]}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
