import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BankGroup, BankGroupMembership, Question, QuestionBank } from '../types'
import { createUniqueSlug } from './slug'
import { isSupabaseConfigured, requireSupabase } from './supabase'

interface QuestionStudioSchema extends DBSchema {
  banks: {
    key: string
    value: QuestionBank
    indexes: { 'by-slug': string; 'by-updated': string }
  }
  questions: {
    key: string
    value: Question
    indexes: { 'by-bank': string; 'by-bank-sequence': [string, number] }
  }
  groups: {
    key: string
    value: BankGroup
    indexes: { 'by-updated': string }
  }
  groupMemberships: {
    key: string
    value: BankGroupMembership
    indexes: { 'by-group': string; 'by-bank': string }
  }
}

interface BankRow {
  id: string
  owner_id: string
  title: string
  slug: string
  description: string
  status: QuestionBank['status']
  visibility: QuestionBank['visibility']
  content_mode: QuestionBank['contentMode']
  source_file_path: string | null
  source_file_name: string
  source_file_type: string
  question_count: number
  warning_count: number
  created_at: string
  updated_at: string
  published_at: string | null
}

interface QuestionRow {
  id: string
  bank_id: string
  sequence: number
  display_number: number | null
  type: Question['type']
  stem: string
  options: Question['options']
  answer: string[]
  answer_text: string[]
  explanation: string
  source_page: number | null
  raw_text: string
  confidence: number | string
  warnings: string[]
}

interface BankGroupRow {
  id: string
  owner_id: string
  name: string
  created_at: string
  updated_at: string
}

interface BankGroupMembershipRow {
  group_id: string
  bank_id: string
  created_at: string
}

let databasePromise: Promise<IDBPDatabase<QuestionStudioSchema>> | null = null

function database() {
  if (!databasePromise) {
    databasePromise = openDB<QuestionStudioSchema>('question-bank-studio', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const bankStore = db.createObjectStore('banks', { keyPath: 'id' })
          bankStore.createIndex('by-slug', 'slug', { unique: true })
          bankStore.createIndex('by-updated', 'updatedAt')

          const questionStore = db.createObjectStore('questions', { keyPath: 'id' })
          questionStore.createIndex('by-bank', 'bankId')
          questionStore.createIndex('by-bank-sequence', ['bankId', 'sequence'], { unique: true })
        }
        if (oldVersion < 2) {
          const groupStore = db.createObjectStore('groups', { keyPath: 'id' })
          groupStore.createIndex('by-updated', 'updatedAt')
          const membershipStore = db.createObjectStore('groupMemberships', { keyPath: 'id' })
          membershipStore.createIndex('by-group', 'groupId')
          membershipStore.createIndex('by-bank', 'bankId')
        }
      },
    })
  }
  return databasePromise
}

function mapBank(row: BankRow): QuestionBank {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    visibility: row.visibility,
    contentMode: row.content_mode ?? 'questions',
    sourceFilePath: row.source_file_path ?? undefined,
    sourceFileName: row.source_file_name,
    sourceFileType: row.source_file_type,
    questionCount: row.question_count,
    warningCount: row.warning_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? undefined,
  }
}

function bankPayload(bank: QuestionBank, ownerId: string) {
  return {
    id: bank.id,
    owner_id: ownerId,
    title: bank.title,
    slug: bank.slug,
    description: bank.description,
    status: bank.status,
    visibility: bank.visibility,
    content_mode: bank.contentMode,
    source_file_path: bank.sourceFilePath ?? null,
    source_file_name: bank.sourceFileName,
    source_file_type: bank.sourceFileType,
    question_count: bank.questionCount,
    warning_count: bank.warningCount,
    created_at: bank.createdAt,
    updated_at: bank.updatedAt,
    published_at: bank.publishedAt ?? null,
  }
}

function mapQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    bankId: row.bank_id,
    sequence: row.sequence,
    displayNumber: row.display_number ?? row.sequence,
    type: row.type,
    options: row.options,
    answer: row.answer,
    answerText: row.answer_text,
    explanation: row.explanation,
    sourcePage: row.source_page ?? undefined,
    rawText: row.raw_text,
    confidence: Number(row.confidence),
    warnings: row.warnings,
  }
}

function questionPayload(question: Question) {
  return {
    id: question.id,
    bank_id: question.bankId,
    sequence: question.sequence,
    display_number: question.displayNumber,
    type: question.type,
    options: question.options,
    answer: question.answer,
    answer_text: question.answerText,
    explanation: question.explanation,
    source_page: question.sourcePage ?? null,
    raw_text: question.rawText,
    confidence: question.confidence,
    warnings: question.warnings,
    updated_at: new Date().toISOString(),
  }
}

