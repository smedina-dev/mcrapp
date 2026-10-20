"use client";

import Image from "next/image";
import { useState } from "react";

type BrandLogoProps = {
  width: number;
  height: number;
  className: string;
  priority?: boolean;
};

export function BrandLogo({ width, height, className, priority = false }: BrandLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <span role="img" aria-label="Marcovecchio Bikes" className="inline-flex shrink-0 items-center">
      {imageFailed ? (
        <span className="text-sm font-bold uppercase tracking-[0.12em]">Marcovecchio Bikes</span>
      ) : (
        <Image
          src="/brand/marcovecchio-cbco.webp"
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          priority={priority}
          onError={() => setImageFailed(true)}
          className={className}
        />
      )}
    </span>
  );
}
