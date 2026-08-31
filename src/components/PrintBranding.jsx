export default function PrintBranding({ title = "Documento" }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm 14mm 20mm; }
          html, body { background: #fff !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .pp-print-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            border-bottom: 1px solid #dce7f2;
            padding-bottom: 7mm;
            margin-bottom: 7mm;
            color: #12233f;
            font-family: Arial, Helvetica, sans-serif;
          }
          .pp-print-header img { width: 145px; height: auto; object-fit: contain; }
          .pp-print-header div { margin-left: auto; text-align: right; }
          .pp-print-header strong { display: block; font-size: 10pt; }
          .pp-print-header span { display: block; margin-top: 2px; font-size: 7.5pt; color: #718096; }
          .pp-print-footer {
            display: flex !important;
            position: fixed;
            left: 0;
            right: 0;
            bottom: -13mm;
            height: 11mm;
            align-items: center;
            gap: 10px;
            border-top: 1px solid #dce7f2;
            padding-top: 3mm;
            color: #718096;
            font: 7pt Arial, Helvetica, sans-serif;
            background: #fff;
          }
          .pp-print-footer img { width: 75px; height: auto; max-height: 8mm; object-fit: contain; }
          .pp-print-footer span:nth-child(2) { flex: 1; }
          .pp-print-page::after { content: " " counter(page); }
          table { max-width: 100% !important; }
          tr, img, .card, section, article { page-break-inside: avoid; }
        }
        @media screen { .pp-print-header, .pp-print-footer { display: none; } }
      `}</style>
      <div className="pp-print-header" aria-hidden="true">
        <img src="/brand/prodpersonal-logo.svg" alt="ProdPersonal" />
        <div><strong>{title}</strong><span>Gestão de Pessoas • Ecossistema ProdOS</span></div>
      </div>
      <div className="pp-print-footer" aria-hidden="true">
        <img src="/brand/prodpersonal-logo.svg" alt="ProdPersonal" />
        <span>ProdPersonal • Gestão de Pessoas • Documento gerado pelo sistema</span>
        <span className="pp-print-page">Página</span>
      </div>
    </>
  );
}
