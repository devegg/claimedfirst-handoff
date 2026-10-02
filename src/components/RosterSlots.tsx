export function RosterSlots({ used, unlocked }: { used: number; unlocked: number }) {
  return (
    <div className="slots">
      {Array.from({ length: Math.min(50, Math.max(0, unlocked)) }, (_, i) => {
        const state = i < used ? "filled" : "open";
        return (
          <div key={i} data-slot={i + 1} data-state={state} className="slot" />
        );
      })}
    </div>
  );
}
