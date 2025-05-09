
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMockAuth } from "@/hooks/useMockAuth";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail, login, isLoading: isLoadingAuth } = useMockAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already_verified">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);


  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMessage("Verifieringstoken saknas.");
      return;
    }

    const verify = async () => {
      const result = await verifyEmail(token);
      if (result.success) {
        if(result.errorKey === 'already_verified'){
            setStatus("already_verified");
        } else {
            setStatus("success");
             // Try to extract email from token for display, or find a better way if available
            // For mock, we don't easily get email from token, so we might need to adjust verifyEmail to return it
            // Or, more simply, just show a generic success message.
            // For now, let's assume the user knows which email they were verifying.
        }
      } else {
        setStatus("error");
        if (result.errorKey === 'invalid_token') {
          setErrorMessage("Ogiltig eller utgången verifieringstoken.");
        } else {
          setErrorMessage("Ett fel uppstod vid verifieringen. Försök igen.");
        }
      }
    };
    
    // Wait for auth to load before attempting verification, to avoid race conditions with user state
    if(!isLoadingAuth){
        verify();
    }

  }, [searchParams, verifyEmail, isLoadingAuth, router]);


  if (status === "loading" || isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Verifierar din e-post...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">E-postverifiering</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <CardDescription className="text-lg">
              Din e-postadress har verifierats!
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              Du kan nu logga in på ditt konto.
            </p>
            <Button asChild className="w-full mt-6">
              <Link href="/login">Gå till Inloggning</Link>
            </Button>
          </div>
        )}
        {status === "already_verified" && (
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <CardDescription className="text-lg">
              Din e-postadress är redan verifierad.
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              Du kan logga in på ditt konto.
            </p>
            <Button asChild className="w-full mt-6">
              <Link href="/login">Gå till Inloggning</Link>
            </Button>
          </div>
        )}
        {status === "error" && (
          <div className="space-y-4">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <CardDescription className="text-lg text-destructive">
              Verifiering Misslyckades
            </CardDescription>
            <p className="text-sm text-muted-foreground">
              {errorMessage || "Ett okänt fel uppstod."}
            </p>
            <Button asChild variant="outline" className="w-full mt-6">
              <Link href="/signup">Försök Registrera Igen</Link>
            </Button>
            <Button asChild className="w-full mt-2">
              <Link href="/login">Gå till Inloggning</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/50 p-4">
            <div className="mb-8">
                <Logo iconSize={48} textSize="text-5xl" />
            </div>
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg">Laddar verifieringssida...</p>
                </div>
            }>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
