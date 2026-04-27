"use client";

import { useState, useEffect, Suspense } from "react";
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Brush } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/coreApi";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        if (!token) {
            setErrorMsg("Link reset tidak valid atau sudah kedaluwarsa.");
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token) return;
        
        if (password.length < 8) {
            setErrorMsg("Password harus terdiri dari minimal 8 karakter.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMsg("Konfirmasi password tidak cocok.");
            return;
        }

        setLoading(true);
        setErrorMsg("");

        try {
            const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail?.detail || data.detail || "Gagal mereset password. Token mungkin sudah kedaluwarsa.");
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: unknown) {
            if (err instanceof TypeError && err.message === "Failed to fetch") {
                setErrorMsg("Tidak dapat terhubung ke server. Periksa koneksi internet kamu atau coba lagi nanti.");
            } else if (err instanceof Error) {
                setErrorMsg(err.message || "Terjadi kesalahan sistem.");
            } else {
                setErrorMsg("Terjadi kesalahan sistem.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-2">Pilih Password Baru</h2>
                <p className="text-slate-400 text-sm">Harap buat password yang kuat dan mudah diingat.</p>
            </div>

            {errorMsg && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 w-full text-red-300 text-sm animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}
            
            {success ? (
                <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-sm text-center text-emerald-200">
                        Password berhasil diubah! Mengarahkan ke halaman login...
                    </p>
                </div>
            ) : !token && errorMsg ? (
                <div className="flex flex-col gap-4 mt-2">
                        <Link href="/forgot-password"
                        className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold transition-all">
                        Minta Link Baru
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password baru"
                            required
                            className="w-full h-12 pl-11 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    
                    <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            required
                            className="w-full h-12 pl-11 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors focus:outline-none"
                        >
                            {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !password || !confirmPassword || !token}
                        className="w-full flex items-center justify-center gap-2 rounded-xl h-12 mt-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-purple-600/50 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(108,43,238,0.2)] hover:shadow-[0_0_25px_rgba(108,43,238,0.4)]"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            "Simpan Password Baru"
                        )}
                    </button>
                </form>
            )}
        </>
    );
}

export default function ResetPasswordPage() {
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
                <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>

            <p className="mt-10 text-sm text-slate-600">© 2026 SmartDesign Studio</p>
        </div>
    );
}
