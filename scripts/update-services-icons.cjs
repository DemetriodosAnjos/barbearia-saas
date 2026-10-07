const fs = require("fs");
const path = require("path");

const filePath = path.resolve("src/pages/BarbershopAdmin/ServicesAndProductsView.jsx");
let content = fs.readFileSync(filePath, "utf8");

if (!content.includes('import ProjectIcon from "../../components/ui/ProjectIcon";')) {
  content = content.replace(
    'import Alert from "../../components/ui/Alert";',
    'import Alert from "../../components/ui/Alert";\nimport ProjectIcon from "../../components/ui/ProjectIcon";'
  );
}

content = content.replaceAll('icon: p.category === "Bar" ? "🍺" : "🧴"', 'icon: p.category === "Bar" ? "beer" : "product"');
content = content.replaceAll('icon: data.category === "Bar" ? "🍺" : "🧴"', 'icon: data.category === "Bar" ? "beer" : "product"');
content = content.replaceAll('icon: sanitizedCategory === "Bar" ? "🍺" : "🧴"', 'icon: sanitizedCategory === "Bar" ? "beer" : "product"');

content = content.replace(
  '            <span>✂️</span>\n            <span>Catálogo de Serviços & Estoque do PDV</span>',
  '            <ProjectIcon name="Scissors" size={24} colorVariant="amber" />\n            <span>Catálogo de Serviços & Estoque do PDV</span>'
);

content = content.replace(
  '            <span>✂️</span>\n            <span>\n              Serviços',
  '            <ProjectIcon name="Scissors" size={15} colorVariant="inherit" className="mr-1.5 inline" />\n            <span>\n              Serviços'
);

content = content.replace(
  '            <span>🍺</span>\n            <span>\n              Bar & Vitrine',
  '            <ProjectIcon name="Beer" size={15} colorVariant="inherit" className="mr-1.5 inline" />\n            <span>\n              Bar & Vitrine'
);

content = content.replaceAll('title={`✏️ Editar Serviço:', 'title={`Editar Serviço:');
content = content.replaceAll('title={`✏️ Editar Produto:', 'title={`Editar Produto:');

content = content.replace(
  '<p className="font-bold">🛡️ Histórico Contábil Protegido:</p>',
  '<p className="font-bold flex items-center gap-1.5"><ProjectIcon name="ShieldCheck" size={14} colorVariant="amber" /><span>Histórico Contábil Protegido:</span></p>'
);

fs.writeFileSync(filePath, content, "utf8");
console.log("ServicesAndProductsView.jsx updated successfully!");
