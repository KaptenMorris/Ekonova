
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { applyActionCode, getAuth } from "firebase/auth"; // Import applyActionCode
import { auth } from "@/lib/firebase"; // Import your Firebase auth instance
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { useToast } from "@/hooks/use-toast";


function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "already_verified">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode"); // Firebase uses oobCode

    if (mode !== "verifyEmail" || !oobCode) {
      setStatus("error");
      setErrorMessage("Verifieringsinformation saknas eller är ogiltig i länken.");
      return;
    }

    const verify = async () => {
      setStatus("loading");
      try {
        await applyActionCode(auth, oobCode); // Use Firebase's applyActionCode
        setStatus("success");
        toast({
            title: "E-post Verifierad!",
            description: "Din e-postadress har verifierats. Du kan nu logga in.",
        });
        router.push('/login'); // Redirect to login on success
      } catch (e: any) {
        console.error("Firebase email verification error:", e);
        setStatus("error");
        if (e.code === 'auth/invalid-action-code') {
          setErrorMessage("Ogiltig eller utgången verifieringslänk. Försök skicka en ny från registrerings- eller inloggningssidan.");
        } else if (e.code === 'auth/user-disabled') {
          setErrorMessage("Ditt konto har inaktiverats.");
        } else if (e.code === 'auth/user-not-found') {
           setErrorMessage("Användaren kopplad till denna länk hittades inte.");
        }
        else {
          setErrorMessage("Ett fel uppstod vid verifieringen. Försök igen eller kontakta support.");
        }
      }
    };

    verify();

  }, [searchParams, router, toast]);


  if (status === "loading") {
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
              Du omdirigeras strax till inloggningssidan.
            </p>
            <Button asChild className="w-full mt-6">
              <Link href="/login">Gå till Inloggning</Link>
            </Button>
          </div>
        )}
         {/* "already_verified" is less common with Firebase direct link verification,
             as a used link typically becomes invalid. But keeping for robustness. */}
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
