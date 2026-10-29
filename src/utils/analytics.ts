import {
  BranchCode,
  DailyStudyLog,
  LectureItem,
  MockTestAttempt,
  SyllabusSubject,
} from '../types/gate';

export interface SubjectDiagnosticMetric {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  weightageMarks: number;
  studiedHours: number;
  targetHours: number;
  syllabusCoveragePct: number;
  questionsAttempted: number;
  correctCount: number;
  incorrectCount: number;
  accuracyPct: number | null;
  scoredMarks: number;
  maxAttemptedMarks: number;
  negativeMarksLost: number;
  avgTimePerQuestionSec: number | null;
  statusCategory: 'Weak Area' | 'Revision Needed' | 'Strong' | 'Untested';
  weakTopics: string[];
}

export interface TopicWeaknessItem {
  topicName: string;
  subjectId: string;
  subjectName: string;
  reason: string;
  accuracyPct: number | null;
  negativeLost: number;
  avgTimeSec: number | null;
  severity: 'Critical' | 'Moderate';
}

export function extractYouTubeVideoId(url: string): string {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').slice(0, 11);
    }
    const vParam = parsed.searchParams.get('v');
    if (vParam && vParam.length >= 11) {
      return vParam.slice(0, 11);
    }
    const parts = parsed.pathname.split('/');
    const embedIdx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live');
    if (embedIdx !== -1 && parts[embedIdx + 1]) {
      return parts[embedIdx + 1].slice(0, 11);
    }
  } catch {
    // Fallback regex
  }
  const match = trimmed.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '2quKyPnUShQ';
}

