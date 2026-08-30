import { ApplicationFormTemplate } from "@/types/application";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, User, Camera, Users, ShieldCheck, GraduationCap, FileText } from "lucide-react";

interface RoleSelectionStepProps {
    forms: ApplicationFormTemplate[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export function RoleSelectionStep({ forms, selectedId, onSelect }: RoleSelectionStepProps) {
    
    const getIcon = (slug: string) => {
        const s = slug.toLowerCase();
        if (s.includes('delegate')) return User;
        if (s.includes('press')) return Camera;
        if (s.includes('delegation')) return Users;
        if (s.includes('chair')) return GraduationCap;
        if (s.includes('admin') || s.includes('observer')) return ShieldCheck;
        return FileText; 
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-display font-semibold">Which role are you applying for?</h3>
                <p className="text-muted-foreground text-sm">
                    Select the role you would like to apply for.
                </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
                {forms.map((form) => {
                    const Icon = getIcon(form.slug);
                    const isSelected = selectedId === form.id;

                    return (
                        <Card 
                            key={form.id}
                            className={cn(
                                "cursor-pointer transition-all duration-300 relative overflow-hidden border-2 group min-h-[160px]",
                                "w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)]", // Flexible widths for 5 items
                                isSelected 
                                    ? "border-primary bg-primary/5 shadow-lg scale-[1.02]" 
                                    : "border-border/40 bg-secondary/10 hover:border-primary/40 hover:bg-secondary/20 shadow-sm"
                            )}
                            onClick={() => onSelect(form.id)}
                        >
                            {isSelected && (
                                <div className="absolute top-3 right-3 text-primary animate-in zoom-in duration-300">
                                    <CheckCircle2 className="w-5 h-5 fill-background" />
                                </div>
                            )}
                            
                            <div className="p-6 flex flex-col items-center text-center justify-center gap-4 h-full">
                                <div className={cn(
                                    "p-3 rounded-2xl transition-all duration-300",
                                    isSelected 
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                        : "bg-background text-muted-foreground group-hover:text-primary group-hover:scale-110"
                                )}>
                                    <Icon className="w-7 h-7" />
                                </div>
                                
                                <h4 className={cn(
                                    "font-bold text-base leading-tight transition-colors px-2",
                                    isSelected ? "text-primary" : "text-foreground"
                                )}>
                                    {form.title}
                                </h4>
                            </div>
                        </Card>
                    );
                })}

                {forms.length === 0 && (
                    <div className="w-full text-center py-10 border-2 border-dashed rounded-3xl border-border/50">
                        <p className="text-muted-foreground">There are no active application forms right now.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
