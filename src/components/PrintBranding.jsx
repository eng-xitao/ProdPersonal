export default function PrintBranding({ title = "Documento" }) {
  return (
    <>
      <div className="pp-print-header" aria-hidden="true">
        <img src="/brand/prodpersonal-logo.svg" alt="ProdPersonal" />
        <div>
          <strong>{title}</strong>
          <span>Gestão de Pessoas • Ecossistema ProdOS</span>
        </div>
      </div>
      <div className="pp-print-footer" aria-hidden="true">
        <img src="/brand/prodpersonal-logo.svg" alt="ProdPersonal" />
        <span>ProdPersonal • Gestão de Pessoas • Documento gerado pelo sistema</span>
        <span className="pp-print-page">Página</span>
      </div>
    </>
  );
}
