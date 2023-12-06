<template>
  <section>
    <h1>Foobar</h1>
    <div id="waveform"></div>
    <button id="play">Play</button>
  </section>
</template>

<script>
import WaveSurfer from "wavesurfer.js"
import Tone from "tone"
// import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js"

export default {
  data() {
    return {}
  },

  mounted() {
    const wavesurfer = WaveSurfer.create({
      container: "#waveform",
      waveColor: "#4F4A85",
      progressColor: "#383351",
      url: "/sounds/mp3_normalized/flute1.mp3",
    })

    wavesurfer.on("interaction", () => {
      wavesurfer.play()
    })

    wavesurfer.on("ready", () => {
      console.log("waveform ready")
      console.log(wavesurfer.media)
      const me = Tone.context.createMediaElementSource(wavesurfer.media)
      console.log(me)
      // Tone.connect(me, Tone.Master)
      Tone.connect(me, freeverb)
      // me.connect(freeverb)
    })

    var synth = new Tone.Synth()
    const freeverb = new Tone.Freeverb(0.2, 2000).toMaster()
    synth.connect(Tone.Master)
    synth.connect(freeverb)
    document.getElementById("play").onclick = () => {
      synth.triggerAttackRelease("C4", "8n")
    }

    window.ws = wavesurfer
    window.Ws = WaveSurfer
    window.Tone = Tone
  },
}
</script>
