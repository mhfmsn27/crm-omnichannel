// CRMHUB Navigation - Upgraded v2.0 Enterprise & Flagship
const NAV = [
  { section: "Memulai" },
  { label: "Pengantar", icon: "👋", href: "index.html" },
  { label: "Gambaran Sistem 2.0", icon: "🗺️", href: "overview.html" },
  { label: "Setup VPS Multi-Instance", icon: "🚀", href: "PANDUAN_SETUP_VPS_MULTI_INSTANCE.html" },
  { divider: true },
  { section: "Komunikasi & Omnichannel" },
  { label: "Login & Autentikasi", icon: "🔐", href: "login.html" },
  { label: "Dashboard & TV Wallboard", icon: "📊", href: "dashboard.html" },
  { label: "Inbox & AI Copilot", icon: "💬", href: "inbox.html" },
  { label: "Integrasi 10+ Channel", icon: "🛍️", href: "integrations.html" },
  { label: "Broadcast Campaign", icon: "📢", href: "broadcast.html" },
  { label: "Templates & Quick Reply", icon: "📝", href: "templates.html" },
  { divider: true },
  { section: "Pelanggan & Penjualan" },
  { label: "Manajemen Kontak & vCard", icon: "👥", href: "contacts.html" },
  { label: "Pipeline CRM & Lead Scoring", icon: "🔄", href: "pipeline.html" },
  { label: "Sales GPS Field Tracker", icon: "📍", href: "sales-visits.html" },
  { label: "Produk & Katalog", icon: "📦", href: "products.html" },
  { label: "Invoice & Faktur 2.0", icon: "🧾", href: "invoicing.html" },
  { divider: true },
  { section: "Otomasi & AI Intelligence" },
  { label: "Chatbot & Flow Builder", icon: "🤖", href: "chatbot.html" },
  { label: "Automasi & CSAT Survey", icon: "⚡", href: "automation.html" },
  { label: "Tools & WhatsApp Warmer", icon: "🔧", href: "tools.html" },
  { divider: true },
  { section: "Mobile & Native App" },
  { label: "PWA 2.0 & Mobile App", icon: "📱", href: "mobile-pwa.html" },
  { divider: true },
  { section: "Manajemen Tim & Akses" },
  { label: "Manajemen Tim & Kapasitas", icon: "👤", href: "team.html" },
  { label: "Role, Akses & Masking Data", icon: "🔑", href: "roles.html" },
  { label: "Manajemen Tugas", icon: "✅", href: "tasks.html" },
  { label: "Sistem Tiket & SLA", icon: "🎫", href: "tickets.html" },
  { divider: true },
  { section: "Laporan & Pengaturan" },
  { label: "Laporan, CSAT & Analitik", icon: "📈", href: "analytics.html" },
  { label: "Pengaturan Sistem", icon: "⚙️", href: "settings.html" },
  { label: "Lisensi RSA-2048", icon: "🛡️", href: "license-documentation.html" },
  { label: "Langganan & Billing", icon: "💳", href: "billing.html" },
  { divider: true },
  { section: "Referensi Developer" },
  { label: "Developer & REST API", icon: "🔌", href: "api.html" },
  { label: "Keamanan & UU PDP", icon: "🔒", href: "security.html" },
  { label: "Pemecahan Masalah", icon: "🛠️", href: "troubleshooting.html" },
  { label: "FAQ", icon: "❓", href: "faq.html" },
  { label: "Catatan Perubahan (v2.0)", icon: "📋", href: "changelog.html" },
];

function renderNav(currentPage) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  let html = '';
  NAV.forEach(item => {
    if (item.section) {
      html += `<div class="nav-section"><div class="nav-section-title">${item.section}</div>`;
    } else if (item.divider) {
      html += `</div><div class="nav-divider"></div>`;
    } else {
      const active = item.href === currentPage ? ' active' : '';
      html += `<a href="${item.href}" class="nav-link${active}"><span class="icon">${item.icon}</span>${item.label}</a>`;
    }
  });
  sidebar.innerHTML = html;
}

// FAQ toggle
document.addEventListener('click', e => {
  const faqQ = e.target.closest('.faq-q');
  if (faqQ) {
    faqQ.closest('.faq-item').classList.toggle('open');
  }
});
