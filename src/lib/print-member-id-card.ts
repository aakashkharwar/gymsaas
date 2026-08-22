import QRCode from 'qrcode';
import { getCheckInContext } from '@/app/actions/dashboard';
import { getOrganizationDetails } from '@/app/actions/fees';

export type IdCardMember = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  plan_type?: string;
  enrollment_date?: string;
};

function esc(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'M';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB');
}

function expireDate(enrollment?: string, planType?: string) {
  if (!enrollment) return '—';
  const date = new Date(enrollment);
  if (Number.isNaN(date.getTime())) return '—';
  if (planType === 'quarterly') date.setMonth(date.getMonth() + 3);
  else if (planType === 'annual') date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toLocaleDateString('en-GB');
}

function memberCode(id: string, phone: string) {
  const compact = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  if (compact) return compact.match(/.{1,3}/g)?.join(' ') || compact;
  return phone.replace(/\D/g, '').slice(-9) || '000 000';
}

function addressFrom(member: IdCardMember) {
  if (member.address) return member.address;
  const match = member.notes?.match(/^Address:\s*(.+)$/m);
  return match?.[1]?.trim() || '';
}

const logoSvg = `<svg viewBox="0 0 64 64" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
  <polygon points="32,2 58,16 58,48 32,62 6,48 6,16" fill="none" stroke="#fff" stroke-width="3"/>
  <polygon points="32,16 44,24 44,40 32,48 20,40 20,24" fill="#f5c518"/>
</svg>`;

const barsSvg = `<svg viewBox="0 0 48 18" width="36" height="14" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="8" height="14" transform="skewX(-28)" fill="#c9a227"/>
  <rect x="16" y="2" width="8" height="14" transform="skewX(-28)" fill="#e6c34a"/>
  <rect x="30" y="2" width="8" height="14" transform="skewX(-28)" fill="#f5c518"/>
</svg>`;

const dotsSvg = `<svg viewBox="0 0 28 36" width="18" height="24" xmlns="http://www.w3.org/2000/svg">
  ${Array.from({ length: 32 }, (_, i) => {
    const x = 3 + (i % 4) * 7;
    const y = 3 + Math.floor(i / 4) * 4.2;
    return `<circle cx="${x}" cy="${y}" r="1.1" fill="#9ca3af"/>`;
  }).join('')}
</svg>`;

const goldDotsSvg = `<svg viewBox="0 0 28 20" width="22" height="16" xmlns="http://www.w3.org/2000/svg">
  ${Array.from({ length: 18 }, (_, i) => {
    const x = 3 + (i % 6) * 4.2;
    const y = 3 + Math.floor(i / 6) * 5;
    return `<circle cx="${x}" cy="${y}" r="1.15" fill="#f5c518"/>`;
  }).join('')}
</svg>`;

