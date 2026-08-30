"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

export type MultiSelectOption = {
  label: string;
  value: string;
};

interface MultiSelectPopoverProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerIcon?: React.ReactNode;
}

export function MultiSelectPopover({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
  triggerIcon,
}: MultiSelectPopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full sm:w-auto h-10 bg-background border-border/50 justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
              {triggerIcon}
              <span className="truncate">{placeholder}</span>
              {selected.length > 0 && (
                <>
                  <div className="h-4 w-px bg-border/50 mx-1" />
                  <Badge variant="secondary" className="rounded-sm px-1.5 font-normal h-5">
                    {selected.length}
                  </Badge>
                </>
              )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(selected.filter((v) => v !== option.value));
                      } else {
                        onChange([...selected, option.value]);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-all",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Change log:
// - Created a new, reusable multi-select component for filter toolbars.
// - Uses a Popover with a Command list and checkboxes for an intuitive UI.
// - The trigger button displays a placeholder and a count of selected items.
