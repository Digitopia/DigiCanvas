<template>
  <div :class="`container-${idx}`" class="container">
    <div class="sample" :class="{ playing: isPlaying }">
      <div
        id="controls"
        v-show="controls === 'settings'"
        class="no-select"
        @click.stop
      >
        <!-- <img src="/icons/oneShotLoop1.png" alt="" /> -->
        <!-- <img src="/icons/forthLoop1.png" alt="" /> -->
        <div v-show="mode == 'sample'" class="space-out">
          <span
            :class="{ active: settings.sample.mode === 'oneshot' }"
            @click.stop="settings.sample.mode = 'oneshot'"
            >➡️</span
          >
          <span
            :class="{ active: settings.sample.mode === 'loop' }"
            @click.stop="settings.sample.mode = 'loop'"
            >🔄</span
          >
        </div>
        <div id="granularSliders" v-show="mode == 'granular'" class="space-out">
          <div id="spray">Sp</div>
          <div id="grainSize">Gs</div>
          <div id="rate">Ra</div>
        </div>
      </div>
      <div class="header" :id="`header-${idx}`">{{ name }}</div>
      <div :class="`waveform-${idx}`" ref="waveformDiv"></div>
      <div id="buttons">
        <div id="settings-btn" @click.stop="toggleControls('settings')">⚙️</div>
        <div id="mode-btn" @click.stop="toggleMode()">
          {{ mode === "sample" ? "▶️" : "*️⃣" }}
        </div>
        <div
          id="scale-btn"
          @click.stop="toggleControls('scale')"
          style="opacity: 0.5"
        >
          ↔️
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import WaveSurfer from "wavesurfer.js"
import Draggable from "gsap/Draggable"
import Nexus from "nexusui"
import Tone from "tone"

import { mapNumber } from "@/utils"

