# Simulador de batalhas

Combate 1 contra 1 entre duas cartas, para comparar espécies. Lê as criaturas do cenário (`cenarios/<id>/criaturas.json`; padrão em `cenarios/padrao.txt`, ou `KINDLEWILD_CENARIO=<id>`) e segue as regras de `docs/especificacao.md` (seções 6 e 15) e `docs/golpes-catalogo.md` (peças e efeitos dos golpes). Não altera dados nem a especificação.

## Como rodar

```bash
node sim/rodar.js 25 1
```

Saída: uma linha por progresso e por confronto, com a taxa de vitória de cada lado, a taxa de empate e a média de turnos.

Exemplos:

```bash
node sim/rodar.js 25 1 --progresso 10,35,70 --n 2000
node sim/rodar.js 25,26 1,2 --politica aleatoria --estrelas forca
node sim/rodar.js 25 1 --seed 777
node sim/rodar.js --listar
node sim/rodar.js --ajuda
```

Testes do motor:

```bash
node sim/validacao.js
```

## Parâmetros da CLI

| Opção | Padrão | O que faz |
|---|---|---|
| `A`, `B` (posicionais) | obrigatório | Nome da carta (sem acento, caixa indiferente) ou número da criatura. Aceita lista separada por vírgula: todos contra todos. |
| `--progresso` | `10,35,70` | Posições do trilho, de 0 a 70, separadas por vírgula. Cada valor gera uma linha por confronto. |
| `--n` | `2000` | Batalhas por confronto e progresso. |
| `--politica` | `padrao` | Escolha de golpe. `padrao`: maior valor esperado (dano + efeito) entre os disponíveis. `aleatoria`: sorteia entre os disponíveis. |
| `--estrelas` | `igual` | Distribuição das estrelas. `igual`: uma por vez em Força, Energia, Agilidade e Defesa. `forca`: primeiro Força e Energia, depois Agilidade e Defesa. `agilidade`: primeiro Agilidade, depois os outros. |
| `--seed` | `12345` | Semente. Mesma semente e mesmos parâmetros dão exatamente o mesmo resultado. Cada confronto começa com a mesma semente, então os confrontos são comparáveis entre si. |
| `--listar` | | Lista as criaturas do cenário com número. |

Os lotes do projeto usam `N=2000`, progresso 10, 25 e 50, política padrão e semente padrão.

## Arquivos

- `motor.js`: `batalha(a, b, opcoes)` roda o combate e devolve `{ vencedor: 'a' | 'b' | null, motivo: 'KO' | 'limite', turnos, vidaRestante, log }`. Também exporta `resolverAtaque`, `calcularDano`, `probAcerto`, `aplicarEfeito`, `agilidadeEfetiva`, `criarRng`.
- `carta.js`: `montarCarta(especie, { progresso, estrelas })` monta a carta de combate a partir do JSON. `buscarEspecie(ref)` resolve nome ou número.
- `politica.js`: políticas de golpe (`padrao`, `aleatoria`) e de estrelas (`distribuirEstrelas`).
- `rodar.js`: CLI.
- `validacao.js`: testes do motor (41 testes).
- `fixtures/especies.json`: espécies de teste (formato novo, formato antigo, teto de vida), independentes do cenário.

Uso programático:

```js
const { buscarEspecie, montarCarta } = require('./sim/carta');
const { batalha, criarRng } = require('./sim/motor');

const a = montarCarta(buscarEspecie('25'), { progresso: 25 });
const b = montarCarta(buscarEspecie('1'), { progresso: 25 });
const r = batalha(a, b, { seed: 12345 });   // não altera a, nem b
console.log(r.vencedor, r.turnos);
```

`batalha` copia as cartas por dentro, então a mesma carta pode ser usada em milhares de batalhas.

## Formato de golpe

```json
{ "nome", "icone", "elemento", "atributo": "forca|energia|null", "dado": "d4|d6|d8|d12|null",
  "cargas": null|3|2|1, "efeito": null|"fraqueza|veneno|paralisia|sono|ligeiro|escudo|forca_extra|cura",
  "area": false, "peso", "liberado_em": 1 }
```

Durante a transição o simulador também aceita o formato antigo (`tipo`, `categoria` fisico/elemental, `usos`) e converte: `tipo` vira `elemento`, `categoria` vira `atributo` (forca/energia), `usos` vira `cargas`.

## O que o simulador modela

