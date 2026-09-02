"use client"

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Loader2, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Components
import { StepIndicator } from "./StepIndicator";
import { AccountCreationStep } from "./AccountCreationStep";
import { RoleSelectionStep } from "./RoleSelectionStep";
import { DynamicFormStep } from "./DynamicFormStep";
import { PersonalDetailsStep } from "./PersonalDetailsStep";
import { SuccessScreen } from "./SuccessScreen";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// Types
import { 
    accountCreationSchema, 
    AccountCreationData, 
    ApplicationFormTemplate,
    DynamicFormData,
    FullApplicationSubmission,
    personalDetailsSchema,
    PersonalDetailsData
} from "@/types/application";
import { essayWordCountError, isEssayQuestion } from "@/lib/application-essays";

interface ApplicationFormProps {
  initialForms?: ApplicationFormTemplate[];
  hasExistingApplication?: boolean;
}

export function ApplicationForm({ initialForms = [], hasExistingApplication = false }: ApplicationFormProps) {
  const { data: session, update } = useSession();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(!hasExistingApplication);
  const formRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  
  // Safe to leave ref for beforeunload
  const isSafeToLeave = useRef(false);
  
  // Data States
  const [availableForms, setAvailableForms] = useState<ApplicationFormTemplate[]>(initialForms);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [accountData, setAccountData] = useState<AccountCreationData | null>(null);
  
  // Dynamic Answers Store
  const [formAnswers, setFormAnswers] = useState<DynamicFormData>({});
  
  // Delegation Join
  const [inviteCode, setInviteCode] = useState("");

  // Auth Flow Control
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [turnstileToken, setTurnstileToken] = useState("");

  // Forms
  const accountForm = useForm<AccountCreationData>({
    resolver: zodResolver(accountCreationSchema),
    mode: "onChange"
  });

  const personalForm = useForm<PersonalDetailsData>({
    resolver: zodResolver(personalDetailsSchema),
    mode: "onChange"
  });

  // Watch values for real-time validation
  const accountValues = accountForm.watch();
  const personalValues = personalForm.watch();
  const { isValid: isAccountValid } = accountForm.formState;
  const { isValid: isPersonalValid } = personalForm.formState;

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['my-profile-for-app-form'],
    queryFn: async () => {
      const res = await fetch('/api/participant/me');
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!session?.user, // Only run if user is logged in
    staleTime: 5 * 60 * 1000,
  });

  const existingDelegation = profileData?.profile?.delegation;

  const joinDelegationMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/delegation/join_delegation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Could not join the delegation");
      }
    },
    onSuccess: () => {
      toast.success("Your request to join the delegation was sent. Waiting for the leader's approval.");
      queryClient.invalidateQueries({ queryKey: ['my-profile-for-app-form'] });
      setInviteCode("");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to join the delegation.");
    },
  });

  // Unsaved Changes Warning (Tab Close/Refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Warn when leaving after the form has started, unless navigation is intentional.
      if (currentStep > 1 && !isSafeToLeave.current && showForm) {
        e.preventDefault();
        e.returnValue = ''; // Required by legacy browsers and Chrome
        return ''; // Required by Safari and Firefox
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentStep, showForm]);

  // Fallback fetch if no initial forms
  useEffect(() => {
    if (initialForms.length === 0) {
      fetch("/api/forms")
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setAvailableForms(data);
        })
        .catch(console.error);
    }
  }, [initialForms]);

  // Scroll to form top when step changes (but not on initial render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep]);

  const handleRoleSelect = (formId: string) => {
    setSelectedFormId(formId);
    setCurrentStep(2);
  };

  const handleJoinDelegation = () => {
    if (!inviteCode.trim()) {
      toast.error("Enter an invitation code.");
      return;
    }
    joinDelegationMutation.mutate(inviteCode.trim());
  };

  const selectedForm = availableForms.find(f => f.id === selectedFormId);
  const isDelegationLeaderForm = selectedForm?.slug === "delegation";
  const totalDynamicSteps = selectedForm?.steps.length || 0;
  const currentDynamicStep = currentStep >= 4 ? selectedForm?.steps[currentStep - 4] : null;

  // Validation Logic
  const checkIsNextDisabled = () => {
    if (isSubmitting) return true;

    // Step 2: Account
    if (currentStep === 2) {
        if (!turnstileToken) return true;

        if (authMode === 'login') {
            return !accountValues.email || !accountValues.password;
        } else {
            return !isAccountValid || !isEmailVerified;
        }
    }

    // Step 3: Personal
    if (currentStep === 3) {
        if (!isPersonalValid) return true;
        
        if (isDelegationLeaderForm) {
            const delName = personalValues.delegation_name;
            if (!delName || delName.trim().length < 3) return true;
        }
        return false;
    }

    // Step 4+: Dynamic
    if (currentStep >= 4 && currentDynamicStep) {
        return !currentDynamicStep.fields.every(field => {
            const val = formAnswers[field.id];
            if (isEssayQuestion(field)) {
                return !essayWordCountError(field, val);
            }
            if (!field.required) return true;
            if (field.type === 'checkbox') return val === true;
            return val !== "" && val !== null && val !== undefined;
        });
    }

    return false;
  };

  const isNextDisabled = checkIsNextDisabled();

  const handleNext = async () => {
    // --- STEP 2: Account Creation/Login ---
    if (currentStep === 2) {
        const values = accountForm.getValues();
        if (!turnstileToken) {
      toast.error("Verification is incomplete.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (authMode === 'register') {
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
                        token: turnstileToken
                    })
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
                token: authMode === 'login' ? turnstileToken : "SKIPPED_AUTO_LOGIN"
            });

            if (loginRes?.error) throw new Error("Sign-in failed");

            setAccountData(values);
            setCurrentStep(3);
            toast.success("Signed in successfully");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Sign-in failed.");
        } finally {
            setIsSubmitting(false);
        }
        return;
    }

    // --- STEP 3: Personal Details ---
    if (currentStep === 3) {
        let isValid = await personalForm.trigger();
        
        if (isDelegationLeaderForm) {
            const delName = personalForm.getValues("delegation_name");
            if (!delName || delName.trim().length < 3) {
                personalForm.setError("delegation_name", { type: "manual", message: "Delegation name must be at least 3 characters." });
                isValid = false;
            }
        }

        if (isValid) {
            setCurrentStep(4);
        } else {
            toast.error("Check your information.");
        }
        return;
    }

    // --- STEP 4+: Dynamic Form Steps ---
    if (currentDynamicStep) {
        if (isNextDisabled) {
            toast.error("Complete all required fields.");
            return;
        }

        if (!selectedForm) {
            toast.error("Could not load the form data.");
            return;
        }

        const dynamicStepIndex = currentStep - 4;
        if (dynamicStepIndex < selectedForm.steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    }
  };

  const handleSubmit = async () => {
    if (!accountData || !selectedFormId) return;

    setIsSubmitting(true);
    try {
        if (selectedForm) {
            const fields = Array.isArray(selectedForm.questions) && selectedForm.questions.length
              ? selectedForm.questions
              : (selectedForm.steps || []).flatMap((step) => step.fields || []);
            for (const field of fields) {
                const error = essayWordCountError(field, formAnswers[field.id]);
                if (error) throw new Error(error);
            }
        }

        const payload: FullApplicationSubmission = {
            account: accountData,
            personalDetails: personalForm.getValues(),
            formId: selectedFormId,
            formData: formAnswers,
        };

        const res = await fetch("/api/applications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
          throw new Error(err.error || "Submission failed");
        }

        isSafeToLeave.current = true; // Navigation is intentional.
        await update();

        // Redirect delegation leaders to their delegation panel
        const submittedForm = availableForms.find(f => f.id === selectedFormId);
        if (submittedForm?.slug === "delegation") {
            toast.success("Your delegation application was received. Redirecting...");
            setTimeout(() => window.location.href = "/dashboard/delegation", 3500);
            return;
        }

        setIsSubmitted(true);
        toast.success("Application received");
    } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Submission failed.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleBack = () => {
      if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  if (isSubmitted) return <SuccessScreen onReset={() => window.location.reload()} />;

  const displaySteps = [
      { number: 1, title: "Role" },
      { number: 2, title: "Account" },
      { number: 3, title: "Personal details" },
      { number: 4, title: "Form" }
  ];

  const indicatorStep = currentStep >= 4 ? 4 : currentStep;

  // Show buttons if user has existing application
  if (!showForm && hasExistingApplication) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="space-y-2 mb-8">
          <h2 className="text-3xl font-display font-bold">Welcome!</h2>
          <p className="text-muted-foreground">Choose what you would like to do.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full h-12 cursor-pointer" variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              My applications
            </Button>
          </Link>
          <Button 
            onClick={() => setShowForm(true)}
            className="flex-1 h-12 cursor-pointer"
          >
            Start a new application
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto relative" ref={formRef}>
        <StepIndicator steps={displaySteps} currentStep={indicatorStep} />

        <div className="min-h-[400px]">
            {currentStep === 1 && (
                <RoleSelectionStep 
                    forms={availableForms}
                    selectedId={selectedFormId}
                    onSelect={handleRoleSelect}
                />
            )}

            {currentStep === 2 && (
                <div className="space-y-6">
                    <AccountCreationStep 
                        form={accountForm}
                        isEmailVerified={isEmailVerified}
                        onVerify={setIsEmailVerified}
                        onModeChange={setAuthMode}
                        onTokenChange={setTurnstileToken}
                        onNext={handleNext}
                        isSubmitting={isSubmitting}
                    />
                </div>
            )}

            {currentStep === 3 && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {selectedForm?.slug === "delegate" && (
                        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <h4 className="font-semibold text-sm">Join a delegation</h4>
                            </div>
                            {isLoadingProfile ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : existingDelegation ? (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        You already have a delegation membership.
                                    </p>
                                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                                        <span className="font-semibold text-sm">{existingDelegation.name}</span>
                                        {existingDelegation.accepted === true ? (
                                            <Badge className="bg-green-500/10 text-green-600">Approved</Badge>
                                        ) : existingDelegation.accepted === false ? (
                                            <Badge variant="destructive">Rejected</Badge>
                                        ) : (
                                            <Badge variant="outline">Awaiting approval</Badge>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-xs text-muted-foreground">
                                        Enter the invitation code from your delegation leader to join a delegation.
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Invitation code"
                                            value={inviteCode}
                                            onChange={(e) => setInviteCode(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleJoinDelegation}
                                            disabled={joinDelegationMutation.isPending || !inviteCode.trim()}
                                            className="cursor-pointer"
                                            size="sm"
                                        >
                                            {joinDelegationMutation.isPending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                "Join"
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <PersonalDetailsStep form={personalForm} isDelegation={isDelegationLeaderForm} />
                </div>
            )}

            {currentStep >= 4 && currentDynamicStep && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between border-b border-border/40 pb-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-display font-semibold">{currentDynamicStep.title}</h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest">Application details</p>
                        </div>
                        <div className="bg-secondary/30 px-3 py-1 rounded-full border border-border/50">
                            <span className="text-xs font-mono font-medium">
                                Step {currentStep - 3} / {totalDynamicSteps}
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

        <div className="flex justify-between pt-8 mt-8 border-t border-border">
            <Button 
                variant="ghost" 
                onClick={handleBack} 
                disabled={currentStep === 1 || isSubmitting}
                className="cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            
            {currentStep !== 1 && (
                <Button 
                    onClick={handleNext} 
                    disabled={isNextDisabled} 
                    className="min-w-[140px] shadow-md cursor-pointer"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            {currentStep >= 4 && (currentStep - 3) === totalDynamicSteps 
                                ? "Complete application"
                                : "Next"}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                    )}
                </Button>
            )}
        </div>
    </div>
  );
}
