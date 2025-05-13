
"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useMockAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export function ChangePasswordForm() {
  const { changePassword, login } = useAuth();
  const { toast } = useToast();
  // const [currentPassword, setCurrentPassword] = useState(""); // Not directly needed for Firebase updatePassword
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reauthRequired, setReauthRequired] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const { currentUserEmail } = useAuth();


  const handleReauthSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUserEmail || !reauthPassword) {
      toast({ title: "Fel", description: "E-post eller lösenord saknas för omauktorisering.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const loginResult = await login(currentUserEmail, reauthPassword);
    if (loginResult.success) {
      setReauthRequired(false);
      setReauthPassword("");
      toast({ title: "Omauktorisering Lyckades", description: "Försök ändra lösenordet igen." });
    } else {
      toast({ title: "Omauktorisering Misslyckades", description: "Felaktigt lösenord.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Lösenorden Matchar Inte",
        description: "Det nya lösenordet och bekräftelsen stämmer inte överens.",
        variant: "destructive",
      });
      return;
    }
     if (newPassword.length < 6) { // Firebase default minimum is 6
      toast({
        title: "För Kort Lösenord",
        description: "Ditt nya lösenord måste vara minst 6 tecken långt.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setReauthRequired(false); // Reset reauth state
    const result = await changePassword(newPassword); // Current password not passed for Firebase
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Lösenordet Uppdaterat",
        description: "Ditt lösenord har ändrats.",
      });
      // setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      let errorMessage = "Kunde inte ändra lösenord. Försök igen.";
      // if (result.errorKey === "invalid_current_password") { // Less common with Firebase direct update
      //   errorMessage = "Nuvarande lösenord är felaktigt.";
      // }
      if (result.errorKey === "reauth_required") {
        errorMessage = "Av säkerhetsskäl måste du logga in igen innan du kan byta lösenord.";
        setReauthRequired(true);
      }
      toast({
        title: "Fel Vid Ändring Av Lösenord",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (reauthRequired) {
    return (
      <form onSubmit={handleReauthSubmit} className="space-y-6">
        <Alert variant="destructive">
          <AlertTitle>Återautentisering Krävs</AlertTitle>
          <AlertDescription>
            För din säkerhet, vänligen ange ditt nuvarande lösenord igen för att fortsätta.
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Label htmlFor="reauthPassword">Nuvarande Lösenord</Label>
          <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
              id="reauthPassword"
              type="password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              required
              className="pl-10"
              disabled={isSubmitting}
              />
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Bekräfta Lösenord
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current password field can be removed for Firebase if not enforcing it client-side
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Nuvarande Lösenord</Label>
        <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="pl-10"
            disabled={isSubmitting}
            />
        </div>
      </div>
      */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nytt Lösenord (minst 6 tecken)</Label>
        <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="pl-10"
            disabled={isSubmitting}
            minLength={6}
            />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmNewPassword">Bekräfta Nytt Lösenord</Label>
         <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
            id="confirmNewPassword"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
            className="pl-10"
            disabled={isSubmitting}
            minLength={6}
            />
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Spara Lösenord
      </Button>
    </form>
  );
}
