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
          <div id="rate">Rt</div>
          <div id="random">Rd</div>
        </div>
      </div>
      <!-- <div v-show="mode === 'granular'" class="no-select" @click.stop>
        <div
          v-for="(grain, idx) in settings.granular.grains"
          :key="idx"
          class="grain"
        >
          ·
        </div>
      </div> -->
      <div class="header" :id="`header-${idx}`">{{ name }}</div>
      <div id="waveform-wrapper">
        <div :class="`waveform-${idx}`" ref="waveformDiv"></div>
        <canvas id="canvas" ref="canvas"></canvas>
      </div>
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
// import RegionsPlugin from "https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js"
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js"

import Draggable from "gsap/Draggable"
import Nexus from "nexusui"
import Tone from "tone"

import { mapNumber, randomGaussian, clamp } from "@/utils"

export default {
  props: {
    audio: String,
    name: String,
    idx: Number,
  },

  data() {
    return {
      audioNode: null,
      effectSendNode: null,
      wavesurfer: null,
      controls: "", // other options: settings, granular (ui)
      mode: "sample", // or 'granular'
      settings: {
        sample: {
          mode: "loop", // other options: loop
        },
        granular: {
          sourcePoint: null, // this is stored in [0, 1] range of the progress of the sample
          params: {
            spray: { min: 0, max: 1, value: 1.0 }, // distance in function of grain size of sprea from source point
            grainSize: { min: 0.05, max: 1.5, value: 1.5 },
            rate: { min: 2.0, max: 0.1, value: 1.0 }, // how often a new grain is produced [2000ms, 100ms]
            random: { min: 0.0, max: 1.0, value: 0.5 }, // how random (0 is at center, 1 is almost linearly, but still follows normal distribution)
          },
          sliders: [],
          grains: [],
        },
      },
      draggables: {
        reverb: null,
        sample: null,
      },
      distance: null,
      isPlaying: false,
      canvas: null,
      canvasCtx: null,
      width: null,
      height: null,
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
      console.log(
        "updating effectSendGainValue",
        this.name,
        this.effectSendGainValue
      )
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
    this.initCanvas()

    this.$root.$on("toggleControls", this.toggleControls)
    this.$root.$on("reverbOnDrag", this.updateDistance)

    setTimeout(() => {
      this.resize()
    }, 1000)
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
        plugins: [RegionsPlugin.create({})],
      })

      // Initialize the Regions plugin
      this.regions = wavesurfer.registerPlugin(RegionsPlugin.create())

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
        if (this.mode === "sample") {
          if (wavesurfer.isPlaying()) {
            console.log("stopping...")
            this.stop()
          } else {
            this.play()
          }
        } else if (this.mode === "granular") {
          // console.log(evt)
        }
      })

      // wavesurfer.on("click", (relX) => {
      //   console.log("sourcePoint set", relX)
      //   this.settings.granular.sourcePoint = relX
      // })

      wavesurfer.on("seek", (evt) => {
        console.log("evt", evt)
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

      window.audioNode = this.audioNode

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
        ...this.settings.granular.params.spray,
      })
      this.settings.granular.sliders.spray = spraySlider
      spraySlider.on("change", (val) => {
        console.log("spray is now", val)
        this.settings.granular.params.spray.value = val
        this.initRegions()
      })

      // grain size
      const grainSizeSlider = new Nexus.Slider("#grainSize", {
        ...opts,
        ...this.settings.granular.params.grainSize,
      })
      this.settings.granular.sliders.grainSize = grainSizeSlider
      grainSizeSlider.on("change", (val) => {
        console.log("grainSize is now", val)
        this.settings.granular.params.grainSize.value = val
        this.initRegions()
      })

      // rate
      const rateSlider = new Nexus.Slider("#rate", {
        ...opts,
        ...this.settings.granular.params.rateSlider,
      })
      this.settings.granular.sliders.rate = rateSlider
      rateSlider.on("change", (val) => {
        console.log("rate is now", val)
        this.settings.granular.params.rate.value = val
        this.updateRateInterval()
      })

      // random
      const randomSlider = new Nexus.Slider("#random", {
        ...opts,
        ...this.settings.granular.params.randomSlider,
      })
      this.settings.granular.sliders.rate = randomSlider
      randomSlider.on("change", (val) => {
        console.log("random is now", val)
        this.settings.granular.params.random.value = val
      })

      // colors
      spraySlider.colorize("accent", "var(--blue)")
      spraySlider.colorize("fill", "var(--blue-light)")
      grainSizeSlider.colorize("accent", "var(--blue)")
      grainSizeSlider.colorize("fill", "var(--blue-light)")
      rateSlider.colorize("accent", "var(--blue)")
      rateSlider.colorize("fill", "var(--blue-light)")
      randomSlider.colorize("accent", "var(--blue)")
      randomSlider.colorize("fill", "var(--blue-light)")
    },

    initCanvas() {
      this.canvas = this.$refs.canvas
      this.canvasCtx = this.canvas.getContext("2d")
      this.resize()
    },

    resize() {
      console.log("resizing...")
      this.width = document.querySelector("#waveform-wrapper").clientWidth
      this.height = document.querySelector("#waveform-wrapper").clientHeight
      console.log(this.width, this.height)
      this.canvas.setAttribute("width", this.width)
      this.canvas.setAttribute("height", this.height)
      // this.wavesurfer.setHeight(this.height)
    },

    play() {
      this.wavesurfer.play()
      this.isPlaying = true
      this.audioNode.start()
    },

    stop() {
      this.wavesurfer.stop()
      this.isPlaying = false
      this.audioNode.stop()
    },

    toggleControls(controls) {
      console.log("toggling controls:", controls)
      this.controls = this.controls === controls ? null : controls
    },

    toggleMode() {
      this.mode = this.mode === "sample" ? "granular" : "sample"

      if (this.mode === "granular") {
        if (!this.settings.granular.sourcePoint) {
          // if no source point set to middle
          this.settings.granular.sourcePoint = 0.5
        }
        // this.wavesurfer.setOptions({ cursorColor: "black" })
        this.wavesurfer.setOptions({ progressColor: "lightgray" })
        this.wavesurfer.setOptions({ interact: "true" })
        this.initRegions()
      } else {
        // this.wavesurfer.setOptions({ cursorColor: "transparent" })
        this.wavesurfer.setOptions({ interact: "false" })
        clearInterval(this.settings.granular.params.rate.interval)
        this.clearCanvas()
        this.regions.clearRegions()
      }
    },

    updateRateInterval() {
      clearInterval(this.settings.granular.params.rate.interval)
      this.settings.granular.params.rate.interval = setInterval(() => {
        this.addGrain()
      }, this.settings.granular.params.rate.value * 1000)
    },

    initRegions() {
      const relX =
        this.settings.granular.sourcePoint * this.audioNode.buffer.duration
      const randOffsetRange =
        this.settings.granular.params.spray.value *
        this.settings.granular.params.grainSize.value
      const start = relX - randOffsetRange
      const end = relX + randOffsetRange
      this.settings.granular.params.grainSize.value
      this.regions.clearRegions()
      this.regions.addRegion({
        start,
        end,
        content: "",
        color: "rgba(170, 197, 216, 0.2)",
        resize: false,
      })

      this.regions.on("region-updated", (region) => {
        console.log("Updated region", region)
        const startRelX = mapNumber(
          region.start,
          0,
          this.audioNode.buffer.duration,
          0,
          1
        )
        this.settings.granular.sourcePoint = startRelX
      })

      this.regions.enableDragSelection({
        color: "rgba(255, 0, 0, 0.1)",
      })

      this.updateRateInterval()
    },

    addGrain() {
      console.log("adding grain", this.settings.granular.grains)

      // access buffer
      window.audioNode = this.audioNode
      this.buffer = this.audioNode.buffer.getChannelData(0)
      window.buffer = this.buffer
      // this.buffer = null // TODO

      // to create a buffer, one needs to clone and then change the data
      // const clonedBuffer = Tone.context.createBuffer(
      //   1,
      //   this.buffer.length,
      //   44100
      // )
      // const bufferData = clonedBuffer.getChannelData(0) // TODO: just using one channel for now (even though there are two channels)
      // for (let i = 0; i < this.buffer.length; i++) {
      //   bufferData[i] = this.audioNode.buffer.getChannelData(0)[i]
      // }

      // // determine where to read the grain from
      const baseOffset = mapNumber(
        this.settings.granular.sourcePoint,
        0,
        1,
        0,
        this.audioNode.buffer.duration
      )

      // uniform random
      // const randOffsetRange =
      //   this.settings.granular.params.spray.value *
      //   this.settings.granular.params.grainSize.value
      // const randOffset = randomFloat(0, randOffsetRange) - randOffsetRange / 2
      const randOffset = randomGaussian(
        0,
        this.settings.granular.params.random.value
      )

      const grainOffset = clamp(
        baseOffset + randOffset,
        0,
        this.audioNode.buffer.duration
      )

      // create a grain buffer
      // const grain = Tone.context.createBufferSource()
      // grain.buffer = clonedBuffer
      const grain = new Tone.Player(this.audioNode.buffer)
      // grain.addEventListener("ended", () => {
      setTimeout(() => {
        this.settings.granular.grains.pop()
      }, 1000)

      // connect audio node to both effect send
      grain.connect(this.effectSendNode)
      // and destination
      grain.connect(Tone.Master)

      window.grain = grain

      window.grain = grain

      // play grain
      console.log({ grainOffset })
      grain.start(
        Tone.context.currentTime,
        grainOffset,
        this.settings.granular.params.grainSize.value
      )

      // draw grain
      console.log({ grainOffset })
      const x = mapNumber(
        grainOffset,
        0,
        this.audioNode.buffer.duration,
        0,
        this.width
      )
      console.log({ x })
      this.settings.granular.grains.push({ x })
      this.drawGrains()

      // cleanup grain after playing
    },

    clearCanvas() {
      this.canvasCtx.clearRect(0, 0, this.width, this.height)
    },

    drawGrains() {
      this.clearCanvas()

      this.canvasCtx.fillStyle = "rgba(10, 10, 10, 0.4)"
      this.canvasCtx.beginPath()

      // drawing source point
      // const r = 5
      // this.canvasCtx.arc(this.x, this.height / 2, r, 0, 2 * Math.PI)
      // this.canvasCtx.stroke()
      this.canvasCtx.fill()

      for (let i = 0; i < this.settings.granular.grains.length; i++) {
        const { x } = this.settings.granular.grains[i]
        this.canvasCtx.fillStyle = "var(--blue)"

        // rect
        // const minW = 5
        // const w =
        //   (this.width / this.audioNode.buffer.duration) *
        //   this.settings.granular.params.grainSize.value
        // const h = 20
        // const size = Math.max(minW, w)
        // this.canvasCtx.fillRect(x - w / 2, this.height / 2 - h / 2, size, h)

        // circle
        this.canvasCtx.beginPath()
        const r =
          ((this.width / this.audioNode.buffer.duration) *
            this.settings.granular.params.grainSize.value) /
          2
        this.canvasCtx.arc(x, this.height / 2, r, 0, 2 * Math.PI)
        // this.canvasCtx.stroke()
        this.canvasCtx.fill()
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

.grain {
  background: red;
  width: 20px;
}

#waveform-wrapper {
  position: relative;
  #waveform,
  #canvas {
    border-radius: calc(var(--border-radius) / 2);
  }

  #canvas {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100%;
    z-index: 0;
  }

  #waveform {
    width: 100%;
  }
}
</style>
