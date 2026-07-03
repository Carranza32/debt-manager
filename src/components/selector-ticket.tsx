'use client';

import React, { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Sparkles } from 'lucide-react';

interface SelectorTicketProps {
  onSuccess: (data: any, imageUrl: string) => void;
}

export default function SelectorTicket({ onSuccess }: SelectorTicketProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type is image
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Subiendo imagen y procesando OCR...');

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('No se pudo verificar la sesión del usuario');
      }

      // 2. Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tickets')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Error de almacenamiento: ${uploadError.message}`);
      }

      // Get public URL or signed URL. For simplicity, if bucket is private, we can get public URL or signed URL.
      // Wait, let's get the public URL (since we can read it later or if bucket is protected, we can sign it).
      // Let's get the public URL:
      const { data: { publicUrl } } = supabase.storage
        .from('tickets')
        .getPublicUrl(filePath);

      // 3. Convert file to Base64 to send to Gemini API
      const base64 = await convertToBase64(file);

      // 4. Send Base64 to Next.js API Route for OCR
      const response = await fetch('/api/ocr/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar el ticket con Gemini');
      }

      const ocrResult = await response.json();
      toast.success('Ticket escaneado correctamente ✨', { id: toastId });
      onSuccess(ocrResult, publicUrl);
    } catch (error: any) {
      console.error('OCR Processing Error:', error);
      toast.error(error.message || 'Ocurrió un error al escanear el ticket', { id: toastId });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={loading}
        className="hidden"
      />
      <Button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className="w-full bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-violet-400 font-semibold cursor-pointer shadow-md flex items-center justify-center gap-2 py-5"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
            Procesando con IA...
          </>
        ) : (
          <>
            <Camera className="h-5 w-5 text-violet-400" />
            <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" />
            Escanear Ticket de Compra
          </>
        )}
      </Button>
    </div>
  );
}
