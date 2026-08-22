'use client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

import { useState, useEffect } from 'react';
import { submitAdmissionForm } from '@/app/actions/members';
import { ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useSave } from '@/components/SaveProvider';
import { SavingButton } from '@/components/SavingButton';

export default function AdmissionPage() {
  const queryClient = useQueryClient();
  const runSave = useSave();
  const [gymName, setGymName] = useState('GYM NAME');
  const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [sex, setSex] = useState('');
  const [isSexDropdownOpen, setIsSexDropdownOpen] = useState(false);
  
  const [dob, setDob] = useState('');
  const [age, setAge] = useState('');

  useEffect(() => {
    import('@/app/actions/dashboard').then((m) => {
      m.getGymName().then(setGymName);
    });
  }, []);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    clearError('dob');
    if (val) {
      const birthDate = new Date(val);
      const today = new Date();
      let computedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        computedAge--;
      }
      setAge(computedAge.toString());
      clearError('age');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    

    const formData = new FormData(e.currentTarget);
    const newErrors: Record<string, string> = {};

    // Validations
    if (!formData.get('name')?.toString().trim()) newErrors.name = 'Name is required';
    if (!formData.get('age')?.toString().trim()) newErrors.age = 'Age is required';
    if (!sex) newErrors.sex = 'Sex is required';
    if (!formData.get('phone')?.toString().trim()) newErrors.phone = 'Contact No. is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    formData.set('sex', sex);

    setIsSubmitting(true);
    const result = await runSave(() => submitAdmissionForm(formData));
    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      setErrors({ form: result.error });
    } else {
      toast.success('Admission successfully recorded!');
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      (e.target as HTMLFormElement).reset();
      setSex('');
      setDob('');
      setAge('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="bg-indigo-600 px-6 py-8 text-center text-white">
          <h1 className="text-3xl font-bold tracking-tight uppercase break-words">{gymName}</h1>
          <p className="mt-2 text-indigo-100 font-medium">The Ultimate Health Centre</p>
          <div className="mt-4 inline-block bg-white/20 px-4 py-1.5 rounded-full">
            <span className="font-semibold uppercase tracking-wider text-sm">Fitness Assessment Sheet</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-6 sm:p-8 space-y-8" noValidate>
          {errors.form && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md border border-red-200 dark:border-red-900 font-medium break-words">
              {errors.form}
            </div>
          )}

          {/* Personal Information */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input type="text" name="name" onChange={() => clearError('name')} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Add. Date
                </label>
                <input type="date" name="admissionDate" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  DOB (Auto-calculates Age)
                </label>
                <input type="date" name="dob" value={dob} onChange={handleDobChange} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input type="number" name="age" value={age} onChange={(e) => { setAge(e.target.value); clearError('age'); }} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Sex <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div 
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm flex justify-between items-center cursor-pointer"
                      onClick={() => {
                        setIsSexDropdownOpen(!isSexDropdownOpen);
                        clearError('sex');
                      }}
                    >
                      <span>{sex || 'Select...'}</span>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                    {isSexDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden">
                        {['Male', 'Female', 'Other'].map(option => (
                          <div 
                            key={option}
                            className="px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                            onClick={() => {
                              setSex(option);
                              setIsSexDropdownOpen(false);
                            }}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.sex && <p className="mt-1 text-sm text-red-600">{errors.sex}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contact No. <span className="text-red-500">*</span>
                </label>
                <input type="tel" name="phone" onChange={() => clearError('phone')} className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input type="email" name="email" placeholder="member@email.com" className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Optional. If added, the member gets a welcome email.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Batch
                </label>
                <input type="text" name="batch" className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address
                </label>
                <input type="text" name="address" className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Weight (kg)
                </label>
                <input type="number" step="0.1" name="weight" className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </section>

          {/* Goals & Occupation */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                Goals
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Primary Goal</h3>
                  <div className="space-y-2">
                    {['Fat Loss', 'Weight Gain', 'General Fitness', 'Body Building'].map((goal) => (
                      <label key={goal} className="flex items-center space-x-3 cursor-pointer w-fit">
                        <input type="checkbox" name="primaryGoal" value={goal} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Secondary Goal</h3>
                  <div className="space-y-2">
                    {['Stamina', 'Strength', 'Flexibility'].map((goal) => (
                      <label key={goal} className="flex items-center space-x-3 cursor-pointer w-fit">
                        <input type="checkbox" name="secondaryGoal" value={goal} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{goal}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                Occupation
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {['Service', 'Business', 'Professional', 'Student', 'Housewife', 'N/A'].map((occ) => (
                  <label key={occ} className="flex items-center space-x-3 cursor-pointer w-fit">
                    <input type="radio" name="occupation" value={occ} className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{occ}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Health Profile */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
              Health Profile
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-6">
              {[
                'High B.P.', 'Asthma', 'Diabetes', 'Allergy', 'Heart Problem', 
                'Gastric Problem', 'Back Pain', 'Pregnancy', 'Knee Pain', 
                'Thyroid', 'Neck Pain', 'High Cholestrol', 'Shoulder Pain', 
                'Obesity', 'Other Problem'
              ].map((issue) => (
                <label key={issue} className="flex items-center space-x-3 cursor-pointer w-fit">
                  <input type="checkbox" name="healthIssue" value={issue} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{issue}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Declaration */}
          <section className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">Declaration</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
              By accepting this form i acknowledge that I Voluntarily chosen the programme. I am aware of all procedures, limitations, risk & benefits of the programme. I take sole responsibility for my health and well being. I understand and accept this document.
            </p>
          </section>

          <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 pt-6">
            <SavingButton
              type="submit"
              saving={isSubmitting}
              savingLabel="Saving..."
              className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Submit Admission
            </SavingButton>
          </div>
        </form>
      </div>
    </div>
  );
}