function mapGroup(row: BankGroupRow): BankGroup {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMembership(row: BankGroupMembershipRow): BankGroupMembership {
  return {
    id: `${row.group_id}:${row.bank_id}`,
    groupId: row.group_id,
    bankId: row.bank_id,
    createdAt: row.created_at,
  }
}

async function currentUserId() {
  const { data, error } = await requireSupabase().auth.getUser()
  if (error || !data.user) throw error ?? new Error('请先登录。')
  return data.user.id
}

interface RepositoryError {
  code?: string
  message: string
}

function throwOnError(error: RepositoryError | null) {
  if (error) throw new Error(error.message)
}

function isSlugConflict(error: RepositoryError | null) {
  return error?.code === '23505' && /question_banks_slug_key|slug/i.test(error.message)
}

export async function listBanks() {
  if (!isSupabaseConfigured) {
    const banks = await (await database()).getAll('banks')
    return banks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  const { data, error } = await requireSupabase().from('question_banks').select('*').order('updated_at', { ascending: false })
  throwOnError(error)
  return ((data ?? []) as BankRow[]).map(mapBank)
}

export async function getBank(id: string) {
  if (!isSupabaseConfigured) return (await database()).get('banks', id)
  const { data, error } = await requireSupabase().from('question_banks').select('*').eq('id', id).maybeSingle()
  throwOnError(error)
  return data ? mapBank(data as BankRow) : undefined
}

export async function getBankBySlug(slug: string) {
  if (!isSupabaseConfigured) return (await database()).getFromIndex('banks', 'by-slug', slug)
  const { data, error } = await requireSupabase().from('question_banks').select('*').eq('slug', slug).maybeSingle()
  throwOnError(error)
  return data ? mapBank(data as BankRow) : undefined
}

export async function saveBank(bank: QuestionBank) {
  if (!isSupabaseConfigured) {
    const db = await database()
    try {
      await db.put('banks', bank)
      return bank
    } catch (reason) {
      if (!(reason instanceof DOMException) || reason.name !== 'ConstraintError') throw reason
      const bankWithUniqueSlug = { ...bank, slug: createUniqueSlug(bank.slug, bank.id) }
      await db.put('banks', bankWithUniqueSlug)
      return bankWithUniqueSlug
    }
  }
  const ownerId = await currentUserId()
  const client = requireSupabase()
  const { error } = await client.from('question_banks').upsert(bankPayload(bank, ownerId), { onConflict: 'id' })
  if (!isSlugConflict(error)) {
    throwOnError(error)
    return bank
  }

  const bankWithUniqueSlug = { ...bank, slug: createUniqueSlug(bank.slug, bank.id) }
  const { error: retryError } = await client
    .from('question_banks')
    .upsert(bankPayload(bankWithUniqueSlug, ownerId), { onConflict: 'id' })
  throwOnError(retryError)
  return bankWithUniqueSlug
}

export async function deleteBank(id: string) {
  if (!isSupabaseConfigured) {
    const db = await database()
    const tx = db.transaction(['banks', 'questions', 'groupMemberships'], 'readwrite')
    const questionIds = await tx.objectStore('questions').index('by-bank').getAllKeys(id)
    const membershipIds = await tx.objectStore('groupMemberships').index('by-bank').getAllKeys(id)
    await Promise.all([
      tx.objectStore('banks').delete(id),
      ...questionIds.map((questionId) => tx.objectStore('questions').delete(questionId)),
      ...membershipIds.map((membershipId) => tx.objectStore('groupMemberships').delete(membershipId)),
    ])
    await tx.done
    return
  }

  const bank = await getBank(id)
  if (bank?.sourceFilePath) {
    const { error: storageError } = await requireSupabase().storage.from('question-sources').remove([bank.sourceFilePath])
    throwOnError(storageError)
  }
  const { error } = await requireSupabase().from('question_banks').delete().eq('id', id)
  throwOnError(error)
}

export async function listQuestions(bankId: string) {
  if (!isSupabaseConfigured) {
    const questions = await (await database()).getAllFromIndex('questions', 'by-bank', bankId)
    return questions.sort((a, b) => a.sequence - b.sequence)
  }
  const { data, error } = await requireSupabase().from('questions').select('*').eq('bank_id', bankId).order('sequence')
  throwOnError(error)
  return ((data ?? []) as QuestionRow[]).map(mapQuestion)
}

export async function listQuestionsForBanks(bankIds: string[]) {
  const uniqueBankIds = [...new Set(bankIds)]
  const questions = await Promise.all(uniqueBankIds.map(listQuestions))
  return questions.flat()
}

export async function listGroups() {
  if (!isSupabaseConfigured) {
    const groups = await (await database()).getAll('groups')
    return groups.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  const { data, error } = await requireSupabase().from('bank_groups').select('*').order('updated_at', { ascending: false })
  throwOnError(error)
  return ((data ?? []) as BankGroupRow[]).map(mapGroup)
}

export async function saveGroup(group: BankGroup) {
  if (!isSupabaseConfigured) {
    await (await database()).put('groups', group)
    return group
  }
  const ownerId = await currentUserId()
  const { error } = await requireSupabase().from('bank_groups').upsert({
    id: group.id,
    owner_id: ownerId,
    name: group.name,
    created_at: group.createdAt,
    updated_at: group.updatedAt,
  }, { onConflict: 'id' })
  throwOnError(error)
  return { ...group, ownerId }
}

export async function deleteGroup(id: string) {
  if (!isSupabaseConfigured) {
    const db = await database()
    const tx = db.transaction(['groups', 'groupMemberships'], 'readwrite')
    const membershipIds = await tx.objectStore('groupMemberships').index('by-group').getAllKeys(id)
    await Promise.all([
      tx.objectStore('groups').delete(id),
      ...membershipIds.map((membershipId) => tx.objectStore('groupMemberships').delete(membershipId)),
    ])
    await tx.done
    return
  }
  const { error } = await requireSupabase().from('bank_groups').delete().eq('id', id)
  throwOnError(error)
}

export async function listGroupMemberships() {
  if (!isSupabaseConfigured) return (await database()).getAll('groupMemberships')
  const { data, error } = await requireSupabase().from('bank_group_memberships').select('*')
  throwOnError(error)
  return ((data ?? []) as BankGroupMembershipRow[]).map(mapMembership)
}

export async function setGroupBanks(groupId: string, bankIds: string[]) {
  const uniqueBankIds = [...new Set(bankIds)]
  if (!isSupabaseConfigured) {
    const db = await database()
    const tx = db.transaction('groupMemberships', 'readwrite')
    const existingIds = await tx.store.index('by-group').getAllKeys(groupId)
    const createdAt = new Date().toISOString()
    await Promise.all([
      ...existingIds.map((id) => tx.store.delete(id)),
      ...uniqueBankIds.map((bankId) => tx.store.put({
        id: `${groupId}:${bankId}`,
        groupId,
        bankId,
        createdAt,
      })),
    ])
    await tx.done
    return
  }
  const client = requireSupabase()
  const existing = (await listGroupMemberships()).filter((membership) => membership.groupId === groupId)
  const existingBankIds = new Set(existing.map((membership) => membership.bankId))
  const nextBankIds = new Set(uniqueBankIds)
  const removedBankIds = existing.filter((membership) => !nextBankIds.has(membership.bankId)).map((membership) => membership.bankId)
  const addedBankIds = uniqueBankIds.filter((bankId) => !existingBankIds.has(bankId))
  if (removedBankIds.length) {
    const { error } = await client.from('bank_group_memberships').delete().eq('group_id', groupId).in('bank_id', removedBankIds)
    throwOnError(error)
  }
  if (addedBankIds.length) {
    const { error } = await client.from('bank_group_memberships').insert(
      addedBankIds.map((bankId) => ({ group_id: groupId, bank_id: bankId })),
    )
    throwOnError(error)
  }
}

export async function replaceQuestions(bankId: string, questions: Question[]) {
  if (!isSupabaseConfigured) {
    const db = await database()
    const tx = db.transaction('questions', 'readwrite')
    const existingIds = await tx.store.index('by-bank').getAllKeys(bankId)
    await Promise.all([
      ...existingIds.map((id) => tx.store.delete(id)),
      ...questions.map((question) => tx.store.put(question)),
    ])
    await tx.done
    return
  }

  const client = requireSupabase()
  const { error: deleteError } = await client.from('questions').delete().eq('bank_id', bankId)
  throwOnError(deleteError)
  for (let start = 0; start < questions.length; start += 500) {
    const batch = questions.slice(start, start + 500).map(questionPayload)
    const { error } = await client.from('questions').insert(batch)
    throwOnError(error)
  }
}

export async function saveQuestion(question: Question) {
  if (!isSupabaseConfigured) {
    await (await database()).put('questions', question)
    return question
  }
  const { error } = await requireSupabase().from('questions').upsert(questionPayload(question), { onConflict: 'id' })
  throwOnError(error)
  return question
}

export async function uploadSourceFile(file: File, bankId: string) {
  if (!isSupabaseConfigured) return undefined
  const userId = await currentUserId()
  const safeName = file.name.replace(/[\\/]+/g, '-').replace(/\s+/g, '-').slice(-180)
  const path = `${userId}/${bankId}/${safeName}`
  const extension = file.name.split('.').pop()?.toLowerCase()
  const fallbackMime = extension === 'pdf'
    ? 'application/pdf'
    : extension === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : extension === 'md'
        ? 'text/markdown'
        : 'text/plain'
  const { error } = await requireSupabase().storage.from('question-sources').upload(path, file, {
    contentType: file.type || fallbackMime,
    upsert: true,
  })
  throwOnError(error)
  return path
}
