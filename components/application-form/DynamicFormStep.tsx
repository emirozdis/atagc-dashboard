import { FormStep, FormField } from "@/types/application";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface DynamicFormStepProps {
    step: FormStep;
    answers: Record<string, unknown>;
    onAnswerChange: (id: string, value: unknown) => void;
}

export function DynamicFormStep({ step, answers, onAnswerChange }: DynamicFormStepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="space-y-1 mb-6">
                <h3 className="text-lg font-semibold text-primary">{step.title}</h3>
                {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {step.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                        {field.type !== 'checkbox' && (
                            <Label htmlFor={field.id}>
                                {field.label} {field.required && <span className="text-destructive">*</span>}
                            </Label>
                        )}

                        {renderField(field, answers[field.id], (val) => onAnswerChange(field.id, val))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function renderField(field: FormField, value: unknown, onChange: (val: unknown) => void) {
    const stringValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
    switch (field.type) {
        case "textarea":
            return (
                <Textarea
                    id={field.id}
                    placeholder={field.placeholder}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="min-h-[100px]"
                />
            );
        case "select":
            return (
                <Select value={stringValue} onValueChange={onChange}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select an option..." />
                    </SelectTrigger>
                    <SelectContent>
                        {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        case "checkbox":
            return (
                <div className="flex items-start gap-3 p-4 border border-border rounded-md bg-secondary/5">
                    <Checkbox 
                        id={field.id}
                        checked={value === true}
                        onCheckedChange={(checked) => onChange(checked === true)}
                    />
                    <Label htmlFor={field.id} className="leading-normal cursor-pointer">
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                </div>
            );
        default:
            return (
                <Input
                    id={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={stringValue}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
    }
}

// Change Log:
// - New component to render form fields dynamically based on JSON schema.
