# Regras para gerar e validar trilhas de criaturas

Este documento é a **fonte de verdade para criar ou alterar qualquer trilha** no `criaturas.json` do cenário (`cenarios/<id>/criaturas.json`).

Antes de considerar a trilha de uma criatura pronta, ela deve passar por todas as regras e pelo checklist deste arquivo.

## 1. Estrutura da trilha

| Premissa | Regra |
|---|---|
| Tamanho | Toda trilha possui **70 quadradinhos**, numerados de 1 a 70. (Revisado em 2026-10-04: antes eram 50.) |
| Posições | Duas marcas nunca podem ocupar o mesmo quadradinho. |
| Ordem | As marcas devem ser gravadas em ordem crescente de posição. |
| Evolução | O marco de evolução não termina a trilha. A criança pode evoluir ou continuar usando a forma atual. |

## 2. O que conta como bônus de atributo

Para as porcentagens e os espaçamentos deste documento, contam somente marcas que aumentam um dos quatro atributos:

- `estrela`: a criança escolhe qual atributo aumentar;
- `forca`: aumenta Força automaticamente.

Não entram nessa contagem:

- `habilidade`;
- `coracao`;
- `poder`;
- `evolucao`.

Essas outras recompensas podem ter regras próprias, mas não consomem o limite de crescimento dos atributos.

## 3. Capacidade extensível

Cada atributo possui:

- **base:** caixas que já começam preenchidas;
- **slots:** total de caixas desenhadas para aquele atributo.

A capacidade extensível de um atributo é:

```text
capacidade do atributo = slots - max(0, base)
```

A capacidade extensível total da criatura é:

```text
capacidade total =
  capacidade de Força
  + capacidade de Energia
  + capacidade de Agilidade
  + capacidade de Defesa
```

Regras obrigatórias:

1. `slots` nunca pode ser menor que a base visível.
2. Base negativa vale zero para este cálculo.
3. Uma melhoria preenche uma caixa vazia.
4. Nenhuma distribuição pode ultrapassar os slots visíveis na carta.

## 4. Limite de bônus de atributo

| Situação da espécie | Máximo de bônus na trilha |
|---|---:|
| Pode evoluir para outra forma | 80% da capacidade extensível (arredondado pra baixo) |
| Não pode evoluir | 60% da capacidade extensível |

O resultado é sempre arredondado para baixo:

```text
limite = floor(capacidade total x percentual)
```

Exemplo:

```text
capacidade extensível total: 8 caixas
criatura evoluível: floor(8 x 0,80) = 6 bônus
```

Mesmo completando toda a trilha, a criatura não deve conseguir preencher todas as caixas extensíveis.

## 5. Posição e espaçamento dos bônus

1. Nenhum bônus de atributo pode ser conquistado no primeiro quadradinho.
2. Devem existir pelo menos **dois quadradinhos antes do primeiro bônus**.
3. Portanto, a primeira posição permitida para um bônus é a posição 3.
4. Devem existir pelo menos **dois quadradinhos entre dois bônus de atributo**.
5. Portanto, a diferença entre as posições de dois bônus consecutivos deve ser de pelo menos 3.

Exemplo válido:

```text
bônus nas posições 3, 6, 10 e 14
```

Exemplos inválidos:

```text
posição 1: cedo demais
posições 5 e 6: consecutivas
posições 5 e 7: existe apenas um quadradinho entre elas
```

A habilidade inicial pode aparecer na posição 1 para identificar o golpe que já vem liberado. Ela não é um bônus de atributo conquistado.

## 6. Distribuição antes e depois da evolução

Para uma forma que pode evoluir:

- aproximadamente 60% dos bônus de atributo ficam antes do marco de evolução;
- os 40% restantes ficam depois do marco de evolução.

Cálculo:

```text
bônus antes = round(total de bônus x 0,60)
bônus depois = total de bônus - bônus antes
```

Exemplo com 6 bônus:

```text
4 bônus antes da evolução
2 bônus depois da evolução
```

O marco de evolução deve ficar cedo o bastante para que todos os bônus posteriores caibam até a posição 50, respeitando o espaçamento mínimo.

## 7. Escolha de evoluir ou continuar

Ao alcançar o marco de evolução, existem duas opções.

### Evoluir imediatamente

