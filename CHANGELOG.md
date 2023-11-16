# v0.4 (2023-11-17)

TLDR:
- muitas changes a nível UI
- com acrescentar suporte de regions para modo sample isto complicou um bocado a coisa
  - antes estava a usar wavesurfer para a parte visual da onda
  - mas o backend de audio era todo no Tone.js
  - e mantinha o estado entre as duas libs
  - ao usar regions em modo sample esta abordagem fica um bocado impraticavel (muitos mais edge cases)
  - portanto, vou ver se consigo passar a usar o Wavesurfer para playback de modo sample
  - e ligá-lo ao Tone.js para o resto do processamento
  - esta foi a minha 1a abordagem que ao não conseguir tive que acabar por abondonar
  - espero ter mais sorte desta vez, porque manter o estado nas duas libs com o suporte para as regions não seria bonito
- as tasks do *GRANULAR* não me preocupam e são todas relativamente acessíveis
- as *LATER* são para começar a pegar só quando as outras já estiverem
- `~` signica WIP
- `?` precisa esclarecimento

*MISC*
  - [✔] atualizar ícones
*SAMPLE*
  - [✔] interacao com cada sample faz bump do z-index
  - [✔] quando o overlay dos settings está ligado não dá para interagir com os botões nem arrastar
  - [✔] width dos samples em função da duração (40px = 1s)
  - [✔] small drop shadow
*PLAY MODE*
  - [~] region de loop aparece logo by default (total sample) e para modo oneshot too
  - [~] add back and forth
*EFEITOS*
  - [✔] smaller default reverb radius
  - [✔] set initial position for reverb and delay in canvas
  - [✔] garantir z-index within efeitos too
  - [✔] faders radiais para os efeitos
  - [✔] outro efeito: delay (FeedbackDelay em tonejs)
  - [✔] reverb esta a ir para baixo quando se acrescentam novos sons
*TIMESTRETCH*
  - [✔️] parâmetros de um som estão a mexer num som diferente
  - [✔️] depois de fazer stretch os botões deixam de funcionar
  - [✔️] drag de scale no canto
  - [✔️] dbclick to reset to rate=1
  - [✔️] feedback visual do stretch através da cor
  - [ ] não está a funcionar a nivel audio no granular
  - [?] ts em x e amplitude junto a play mode (oneshot ou loop)
*GRANULAR*
  - [ ] amplitude in grain mode too (is not connecting via the gain node)
  - [ ] rate atualiza no prox interval com current value
  - [ ] stddev como 1/4 do spray
  - [ ] grains com ts estão a ficar desfasados em y
  - [ ] curva dos sliders logarítmica, no caso do rate e grain size
  - [ ] refactor to fadeIn e fadeOut?
*LATER*
  - [ ] adicionar sons
  - [ ] ui para remover sons
  - [ ] faders radiais com raio ligeiramente maior que o efeito
  - [ ] scale efeitos from center
  - [ ] não parar de tocar enquanto se muda o rate
  - [ ] filtro low e high pass (também no modo granular?)
  - [ ] gravar
  - [ ] edit name of sample
  - [ ] "ts em x e amplitude junto a play mode (oneshot ou loop)"
*REUNIÂO*
- favicon
- missing delay icon
- names of filename without accents and spaces
- conflito de UI: em modo sample, drag region vs trigger play
- quando UI muito reduzida em X sample modes ficam uns em cima dos outros
- limitacao cor waveform da lib wavesurfer
- ui para remover sons

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
