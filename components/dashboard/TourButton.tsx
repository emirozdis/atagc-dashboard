"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function TourButton() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      steps: [
        { 
          element: '#tour-committee-hero', 
          popover: { title: 'Komite Bilgisi', description: 'Burada komiteniz ve rolünüz hakkında temel bilgileri görebilirsiniz.' } 
        },
        { 
          element: '#tour-topic', 
          popover: { title: 'Gündem Maddesi', description: 'Komitenizin tartışacağı aktif konu buradadır.' } 
        },
        { 
          element: '#tour-actions', 
          popover: { title: 'Hızlı İşlemler', description: 'Ortak çalışma belgesine (Resolution Paper) buradan erişebilirsiniz.' } 
        },
        { 
          element: '#tour-voting', 
          popover: { title: 'Oylama Sistemi', description: 'Komite başkanınızın başlattığı oylamalara buradan katılabilirsiniz.' } 
        },
      ]
    });
    driverObj.drive();
  };

  return (
    <Button variant="outline" size="sm" onClick={startTour} className="gap-2">
      <HelpCircle className="w-4 h-4" /> Turu Başlat
    </Button>
  );
}