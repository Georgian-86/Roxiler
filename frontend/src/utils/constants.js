export const HOME_BY_ROLE = { ADMIN: '/admin', USER: '/stores', OWNER: '/owner' }

export const ROLE_LABELS = { ADMIN: 'Admin', USER: 'User', OWNER: 'Store Owner' }
export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))

export const PASSWORD_HINT = '8–16 characters, including an uppercase letter and a special character.'
