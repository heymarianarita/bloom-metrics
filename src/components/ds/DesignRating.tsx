import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesignRatingProps {
  value: number;
  max?: number;
  size?: "small" | "normal" | "large";
  interactive?: boolean;
  onSelect?: (value: number) => void;
  showRating?: boolean;
  reviewCount?: number;
  className?: string;
}

const sizeConfig = {
  small: { star: 12, spacing: 2, contentSpacing: 4, fontSize: "text-xs", lineHeight: "leading-4" },
  normal: { star: 16, spacing: 2, contentSpacing: 8, fontSize: "text-base", lineHeight: "leading-[22px]" },
  large: { star: 24, spacing: 8, contentSpacing: 8, fontSize: "text-base", lineHeight: "leading-[22px]" },
};

const StarIcon = ({ size, fillPercent }: { size: number; fillPercent: number }) => {
  const id = React.useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fillPercent}%`} stopColor="var(--rating-star)" />
          <stop offset={`${fillPercent}%`} stopColor="var(--rating-empty)" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
};

const DesignRating: React.FC<DesignRatingProps> = ({
  value,
  max = 5,
  size = "normal",
  interactive = false,
  onSelect,
  showRating = false,
  reviewCount,
  className,
}) => {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const displayValue = hovered ?? value;
  const config = sizeConfig[size];

  const formatRating = (v: number) => v.toFixed(1);

  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{ gap: config.contentSpacing }}
      role="img"
      aria-label={`Rating: ${value} out of ${max} stars`}
    >
      <div className="inline-flex" style={{ gap: config.spacing }}>
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1;
          const fillPercent = Math.min(100, Math.max(0, (displayValue - i) * 100));

          return interactive ? (
            <button
              key={i}
              type="button"
              className="p-0 border-0 bg-transparent cursor-pointer transition-transform duration-150 hover:scale-110"
              onClick={() => onSelect?.(starValue)}
              onMouseEnter={() => setHovered(starValue)}
              onMouseLeave={() => setHovered(null)}
              aria-label={`Rate ${starValue} star${starValue > 1 ? "s" : ""}`}
            >
              <StarIcon size={config.star} fillPercent={fillPercent} />
            </button>
          ) : (
            <span key={i} className="inline-flex">
              <StarIcon size={config.star} fillPercent={fillPercent} />
            </span>
          );
        })}
      </div>
      {(showRating || reviewCount !== undefined) && (
        <span className={cn(config.fontSize, config.lineHeight, "font-[375] text-rating-text")}>
          {showRating && formatRating(value)}
          {showRating && reviewCount !== undefined && " "}
          {reviewCount !== undefined && `(${reviewCount})`}
        </span>
      )}
    </div>
  );
};
DesignRating.displayName = "DesignRating";

export { DesignRating };
