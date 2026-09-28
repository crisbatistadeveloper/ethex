export default function CrmLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-40 animate-pulse rounded bg-[#efe9e0]" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-[#e4e0d9] bg-[#efe9e0]"
          />
        ))}
      </div>
      <p className="text-sm text-[#5b6472]">Carregando CRM…</p>
    </div>
  );
}
