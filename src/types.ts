export type QuestionType = 'single' | 'multiple' | 'judgment' | 'unknown'
export type BankStatus = 'draft' | 'review' | 'published'
export type BankVisibility = 'private' | 'public'
export type BankContentMode = 'questions' | 'text'

export interface QuestionOption {
  label: string
  text: string
}

export interface Question {
  id: string
  bankId: string
  sequence: number
  displayNumber: number
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
  contentMode: BankContentMode
  sourceFilePath?: string
  sourceFileName: string
  sourceFileType: string
  questionCount: number
  warningCount: number
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export interface BankGroup {
  id: string
  ownerId?: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface BankGroupMembership {
  id: string
  groupId: string
  bankId: string
  createdAt: string
}

export interface ParsedQuestion {
  sequence: number
  displayNumber: number
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
