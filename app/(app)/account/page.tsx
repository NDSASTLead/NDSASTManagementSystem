import { redirect } from 'next/navigation'
import { User, Shield, Mail, Phone } from 'lucide-react'
import { getCurrentProfile } from '@/lib/supabase/helpers'
import { Avatar } from '@/components/shared/Avatar'
import { AccountEditForm } from '@/components/account/AccountEditForm'
import { getDisplayName } from '@/lib/utils'

const roleLabel: Record<string, string> = {
  volunteer: 'Volunteer',
  owner: 'Site Owner',
  ast_lead: 'AST Lead',
  trustee: 'Trustee',
}

export default async function AccountPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const displayName = getDisplayName(profile)

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-8 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar name={displayName} picturePath={profile.profile_picture_path} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          {profile.display_name && (
            <p className="text-sm text-gray-400">{profile.full_name}</p>
          )}
          <p className="text-sm text-gray-500">{roleLabel[profile.role] ?? profile.role}</p>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Edit profile</h2>
        <AccountEditForm profile={profile} />
      </div>

      {/* Details */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Email</p>
            <p className="text-sm font-medium text-gray-900 truncate">{profile.email}</p>
          </div>
        </div>

        {profile.phone && (
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">Phone</p>
              <p className="text-sm font-medium text-gray-900 truncate">{profile.phone}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Access level</p>
            <p className="text-sm font-medium text-gray-900">{roleLabel[profile.role] ?? profile.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-9 h-9 bg-purple-50 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Member since</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
