---
name: code-optimizer-agent
version: 1.0.0
description: Use esta skill quando o usuário solicitar otimização de código, refatoração, remoção de duplicações, análise de complexidade, simplificação de lógica, melhoria de performance, redução de linhas de código, eliminação de code smells, ou qualquer tarefa relacionada a melhorar a qualidade, eficiência e manutenibilidade do código existente. Ativa para pedidos de revisão de código, linting avançado, refactoring automatizado, ou análise estática de qualquer linguagem (Python, JavaScript, TypeScript, Java, Go, etc).
author: Antigravity Skills - Code Quality Team
tags:
  - code-optimization
  - refactoring
  - code-quality
  - static-analysis
  - performance
  - clean-code
  - automation
  - linting
dependencies:
  - python >= 3.8
  - node >= 18.0.0
---

# Code Optimizer Agent

## Goal

Analisar automaticamente código-fonte em múltiplas linguagens, identificar oportunidades de otimização, eliminar duplicações, reduzir complexidade, corrigir erros e refatorar para produzir código mais limpo, eficiente e manutenível, mantendo sempre a funcionalidade original.

## Core Capabilities

### 1. Análise Estática Profunda
- Detecção de código duplicado
- Análise de complexidade ciclomática
- Identificação de code smells
- Verificação de padrões anti-pattern
- Análise de dependências não utilizadas

### 2. Otimizações Automáticas
- Remoção de código morto (dead code)
- Simplificação de condicionais complexas
- Consolidação de imports/requires
- Extração de funções repetidas
- Inline de variáveis desnecessárias

### 3. Refatorações Seguras
- Extract Method/Function
- Extract Variable/Constant
- Rename para clareza
- Move to appropriate location
- Convert to modern syntax

### 4. Melhorias de Performance
- Otimização de loops
- Cache de resultados (memoization)
- Lazy evaluation quando apropriado
- Redução de alocações desnecessárias
- Uso eficiente de estruturas de dados

