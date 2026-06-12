import type { BankStatus } from '../types'

const labels: Record<BankStatus, string> = {
  draft: '草稿',
  review: '待校对',
  published: '已发布',
}

export function StatusBadge({ status }: { status: BankStatus }) {
  return <span className={`status-badge status-${status}`}>{labels[status]}</span>
}
