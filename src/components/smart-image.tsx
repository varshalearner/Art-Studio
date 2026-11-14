"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
}

/**
 * Renders uploads (data: URLs in demo mode) with a plain <img>, and
 * static/remote files through next/image optimisation.
 */
export function SmartImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
  sizes,
  priority,
}: SmartImageProps) {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={cn(fill && "absolute inset-0 h-full w-full", className)}
        style={!fill && width ? { width, height } : undefined}
      />
    );
  }
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
        className={className}
        priority={priority}
        unoptimized={src.endsWith(".svg")}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 1000}
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized={src.endsWith(".svg")}
    />
  );
}
