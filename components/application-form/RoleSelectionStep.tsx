import { ApplicationFormTemplate } from "@/types/application";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, User, Camera, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoleSelectionStepProps {
    forms: ApplicationFormTemplate[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export function RoleSelectionStep({ forms, selectedId, onSelect }: RoleSelectionStepProps) {
    
    const getIcon = (slug: string) => {
        switch(slug) {
            case 'delegate': return User;
            case 'press': return Camera;
            case 'observer': return FileText;
            default: return User;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Başvuru Türünü Seçiniz</h3>
                <p className="text-muted-foreground text-sm">
                    Lütfen başvurmak istediğiniz pozisyonu belirleyiniz.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {forms.map((form) => {
                    const Icon = getIcon(form.slug);
                    const isSelected = selectedId === form.id;

                    return (
                        <Card 
                            key={form.id}
                            className={cn(
                                "cursor-pointer transition-all duration-300 relative overflow-hidden border-2",
                                isSelected 
                                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                                    : "border-border hover:border-primary/50 hover:bg-secondary/20"
                            )}
                            onClick={() => onSelect(form.id)}
                        >
                            {isSelected && (
                                <div className="absolute top-3 right-3 text-primary">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            )}
                            
                            <div className="p-6 flex flex-col items-center text-center gap-4 h-full">
                                <div className={cn(
                                    "p-4 rounded-full transition-colors",
                                    isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                )}>
                                    <Icon className="w-8 h-8" />
                                </div>
                                
                                <div className="space-y-1">
                                    <h4 className="font-bold text-lg">{form.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-3">
                                        {form.description}
                                    </p>
                                </div>

                                <div className="mt-auto pt-4 w-full">
                                    <Badge variant="outline" className="w-full justify-center py-1 bg-background">
                                        {form.fee > 0 ? `${form.fee} ₺` : "Ücretsiz"}
                                    </Badge>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

// Change Log:
// - New component to display available roles as cards with icons and fees.