export function computeBranchAnalytics(
  branch: BranchCode,
  subjects: SyllabusSubject[],
  studyLogs: DailyStudyLog[],
  testAttempts: MockTestAttempt[],
  lectures: LectureItem[]
) {
  const branchSubjects = subjects.filter((s) => s.branch === branch);
  const branchLogs = studyLogs.filter((l) => l.branch === branch);
  const branchAttempts = testAttempts.filter((a) => a.branch === branch);
  const branchLectures = lectures.filter((l) => l.branch === branch);

  // Per-subject aggregation
  const subjectMetrics: SubjectDiagnosticMetric[] = branchSubjects.map((sub) => {
    const studiedHours = sub.topics.reduce((acc, t) => acc + t.studiedHours, 0);
    const targetHours = sub.topics.reduce((acc, t) => acc + t.targetHours, 0);

    const completedWeight = sub.topics.reduce((acc, t) => {
      if (t.status === 'mastered') return acc + 1;
      if (t.status === 'revised') return acc + 0.8;
      if (t.status === 'in_progress') return acc + 0.4;
      return acc;
    }, 0);
    const syllabusCoveragePct =
      sub.topics.length > 0 ? Math.round((completedWeight / sub.topics.length) * 100) : 0;

    let questionsAttempted = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let scoredMarks = 0;
    let maxAttemptedMarks = 0;
    let negativeMarksLost = 0;
    let totalTimeSec = 0;
    const topicMistakes = new Set<string>();

    for (const attempt of branchAttempts) {
      for (const q of attempt.questions) {
        if (q.subjectId !== sub.id) continue;
        const resp = attempt.responses[q.id];
        if (!resp || resp.status === 'unattempted') continue;
        questionsAttempted += 1;
        maxAttemptedMarks += q.marks;
        scoredMarks += resp.marksAwarded;
        negativeMarksLost += resp.negativeMarksDeducted;
        totalTimeSec += resp.timeSpentSeconds;
        if (resp.status === 'correct') {
          correctCount += 1;
        } else if (resp.status === 'incorrect') {
          incorrectCount += 1;
          topicMistakes.add(q.topicName);
        }
      }
    }

    for (const t of sub.topics) {
      if (t.isHighYield && t.status === 'not_started') {
        topicMistakes.add(t.name);
      }
    }

    const accuracyPct =
      questionsAttempted > 0 ? Math.round((correctCount / questionsAttempted) * 100) : null;
    const avgTimePerQuestionSec =
      questionsAttempted > 0 ? Math.round(totalTimeSec / questionsAttempted) : null;

    let statusCategory: SubjectDiagnosticMetric['statusCategory'] = 'Untested';
    if (accuracyPct !== null) {
      if (accuracyPct < 60 || negativeMarksLost >= 0.66) {
        statusCategory = 'Weak Area';
      } else if (accuracyPct < 80 || syllabusCoveragePct < 65) {
        statusCategory = 'Revision Needed';
      } else {
        statusCategory = 'Strong';
      }
    } else if (syllabusCoveragePct < 45) {
      statusCategory = 'Weak Area';
    } else if (syllabusCoveragePct >= 75) {
      statusCategory = 'Strong';
    } else {
      statusCategory = 'Revision Needed';
    }

    return {
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      weightageMarks: sub.weightageMarks,
      studiedHours: Number(studiedHours.toFixed(1)),
      targetHours,
      syllabusCoveragePct,
      questionsAttempted,
      correctCount,
      incorrectCount,
      accuracyPct,
      scoredMarks: Number(scoredMarks.toFixed(2)),
      maxAttemptedMarks,
      negativeMarksLost: Number(negativeMarksLost.toFixed(2)),
      avgTimePerQuestionSec,
      statusCategory,
      weakTopics: Array.from(topicMistakes),
    };
  });

  // Identify specific weak topics across tests and low-confidence study logs
  const topicStatsMap = new Map<
    string,
    {
      topicName: string;
      subjectId: string;
      subjectName: string;
      attempts: number;
      correct: number;
      negativeLost: number;
      totalTime: number;
      lowConfidenceLog: boolean;
      unstartedHighYield: boolean;
    }
  >();

  for (const sub of branchSubjects) {
    for (const t of sub.topics) {
      if (t.isHighYield && (t.status === 'not_started' || t.studiedHours < t.targetHours * 0.4)) {
        topicStatsMap.set(`${sub.id}::${t.name}`, {
          topicName: t.name,
          subjectId: sub.id,
          subjectName: sub.name,
          attempts: 0,
          correct: 0,
          negativeLost: 0,
          totalTime: 0,
          lowConfidenceLog: false,
          unstartedHighYield: true,
        });
      }
    }
  }

  for (const attempt of branchAttempts) {
    for (const q of attempt.questions) {
      const sub = branchSubjects.find((s) => s.id === q.subjectId);
      const subName = sub ? sub.name : 'General';
      const key = `${q.subjectId}::${q.topicName}`;
      const existing = topicStatsMap.get(key) || {
        topicName: q.topicName,
        subjectId: q.subjectId,
        subjectName: subName,
        attempts: 0,
        correct: 0,
        negativeLost: 0,
        totalTime: 0,
        lowConfidenceLog: false,
        unstartedHighYield: false,
      };
      const resp = attempt.responses[q.id];
      if (resp && resp.status !== 'unattempted') {
        existing.attempts += 1;
        if (resp.status === 'correct') existing.correct += 1;
        existing.negativeLost += resp.negativeMarksDeducted;
        existing.totalTime += resp.timeSpentSeconds;
      }
      topicStatsMap.set(key, existing);
    }
  }

  for (const log of branchLogs) {
    if (log.confidence <= 2) {
      const sub = branchSubjects.find((s) => s.id === log.subjectId);
      const topic = sub?.topics.find((t) => t.id === log.topicId);
      if (sub && topic) {
        const key = `${sub.id}::${topic.name}`;
        const existing = topicStatsMap.get(key) || {
          topicName: topic.name,
          subjectId: sub.id,
          subjectName: sub.name,
          attempts: 0,
          correct: 0,
          negativeLost: 0,
          totalTime: 0,
          lowConfidenceLog: true,
          unstartedHighYield: false,
        };
        existing.lowConfidenceLog = true;
        topicStatsMap.set(key, existing);
      }
    }
  }

  const weakTopicItems: TopicWeaknessItem[] = [];
  for (const item of topicStatsMap.values()) {
    const acc = item.attempts > 0 ? Math.round((item.correct / item.attempts) * 100) : null;
    const avgTime = item.attempts > 0 ? Math.round(item.totalTime / item.attempts) : null;

    if (acc !== null && acc < 65) {
      weakTopicItems.push({
        topicName: item.topicName,
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        reason:
          item.negativeLost > 0
            ? `Low test accuracy (${acc}%) with -${item.negativeLost.toFixed(2)} negative marks`
            : `Test accuracy at ${acc}% across ${item.attempts} attempted questions`,
        accuracyPct: acc,
        negativeLost: Number(item.negativeLost.toFixed(2)),
        avgTimeSec: avgTime,
        severity: 'Critical',
      });
    } else if (item.lowConfidenceLog) {
      weakTopicItems.push({
        topicName: item.topicName,
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        reason: 'Flagged with low confidence (≤ 2/5) in recent daily study logs',
        accuracyPct: acc,
        negativeLost: Number(item.negativeLost.toFixed(2)),
        avgTimeSec: avgTime,
        severity: 'Critical',
      });
    } else if (item.unstartedHighYield) {
      weakTopicItems.push({
        topicName: item.topicName,
        subjectId: item.subjectId,
        subjectName: item.subjectName,
        reason: 'High-weightage GATE topic with < 40% target study hours logged',
        accuracyPct: acc,
        negativeLost: 0,
        avgTimeSec: avgTime,
        severity: 'Moderate',
      });
    }
  }

  // Sort critical first
  weakTopicItems.sort((a, b) => (a.severity === 'Critical' && b.severity !== 'Critical' ? -1 : 1));

  // Overall aggregates
  const totalStudiedHours = Number(
    subjectMetrics.reduce((acc, s) => acc + s.studiedHours, 0).toFixed(1)
  );
  const totalTargetHours = subjectMetrics.reduce((acc, s) => acc + s.targetHours, 0);
  const overallCoveragePct =
    subjectMetrics.length > 0
      ? Math.round(
          subjectMetrics.reduce((acc, s) => acc + s.syllabusCoveragePct, 0) /
            subjectMetrics.length
        )
      : 0;

  const totalAttemptedQuestions = subjectMetrics.reduce((acc, s) => acc + s.questionsAttempted, 0);
  const totalCorrectQuestions = subjectMetrics.reduce((acc, s) => acc + s.correctCount, 0);
  const overallAccuracyPct =
    totalAttemptedQuestions > 0
      ? Math.round((totalCorrectQuestions / totalAttemptedQuestions) * 100)
      : 0;
  const totalNegativeMarksLost = Number(
    branchAttempts.reduce((acc, a) => acc + a.negativeMarksLost, 0).toFixed(2)
  );

  const completedLecturesCount = branchLectures.filter((l) => l.status === 'completed').length;

  // 14-day study consistency strip
  const last14Days: { date: string; label: string; minutes: number; questions: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const shortLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayLogs = branchLogs.filter((l) => l.date === iso);
    const minutes = dayLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const questions = dayLogs.reduce((acc, l) => acc + l.questionsSolved, 0);
    last14Days.push({ date: iso, label: shortLabel, minutes, questions });
  }

  return {
    subjectMetrics,
    weakTopicItems,
    totalStudiedHours,
    totalTargetHours,
    overallCoveragePct,
    overallAccuracyPct,
    totalAttemptedQuestions,
    totalNegativeMarksLost,
    completedLecturesCount,
    totalLecturesCount: branchLectures.length,
    last14Days,
    branchAttempts,
    branchLogs,
  };
}
