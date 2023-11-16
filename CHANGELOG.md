# v0.4 (2023-11-17)

*MISC/MINOR*
  - [✔] atualizar ícones
  - [✔] smaller default reverb radius
  - [✔] set initial position for reverb and delay in canvas
  - [✔] interacao com cada sample faz bump do z-index, mantendo effeitos sempre em cima
*PLAY MODE*
  - [ ] **region de granular para usar em play mode para loop**
  - [ ] region de loop aparece logo by default (total sample) e para modo oneshot too
  - [ ] missing back and forth
*GRANULAR*
  - [ ] amplitude in grain mode too
  - [ ] rate atualiza no prox interval com current value
  - [ ] stddev como 1/4 do spray
  - [ ] curva dos sliders logarítmica, no caso do rate e grain size
  - [ ] grains com ts estão a ficar desfasados em y
  - [ ] refactor to fadeIn e fadeOut?
*TIMESTRETCH*
  - [ ] depois de fazer stretch os botões deixam de funcionar
  - [ ] dbclick to reset to rate=1
  - [ ] não está a funcionar a nivel audio no granular
  - [ ] ui bug
  - [ ] ts em x e amplitude junto a play mode (oneshot ou loop)
  - [ ] feedback visual do stretch através da cor
  - [ ] drag de scale no canto?
*EFEITOS*
  - [✔] faders radiais para os efeitos
  - [✔] outro efeito: FeedbackDelay tonejs
  - [ ] reverb esta a ir para baixo quando se acrescentam novos sons
  - [ ] 100px = 1s (ou algo do genero), samples maioress mais espaco e vice versa
*?*
  - [ ] **parâmetros de um som estão a mexer num som diferente**
*LATER*
  - [ ] filtro low e high pass (também no modo granular?)
  - [ ] adicionar e remover sons
  - [ ] não parar de tocar enquanto se muda o rate
  - [ ] o stretch também se aplicar aos grãos do modo granular
  - [ ] interacao com drag do nome não é possível quando controlos estão visíveis
  - [ ] toggle de overlay devia ser no mesmo botão
  - [ ] scale efeitos from center
  - [ ] quando o overlay dos settings está ligado não dá para interagir com os botões nem arrastar
  - [ ] faders radiais com raio ligeiramente maior que o efeito

# Reuniao
- favicon
- missing delay icon
- names of filename without accents and spaces

---

# v0.3 (2023-10-19)
- [✓] add new sounds
- [✓] fixes in granular audio
  - [✓] spray em função do tamanho do buffer (0 a 100% do buffer)
  - [✓] source point middle for now
  - [✓] linearRamptoTime 5ms/10ms for each grain
  - [✓] remove bug circle left over
  - [✓] remove UI of grain using its duration
  - [✓] -6 volume value player e grain
  - [✓] inverter param rate
  - [✓] store granular spread between mode toggles
  - [✓] drag spray region, no spray and source point always center of region
- [✓] scale button
  - [✓] timestretch on x
  - [✓] amplitude on y
- bug fixing
  - [✓] bug: params multiple samples
  - [✓] bug: not showing progress color in sample mode, after toggling back from granular mode
  - [✓] bug: not playing from beginning in sample mode, after toggling back from granular mode

# v0.2c (2023-09-29)
- [✔️] granular audio

# v0.2b (2023-09-05)
- [✔️] multi samples with audio

# v0.2a (2023-07-21)
- [✔️] multi samples UI

# v0.1 (2023-06-23)

Abrir uma página em branco, com dois elementos:

**SAMPLE**
- [✔️] sempre o mesmo, para já
- [✔️] centrado na página
- [✔️] com a duração máxima de 10 segundos
- [✔️] que mostre a forma de onda (waveform)
- [✔️] e tenha uma cor automaticamente atribuída
- [✔️] interações
    - [✔️] tocar e parar (carregando em cima), sempre a partir do início;
    - [✔️] arrastar ao longo do Canvas (click + drag no header);
    - [✔️] aceder ao “i” para mudar parâmetros
      - [✔️] One Shot
      - [✔️] Loop

**EFEITO**
– [✔️] reverb (Freeverb of Tone.js)
– [✔️] em forma de círculo e com uma área de acção por baixo
  - [✔️] colorida a azul, com degradé
  - [✔️] interações
    - [✔️] arrastar ao longo do canvas (click and drag);
    - [✔️] manipular 3 sliders (verticais, nesta versão), fazendo duplo clique.
      - [✔️] sliders
        - [✔️] dampening
        - [✔️] alcance (aumenta/diminui o raio de acção)
        - [✔️] decay time (room size)
- [✔️] influenciar a quantidade de efeito de cada sample (neste momento, apenas 1).
  - [✔️] é medida a distância do centro da janela do sample até ao centro do círculo do efeito
  - [✔️] se a distância for maior que o raio do alcance, não há efeito.
  - [✔️] se for menor,o envio é normalizado de 0 (distância máxima) até 1 (sobreposição dos centros).
