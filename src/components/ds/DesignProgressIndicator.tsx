import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

export type ProgressState = "current" | "completed" | "disabled" | "error";

export interface ProgressStep {
  title: string;
  caption?: string;
  state: ProgressState;
  suffix?: React.ReactNode;
}

export interface DesignProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
  orientation?: "horizontal" | "vertical";
  size?: "default" | "small";
}

const DesignProgressIndicator: React.FC<DesignProgressIndicatorProps> = ({
  steps,
  className,
  orientation = "horizontal",
  size = "default",
}) => {
  const isHorizontal = orientation === "horizontal";
  const isSmall = size === "small";

  const iconContainerSize = isSmall ? 12 : 24;
  const iconBorderWidth = isSmall ? 2 : 1.5;

  if (isHorizontal) {
    return (
      <div className={cn("flex flex-col", className)}>
        {/* Icons + lines row */}
        <div className="flex items-center">
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <React.Fragment key={i}>
                <StepIcon
                  index={i}
                  state={step.state}
                  size={iconContainerSize}
                  borderWidth={iconBorderWidth}
                  isSmall={isSmall}
                />
                {!isLast && (
                  <div className="flex-1 min-w-[8px]" style={{ height: 2 }}>
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage:
                          step.state === "completed"
                            ? "none"
                            : `repeating-linear-gradient(to right, var(--line-bubble-color, #B6BEBF) 0, var(--line-bubble-color, #B6BEBF) 3px, transparent 3px, transparent 7px)`,
                        backgroundColor:
                          step.state === "completed" ? "var(--primary)" : "transparent",
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        {/* Labels row */}
        <div className="flex" style={{ marginTop: 4 }}>
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            return (
              <React.Fragment key={i}>
                <div
                  className="flex flex-col"
                  style={{
                    width: iconContainerSize,
                    maxWidth: isSmall ? 84 : 188,
                    flexShrink: 0,
                  }}
                >
                  <span
                    className={cn(
                      step.state === "disabled" && "opacity-[0.64]"
                    )}
                    style={{
                      fontSize: isSmall ? 14 : 16,
                      lineHeight: isSmall ? "18px" : "22px",
                      fontWeight: step.state === "current" && !isSmall ? 500 : 375,
                      color: "var(--text-primary)",
                    }}
                  >
                    {step.title}
                  </span>
                  {step.caption && (
                    <span
                      className="text-note"
                      style={{ fontSize: 14, lineHeight: "18px", fontWeight: 375 }}
                    >
                      {step.caption}
                    </span>
                  )}
                </div>
                {!isLast && <div className="flex-1 min-w-[8px]" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;

        // Vertical layout
        return (
          <React.Fragment key={i}>
            <div className="flex items-start gap-2">
              {/* Icon + line column */}
              <div className="flex flex-col items-center" style={{ width: iconContainerSize }}>
                <StepIcon
                  index={i}
                  state={step.state}
                  size={iconContainerSize}
                  borderWidth={iconBorderWidth}
                  isSmall={isSmall}
                />
                {!isLast && (
                  <div
                    className="flex-1 min-h-[8px]"
                    style={{
                      width: 2,
                      marginTop: 0,
                      marginBottom: 0,
                      backgroundImage:
                        step.state === "completed"
                          ? "none"
                          : `repeating-linear-gradient(to bottom, var(--line-bubble-color, #B6BEBF) 0, var(--line-bubble-color, #B6BEBF) 3px, transparent 3px, transparent 7px)`,
                      backgroundColor:
                        step.state === "completed" ? "var(--primary)" : "transparent",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn("flex-1 flex items-start justify-between", !isLast && "pb-4")}>
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span
                    className={cn(
                      step.state === "disabled" && "opacity-[0.64]"
                    )}
                    style={{
                      fontSize: isSmall ? 14 : 16,
                      lineHeight: isSmall ? "18px" : "22px",
                      fontWeight: step.state === "current" && !isSmall ? 500 : 375,
                      color: "var(--text-primary)",
                    }}
                  >
                    {step.title}
                  </span>
                  {step.caption && (
                    <span
                      className="text-note"
                      style={{ fontSize: 14, lineHeight: "18px", fontWeight: 375 }}
                    >
                      {step.caption}
                    </span>
                  )}
                </div>
                {step.suffix && (
                  <div className="flex-shrink-0 ml-2">{step.suffix}</div>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

interface StepIconProps {
  index: number;
  state: ProgressState;
  size: number;
  borderWidth: number;
  isSmall: boolean;
}

const StepIcon: React.FC<StepIconProps> = ({ index, state, size, borderWidth, isSmall }) => {
  const iconSize = isSmall ? 10 : 20;

  if (state === "completed") {
    return (
      <div
        className="rounded-full flex items-center justify-center border-primary text-primary"
        style={{
          width: size,
          height: size,
          borderWidth,
          borderStyle: "solid",
          borderColor: "var(--primary)",
        }}
      >
        <Check style={{ width: iconSize * 0.8, height: iconSize * 0.8 }} strokeWidth={2.5} />
      </div>
    );
  }

  if (state === "current") {
    return (
      <div
        className="rounded-full flex items-center justify-center bg-primary text-white"
        style={{ width: size, height: size }}
      >
        <span
          style={{
            fontSize: isSmall ? 8 : 14,
            fontWeight: 500,
            lineHeight: "18px",
          }}
        >
          {index + 1}
        </span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div
        className="rounded-full flex items-center justify-center text-btn-error"
        style={{
          width: size,
          height: size,
          borderWidth,
          borderStyle: "solid",
          borderColor: "var(--error, #D04555)",
        }}
      >
        <AlertCircle style={{ width: iconSize * 0.8, height: iconSize * 0.8 }} />
      </div>
    );
  }

  // disabled
  return (
    <div
      className="rounded-full flex items-center justify-center opacity-[0.64]"
      style={{
        width: size,
        height: size,
        borderWidth,
        borderStyle: "solid",
        borderColor: "#5A6566",
        color: "#5A6566",
      }}
    >
      <span
        style={{
          fontSize: isSmall ? 8 : 14,
          fontWeight: 500,
          lineHeight: "18px",
        }}
      >
        {index + 1}
      </span>
    </div>
  );
};

DesignProgressIndicator.displayName = "DesignProgressIndicator";

export { DesignProgressIndicator };
