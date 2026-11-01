"use client";

import { useEffect, useRef, useState } from "react";

const maxBytes = 4 * 1024 * 1024;

export function ProcessPhotoInput() {
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const video = videoInput.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setError("No se pudo mostrar la vista previa de la cámara."));
    return () => { video.srcObject = null; };
  }, [stream]);

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function setFile(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : null);
    if (!fileInput.current) return;
    const transfer = new DataTransfer();
    if (file) transfer.items.add(file);
    fileInput.current.files = transfer.files;
  }

  async function openCamera() {
    setError("");
    if (!window.isSecureContext) return setError("La cámara requiere HTTPS (o localhost en desarrollo).");
    if (!navigator.mediaDevices?.getUserMedia) return setError("Este navegador no permite abrir la cámara. Elegí la foto desde archivos.");
    setStarting(true);
    try {
      setStream(await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      }));
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(name === "NotAllowedError" ? "No se concedió permiso para usar la cámara. Habilitalo en el navegador y reintentá."
        : name === "NotFoundError" ? "No se encontró una cámara en este dispositivo."
        : name === "NotReadableError" ? "La cámara está ocupada por otra aplicación."
        : "No se pudo abrir la cámara.");
    } finally {
      setStarting(false);
    }
  }

  function closeCamera() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }

  async function capture() {
    const video = videoInput.current;
    if (!video?.videoWidth) return setError("La cámara todavía no está lista. Esperá un segundo y reintentá.");
    const scale = Math.min(1, 1920 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size > maxBytes) return setError("No se pudo capturar la foto o es demasiado pesada. Reintentá.");
    setFile(new File([blob], `proceso-${Date.now()}.jpg`, { type: "image/jpeg" }));
    setError("");
    closeCamera();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!stream ? (
          <button type="button" onClick={openCamera} disabled={starting} className="min-h-14 rounded-xl bg-forest px-6 text-base font-bold text-white hover:bg-[#125840] disabled:opacity-60">{starting ? "Abriendo cámara…" : preview ? "Sacar otra foto" : "Abrir cámara"}</button>
        ) : null}
        <label className="inline-flex min-h-14 cursor-pointer items-center rounded-xl border border-[#cddbcf] px-6 text-base font-bold text-forest hover:bg-[#f2f7f1]">
          Elegir desde archivos
          <input
            ref={fileInput}
            name="foto"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            required
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              if (file && file.size > maxBytes) { setError("La foto supera los 4 MB."); event.target.value = ""; return; }
              setError("");
              if (preview) URL.revokeObjectURL(preview);
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-[#f1d3cd] bg-[#fff7f5] px-4 py-3 text-sm text-[#853321]">{error}</p> : null}
      {stream ? (
        <div className="space-y-3 rounded-xl border border-[#e2e7e1] bg-[#fafbf9] p-3">
          <video ref={videoInput} autoPlay playsInline muted aria-label="Vista previa en vivo de la cámara" className="max-h-[55vh] w-full rounded-lg bg-black object-contain" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={capture} className="min-h-14 flex-1 rounded-xl bg-forest px-6 text-base font-bold text-white hover:bg-[#125840]">Sacar foto</button>
            <button type="button" onClick={closeCamera} className="min-h-14 rounded-xl border border-[#cddbcf] px-6 text-base font-bold text-forest hover:bg-[#f2f7f1]">Cancelar</button>
          </div>
        </div>
      ) : null}
      {preview ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Foto lista para guardar" className="max-h-64 rounded-xl border border-[#e2e7e1] object-contain" />
          <p className="mt-1 text-xs text-[#748079]">Foto lista. Completá el detalle y guardá.</p>
        </div>
      ) : null}
    </div>
  );
}
