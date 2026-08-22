'use client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import { useState } from 'react';
import { Plus, CreditCard, AlertTriangle, X, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addFeePlan, deleteFeePlan, getFeePlans, updateFeePlan } from '@/app/actions/fees';
import { useSave } from '@/components/SaveProvider';
import { SavingButton } from '@/components/SavingButton';
import { queryKeys } from '@/lib/query-keys';

export default function FeePlansPage() {
  const queryClient = useQueryClient();
  const runSave = useSave();
  const { data: plans = [] } = useQuery({
    queryKey: queryKeys.feePlans,
    queryFn: getFeePlans,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    duration_months: '1',
    description: '',
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee plan?')) return;
    await deleteFeePlan(id);
    queryClient.invalidateQueries({ queryKey: queryKeys.feePlans });
  };

  const openEditModal = (plan: any) => {
    setFormData({
      name: plan.name,
      amount: plan.amount.toString(),
      duration_months: plan.duration_months.toString(),
      description: plan.description || ''
    });
    setErrors({});
    setEditPlanId(plan.id);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({ name: '', amount: '', duration_months: '1', description: '' });
    setErrors({});
    setEditPlanId(null);
    setIsModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{name?: string, amount?: string}>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {name?: string, amount?: string} = {};
    if (!formData.name) newErrors.name = 'Plan Name is required';
    if (!formData.amount) newErrors.amount = 'Amount is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    await runSave(async () => {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('amount', formData.amount);
      fd.append('duration_months', formData.duration_months);

      const result = editPlanId
        ? await updateFeePlan(editPlanId, fd)
        : await addFeePlan(fd);

      if (result && 'error' in result && result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      if (editPlanId) {
        queryClient.setQueryData(queryKeys.feePlans, (prev: any[] | undefined) =>
          (prev || []).map((plan) => plan.id === editPlanId ? {
            ...plan,
            name: formData.name,
            amount: Number(formData.amount),
            duration_months: Number(formData.duration_months),
          } : plan)
        );
      } else if (result && 'plan' in result && result.plan) {
        queryClient.setQueryData(queryKeys.feePlans, (prev: any[] | undefined) => [result.plan, ...(prev || [])]);
      }

      toast.success(editPlanId ? 'Plan updated' : 'Plan saved');
      setIsSubmitting(false);
      setIsModalOpen(false);
      setEditPlanId(null);
      setFormData({ name: '', amount: '', duration_months: '1', description: '' });
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Fee Plans</h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Define the subscription plans for your gym.</p>
        </div>

        <Button variant="outline"
          onClick={openAddModal}
          className="cursor-pointer inline-flex items-center justify-center gap-2 text-base transition"
        >
          <Plus className="h-5 w-5" />
          Add Plan
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <div className="flex w-full items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="flex gap-2">
                      <Button onClick={() => openEditModal(plan)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleDelete(plan.id)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{plan.duration_months} Month(s)</p>
              </div>
            </div>
            <div className="mt-6">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹{plan.amount}</span>
            </div>
            {plan.description && (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
            )}
          </div>
        ))}
        {plans.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No fee plans configured yet.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Add Fee Plan</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Plan Name <span className="text-red-500">*</span></label>
                  <input
                  value={formData.name}
                  onChange={e => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                  placeholder="e.g. Monthly Pro"
                    className={`w-full rounded-xl border ${errors.name ? "border-red-500" : "border-slate-200 dark:border-slate-700"} bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number"
                  value={formData.amount}
                  onChange={e => {
                      setFormData({ ...formData, amount: e.target.value });
                      if (errors.amount) setErrors({ ...errors, amount: undefined });
                    }}
                  placeholder="e.g. 1500"
                    className={`w-full rounded-xl border ${errors.amount ? "border-red-500" : "border-slate-200 dark:border-slate-700"} bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                  {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount}</p>}
                </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Duration (Months)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.duration_months}
                  onChange={e => setFormData({ ...formData, duration_months: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <SavingButton type="submit" saving={isSubmitting} savingLabel="Saving plan..." className="w-full sm:w-auto">
                  Save Plan
                </SavingButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
