
"use client";

import { useState, type ChangeEvent, type FormEvent, useEffect } from "react";
import { useAuth } from "@/hooks/useMockAuth"; // Use useAuth
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChangeAvatarForm() {
  const { currentUserAvatarUrl, updateProfilePicture, currentUserName, currentUserEmail } = useAuth(); // Use useAuth
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUserAvatarUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userInitial = currentUserName ? currentUserName.charAt(0).toUpperCase() : (currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'A');

  // Update preview when the actual avatar URL changes (e.g., after successful update)
  useEffect(() => {
    setPreviewUrl(currentUserAvatarUrl);
  }, [currentUserAvatarUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic size check (e.g., 2MB)
      if (file.size > 2 * 1024 * 1024) {
           toast({
                title: "Filen är för stor",
                description: "Välj en bildfil som är mindre än 2MB.",
                variant: "destructive",
            });
           setSelectedFile(null);
           setPreviewUrl(currentUserAvatarUrl); // Revert preview
            // Clear the file input visually
            const fileInput = document.getElementById('avatarFile') as HTMLInputElement | null;
            if (fileInput) fileInput.value = "";
           return;
      }

      setSelectedFile(file);
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(currentUserAvatarUrl); // Revert to current avatar if selection is cleared
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({
        title: "Ingen Fil Vald",
        description: "Välj en bildfil att ladda upp.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Convert file to data URI to store in Appwrite prefs (simple, but not ideal)
    // In a production app, upload to Appwrite Storage and store the File ID instead.
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageDataUri = reader.result as string;
      // Check data URI length if Appwrite prefs have size limits (e.g., 64KB)
       if (imageDataUri.length > 60000) { // Rough check for ~64KB limit
            toast({
                title: "Bild för stor för lagring",
                description: "Bilden är för stor efter konvertering. Försök med en mindre bildfil eller en bild med lägre upplösning.",
                variant: "destructive",
            });
           setIsSubmitting(false);
           return;
       }

      const result = await updateProfilePicture(imageDataUri);
      setIsSubmitting(false);

      if (result.success) {
        toast({
          title: "Profilbild Uppdaterad",
          description: "Din nya profilbild har sparats.",
        });
        setSelectedFile(null); // Clear selection after successful upload
        // Clear the file input visually
        const fileInput = document.getElementById('avatarFile') as HTMLInputElement | null;
        if (fileInput) fileInput.value = "";
        // Preview URL is updated by the useEffect watching currentUserAvatarUrl
      } else {
        toast({
          title: "Fel Vid Uppdatering",
          description: "Kunde inte uppdatera profilbilden. Kontrollera filstorleken eller försök igen.",
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
        toast({
          title: "Fel Vid Filläsning",
          description: "Kunde inte läsa bildfilen.",
          variant: "destructive",
        });
        setIsSubmitting(false);
    };
    reader.readAsDataURL(selectedFile);
  };

  // Determine the final source for the AvatarImage
  // Use previewUrl if a file is selected, otherwise use currentUserAvatarUrl
  const avatarSrc = selectedFile ? previewUrl : currentUserAvatarUrl;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center space-y-4">
         {/* Use avatarSrc which prioritizes the preview */}
        <Avatar className="h-32 w-32 border-2 border-primary shadow-md">
           <AvatarImage src={avatarSrc || undefined} alt="Nuvarande profilbild" />
          <AvatarFallback className="text-4xl">{userInitial}</AvatarFallback>
        </Avatar>

        <div className="w-full max-w-xs">
            <Label htmlFor="avatarFile" className="sr-only">Välj profilbild</Label>
            <div className={cn("flex items-center justify-center w-full px-3 py-2 text-sm border border-input rounded-md", selectedFile ? "border-primary" : "")}>
                <label htmlFor="avatarFile" className="flex flex-col items-center justify-center w-full h-24 border-2 border-border border-dashed rounded-lg cursor-pointer bg-secondary/50 hover:bg-secondary/80">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <ImageUp className={cn("w-8 h-8 mb-2", selectedFile ? "text-primary" : "text-muted-foreground" )} />
                        {selectedFile ? (
                            <>
                                <p className="text-sm text-primary text-center break-all px-2"><span className="font-semibold">{selectedFile.name}</span></p>
                                <p className="text-xs text-muted-foreground">Klicka för att byta fil</p>
                            </>
                        ) : (
                            <>
                                <p className="mb-1 text-sm text-muted-foreground"><span className="font-semibold">Klicka för att ladda upp</span></p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF (MAX. 2MB)</p>
                            </>
                        )}
                    </div>
                    <Input
                        id="avatarFile"
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/gif"
                        disabled={isSubmitting}
                    />
                </label>
            </div>
        </div>

      </div>
      <Button type="submit" disabled={isSubmitting || !selectedFile} className="w-full sm:w-auto">
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Spara Profilbild
      </Button>
    </form>
  );
}