- A criança troca para a carta da forma evoluída.
- Todos os atributos já preenchidos são herdados.
- Os bônus ainda não alcançados na carta antiga deixam de ser acessíveis.
- A forma evoluída começa sua própria trilha desde o início.

### Não evoluir agora

- A criança continua usando a mesma carta.
- Ela pode avançar depois do marco de evolução.
- Os 40% finais de bônus de atributo recompensam a decisão de adiar a evolução.
- Se evoluir mais tarde, todos os atributos conquistados até aquele momento são herdados.

## 8. Parâmetros do protótipo das duas primeiras áreas

Dez espécies das duas primeiras áreas do mapa do cenário de testes foram usadas para testar estas regras. Todas são formas iniciais que evoluem.

Neste protótipo:

- cada espécie possui 8 caixas extensíveis no total;
- cada espécie pode receber 6 bônus de atributo;
- 4 bônus ficam antes da evolução;
- 2 bônus ficam depois da evolução;
- foram preservadas 2 melhorias automáticas de Força e 4 estrelas de escolha.

Esses números são parâmetros do protótipo, não uma obrigação para todas as espécies do cenário. As fórmulas das seções anteriores são as regras gerais.

## 9. Checklist obrigatório de validação

Antes de salvar uma trilha no `criaturas.json` do cenário, confirmar:

- [ ] A trilha tem posições somente entre 1 e 70.
- [ ] Nenhuma posição está repetida.
- [ ] As marcas estão ordenadas por posição.
- [ ] Todos os atributos têm `slots >= max(0, base)`.
- [ ] A capacidade extensível foi calculada descontando a base.
- [ ] `estrela` e `forca` foram somadas como bônus de atributo.
- [ ] Criatura evoluível não ultrapassa 80% da capacidade extensível.
- [ ] Criatura não evoluível não ultrapassa 60% da capacidade extensível.
- [ ] O limite percentual foi arredondado para baixo.
- [ ] O primeiro bônus de atributo está na posição 3 ou depois.
- [ ] Há pelo menos dois quadradinhos entre bônus de atributo.
- [ ] Em formas evoluíveis, aproximadamente 60% dos bônus estão antes da evolução.
- [ ] Os bônus restantes estão depois da evolução e cabem até a posição 50.
- [ ] A evolução não apaga atributos já conquistados.
- [ ] Terminar a trilha não permite preencher toda a capacidade extensível.

Se qualquer item falhar, a trilha ainda não está pronta para impressão.



## 10. Revisão 2026-10-04: calibração pelo nível de referência

Decisões do autor após o playtest 1. Substituem as regras de posição de evolução e de habilidade das seções anteriores onde houver conflito.

### 10.1 Trilho

- Todas as cartas têm **70 quadradinhos**. Não há trilho diferente pra formas iniciais.
- O trilho é distribuído dentro dos 70, respeitando as regras de bônus das seções 2 a 6.

### 10.2 Evolução

Regra do autor, com base no nível de evolução de referência de cada espécie (`L`). O nível de referência vem do cenário (no cenário de testes, o nível de uma tabela de referência):

- **Primeiro estágio** (forma que evolui pela primeira vez):
  ```text
  quadradinho da evolução = clamp(2 x L1, 10, 50)
  ```
  Onde `L1` é o nível de referência em que a forma evolui. Piso de **10** e teto de **50** (ex.: forma inicial que evolui no nível 7 → quadradinho 14; forma intermediária que evolui no nível 10, Lv 10 − 7 = 3 → 6, sobe pra 10).

- **Segundo estágio** (forma que já veio de uma evolução e evolui de novo):
  ```text
  quadradinho da evolução = clamp(2 x (L2 - L1), 10, 50)
  ```
  Onde `L2` é o nível em que a forma evolui pela segunda vez e `L1` é o nível da primeira evolução da linha. Ou seja: o tempo que a criança passa na forma intermediária, medido em níveis de referência, multiplicado por 2.

Exemplo do autor (valores do autor, não da referência real):
```text
Forma inicial evolui no 16 (referência)    -> 2 x 16 = 32  -> quadradinho 32
Forma intermediária evolui no 32 (autor)   -> 2 x (32 - 16) = 32 -> quadradinho 32
Forma final: última forma, sem evolução
```

