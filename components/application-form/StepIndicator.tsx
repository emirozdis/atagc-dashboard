import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8 md:mb-12">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-300",
                  currentStep > step.number 
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.number
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                )}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.number}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs md:text-sm font-medium text-center hidden sm:block",
                  currentStep >= step.number ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-[2px] flex-1 mx-2 transition-colors duration-300",
                  currentStep > step.number ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>
      {/* Mobile Title */}
      <p className="text-center text-sm font-medium text-foreground mt-4 sm:hidden">
        {steps[currentStep - 1]?.title}
      </p>
    </div>
  );
}

// Change Log:
// - Ensured `StepIndicator` is exported as a named export `export function StepIndicator`.
// - Refined Tailwind classes for better visual consistency with the new theme (using flex utils for centering).