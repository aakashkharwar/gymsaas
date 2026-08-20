'use client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  CircleDashed,
  CreditCard,
  Mail,
  Phone,
  Plus,
  Search,
  UserRoundPlus,
  X,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import CustomDropdown from '@/components/CustomDropdown';

type MemberStatus = 'active' | 'inactive' | 'suspended';
type PlanType = 'monthly' | 'quarterly' | 'annual';

type Member = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  fee_plan_id: string;
  plan_type?: PlanType; // keeping for backward compatibility if needed
  status: MemberStatus;
  enrollment_date: string;
  notes?: string;
};

const statusOptions: Array<{ value: MemberStatus; label: string; accent: string; dot: string }> = [
  { value: 'active', label: 'Active', accent: 'text-blue-600', dot: 'bg-blue-500' },
  { value: 'inactive', label: 'Inactive', accent: 'text-red-600', dot: 'bg-red-500' },
  { value: 'suspended', label: 'Suspended', accent: 'text-amber-600', dot: 'bg-amber-500' },
];

const initialMembers: Member[] = [];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [feePlans, setFeePlans] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    fee_plan_id: '',
    status: 'active' as MemberStatus,
    enrollment_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // load members and fee plans
  useEffect(() => {
    let mounted = true;
    Promise.all([
      import('@/app/actions/members').then(m => m.getMembers()),
      import('@/app/actions/fees').then(m => m.getFeePlans ? m.getFeePlans() : import('@/utils/fee-store').then(s => s.getFeePlans()))
    ]).then(([memberList, planList]) => {
      if (mounted) {
        if (Array.isArray(memberList)) setMembers(memberList as any[]);
        if (Array.isArray(planList)) setFeePlans(planList);
      }
    }).catch(() => {
      // ignore
    });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const query = search.toLowerCase();
    return members.filter((member) => {
      const matchesQuery =
        !query ||
        member.name.toLowerCase().includes(query) ||
        member.phone.toLowerCase().includes(query) ||
        (member.email && member.email.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [members, search, statusFilter]);

  const mappedStatusOptions = statusOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
    render: (
      <span className={`flex items-center gap-2 ${opt.accent}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
        {opt.label}
      </span>
    ),
  }));

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Member name is required.';
    }

    if (!formData.phone.trim()) {
      nextErrors.phone = 'Phone Number is required.';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      nextErrors.phone = 'Please enter a valid 10-digit phone number.';
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.fee_plan_id) {
      nextErrors.fee_plan_id = 'Please select a fee plan.';
    }

    if (!formData.enrollment_date) {
      nextErrors.enrollment_date = 'Enrollment date is required.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { addMember, updateMember } = await import('@/app/actions/members');
      const fd = new FormData();
      fd.append('name', formData.name.trim());
      fd.append('phone', formData.phone.trim());
      fd.append('email', formData.email.trim());
      fd.append('fee_plan_id', formData.fee_plan_id);
      fd.append('status', formData.status);
      fd.append('enrollment_date', formData.enrollment_date);
      fd.append('notes', formData.notes.trim());
      fd.append('address', formData.address.trim());
      // For compatibility with the action which expects plan_type
      fd.append('plan_type', 'monthly');

      const result = editingMemberId 
        ? await updateMember(editingMemberId, fd)
        : await addMember(fd);
      
      if (result.error) {
        toast.error(result.error); setErrors({ submit: result.error });
        setIsSubmitting(false);
        return;
      }

      // Optimistically update the UI immediately so the user sees changes instantly
      if (editingMemberId) {
        setMembers((prev) => prev.map((m) => m.id === editingMemberId ? {
          ...m,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          fee_plan_id: formData.fee_plan_id,
          status: formData.status as MemberStatus,
          enrollment_date: formData.enrollment_date,
          notes: formData.notes.trim()
        } : m));
      }

      // Fetch fresh data from server in the background
      const { getMembers } = await import('@/app/actions/members');
      const updatedMembers = await getMembers();
      setMembers(updatedMembers as any[]);

      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        fee_plan_id: '',
        status: 'active',
        enrollment_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setErrors({});
      setEditingMemberId(null);
      toast.success(editingMemberId ? 'Member updated successfully!' : 'Member added successfully!');
        setIsModalOpen(false);
      } catch (err) {
      console.error(err);
      toast.error('Failed to add member'); setErrors({ submit: 'Failed to add member' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (member: Member) => {
    setFormData({
      name: member.name || '',
      phone: member.phone || '',
      email: member.email || '',
      address: member.address || '',
      fee_plan_id: member.fee_plan_id || '',
      status: member.status || 'active',
      enrollment_date: member.enrollment_date ? new Date(member.enrollment_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: member.notes || '',
    });
    setEditingMemberId(member.id);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      fee_plan_id: '',
      status: 'active',
      enrollment_date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setEditingMemberId(null);
    setErrors({});
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Members</h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Manage your gym members and their subscriptions.</p>
        </div>

        <Button variant="outline"
          type="button"
          onClick={handleAddNewClick}
          className="cursor-pointer inline-flex items-center justify-center gap-2 text-base transition"
        >
          <Plus className="h-5 w-5" />
          Add Member
        </Button>
      </div>

      <div className="w-full overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="text"
              placeholder="Search members by name or phone..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors"
            />
          </div>

          <div className="min-w-[180px]">
            <CustomDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'All Status' },
                ...mappedStatusOptions
              ]}
              className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-400"
            />
          </div>
        </div>

        {filteredMembers.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400 dark:text-slate-500">
              <UserRoundPlus className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No members yet</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Get started by adding your first gym member.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{member.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{member.phone}</td>
                    <td className="px-6 py-4">
                      {member.notes?.includes('[NEW ADMISSION]') ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400">
                          New
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-500/10 dark:text-slate-400">
                          Existing
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-600 dark:text-slate-400">
                      {feePlans.find(p => p.id === member.fee_plan_id)?.name || member.plan_type || 'Unknown Plan'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          member.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : member.status === 'inactive'
                              ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        type="button" 
                        onClick={() => handleEditClick(member)}
                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {editingMemberId ? 'Edit member' : 'Add member'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {editingMemberId ? 'Update the details for this gym member.' : 'Create a new gym member record.'}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setErrors({});
                  setEditingMemberId(null);
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Member name</label>
                  <input
                    value={formData.name}
                    onChange={(event) => handleInputChange('name', event.target.value)}
                    className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
                      errors.name ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400'
                    }`}
                    placeholder="e.g. Aman Sharma"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Phone number</label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      value={formData.phone}
                      onChange={(event) => handleInputChange('phone', event.target.value)}
                      className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
                        errors.phone ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400'
                      }`}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleInputChange('email', event.target.value)}
                      className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
                        errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400'
                      }`}
                      placeholder="e.g. aman@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Plan</label>
                  <CustomDropdown
                    value={formData.fee_plan_id}
                    onChange={(val) => handleInputChange('fee_plan_id', val)}
                    options={feePlans.map(plan => ({
                      value: plan.id,
                      label: `${plan.name} - ₹${plan.amount}`
                    }))}
                    placeholder={feePlans.length === 0 ? "No plans available. Add one first." : "Select a plan..."}
                    icon={<CreditCard className="h-5 w-5" />}
                    hasError={!!errors.fee_plan_id}
                  />
                  {errors.fee_plan_id && <p className="mt-1 text-sm text-red-500">{errors.fee_plan_id}</p>}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <CustomDropdown
                    value={formData.status}
                    onChange={(val) => handleInputChange('status', val)}
                    options={mappedStatusOptions}
                    icon={<CircleDashed className="h-5 w-5" />}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Address</label>
                  <input
                    value={formData.address}
                    onChange={(event) => handleInputChange('address', event.target.value)}
                    className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
                      errors.address ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400'
                    }`}
                    placeholder="e.g. 24, MG Road, Bengaluru"
                  />
                  {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Enroll date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.enrollment_date}
                      onChange={(event) => handleInputChange('enrollment_date', event.target.value)}
                      className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
                        errors.enrollment_date ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400'
                      }`}
                    />
                    <CalendarRange className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  </div>
                  {errors.enrollment_date && <p className="mt-1 text-sm text-red-500">{errors.enrollment_date}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(event) => handleInputChange('notes', event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    placeholder="Optional notes about the member"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 mt-8">
                <Button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrors({});
                    setEditingMemberId(null);
                  }}
                  className="cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer transition-colors disabled:opacity-70"
                >
                  {isSubmitting 
                    ? 'Saving...' 
                    : (editingMemberId ? 'Update member' : 'Save member')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
