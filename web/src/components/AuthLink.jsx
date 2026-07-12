import { Link } from 'react-router-dom'
import { useRequireAuth } from '../hooks/useRequireAuth'
import { AUTH_MESSAGES } from '../utils/authMessages'

export default function AuthLink({ to, message = AUTH_MESSAGES.default, children, className, onClick, ...props }) {
  const requireAuth = useRequireAuth()

  const handleClick = (e) => {
    if (!requireAuth(message)) {
      e.preventDefault()
      return
    }
    onClick?.(e)
  }

  return (
    <Link to={to} onClick={handleClick} className={className} {...props}>
      {children}
    </Link>
  )
}
