import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      {children}
    </svg>
  )
}

export function GridIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></Icon>
}

export function UploadIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 16V4m0 0 4 4m-4-4L8 8M5 14v5h14v-5" /></Icon>
}

export function BookIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5zm16 0A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" /></Icon>
}

export function SearchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></Icon>
}

export function ArrowIcon(props: IconProps) {
  return <Icon {...props}><path d="M5 12h14m-5-5 5 5-5 5" /></Icon>
}

export function WarningIcon(props: IconProps) {
  return <Icon {...props}><path d="m12 3 9 17H3zM12 9v5m0 3v.01" /></Icon>
}

export function CheckIcon(props: IconProps) {
  return <Icon {...props}><path d="m5 12 4 4L19 6" /></Icon>
}

export function TrashIcon(props: IconProps) {
  return <Icon {...props}><path d="M4 7h16M9 7V4h6v3m-9 0 1 14h10l1-14M10 11v6m4-6v6" /></Icon>
}

export function CopyIcon(props: IconProps) {
  return <Icon {...props}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></Icon>
}

export function EditIcon(props: IconProps) {
  return <Icon {...props}><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10zM14 7l3 3" /></Icon>
}

export function FolderIcon(props: IconProps) {
  return <Icon {...props}><path d="M3 6.5h7l2 2h9v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Icon>
}

export function PlusIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 5v14M5 12h14" /></Icon>
}

export function SettingsIcon(props: IconProps) {
  return <Icon {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" /></Icon>
}
