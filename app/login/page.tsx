// app/login/page.tsx
import LoginForm from './LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string; expired?: string }
}) {
  // Don't check auth server-side - let the form handle navigation
  return <LoginForm searchParams={searchParams} />
}