export default {
  props: {
    audio: String,
    name: String,
    idx: Number,
  },

  data() {
    return {
      audioNode: null, // for gain, we're using .volume.value (in decibels)
      effectSendNode: null,
      wavesurfer: null,
      controls: "", // other options: settings, granular (ui)
      mode: "sample", // or 'granular'
      settings: {
        sample: {
          mode: "loop", // other options: loop
        },
        granular: {
          sourcePoint: null,
          spray: null, // distance from source point
          grainSize: null, // min 50ms, max 1500ms
          rate: null, // how often a new grain is produced [100ms, 2000ms]
          sliders: [],
        },
      },
      draggables: {
        reverb: null,
        sample: null,
      },
      distance: null,
      isPlaying: false,
    }
  },

  computed: {
    effectSendGainValue() {
      if (this.distance > this.$root.reverbRadius) return 0
      return mapNumber(this.distance, 0, this.$root.reverbRadius, 1, 0)
    },
  },

  watch: {
    isPlaying() {
      console.log("isPlaying", this.isPlaying)
      // TODO: update the setBackgroundColor to v7
      // if (this.isPlaying)
      //   this.wavesurfer.setBackgroundColor("var(--blue-light)")
      // else this.wavesurfer.setBackgroundColor("white")
    },

    effectSendGainValue() {
      console.log("updating effectSendGainValue", this.effectSendGainValue)
      this.effectSendNode.gain.value = this.effectSendGainValue
    },

    mode() {
      console.log("mode is now", this.mode)
    },
  },

  mounted() {
    window.WaveSurfer = WaveSurfer

    this.initWaveform()
    this.initAudio()
    this.initGranularSliders()

    this.$root.$on("toggleControls", this.toggleControls)
    this.$root.$on("reverbOnDrag", this.updateDistance)
  },

  methods: {
    initWaveform() {
      this.id = `.waveform-${this.idx}`
      const wavesurfer = WaveSurfer.create({
        container: this.id,
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

      // wavesurfer is just for showing the waveform
      wavesurfer.setMuted(true)

      wavesurfer.on("ready", () => {
        console.log("waveform ready for", this.audio)
      })

      wavesurfer.on("finish", () => {
        wavesurfer.seekTo(0)
        this.isPlaying = false
        if (this.settings.sample.mode == "loop") this.play()
      })

      this.$refs.waveformDiv.addEventListener("click", () => {
        if (wavesurfer.isPlaying()) {
          this.stop()
        } else {
          this.play()
        }
      })

      wavesurfer.load(this.audio)

      Draggable.create(`.container-${this.idx}`, {
        trigger: `#header-${this.idx}`,
        type: "x,y",
        // edgeResistance: 0.65,
        bounds: "html",
        inertia: true,
        zIndexBoost: false,
        onDrag: () => {
          this.updateDistance()
        },
      })

      this.draggables = this.draggables[this.idx]

      this.wavesurfer = wavesurfer
      this.$root.wavesurfer = this.wavesurfer
    },

    initAudio() {
      // init audio node
      this.audioNode = new Tone.Player(this.audio, () => {
        console.log("loaded audio", this.audio)
      })

      // init effect send (gain) node
      this.effectSendNode = new Tone.Gain(0)
      // and connect it to global reverb
      this.effectSendNode.connect(this.$root.reverbNode)

      // connect audio node to both effect send
      this.audioNode.connect(this.effectSendNode)
      // and destination
      this.audioNode.connect(Tone.Master)
    },

    initGranularSliders() {
      const opts = {
        size: [20, 100],
        mode: "relative", // 'relative' or 'absolute'
      }

      // spray
      const spraySlider = new Nexus.Slider("#spray", {
        ...opts,
        ...{ min: 50, max: 1500, value: 500 },
      })
      this.settings.granular.sliders.spray = spraySlider
      spraySlider.on("change", (val) => {
        console.log("spray is now", val)
        // this.audioNode.dampening.value = val
      })

      // grain size
      const grainSizeSlider = new Nexus.Slider("#grainSize", {
        ...opts,
        ...{ min: 50, max: 1500, value: 500 },
      })
      this.settings.granular.sliders.grainSize = grainSizeSlider

      // rate
      const rateSlider = new Nexus.Slider("#rate", {
        ...opts,
        ...{ min: 100, max: 2000, value: 1000 },
      })
      this.settings.granular.sliders.rate = rateSlider
      rateSlider.on("change", (val) => {
        console.log("rate is now", val)
        // this.audioNode.roomSize.value = val
      })

      // colors
      spraySlider.colorize("accent", "var(--blue)")
      spraySlider.colorize("fill", "var(--blue-light)")
      grainSizeSlider.colorize("accent", "var(--blue)")
      grainSizeSlider.colorize("fill", "var(--blue-light)")
      rateSlider.colorize("accent", "var(--blue)")
      rateSlider.colorize("fill", "var(--blue-light)")
    },

    play() {
      this.wavesurfer.play()
      this.isPlaying = true
      this.audioNode.start()
    },

    stop() {
      this.wavesurfer.stop()
      this.isPlaying = false
    },

    toggleControls(controls) {
      console.log("toggling controls:", controls)
      this.controls = this.controls === controls ? null : controls
    },

    toggleMode() {
      this.mode = this.mode === "sample" ? "granular" : "sample"

      if (this.mode === "granular") {
        if (!this.settings.granular.sourcePoint) {
          // access buffer
          // determine where to read the grain from
          // create a grain buffer
          // play grain
          // draw grain
          // cleanup grain after playing
        }
      }
    },

    updateDistance() {
      // Calculate the distance between this sample center and the global reverb center
      const reverbRect = document
        .getElementById("reverb")
        .getBoundingClientRect()
      const x1 = reverbRect.left + reverbRect.width / 2
      const y1 = reverbRect.top + reverbRect.height / 2

      const waveformRect = this.$refs.waveformDiv.getBoundingClientRect()
      const x2 = waveformRect.left + waveformRect.width / 2
      const y2 = waveformRect.top + waveformRect.height / 2
      const dx = x1 - x2
      const dy = y1 - y2
      this.distance = Math.sqrt(dx * dx + dy * dy)
      console.log("distance to", this.name, Math.round(this.distance))
    },
  },
}
</script>

<style lang="scss">
#waveform {
  position: relative;
  width: 100%;
  height: 100%;
  border-bottom-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
}

.header {
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
  margin-top: 3px;
}

#controls-btn:hover,
#mode-btn:hover,
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

.container {
  position: relative;
  width: 200px;
  margin: 0 auto;
  border-radius: 20px;
  background: white;
  &.playing {
    background: var(--blue-light) !important;
  }
}

.space-out {
  display: flex;
  justify-content: space-evenly;
  flex-direction: row;
  align-items: center;
  width: 100%;
}

#granularSliders {
  display: flex;
  pointer-events: auto; // to override the none of the parent
  width: 100%;
  font-size: 0.9rem;

  #dampening {
    width: 10px;
    height: 100px;
  }
}
</style>
