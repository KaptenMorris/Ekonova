
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useMockAuth"; // Use useAuth
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { UserPlus, User, Mail, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SignupPage() {
  const { signup, isAuthenticated, isLoading: isLoadingAuth, resendVerification } = useAuth(); // Use useAuth
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
    await resendVerification(); // Use the function from useAuth
    setIsSubmitting(false);
  };


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name || !email || !password) {
        toast({
            title: "Registrering Misslyckad",
            description: "Vänligen fyll i alla fält.",
            variant: "destructive",
        });
        return;
    }
     if (password.length < 8) { // Enforce Appwrite's default minimum password length
        toast({
            title: "Registrering Misslyckad",
            description: "Lösenordet måste vara minst 8 tecken långt.",
            variant: "destructive",
        });
        return;
    }

    setIsSubmitting(true);
    setShowVerificationMessage(false); // Reset verification message display

    const result = await signup(email, password, name);
    setIsSubmitting(false);

    if (result.success) {
      if (result.messageKey === 'verification_sent') {
        setShowVerificationMessage(true); // Show the "check your email" message
        toast({
          title: "Registrering Lyckades!",
          description: "Ett verifieringsmail har skickats. Klicka på länken i mailet för att aktivera ditt konto.",
          duration: 10000, // Longer duration
        });
      }
      // No specific message needed for 'verification_resent' here as it's handled by login/resend button
    } else {
       let description = "Kunde inte skapa konto. Försök igen.";
       if (result.messageKey === 'already_registered') {
         description = "Ett konto med denna e-postadress finns redan. Vänligen logga in eller återställ lösenordet.";
       }
       toast({
          title: "Registrering Misslyckad",
          description: description,
          variant: "destructive",
        });
    }
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
      <div className="mb-8">
        <Logo iconSize={48} textSize="text-5xl" />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Skapa Ditt Konto</CardTitle>
          <CardDescription>Gå med i Ekonova och ta kontroll över din ekonomi.</CardDescription>
        </CardHeader>
        <CardContent>
          {showVerificationMessage ? (
            <Alert variant="default" className="mb-6">
              <ShieldCheck className="h-5 w-5" />
              <AlertTitle>Verifiera Din E-postadress</AlertTitle>
              <AlertDescription>
                Ett verifieringsmail har skickats till <strong>{email}</strong>.
                Klicka på länken i mailet för att aktivera ditt konto. Kolla även skräpposten.
                 <div className='mt-3'>
                     Har du inte fått något mail?
                    <Button
                        variant="link"
                        className="p-0 h-auto ml-1 text-primary font-semibold"
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
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <Label htmlFor="password">Lösenord (minst 8 tecken)</Label>
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
                    minLength={8} // Basic client-side check
                  />
                </div>
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
                {isSubmitting ? 'Registrerar...' : 'Registrera Dig'}
              </Button>
            </form>
          )}
        </CardContent>
        {!showVerificationMessage && (
          <CardFooter className="flex flex-col items-center space-y-2">
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
  );
}
