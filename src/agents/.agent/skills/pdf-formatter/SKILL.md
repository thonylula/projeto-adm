---
name: pdf-formatter
version: 1.0.0
description: Use esta skill quando o usuário precisar criar, formatar, editar ou manipular arquivos PDF de forma profissional. Ativa quando mencionado qualquer trabalho com PDFs incluindo criação de documentos formatados, conversão, mesclagem, divisão, adição de cabeçalhos/rodapés, marcas d'água, preenchimento de formulários, extração de conteúdo ou formatação de texto em PDF.
author: Antigravity Skills
tags:
  - pdf
  - formatação
  - documentos
  - conversão
  - manipulação
dependencies:
  - python >= 3.8
  - reportlab
  - pypdf
  - pillow
---

# PDF Formatter Skill

## Goal

Fornecer capacidades completas de criação e formatação profissional de documentos PDF, incluindo manipulação de layout, tipografia, imagens, tabelas e metadados, garantindo saída de alta qualidade compatível com padrões profissionais.

## Core Capabilities

1. **Criação de PDFs**
   - Documentos formatados do zero
   - Conversão de formatos (Markdown, HTML, texto, imagens)
   - Templates profissionais

2. **Formatação e Estilo**
   - Controle tipográfico (fontes, tamanhos, espaçamento)
   - Layout multi-colunas
   - Cabeçalhos e rodapés personalizados
   - Numeração de páginas

3. **Manipulação**
   - Mesclagem de múltiplos PDFs
   - Divisão e extração de páginas
   - Rotação e reordenação
   - Marcas d'água e overlays

4. **Conteúdo Avançado**
   - Tabelas formatadas
   - Imagens com controle de qualidade
   - Listas e hierarquias
   - Hyperlinks e bookmarks

## Instructions

### Quando Ativar Esta Skill

Esta skill deve ser ativada quando o usuário:
- Solicitar criação de PDF formatado
- Pedir conversão para PDF
- Mencionar manipulação de arquivos PDF
- Precisar de documentos profissionais
- Requerer formatação específica de layout
- Solicitar mesclagem/divisão de PDFs

### Workflow Padrão

1. **Análise de Requisitos**
   - Identificar tipo de documento necessário
   - Determinar requisitos de formatação
   - Verificar se há conteúdo de entrada
   - Confirmar especificações de layout

2. **Preparação**
   - Verificar dependências instaladas
   - Carregar templates se aplicável
   - Preparar recursos (fontes, imagens)
   - Configurar metadados do documento

3. **Execução**
   - Usar script apropriado de `scripts/`
   - Aplicar formatação especificada
   - Validar saída
   - Gerar arquivo final

4. **Validação e Entrega**
   - Verificar integridade do PDF
   - Confirmar conformidade com requisitos
   - Salvar em `/mnt/user-data/outputs/`
   - Apresentar ao usuário

### Decisões de Implementação

**Para Criação de PDF Simples:**
```bash
python scripts/create_pdf.py --input content.txt --output document.pdf --template simple
```

**Para Formatação Avançada:**
```bash
python scripts/format_pdf.py --input data.json --template professional --fonts custom --output report.pdf
```

**Para Manipulação de PDFs Existentes:**
```bash
python scripts/manipulate_pdf.py --merge file1.pdf file2.pdf --output combined.pdf
```

**Para Conversão:**
```bash
python scripts/convert_to_pdf.py --input document.md --format markdown --output formatted.pdf
```

## Constraints

### Segurança e Limites
- **Tamanho Máximo**: Não processar arquivos únicos maiores que 100MB
- **Validação**: Sempre validar PDFs de entrada antes de manipulação
- **Criptografia**: Respeitar PDFs protegidos por senha (não tentar quebrar)
- **Metadados**: Preservar metadados existentes a menos que especificamente instruído

