
"use client";

import { useState, type ChangeEvent, type FormEvent, useEffect } from "react";
import { useMockAuth } from "@/hooks/useMockAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChangeAvatarForm() {
  const { currentUserAvatarUrl, updateProfilePicture, currentUserName, currentUserEmail } = useMockAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUserAvatarUrl);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userInitial = currentUserName ? currentUserName.charAt(0).toUpperCase() : (currentUserEmail ? currentUserEmail.charAt(0).toUpperCase() : 'A');

  useEffect(() => {
    setPreviewUrl(currentUserAvatarUrl);
  }, [currentUserAvatarUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
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
    // Convert file to data URI for mock storage
    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageDataUri = reader.result as string;
      const result = await updateProfilePicture(imageDataUri);
      setIsSubmitting(false);

      if (result.success) {
        toast({
          title: "Profilbild Uppdaterad",
          description: "Din nya profilbild har sparats.",
        });
        setSelectedFile(null); // Clear selection after successful upload
        const fileInput = document.getElementById('avatarFile') as HTMLInputElement | null;
        if (fileInput) fileInput.value = ""; 
      } else {
        toast({
          title: "Fel Vid Uppdatering",
          description: "Kunde inte uppdatera profilbilden. Försök igen.",
          variant: "destructive",
        });
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-32 w-32 border-2 border-primary shadow-md">
          <AvatarImage src={previewUrl || `https://picsum.photos/seed/${userInitial}/128/128`} alt="Nuvarande profilbild" data-ai-hint="avatar large"/>
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
                                <p className="text-sm text-primary"><span className="font-semibold">{selectedFile.name}</span></p>
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
                        accept="image/*" 
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
