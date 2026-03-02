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
      block.style.width = (rect.width && rect.width > 0) ? (rect.width + 'px') : '100%';
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
        marker.textContent = cb.checked ? '✓' : '';
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
        marker.style.color = '#ffffff';
        marker.style.fontSize = '12px';
        marker.style.fontWeight = '900';
        marker.style.lineHeight = '1';
        marker.style.verticalAlign = 'middle';
        cb.replaceWith(marker);
      });
    }

    function clearEmptyPlaceholdersForPdf(root) {
      root.querySelectorAll('input, textarea').forEach((field) => {
        const value = (field.value || '').trim();
        if (!value) {
          field.setAttribute('data-pdf-placeholder', field.getAttribute('placeholder') || '');
          field.removeAttribute('placeholder');
        }
      });
    }

    function getFieldValue(form, selector) {
      const el = form.querySelector(selector);
      if (!el) return '';
      if (el.type === 'checkbox') return el.checked ? '1' : '0';
      return (el.value || '').trim();
    }

    function getJsPDFCtor() {
      return (
        window.jspdf?.jsPDF ||
        window.jsPDF ||
        window.jsPDF?.jsPDF ||
        window.jspdf?.default?.jsPDF
      );
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

    function drawPdfBackground(pdf) {
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.setFillColor(201, 217, 232);
      pdf.rect(0, 0, w, h, 'F');
    }

    function addSectionTitle(pdf, y, text, margin, contentWidth) {
      pdf.setFillColor(0, 58, 112);
      pdf.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
      pdf.setTextColor(58, 172, 119);
      pdf.setFontSize(12);
      pdf.text(text, margin + 10, y + 14);
      pdf.setTextColor(34, 34, 34);
      return y + 28;
    }

    function addTextLabel(pdf, x, y, text) {
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text(text, x, y);
      pdf.setFont(undefined, 'normal');
    }

    function addAcroTextField(pdf, AcroFormTextFieldCtor, opts) {
      const field = new AcroFormTextFieldCtor();
      field.Rect = [opts.x, opts.y, opts.w, opts.h];
      field.T = opts.name;
      field.V = opts.value || '';
      field.multiline = !!opts.multiline;
      field.fontSize = 10;
      field.borderStyle = 'solid';
      field.textColor = '#1f1f1f';
      if (opts.readOnly) field.readOnly = true;
      pdf.addField(field);
    }

    function drawStaticCheckbox(pdf, x, y, label, checked) {
      pdf.setDrawColor(120, 120, 120);
      pdf.setFillColor(31, 138, 88);
      if (checked) {
        pdf.rect(x, y - 10, 10, 10, 'FD');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.text('✓', x + 2.2, y - 2);
      } else {
        pdf.rect(x, y - 10, 10, 10, 'S');
      }
      pdf.setTextColor(34, 34, 34);
      pdf.setFontSize(10);
      pdf.text(label, x + 16, y - 1);
    }

    function generateInteractivePDF() {
      const jsPDFLib = getJsPDFCtor();
      if (!jsPDFLib) throw new Error('jsPDF introuvable');

      const testPdf = new jsPDFLib({ unit: 'pt', format: 'a4' });
      const AcroFormTextFieldCtor =
        jsPDFLib.AcroFormTextField ||
        window.jsPDF?.AcroFormTextField ||
        window.jspdf?.jsPDF?.AcroFormTextField ||
        window.AcroFormTextField;
      const hasAcro = typeof AcroFormTextFieldCtor === 'function' && typeof testPdf.addField === 'function';
      if (!hasAcro) throw new Error('AcroForm non disponible avec cette version de jsPDF');

      const form = document.getElementById('formMateriel');
      if (!form) throw new Error('formulaire introuvable');

      const pdf = new jsPDFLib({ unit: 'pt', format: 'a4' });
      drawPdfBackground(pdf);

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const contentW = pageW - (margin * 2);
      const gap = 14;
      const colW = (contentW - gap) / 2;
      const fieldH = 20;
      let y = 34;

      const ensureSpace = (required) => {
        if ((y + required) > (pageH - margin)) {
          pdf.addPage();
          drawPdfBackground(pdf);
          y = 34;
        }
      };

      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 58, 112);
      pdf.text("Formulaire d'entree en poste - Employe du CDENE", margin, y);
      y += 24;

      y = addSectionTitle(pdf, y, 'General', margin, contentW);

      const add2Cols = (left, right) => {
        ensureSpace(48);
        addTextLabel(pdf, margin, y, left.label);
        addAcroTextField(pdf, AcroFormTextFieldCtor, { x: margin, y: y + 6, w: colW, h: fieldH, name: left.name, value: left.value, readOnly: !!left.readOnly });
        addTextLabel(pdf, margin + colW + gap, y, right.label);
        addAcroTextField(pdf, AcroFormTextFieldCtor, { x: margin + colW + gap, y: y + 6, w: colW, h: fieldH, name: right.name, value: right.value, readOnly: !!right.readOnly });
        y += 54;
      };

      add2Cols(
        { label: 'Nom / Prenom', name: 'nom_prenom', value: getFieldValue(form, 'input[name^="Nom / Pr"]') },
        { label: 'Date de debut', name: 'date_debut', value: getFieldValue(form, 'input[name^="Date de d"]') }
      );
      add2Cols(
        { label: 'Poste comble', name: 'poste_comble', value: getFieldValue(form, 'input[name^="Poste combl"]') },
        { label: 'Departement', name: 'departement', value: getFieldValue(form, 'input[name="department"]') }
      );
      add2Cols(
        { label: 'Personne de contact-suivi', name: 'contact_suivi', value: getFieldValue(form, '[name="personne_de_contact_suivi"]'), readOnly: true },
        { label: 'Email de contact-suivi', name: 'email_suivi', value: getFieldValue(form, '[name="email_de_contact_suivi"]'), readOnly: true }
      );

      y = addSectionTitle(pdf, y, 'Comptes et Acces', margin, contentW);
      ensureSpace(24);
      drawStaticCheckbox(pdf, margin + 2, y + 6, "Creation d'un nouveau courriel", getFieldValue(form, 'input[name="Creation courriel"]') === '1');
      drawStaticCheckbox(pdf, margin + colW + gap + 2, y + 6, "Recuperation d'un courriel existant", getFieldValue(form, 'input[name="Recuperation courriel"]') === '1');
      y += 28;

      add2Cols(
        { label: 'Adresse courriel', name: 'adresse_courriel', value: getFieldValue(form, 'input[name="requested_email"]') },
        { label: 'Listes de distribution', name: 'distribution_lists', value: getFieldValue(form, 'input[name="distribution_lists"]') }
      );

      ensureSpace(22);
      drawStaticCheckbox(pdf, margin + 2, y + 6, 'Activation - Microsoft 365 Standard Account', getFieldValue(form, 'input[name="m365_standard"]') === '1');
      y += 26;

      add2Cols(
        { label: "Acces a l'ancienne boite mail", name: 'acces_boite_mail', value: getFieldValue(form, 'input[name="Acces_Boite_Mail"]') },
        { label: 'Acces aux documents OneDrive', name: 'acces_onedrive', value: getFieldValue(form, 'input[name="Destination_OneDrive"]') }
      );

      ensureSpace(46);
      addTextLabel(pdf, margin, y, 'Groupe de securite a mettre a jour');
      addAcroTextField(pdf, AcroFormTextFieldCtor, {
        x: margin,
        y: y + 6,
        w: contentW,
        h: fieldH,
        name: 'groupe_securite',
        value: getFieldValue(form, 'input[name="Groupe_Securite"]')
      });
      y += 54;

      y = addSectionTitle(pdf, y, 'PC / Ordinateur a configurer', margin, contentW);
      add2Cols(
        { label: 'Numero de serie', name: 'serial_number', value: getFieldValue(form, 'input[name="serial_number"]') },
        { label: "Nom de l'ordinateur", name: 'device_name', value: getFieldValue(form, 'input[name="device_name"]') }
      );

      y = addSectionTitle(pdf, y, 'Notes complementaires', margin, contentW);
      ensureSpace(120);
      addAcroTextField(pdf, AcroFormTextFieldCtor, {
        x: margin,
        y: y + 6,
        w: contentW,
        h: 100,
        name: 'notes',
        value: getFieldValue(form, 'textarea[name="notes"]'),
        multiline: true
      });

      pdf.save('Employee_Onboarding_Form_Interactive.pdf');
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
        const usableWidth = pdfWidth - (margin * 2);
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'pt',
          format: [pdfWidth, imgHeight + (margin * 2)],
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

    const btnPDF = document.getElementById('btnDownloadPDF');
    if (btnPDF) btnPDF.addEventListener('click', genererPDFGlobal);