- Quem começa: maior Agilidade base. Empate: sorteado com a semente.
- Turno de um lado: Sono (perde o turno, o token sai), depois Paralisia (d10 de 1 a 4: não ataca), depois o golpe, depois Veneno (perde 1 coração no fim do turno, mesmo se o turno foi perdido). Os lados alternam sempre.
- Acerto: d10. Acerta se o resultado for maior ou igual à Agilidade efetiva do alvo (base, +3 com Ligeiro, teto 8). Agilidade 0 ou 1 acerta sempre.
- Dano: rola o `dado` (d4, d6, d8, d12) e soma o atributo do golpe (Força ou Energia), o Poder do trilho e os ajustes de token (Força Extra +2, Fraqueza −2). Efeito de tipo do alvo pelo `elemento`: vulnerável ×2, resistente metade arredondada pra cima, imune zero. Depois, subtrai a Defesa do alvo. Negativo vira 0. Zero com acerto vira 1. Imune é sempre 0.
- Cargas: consome 1 por uso, mesmo errando. Esgotado não pode ser escolhido. O golpe 1 é sempre ilimitado (a carta ignora `cargas` do golpe 1). Se nenhum golpe estiver disponível, o turno passa sem ataque.
- Golpe de suporte (`dado` null): não rola acerto. Efeito positivo vai pra si. Efeito negativo vai pro alvo e rola acerto (d10 contra a Agilidade efetiva).
- Efeitos (tokens, não acumulam, valem até o fim da luta): Fraqueza −2 no dano dos golpes do alvo; Veneno 1 coração no fim de cada turno do alvo; Paralisia (d10 1 a 4 no turno do alvo: não ataca); Sono (alvo perde o próximo turno, token sai); Ligeiro +3 Agilidade (teto 8); Escudo (próximo golpe recebido faz 0, token sai); Força Extra +2 no dano; Cura (instantânea) 1d6 corações até a vida máxima.
- Área: em 1 contra 1 é golpe normal.
- Vida: 1 coração = 1 ponto. Vida máxima = vida base + corações do trilho até o progresso, com teto de 16. Vida zero perde a luta.
- Golpes liberados: o primeiro começa liberado. Os outros liberam na marca `habilidade` do trilho (formato novo: `detalhe` é o número do golpe, 1 a 4; formato antigo: `detalhe` é o nome). Sem marca com o número, vale a i-ésima marca de habilidade em ordem de posição.
- Estrelas: `progresso` limita as estrelas feitas. A distribuição segue a política `--estrelas`, respeitando os slots de cada atributo.
- Força: as marcas de Força feitas até o progresso somam automaticamente.
- Poder: +1 no dado do golpe (só golpes com dado), quando o golpe está liberado e a marca está feita até o progresso.
- Evolução: a forma evoluída (sem `atributos` no JSON) copia o valor atual de cada atributo da forma anterior no momento da marca de evolução, sem +1. Os slots da forma evoluída são o total de marcas de estrela ÷ 4.

## Política padrão de escolha

Cada golpe vale `dano esperado + valor do efeito` (em corações); escolhe o maior, empate no primeiro da lista. Dano esperado: P(acerto) x média exata do dano (considera elemento, Defesa, Escudo e Ligeiro do alvo, e tokens do atacante). O valor do efeito é 0 se o token já está aplicado; caso contrário, por no máximo 3 turnos (menos se o alvo morre antes), mede dano evitado ou causado:

| Efeito | Valor |
|---|---|
| Fraqueza | 2 x P(alvo me acerta) por turno |
| Veneno | 1 por turno |
| Paralisia | 40% x melhor dano esperado do alvo, por turno |
| Sono | melhor dano esperado do alvo (1 turno) |
| Ligeiro | 0,3 x melhor dano esperado do alvo, por turno (0 se já tenho Agilidade 8) |
| Escudo | melhor dano esperado do alvo (anula 1 golpe) |
| Força Extra | 2 x P(acerto) por turno |
| Cura | média de min(1d6, corações que faltam) |

Na prática: o efeito é usado cedo (primeiro turno, ainda não aplicado) quando vale mais que o melhor ataque, e não é repetido enquanto o token estiver ativo. Efeito negativo em golpe de suporte é multiplicado pela chance de acerto. A política `aleatoria` sorteia entre todos os golpes disponíveis, inclusive os de suporte.

## Interpretações do simulador (decisões de implementação)

Estes pontos não estão fechados na especificação. O simulador escolheu uma leitura e a deixa explícita aqui:

