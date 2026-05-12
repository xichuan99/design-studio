import { Brush, Gift, Mail, ArrowRight, CheckCircle2 } from "lucide-react";

import { PublicLegalLinks } from "@/components/legal/PublicLegalLinks";

interface WaitlistResult {
  position: number;
  is_new: boolean;
}

interface LandingFooterProps {
  waitlistCount: number | null;
  waitlistEmail: string;
  waitlistLoading: boolean;
  waitlistError: string | null;
  waitlistResult: WaitlistResult | null;
  onWaitlistEmailChange: (value: string) => void;
  onWaitlistSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function LandingFooter({
  waitlistCount,
  waitlistEmail,
  waitlistLoading,
  waitlistError,
  waitlistResult,
  onWaitlistEmailChange,
  onWaitlistSubmit,
}: LandingFooterProps) {
  return (
    <footer className="mt-20 pt-16 pb-8 border-t border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 px-4">
        <div id="waitlist-signup" className="md:col-span-5 flex flex-col gap-6 scroll-mt-28">
          <div className="flex items-center gap-2">
            <Brush className="h-6 w-6 text-purple-400" />
            <span className="font-bold text-white text-xl tracking-tight">SmartDesign Studio</span>
          </div>
          <p className="text-slate-400 max-w-sm">
            Platform desain AI untuk UMKM Indonesia — dari cerita ke desain siap upload dalam 2 menit.
          </p>

          <div className="mt-2">
            <p className="mb-1 font-bold text-white text-lg">Ambil 100 Kredit Gratis + Bonus PDF</p>
            <p className="mb-3 text-sm text-slate-400">
              Daftar sekarang dan langsung dapat 100 kredit (cukup untuk 2-3 desain pertama) + PDF &quot;30 Ide Konten UMKM Bulan Ini&quot;.
            </p>

            {typeof waitlistCount === "number" && waitlistCount > 0 && (
              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold">A</div>
                  <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold">B</div>
                  <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-[8px] text-white font-bold">C</div>
                </div>
                <span className="text-slate-400"><strong className="text-white">{waitlistCount.toLocaleString("id-ID")}+ UMKM</strong> sudah daftar</span>
              </div>
            )}

            <form className="flex gap-2" onSubmit={onWaitlistSubmit}>
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="Email kamu..."
                  required
                  value={waitlistEmail}
                  onChange={(event) => onWaitlistEmailChange(event.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={waitlistLoading}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                {waitlistLoading ? "Mengirim..." : (
                  <>
                    Daftar Gratis
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
            {waitlistError && <p className="mt-2 text-xs text-red-400">{waitlistError}</p>}
            {waitlistResult && (
              <p className="mt-2 text-xs text-green-400">
                {waitlistResult.is_new
                  ? `Berhasil! Posisi waitlist kamu: #${waitlistResult.position}. Cek email untuk bonus PDF.`
                  : `Email sudah terdaftar. Posisi kamu: #${waitlistResult.position}.`}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <CheckCircle2 className="w-3 h-3 text-green-400" /> Tanpa kartu kredit
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <CheckCircle2 className="w-3 h-3 text-green-400" /> Bisa batal kapan saja
              </span>
            </div>
          </div>
        </div>

        <div className="md:col-span-3 flex flex-col gap-4">
          <h4 className="font-bold text-white mb-2">Produk</h4>
          <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">Cara Kerja</a>
          <a href="#showcase" className="text-slate-400 hover:text-white transition-colors">Galeri Hasil</a>
          <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Harga Kredit</a>
          <a href="/login" className="text-slate-400 hover:text-white transition-colors">Login</a>
        </div>

        <div className="md:col-span-4 flex flex-col gap-4">
          <h4 className="font-bold text-white mb-2">Komunitas</h4>
          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/20 p-4 rounded-xl flex items-start gap-4 mb-4 mt-2">
            <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-white font-bold text-sm mb-1">Ajak Teman, Dapat Kredit!</h5>
              <p className="text-slate-400 text-xs">Undang pelaku UMKM lain dan dapatkan <span className="text-purple-400 font-bold">10 kredit bonus</span> untuk setiap teman yang daftar.</p>
            </div>
          </div>

          <div className="flex gap-4 mt-2">
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-slate-400 transition-colors">IG</a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-slate-400 transition-colors">TT</a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:text-white text-slate-400 transition-colors">WA</a>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-white/10 text-slate-500 text-sm px-4">
        <p>© 2026 SmartDesign Studio. Seluruh hak cipta dilindungi.</p>
        <PublicLegalLinks className="gap-6" linkClassName="text-slate-500 hover:text-white" />
      </div>
    </footer>
  );
}
