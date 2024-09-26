```
Legend
x done
✔️ done
/ in progress
~ in progress
! blocked/pending
- cancelled
? needs clarification/discussion
> deferred
r can't (r)eproduce
  drive-by fix/improvement
```

# v1.4 (2024-09-27) [Link](https://v1-4--digicanvas.netlify.app)
- [✔️] interface para acrescentar presets
- [✔️] reverb param com arco 180º
- [✔️] suporte para filtro HP e LP (de momento só disponível em controlos granular)
- [✔️] fix botão remover sample (só estava a funcionar para o primeiro)
- [✔️] tweak mapeamento logarítmico do param rate do granular

# v1.3 (2024-09-20) [Link](https://v1-3--digicanvas.netlify.app)
- [✔️] effectSend = A(U(effect, sample)) / A(sample)
- [✔️] effect max radius so that it covers 100% of biggest sample
- [✔️] trash icon
- [✔️] slider exponencial rate granular
- [~] add min upload sample / min width logic
- [!] UI para tablets (fix double click)
- debug mode with `?debug=1`
- improved cleanup of resources (audio buffers) when samples get removed

# v1.2 (2024-09-13) [Link](https://v1-2--digicanvas.netlify.app)
- [/] export session (save only, load in progress)

# v1.1 (2024-09-05) [Link](https://v1-1--digicanvas.netlify.app)
*FEATURES*
- [x] possibilidade de gravaçãox através de microfone (microphone)
- [/] a gravação de uma sessão (record)
- [>] mobile UI
- [>] descarga da sessão (export)
*SAMPLE*
- [x] carregar start sample no meio da página (em vez de no topo)
- [x] samples a mudarem de posição quando um é apagado
- [x] permitir sair do menu de edição de parâmetros clicando em qualquer sítio do sample que não os parâmetros em si
- [x] não parar playback ao mudar entre modos
- [x] slider grain size exponencial
- [x] slider grain size parece saltar subitamente de valor, no range inferior
- [>] melhorar interação com canto inferior direito: (é preciso clicar em dois pontos ligeiramente diferentes para cada uma das acções)
*AX*
- [x] reduzido ganho a sample flute1
- [x] acrescentado compressão antes de cada efeito, e no master também (use URL param `?uc=1)
*EFFECTS*
- [x] fix effect distance calculation
*EFFECTS/REVERB*
- [x] roomsize quando está no máximo causa feedback, mesmo que não esteja sobreposto a nada
- [x] use simple Reverb, since Freeverb in tone@15 was crashing
- [?] define what other param in new Reverb is now for
*EFFECTS/DELAY*
- [x] slider delayTime também deveria ser exponencial
- [x] feedback delay max 0.99 em vez de 1 (senão cria loop infinito)
- [x] quando feedback no máximo, também está a processar o som, mesmo quando não sobreposto
*MISC*
- [x] improved debug console messages
- [?] adicionar e apagar sons em tablet (trash icon)
- [?] timestretch duas oitavas para cima e para baixo independentemente do tamanho do ficheiro original
- [?] parar em modo granular deve deixar os grãos todos terminar ou parar de golpe?
- [?] max 10 samples per canvas?
- [?] toggle between play mode and granular, remembers last cursor position?
- [?] curva logarítmica para effect send? (still applies?)
- [r] aconteceu-me, várias vezes, apagar o som e ele continuar a tocar (by @oscar)
- [r] aconteceu a interacção play/stop no modo reprodução deixar de funcionar, aleatoriamente. (by @filipe)
- [r] por vezes a interacção de mudança de volume deixa de funcionar (aconteceu no modo granular) (by @filipe)
- [r] clicks em cada grão, no modo granular. Janela tem de ser ajustada para não fazer click. (by @filipe)
*KNOWN BUGS*
- [>] drag de slider granular se release fora do slider faz dismiss à janela de background
- [>] se gravação som <6s (minWidth) distorciona o playback rate to match (acrescentar silêncio no final)

# v1.0 (2023-12-14) [Link](https://digitopia.casadamusica.com/DigiCanvas)
— [x] decidir nome
- [x] deploy to `https://digitopia.casadamusica.com/DigiCanvas`
- [x] open source do repo
- [x] missing delay icon @Filipe

# v0.6 (released 2023-12-12) [Link](https://v0-6--digicanvas.netlify.app)
- *MISC*
  - [x] fix overflow scroll bars and body margins
  - [x] backspace delete sample under mouse
  - [x] deploy test link (and retroactively for each tag/version)
  - [x] small UI touches on hover (scaling 1.05 or border)
  - [x] info icon (links to GH repo, where we can add the ficha tecnica)
  - [x] revert centering sample on add
  - [x] smoke test on other browsers apart from FF
- *AX (AUDIO EXPERIENCE)*
  - [!] pensar default samples @Filipe/Ricardo
  - [/] pensar default params of efeitos @Filipe/Ricardo
  - [/] pensar default granular params @Filipe/Ricardo
  - [!] default samples between 5s and 15s (caso contrário vai atualizar playback rate para respeitar estes bounds) @Ricardo
- *PLAY MODE*
  - [x] not looping when region is full sample (region-end not firing when region.end is buffer duration)
  - [x] audio click on ramping on effects params change
  - [x] sample not playing in Chrome/Edge first try
- *GRANULAR*
  - [x] fix init values of random param
  - [x] rate atualiza no prox interval com current value
  - [x] curva dos sliders logarítmica, no caso do rate e grain size
  - [x] stddev como 1/4 do spray
  - [x] update granular origin on region drag (not only on region dragEnd)
- *EFFECTS*
  - [x] radiais a distancia fixa do effect center e nao crescem
  - [x] scale effect area from center
  - [x] improve handle size of effect param
  - [!] missing delay icon @Filipe
  - [>] calcular effect send à distancia do cursor do sample e não ao centro do sample
- *EXTRA*
  - [x] add audio files
  - [x] limit adding sounds to [5s,15s]
  - [x] drag and drop audio files 😎
  - [x] edit name of sample (with double click on header to enter edit mode and to exit)
  - [x] preview icons of future features (save and micrphone input)

# v0.5 (2023-12-07) [Link](https://v0-5--digicanvas.netlify.app)
- *MISC*
  - [x] cursorColor a preto e resto default ([bc limitacao cor waveform da lib wavesurfer](https://github.com/katspaugh/wavesurfer.js/discussions/2730))
  - [x] overlay controls overlay tbm row de buttons, mas permite click toggle via clickthrough
  - [x] voltar a arredondar cantos
  - [x] diminuir area do sample (40px/sec->30) e aumentar height de buttons row (24px->34)
  - [!] missing delay icon @Filipe
- *SAMPLE MODE*
  - [x] region de loop aparece logo by default (total sample) e para modo oneshot too
  - [-] ~~add back and forth~~ (bc negative playback rate not supported in wavesurfer)
- *EFEITOS*
  - [x] efeitos sempre atras de samples (zindex de sample é soberano no matter what)
  - [x] calcular distancia a todos os efeitos
  - [>] radiais a distancia fixa do effect center e nao crescem
- *TIMESTRETCH*
  - [x] fix UI
  - [x] não está a funcionar a nivel audio no granular
- *AMPLITUDE*
  - [x] drag, but leaving an original behind
- *GRANULAR*
  - [x] amplitude in grain mode too (is not connecting via the gain node)
  - [x] grains com ts estão a ficar desfasados em y
  - [x] atualizar origin on region drag
  - [x] refactor to fadeIn e fadeOut
  - [ ] grains estão a ficar desfasados em y de novos samples
  - [ ] curva dos sliders logarítmica, no caso do rate e grain size
  - [ ] stddev como 1/4 do spray
  - [ ] rate atualiza no prox interval com current value

# v0.4 (2023-11-17) [Link](https://v0-4--digicanvas.netlify.app)
- *MISC*
  - [x] atualizar ícones
- *SAMPLE*
  - [x] interacao com cada sample faz bump do z-index
  - [x] quando o overlay dos settings está ligado não dá para interagir com os botões nem arrastar
  - [x] width dos samples em função da duração (40px = 1s)
  - [x] small drop shadow
- *PLAY MODE*
  - [/] region de loop aparece logo by default (total sample) e para modo oneshot too
  - [/] add back and forth
- *EFEITOS*
  - [x] smaller default reverb radius
  - [x] set initial position for reverb and delay in canvas
  - [x] garantir z-index within efeitos too
  - [x] faders radiais para os efeitos
  - [x] outro efeito: delay (FeedbackDelay em tonejs)
  - [x] reverb esta a ir para baixo quando se acrescentam novos sons
- *TIMESTRETCH*
  - [x] parâmetros de um som estão a mexer num som diferente
  - [x] depois de fazer stretch os botões deixam de funcionar
  - [x] drag de scale no canto
  - [x] dbclick to reset to rate=1
  - [x] feedback visual do stretch através da cor
  - [ ] não está a funcionar a nivel audio no granular
  - [?] ts em x e amplitude junto a play mode (oneshot ou loop)
- *GRANULAR*
  - [ ] amplitude in grain mode too (is not connecting via the gain node)
  - [ ] rate atualiza no prox interval com current value
  - [ ] stddev como 1/4 do spray
  - [ ] grains com ts estão a ficar desfasados em y
  - [ ] curva dos sliders logarítmica, no caso do rate e grain size
  - [ ] refactor to fadeIn e fadeOut?

# v0.3 (2023-10-19) [Link](https://v0-3--digicanvas.netlify.app)
- [x] add new sounds
- [x] fixes in granular audio
  - [x] spray em função do tamanho do buffer (0 a 100% do buffer)
  - [x] source point middle for now
  - [x] linearRamptoTime 5ms/10ms for each grain
  - [x] remove bug circle left over
  - [x] remove UI of grain using its duration
  - [x] -6 volume value player e grain
  - [x] inverter param rate
  - [x] store granular spread between mode toggles
  - [x] drag spray region, no spray and source point always center of region
- [x] scale button
  - [x] timestretch on x
  - [x] amplitude on y
- bug fixing
  - [x] bug: params multiple samples
  - [x] bug: not showing progress color in sample mode, after toggling back from granular mode
  - [x] bug: not playing from beginning in sample mode, after toggling back from granular mode

# v0.2c (2023-09-29) [Link](https://v0-2c--digicanvas.netlify.app)
- [x] granular audio

# v0.2b (2023-09-05) [Link](https://v0-2b--digicanvas.netlify.app)
- [x] multi samples with audio

# v0.2a (2023-07-21)
- [x] multi samples UI

# v0.1 (2023-06-23) [Link](https://v0-1--digicanvas.netlify.app)
- *SAMPLE*
  - [x] sempre o mesmo, para já
  - [x] centrado na página
  - [x] com a duração máxima de 10 segundos
  - [x] que mostre a forma de onda (waveform)
  - [x] e tenha uma cor automaticamente atribuída
  - [x] interações
      - [x] tocar e parar (carregando em cima), sempre a partir do início;
      - [x] arrastar ao longo do Canvas (click + drag no header);
      - [x] aceder ao “i” para mudar parâmetros
        - [x] One Shot
        - [x] Loop
- *EFEITO*
  – [x] reverb (Freeverb of Tone.js)
  – [x] em forma de círculo e com uma área de acção por baixo
    - [x] colorida a azul, com degradé
    - [x] interações
      - [x] arrastar ao longo do canvas (click and drag);
      - [x] manipular 3 sliders (verticais, nesta versão), fazendo duplo clique.
        - [x] sliders
          - [x] dampening
          - [x] alcance (aumenta/diminui o raio de acção)
          - [x] decay time (room size)
  - [x] influenciar a quantidade de efeito de cada sample (neste momento, apenas 1).
    - [x] é medida a distância do centro da janela do sample até ao centro do círculo do efeito
    - [x] se a distância for maior que o raio do alcance, não há efeito.
    - [x] se for menor,o envio é normalizado de 0 (distância máxima) até 1 (sobreposição dos centros).
