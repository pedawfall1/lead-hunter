export default function Kpi({
  rotulo,
  valor,
  sufixo,
  detalhe,
  cor,
  destaque,
}: {
  rotulo: string;
  valor: string | number;
  sufixo?: string;
  detalhe?: string;
  cor?: string;
  /** número herói: maior, para o dado que lidera a tela */
  destaque?: boolean;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {rotulo}
      </p>
      <p
        className={`mt-2 font-semibold tabular-nums leading-none text-white ${
          destaque ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"
        }`}
        style={cor ? { color: cor } : undefined}
      >
        {valor}
        {sufixo && (
          <span className="ml-0.5 text-base font-medium opacity-70">{sufixo}</span>
        )}
      </p>
      {detalhe && <p className="mt-1.5 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}
