"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const maxPhotos = 5;
const maxPhotoSize = 4 * 1024 * 1024;
const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ReceptionPhotoInput() {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const submittedInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLVideoElement>(null);
  const photosRef = useRef<File[]>([]);

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));
    setPhotoUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    const video = videoInput.current;
    if (!video || !cameraStream) return;
    video.srcObject = cameraStream;
    void video.play().catch(() => {
      setPhotoError("No se pudo iniciar la vista previa de la cámara. Revisá los permisos del navegador.");
    });
    return () => {
      video.srcObject = null;
    };
  }, [cameraStream]);

  useEffect(() => () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
  }, [cameraStream]);

  function syncSubmittedPhotos(nextPhotos: File[]) {
    const input = submittedInput.current;
    if (!input) return;
    const transfer = new DataTransfer();
    nextPhotos.forEach((photo) => transfer.items.add(photo));
    input.files = transfer.files;
  }

  function addPhotos(chosenPhotos: File[]) {
    const invalidPhoto = chosenPhotos.find((photo) => !allowedPhotoTypes.has(photo.type) || photo.size > maxPhotoSize);
    const availableSlots = maxPhotos - photosRef.current.length;
    const acceptedPhotos = chosenPhotos.filter((photo) => allowedPhotoTypes.has(photo.type) && photo.size <= maxPhotoSize).slice(0, availableSlots);
    const nextPhotos = [...photosRef.current, ...acceptedPhotos];

    photosRef.current = nextPhotos;
    syncSubmittedPhotos(nextPhotos);
    setPhotos(nextPhotos);
    setPhotoError(
      invalidPhoto
        ? "Solo se admiten fotos JPG, PNG o WebP de hasta 4 MB."
        : acceptedPhotos.length < chosenPhotos.length
          ? `Podés adjuntar hasta ${maxPhotos} fotos en total.`
          : "",
    );
  }

  function addPhotosFromInput(input: HTMLInputElement | null) {
    if (!input) return;
    const chosenPhotos = Array.from(input.files ?? []);
    input.value = "";
    addPhotos(chosenPhotos);
  }

  async function openCamera() {
    setPhotoError("");
    if (!window.isSecureContext) {
      setPhotoError("El acceso a la cámara requiere una conexión segura HTTPS (o localhost en desarrollo).");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhotoError("Este navegador no permite abrir la cámara desde la página. Actualizalo o elegí fotos desde archivos.");
      return;
    }

    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setPhotoError("No se concedió permiso para usar la cámara. Habilitalo en los permisos del navegador y volvé a intentar.");
      } else if (error instanceof DOMException && (error.name === "NotFoundError" || error.name === "DevicesNotFoundError")) {
        setPhotoError("No se encontró una cámara disponible en este dispositivo. Podés elegir fotos desde archivos.");
      } else if (error instanceof DOMException && (error.name === "NotReadableError" || error.name === "TrackStartError")) {
        setPhotoError("La cámara está ocupada o no se puede iniciar. Cerrá otras aplicaciones que la estén usando y reintentá.");
      } else {
        setPhotoError("No se pudo abrir la cámara. Revisá sus permisos o elegí fotos desde archivos.");
      }
    } finally {
      setCameraStarting(false);
    }
  }

  function closeCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  }

  async function capturePhoto() {
    const video = videoInput.current;
    if (!video || !video.videoWidth || !video.videoHeight || photosRef.current.length >= maxPhotos) {
      setPhotoError(photosRef.current.length >= maxPhotos ? `Ya alcanzaste el máximo de ${maxPhotos} fotos.` : "Esperá a que la cámara esté lista y volvé a tomar la foto.");
      return;
    }

    setCapturing(true);
    setPhotoError("");
    const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCapturing(false);
      setPhotoError("No se pudo preparar la imagen. Volvé a intentar.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    setCapturing(false);
    if (!blob) {
      setPhotoError("No se pudo capturar la imagen. Volvé a intentar.");
      return;
    }
    addPhotos([new File([blob], `recepcion-${Date.now()}.jpg`, { type: "image/jpeg" })]);
  }

  function removePhoto(index: number) {
    const nextPhotos = photosRef.current.filter((_, photoIndex) => photoIndex !== index);
    photosRef.current = nextPhotos;
    syncSubmittedPhotos(nextPhotos);
    setPhotos(nextPhotos);
    setPhotoError("");
  }

  return (
    <div className="space-y-3">
      {cameraStream ? (
        <div className="space-y-3 rounded-xl border border-[#dce7da] bg-[#1b1b1b] p-3">
          <video ref={videoInput} autoPlay playsInline muted aria-label="Vista previa en vivo de la cámara" className="max-h-[55vh] w-full rounded-lg bg-black object-contain" />
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={capturePhoto} disabled={capturing || photos.length >= maxPhotos} className="min-h-14 rounded-xl bg-forest px-4 text-base font-bold text-white hover:bg-[#125840] disabled:opacity-50">
              {capturing ? "Capturando..." : "Tomar foto"}
            </button>
            <button type="button" onClick={closeCamera} className="min-h-14 rounded-xl border border-white/30 px-4 text-base font-bold text-white hover:bg-white/10">
              Cerrar cámara
            </button>
          </div>
          <p className="text-xs text-white/80">Si el navegador lo permite, se usa la cámara trasera. El permiso se solicita al abrir la cámara.</p>
        </div>
      ) : (
        <button type="button" onClick={openCamera} disabled={cameraStarting} className="flex min-h-16 w-full items-center justify-center rounded-xl bg-forest px-5 py-3 text-center text-base font-bold text-white shadow-sm hover:bg-[#125840] active:scale-[0.99] disabled:opacity-60">
          {cameraStarting ? "Solicitando acceso a la cámara..." : "Abrir cámara del dispositivo"}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="reception-file-input" className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-[#cddbcf] bg-white px-4 text-sm font-bold text-forest hover:bg-[#f2f7f1]">
          Elegir fotos desde archivos
        </label>
        <span className="text-sm text-[#748079]">{photos.length} de {maxPhotos} fotos</span>
      </div>
      <input
        id="reception-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(event) => addPhotosFromInput(event.currentTarget)}
        className="sr-only"
      />
      <input ref={submittedInput} type="file" name="fotos" multiple tabIndex={-1} aria-hidden="true" className="sr-only" />
      {photoError ? <p role="alert" className="text-sm font-medium text-[#853321]">{photoError}</p> : null}
      {photos.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {photos.map((photo, index) => (
            <li key={`${photo.name}-${photo.lastModified}-${index}`} className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white">
              {photoUrls[index] ? <Image src={photoUrls[index]} alt={`Vista previa de la foto ${index + 1}`} width={320} height={220} unoptimized className="h-28 w-full object-cover" /> : null}
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="min-w-0 truncate text-xs text-[#59665e]">{photo.name}</span>
                <button type="button" onClick={() => removePhoto(index)} aria-label={`Quitar foto ${index + 1}`} className="min-h-9 shrink-0 rounded-lg px-2 text-sm font-bold text-[#853321] hover:bg-[#fff1ed]">Quitar</button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
