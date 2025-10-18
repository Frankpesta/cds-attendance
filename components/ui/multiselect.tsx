"use client";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "./button";

type MultiSelectProps = {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  error?: string | null;
};

export function MultiSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select options...", 
  className,
  error 
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  return (
    <div className="space-y-1">
      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "w-full justify-between text-left font-normal",
            !value.length && "text-muted-foreground",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          onClick={() => setOpen(!open)}
        >
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {value.map(val => {
                const option = options.find(opt => opt.value === val);
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-md"
                  >
                    {option?.label}
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(val);
                      }}
                      className="ml-1 hover:bg-primary/20 rounded-full p-0.5 cursor-pointer select-none"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemove(val);
                        }
                      }}
                    >
                      ×
                    </span>
                  </span>
                );
              })}
            </div>
          ) : (
            placeholder
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg">
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  onClick={() => handleToggle(option.value)}
                >
                  <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    value.includes(option.value) 
                      ? "bg-primary text-primary-foreground" 
                      : "opacity-50 [&_svg]:invisible"
                  )}>
                    <Check className="h-3 w-3" />
                  </div>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
