"use client";

export function FinalReturnPanel({
  title = "Partie terminée",
  subtitle = "Retour au lobby dans un instant.",
  returnLeft,
  isHost = false,
  busy = false,
  onRestart,
}: {
  title?: string;
  subtitle?: string;
  returnLeft: number;
  isHost?: boolean;
  busy?: boolean;
  onRestart?: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <section className="card w-full p-7 animate-reveal-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-neon-cyan/30 bg-neon-cyan/10 text-4xl shadow-glow-cyan animate-floaty">
          ★
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-white/50">Fin de partie</div>
        <h1 className="mt-2 bg-gradient-to-r from-neon-yellow via-neon-pink to-neon-cyan bg-clip-text text-4xl font-black text-transparent">
          {title}
        </h1>
        <p className="mt-3 text-white/60">{subtitle}</p>
        <div className="mx-auto mt-5 w-fit rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
          <div className="text-4xl font-black tabular-nums">{returnLeft}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">retour lobby</div>
        </div>
        {isHost && onRestart && (
          <button type="button" disabled={busy} onClick={onRestart} className="btn-primary mt-6 w-full">
            Relancer une partie
          </button>
        )}
      </section>
    </main>
  );
}
