"use client";

import React, { useState, useEffect, forwardRef } from 'react';
import { Input, InputProps } from './input';
import { Search, X } from 'lucide-react';
import { Button } from './button';
import { useDebounce } from '@/hooks/useDebounce';

interface DebouncedSearchProps extends Omit<InputProps, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  debounceDelay?: number;
  placeholder?: string;
  showClearButton?: boolean;
  showSearchIcon?: boolean;
}

export const DebouncedSearch = forwardRef<HTMLInputElement, DebouncedSearchProps>(
  ({ 
    value = '', 
    onChange, 
    onSearch, 
    onClear,
    debounceDelay = 500, 
    placeholder = "Search...",
    showClearButton = true,
    showSearchIcon = true,
    className,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = useState(value);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedValue = useDebounce(inputValue, debounceDelay);

    // Update internal state when external value changes
    useEffect(() => {
      setInputValue(value);
    }, [value]);

    // Handle debounced search
    useEffect(() => {
      if (debouncedValue !== value) {
        setIsSearching(false);
        onSearch?.(debouncedValue);
      }
    }, [debouncedValue, onSearch, value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsSearching(true);
      onChange?.(newValue);
    };

    const handleClear = () => {
      setInputValue('');
      onChange?.('');
      onClear?.();
    };

    return (
      <div className="relative">
        {showSearchIcon && (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`${showSearchIcon ? 'pl-10' : ''} ${showClearButton && inputValue ? 'pr-10' : ''} ${className || ''}`}
          {...props}
        />
        {showClearButton && inputValue && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        )}
      </div>
    );
  }
);

DebouncedSearch.displayName = 'DebouncedSearch';
