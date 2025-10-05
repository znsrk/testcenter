interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

export function PrimaryButton({ 
  children, 
  onClick, 
  className = "", 
  type = "button",
  disabled = false 
}: PrimaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-[300px] h-[70px] 
        bg-[#007BFF] hover:bg-[#0056b3] disabled:bg-[#6c757d]
        text-white font-semibold text-lg
        rounded-xl
        transition-colors duration-200
        flex items-center justify-center text-center
        ${className}
      `}
    >
      {children}
    </button>
  );
}