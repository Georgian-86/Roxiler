import { ROLE_LABELS } from '../utils/constants'

export default function RoleBadge({ role }) {
  return <span className={`badge badge-${role.toLowerCase()}`}>{ROLE_LABELS[role] || role}</span>
}