### Qualidade e Padrões
- **Resolução de Imagens**: Mínimo 150 DPI para impressão, 72 DPI para tela
- **Fontes**: Usar apenas fontes embarcadas ou fontes sistema seguras
- **Compatibilidade**: Gerar PDFs compatíveis com PDF 1.4+ (Adobe Reader 5.0+)
- **Acessibilidade**: Incluir tags de acessibilidade quando possível

### Boas Práticas
- Sempre definir margens adequadas (mínimo 2.5cm para impressão)
- Usar espaçamento de linha apropriado (1.15-1.5 para corpo de texto)
- Manter hierarquia visual clara com tamanhos de fonte consistentes
- Otimizar imagens antes de incorporação
- Incluir metadados básicos (autor, título, assunto)

## Templates Disponíveis

### 1. Simple Document
Layout básico para documentos de texto simples
- Margens padrão (2.5cm)
- Fonte: Arial/Helvetica
- Tamanho: 12pt
- Espaçamento: 1.15

### 2. Professional Report
Layout formal para relatórios corporativos
- Cabeçalho e rodapé personalizados
- Numeração de páginas
- Fonte: Times New Roman
- Suporte a seções e capítulos

### 3. Invoice/Receipt
Template para documentos financeiros
- Formatação de tabelas
- Cálculos automáticos
- Logo e informações da empresa
- Layout de duas colunas

### 4. Form Template
Formulários preenchíveis
- Campos de entrada
- Checkboxes e radio buttons
- Validação básica
- Layout estruturado

## Few-Shot Examples

### Exemplo 1: Criar Relatório Simples

**Input do Usuário:**
"Crie um PDF com este conteúdo formatado profissionalmente: [conteúdo em texto]"

**Ação do Agente:**
```python
# Identificar necessidade de criação de PDF formatado
# Carregar skill pdf-formatter
# Executar script de criação

python scripts/create_pdf.py \
  --input /mnt/user-data/uploads/content.txt \
  --template professional \
  --title "Relatório Executivo" \
  --author "Nome do Autor" \
  --output /mnt/user-data/outputs/relatorio.pdf
```

**Output Esperado:**
PDF formatado com:
- Título na primeira página
- Corpo de texto formatado (Times New Roman, 12pt)
- Margens de 2.5cm
- Numeração de páginas no rodapé
- Metadados configurados

---

### Exemplo 2: Mesclar Múltiplos PDFs

**Input do Usuário:**
"Combine estes três PDFs em um único arquivo mantendo a ordem"

**Ação do Agente:**
```python
# Identificar necessidade de mesclagem
# Verificar PDFs de entrada em /mnt/user-data/uploads/
# Executar script de manipulação

python scripts/manipulate_pdf.py \
  --merge \
  --inputs /mnt/user-data/uploads/parte1.pdf \
           /mnt/user-data/uploads/parte2.pdf \
           /mnt/user-data/uploads/parte3.pdf \
  --output /mnt/user-data/outputs/documento_completo.pdf \
  --add-bookmarks
```

**Output Esperado:**
PDF único contendo todas as páginas dos três documentos, com bookmarks opcionais separando seções.

---

### Exemplo 3: Adicionar Marca D'água

**Input do Usuário:**
"Adicione uma marca d'água 'CONFIDENCIAL' em diagonal em todas as páginas deste PDF"

**Ação do Agente:**
```python
# Identificar necessidade de marca d'água
# Carregar PDF existente
# Aplicar overlay de marca d'água

python scripts/add_watermark.py \
  --input /mnt/user-data/uploads/documento.pdf \
  --text "CONFIDENCIAL" \
  --angle 45 \
  --opacity 0.3 \
  --color gray \
  --output /mnt/user-data/outputs/documento_confidencial.pdf
```

**Output Esperado:**
PDF com marca d'água "CONFIDENCIAL" em diagonal, semi-transparente, em todas as páginas.

---

### Exemplo 4: Converter Markdown para PDF

**Input do Usuário:**
"Converta este arquivo Markdown em um PDF bem formatado"

