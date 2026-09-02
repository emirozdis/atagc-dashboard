"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { StepIndicator } from "./StepIndicator";
import { AccountCreationStep } from "./AccountCreationStep";
import { PersonalDetailsStep } from "./PersonalDetailsStep";
import { DynamicFormStep } from "./DynamicFormStep";
import { SuccessScreen } from "./SuccessScreen";

import {
    accountCreationSchema,
    AccountCreationData,
    personalDetailsSchema,
    PersonalDetailsData,
    ApplicationFormTemplate,
    DynamicFormData,
} from "@/types/application";

interface DelegationFormProps {
    magiclinkId: string;
    magiclinkEmail: string;
}

export function DelegationForm({ magiclinkId, magiclinkEmail }: DelegationFormProps) {
    const { data: session, update } = useSession();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const isFirstRender = useRef(true);

    // Safe to leave ref for beforeunload
    const isSafeToLeave = useRef(false);

    const [accountData, setAccountData] = useState<AccountCreationData | null>(null);
    const [isEmailVerified, setIsEmailVerified] = useState(true);
    const [authMode, setAuthMode] = useState<"register" | "login">("register");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [delegateForm, setDelegateForm] = useState<ApplicationFormTemplate | null>(null);
    const [formAnswers, setFormAnswers] = useState<DynamicFormData>({});

    const accountForm = useForm<AccountCreationData>({
        resolver: zodResolver(accountCreationSchema),
        mode: "onChange",
        defaultValues: {
            email: magiclinkEmail,
        },
    });

    const personalForm = useForm<PersonalDetailsData>({
        resolver: zodResolver(personalDetailsSchema),
        mode: "onChange",
    });

    const accountValues = accountForm.watch();
    const personalValues = personalForm.watch();
    const { isValid: isAccountValid } = accountForm.formState;
    const { isValid: isPersonalValid } = personalForm.formState;

    // Lock the email field to the magiclink email
    useEffect(() => {
        accountForm.setValue("email", magiclinkEmail);
    }, [magiclinkEmail, accountForm]);

    // Fetch delegate form for dynamic steps
    useEffect(() => {
        fetch("/api/forms")
            .then(res => res.json())
            .then((data: ApplicationFormTemplate[]) => {
                const form = data.find(f => f.slug === "delegate");
                if (form) setDelegateForm(form);
            })
            .catch(console.error);
    }, []);

    // Unsaved Changes Warning (Tab Close/Refresh)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Warn when leaving an unfinished form unless navigation is intentional.
            if (!isSafeToLeave.current) {
                e.preventDefault();
                e.returnValue = ''; // Required by legacy browsers and Chrome
                return ''; // Required by Safari and Firefox
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Scroll to form top when step changes
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [currentStep]);

    const totalDynamicSteps = delegateForm?.steps.length || 0;
    const currentDynamicStep = currentStep >= 3 ? delegateForm?.steps[currentStep - 3] : null;

    // Validation Logic
    const checkIsNextDisabled = () => {
        if (isSubmitting) return true;

        // Step 1: Account
        if (currentStep === 1) {
            if (!turnstileToken) return true;

            if (authMode === 'login') {
                return !accountValues.email || !accountValues.password;
            } else {
                return !isAccountValid || !isEmailVerified;
            }
        }

        // Step 2: Personal (includes KVKK via schema)
        if (currentStep === 2) {
            return !isPersonalValid;
        }

        // Step 3+: Dynamic
        if (currentStep >= 3 && currentDynamicStep) {
            return !currentDynamicStep.fields.every(field => {
                if (!field.required) return true;
                const val = formAnswers[field.id];
                
                if (field.type === 'checkbox') return val === true;
                
                return val !== "" && val !== null && val !== undefined;
            });
        }

        return false;
    };

    const isNextDisabled = checkIsNextDisabled();

    const handleNext = async () => {
        // Step 1: Account Creation/Login
        if (currentStep === 1) {
            const values = accountForm.getValues();

            // Enforce email match
            if (values.email.toLowerCase() !== magiclinkEmail.toLowerCase()) {
                toast.error("This invitation link is only valid for " + magiclinkEmail + ".");
                accountForm.setValue("email", magiclinkEmail);
                return;
            }

            if (!turnstileToken) {
                toast.error("Verification is incomplete.");
                return;
            }

            setIsSubmitting(true);
            try {
                if (authMode === "register") {
                    if (!isEmailVerified) {
                        toast.error("Email has not been verified.");
                        return;
                    }
                    const isValid = await accountForm.trigger();
                    if (!isValid) return;

                    const res = await fetch("/api/auth/register", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: values.email,
                            password: values.password,
                            fullName: values.adSoyad,
                            token: turnstileToken,
                        }),
                    });

                    if (!res.ok && res.status !== 409) {
                        const err = await res.json();
                        throw new Error(err.error || "Registration failed");
                    }
                }

                const loginRes = await signIn("credentials", {
                    redirect: false,
                    email: values.email,
                    password: values.password,
                    token: authMode === "login" ? turnstileToken : "SKIPPED_AUTO_LOGIN",
                });

                if (loginRes?.error) throw new Error("Sign-in failed");

                setAccountData(values);
                setCurrentStep(2);
                toast.success("Signed in successfully");
            } catch (error: unknown) {
                toast.error(error instanceof Error ? error.message : "Sign-in failed.");
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // Step 2: personal details, followed by dynamic questions.
        if (currentStep === 2) {
            const isValid = await personalForm.trigger();
            if (!isValid) {
                toast.error("Check your information.");
                return;
            }
            if (delegateForm && delegateForm.steps.length > 0) {
                setCurrentStep(3);
            } else {
                await handleSubmit();
            }
            return;
        }

        // Step 3+: Dynamic Form Steps
        if (delegateForm && currentDynamicStep) {
            if (isNextDisabled) {
                toast.error("Complete all required fields.");
                return;
            }

            if (currentStep - 2 < delegateForm.steps.length) {
                setCurrentStep(prev => prev + 1);
            } else {
                await handleSubmit();
            }
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/delegation/complete_magiclink", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    magiclink_id: magiclinkId,
                    personal_details: personalForm.getValues(),
                    form_id: delegateForm?.id,
                    form_data: formAnswers,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Submission failed");
            }

            isSafeToLeave.current = true; // Navigation is intentional.
            await update();
            setIsSubmitted(true);
            toast.success("You joined the delegation successfully!");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Submission failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep((prev) => prev - 1);
    };

    if (isSubmitted) return <SuccessScreen onReset={() => (window.location.href = "/")} />;

    const displaySteps = [
        { number: 1, title: "Account" },
        { number: 2, title: "Personal details" },
        ...(totalDynamicSteps > 0 ? [{ number: 3, title: "Form" }] : []),
    ];

    const indicatorStep = currentStep >= 3 ? 3 : currentStep;

    return (
        <div className="w-full max-w-3xl mx-auto relative" ref={formRef}>
            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground">
                    You are registering through a delegation invitation link.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Registration email: <span className="font-semibold text-foreground">{magiclinkEmail}</span>
                </p>
            </div>

            <StepIndicator steps={displaySteps} currentStep={indicatorStep} />

            <div className="min-h-[400px]">
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <AccountCreationStep
                            form={accountForm}
                            isEmailVerified={isEmailVerified}
                            onVerify={setIsEmailVerified}
                            onModeChange={setAuthMode}
                            onTokenChange={setTurnstileToken}
                            onNext={handleNext}
                            isSubmitting={isSubmitting}
                            lockedEmail
                        />
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="animate-in fade-in duration-500">
                        <PersonalDetailsStep form={personalForm} />
                    </div>
                )}

                {currentStep >= 3 && currentDynamicStep && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center justify-between border-b border-border/40 pb-4">
                            <div className="space-y-1">
                                <h3 className="text-xl font-display font-semibold">{currentDynamicStep.title}</h3>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest">Application details</p>
                            </div>
                            <div className="bg-secondary/30 px-3 py-1 rounded-full border border-border/50">
                                <span className="text-xs font-mono font-medium">
                                    Step {currentStep - 2} / {totalDynamicSteps}
                                </span>
                            </div>
                        </div>
                        <DynamicFormStep
                            step={currentDynamicStep}
                            answers={formAnswers}
                            onAnswerChange={(id, val) => setFormAnswers(prev => ({ ...prev, [id]: val }))}
                        />
                    </div>
                )}
            </div>

            {/* Navigation Controls */}
            <div className="flex justify-between pt-8 mt-8 border-t border-border">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={currentStep === 1 || isSubmitting}
                    className={cn("cursor-pointer", currentStep === 1 && "invisible")}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <Button
                    onClick={handleNext}
                    disabled={isNextDisabled}
                    className="min-w-[140px] shadow-md cursor-pointer"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {(totalDynamicSteps === 0 && currentStep === 2) ||
                             (currentStep >= 3 && currentStep - 2 === totalDynamicSteps)
                                ? "Complete registration"
                                : "Next"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
