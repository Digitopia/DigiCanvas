*KNOWN BUGS*
- [ ] drag de slider granular se release fora do slider faz dismiss à janela de background

*FEATURES*
- [/] possibilidade de gravação directa na plataforma (record)
- [/] a gravação e descarga da sessão (export)
- [>] mobile UI
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
*EFFECTS/REVERB*
- [x] fix effect distance calculation
- [x] roomsize quando está no máximo causa feedback, mesmo que não esteja sobreposto a nada
*EFFECTS/DELAY*
- [x] slider delayTime também deveria ser exponencial
- [x] feedback delay max 0.99 em vez de 1 (senão cria loop infinito)
- [ ] quando feedback no máximo, também está a processar o som, mesmo quando não sobreposto
*MISC*
- [x] improved debug console messages
- [?] adicionar e apagar sons em touchscreen
- [?] botão para apagar sons (em desktop também?)
- [?] timestretch duas oitavas para cima e para baixo independentemente do tamanho do ficheiro original
- [?] parar em modo granular deve deixar os grãos todos terminar ou parar de golpe?
- [R] aconteceu-me, várias vezes, apagar o som e ele continuar a tocar (by @oscar)
- [R] aconteceu a interacção play/stop no modo reprodução deixar de funcionar, aleatoriamente. (by @filipe)
- [R] por vezes a interacção de mudança de volume deixa de funcionar (aconteceu no modo granular) (by @filipe)
- [R] clicks em cada grão, no modo granular. Janela tem de ser ajustada para não fazer click. (by @filipe)
- [?] max 10 samples per canvas?
- [?] toggle between play mode and granular, remembers last cursor position?
- [?] curva logarítmica para effect send? (still applies?)

---------

*LATER*
- [?] acrescentar entrada em software digitopia.casadamusica.com?
- [x] edit name of sample
- [x] faders radiais com raio ligeiramente maior que o efeito
- [x] scale effect area from center
- [/] ui para remover sons (trash icon como botão)
- [/] add info icon
- [/] se som < minWidth (~6s) acrescenta silencio no final
- [?] Google Analytics?
- [ ] calcular effect send à distancia do cursor do sample e não ao centro do sample
- [ ] current interaction with volume forces jumps
- [ ] icons for granular params?
- [ ] filtro low e high pass (também no modo granular?)
- [ ] gravar
- [ ] favicon

*(CRAZY) IDEAS*
- permitir adicionar whatever effect de Tone.js
- integrate with freesound api to query for audio samples in real time
