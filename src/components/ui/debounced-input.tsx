"use client";

import React, { useState, useEffect, forwardRef } from 'react';
import { Input, InputProps } from './input';
import { useDebounce } from '@/hooks/useDebounce';

interface DebouncedInputProps extends Omit<InputProps, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  debounceDelay?: number;
  showDebounceIndicator?: boolean;
}

export const DebouncedInput = forwardRef<HTMLInputElement, DebouncedInputProps>(
  ({ 
    value = '', 
    onChange, 
    onDebouncedChange, 
    debounceDelay = 500, 
    showDebounceIndicator = false,
    className,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = useState(value);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const debouncedValue = useDebounce(inputValue, debounceDelay);

    // Update internal state when external value changes
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    // Handle debounced value changes
    useEffect(() => {
      if (debouncedValue !== value) {
        setIsDebouncing(false);
        onDebouncedChange?.(debouncedValue);
      }
    }, [debouncedValue, onDebouncedChange, value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsDebouncing(true);
      onChange?.(newValue);
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          value={inputValue}
          onChange={handleChange}
          className={className}
          {...props}
        />
        {showDebounceIndicator && isDebouncing && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    );
  }
);

DebouncedInput.displayName = 'DebouncedInput';
