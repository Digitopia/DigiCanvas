<template>
  <div id="app">
    <!-- <button @click="player.start()">play</button> -->
    <div id="container" :class="{ playing: isPlaying }">
      <div id="controls" v-show="controls === 'info'" class="no-select">
        <!-- <img src="/icons/oneShotLoop1.png" alt="" /> -->
        <!-- <img src="/icons/forthLoop1.png" alt="" /> -->
        <span
          :class="{ active: settings.info.mode === 'oneshot' }"
          @click.stop="settings.info.mode = 'oneshot'"
          >➡️</span
        >
        <span
          :class="{ active: settings.info.mode === 'loop' }"
          @click.stop="settings.info.mode = 'loop'"
          >🔄</span
        >
      </div>
      <div id="header">Sample 1</div>
      <div id="waveform" ref="waveformDiv"></div>
      <div id="buttons">
        <div id="info-btn" @click.stop="toggleControls('info')">ℹ️</div>
        <div id="loop-btn" @click.stop="toggleControls('loop')">🔄</div>
        <div id="scale-btn" @click.stop="toggleControls('scale')">↔️</div>
      </div>
    </div>
    <div id="reverb-area" ref="reverbArea">
      <div
        id="reverb"
        ref="reverbDiv"
        @dblclick.stop="reverb.showSliders = !reverb.showSliders"
      ></div>
      <div id="sliders" v-show="reverb.showSliders">
        <div id="dampening">Da</div>
        <div id="decay">De</div>
        <div id="range">Ra</div>
      </div>
    </div>
  </div>
</template>

<script>
import WaveSurfer from "wavesurfer.js"
import gsap from "gsap"
import Draggable from "gsap/Draggable"
import Tone from "tone"
import Nexus from "nexusui"

gsap.registerPlugin(Draggable)

const mapNumber = (number, inMin, inMax, outMin, outMax) =>
  ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin

