/* assets/export.js
   Lightweight exporters for AVN Comercial detail pages.
   - exportPDF(): triggers the browser print dialog (Save as PDF).
   - exportWord(rootSelector, filename): builds a .doc Blob (HTML wrapped)
     that Microsoft Word opens natively. Inlines key styles so the
     document looks reasonable in Word without our CSS variables.
*/
(function () {
  function exportPDF() {
    window.print();
  }

  // Map AVN CSS-variable token references to concrete hex values so Word
  // (which doesn't know our variables) renders things the right colour.
  const VAR_MAP = {
    '--accent':       '#3D4392',
    '--accent-soft':  '#F4F5FB',
    '--accent-100':   '#EBECF7',
    '--accent-300':   '#B9BCE2',
    '--accent-600':   '#5258AB',
    '--accent-900':   '#1F2255',
    '--avn-blue':     '#3D4392',
    '--avn-blue-900': '#1F2255',
    '--avn-orange':   '#F28B3A',
    '--avn-cyan':     '#09A9E2',
    '--avn-olive':    '#ACA77B',
    '--fg-1':         '#1F2255',
    '--fg-2':         '#44464A',
    '--fg-3':         '#797C7F',
    '--border-1':     '#E7E8E9',
    '--bg-2':         '#F8F8F9',
  };

  function resolveVars(cssText) {
    return cssText.replace(/var\(\s*(--[a-z0-9-]+)\s*(?:,[^)]+)?\)/gi, (m, name) => VAR_MAP[name] || m);
  }

  function exportWord(rootSelector, filename) {
    const node = document.querySelector(rootSelector);
    if (!node) { alert('Conteúdo não encontrado.'); return; }

    // Clone and strip elements marked no-print
    const clone = node.cloneNode(true);
    clone.querySelectorAll('[data-no-print], .actions, .modal-backdrop').forEach(n => n.remove());

    const baseCss = `
      body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1F2255; line-height: 1.5; }
      h1, h2, h3, h4 { font-family: 'Calibri', 'Arial', sans-serif; color: #1F2255; margin: 12pt 0 6pt; }
      h1 { font-size: 22pt; }
      h2 { font-size: 16pt; border-bottom: 2pt solid #3D4392; padding-bottom: 4pt; }
      h3 { font-size: 13pt; color: #3D4392; }
      p { margin: 0 0 8pt; }
      table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
      td, th { border: 1pt solid #E7E8E9; padding: 8pt 12pt; vertical-align: top; }
      th { background: #F4F5FB; color: #1F2255; text-align: left; font-weight: 600; }
      .pill { display: inline-block; padding: 3pt 10pt; border-radius: 99pt; font-size: 10pt; font-weight: 600; background: #EBECF7; color: #1F2255; }
      .meta { color: #797C7F; font-size: 10pt; }
      ul { margin: 4pt 0 8pt 18pt; padding: 0; }
      li { margin: 3pt 0; }
      .hero-box { background: #1F2255; color: #fff; padding: 18pt 20pt; margin-bottom: 14pt; }
      .hero-box h1 { color: #fff; margin: 0 0 8pt; }
      .hero-box p { color: #D8DAF0; }
    `;

    // Build a clean Word document from semantic data attributes if present,
    // otherwise just dump cleaned-up HTML of the page.
    let body = clone.innerHTML;
    body = resolveVars(body);

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>${baseCss}</style>
</head>
<body>${body}</body>
</html>`;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (filename || 'documento') + '.doc';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.avnExport = { pdf: exportPDF, word: exportWord };
})();
