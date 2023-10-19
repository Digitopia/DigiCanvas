# v0.3 (2023-10-20)
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
