const fs = require("fs");
const path = require("path");

const filePath = path.resolve("src/components/pos/PaymentMethodSelector.jsx");
let content = fs.readFileSync(filePath, "utf8");

if (!content.includes('import ProjectIcon from "../ui/ProjectIcon";')) {
  content = content.replace(
    'import Input from "../ui/Input";',
    'import Input from "../ui/Input";\nimport ProjectIcon from "../ui/ProjectIcon";'
  );
}

// 96
content = content.replace(
  '✓ TOTAL QUITADO (100%)',
  'TOTAL QUITADO (100%)'
);

// Method selector buttons
content = content.replace(
  '<span className="text-base">📱</span>',
  '<ProjectIcon name="Smartphone" size={18} colorVariant="inherit" />'
);
content = content.replace(
  '<span className="text-base">💳</span>',
  '<ProjectIcon name="CreditCard" size={18} colorVariant="inherit" />'
);
content = content.replace(
  '<span className="text-base">💵</span>',
  '<ProjectIcon name="DollarSign" size={18} colorVariant="inherit" />'
);
content = content.replace(
  '<span className="text-base">👑</span>',
  '<ProjectIcon name="Crown" size={18} colorVariant="inherit" />'
);
content = content.replace(
  '<span className="text-base">📝</span>',
  '<ProjectIcon name="FileText" size={18} colorVariant="inherit" />'
);

// Panel titles
content = content.replace(
  '<span>📱 Pagamento Instantâneo via PIX</span>',
  '<span className="flex items-center gap-1.5"><ProjectIcon name="Smartphone" size={16} colorVariant="amber" /><span>Pagamento Instantâneo via PIX</span></span>'
);
content = content.replace(
  '<span>💳 Maquininha de Cartão</span>',
  '<span className="flex items-center gap-1.5"><ProjectIcon name="CreditCard" size={16} colorVariant="amber" /><span>Maquininha de Cartão</span></span>'
);
content = content.replace(
  '<span>💵 Pagamento em Dinheiro Físico</span>',
  '<span className="flex items-center gap-1.5"><ProjectIcon name="DollarSign" size={16} colorVariant="amber" /><span>Pagamento em Dinheiro Físico</span></span>'
);
content = content.replace(
  '<span>👑 Benefício do Plano de Assinatura</span>',
  '<span className="flex items-center gap-1.5"><ProjectIcon name="Crown" size={16} colorVariant="gold" /><span>Benefício do Plano de Assinatura</span></span>'
);
content = content.replace(
  '<span>📝 Fiado / Débito em Conta</span>',
  '<span className="flex items-center gap-1.5"><ProjectIcon name="FileText" size={16} colorVariant="amber" /><span>Fiado / Débito em Conta</span></span>'
);

// Delete badge
content = content.replace(
  '✕\n                </button>',
  '<ProjectIcon name="X" size={10} colorVariant="inherit" />\n                </button>'
);

// Submit button
content = content.replace(
  '? "✓ Liquidar e Fechar Comanda"',
  '? "Liquidar e Fechar Comanda"'
);

fs.writeFileSync(filePath, content, "utf8");
console.log("PaymentMethodSelector.jsx updated successfully!");
