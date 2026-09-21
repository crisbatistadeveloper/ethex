// Área em m²: aceita até 2 casas decimais, usa vírgula na digitação e ponto de milhar na exibição.
export function sanitizeArea(input: string): string {
  const [inteiro, ...resto] = input.replace(/[^\d,]/g, "").split(",");
  const parteInteira = inteiro.replace(/^0+(?=\d)/, "");
  if (resto.length === 0) return parteInteira;
  return `${parteInteira === "" ? "0" : parteInteira},${resto.join("").slice(0, 2)}`;
}

export function formatArea(texto: string): string {
  const [inteiro, decimal] = texto.split(",");
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal === undefined ? comMilhar : `${comMilhar},${decimal}`;
}
