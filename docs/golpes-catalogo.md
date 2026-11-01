# Construtor de golpes (rascunho v0.2)

Substitui a v0.1 (lista fechada de 48 golpes). Ideia do autor: em vez de uma lista de golpes, existe uma lista de **peças**. Cada golpe é montado com essas peças, e cada peça tem um **peso** em pontos. O nome do golpe é **narrativo**, escolhido pra combinar com a criatura (só uma ave lendária de fogo tem "Asas de Fogo"). O balanceamento acontece pela soma de pesos dos 4 golpes.

Status: **aprovado pelo autor em 2026-10-04** (todas as decisões da seção 4). Pesos e orçamentos são o ponto de partida, a calibrar no simulador.

## 1. Peças de um golpe

Todo golpe é: **dado + atributo + elemento + cargas + (efeito) + (área)**.

### 1.1 Dado (dano)

| Dado | Média | Peso |
|---|---|---|
| d4 | 2,5 | 1 |
| d6 | 3,5 | 2 |
| d8 | 4,5 | 3 |
| d12 | 6,5 | 5 |

Golpe de suporte (sem dano) não tem dado: peso 0 nessa peça.

### 1.2 Atributo

**Força** (golpe físico) ou **Energia** (golpe elemental). Peso **0**: é só o estilo do golpe.

### 1.3 Elemento

Qualquer tipo da lista do cenário (`cenarios/<id>/tipos.json`: fogo, água, planta…), ou neutro. Peso **0**: a tabela de tipos já equilibra vantagem e desvantagem.

### 1.4 Cargas (usos)

| Cargas | Peso |
|---|---|
| Ilimitado | 0 |
| 3 usos | −1 |
| 2 usos | −1 |
| 1 uso | −2 |

Golpe limitado fica mais barato, e por isso pode ter um dado maior pelo mesmo custo.

### 1.5 Efeito (opcional, no máximo um por golpe)

Negativos (no alvo, só se acertar):

| Efeito | O que faz | Peso |
|---|---|---|
| Fraqueza | −2 no dano dos golpes do alvo | 1 |
| Veneno | Alvo perde 1 coração no fim de cada turno dele | 2 |
| Paralisia | No turno do alvo, d10 de 1 a 4: não ataca | 2 |
| Sono | Alvo perde o próximo turno | 2 |

Positivos (na própria criatura):

| Efeito | O que faz | Peso |
|---|---|---|
| Ligeiro | +3 de Agilidade (máximo 8) | 1 |
| Escudo | O próximo golpe recebido faz 0 | 1 |
| Força Extra | +2 no dano dos próprios golpes | 2 |
| Cura | Recupera 1d6 corações | 2 |

Regras de efeito: cada um é um token com desenho; não acumula; sai no fim da luta (Sono e Escudo saem depois de agir).

### 1.6 Área (opcional)

Acerta **todos os inimigos**. Peso **+2**. Rola o dano uma vez; cada alvo aplica a própria resistência e Defesa; o acerto (d10) é rolado contra cada alvo.

## 2. Peso de um golpe

```text
peso do golpe = dado + cargas + efeito + área   (mínimo 0)
```

Exemplos:

| Golpe (nome narrativo) | Montagem | Peso |
|---|---|---|
| Fagulha | d4, Energia, fogo, ilimitado | 1 |
| Labareda | d8, Energia, fogo, 2 usos | 2 |
| Asas de Fogo (ave lendária de fogo) | d12, Energia, fogo, 1 uso, área | 5 |
| Picada Tóxica | d4, Força, veneno, 3 usos, Veneno | 2 |
| Pó Sonolento | suporte, 2 usos, Sono | 1 |
| Onda Mental (criatura rara psíquica) | d12, Energia, psíquico, 2 usos, Paralisia | 6 |

## 3. Orçamento por criatura

A soma dos pesos dos 4 golpes tem um teto pelo estágio. Isso define o quanto a criatura é forte.

| Estágio | Orçamento (soma dos 4) |
|---|---|
| Inicial | 6 |
| Intermediária | 9 |
| Final | 12 |
| Sem evolução comum | 11 |
| Raro (lendárias e únicas, campo `raro`) | 16 |

A evolução sobe o orçamento: a forma nova ganha golpes mais fortes (mesmo nome narrativo com dado maior, ou golpe novo). Isso substitui a regra antiga "o dado sobe um degrau por forma".

Regras de montagem:

1. **Golpe 1 é sempre ilimitado** (a criança sempre tem algo pra fazer).
2. No máximo **um golpe de suporte** por carta.
3. Pelo menos **um golpe do tipo principal** da espécie.
4. d12 só em forma final, raro ou espécie sem evolução (sem evolução conta como forma final; ajuste da montagem, pra caber no orçamento 11).

## 4. Decisões em aberto

1. **d12 entra?** A regra atual só permite d4, d6 e d8. Com o d12, os golpes máximos sobem bem (6,5 de média).
2. **Pesos:** a tabela de pesos (dado 1/2/3/5, cargas, efeitos 1–2, área +2) está boa como ponto de partida?
3. **Orçamentos por estágio:** 6 / 9 / 12 / 11 / 16.
4. **Regras de montagem:** golpe 1 ilimitado, um suporte no máximo, d12 só em final ou raro.
5. **Efeitos:** os 4 negativos e 4 positivos ficam assim?

Depois de fechar isso, o próximo passo é montar os 4 golpes de cada espécie do cenário (nome narrativo + peças; 151 no cenário de testes), validar o orçamento por script, e só então voltar ao balanceamento.