Observações:
- A fórmula mede **os níveis gastos em cada estágio**, não a posição absoluta na linha evolutiva. Isso é coerente com a regra de trilho vazio na evolução (decisão de 2026-10-04): cada carta conta do zero, e o quadradinho da evolução é o tempo gasto na forma.
- **Confirmado pelo autor:** usa o **nível de referência real**. Ex.: a forma intermediária evolui no 36 → 2 x (36 - 16) = **40**.
- **Evolução por pedra:** a posição é **40**, sem nível de referência. Quando a espécie tem mais de uma pedra (ex.: uma criatura com várias evoluções possíveis), **todas ficam no 40**, com um único marcador de evolução (símbolo de pedra). A criança escolhe a pedra quando chegar lá. Pode repetir a posição: é o único caso permitido.
- **Evolução por troca** (quatro espécies no cenário de testes): posição **40**, igual à pedra. Confirmado pelo autor.

### 10.3 Habilidades

Revisado pelo autor: o nível de referência é **inspiração**, não regra exata. O ajuste final é de feeling. O objetivo é que as habilidades não cheguem cedo demais nem tarde demais.

- **Quantidade:** cada espécie tem tantas habilidades quanto golpes ela tem na carta (2 a 4). Os dois casulos de inseto do cenário de testes têm 2, o que é característico deles.
- **Primeira habilidade:** sempre no quadradinho 1 (golpe que já vem liberado).
- **Demais habilidades:** posições inspiradas no nível de referência em que a espécie aprende o golpe, mas ajustadas pelo feeling. Guia proposto (a ajustar):
  - 2ª habilidade: entre o quadradinho 5 e o 20.
  - 3ª habilidade: entre o quadradinho 15 e o 40.
  - 4ª habilidade: entre o quadradinho 30 e o 65.
- **Espaçamento:** pelo menos 3 casas entre habilidades. Não podem ficar muito próximas.
- **Paridade com evolução:** não é obrigatório ter todas antes de evoluir. Vale a sensação de progressão, não um número fixo.
- **Não podem cair em cima de bônus nem de marco de evolução.**

Glossário, pra não confundir: **habilidade** é a marca do trilho que libera um golpe da carta. Cada golpe da carta é liberado pela habilidade de mesmo número: golpe 1 pela habilidade 1, golpe 2 pela habilidade 2, e assim por diante. Golpe liberado = quadrado marcado na carta.

### 10.4 Pendências desta revisão

1. ~~4 habilidades antes de evoluir~~: **revogado.** Agora é de feeling. Habilidades ficam conforme o guia da seção 10.3, com ajuste do autor.
2. **Habilidades 2 a 4:** confirmar a regra "1º, 3º e 5º × 2". O multiplicador pode levar uma habilidade pra depois de 40 ou de 70. Se acontecer, precisa de regra de corte.
3. **Golpe de nível 2 (ex.: criatura fraca que aprende o segundo golpe cedo):** o quadradinho 1 é sempre habilidade 1. Pendente: se um golpe de nível 2 pode virar habilidade 2 no quadradinho 2 (fica fora da regra da seção 10.3 por enquanto).
4. ~~Piso 40 em todas~~: **descartado.** Piso de 10 nas de nível, 40 nas de pedra e troca.
5. **Golpes fortes e fracos:** itens de dados, fora deste documento. Golpes de área e habilidades de status: versão 2.


### 10.5 Atributos começam vazios

- Confirmado pelo autor ("isso"): as criaturas **não começam com atributos pré-preenchidos**. A coluna `base` vira 0 pra todas as espécies. A diferença de velocidade vem do número de **slots** por atributo.
- Consequência: capacidade extensível = slots (`max(0, base)` = 0). Os limites de bônus (80% e 60%) são recalculados por esse valor.
- Formas evoluídas herdam os atributos atribuídos (decisão do autor, rodada 2).

## 11. Calibração 2026-10-04

- **Total de slots por estágio:** inicial 12, sem evolução 20, raro 28. Formas evoluídas herdam os slots da forma-raiz. A divisão entre atributos segue o perfil da espécie (stats de referência do cenário), com mínimo 1 por atributo.
- **Marca de Poder:** `detalhe` é o número do golpe (1 a 4), não o nome.
