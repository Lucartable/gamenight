"use client";

export function SaveQuestionButton({
  saving,
  notice,
  onSave,
}: {
  saving: boolean;
  notice: string | null;
  onSave: () => void;
}) {
  return (
    <section className="mb-3 rounded-[22px] border border-neon-cyan/25 bg-neon-cyan/10 p-3 text-white shadow-glow-cyan animate-reveal-in">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wider text-neon-cyan">Bibliothèque</div>
          <div className="truncate text-sm font-semibold text-white/60">Cette question te plaît ? Garde-la pour plus tard.</div>
        </div>
        <button type="button" disabled={saving} onClick={onSave} className="btn-secondary shrink-0 px-3 py-2 text-sm">
          {saving ? "..." : "+ Sauvegarder"}
        </button>
      </div>
      {notice && <p className="mt-2 text-sm font-black text-neon-green">{notice}</p>}
    </section>
  );
}
