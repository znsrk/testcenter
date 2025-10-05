interface InputFieldProps {
  placeholder: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  required?: boolean;
}

export function InputField({ 
  placeholder, 
  value, 
  onChange, 
  type = "text", 
  className = "",
  required = false 
}: InputFieldProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className={`
        w-[500px] h-[56px]
        px-4 py-3
        bg-white
        border border-[#E6EDF8] rounded-lg
        text-base placeholder-[#9CA3AF]
        focus:border-[#007BFF] focus:outline-none focus:ring-2 focus:ring-[#007BFF]/20
        transition-colors duration-200
        ${className}
      `}
    />
  );
}