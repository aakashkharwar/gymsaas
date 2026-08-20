import { getSuperAdminStats, getOrganizations } from '@/app/actions/super-admin';
import TenantStatusModal from './TenantStatusModal';
import { IndianRupee, Users, Clock, ShieldAlert } from 'lucide-react';


export default async function SuperAdminPage() {
  const stats = await getSuperAdminStats();
  const organizations = await getOrganizations();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Super Admin Dashboard</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Platform overview and tenant management.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* MRR */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/30 rounded-md p-3">
              <IndianRupee className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Total MRR</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    ₹{stats.mrr.toLocaleString('en-IN')}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Total Gyms */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-md p-3">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Total Gyms</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.totalGyms}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Active Trials */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-md p-3">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Active Trials</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.activeTrials}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Suspended */}
        <div className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/30 rounded-md p-3">
              <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Suspended Accounts</dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stats.suspendedAccounts}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg leading-6 font-medium text-slate-900 dark:text-white">Registered Organizations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Gym Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Owner Info
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Plan & Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Joined
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No organizations registered yet.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{org.name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">
                        {org.slug}.gymos.in
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">{org.owner_name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{org.owner_email}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{org.owner_phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${org.plan === 'trial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                          ${org.plan === 'basic' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' : ''}
                          ${org.plan === 'pro' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : ''}
                        `}>
                          {org.plan}
                        </span>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${org.subscription_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}
                          ${org.subscription_status === 'trial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''}
                          ${org.subscription_status === 'past_due' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : ''}
                          ${org.subscription_status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : ''}
                        `}>
                          {org.subscription_status.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {new Date(org.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <TenantStatusModal 
                        organizationId={org.id} 
                        currentStatus={org.subscription_status}
                        gymName={org.name}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
