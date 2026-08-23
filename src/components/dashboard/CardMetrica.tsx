export default function CardMetrica({
  titulo,
  valor,
  detalhe,
  destaque,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  destaque?: string;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {titulo}
      </p>
      <p
        className="mt-2 text-2xl font-semibold tabular-nums text-white sm:text-3xl"
        style={destaque ? { color: destaque } : undefined}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-1 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}
