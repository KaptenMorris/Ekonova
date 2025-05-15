
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useMockAuth"; 
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { LogIn, Mail, KeyRound, Loader2, ShieldAlert, Chrome } from 'lucide-react'; // Added Chrome
import { Logo } from '@/components/shared/Logo';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";


export default function LoginPage() {
  const { login, signInWithGoogle, isAuthenticated, isLoading: isLoadingAuth, resendVerification } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoadingAuth, router]);

  const handleResendVerification = async () => {
      setIsSubmitting(true);
      await resendVerification(); 
      setIsSubmitting(false);
  };

  const handleEmailPasswordLogin = async (event: FormEvent) => {
    event.preventDefault();
    setShowVerificationPrompt(false); 
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
    // Redirection or error handling happens based on `result` and `isAuthenticated` state
    if (!result.success) {
      let description = "Kontrollera dina uppgifter och försök igen.";
      if (result.errorKey === 'account_deleted') { // This key needs to be implemented in useAuth if needed
        description = "Detta konto har raderats. Registrera dig på nytt för att använda tjänsten.";
      } else if (result.errorKey === 'account_not_verified') {
        description = "Ditt konto är inte verifierat. Kontrollera din e-post för verifieringslänken eller begär en ny.";
        setShowVerificationPrompt(true); 
      } else if (result.errorKey === 'invalid_credentials') {
         description = "Felaktig e-postadress eller lösenord.";
      } else if (result.errorKey === 'config_error') {
        description = "Ett konfigurationsfel uppstod. Kontakta support om problemet kvarstår."
      } else if (result.errorKey === 'user-disabled') {
        description = "Ditt konto har inaktiverats av en administratör.";
      } else if (result.errorKey === 'too-many-requests') {
        description = "För många inloggningsförsök. Försök igen senare.";
      }
      toast({
        title: "Inloggning Misslyckad",
        description: description,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setShowVerificationPrompt(false);
    const result = await signInWithGoogle();
    // Redirection or error handling happens based on `result` and `isAuthenticated` state
    if (!result.success) {
      // signInWithGoogle in useAuth handles its own toasts for Google-specific errors
      // Generic error can be handled here if needed, but usually not for Google Popups.
    }
    setIsSubmitting(false);
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
          <CardContent className="space-y-6">
            {showVerificationPrompt && (
              <Alert variant="destructive" className="mb-6">
                <ShieldAlert className="h-5 w-5" />
                <AlertTitle>Konto Ej Verifierat</AlertTitle>
                <AlertDescription>
                  Kontrollera din e-post för verifieringslänken. Har du inte fått någon?
                  <Button
                      variant="link"
                      className="p-0 h-auto ml-1 text-destructive font-semibold underline"
                      onClick={handleResendVerification}
                      disabled={isSubmitting}
                  >
                      Skicka igen
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
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
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                {isSubmitting && !showVerificationPrompt ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                {isSubmitting && !showVerificationPrompt ? 'Loggar in...' : 'Logga In'}
              </Button>
            </form>
            
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Eller fortsätt med
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Chrome className="mr-2 h-5 w-5" />} 
              Logga in med Google
            </Button>

          </CardContent>
          <CardFooter className="flex flex-col items-center space-y-2 pt-4">
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
