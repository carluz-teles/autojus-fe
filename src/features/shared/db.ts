/** Data ISO "YYYY-MM-DD" do dia CORRENTE no fuso local do navegador.
 *  Timezone-safe: usa componentes locais (getFullYear/getMonth/getDate) em
 *  vez de toISOString(), que retornaria a data UTC — em BR (UTC-3) isso
 *  pode voltar o dia anterior perto da meia-noite. */
export function hojeISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
