import { DesignInputSelect } from "@/components/ds/DesignInputSelect";
import { groupOptions, useMetricGroups } from "@/hooks/useMetricGroups";

/** Points a dynamic source at the metric group or subgroup whose page shows it. */
const MetricGroupPicker = ({
  value,
  onChange,
  label = "Shown in",
  helperText,
}: {
  value: string | null | undefined;
  onChange: (groupId: string) => void;
  label?: string;
  helperText?: string;
}) => {
  const groups = useMetricGroups();
  return (
    <DesignInputSelect
      label={label}
      size="medium"
      placeholder="Pick a group or subgroup"
      helperText={helperText}
      value={value ?? ""}
      onChange={onChange}
      options={groupOptions(groups.data ?? [])}
    />
  );
};

export default MetricGroupPicker;
