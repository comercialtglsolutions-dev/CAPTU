import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { toast } = useToast();

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;

            setEmailSent(true);
            toast({
                title: "E-mail enviado!",
                description: "Verifique sua caixa de entrada para redefinir sua senha.",
            });
        } catch (error: any) {
            toast({
                title: "Erro ao enviar e-mail",
                description: error.message || "Tente novamente mais tarde.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#1e293b] p-8">
            <div className="w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="flex justify-center mb-8">
                    <img
                        src="/captu.png"
                        alt="CAPTU Logo"
                        className="h-16 w-auto"
                    />
                </div>

                {!emailSent ? (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-semibold text-white">
                                Esqueceu sua senha?
                            </h1>
                            <p className="text-gray-300 text-sm">
                                Digite seu e-mail e enviaremos instruções para redefinir sua senha.
                            </p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white text-sm">
                                    E-mail
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Digite seu e-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white border-0 h-12 text-gray-900 placeholder:text-gray-400"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-base"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Enviar instruções"
                                )}
                            </Button>

                            <Link
                                to="/login"
                                className="flex items-center justify-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Voltar para o login
                            </Link>
                        </form>
                    </div>
                ) : (
                    <div className="text-center space-y-6">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                            <svg
                                className="w-8 h-8 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold text-white">
                                E-mail enviado!
                            </h2>
                            <p className="text-gray-300 text-sm">
                                Verifique sua caixa de entrada em <strong>{email}</strong> e siga as
                                instruções para redefinir sua senha.
                            </p>
                        </div>

                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para o login
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
