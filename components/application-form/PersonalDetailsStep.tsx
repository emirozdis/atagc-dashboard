"use client";

import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { PersonalDetailsData } from "@/types/application";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITY_OPTIONS, GRADE_OPTIONS } from "@/lib/constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";

interface PersonalDetailsStepProps {
  form: UseFormReturn<PersonalDetailsData>;
}

export function PersonalDetailsStep({ form }: PersonalDetailsStepProps) {
  const { register, formState: { errors }, setValue, watch } = form;
  const [openSchool, setOpenSchool] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchoolLabel, setSelectedSchoolLabel] = useState("");
  const debouncedSchoolSearch = useDebounce(schoolSearch, 300);

  const selectedHighSchoolId = watch("high_school_id");
  
  const { data: schools = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ["high-schools", debouncedSchoolSearch],
    queryFn: async () => {
      if (debouncedSchoolSearch.length < 3) return [];
      const res = await fetch(`/api/high-schools?search=${encodeURIComponent(debouncedSchoolSearch)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ id: number; school_name: string; city: string; district: string }[]>;
    },
    enabled: debouncedSchoolSearch.length >= 3
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="space-y-1 mb-6">
        <h3 className="text-xl font-display font-semibold">Kişisel Bilgiler</h3>
        <p className="text-sm text-muted-foreground">İletişim ve okul bilgilerinizi giriniz.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Telefon Numarası <span className="text-destructive">*</span></Label>
          <Input {...register("phone_number")} placeholder="05XX XXX XX XX" type="tel" />
          {errors.phone_number && <p className="text-xs text-destructive">{errors.phone_number.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Doğum Tarihi <span className="text-destructive">*</span></Label>
          <Input {...register("birth_date")} type="date" />
          {errors.birth_date && <p className="text-xs text-destructive">{errors.birth_date.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Şehir <span className="text-destructive">*</span></Label>
          <Select onValueChange={(val) => setValue("city", val)}>
            <SelectTrigger><SelectValue placeholder="Şehir Seçiniz" /></SelectTrigger>
            <SelectContent>
              {CITY_OPTIONS.map((city) => <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Sınıf Seviyesi <span className="text-destructive">*</span></Label>
          <Select onValueChange={(val: any) => setValue("grade", val)}>
            <SelectTrigger><SelectValue placeholder="Sınıf Seçiniz" /></SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map((grade) => <SelectItem key={grade.value} value={grade.value}>{grade.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.grade && <p className="text-xs text-destructive">{errors.grade.message}</p>}
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="space-y-2">
            <Label>Okul <span className="text-destructive">*</span></Label>
            <Popover open={openSchool} onOpenChange={setOpenSchool}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  <span className="truncate">
                    {selectedHighSchoolId === -1 ? "Diğer (Listede Yok)" : (selectedSchoolLabel || "Okul Arayınız...")}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Okul adı yazınız (min 3 karakter)..." 
                    value={schoolSearch}
                    onValueChange={setSchoolSearch}
                  />
                  <CommandList>
                    {schoolsLoading && <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2"/> Aranıyor...</div>}
                    
                    {!schoolsLoading && schoolSearch.length >= 3 && (
                      <CommandGroup heading="Arama Sonuçları">
                        {schools.map((school) => (
                          <CommandItem
                            key={school.id}
                            value={String(school.id)}
                            onSelect={() => {
                              setValue("high_school_id", school.id);
                              setValue("manual_school_name", "");
                              setSelectedSchoolLabel(school.school_name);
                              setOpenSchool(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedHighSchoolId === school.id ? "opacity-100" : "opacity-0")} />
                            <div className="flex flex-col">
                              <span className="font-medium">{school.school_name}</span>
                              <span className="text-xs text-muted-foreground">{school.city}, {school.district}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    <CommandGroup heading="Alternatif">
                      <CommandItem
                        onSelect={() => {
                          setValue("high_school_id", -1);
                          setSelectedSchoolLabel("Diğer (Listede Yok)");
                          setOpenSchool(false);
                        }}
                      >
                        <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                        <div className="flex flex-col">
                          <span className="font-medium">Okulum Listede Yok</span>
                          <span className="text-xs text-muted-foreground">Okul ismini kendim yazmak istiyorum</span>
                        </div>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedHighSchoolId === -1 && (
            <div className="space-y-2 p-4 bg-secondary/10 rounded-lg border border-border animate-in slide-in-from-top-2">
              <Label>Okulunuzun Tam Adı <span className="text-destructive">*</span></Label>
              <Input 
                {...register("manual_school_name")} 
                placeholder="Örn: Özel ATAGÇ Fen Lisesi"
                className="bg-background"
              />
              <p className="text-[10px] text-muted-foreground">Lütfen okul ismini kısaltma yapmadan, resmi adıyla yazınız.</p>
              {errors.manual_school_name && <p className="text-xs text-destructive">{errors.manual_school_name.message}</p>}
            </div>
          )}
          
          {errors.high_school_id && <p className="text-xs text-destructive">{errors.high_school_id.message}</p>}
        </div>
      </div>
    </div>
  );
}