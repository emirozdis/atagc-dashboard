"use client";

import { motion } from "framer-motion";

export function ScannerOverlay() {
    return (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20 overflow-hidden">
            {/* 
                We use a simpler approach for the dimmed background:
                4 divs surrounding the central area to ensure it's always perfectly aligned
                and responsive without complex clip-path calculations.
            */}
            <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 bg-black/40" />
                <div className="flex flex-row h-52 md:h-80">
                    <div className="flex-1 bg-black/40" />
                    <div className="w-52 md:w-80" />
                    <div className="flex-1 bg-black/40" />
                </div>
                <div className="flex-1 bg-black/40" />
            </div>

            {/* Helper Text - Positioned at top to avoid overlap with bottom button */}
            <div className="absolute top-6 md:top-10 flex w-full justify-center">
                <p className="text-white/70 text-[10px] md:text-sm font-medium px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-xl">
                    Center the code in the frame
                </p>
            </div>

            {/* Viewfinder Frame */}
            <div className="relative w-52 h-52 md:w-80 md:h-80 border-2 border-white/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.3)]">
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />

                {/* Animated Scanning Dots (Subtle) */}
                <motion.div
                    className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-1 p-4 opacity-20"
                    initial={{ opacity: 0.1 }}
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className="w-1 h-1 bg-white rounded-full" />
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