export async function printMemberIdCard(member: IdCardMember) {
  const [ctx, org] = await Promise.all([getCheckInContext(), getOrganizationDetails()]);
  const gymName = org?.name || ctx.gymName || 'GYM';
  const gymAddress = org?.address || addressFrom(member) || 'Gym desk';
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const payload = ctx.orgId
    ? `${origin}/check-in?org=${encodeURIComponent(ctx.orgId)}&phone=${encodeURIComponent(member.phone || '')}`
    : member.phone || member.name;

  const qr = await QRCode.toDataURL(payload, {
    margin: 0,
    width: 220,
    errorCorrectionLevel: 'H',
    color: { dark: '#111111', light: '#ffffff' },
  });

  const w = window.open('', '_blank');
  if (!w) return;

  const name = esc(member.name);
  const gym = esc(gymName);
  const phone = esc(member.phone || '—');
  const email = esc(member.email || 'ask at reception');
  const address = esc(gymAddress);
  const idNo = esc(memberCode(member.id, member.phone));
  const join = esc(formatDate(member.enrollment_date));
  const expire = esc(expireDate(member.enrollment_date, member.plan_type));
  const mono = esc(initials(member.name));

  w.document.write(`<!doctype html>
<html>
<head>
  <title>ID Card - ${name}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4 landscape; margin: 10mm; }
    html, body { margin: 0; background: #d6d3d1; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: Arial, Helvetica, sans-serif;
    }
    .hint { margin: 0 0 14px; color: #444; font-size: 13px; }
    .sheet {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 18mm;
    }
    .side { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .side span { font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #57534e; }
    .holder {
      width: 58mm;
      height: 92mm;
      padding: 2.2mm;
      background: #d4af37;
      border: 0.4mm solid #b8860b;
      box-shadow: 0 8px 20px rgba(0,0,0,0.18);
    }
    .card {
      width: 100%;
      height: 100%;
      background: #111111;
      color: #fff;
      overflow: hidden;
      position: relative;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5mm 4mm 3mm;
    }
    .brand h2 { margin: 0; font-size: 3.1mm; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; line-height: 1.1; }
    .brand p { margin: 1px 0 0; font-size: 1.7mm; letter-spacing: 0.3px; color: #d6d3d1; text-transform: uppercase; }
    .photo {
      height: 42mm;
      margin: 0;
      background: #2a2a2a;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .photo b {
      font-size: 18mm;
      color: #f5c518;
      letter-spacing: 1px;
      text-shadow: 0 2px 0 #000;
    }
    .slash-top {
      position: absolute; left: 0; top: 0;
      width: 0; height: 0;
      border-top: 14mm solid #f5c518;
      border-right: 28mm solid transparent;
    }
    .slash-bottom {
      position: absolute; right: 0; bottom: 0;
      width: 0; height: 0;
      border-bottom: 12mm solid #f5c518;
      border-left: 34mm solid transparent;
    }
    .info { padding: 4mm 4mm 3mm; }
    .info h1 { margin: 0; font-size: 4.4mm; font-weight: 800; text-transform: uppercase; line-height: 1.05; }
    .info .role { margin: 1.2mm 0 3mm; font-size: 2.4mm; font-weight: 800; color: #f5c518; letter-spacing: 1px; }
    .info .row { margin: 0 0 1mm; font-size: 2.2mm; }
    .deco { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 3mm; }
    .rules { padding: 0 4mm; font-size: 2.1mm; color: #e7e5e4; line-height: 1.35; }
    .rules li { margin: 0 0 1.6mm 3.2mm; }
    .contacts { padding: 2.5mm 4mm 0; }
    .contact { display: flex; align-items: center; gap: 2mm; margin: 0 0 1.8mm; font-size: 2.1mm; }
    .icon {
      width: 4.4mm; height: 4.4mm; flex-shrink: 0;
      background: #f5c518; color: #111;
      display: flex; align-items: center; justify-content: center;
      font-size: 2.3mm; font-weight: 800;
    }
    .qr-box { margin: 2mm auto 0; width: 18mm; background: #fff; padding: 1.2mm; }
    .qr-box img { display: block; width: 100%; height: auto; }
    .sign { padding: 3mm 4mm 0; }
    .sign .line { border-bottom: 0.35mm solid #fff; width: 28mm; margin-bottom: 1.4mm; }
    .sign strong { display: block; font-size: 2.3mm; text-transform: uppercase; }
    .sign em { font-style: normal; font-size: 1.8mm; color: #d6d3d1; }
    .triangle {
      position: absolute; left: 0; right: 0; bottom: 0; height: 10mm;
      background: #f5c518;
      clip-path: polygon(0 100%, 50% 0, 100% 100%);
    }
    .corner-tl { position: absolute; top: 3mm; left: 3mm; }
    .corner-tr { position: absolute; top: 3.2mm; right: 3mm; }
    .corner-bl { position: absolute; bottom: 11mm; left: 3mm; }
    .corner-br { position: absolute; bottom: 11mm; right: 3mm; }
    @media print {
      html, body { background: #fff !important; }
      .hint { display: none; }
      .holder { box-shadow: none; }
    }
  </style>
</head>
<body>
  <p class="hint">Print dialog me Background graphics ON rakho. Front aur back ek hi page pe hain.</p>
  <div class="sheet">
    <div class="side">
      <span>FRONT</span>
      <div class="holder">
        <div class="card">
          <div class="brand">
            ${logoSvg}
            <div>
              <h2>${gym}</h2>
              <p>Train hard. Stay strong.</p>
            </div>
          </div>
          <div class="photo">
            <div class="slash-top"></div>
            <b>${mono}</b>
            <div class="slash-bottom"></div>
          </div>
          <div class="info">
            <h1>${name}</h1>
            <div class="role">MEMBER</div>
            <p class="row">ID No : ${idNo}</p>
            <p class="row">Join : ${join}</p>
            <div class="deco">${barsSvg}${dotsSvg}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="side">
      <span>BACK</span>
      <div class="holder">
        <div class="card">
          <div class="corner-tl">${goldDotsSvg}</div>
          <div class="corner-tr">${barsSvg}</div>
          <div class="brand" style="padding-top:8mm">
            ${logoSvg}
            <div>
              <h2>${gym}</h2>
              <p>Train hard. Stay strong.</p>
            </div>
          </div>
          <ul class="rules">
            <li>Is card ko gym entry ke liye saath rakhein.</li>
            <li>Attendance ke liye neeche QR scan karein.</li>
          </ul>
          <div class="contacts">
            <div class="contact"><span class="icon">☎</span>${phone}</div>
            <div class="contact"><span class="icon">✉</span>${email}</div>
            <div class="contact"><span class="icon">⌂</span>${address}</div>
            <div class="contact"><span class="icon">◷</span>Valid till ${expire}</div>
          </div>
          <div class="qr-box"><img src="${qr}" alt="QR" /></div>
          <div class="sign">
            <div class="line"></div>
            <strong>${gym}</strong>
            <em>Authorized gym card</em>
          </div>
          <div class="corner-bl">${barsSvg}</div>
          <div class="corner-br">${goldDotsSvg}</div>
          <div class="triangle"></div>
        </div>
      </div>
    </div>
  </div>
  <script>setTimeout(() => window.print(), 400);</script>
</body>
</html>`);
  w.document.close();
  w.focus();
}
