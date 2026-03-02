function cloneWithValues(node) {
  const clone = node.cloneNode(true);
  const originals = node.querySelectorAll('input, textarea, select');
  const clones = clone.querySelectorAll('input, textarea, select');

  originals.forEach((orig, i) => {
    const c = clones[i];
    if (!c) return;

    if (orig.tagName === 'INPUT') {
      if (orig.type === 'checkbox' || orig.type === 'radio') c.checked = orig.checked;
      else c.value = orig.value;
    } else if (orig.tagName === 'TEXTAREA') {
      c.value = orig.value;
    } else if (orig.tagName === 'SELECT') {
      c.value = orig.value;
    }
  });

  return clone;
}

function convertNotesToTextForPdf(root) {
  const ta = root.querySelector('textarea[name="notes"]');
  if (!ta) return;

  ta.style.height = 'auto';
  ta.style.overflow = 'hidden';
  ta.style.resize = 'none';
  ta.style.height = ta.scrollHeight + 'px';

  const cs = window.getComputedStyle(ta);
  const block = document.createElement('div');
  const rect = ta.getBoundingClientRect();

  block.textContent = ta.value || '';
  block.style.whiteSpace = 'pre-wrap';
  block.style.overflowWrap = 'break-word';
  block.style.wordBreak = 'break-word';
  block.style.boxSizing = 'border-box';
  block.style.width = rect.width && rect.width > 0 ? rect.width + 'px' : '100%';
  block.style.minHeight = ta.scrollHeight + 'px';
  block.style.padding = cs.padding;
  block.style.border = cs.border;
  block.style.borderRadius = cs.borderRadius;
  block.style.background = cs.backgroundColor;
  block.style.color = cs.color;
  block.style.font = cs.font;
  block.style.lineHeight = cs.lineHeight;

  ta.replaceWith(block);
}

function convertCheckboxesForPdf(root) {
  root.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    const marker = document.createElement('span');
    marker.textContent = '';
    marker.style.display = 'inline-flex';
    marker.style.alignItems = 'center';
    marker.style.justifyContent = 'center';
    marker.style.width = '16px';
    marker.style.minWidth = '16px';
    marker.style.height = '16px';
    marker.style.marginRight = '8px';
    marker.style.boxSizing = 'border-box';
    marker.style.borderRadius = '3px';
    marker.style.border = cb.checked ? '1px solid #1f8a58' : '1px solid #8b8b8b';
    marker.style.backgroundColor = cb.checked ? '#1f8a58' : 'transparent';
    marker.style.verticalAlign = 'middle';

    if (cb.checked) {
      const tick = document.createElement('span');
      tick.style.display = 'block';
      tick.style.width = '4px';
      tick.style.height = '8px';
      tick.style.borderRight = '2px solid #ffffff';
      tick.style.borderBottom = '2px solid #ffffff';
      tick.style.transform = 'rotate(45deg)';
      tick.style.marginTop = '-1px';
      marker.appendChild(tick);
    }

    cb.replaceWith(marker);
  });
}

function clearEmptyPlaceholdersForPdf(root) {
  root.querySelectorAll('input, textarea').forEach((field) => {
    const value = (field.value || '').trim();
    if (!value) field.removeAttribute('placeholder');
  });
}

function getJsPDFCtor() {
  return window.jspdf?.jsPDF || window.jsPDF || window.jsPDF?.jsPDF || window.jspdf?.default?.jsPDF;
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Echec chargement script: ' + url));
    document.head.appendChild(s);
  });
}

async function ensureJsPDF() {
  if (getJsPDFCtor()) return;

  const urls = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
    'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js'
  ];

  for (const url of urls) {
    try {
      await loadScript(url);
      if (getJsPDFCtor()) return;
    } catch (_) {}
  }

  throw new Error('jsPDF introuvable');
}

async function genererPDFGlobal() {
  await genererPDFCapture();
}

async function genererPDFCapture() {
  let wrapper = null;
  try {
    if (!window.html2canvas) throw new Error('html2canvas introuvable');
    await ensureJsPDF();
    const jsPDF = getJsPDFCtor();
    if (!jsPDF) throw new Error('jsPDF introuvable');

    const form = document.getElementById('formMateriel');
    if (!form) throw new Error('formulaire introuvable');

    const formClone = cloneWithValues(form);
    formClone.querySelectorAll('.no-pdf').forEach((el) => el.remove());
    formClone.querySelectorAll('.pdf-hide-text').forEach((el) => {
      el.textContent = '';
      el.setAttribute('aria-hidden', 'true');
    });
    formClone.style.boxShadow = 'none';
    formClone.style.margin = '0';
    formClone.style.padding = '20px';
    formClone.style.width = '1000px';
    formClone.style.backgroundColor = '#c9d9e8';

    wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '-99999px';
    wrapper.style.width = '1040px';
    wrapper.appendChild(formClone);
    document.body.appendChild(wrapper);

    clearEmptyPlaceholdersForPdf(formClone);
    convertNotesToTextForPdf(formClone);
    convertCheckboxesForPdf(formClone);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const canvas = await html2canvas(formClone, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#c9d9e8',
      logging: false,
      windowWidth: formClone.scrollWidth,
      windowHeight: formClone.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdfWidth = 595.28;
    const margin = 15;
    const usableWidth = pdfWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'pt',
      format: [pdfWidth, imgHeight + margin * 2],
      compress: false
    });

    pdf.setFillColor(201, 217, 232);
    pdf.rect(0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), 'F');
    pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, imgHeight, undefined, 'SLOW');
    pdf.save('Employee_Onboarding_Form.pdf');
  } catch (error) {
    console.error('Erreur PDF:', error);
    alert('Erreur lors de la generation du PDF: ' + error.message);
  } finally {
    if (wrapper) wrapper.remove();
  }
}

function forceFieldsBlue() {
  document.querySelectorAll('#formMateriel input, #formMateriel textarea, #formMateriel select').forEach((el) => {
    if (el.matches('input[type="checkbox"], input[type="radio"]')) return;
    if (el.name === 'personne_de_contact_suivi' || el.name === 'email_de_contact_suivi') return;
    if (el.closest('.locked-field') && (el.readOnly || el.disabled)) return;
    el.style.color = '#003a70';
    el.style.webkitTextFillColor = '#003a70';
    el.style.caretColor = '#003a70';
  });
}

function initExclusiveMailModeCheckboxes() {
  const creation = document.querySelector('input[name="Creation courriel"]');
  const recuperation = document.querySelector('input[name="Recuperation courriel"]');
  if (!creation || !recuperation) return;

  creation.addEventListener('change', () => {
    if (creation.checked) recuperation.checked = false;
  });

  recuperation.addEventListener('change', () => {
    if (recuperation.checked) creation.checked = false;
  });
}

document.addEventListener('input', (e) => {
  if (!e.target || !e.target.matches('#formMateriel input, #formMateriel textarea, #formMateriel select')) return;
  if (e.target.matches('input[type="checkbox"], input[type="radio"]')) return;
  if (e.target.name === 'personne_de_contact_suivi' || e.target.name === 'email_de_contact_suivi') return;
  if (e.target.closest('.locked-field') && (e.target.readOnly || e.target.disabled)) return;
  e.target.style.color = '#003a70';
  e.target.style.webkitTextFillColor = '#003a70';
  e.target.style.caretColor = '#003a70';
});

initExclusiveMailModeCheckboxes();
forceFieldsBlue();
const btnPDF = document.getElementById('btnDownloadPDF');
if (btnPDF) btnPDF.addEventListener('click', genererPDFGlobal);
