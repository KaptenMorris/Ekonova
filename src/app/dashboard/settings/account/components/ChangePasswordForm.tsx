
"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useMockAuth"; // Use useAuth
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

export function ChangePasswordForm() {
  const { changePassword } = useAuth(); // Use useAuth
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
     if (newPassword.length < 8) { // Enforce Appwrite's default minimum password length
      toast({
        title: "För Kort Lösenord",
        description: "Ditt nya lösenord måste vara minst 8 tecken långt.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Lösenordet Uppdaterat",
        description: "Ditt lösenord har ändrats.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      let errorMessage = "Kunde inte ändra lösenord. Försök igen.";
      if (result.errorKey === "invalid_current_password") {
        errorMessage = "Nuvarande lösenord är felaktigt.";
      }
      toast({
        title: "Fel Vid Ändring Av Lösenord",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      <div className="space-y-2">
        <Label htmlFor="newPassword">Nytt Lösenord (minst 8 tecken)</Label>
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
            minLength={8} // Basic client-side check
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
            minLength={8}
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
