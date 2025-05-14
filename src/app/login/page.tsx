
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useMockAuth"; // Use the new Auth hook
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LogIn, Mail, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


export default function LoginPage() {
  const { login, isAuthenticated, isLoading: isLoadingAuth, resendVerification } = useAuth(); // Use useAuth
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  useEffect(() => {
    // Redirect if already authenticated and auth is loaded
    if (!isLoadingAuth && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  const handleResendVerification = async () => {
      setIsSubmitting(true);
      await resendVerification(); // This now uses Firebase and shows its own toast
      setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setShowVerificationPrompt(false); // Reset prompt on new submission
    if (!email || !password) {
        toast({
            title: "Inloggning Misslyckad",
            description: "Vänligen fyll i både e-post och lösenord.",
            variant: "destructive",
        });
        return;
    }
    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      let description = "Kontrollera dina uppgifter och försök igen.";
      if (result.errorKey === 'account_deleted') {
        description = "Detta konto har raderats. Registrera dig på nytt för att använda tjänsten.";
      } else if (result.errorKey === 'account_not_verified') {
        description = "Ditt konto är inte verifierat. Kontrollera din e-post för verifieringslänken eller begär en ny.";
        setShowVerificationPrompt(true); // Show resend option
      } else if (result.errorKey === 'invalid_credentials') {
         description = "Felaktig e-postadress eller lösenord.";
      } else if (result.errorKey === 'config_error') {
        description = "Ett konfigurationsfel uppstod. Kontakta support om problemet kvarstår."
      }


      toast({
        title: "Inloggning Misslyckad",
        description: description,
        variant: "destructive",
      });
    }
    // Successful login and redirection is handled by the login function itself if successful, or by useEffect
  };

  if (isLoadingAuth || (!isLoadingAuth && isAuthenticated)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-secondary/50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-3 text-lg">Laddar...</span>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: "url('https://placehold.co/1920x1080.png')" }}
      data-ai-hint="abstract background"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-8">
          <Logo iconSize={48} textSize="text-5xl" />
        </div>
        <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Välkommen Tillbaka!</CardTitle>
            <CardDescription>Logga in för att hantera din ekonomi med Ekonova.</CardDescription>
          </CardHeader>
          <CardContent>
            {showVerificationPrompt && (
              <Alert variant="destructive" className="mb-6">
                <ShieldAlert className="h-5 w-5" />
                <AlertTitle>Konto Ej Verifierat</AlertTitle>
                <AlertDescription>
                  Kontrollera din e-post för verifieringslänken. Har du inte fått någon?
                  <Button
                      variant="link"
                      className="p-0 h-auto ml-1 text-destructive font-semibold"
                      onClick={handleResendVerification}
                      disabled={isSubmitting}
                  >
                      Skicka igen
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="du@exempel.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Lösenord</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Loggar in...' : 'Logga In'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Har du inget konto?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Registrera Dig
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
