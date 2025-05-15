
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useMockAuth"; 
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { UserPlus, User, Mail, KeyRound, Loader2, ShieldCheck, Chrome } from 'lucide-react'; // Added Chrome
import { Logo } from '@/components/shared/Logo';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function SignupPage() {
  const { signup, signInWithGoogle, isAuthenticated, isLoading: isLoadingAuth, resendVerification } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);


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


  const handleEmailPasswordSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!name || !email || !password) {
        toast({
            title: "Registrering Misslyckad",
            description: "Vänligen fyll i alla fält.",
            variant: "destructive",
        });
        return;
    }
     if (password.length < 6) { // Firebase default minimum is 6
        toast({
            title: "Registrering Misslyckad",
            description: "Lösenordet måste vara minst 6 tecken långt.",
            variant: "destructive",
        });
        return;
    }

    setIsSubmitting(true);
    setShowVerificationMessage(false); 

    const result = await signup(email, password, name);
    
    if (result.success) {
      if (result.messageKey === 'verification_sent') {
        setShowVerificationMessage(true); 
        toast({
          title: "Registrering Lyckades!",
          description: "Ett verifieringsmail har skickats. Klicka på länken i mailet för att aktivera ditt konto.",
          duration: 10000, 
        });
      }
    } else {
       let description = "Kunde inte skapa konto. Försök igen.";
       if (result.messageKey === 'already_registered') {
         description = "Ett konto med denna e-postadress finns redan. Vänligen logga in eller återställ lösenordet.";
       } else if (result.messageKey === 'config_error') {
         description = "Ett konfigurationsfel uppstod med Firebase. Kontrollera serverloggar och Firebase-inställningar.";
       }
       toast({
          title: "Registrering Misslyckad",
          description: description,
          variant: "destructive",
        });
    }
    setIsSubmitting(false);
  };

  const handleGoogleSignup = async () => {
    setIsSubmitting(true);
    setShowVerificationMessage(false);
    const result = await signInWithGoogle();
    // If Google sign-in is successful and it's a new user,
    // they will be redirected by onAuthStateChanged effect.
    // If it's an existing Google user, they will also be redirected.
    // Error toasts are handled within signInWithGoogle.
    if (result.success && !isAuthenticated) {
        // This case might happen if a new user is created but not yet "authenticated" in our app's terms (e.g. email verification for Google)
        // However, Firebase typically marks Google users as email_verified=true.
        // For simplicity, we assume successful Google sign-in leads to isAuthenticated eventually.
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
      data-ai-hint="abstract pattern"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div> 
      <div className="relative z-10 flex flex-col items-center"> 
        <div className="mb-8">
          <Logo iconSize={48} textSize="text-5xl" />
        </div>
        <Card className="w-full max-w-md shadow-xl bg-card/80 backdrop-blur-md"> 
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Skapa Ditt Konto</CardTitle>
            <CardDescription>Gå med i Ekonova och ta kontroll över din ekonomi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {showVerificationMessage ? (
              <Alert variant="default" className="mb-6 bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-700 dark:text-green-300">Verifiera Din E-postadress</AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-400">
                  Ett verifieringsmail har skickats till <strong>{email}</strong>.
                  Klicka på länken i mailet för att aktivera ditt konto. Kolla även skräpposten.
                  <div className='mt-3'>
                      Har du inte fått något mail?
                      <Button
                          variant="link"
                          className="p-0 h-auto ml-1 text-green-700 dark:text-green-300 font-semibold underline"
                          onClick={handleResendVerification}
                          disabled={isSubmitting}
                      >
                          Skicka igen
                      </Button>
                  </div>
                  <p className="mt-3">Redan verifierat? <Link href="/login" className="font-semibold text-primary hover:underline">Logga in här.</Link></p>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <form onSubmit={handleEmailPasswordSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Fullständigt Namn</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Ditt Namn"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
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
                    <Label htmlFor="password">Lösenord (minst 6 tecken)</Label>
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
                        minLength={6} 
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                    {isSubmitting ? 'Registrerar...' : 'Registrera Dig'}
                  </Button>
                </form>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Eller
                    </span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={isSubmitting}>
                   {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Chrome className="mr-2 h-5 w-5" />}
                  Registrera dig med Google
                </Button>
              </>
            )}
          </CardContent>
          {!showVerificationMessage && (
            <CardFooter className="flex flex-col items-center space-y-2 pt-4">
              <p className="text-sm text-muted-foreground">
                Har du redan ett konto?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Logga In
                </Link>
              </p>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
