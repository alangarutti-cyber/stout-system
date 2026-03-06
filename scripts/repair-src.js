
/**
 * Reparador de arquivos corrompidos em /src
 * - Remove "..." (ellipsis) injetados fora de strings/comentários
 * - Junta tokens quebrados por quebras de linha dentro de identificadores comuns (Auth\nProvider -> AuthProvider)
 * - Corrige palavras-chave quebradas (co\nnst -> const, N\navigate -> Navigate)
 * - Gera um report repair-report.json com as mudanças
 *
 * Uso: node scripts/repair-src.js
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(process.cwd(), 'src');
const REPORT = { fixedFiles: [], skippedFiles: [], changes: [] };

if (!fs.existsSync(SRC_DIR)) {
  console.error(`[ERRO] Pasta "src" não encontrada em ${SRC_DIR}. Rode este script na raiz do projeto.`);
  process.exit(1);
}

// Helpers
const isTextFile = (p) => /\.(js|jsx|ts|tsx|css|json|md|html)$/i.test(p);

// Mapa de remendos para termos que vimos quebrados
const tokenFixes = [
  // Palavras-chave e termos comuns
  { from: /co\s*\n\s*nst/gm, to: 'const' },
  { from: /N\s*\n\s*avigate/gm, to: 'Navigate' },
  { from: /Auth\s*\n\s*Provider/gm, to: 'AuthProvider' },
  { from: /User\s*\n\s*Provider/gm, to: 'UserProvider' },
  { from: /Main\s*\n\s*Layout/gm, to: 'MainLayout' },
  { from: /SelectP\s*\n\s*rimitive/gm, to: 'SelectPrimitive' },
  { from: /AlertDialogP\s*\n\s*rimitive/gm, to: 'AlertDialogPrimitive' },
  { from: /DropdownMenuP\s*\n\s*rimitive/gm, to: 'DropdownMenuPrimitive' },
  { from: /TabsP\s*\n\s*rimitive/gm, to: 'TabsPrimitive' },
  { from: /ProgressP\s*\n\s*rimitive/gm, to: 'ProgressPrimitive' },
  { from: /SwitchP\s*\n\s*rimitive/gm, to: 'SwitchPrimitive' },
  { from: /DialogP\s*\n\s*rimitive/gm, to: 'DialogPrimitive' },
  { from: /PopoverP\s*\n\s*rimitive/gm, to: 'PopoverPrimitive' },
  { from: /ToastP\s*\n\s*rimitive/gm, to: 'ToastPrimitive' },
  { from: /Lucide\s*\n\s*Icons/gm, to: 'LucideIcons' },

  // Variantes de "export" / "import"
  { from: /ex\s*\n\s*port\s+default/gm, to: 'export default' },
  { from: /im\s*\n\s*port\s+/gm, to: 'import ' },

  // Outros comuns
  { from: /re\s*\n\s*turn/gm, to: 'return' },
  { from: /fun\s*\n\s*ction/gm, to: 'function' },
];

// Remove ellipsis "..." que não estejam dentro de strings simples
function removeDanglingEllipsis(code) {
  // Remoção simples e conservadora:
  // - Se ocorrer " ...:" (antes de pseudo-classes) -> remove os três pontos
  // - Se ocorrer " ... " fora de palavras -> remove
  let replaced = code;

  // Padrões frequentes vindos de classes tailwind corrompidas
  replaced = replaced.replace(/\s\.\.\.:\s*/g, ' ');
  replaced = replaced.replace(/className=["'`][^"'`]*\.\.\\.[^"'`]*["'`]/g, (m) => m.replace(/\.\.\./g, ''));
  replaced = replaced.replace(/\s\.\.\.\s/g, ' ');

  // Limpeza de casos soltos
  replaced = replaced.replace(/[\n\r]\s*\.\.\.\s*[\n\r]/g, '\n');

  return replaced;
}

function fixBrokenTokens(code) {
  let out = code;
  for (const rule of tokenFixes) {
    out = out.replace(rule.from, rule.to);
  }

  // genérico: junta Nome\nIdentificador -> NomeIdentificador (apenas quando há letras maiúsculas dos dois lados)
  out = out.replace(/([A-Za-z][A-Za-z0-9]*)\s*\n\s*([A-Z][A-Za-z0-9]*)/g, '$1$2');

  return out;
}

function processFile(file) {
  try {
    const original = fs.readFileSync(file, 'utf8');
    let fixed = original;
    let changed = false;

    const afterEllipsis = removeDanglingEllipsis(fixed);
    if (afterEllipsis !== fixed) {
      fixed = afterEllipsis;
      changed = true;
    }

    const afterTokens = fixBrokenTokens(fixed);
    if (afterTokens !== fixed) {
      fixed = afterTokens;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, fixed, 'utf8');
      REPORT.fixedFiles.push(file);
      REPORT.changes.push({ file, bytesBefore: original.length, bytesAfter: fixed.length });
    } else {
      REPORT.skippedFiles.push(file);
    }
  } catch (err) {
    console.error(`[ERRO] Falha ao processar ${file}:`, err.message);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walk(p);
    } else if (stat.isFile() && isTextFile(p)) {
      processFile(p);
    }
  }
}

// run
console.log(`[INFO] Reparando arquivos em: ${SRC_DIR}`);
walk(SRC_DIR);
const reportPath = path.resolve(process.cwd(), 'repair-report.json');
fs.writeFileSync(reportPath, JSON.stringify(REPORT, null, 2), 'utf8');
console.log(`[OK] Reparação concluída. Relatório em: ${reportPath}`);
