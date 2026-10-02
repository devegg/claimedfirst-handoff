import { GUIDE, type GuideId } from "@/lib/guide";

/** Small "?" mark that links to the matching section of the guide (same tab unless newTab, for use inside dialogs). */
export default function HelpTip({ id, newTab = false }: { id: GuideId; newTab?: boolean }) {
  return (
    <a
      href={`/guide#${id}`}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      aria-label={`What is ${GUIDE[id].title.toLowerCase()}?`}
      className="help-tip"
    >
      ?
      {newTab && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
