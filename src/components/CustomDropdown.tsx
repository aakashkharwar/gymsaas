import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export type DropdownOption = {
  value: string;
  label: string | ReactNode;
  render?: ReactNode; // Optional custom rendering inside the list
};

type CustomDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  icon?: ReactNode;
  hasError?: boolean;
};

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  icon,
  hasError = false,
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      {icon && <div className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500">{icon}</div>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors ${
          icon ? 'py-3 pl-11 pr-4' : 'py-2.5 pl-4 pr-10 text-sm'
        } ${
          hasError 
            ? 'border-red-400 focus:border-red-500 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50' 
            : className || 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                No options available.
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                    value === option.value
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {option.render || <span>{option.label}</span>}
                  {value === option.value && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
