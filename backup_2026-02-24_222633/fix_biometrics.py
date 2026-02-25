import os

path = r'c:\Users\OCEAN\OneDrive\Documentos\projetos\projeto_adm\components\BiometricsManager.tsx'
try:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()

    new_lines = []
    # Lines 216 to 239 (1-indexed) are indexes 215 to 238
    for i, line in enumerate(lines):
        if 215 <= i <= 238:
            # Strip leading whitespace and + and then re-indent
            clean = line.strip().lstrip('+').strip()
            if clean:
                # Add back some basic indentation
                indent = '        ' if any(x in clean for x in ['if', 'for', 'return', 'const']) else '            '
                if clean.startswith('}'): indent = '        '
                if clean.startswith('//'): indent = '    '
                if 'getPondDataFromHistory' in clean: indent = '    '
                new_lines.append(indent + clean + '\n')
            else:
                new_lines.append('\n')
        else:
            new_lines.append(line)

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Optimization complete.")
except Exception as e:
    print(f"Error: {e}")
