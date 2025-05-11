
"use client";

import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { ChangeAvatarForm } from "./components/ChangeAvatarForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AccountSettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold text-primary mb-2">Kontoinställningar</h1>
        <p className="text-muted-foreground">
          Hantera dina kontouppgifter, lösenord och profilbild.
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
    </div>
  );
}
