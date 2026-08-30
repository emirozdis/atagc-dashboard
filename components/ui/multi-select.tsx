"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type Option = {
  label: string;
  value: string;
  group?: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  // Group options
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, Option[]>);

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] px-3 py-2"
          >
            <div className="flex flex-wrap gap-1 items-center text-left">
              {selected.length === 0 && (
                <span className="text-muted-foreground font-normal">{placeholder}</span>
              )}
              {selected.length > 0 && (
                <>
                  <span className="text-sm font-medium mr-2">
                    {selected.length} selected
                  </span>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList className="max-h-[300px]">
            <CommandEmpty>No results found.</CommandEmpty>
              {Object.entries(groupedOptions).map(([group, groupOpts]) => (
                <CommandGroup key={group} heading={group}>
                  {groupOpts.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selected.includes(option.value)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                         <span>{option.label}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Items Tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-secondary/10">
          {selected.map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <Badge key={value} variant="secondary" className="pl-2 pr-1 py-1">
                {option?.label || value}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-4 w-4 ml-1 hover:bg-transparent hover:text-destructive"
                  onClick={() => handleRemove(value)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            );
          })}
          <div className="w-full flex justify-end">
             <Button 
                variant="link" 
                size="sm" 
                className="text-xs h-auto p-0 text-muted-foreground hover:text-foreground"
                onClick={() => onChange([])}
             >
                Clear all
             </Button>
          </div>
        </div>
      )}
    </div>
  );
}
