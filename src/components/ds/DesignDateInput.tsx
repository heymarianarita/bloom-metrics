import * as React from "react";
import { CalendarBlank } from "@phosphor-icons/react";
import { DesignInputText, type DesignInputTextProps } from "@/components/ds/DesignInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toIsoDate } from "../../../server/shared/dates.ts";

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const dateOf = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : undefined);

export interface DesignDateInputProps
  extends Omit<DesignInputTextProps, "value" | "onChange" | "type" | "suffix" | "defaultValue"> {
  /** YYYY-MM-DD, or "" for no date. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * A date field that always reads and writes YYYY-MM-DD, whatever the browser's locale
 * (a native date input shows the computer's regional format, e.g. 23.11.2026).
 */
const DesignDateInput = ({ value, onChange, placeholder = "YYYY-MM-DD", onBlur, disabled, ...props }: DesignDateInputProps) => {
  const [text, setText] = React.useState(value);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setText(value), [value]);

  return (
    <DesignInputText
      {...props}
      disabled={disabled}
      inputMode="numeric"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (!next.trim()) onChange("");
        else {
          const iso = toIsoDate(next);
          if (iso) onChange(iso);
        }
      }}
      onBlur={(e) => {
        setText(value);
        onBlur?.(e);
      }}
      suffix={
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Pick a date"
              className="rounded-[4px] p-0.5 hover:bg-[rgba(21,25,26,0.06)] hover:text-foreground"
            >
              <CalendarBlank size={16} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              weekStartsOn={1}
              selected={dateOf(value)}
              defaultMonth={dateOf(value)}
              onSelect={(date) => {
                if (date) onChange(isoOf(date));
                setOpen(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      }
    />
  );
};

export { DesignDateInput };
