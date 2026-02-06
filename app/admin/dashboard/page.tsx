import { redirect } from 'next/navigation'

// Redirect /admin/dashboard to /dashboard/admin (the actual admin dashboard)
export default function AdminDashboardRedirect() {
  redirect('/dashboard/admin')
}
