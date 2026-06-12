'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateAvatarUrl } from '@/app/actions';
import { Camera, Spinner } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { showToast } from './Toast';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  name: string;
  size?: number;
}

const bgColors = [
  'bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500',
];

function resizeImage(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
    };
    img.src = objectUrl;
  });
}

export default function AvatarUpload({ userId, currentAvatarUrl, name, size = 80 }: AvatarUploadProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const supabase = createClient();

  const colorClass = bgColors[name.charCodeAt(0) % bgColors.length];
  const initial = name.substring(0, 1).toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem válida.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const resized = await resizeImage(file, 256);
      const path = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, resized, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const result = await updateAvatarUrl(urlWithBust);
      if (!result.success) throw new Error(result.error);

      setPreviewUrl(urlWithBust);
      showToast('Foto atualizada!', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar foto.', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <button
      type="button"
      onClick={() => !isUploading && fileInputRef.current?.click()}
      className="relative group shrink-0 cursor-pointer"
      title="Alterar foto de perfil"
    >
      <div
        style={{ width: size, height: size }}
        className={`rounded-full overflow-hidden flex items-center justify-center font-black text-white select-none border-2 border-border-custom group-hover:border-accent-custom transition-colors ${!previewUrl ? colorClass : ''}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span style={{ fontSize: size * 0.38 }}>{initial}</span>
        )}
      </div>

      <div className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {isUploading
          ? <Spinner size={size * 0.3} className="animate-spin text-white" />
          : <Camera size={size * 0.3} weight="bold" className="text-white" />
        }
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </button>
  );
}