### 5. Padrões de Qualidade
- Aplicação de princípios SOLID
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple, Stupid)
- YAGNI (You Aren't Gonna Need It)
- Clean Code principles

## Supported Languages

- **Python** (3.8+)
- **JavaScript** (ES6+)
- **TypeScript** (4.0+)
- **Java** (8+)
- **Go** (1.18+)
- **C#** (.NET 6+)
- **Ruby** (3.0+)
- **PHP** (8.0+)

## Instructions

### Quando Ativar Esta Skill

Esta skill deve ser ativada quando o usuário mencionar:
- Otimizar código
- Refatorar código
- Remover duplicações
- Melhorar performance
- Simplificar lógica
- Reduzir complexidade
- Limpar código
- Revisar qualidade
- Eliminar código morto
- Aplicar melhores práticas

### Workflow de Otimização

#### 1. Análise Inicial
```bash
# Executar análise completa do projeto
python scripts/analyze_code.py --path /caminho/do/projeto --language python

# Gera relatório com:
# - Duplicações encontradas
# - Complexidade por função
# - Code smells identificados
# - Imports não utilizados
# - Funções muito longas
# - Métricas de qualidade
```

#### 2. Priorização
```
O agente classifica otimizações por:
- CRÍTICO: Erros e bugs potenciais
- ALTO: Duplicações significativas (>10 linhas)
- MÉDIO: Complexidade alta (CC > 10)
- BAIXO: Melhorias de estilo
```

#### 3. Aplicação de Otimizações
```bash
# Modo interativo (recomendado)
python scripts/optimize_code.py --path arquivo.py --interactive

# Modo automático (aplicar todas otimizações seguras)
python scripts/optimize_code.py --path arquivo.py --auto --safe-only

# Modo específico
python scripts/optimize_code.py --path arquivo.py --fix duplications,complexity
```

#### 4. Validação
```bash
# Executar testes antes e depois
python scripts/validate_optimization.py --before /original --after /otimizado

# Verifica:
# - Testes continuam passando
# - Comportamento mantido
# - Performance melhorou
# - Métricas de qualidade
```

### Análise de Código

#### Detecção de Duplicações

O agente usa algoritmo de similaridade para encontrar:

**Duplicação Exata:**
```python
# ANTES (duplicação)
def calcular_preco_produto_a():
    preco_base = 100
    desconto = 0.1
    return preco_base * (1 - desconto)

def calcular_preco_produto_b():
    preco_base = 200
    desconto = 0.1
    return preco_base * (1 - desconto)

# DEPOIS (otimizado)
def calcular_preco_com_desconto(preco_base, desconto=0.1):
    return preco_base * (1 - desconto)

preco_produto_a = calcular_preco_com_desconto(100)
preco_produto_b = calcular_preco_com_desconto(200)
```

**Duplicação Estrutural:**
```python
# ANTES
if user.is_authenticated():
    if user.has_permission('admin'):
        if user.is_active:
            return True
    return False

# DEPOIS
return (user.is_authenticated() and 
        user.has_permission('admin') and 
        user.is_active)
```

#### Simplificação de Complexidade

**Extração de Método:**
```python
# ANTES (complexidade ciclomática = 8)
def processar_pedido(pedido):
    if pedido.status == 'novo':
        if pedido.valor > 1000:
            if pedido.cliente.vip:
                desconto = 0.2
            else:
                desconto = 0.1
        else:
            desconto = 0.05
        pedido.aplicar_desconto(desconto)
        pedido.status = 'processado'
        enviar_email(pedido.cliente)
        atualizar_estoque(pedido.itens)
        gerar_nota_fiscal(pedido)
    return pedido

# DEPOIS (complexidade ciclomática = 2 por função)
def calcular_desconto(pedido):
    if pedido.valor > 1000:
        return 0.2 if pedido.cliente.vip else 0.1
    return 0.05

def finalizar_pedido(pedido):
    enviar_email(pedido.cliente)
    atualizar_estoque(pedido.itens)
    gerar_nota_fiscal(pedido)

def processar_pedido(pedido):
    if pedido.status == 'novo':
        desconto = calcular_desconto(pedido)
        pedido.aplicar_desconto(desconto)
        pedido.status = 'processado'
        finalizar_pedido(pedido)
    return pedido
```

#### Otimização de Loops

**Lista Comprehension:**
```python
# ANTES
resultados = []
for item in items:
    if item.is_valid():
        resultados.append(item.process())

# DEPOIS
resultados = [item.process() for item in items if item.is_valid()]
```

**Early Return:**
```python
# ANTES
def buscar_usuario(id):
    usuario = None
    if id > 0:
        usuario = db.query(User).filter_by(id=id).first()
        if usuario:
            if usuario.is_active:
                return usuario
    return None

# DEPOIS
def buscar_usuario(id):
    if id <= 0:
        return None
    
    usuario = db.query(User).filter_by(id=id).first()
    if not usuario or not usuario.is_active:
        return None
    
    return usuario
```

### Otimizações por Linguagem

#### Python

**Imports Optimization:**
```python
# ANTES
import os
import sys
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any
import requests
import json

# DEPOIS (removendo não utilizados, organizando)
from datetime import datetime, timedelta
from typing import List, Dict

import requests
```

**Type Hints:**
```python
# ANTES
def processar(dados, opcoes):
    return resultado

# DEPOIS
def processar(dados: List[Dict[str, Any]], opcoes: Dict[str, bool]) -> Dict[str, Any]:
    return resultado
```

**F-strings:**
```python
# ANTES
mensagem = "Olá, " + nome + "! Você tem " + str(idade) + " anos."

# DEPOIS
mensagem = f"Olá, {nome}! Você tem {idade} anos."
```

#### JavaScript/TypeScript

**Arrow Functions:**
```javascript
// ANTES
const numeros = [1, 2, 3, 4, 5];
const dobrados = numeros.map(function(n) {
    return n * 2;
});

// DEPOIS
const dobrados = numeros.map(n => n * 2);
```

**Destructuring:**
```javascript
// ANTES
function exibirUsuario(usuario) {
    console.log(usuario.nome);
    console.log(usuario.email);
    console.log(usuario.idade);
}

// DEPOIS
function exibirUsuario({ nome, email, idade }) {
    console.log(nome);
    console.log(email);
    console.log(idade);
}
```

**Optional Chaining:**
```javascript
// ANTES
const cidade = usuario && usuario.endereco && usuario.endereco.cidade;

// DEPOIS
const cidade = usuario?.endereco?.cidade;
```

**Async/Await:**
```javascript
// ANTES
function buscarDados() {
    return fetch('/api/dados')
        .then(response => response.json())
        .then(data => processar(data))
        .catch(error => console.error(error));
}

// DEPOIS
async function buscarDados() {
    try {
        const response = await fetch('/api/dados');
        const data = await response.json();
        return processar(data);
    } catch (error) {
        console.error(error);
    }
}
```

## Constraints

### Segurança nas Otimizações

**NUNCA Modificar:**
- Lógica de negócio sem confirmação
- APIs públicas (breaking changes)
- Código com testes falhando
- Arquivos de configuração críticos
- Código com comentários "DO NOT CHANGE"

**SEMPRE Preservar:**
- Comportamento funcional
- Cobertura de testes
- Compatibilidade de API
- Performance (nunca piorar)
- Comentários importantes

**VALIDAR Antes de Aplicar:**
- Executar suite de testes
- Comparar outputs
- Verificar performance
- Revisar mudanças críticas

### Limites de Otimização

**Complexidade Ciclomática:**
- Alvo: < 10 por função
- Máximo aceitável: 15
- Crítico: > 20 (refatoração obrigatória)

**Tamanho de Função:**
- Alvo: < 20 linhas
- Máximo aceitável: 50 linhas
- Crítico: > 100 linhas

**Duplicação:**
- Mínimo para reportar: 6 linhas
- Mínimo para refatorar: 10 linhas
- Prioridade alta: > 50 linhas duplicadas

**Profundidade de Aninhamento:**
- Alvo: < 3 níveis
- Máximo aceitável: 4 níveis
- Crítico: > 5 níveis

## Metrics and Reporting

### Métricas Coletadas

```json
{
  "before": {
    "total_lines": 1500,
    "code_lines": 1200,
    "comment_lines": 200,
    "blank_lines": 100,
    "functions": 45,
    "classes": 8,
    "avg_complexity": 6.5,
    "max_complexity": 18,
    "duplications": 12,
    "code_smells": 23,
    "maintainability_index": 65
  },
  "after": {
    "total_lines": 1100,
    "code_lines": 950,
    "comment_lines": 200,
    "blank_lines": 100,
    "functions": 52,
    "classes": 8,
    "avg_complexity": 4.2,
    "max_complexity": 9,
    "duplications": 2,
    "code_smells": 5,
    "maintainability_index": 82
  },
  "improvements": {
    "lines_reduced": 400,
    "complexity_reduced": 2.3,
    "duplications_removed": 10,
    "code_smells_fixed": 18,
    "maintainability_gain": 17
  }
}
```

### Relatório de Otimização

```markdown
# Code Optimization Report

## Summary
- **Lines Reduced**: 400 (26.7%)
- **Complexity Improved**: -35.4%
- **Duplications Removed**: 10
- **Code Smells Fixed**: 18
- **Maintainability**: 65 → 82 (+26.2%)

## Changes Applied

### 1. Extract Method (12 occurrences)
- `processar_pedido()` → split into 3 functions
- `validar_usuario()` → extracted validation logic
- ...

### 2. Remove Duplications (10 occurrences)
- Lines 45-60 and 120-135 in `models.py` → extracted to `_calculate_price()`
- ...

### 3. Simplify Conditionals (15 occurrences)
- Replaced nested if with early returns
- ...

### 4. Optimize Imports (5 files)
- Removed unused imports
- Organized by standard library / third-party / local
```

## Few-Shot Examples

### Exemplo 1: Otimização de Arquivo Python

**Input do Usuário:**
```
Otimize este arquivo Python, ele tem muitas duplicações e funções complexas
```

**Ação do Agente:**
```bash
# 1. Analisar arquivo
python scripts/analyze_code.py --path user_service.py

# Output:
# ✗ Found 3 code duplications (45 lines total)
# ✗ 2 functions with high complexity (CC > 10)
# ✗ 5 unused imports
# ✗ 8 code smells detected

# 2. Aplicar otimizações
python scripts/optimize_code.py --path user_service.py --interactive

# Mostra cada otimização e pede confirmação:
# [1/12] Extract duplicated code (lines 45-60, 120-135)?
#   → Will create new function: _calculate_user_discount()
#   → Saves: 30 lines
#   Apply? [y/N]:
```

**Output Otimizado:**
```python
# ANTES (150 linhas, complexidade 12)
class UserService:
    def get_premium_users(self):
        users = []
        for user in self.db.query(User).all():
            if user.subscription:
                if user.subscription.status == 'active':
                    if user.subscription.plan in ['premium', 'enterprise']:
                        if user.payment_method:
                            if user.payment_method.is_valid():
                                users.append(user)
        return users
    
    def get_trial_users(self):
        users = []
        for user in self.db.query(User).all():
            if user.subscription:
                if user.subscription.status == 'active':
                    if user.subscription.plan == 'trial':
                        if user.payment_method:
                            if user.payment_method.is_valid():
                                users.append(user)
        return users

# DEPOIS (85 linhas, complexidade 4)
class UserService:
    def _has_valid_subscription(self, user: User, plans: List[str]) -> bool:
        """Verifica se usuário tem subscription válida nos planos especificados."""
        return (
            user.subscription and
            user.subscription.status == 'active' and
            user.subscription.plan in plans and
            user.payment_method and
            user.payment_method.is_valid()
        )
    
    def get_premium_users(self) -> List[User]:
        """Retorna usuários com planos premium ou enterprise ativos."""
        return [
            user for user in self.db.query(User).all()
            if self._has_valid_subscription(user, ['premium', 'enterprise'])
        ]
    
    def get_trial_users(self) -> List[User]:
        """Retorna usuários com plano trial ativo."""
        return [
            user for user in self.db.query(User).all()
            if self._has_valid_subscription(user, ['trial'])
        ]
```

---

### Exemplo 2: Refatoração JavaScript

**Input do Usuário:**
```
Este código JavaScript está muito confuso, pode simplificar?
```

**Output:**
```javascript
// ANTES (complexidade 15, 80 linhas)
function processOrder(order) {
    if (order) {
        if (order.items) {
            if (order.items.length > 0) {
                let total = 0;
                for (let i = 0; i < order.items.length; i++) {
                    const item = order.items[i];
                    if (item.price) {
                        if (item.quantity) {
                            total = total + item.price * item.quantity;
                        }
                    }
                }
                
                let discount = 0;
                if (order.customer) {
                    if (order.customer.vip) {
                        discount = 0.2;
                    } else {
                        if (total > 1000) {
                            discount = 0.1;
                        } else {
                            discount = 0.05;
                        }
                    }
                }
                
                const finalTotal = total * (1 - discount);
                return finalTotal;
            }
        }
    }
    return 0;
}

// DEPOIS (complexidade 3, 35 linhas)
function processOrder(order) {
    if (!order?.items?.length) {
        return 0;
    }
    
    const total = calculateTotal(order.items);
    const discount = calculateDiscount(order.customer, total);
    
    return total * (1 - discount);
}

function calculateTotal(items) {
    return items.reduce((sum, item) => {
        return sum + (item.price ?? 0) * (item.quantity ?? 0);
    }, 0);
}

function calculateDiscount(customer, total) {
    if (customer?.vip) {
        return 0.2;
    }
    return total > 1000 ? 0.1 : 0.05;
}
```

---

### Exemplo 3: Análise de Projeto Completo

**Input:**
```
Analise todo o projeto e me dê um relatório de otimizações possíveis
```

**Ação:**
```bash
python scripts/analyze_project.py --path /projeto --output report.md
```

**Output (report.md):**
```markdown
# Project Optimization Analysis

## Executive Summary
- **Total Files**: 156
- **Lines of Code**: 42,580
- **Optimization Potential**: HIGH
- **Estimated Reduction**: ~8,500 lines (20%)

## Critical Issues (Fix Immediately)

### 1. High Complexity Functions (12 found)
| File | Function | Complexity | Lines |
|------|----------|------------|-------|
| services/order.py | process_bulk_order | 24 | 180 |
| utils/validator.py | validate_all_fields | 18 | 120 |

**Recommendation**: Extract methods, apply early returns

### 2. Major Duplications (8 found)
| Files | Lines | Similarity |
|-------|-------|------------|
| models/user.py, models/admin.py | 85 | 95% |
| services/email.py (3 locations) | 45 | 100% |

**Recommendation**: Create shared utilities

## High Priority

### 3. Code Smells (67 found)
- Long functions: 23
- Deep nesting: 18
- Many parameters: 12
- Dead code: 14

### 4. Performance Issues (15 found)
- N+1 queries: 8
- Inefficient loops: 5
- Missing indexes: 2

## Recommendations

1. **Immediate Actions**
   - Refactor 12 high-complexity functions
   - Extract 8 major duplications
   - Remove 14 dead code sections

2. **Short Term** (1-2 weeks)
   - Apply list comprehensions
   - Optimize database queries
   - Add type hints

3. **Long Term**
   - Implement design patterns
   - Create utility libraries
   - Establish code review process

## Automated Fixes Available
Run: `python scripts/optimize_project.py --auto --safe-only`
This will safely apply 45 optimizations without risk.
```

---

### Exemplo 4: Otimização de Performance

**Input:**
```
Este loop está muito lento, como otimizar?
```

**Análise:**
```python
# ANTES (O(n²), ~5 segundos para 10k items)
def find_duplicates(items):
    duplicates = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j]:
                if items[i] not in duplicates:
                    duplicates.append(items[i])
    return duplicates

# DEPOIS (O(n), ~0.05 segundos para 10k items)
def find_duplicates(items):
    seen = set()
    duplicates = set()
    
    for item in items:
        if item in seen:
            duplicates.add(item)
        else:
            seen.add(item)
    
    return list(duplicates)

# Melhoria: 100x mais rápido
```

---

### Exemplo 5: TypeScript Moderno

**Input:**
```
Modernize este código TypeScript para usar as features mais recentes
```

**Output:**
```typescript
// ANTES (TypeScript antigo)
interface User {
    id: number;
    name: string;
    email: string;
}

function getUser(id: number): Promise<User | null> {
    return fetch('/api/users/' + id)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            return data;
        })
        .catch(function(error) {
            console.error(error);
            return null;
        });
}

// DEPOIS (TypeScript moderno)
interface User {
    id: number;
    name: string;
    email: string;
}

async function getUser(id: number): Promise<User | null> {
    try {
        const response = await fetch(`/api/users/${id}`);
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Com type guard
function isUser(data: unknown): data is User {
    return (
        typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        'name' in data &&
        'email' in data
    );
}

async function getUserSafe(id: number): Promise<User | null> {
    try {
        const response = await fetch(`/api/users/${id}`);
        const data: unknown = await response.json();
        return isUser(data) ? data : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}
```

## Advanced Features

### AI-Powered Suggestions

O agente usa análise semântica para sugerir otimizações contextuais:

```python
# Detecta padrão Strategy e sugere
class PaymentProcessor:
    def process(self, payment_type, amount):
        if payment_type == 'credit_card':
            # lógica cartão
        elif payment_type == 'debit':
            # lógica débito
        elif payment_type == 'pix':
            # lógica pix

# Sugere refatoração para Strategy Pattern
class PaymentStrategy(ABC):
    @abstractmethod
    def process(self, amount): pass

class CreditCardPayment(PaymentStrategy):
    def process(self, amount): ...

class PaymentProcessor:
    def __init__(self, strategy: PaymentStrategy):
        self.strategy = strategy
    
    def process(self, amount):
        return self.strategy.process(amount)
```

### Batch Processing

```bash
# Otimizar múltiplos arquivos
python scripts/optimize_batch.py \
    --path src/**/*.py \
    --output report.json \
    --auto \
    --safe-only
```

### Git Integration

```bash
# Criar branch com otimizações
python scripts/optimize_and_commit.py \
    --branch feature/code-optimization \
    --message "refactor: apply automated code optimizations"
```

## Configuration

```yaml
# .code-optimizer.yml
analysis:
  languages:
    - python
    - javascript
    - typescript
  
  thresholds:
    complexity: 10
    duplication_lines: 6
    function_lines: 50
    nesting_depth: 3
  
  rules:
    - remove_dead_code
    - simplify_conditionals
    - extract_duplications
    - optimize_imports
    - apply_type_hints
  
optimization:
  auto_apply:
    - remove_unused_imports
    - format_code
    - sort_imports
  
  interactive:
    - extract_method
    - rename_variables
    - change_signature
  
  never_auto:
    - remove_functions
    - change_api
    - modify_tests

reporting:
  format: markdown
  include_metrics: true
  show_diffs: true
  output: optimization_report.md
```

## Success Metrics

Uma otimização é considerada bem-sucedida quando:
- ✓ Todos os testes continuam passando
- ✓ Complexidade ciclomática reduzida
- ✓ Número de linhas reduzido (sem perda de funcionalidade)
- ✓ Duplicações eliminadas
- ✓ Maintainability Index aumentado
- ✓ Performance mantida ou melhorada
- ✓ Cobertura de testes mantida
- ✓ Linters sem novos warnings

## Resources Available

- `resources/patterns/` - Padrões de otimização por linguagem
- `resources/rules/` - Regras de refatoração
- `resources/benchmarks/` - Benchmarks de performance
- `examples/` - Exemplos antes/depois

## Updates

**v1.0.0** (Atual)
- Suporte a Python, JavaScript, TypeScript
- Análise de complexidade e duplicações
- Otimizações automáticas seguras
- Relatórios detalhados
- Validação com testes
