# v1.0 (not started, planned for 2023-12-13)
- [ ] deploy to digitopia.casadamusica.com/<nome>
- [ ] open source do repo
- [?] acrescentar entrada em digitopia.casadamusica.com
- [?] GA?

merge to main

# v0.6 (ongoing, planned for 2023-12-12)
*MISC*
- [✔️] fix overflow scroll bars and body margins
- [✔️] backspace delete sample under mouse
- [ ] deploy test link
*AX (Audio Experience)*
- [!] pensar default samples @Filipe/Ricardo
- [~] pensar default params of efeitos @Filipe/Ricardo
- [~] pensar default granular params @Filipe/Ricardo
*PLAY MODE*
- [ ] not looping on regions full sample
- [ ] audio click on ramping on effects params change
*GRANULAR*
- [✔️] fix init values of random param
- [ ] curva dos sliders logarítmica, no caso do rate e grain size
- [ ] stddev como 1/4 do spray
- [ ] rate atualiza no prox interval com current value
*EFFECTS*
- [✔️] radiais a distancia fixa do effect center e nao crescem
- [✔️] scale effect area from center
- [!] missing delay icon @Filipe
- [ ] calcular effect send à distancia do cursor do sample e não ao centro do sample
*EXTRA*
- [✔️] add audio files
- [~] drag and drop audio files 😎
- [✔️] edit name of sample (with double click on header to enter edit mode and to exit)
- [✔️] preview icons of future features (save and micrphone input)

# v0.5 (2023-12-07)
- [✔️] ui timestretch
- [✔️] bump up UI scaling
- [✔️] audio!
  - [✔️] rotear audio de wavesurfer para tonejs
  - [✔️] fix efeitos
  - [✔️] fix sample mode
  - [✔️] fix granular mode

*MISC*
  - [✔️] cursorColor a preto e resto default ([bc limitacao cor waveform da lib wavesurfer](https://github.com/katspaugh/wavesurfer.js/discussions/2730))
  - [✔️] overlay controls overlay tbm row de buttons, mas permite click toggle via clickthrough
  - [✔️] voltar a arredondar cantos
  - [✔️] diminuir area do sample (40px/sec->30) e aumentar height de buttons row (24px->34)
  - [!] missing delay icon @Filipe
*SAMPLE MODE*
  - [✔️] region de loop aparece logo by default (total sample) e para modo oneshot too
  - [-] add back and forth (bc negative playback rate not supported in wavesurfer)
*EFEITOS*
  - [✔️] efeitos sempre atras de samples (zindex de sample é soberano no matter what)
  - [✔️] calcular distancia a todos os efeitos
  - [>] radiais a distancia fixa do effect center e nao crescem
*TIMESTRETCH*
  - [✔️] fix UI
  - [✔️] não está a funcionar a nivel audio no granular
*AMPLITUDE*
  - [✔️] drag, but leaving an original behind
*GRANULAR*
  - [✔️] amplitude in grain mode too (is not connecting via the gain node)
  - [✔️] grains com ts estão a ficar desfasados em y
  - [✔️] atualizar origin on region drag
  - [✔️] refactor to fadeIn e fadeOut
  - [ ] grains estão a ficar desfasados em y de novos samples
  - [ ] curva dos sliders logarítmica, no caso do rate e grain size
  - [ ] stddev como 1/4 do spray
  - [ ] rate atualiza no prox interval com current value

# v0.4 (2023-11-17)

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
