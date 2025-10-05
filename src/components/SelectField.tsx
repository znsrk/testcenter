import { ChevronDown } from "lucide-react";

interface SelectFieldProps {
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  className?: string;
  required?: boolean;
}

export function SelectField({ 
  placeholder, 
  value, 
  onChange, 
  options,
  className = "",
  required = false 
}: SelectFieldProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-[500px] h-[56px]
          px-4 py-3 pr-10
          bg-white
          border border-[#E6EDF8] rounded-lg
          text-base text-[#9CA3AF]
          focus:border-[#007BFF] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20
          transition-colors duration-200
          appearance-none
          ${className}
        `}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-black">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown 
        className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9CA3AF] pointer-events-none" 
      />
    </div>
  );
}