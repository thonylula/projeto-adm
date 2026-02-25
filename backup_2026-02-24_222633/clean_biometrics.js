const fs = require('fs');
const path = 'c:/Users/OCEAN/OneDrive/Documentos/projetos/projeto_adm/components/BiometricsManager.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split(/\r?\n/);
// Line numbers in tool are 1-indexed. Index i = line_number - 1.
// Corrupted lines are 216 to 239. Indexes 215 to 238.
for (let i = 215; i <= 238; i++) {
    if (lines[i]) {
        // Remove leading spaces, then +, then fix indentation
        lines[i] = lines[i].replace(/^\s*\+\s*/, '    ').replace(/^\+/, '    ');
    }
}
fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
console.log('Cleanup complete.');