**Ação do Agente:**
```python
# Identificar formato de entrada (Markdown)
# Processar formatação Markdown
# Gerar PDF estruturado

python scripts/convert_to_pdf.py \
  --input /mnt/user-data/uploads/documento.md \
  --format markdown \
  --template professional \
  --preserve-formatting \
  --table-of-contents \
  --output /mnt/user-data/outputs/documento.pdf
```

**Output Esperado:**
PDF com:
- Cabeçalhos formatados hierarquicamente
- Código formatado (se presente)
- Listas e tabelas preservadas
- Índice gerado automaticamente
- Links clicáveis

## Technical Implementation Notes

### Bibliotecas Principais

**ReportLab**: Para criação de PDFs do zero
- Layout preciso com coordenadas
- Controle total sobre formatação
- Suporte a gráficos vetoriais

**PyPDF2/pypdf**: Para manipulação de PDFs existentes
- Mesclagem e divisão
- Extração de páginas
- Rotação e transformações

**Pillow (PIL)**: Para processamento de imagens
- Redimensionamento e otimização
- Conversão de formatos
- Ajuste de qualidade

### Padrões de Código

```python
# Sempre usar context managers para arquivos
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

def create_pdf(content, output_path):
    c = canvas.Canvas(output_path, pagesize=A4)
    # ... código de formatação ...
    c.save()
```

### Tratamento de Erros

```python
try:
    # Operação de PDF
    result = process_pdf(input_file)
except FileNotFoundError:
    print("Erro: Arquivo de entrada não encontrado")
except PermissionError:
    print("Erro: PDF protegido ou sem permissões")
except Exception as e:
    print(f"Erro inesperado: {str(e)}")
```

## Resources Available

- `resources/fonts/`: Fontes TTF customizadas
- `resources/templates/`: Templates de layout predefinidos
- `resources/images/`: Logos e gráficos padrão
- `examples/sample_pdfs/`: PDFs de exemplo para referência

## Error Handling

### Erros Comuns e Soluções

1. **"Font not found"**
   - Solução: Usar fontes padrão ou verificar path em resources/fonts/

2. **"PDF is encrypted"**
   - Solução: Solicitar senha ou informar usuário que arquivo está protegido

3. **"Invalid page range"**
   - Solução: Validar índices de página antes de processar

4. **"Image quality too low"**
   - Solução: Aumentar DPI ou usar imagem de maior resolução

## Output Specifications

### Localização de Arquivos
- **Arquivos Finais**: Sempre salvar em `/mnt/user-data/outputs/`
- **Arquivos Temporários**: Usar `/home/claude/temp_pdfs/` e limpar após uso
- **Logs**: Manter em `/home/claude/pdf_logs/` para debug

### Nomenclatura
- Usar nomes descritivos: `relatorio_vendas_2024.pdf`
- Evitar caracteres especiais
- Incluir timestamps se necessário: `documento_20240130_143022.pdf`

### Metadados Padrão
Sempre incluir:
- Title (título do documento)
- Author (autor ou "Sistema Automatizado")
- Subject (breve descrição)
- Creator (nome da skill: "PDF Formatter Skill")
- Creation Date (data de criação)

## Success Criteria

Um PDF está corretamente formatado quando:
- ✓ Abre sem erros em Adobe Reader e navegadores modernos
- ✓ Todas as fontes estão embarcadas ou substituídas adequadamente
- ✓ Imagens têm resolução apropriada para o uso pretendido
- ✓ Margens são consistentes e adequadas
- ✓ Metadados estão completos
- ✓ Tamanho de arquivo é otimizado (compressão aplicada)
- ✓ Links e bookmarks funcionam corretamente (se aplicável)

## Updates and Maintenance

**Versão 1.0.0** (Atual)
- Criação básica de PDFs
- Manipulação padrão (merge, split, rotate)
- Templates fundamentais
- Suporte a imagens e tabelas

**Roadmap Futuro**
- v1.1.0: Suporte a formulários interativos avançados
- v1.2.0: OCR integrado para PDFs escaneados
- v1.3.0: Assinatura digital de documentos
- v2.0.0: Geração de PDFs a partir de dados estruturados (JSON, XML)
