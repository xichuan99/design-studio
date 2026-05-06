import { Brush, Menu, X } from "lucide-react";

interface LandingHeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLogin: (ctaLocation: string) => void;
  onJoinWaitlist: (ctaLocation: string) => void;
}

export function LandingHeader({
  mobileMenuOpen,
  setMobileMenuOpen,
  onLogin,
  onJoinWaitlist,
}: LandingHeaderProps) {
  return (
    <>
      <header className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-4 mb-8 sticky top-4 z-50">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(108,43,238,0.5)]">
            <Brush className="text-white h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">SmartDesign</h2>
        </div>
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-8">
            <a className="text-slate-300 hover:text-purple-400 transition-colors text-sm font-medium" href="#features">Fitur</a>
            <a className="text-slate-300 hover:text-purple-400 transition-colors text-sm font-medium" href="#how-it-works">Cara Kerja</a>
            <a className="text-slate-300 hover:text-purple-400 transition-colors text-sm font-medium" href="#pricing">Harga</a>
          </nav>
          <div className="flex gap-3">
            <button onClick={() => onLogin("header_desktop")} className="rounded-lg h-10 px-5 border border-slate-700 hover:bg-slate-800 text-white text-sm font-medium transition-all">
              Masuk
            </button>
            <button onClick={() => onJoinWaitlist("header_desktop")} className="rounded-lg h-10 px-5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(108,43,238,0.5)] transition-all">
              Gabung Waitlist
            </button>
          </div>
        </div>
        <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-6 mb-4 flex flex-col gap-4 animate-in slide-in-from-top z-40">
          <a className="text-slate-200 hover:text-purple-400 transition-colors font-medium py-2" href="#features" onClick={() => setMobileMenuOpen(false)}>Fitur</a>
          <a className="text-slate-200 hover:text-purple-400 transition-colors font-medium py-2" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>Cara Kerja</a>
          <a className="text-slate-200 hover:text-purple-400 transition-colors font-medium py-2" href="#pricing" onClick={() => setMobileMenuOpen(false)}>Harga</a>
          <hr className="border-white/10" />
          <button onClick={() => { onJoinWaitlist("header_mobile"); setMobileMenuOpen(false); }} className="rounded-lg h-12 bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all">
            Gabung Waitlist
          </button>
        </div>
      )}
    </>
  );
}
