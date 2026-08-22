'use client';

import { useState } from 'react';
import { updateOrganizationStatus } from '@/app/actions/super-admin';
import { MoreVertical, ShieldAlert } from 'lucide-react';
import { useSave } from '@/components/SaveProvider';

export default function TenantStatusModal({ 
  organizationId, 
  currentStatus, 
  gymName 
}: { 
  organizationId: string; 
  currentStatus: string;
  gymName: string;
}) {
  const runSave = useSave();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsPending(true);
    const res = await runSave(() => updateOrganizationStatus(organizationId, newStatus));
    setIsPending(false);
    
    if (res.error) {
      alert('Error updating status: ' + res.error);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-20 focus:outline-none">
            <div className="py-1" role="menu">
              <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                Change status for <strong>{gymName}</strong>
              </div>
              
              {currentStatus !== 'active' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('active')}
                  className="w-full text-left block px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Mark as Active
                </button>
              )}
              
              {currentStatus !== 'past_due' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('past_due')}
                  className="w-full text-left block px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  Mark as Past Due
                </button>
              )}
              
              {currentStatus !== 'cancelled' && (
                <button
                  disabled={isPending}
                  onClick={() => handleStatusChange('cancelled')}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Suspend / Cancel
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
