'use client';

import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', type = 'text', label, ...props }, ref) => {
    // Updated base styles to match dark/glass theme
    const baseStyles = "mt-1 block w-full px-3 py-2 bg-black/20 border border-white/10 rounded-md shadow-sm placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all sm:text-sm";
    
    const combinedClassName = `${baseStyles} ${className}`;

    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
            <input
                type={type}
                className={combinedClassName}
                ref={ref}
                {...props}
            />
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