export default {
  name: "App",

  data() {
    return {
      controls: "", // other options: info, granular
      settings: {
        info: {
          mode: "oneshot", // other options: loop
        },
      },
      reverb: {
        audioNode: null,
        showSliders: false,
        sliders: {
          dampening: 0,
          range: 0,
          decay: 0,
        },
        effectSendGainNode: null,
      },
      draggables: {
        reverb: null,
        sample: null,
      },
      distance: null,
      isPlaying: false,
    }
  },

  watch: {
    controls() {
      console.log("controls is now", this.controls)
    },

    effectSend() {
      console.log("effectSend:", this.effectSend)
      if (this.reverb.effectSendGainNode) {
        this.reverb.effectSendGainNode.gain.value = this.effectSend
      } else {
        // using dry/wet
        this.reverb.audioNode.wet.value = this.effectSend
      }
    },

    reverbRadius() {
      console.log("reverbRadius:", this.reverbRadius)
      console.log(this.$refs.reverbArea)
      this.$refs.reverbArea.style.width = `${this.reverbRadius * 2}px`
      this.$refs.reverbArea.style.height = `${this.reverbRadius * 2}px`
    },

    isPlaying() {
      console.log("isPlaying", this.isPlaying)
      if (this.isPlaying)
        this.wavesurfer.setBackgroundColor("var(--blue-light)")
      else this.wavesurfer.setBackgroundColor("white")
    },
  },

  computed: {
    effectSend() {
      if (this.distance > this.reverbRadius) return 0
      return mapNumber(this.distance, 0, this.reverbRadius, 1, 0)
    },

    reverbRadius() {
      return this.reverb.sliders.range.value
    },
  },

  mounted() {
    window.Tone = Tone
    this.initWaveform()
    this.initReverb()
    this.initReverbSliders()

    // unselect controls
    document.body.onclick = () => {
      console.log("clicked body")
      this.toggleControls()
    }

    // make stuff available for easier debugging
    window.draggables = this.draggables
    window.wavesurfer = this.wavesurfer
    window.reverb = this.reverb
  },

  methods: {
    initWaveform() {
      const wavesurfer = WaveSurfer.create({
        container: "#waveform",
        backgroundColor: "white",
        waveColor: "lightgray",
        progressColor: "lightblack",
        cursorColor: "transparent",
        cursorWidth: 1,
        barWidth: 2,
        barGap: 3,
        normalize: true,
        interact: false,
        hideScrollbar: true,
      })

      wavesurfer.on("ready", () => {
        console.log("ready")
        this.wavesurfer.backend.source.connect(this.reverb.audioNode)
      })

      wavesurfer.on("finish", () => {
        wavesurfer.seekTo(0)
        this.isPlaying = false
        if (this.settings.info.mode == "loop") wavesurfer.play()
      })

      this.$refs.waveformDiv.addEventListener("click", () => {
        if (wavesurfer.isPlaying()) {
          wavesurfer.stop()
          this.isPlaying = false
        } else {
          this.isPlaying = true
          wavesurfer.play()
        }
      })

      // load sounds
      wavesurfer.load("/presets/sample 1_guit_plus_background.mp3")
      // wavesurfer.load("/presets/sample 2_guit.mp3")
      // wavesurfer.load("/presets/sample 3_background.mp3")
      // wavesurfer.load("/presets/sample 4_birds_and_chimes.mp3")

      // define dragging for waveform
      this.draggables.sample = Draggable.create("#container", {
        trigger: "#header",
        type: "x,y",
        // edgeResistance: 0.65,
        bounds: "html",
        inertia: true,
        zIndexBoost: false,
        onDrag: () => {
          this.calculateDistance()
        },
      })[0]

      this.wavesurfer = wavesurfer
    },

    initReverb() {
      // set Tone context to the same of wavesurfer (this works)
      Tone.setContext(this.wavesurfer.backend.ac)

      // this works
      // this.player = new Tone.Player(
      //   "/presets/sample 1_guit_plus_background.mp3"
      // )
      // this.reverb.audioNode = new Tone.Freeverb(0.05, 8000).toMaster()
      // this.player.connect(this.reverb.audioNode)

      // trying with input/output (works, but has no distance effect)
      this.reverb.audioNode = new Tone.Freeverb(0.05, 8000).toMaster()
      this.wavesurfer.backend.setFilter(
        this.reverb.audioNode.input,
        this.reverb.audioNode.output
      )

      // trying with gainNode before Freeverb (not working!)
      // this.reverb.audioNode = new Tone.Freeverb(0.05, 8000).toMaster()
      // this.reverb.effectSendGainNode = new Tone.Gain(0).connect(
      //   this.reverb.audioNode
      // )
      // this.wavesurfer.backend.setFilter(
      //   this.reverb.effectSendGainNode.input,
      //   this.reverb.effectSendGainNode.output
      // )

      // using as dry/wet

      // audioNode
      // this.reverb.audioNode = new Tone.Freeverb(0.05, 8000)
      // this.reverb.audioNode.roomsize = 0.7
      // this.reverb.audioNode.dampening = 3000

      // this.player.toMaster()

      // definie dragging for reverb
      this.draggables.reverb = Draggable.create("#reverb-area", {
        trigger: "#reverb",
        type: "x,y",
        // edgeResistance: 0.65,
        bounds: "html",
        inertia: true,
        onDrag: () => {
          this.calculateDistance()
        },
      })[0]
    },

    initReverbSliders() {
      const opts = {
        size: [20, 100],
        mode: "relative", // 'relative' or 'absolute'
      }

      // dampening
      const dampeningSlider = new Nexus.Slider("#dampening", {
        ...opts,
        ...{ min: 0, max: 10000, step: 10, value: 3000 },
      })
      this.reverb.sliders.dampening = dampeningSlider
      dampeningSlider.on("change", (val) => {
        console.log("dampening is now", val)
        this.reverb.audioNode.dampening.value = val
      })

      // range
      const rangeSlider = new Nexus.Slider("#range", {
        ...opts,
        ...{ min: 50, max: 200, value: 150 },
      })
      this.reverb.sliders.range = rangeSlider

      // decay
      const decaySlider = new Nexus.Slider("#decay", {
        ...opts,
        ...{ min: 0, max: 1, value: 0.2 },
      })
      this.reverb.sliders.decay = decaySlider
      decaySlider.on("change", (val) => {
        console.log("decay/roomsize is now", val)
        this.reverb.audioNode.roomSize.value = val
      })

      // colors
      dampeningSlider.colorize("accent", "var(--blue)")
      dampeningSlider.colorize("fill", "var(--blue-light)")
      rangeSlider.colorize("accent", "var(--blue)")
      rangeSlider.colorize("fill", "var(--blue-light)")
      decaySlider.colorize("accent", "var(--blue)")
      decaySlider.colorize("fill", "var(--blue-light)")
    },

    calculateDistance() {
      const reverbRect = this.$refs.reverbDiv.getBoundingClientRect()
      const x1 = reverbRect.left + reverbRect.width / 2
      const y1 = reverbRect.top + reverbRect.height / 2
      const waveformRect = this.$refs.waveformDiv.getBoundingClientRect()
      const x2 = waveformRect.left + waveformRect.width / 2
      const y2 = waveformRect.top + waveformRect.height / 2
      const dx = x1 - x2
      const dy = y1 - y2
      this.distance = Math.sqrt(dx * dx + dy * dy)
      window.waveformRect = waveformRect
    },

    toggleControls(controls) {
      this.controls = this.controls === controls ? null : controls
    },
  },
}
</script>

<style lang="scss">
:root {
  --blue: rgb(86, 143, 179);
  --blue-light: rgb(170, 197, 216);
  --yellow: rgb(255, 220, 96);
  --border-radius: 20px;
  --reverb-radius: 150px;
}
html,
body {
  background: var(--yellow);
  width: 100%;
  height: 100%;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
}

#container {
  position: relative;
  width: 200px;
  margin: 0 auto;
  border-radius: 20px;
  background: white;
  &.playing {
    background: var(--blue-light) !important;
  }
}

#waveform {
  position: relative;
  width: 100%;
  height: 100%;
  border-bottom-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
}

#header {
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  position: relative;
  background: var(--blue);
  width: 100%;
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
}

#buttons {
  display: flex;
  justify-content: space-around;
}

#info-btn:hover,
#loop-btn:hover,
#scale-btn:hover {
  cursor: pointer;
}

#controls {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: var(--border-radius);
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
  display: flex;
  justify-content: space-evenly;
  flex-direction: row;
  align-items: center;
  font-size: 50px;
  // img {
  //   // width: 100px;
  // }
  span {
    opacity: 0.65;
  }
  .active {
    opacity: 1;
  }
}

.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
}

#reverb-area {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 100%;
  background: radial-gradient(circle, var(--blue-light), rgba(0, 0, 0, 0.2));
  z-index: 10;
  pointer-events: none; // so that can move a sample behind
}

#reverb {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--blue);
  width: 50px;
  height: 50px;
  border-radius: 100%;
  pointer-events: auto; // to override the none of the parent
}

#dampening {
  width: 10px;
  height: 100px;
}

#sliders {
  display: flex;
  pointer-events: auto; // to override the none of the parent
  width: 100%;
}
</style>
