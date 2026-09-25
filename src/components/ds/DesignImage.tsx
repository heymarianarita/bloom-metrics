import * as React from "react";
import { cn } from "@/lib/utils";

const ratioMap: Record<string, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  "small-portrait": "aspect-[4/5]",
  landscape: "aspect-[16/9]",
  "small-landscape": "aspect-[4/3]",
};

export interface DesignImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt: string;
  ratio?: "square" | "portrait" | "small-portrait" | "landscape" | "small-landscape";
  scaling?: "contain" | "cover" | "fill" | "scale-down";
  styling?: "default" | "rounded" | "circle";
  label?: string;
  fallbackSrc?: string | null;
}

const DesignImage = React.forwardRef<HTMLDivElement, DesignImageProps>(
  ({ className, src, alt, ratio = "square", scaling = "cover", styling = "default", label, fallbackSrc, loading = "lazy", ...imgProps }, ref) => {
    const [imgSrc, setImgSrc] = React.useState(src);
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
      setImgSrc(src);
      setHasError(false);
    }, [src]);

    const handleError = () => {
      if (!hasError && fallbackSrc) {
        setImgSrc(fallbackSrc);
        setHasError(true);
      }
    };

    return (
      <div ref={ref} className={cn("relative overflow-hidden", className)}>
        <div
          className={cn(
            "overflow-hidden bg-[var(--image-placeholder)]",
            ratioMap[ratio],
            styling === "rounded" && "rounded-lg",
            styling === "circle" && "rounded-full"
          )}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={alt}
              loading={loading}
              onError={handleError}
              className={cn(
                "w-full h-full",
                scaling === "cover" && "object-cover",
                scaling === "contain" && "object-contain",
                scaling === "fill" && "object-fill",
                scaling === "scale-down" && "object-scale-down"
              )}
              {...imgProps}
            />
          ) : (
            <div className="w-full h-full bg-[var(--image-placeholder)]" />
          )}
        </div>
        {label && (
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        )}
      </div>
    );
  }
);

DesignImage.displayName = "DesignImage";

export { DesignImage };