1. **Cópia na evolução.** Cópia integral do valor atual (base + estrelas + Força automática) como base da nova forma, seguindo "a nova carta recebe o valor atual". Não há corte pelos slots novos. Assim, o "excedente perdido" da seção 14 não é aplicado. Ver `docs/revisao-mudancas-recentes.md`, item A2.
2. **Empate.** A regra literal da seção 6 dá dano 1 quando o resultado é zero depois da Defesa. Para o golpe imune, o simulador devolve 0 antes de qualquer outra conta. Sem isso, imune com Defesa 0 daria 1.
3. **Carga em golpe que erra.** A carga é gasta mesmo que o golpe erre.
4. **Poder antes do efeito de tipo.** O +1 entra no dado, como diz a seção 4 ("+1 no resultado do dado"). Assim o poder também é multiplicado por ×2 contra vulnerável.
5. **Turno sem golpe.** Se o lado não tem golpe disponível, o turno passa e conta como turno.
6. **Limite de turnos.** Batalha que chega a 1000 ações sem KO termina como `limite`, sem vencedor. A CLI conta isso como empate. Pode acontecer quando um lado nunca acerta o outro.
7. **Turnos.** A média de turnos conta ações de ataque (e turnos perdidos ou sem golpe), não rodadas.
8. **Ajustes de dano entram no subtotal.** Força Extra (+2) e Fraqueza (−2) somam com dado, atributo e Poder antes do efeito de tipo (então vulnerável dobra o +2). Com os dois tokens, somam −2 e +2 = 0.
9. **Escudo só anula dano.** Consome o token quando um golpe com dado acerta (mesmo se o dano já seria 0 por imunidade). Erro não consome. Efeito do golpe (ex.: Veneno) ainda é aplicado. Golpe de suporte negativo não consome o Escudo.
10. **Efeito negativo só se acertar; positivo sempre.** Em golpe com dado e efeito, o negativo exige acerto; o positivo (ex.: Força Extra junto de dano) é aplicado em si ao usar o golpe, acertando ou não.
11. **Veneno e Sono pulam turno ainda contam.** O Veneno tica no fim de todo turno do envenenado, inclusive turno perdido por Sono ou Paralisia. Se o veneno mata, o outro lado vence. Paralisia rola o d10 a cada turno enquanto o token existe e o token não sai.
12. **Iniciativa usa Agilidade base**, sem teto 8 e sem tokens (ainda não existem no começo da luta). Só o acerto usa a Agilidade efetiva com teto 8.
13. **Ligeiro com teto.** Agilidade efetiva = mínimo entre 8 e (base + 3 com Ligeiro). Base acima de 8 também é limitada a 8 no acerto.
14. **Poder em suporte.** Marcas de Poder em golpe sem dado são ignoradas.
15. **Golpe 1 ilimitado** é imposto pela carta mesmo que o JSON traga `cargas` nele.

## O que o simulador NÃO modela ainda

- **Crítico.** A regra (natural 10 no d10) é pendência da especificação, não decidida.
- **Captura.** Não há CA por espécie nos dados (ver revisão, item M3). Também não há tentativa de captura nem criatura selvagem.
- **Fuga.** Não modelada.
- **Descanso e Centro.** Não há recuperação de corações nem de cargas fora da Cura em luta. A regra de descanso dos golpes limitados está em aberto (seção 7).
- **Troca de criatura e divisão de XP.** Não modelados. O combate é 1 contra 1, com uma carta por lado.
- **XP.** O simulador não usa o valor impresso.
- **Dupla tipagem além do que está em `resistencias`.** O efeito de tipo usa o mapa `resistencias` do JSON, que já traz o efeito combinado de dois tipos.
- **Golpes em área contra vários alvos.** Só há 1 contra 1, onde Área não muda nada.

## Números de referência (formato antigo, desatualizados)

Valores do formato antigo de golpes, antes do novo catálogo; rode o simulador para os atuais. Criaturas 25 contra 1 do cenário de testes, política padrão, estrelas `igual`, N=2000:

| Progresso | 25 vence | 1 vence | Média de turnos |
|---|---|---|---|
| 10 | 13,5% | 86,5% | 5,7 |
| 25 | 80,5% | 19,4% | 3,9 |
| 50 | 84,7% | 15,3% | 3,8 |

Esses números são para conferir o simulador, não para decidir balanceamento. A decisão sobre a regra de evolução (revisão, item A2) muda a comparação entre formas evoluídas.
