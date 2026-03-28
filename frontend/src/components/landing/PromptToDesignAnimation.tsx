"use client";

import { useState, useEffect } from "react";
import { Sparkles, ImageIcon, Send, Type } from "lucide-react";

export function PromptToDesignAnimation() {
  const [step, setStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const fullText = "Buatkan promo Instagram menu Ramadan: Es Cendol Kurma, diskon 20%";

  useEffect(() => {
    let isMounted = true;
    
    const runAnimation = async () => {
      setStep(0);
      setTypedText("");
      
      await new Promise(r => setTimeout(r, 1000));
      if (!isMounted) return;
      
      setStep(1);
      for (let i = 0; i <= fullText.length; i++) {
        if (!isMounted) return;
        setTypedText(fullText.substring(0, i));
        await new Promise(r => setTimeout(r, 40));
      }
      
      await new Promise(r => setTimeout(r, 600));
      if (!isMounted) return;
      
      setStep(2);
      await new Promise(r => setTimeout(r, 1500));
      if (!isMounted) return;
      
      setStep(3);
      await new Promise(r => setTimeout(r, 1200));
      if (!isMounted) return;
      
      setStep(4);
      
      await new Promise(r => setTimeout(r, 5000));
      if (!isMounted) return;
      
      runAnimation();
    };

    runAnimation();

    return () => { isMounted = false; };
  }, [fullText]);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-video max-h-[500px] bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
      {/* Fake Header */}
      <div className="h-10 bg-white/5 flex items-center px-4 gap-2 border-b border-white/5 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
        </div>
        <div className="text-xs text-slate-500 font-medium ml-4">SmartDesign AI Engine</div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: Input / Chat area */}
        <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-white/5 flex flex-col bg-slate-900/40 p-5 relative shrink-0">
          <div className="flex-1 flex flex-col justify-end pb-4 space-y-4">
            <div className={`transition-all duration-700 transform \${step >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <span className="text-blue-400 text-[10px] font-bold">You</span>
                </div>
                <div className="bg-blue-600/20 text-blue-100 p-2.5 rounded-2xl rounded-tl-sm text-sm border border-blue-500/20 leading-relaxed shadow-sm min-h-[44px] min-w-[32px] w-fit break-words">
                  {typedText}
                  {step === 1 && <span className="animate-pulse ml-0.5">|</span>}
                </div>
              </div>
            </div>

            {step >= 2 && (
              <div className={`transition-all duration-500 transform \${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30 relative">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    {step === 2 && (
                      <span className="absolute inset-0 rounded-full border border-purple-400/50 animate-ping opacity-75"></span>
                    )}
                  </div>
                  <div className="bg-purple-900/40 text-purple-100 p-2.5 rounded-2xl rounded-tl-sm text-sm border border-purple-500/20 shadow-sm">
                    {step === 2 ? (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        Generating layout...
                      </span>
                    ) : (
                      <span>Siap! Template untuk Instagram Square sudah tergenerate.</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fake input box at bottom */}
          <div className="relative mt-auto shrink-0">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Type className="h-4 w-4 text-slate-500" />
            </div>
            <div className="w-full bg-slate-950 border border-white/10 text-slate-500 text-xs rounded-xl pl-9 pr-10 py-3">
              Ketik idemu di sini...
            </div>
            <div className="absolute inset-y-0 right-1.5 flex items-center">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors \${step === 1 && typedText.length === fullText.length ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-500'}`}>
                <Send className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Output / Canvas Area */}
        <div className="w-full md:w-7/12 bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden h-full">
          {/* Ambient background glow */}
          {step >= 3 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="w-40 h-40 bg-purple-600/20 rounded-full blur-[60px]"></div>
            </div>
          )}

          {/* Canvas Wrapper */}
          <div className="relative w-full max-w-[240px] md:max-w-[280px] aspect-square bg-slate-900 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-lg border border-white/10 overflow-hidden z-10 transition-all duration-500 hover:scale-105">
            
            {/* Initial empty state */}
            {step < 3 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-700/50 m-4 rounded-lg">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-medium">Canvas Ready</span>
              </div>
            )}

            {/* Step 3: Wireframe / Skeleton generating */}
            {step === 3 && (
              <div className="absolute inset-x-4 inset-y-4 flex flex-col gap-3">
                <div className="w-full h-1/2 bg-slate-800 rounded-md animate-pulse"></div>
                <div className="w-3/4 h-6 bg-slate-800 rounded-md mt-2 animate-pulse delay-75"></div>
                <div className="w-1/2 h-4 bg-slate-800 rounded-md animate-pulse delay-150"></div>
                <div className="mt-auto w-full h-10 bg-purple-900/50 rounded-md border border-purple-500/20 animate-pulse delay-300"></div>
              </div>
            )}

            {/* Step 4: Final Output */}
            <div className={`absolute inset-0 bg-[#0F172A] transition-opacity duration-1000 \${step === 4 ? 'opacity-100' : 'opacity-0'}`}>
               <div className="absolute inset-0 bg-gradient-to-br from-[#1E1B4B] to-[#0F172A]">
                  {/* Fake food image placeholder with an Unsplash image */}
                  <div className="absolute top-0 inset-x-0 h-[55%] bg-[url('https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=400&auto=format&fit=crop')] bg-cover bg-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E1B4B] via-[#1E1B4B]/80 to-transparent"></div>
                  </div>
                  
                  <div className="absolute bottom-5 inset-x-5 flex flex-col gap-1.5 z-10">
                    <div className="inline-block bg-amber-400 text-slate-900 text-[9px] px-2 py-0.5 rounded-sm font-bold w-max shadow-sm uppercase tracking-wider mb-1">
                      Menu Ramadan
                    </div>
                    <h3 className="text-white font-bold text-xl leading-tight">
                      Es Cendol Kurma
                    </h3>
                    <p className="text-indigo-200 text-[10px] opacity-90 max-w-[80%]">
                      Manisnya pas, segarnya kurma asli untuk buka puasa
                    </p>
                    
                    <div className="mt-3 flex items-end justify-between border-t border-white/10 pt-3">
                      <div className="flex flex-col">
                        <span className="text-slate-400 text-[9px] line-through font-medium">Rp 25.000</span>
                        <span className="text-amber-400 font-bold text-base leading-none mt-0.5">Rp 20.000</span>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] px-2.5 py-1.5 rounded-md font-bold shadow-sm">
                        DISKON 20%
                      </div>
                    </div>
                  </div>
               </div>
            </div>
            
          </div>
          
          {/* Subtle decoration elements */}
          {step === 4 && (
            <>
              <div className="absolute top-8 left-8 w-2 h-2 bg-purple-500 rounded-full animate-ping opacity-50"></div>
              <div className="absolute bottom-8 right-8 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping opacity-50 delay-300"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
