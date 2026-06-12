export type QuestionType = 'single' | 'multiple' | 'judgment' | 'unknown'
export type BankStatus = 'draft' | 'review' | 'published'
export type BankVisibility = 'private' | 'public'

export interface QuestionOption {
  label: string
  text: string
}

export interface Question {
  id: string
  bankId: string
  sequence: number
  type: QuestionType
  stem: string
  options: QuestionOption[]
  answer: string[]
  answerText: string[]
  explanation: string
  sourcePage?: number
  rawText: string
  confidence: number
  warnings: string[]
}

export interface QuestionBank {
  id: string
  ownerId?: string
  title: string
  slug: string
  description: string
  status: BankStatus
  visibility: BankVisibility
  sourceFilePath?: string
  sourceFileName: string
  sourceFileType: string
  questionCount: number
  warningCount: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface ParsedQuestion {
  sequence: number
  type: QuestionType
  stem: string
  options: QuestionOption[]
  answer: string[]
  answerText: string[]
  explanation: string
  rawText: string
  confidence: number
  warnings: string[]
}

export interface ParseResult {
  questions: ParsedQuestion[]
  sourceText: string
  warnings: string[]
}
