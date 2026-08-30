"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Loader2, Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { DynamicRollCallQR } from "@/components/committee/DynamicRollCallQR";

interface Committee {
    id: string;
    name: string;
}

interface CreateRollCallDialogProps {
    onSuccess: () => void;
}

type Step = 'form' | 'live' | 'success';

export function CreateRollCallDialog({ onSuccess }: CreateRollCallDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>('form');

    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);

    const [committees, setCommittees] = useState<Committee[]>([]);
    const [selectedCommittee, setSelectedCommittee] = useState<string>("");
    const [sessionName, setSessionName] = useState("");
    const [loading, setLoading] = useState(false);

    const [rollCallId, setRollCallId] = useState<string | null>(null);

    const fetchCommittees = async () => {
        try {
            const res = await fetch("/api/admin/committees");
            if (res.ok) {
                const data = await res.json();
                setCommittees(data);
            }
        } catch (e) {
            console.error("Failed to fetch committees");
        }
    };

    const generateQR = async () => {
        if (!selectedCommittee || !sessionName) {
            toast.error("Missing information", { description: "Please select a committee and enter a session name." });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/roll-call/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    committee_id: selectedCommittee,
                    session_name: sessionName,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed");
            }

            const data = await res.json();

            setRollCallId(data.id);
            // Secret key is NOT needed on client side with SSE
            
            toast.success("Session started");
            setStep('live');
        } catch (e) {
            toast.error("Error", { description: "Could not create the QR code." });
        } finally {
            setLoading(false);
        }
    };

    const handleManualFinishTrigger = () => {
        setShowFinishConfirm(true);
    };

    const confirmManualFinish = () => {
        setShowFinishConfirm(false);
        setStep('success');
    };

    const handleOpenChange = (val: boolean) => {
        if (val) {
            setOpen(true);
            if (step === 'form') fetchCommittees();
        } else {
            if (step === 'live') {
                setShowExitConfirm(true);
                return;
            }
            setOpen(false);
            handleCloseCleanup();
        }
    };

    const confirmExit = () => {
        setShowExitConfirm(false);
        setOpen(false);
        handleCloseCleanup();
    };

    const handleCloseCleanup = () => {
        setTimeout(() => {
            setStep('form');
            setSessionName("");
            setSelectedCommittee("");
            setRollCallId(null);
            onSuccess();
        }, 300);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New roll call
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                    {step === 'form' && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Create roll call</DialogTitle>
                                <DialogDescription>
                                    Create a QR code for the selected committee.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Committee</Label>
                                    <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a committee" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {committees.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Session name</Label>
                                    <Input
                                        placeholder="For example: Session 1"
                                        value={sessionName}
                                        onChange={(e) => setSessionName(e.target.value)}
                                    />
                                </div>

                                <Button onClick={generateQR} className="w-full" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
                                    Create
                                </Button>
                            </div>
                        </>
                    )}

                    {step === 'live' && rollCallId && (
                        <div className="py-2">
                            <DynamicRollCallQR
                                rollCallId={rollCallId}
                                sessionName={sessionName}
                                onManualFinish={handleManualFinishTrigger}
                                onComplete={() => setStep('success')}
                            />
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95">
                            <div className="flex justify-center mb-2">
                                <div className="p-4 bg-green-500/20 text-green-500 rounded-full ring-4 ring-green-500/10">
                                    <CheckCircle className="w-16 h-16" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-bold text-2xl text-green-500">Roll call completed</h3>
                                <p className="text-muted-foreground font-medium text-lg">{sessionName}</p>
                            </div>

                            <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 text-sm text-muted-foreground">
                                Roll call ended successfully. You can review the details in the list.
                            </div>

                            <Button size="lg" onClick={() => handleOpenChange(false)} className="w-full">
                                Done
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Leave roll call?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The roll call will continue in the background, but you will no longer see the QR code. Are you sure you want to close this window?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmExit}>Close window</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>End roll call?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will end the roll call manually and invalidate the QR code.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowFinishConfirm(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmManualFinish} className="bg-destructive text-white hover:bg-destructive/90">End roll call</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// Change Log:
// - Updated to use `DynamicRollCallQR` with SSE support.
// - Removed legacy `secretKey` logic.
