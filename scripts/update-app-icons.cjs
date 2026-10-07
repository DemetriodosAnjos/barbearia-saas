const fs = require("fs");
const path = require("path");

const appPath = path.resolve("src/App.jsx");
let content = fs.readFileSync(appPath, "utf8");

// Ensure ProjectIcon import
if (!content.includes('import ProjectIcon from "./components/ui/ProjectIcon";')) {
  content = 'import ProjectIcon from "./components/ui/ProjectIcon";\n' + content;
}

// Replace emojis
const replacements = [
  ['📱 App do Cliente (Agendar)', '<span className="flex items-center gap-1.5"><ProjectIcon name="Smartphone" size={14} colorVariant="inherit" /><span>App do Cliente (Agendar)</span></span>'],
  ['✂️ Painel da Barbearia', '<span className="flex items-center gap-1.5"><ProjectIcon name="Scissors" size={14} colorVariant="inherit" /><span>Painel da Barbearia</span></span>'],
  ['👑 SuperAdmin', '<span className="flex items-center gap-1.5"><ProjectIcon name="Crown" size={14} colorVariant="inherit" /><span>SuperAdmin</span></span>'],
  ['🎨 UI Kit', '<span className="flex items-center gap-1.5"><ProjectIcon name="Palette" size={14} colorVariant="inherit" /><span>UI Kit</span></span>'],
  ['<span>🧪</span>', '<ProjectIcon name="FlaskConical" size={14} colorVariant="inherit" />'],
  ['🔒 SuperAdmin', '<span className="flex items-center gap-1"><ProjectIcon name="Lock" size={11} colorVariant="danger" /><span>SuperAdmin</span></span>'],
  ['<span>📋</span>', '<ProjectIcon name="FileText" size={14} colorVariant="inherit" />'],
  ['<span>🛠️</span>', '<ProjectIcon name="Terminal" size={14} colorVariant="inherit" />'],
  ['<span>⚡</span> Painel de Protótipos:', '<ProjectIcon name="Zap" size={13} colorVariant="amber" /> Painel de Protótipos:'],
  ['<span>🔑</span>', '<ProjectIcon name="Key" size={14} colorVariant="inherit" />'],
  ['<span>🚀</span>', '<ProjectIcon name="Rocket" size={14} colorVariant="inherit" />'],
  ['<span>📊</span>', '<ProjectIcon name="BarChart3" size={14} colorVariant="inherit" />'],
  ['<span>✨</span>', '<ProjectIcon name="Sparkles" size={14} colorVariant="inherit" />'],
  ['<span>🛡️</span>', '<ProjectIcon name="Shield" size={14} colorVariant="amber" />'],
  ['Ver no Showcase ✨', 'Ver no Showcase'],
  ['🎉 AGENDAMENTO SINCRONIZADO', 'AGENDAMENTO SINCRONIZADO'],
  ['👉 O corte já está posicionado', 'O corte já está posicionado'],
];

replacements.forEach(([from, to]) => {
  if (content.includes(from)) {
    content = content.replaceAll(from, to);
  }
});

fs.writeFileSync(appPath, content, "utf8");
console.log("App.jsx updated successfully!");
