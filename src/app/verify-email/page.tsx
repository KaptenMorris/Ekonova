
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useMockAuth"; // Use useAuth
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { verifyEmail, isLoading: isLoadingAuth } = useAuth(); // Get verifyEmail from useAuth
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already_verified">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      setStatus("error");
      setErrorMessage("Verifieringsinformation saknas i länken.");
      return;
    }

    const verify = async () => {
      setStatus("loading");
      const result = await verifyEmail(userId, secret); // Call Appwrite verification
      if (result.success) {
         if(result.errorKey === 'already_verified'){
            setStatus("already_verified");
        } else {
             setStatus("success");
        }
      } else {
        setStatus("error");
        if (result.errorKey === 'invalid_token') {
          setErrorMessage("Ogiltig eller utgången verifieringslänk.");
        } else {
          setErrorMessage("Ett fel uppstod vid verifieringen. Försök registrera dig igen eller kontakta support.");
        }
      }
    };

    // No need to wait for isLoadingAuth here, verification is independent of current session
    verify();

  }, [searchParams, verifyEmail]);


  if (status === "loading") { // isLoadingAuth check removed, handled by verify status
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
            {/* Use Suspense boundary for client components using searchParams */}
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
