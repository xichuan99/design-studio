"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Brush, UserPlus, Mail, User, Loader2, AlertCircle, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export default function RegisterPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Password tidak sama");
            return;
        }

        if (password.length < 8) {
            setError("Password minimal 8 karakter");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Gagal mendaftar. Silakan coba lagi.");
            }

            // Registration successful! Now sign in automatically.
            const signInRes = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInRes?.error) {
                throw new Error("Gagal login otomatis setelah mendaftar");
            }

            router.push("/projects");
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message || "Terjadi kesalahan yang tidak terduga");
            } else {
                setError("Terjadi kesalahan yang tidak terduga");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        signIn("google", { callbackUrl: "/projects" });
    };

    return (
        <div className="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-12">
            {/* Background Orbs */}
            <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,rgba(108,43,238,0.15)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(66,135,245,0.1)_0%,rgba(11,9,16,0)_70%)] pointer-events-none -z-10 blur-3xl"></div>

            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
                <div className="size-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(108,43,238,0.5)]">
                    <Brush className="text-white h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">SmartDesign</h1>
            </div>

            <div className="flex flex-col items-center w-full max-w-md">
                <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col gap-6 shadow-2xl">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Buat Akun Baru</h2>
                        <p className="text-slate-400 text-sm">Mulai kreasikan desain terbaikmu sekarang</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 w-full text-red-300 text-sm animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 rounded-xl h-12 bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-all shadow-lg"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Daftar dengan Google
                    </button>

                    <div className="flex items-center gap-4 w-full">
                        <div className="flex-1 h-[1px] bg-white/10"></div>
                        <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">atau</span>
                        <div className="flex-1 h-[1px] bg-white/10"></div>
                    </div>

                    <form onSubmit={handleRegister} className="flex flex-col gap-4">
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nama Lengkap"
                                required
                                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                            />
                        </div>

                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password (minimal 8 karakter)"
                                required
                                minLength={8}
                                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Konfirmasi Password"
                                required
                                minLength={8}
                                className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !name || !password || !confirmPassword}
                            className="w-full flex items-center justify-center gap-2 rounded-xl h-12 mt-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-purple-600/50 text-white font-semibold text-sm transition-all shadow-[0_0_20px_rgba(108,43,238,0.2)] hover:shadow-[0_0_25px_rgba(108,43,238,0.4)]"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Daftar Sekarang
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-sm text-slate-400">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                        Masuk di sini
                    </Link>
                </p>
            </div>
        </div>
    );
}
