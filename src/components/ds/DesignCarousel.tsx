import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DesignCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  slides: React.ReactNode[];
  isInfinite?: boolean;
  hideNavigation?: boolean;
  arrows?: "inside" | "outside" | "hidden";
  styling?: "floating";
  index?: number;
  onSlideInteract?: (index: number) => void;
}

const DesignCarousel = React.forwardRef<HTMLDivElement, DesignCarouselProps>(
  (
    {
      className,
      slides,
      isInfinite = false,
      hideNavigation = false,
      arrows = "inside",
      styling,
      index: controlledIndex,
      onSlideInteract,
      ...props
    },
    ref
  ) => {
    const [internalIndex, setInternalIndex] = React.useState(0);
    const current = controlledIndex ?? internalIndex;

    const goTo = (i: number) => {
      let next = i;
      if (isInfinite) {
        next = ((i % slides.length) + slides.length) % slides.length;
      } else {
        next = Math.max(0, Math.min(i, slides.length - 1));
      }
      setInternalIndex(next);
      onSlideInteract?.(next);
    };

    const canPrev = isInfinite || current > 0;
    const canNext = isInfinite || current < slides.length - 1;

    const showArrows = arrows !== "hidden" && slides.length > 1;

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full",
          arrows === "outside" && "px-10",
          className
        )}
        {...props}
      >
        {/* Slide area */}
        <div className="relative overflow-hidden rounded-[var(--radius)]">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <div key={i} className="w-full flex-shrink-0">
                {slide}
              </div>
            ))}
          </div>

          {/* Inside arrows */}
          {showArrows && arrows === "inside" && (
            <>
              {canPrev && (
                <button
                  onClick={() => goTo(current - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center text-foreground hover:bg-background transition-colors"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {canNext && (
                <button
                  onClick={() => goTo(current + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center text-foreground hover:bg-background transition-colors"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Floating dot nav */}
          {styling === "floating" && !hideNavigation && slides.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === current
                      ? "bg-[var(--primary)]"
                      : "bg-background/60"
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Outside arrows */}
        {showArrows && arrows === "outside" && (
          <>
            {canPrev && (
              <button
                onClick={() => goTo(current - 1)}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-[var(--border)] bg-background flex items-center justify-center text-foreground hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {canNext && (
              <button
                onClick={() => goTo(current + 1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-[var(--border)] bg-background flex items-center justify-center text-foreground hover:bg-[var(--surface-hover)] transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}

        {/* Default dot nav (non-floating) */}
        {styling !== "floating" && !hideNavigation && slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i === current
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--greyscale-4)]"
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

DesignCarousel.displayName = "DesignCarousel";

export { DesignCarousel };
