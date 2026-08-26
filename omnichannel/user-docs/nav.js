// CRMHUB Navigation
const NAV = [
  { section: "Memulai" },
  { label: "Pengantar", icon: "👋", href: "index.html" },
  { label: "Gambaran Sistem", icon: "🗺️", href: "overview.html" },
  { divider: true },
  { section: "Komunikasi" },
  { label: "Login & Autentikasi", icon: "🔐", href: "login.html" },
  { label: "Dashboard", icon: "📊", href: "dashboard.html" },
  { label: "Inbox & Chat", icon: "💬", href: "inbox.html" },
  { label: "Integrasi & Channel", icon: "📱", href: "integrations.html" },
  { label: "Broadcast Campaign", icon: "📢", href: "broadcast.html" },
  { label: "Templates & Quick Reply", icon: "📝", href: "templates.html" },
  { divider: true },
  { section: "Pelanggan & Penjualan" },
  { label: "Manajemen Kontak", icon: "👥", href: "contacts.html" },
  { label: "Pipeline CRM", icon: "🔄", href: "pipeline.html" },
  { label: "Produk & Katalog", icon: "📦", href: "products.html" },
  { label: "Invoice & Tagihan", icon: "🧾", href: "invoicing.html" },
  { divider: true },
  { section: "Otomasi & AI" },
  { label: "Chatbot & Flow Builder", icon: "🤖", href: "chatbot.html" },
  { label: "Automasi & Customer Service", icon: "⚡", href: "automation.html" },
  { label: "Tools & Produktivitas", icon: "🔧", href: "tools.html" },
  { divider: true },
  { section: "Manajemen Tim" },
  { label: "Manajemen Tim", icon: "👤", href: "team.html" },
  { label: "Role & Akses", icon: "🔑", href: "roles.html" },
  { label: "Manajemen Tugas", icon: "✅", href: "tasks.html" },
  { label: "Sistem Tiket", icon: "🎫", href: "tickets.html" },
  { divider: true },
  { section: "Laporan & Pengaturan" },
  { label: "Laporan & Analitik", icon: "📈", href: "analytics.html" },
  { label: "Pengaturan", icon: "⚙️", href: "settings.html" },
  { label: "Langganan & Billing", icon: "💳", href: "billing.html" },
  { divider: true },
  { section: "Referensi" },
  { label: "Developer & API", icon: "🔌", href: "api.html" },
  { label: "Keamanan", icon: "🛡️", href: "security.html" },
  { label: "Pemecahan Masalah", icon: "🛠️", href: "troubleshooting.html" },
  { label: "FAQ", icon: "❓", href: "faq.html" },
  { label: "Catatan Perubahan", icon: "📋", href: "changelog.html" },
];

function renderNav(currentPage) {
  const sidebar = document.getElementById('sidebar');
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
