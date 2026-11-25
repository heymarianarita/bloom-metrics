import { DesignCell } from "@/components/ds/DesignCell";
import { isLikelyBloomStudy, type DxStudy } from "@/lib/getdxSync";

const StudyGroup = ({
  title,
  studies,
  picked,
  onToggle,
}: {
  title: string;
  studies: DxStudy[];
  picked: Set<string>;
  onToggle: (id: string, on: boolean) => void;
}) =>
  studies.length ? (
    <div role="group" aria-label={title}>
      <p className="px-4 pt-3 pb-1 text-sm font-medium text-muted-foreground">{title}</p>
      {studies.map((s) => (
        <DesignCell
          key={s.id}
          styling="tight"
          showDivider
          controlType="checkbox"
          checked={picked.has(s.id)}
          onCheckedChange={(on) => onToggle(s.id, on)}
          title={<span className="block break-words">{s.name}</span>}
          bodyText={[
            `Created ${s.createdAt}`,
            `${s.responses} ${s.responses === 1 ? "response" : "responses"}`,
            s.lastResponse && `last on ${s.lastResponse}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ))}
    </div>
  ) : null;

/** GetDX studies to tick, Bloom and design system surveys first. Studies nobody has answered have nothing to add. */
const GetDXStudyList = ({
  studies,
  picked,
  onToggle,
}: {
  studies: DxStudy[];
  picked: Set<string>;
  onToggle: (id: string, on: boolean) => void;
}) => {
  const answered = studies.filter((s) => s.responses > 0 || picked.has(s.id));
  if (!answered.length) return <p className="text-sm text-muted-foreground">No GetDX study has responses yet.</p>;
  return (
    <div className="max-h-96 overflow-y-auto rounded-md border border-border">
      <StudyGroup
        title="Bloom and design system surveys"
        studies={answered.filter((s) => isLikelyBloomStudy(s.name))}
        picked={picked}
        onToggle={onToggle}
      />
      <StudyGroup title="Other studies" studies={answered.filter((s) => !isLikelyBloomStudy(s.name))} picked={picked} onToggle={onToggle} />
    </div>
  );
};

export default GetDXStudyList;
