import React from 'react';

interface LabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({ 
  htmlFor, 
  children, 
  className = "" 
}) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`text-sm font-medium leading-none text-gray-700 ${className}`}
    >
      {children}
    </label>
  );
};