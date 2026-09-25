import * as React from "react";
import { FigmaLogo, ArrowClockwise } from "@phosphor-icons/react";
import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { DesignButton } from "@/components/ds/DesignButton";
import { setStoredFigmaFileKey, useFigmaLibraries } from "@/hooks/useFigmaAnalytics";

interface FigmaSourceBarProps {
  fileKey: string;
  onFileKeyChange: (key: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const FigmaSourceBar = ({
  fileKey,
  onFileKeyChange,
  onRefresh,
  isLoading,
}: FigmaSourceBarProps) => {
  const { data: libraries } = useFigmaLibraries();
  const options = (libraries ?? []).map((library) => ({
    value: library.key,
    label: library.name,
  }));


  const select = (key: string) => {
    setStoredFigmaFileKey(key);
    onFileKeyChange(key);
  };

  React.useEffect(() => {
    if (libraries?.length && !libraries.some((l) => l.key === fileKey)) {
      select(libraries[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraries, fileKey]);



  return (
    <div className="flex items-center gap-2">
      <DesignInputSelect
        className="w-[240px]"
        size="small"
        placeholder="Select a library"
        options={options}
        value={fileKey}
        icon={<FigmaLogo size={16} />}
        onChange={select}
      />
      {onRefresh && fileKey && (
        <DesignButton
          variant="outlined"
          theme="muted"
          size="small"
          className="w-8 px-0"
          icon={<ArrowClockwise size={16} />}
          isLoading={isLoading}
          onClick={onRefresh}
          aria-label="Refresh"
          title="Refresh"
        />
      )}
    </div>
  );
};

export default FigmaSourceBar;
