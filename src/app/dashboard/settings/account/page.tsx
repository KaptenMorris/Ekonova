
"use client";

import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { ChangeAvatarForm } from "./components/ChangeAvatarForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useMockAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/types";

export default function AccountSettingsPage() {
  const { currentUserProfile, updateUserPreferences, isLoading } = useAuth();
  const { toast } = useToast();
  const [showBills, setShowBills] = useState(true);

  useEffect(() => {
    if (currentUserProfile && typeof currentUserProfile.showBillsSection === 'boolean') {
      setShowBills(currentUserProfile.showBillsSection);
    }
  }, [currentUserProfile]);

  const handleShowBillsChange = async (checked: boolean) => {
    setShowBills(checked);
    const result = await updateUserPreferences({ showBillsSection: checked });
    if (result.success) {
      toast({
        title: "Inställning Sparad",
        description: `Visning av räkningssektionen har ${checked ? 'aktiverats' : 'inaktiverats'}.`,
      });
    } else {
      toast({
        title: "Fel",
        description: "Kunde inte spara inställningen.",
        variant: "destructive",
      });
      // Revert UI on failure
      setShowBills(!checked);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-primary mb-2">Kontoinställningar</h1>
        <p className="text-muted-foreground">
          Hantera dina kontouppgifter, lösenord, profilbild och appinställningar.
        </p>
      </div>
      <Separator />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ändra Lösenord</CardTitle>
          <CardDescription>
            Uppdatera ditt lösenord för ökad säkerhet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Ändra Profilbild</CardTitle>
          <CardDescription>
            Välj en ny profilbild som visas i appen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangeAvatarForm />
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Visningsinställningar</CardTitle>
          <CardDescription>
            Anpassa vilka sektioner som visas i applikationen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-bills-switch"
              checked={showBills}
              onCheckedChange={handleShowBillsChange}
              disabled={isLoading}
            />
            <Label htmlFor="show-bills-switch" className="cursor-pointer">
              Visa räkningssektionen i sidofältet och navigeringen
            </Label>
          </div>
           <p className="text-xs text-muted-foreground mt-2">
            Om du avmarkerar detta kommer "Räkningar" att döljas från huvudmenyn. Du kommer fortfarande åt sidan via direktlänk om du känner till den.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
