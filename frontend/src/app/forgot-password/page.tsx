"use client";

import { useState } from "react";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Brush } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const apiUrl = process.env.NEXT_PUBLIC_INTERNAL_API_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                // If it's a 4xx or 5xx error that isn't masked
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail?.detail || "Gagal mengirim link reset. Silakan coba lagi.");
            }

            setSuccess(true);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setErrorMsg(err.message || "Terjadi kesalahan sistem.");
            } else {
                setErrorMsg("Terjadi kesalahan sistem.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
            {/* Background Orbs */}
            <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(108,43,238,0.15)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(66,135,245,0.1)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>

            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
                <div className="size-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(108,43,238,0.5)]">
                    <Brush className="text-white h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">SmartDesign</h1>
            </div>

            <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col gap-6 shadow-2xl">
                <div className="flex justify-between items-start mb-2">
                    <Link href="/login" className="text-slate-500 hover:text-white transition-colors" aria-label="Kembali ke login">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </div>

                <div className="text-center">
                    <h2 className="text-xl font-bold text-white mb-2">Lupa Password?</h2>
                    <p className="text-slate-400 text-sm">Masukkan email kamu dan kami akan mengirimkan link untuk mereset password-mu.</p>
                </div>

                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 w-full text-red-300 text-sm text-center">
                        {errorMsg}
                    </div>
                )}

                {success ? (
                    <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                        </div>
                        <p className="text-sm text-center text-emerald-200">
                            Link reset password berhasil dikirim! Silakan periksa inbox atau folder spam email kamu.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email terdaftar"
                                required
                                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full flex items-center justify-center gap-2 rounded-xl h-12 mt-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-purple-600/50 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(108,43,238,0.2)] hover:shadow-[0_0_25px_rgba(108,43,238,0.4)]"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                "Kirim Link Reset"
                            )}
                        </button>
                    </form>
                )}
            </div>

            <p className="mt-10 text-sm text-slate-600">© 2026 SmartDesign Studio</p>
        </div>
    );
}
