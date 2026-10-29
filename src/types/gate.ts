export type BranchCode = 'CS' | 'DA' | 'EC' | 'EE' | 'ME' | 'CE';

export type TopicMasteryStatus = 'not_started' | 'in_progress' | 'revised' | 'mastered';

export interface SyllabusTopic {
  id: string;
  name: string;
  status: TopicMasteryStatus;
  studiedHours: number;
  targetHours: number;
  isHighYield?: boolean;
}

export interface SyllabusSubject {
  id: string;
  branch: BranchCode;
  code: string;
  name: string;
  weightageMarks: number;
  topics: SyllabusTopic[];
}

export type StudyActivityType = 'lecture' | 'theory' | 'practice' | 'revision';

export interface DailyStudyLog {
  id: string;
  date: string; // YYYY-MM-DD
  branch: BranchCode;
  subjectId: string;
  topicId: string;
  durationMinutes: number;
  questionsSolved: number;
  activityType: StudyActivityType;
  confidence: number; // 1 to 5
  notes: string;
}

export type QuestionType = 'MCQ' | 'MSQ' | 'NAT';

export interface MockQuestion {
  id: string;
  branch: BranchCode;
  subjectId: string;
  topicName: string;
  type: QuestionType;
  marks: 1 | 2;
  questionText: string;
  options: string[];
  correctAnswer: string[]; // 1 item for MCQ/NAT, 2+ for MSQ
  numericalRange?: {
    min: number;
    max: number;
  };
  explanation: string;
  isAiGenerated?: boolean;
}

export interface QuestionResponseRecord {
  questionId: string;
  selectedAnswers: string[]; // for NAT, single string in array e.g. ["42.5"]
  markedForReview: boolean;
  timeSpentSeconds: number;
  isCorrect: boolean;
  marksAwarded: number;
  negativeMarksDeducted: number;
  status: 'correct' | 'incorrect' | 'unattempted';
}

export interface MockTestAttempt {
  id: string;
  timestamp: string;
  branch: BranchCode;
  subjectId: string; // or 'ALL'
  title: string;
  totalQuestions: number;
  totalMarks: number;
  scoredMarks: number;
  negativeMarksLost: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeTakenSeconds: number;
  questions: MockQuestion[];
  responses: Record<string, QuestionResponseRecord>;
}

export type LectureWatchStatus = 'unwatched' | 'in_progress' | 'completed';

export interface LectureItem {
  id: string;
  branch: BranchCode;
  subjectId: string;
  topicName: string;
  title: string;
  channelName: string;
  playlistTitle: string;
  youtubeUrl: string;
  videoId: string;
  durationMinutes: number;
  watchedMinutes: number;
  status: LectureWatchStatus;
  notes: string;
  addedAt: string;
}

export interface AiDiagnosticReport {
  generatedAt: string;
  branch: BranchCode;
  executiveSummary: string;
  estimatedGateScoreBand: string;
  rootCauseAnalysis: {
    issueTitle: string;
    severity: string;
    diagnosis: string;
    fixAction: string;
  }[];
  sevenDayPlan: {
    dayLabel: string;
    focusSubject: string;
    targetTopic: string;
    actionPlan: string;
    targetMetric: string;
  }[];
}

export interface GatePulseState {
  activeBranch: BranchCode;
  targetExamDate: string;
  dailyHourGoal: number;
  subjects: SyllabusSubject[];
  studyLogs: DailyStudyLog[];
  questions: MockQuestion[];
  testAttempts: MockTestAttempt[];
  lectures: LectureItem[];
  diagnosticsByBranch: Partial<Record<BranchCode, AiDiagnosticReport>>;
}
