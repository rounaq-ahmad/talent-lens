export type QuestionType = 'theoretical' | 'code-snippet' | 'coding-task';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  title: string;
  points: number;
  active?: boolean;
}

export interface TheoreticalQuestion extends BaseQuestion {
  type: 'theoretical';
  format: 'mcq' | 'open-ended';
  question: string;
  options?: string[];      // MCQ only
  correctAnswer?: number;  // index into options, MCQ only
}

export interface CodeSnippetQuestion extends BaseQuestion {
  type: 'code-snippet';
  question: string;
  code: string;
  language: string;
  options: string[];
  correctAnswer: number;   // index of correct option
  explanation?: string;
}

export interface CodingTaskQuestion extends BaseQuestion {
  type: 'coding-task';
  description: string;
  starterCode: string;
  language: 'javascript' | 'typescript';
  hints?: string[];
}

export type Question = TheoreticalQuestion | CodeSnippetQuestion | CodingTaskQuestion;

export interface CandidateAnswer {
  questionId: string;
  answer: string | number | null;
}

export interface TestSession {
  candidateName: string;
  startTime: Date;
  endTime?: Date;
  answers: Record<string, CandidateAnswer>;
  durationMinutes: number;
  completed: boolean;
}

export interface QuestionResult {
  question: Question;
  answer: CandidateAnswer | null;
  isCorrect?: boolean;
  score: number;
}

export interface TestResult {
  session: TestSession;
  totalScore: number;
  maxScore: number;
  percentage: number;
  questionResults: QuestionResult[];
}
