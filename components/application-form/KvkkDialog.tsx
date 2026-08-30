"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Printer, ShieldCheck, X } from "lucide-react";

interface KvkkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIVACY_SECTIONS = [
  { title: "Purpose of processing personal data", text: "The personal data we collect, including your name, contact details, education information, and date of birth, is processed to evaluate applications, manage participant records, organize the conference, send essential updates, issue certificates, plan accommodation and transport, and meet legal obligations." },
  { title: "Sharing and international transfers", text: "Your personal data may be shared, where necessary for these purposes, with legally authorized public institutions, service providers, program partners, and suppliers such as accommodation or transport providers. Data may also be stored or processed on servers outside your country through cloud services." },
  { title: "Collection method and legal basis", text: "Your personal data is collected electronically through the application form on this website. Processing is based on the legitimate interests of the data controller and on steps necessary to establish or perform an agreement, while respecting your fundamental rights and freedoms." },
  { title: "Data security and limitation of liability", text: "BAL Student Association takes reasonable technical and administrative measures to protect your personal data. However, it cannot be held responsible for a breach caused by an unforeseeable cyberattack or unauthorized access despite these measures." },
  { title: "Your rights", text: "You may ask whether your personal data is being processed, request information about its use, learn the purposes of processing and the recipients of transfers, request correction of incomplete or inaccurate data, and request deletion where permitted by law." },
  { title: "Contact", text: "You can send requests about your privacy rights to info@ravenmun.org." },
] as const;

export function KvkkDialog({ open, onOpenChange }: KvkkDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onOpenChange(false);
  };

  const handlePrintPdf = () => {
    setIsPreparing(true);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-10000px";
    iframe.style.bottom = "-10000px";
    document.body.appendChild(iframe);
    const sections = PRIVACY_SECTIONS.map((section, index) => `<section class="section"><h3>${index + 1}. ${section.title}</h3><p>${section.text}</p></section>`).join("");
    const htmlContent = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>RavenMUN privacy notice</title><style>@page{margin:20mm}body{font-family:Arial,sans-serif;color:#1a1a1a;line-height:1.6;margin:0}h2{border-bottom:2px solid #e5e7eb;padding-bottom:12px;margin-bottom:24px}.highlight{background:#f3f4f6;border:1px solid #e5e7eb;padding:16px;border-radius:8px;margin-bottom:24px}.section{margin-bottom:20px}.section h3{font-size:15px;margin-bottom:8px;border-bottom:1px solid #f3f4f6;padding-bottom:4px}.section p{font-size:13px;margin:0;padding-left:12px;text-align:justify;color:#374151}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center}</style></head><body><h2>Personal data privacy notice</h2><div class="highlight"><p><strong>BAL Student Association</strong> processes personal data as the data controller under applicable data protection laws and only for the purposes described below.</p></div>${sections}<div class="footer">This notice was prepared by BAL Student Association.<br>Date: ${new Date().toLocaleDateString("en-GB")}</div></body></html>`;
    const doc = iframe.contentWindow?.document;
    if (!doc) { setIsPreparing(false); return; }
    doc.open();
    doc.write(htmlContent);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { iframe.remove(); setIsPreparing(false); }, 1000);
    };
  };

  if (!open) return null;

  return (
    <div ref={overlayRef} onClick={handleBackdropClick} className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden border-t border-border bg-background shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-2xl sm:border">
        <header className="flex items-start justify-between border-b bg-muted/10 px-6 py-5">
          <div className="flex items-center gap-4 pr-4">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex"><ShieldCheck className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">Personal data privacy notice</h2><p className="mt-1.5 text-sm text-muted-foreground">Please read this notice carefully before submitting your application.</p></div>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 shrink-0 rounded-full text-muted-foreground" onClick={() => onOpenChange(false)} aria-label="Close"><X className="h-5 w-5" /></Button>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-6 sm:px-8"><div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 text-foreground/90 sm:p-5"><p><strong>BAL Student Association</strong> processes personal data as the data controller under applicable data protection laws and only for the purposes described below.</p></div>
          {PRIVACY_SECTIONS.map((section, index) => <section key={section.title} className="space-y-3"><h3 className="flex items-center gap-3 border-b pb-2 text-base font-semibold text-foreground"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">{index + 1}</span>{section.title}</h3><p className="pl-9">{section.text}</p></section>)}
        </div></main>
        <footer className="flex flex-col items-center justify-end gap-4 border-t bg-muted/10 px-6 py-4 sm:flex-row">
          <Button variant="outline" onClick={handlePrintPdf} disabled={isPreparing} size="lg" className="w-full shrink-0 font-semibold sm:w-auto">{isPreparing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-5 w-5" />}Save / print PDF</Button>
          <Button onClick={() => onOpenChange(false)} size="lg" className="w-full shrink-0 font-semibold sm:w-auto"><CheckCircle2 className="mr-2 h-5 w-5" />I have read and understood</Button>
        </footer>
      </div>
    </div>
  );
}
