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
            id="one-shot-icon"
          ></span>
          <span
            :class="{ active: settings.sample.mode === 'loop' }"
            @click.stop="settings.sample.mode = 'loop'"
            id="loop-icon"
          ></span>
        </div>
        <div class="granularSliders space-out" v-show="mode == 'granular'">
          <!-- <div id="spray">Sp</div> -->
          <div :id="`grainSize-${idx}`">Gs</div>
          <div :id="`rate-${idx}`">Rt</div>
          <div :id="`random-${idx}`">Rd</div>
        </div>
      </div>
      <!-- show grains in DOM (instead of via <canvas>) -->
      <!-- <div v-show="mode === 'granular'" class="no-select" @click.stop>
        <div
          v-for="(grain, idx) in settings.granular.grains"
          :key="idx"
          class="grain"
        >
          ·
        </div>
      </div> -->
      <div
        id="controls"
        v-show="controls === 'scale'"
        class="no-select"
        @click.stop
      >
        <div class="granularSliders space-out">
          <div :id="`amplitude-${idx}`">Am</div>
          <div :id="`timestretch-${idx}`">St</div>
        </div>
      </div>
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
        <div id="scale-btn" @click.stop="toggleControls('scale')" style="">
          ↕️
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import WaveSurfer from "wavesurfer.js"
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
            // spray: { min: 0, max: 1, value: 1.0 }, // distance in function of grain size of sprea from source point
            grainSize: { min: 0.05, max: 1.5, value: 1.5 },
            rate: { min: 0.1, max: 2, value: 1 }, // how often a new grain is produced [100ms, 2000ms]
            random: { min: 0.0, max: 1.0, value: 0.5 }, // how random (0 is at center, 1 is almost linearly, but still follows normal distribution)
          },
          sliders: {},
          grains: [],
          envelope: {
            attack: 0.2,
            release: 0.2,
          },
          region: {
            // store region between toggles of sample and granular mode
            start: null,
            end: null,
          },
        },
        scale: {
          params: {
            amplitude: { min: 0, max: 1.5, value: 1 },
            timestretch: {
              min: mapNumber(100, 200 * 0.1, 200 * 2, 0.1, 2),
              max: 2,
              value: 1,
            },
          },
          sliders: {},
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

    grainSize() {
      return this.settings.granular.params.grainSize.value
    },

    invertedRate() {
      return mapNumber(
        this.settings.granular.params.rate.value,
        this.settings.granular.params.rate.min,
        this.settings.granular.params.rate.max,
        this.settings.granular.params.rate.max,
        this.settings.granular.params.rate.min
      )
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
      // this.effectSendNode.gain.value = this.effectSendGainValue

      if (this.effectSendGainValue > 0) {
        this.effectSendNode.gain.exponentialRampToValueAtTime(
          this.effectSendGainValue,
          0.02
        )
      }
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
    this.initScaleSliders()
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
        barHeight: 1, // goes from [0.1 to 4]
        barGap: 3,
        normalize: false, // if true, then barHeight for amplitude doesn't work
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
      window.wavesurfer = wavesurfer
      this.$root.wavesurfer = this.wavesurfer
    },

    initAudio() {
      // init audio node
      this.audioNode = new Tone.Player(this.audio, () => {
        console.log("loaded audio", this.audio)
      })
      this.audioNode.volume.value = -6
      window.audioNode = this.audioNode

      // gain node to control via amplitude slider
      this.audioGainNode = new Tone.Gain(
        this.settings.scale.params.amplitude.value
      )

      // init effect send (gain) node
      this.effectSendNode = new Tone.Gain(0)
      // and connect it to global reverb
      this.effectSendNode.connect(this.$root.reverbNode)

      // connect audio node to both effect send
      this.audioNode.connect(this.audioGainNode)
      this.audioGainNode.connect(this.effectSendNode)
      this.audioGainNode.connect(Tone.Master)

      // this.audioNode.chain(this.effectSendNode, Tone.Master)
    },

    initGranularSliders() {
      const opts = {
        size: [20, 100],
        mode: "relative", // 'relative' or 'absolute'
      }

      // grain size
      const grainSizeSlider = new Nexus.Slider(`#grainSize-${this.idx}`, {
        ...opts,
        ...this.settings.granular.params.grainSize,
      })
      this.settings.granular.sliders.grainSize = grainSizeSlider
      grainSizeSlider.on("change", (val) => {
        console.log("grainSize is now", val)
        this.settings.granular.params.grainSize.value = val
      })

      // rate
      const rateSlider = new Nexus.Slider(`#rate-${this.idx}`, {
        ...opts,
        ...this.settings.granular.params.rate,
      })
      this.settings.granular.sliders.rate = rateSlider
      rateSlider.on("change", (val) => {
        console.log("rate is now", val, this.invertedRate)
        this.settings.granular.params.rate.value = val
        this.updateRateInterval()
      })

      // random
      const randomSlider = new Nexus.Slider(`#random-${this.idx}`, {
        ...opts,
        ...this.settings.granular.params.randomSlider,
      })
      this.settings.granular.sliders.rate = randomSlider
      randomSlider.on("change", (val) => {
        console.log("random is now", val)
        this.settings.granular.params.random.value = val
      })

      // colors
      grainSizeSlider.colorize("accent", "var(--blue)")
      grainSizeSlider.colorize("fill", "var(--blue-light)")
      rateSlider.colorize("accent", "var(--blue)")
      rateSlider.colorize("fill", "var(--blue-light)")
      randomSlider.colorize("accent", "var(--blue)")
      randomSlider.colorize("fill", "var(--blue-light)")
    },

    initScaleSliders() {
      const opts = {
        size: [20, 100],
        mode: "relative", // 'relative' or 'absolute'
      }

      // amplitude
      const amplitudeSlider = new Nexus.Slider(`#amplitude-${this.idx}`, {
        ...opts,
        ...this.settings.scale.params.amplitude,
      })
      this.settings.scale.sliders.amplitude = amplitudeSlider
      amplitudeSlider.on("change", (val) => {
        console.log("amplitude is now", val)
        const mappedBarHeight = mapNumber(
          val,
          0,
          this.settings.scale.params.amplitude.max,
          0,
          this.settings.scale.params.amplitude.max
        )
        this.wavesurfer.setOptions({ barHeight: mappedBarHeight })
        console.log("using amplitude of ", val, "to apply in gain node")
        // this.audioGainNode.gain.value = val
        this.audioGainNode.gain.exponentialRampToValueAtTime(val, 0.02)
        this.settings.scale.params.amplitude.value = val
      })

      // timestretch
      const timestretch = new Nexus.Slider(`#timestretch-${this.idx}`, {
        ...opts,
        ...this.settings.scale.params.timestretch,
      })
      this.settings.scale.timestretch = timestretch
      timestretch.on("change", (val) => {
        console.log("timestretch is now", val)
        const container = document.querySelector(".container")
        container.style.width = `${this.width * val}px`
        console.log(this.width, container.style.width)
        this.settings.scale.params.timestretch.value = val
        const invertedPlaybackRate = mapNumber(
          val,
          this.settings.scale.params.timestretch.min,
          this.settings.scale.params.timestretch.max,
          this.settings.scale.params.timestretch.max,
          this.settings.scale.params.timestretch.min
        )
        console.log({ invertedPlaybackRate })
        this.audioNode.playbackRate = invertedPlaybackRate
        this.wavesurfer.setOptions({ audioRate: invertedPlaybackRate })
      })

      // colors
      amplitudeSlider.colorize("accent", "var(--blue)")
      amplitudeSlider.colorize("fill", "var(--blue-light)")
      timestretch.colorize("accent", "var(--blue)")
      timestretch.colorize("fill", "var(--blue-light)")
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
      // this.audioNode.seek(0)
      this.wavesurfer.seekTo(0)
      this.audioNode.restart()
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
        this.initRegion()
      } else {
        // this.wavesurfer.setOptions({ cursorColor: "transparent" })
        this.wavesurfer.setOptions({ interact: "false" })
        this.wavesurfer.setOptions({ progressColor: "lightblack" })
        clearInterval(this.settings.granular.params.rate.interval)
        this.clearCanvas()
        // store regions before leaving granular mode
        const region = this.regions.regions[0]
        this.settings.granular.region = {
          start: region.start,
          end: region.end,
        }
        this.regions.clearRegions()
      }
    },

    updateRateInterval() {
      clearInterval(this.settings.granular.params.rate.interval)
      this.settings.granular.params.rate.interval = setInterval(() => {
        this.addGrain()
      }, this.invertedRate * 1000)
    },

    initRegion() {
      let start, end
      if (!this.settings.granular.region.start) {
        const relX =
          this.settings.granular.sourcePoint * this.audioNode.buffer.duration
        const randOffsetRange = this.grainSize * 2
        start = relX - randOffsetRange
        end = relX + randOffsetRange
      } else {
        start = this.settings.granular.region.start
        end = this.settings.granular.region.end
      }
      this.regions.clearRegions()
      this.regions.addRegion({
        start,
        end,
        content: "",
        color: "rgba(170, 197, 216, 0.2)",
        resize: true,
      })

      window.regions = this.regions

      this.regions.on("region-updated", (region) => {
        console.log("Updated region", region)
        const middleX = (region.end - region.start) / 2 + region.start
        const sourcePoint = mapNumber(
          middleX,
          0,
          this.audioNode.buffer.duration,
          0,
          1
        )
        this.settings.granular.sourcePoint = sourcePoint
      })

      this.updateRateInterval()
      this.addGrain()
    },

    addGrain() {
      // access buffer
      window.audioNode = this.audioNode
      this.buffer = this.audioNode.buffer.getChannelData(0)
      window.buffer = this.buffer

      // determine where to read the grain from
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
      //   this.grainSize
      // const randOffset = randomFloat(0, randOffsetRange) - randOffsetRange / 2

      const region = this.regions.regions[0]
      const space = (region.end - region.start) / 2
      // console.log({ space })
      const mappedStdDev = mapNumber(
        this.settings.granular.params.random.value,
        0,
        1,
        0,
        space
      )
      const randOffset = randomGaussian(0, mappedStdDev)

      // console.log(randOffset)

      const grainOffset = clamp(
        baseOffset + randOffset,
        region.start,
        region.end
      )

      // create a grain buffer
      const grain = new Tone.Player(this.audioNode.buffer)
      setTimeout(() => {
        this.settings.granular.grains.shift()
        this.drawGrains()
      }, this.grainSize * 1000)

      grain.volume.value = -6
      window.grain = grain

      // console.log({ grainOffset })

      // set offsets according to envelope
      const now = Tone.context.currentTime
      const gs = this.grainSize
      const useEnvelope = true
      if (!useEnvelope) {
        // connect audio node to both effect send
        grain.connect(this.effectSendNode)
        // and destination
        grain.connect(Tone.Master)
      } else {
        const gain = new Tone.Gain(0)
        grain.connect(gain)
        gain.connect(this.effectSendNode)
        gain.connect(Tone.Master)

        const attackOffset = now + this.settings.granular.envelope.attack
        const releaseOffset = Math.max(
          gs - this.settings.granular.envelope.release,
          this.settings.granular.envelope.release
        )

        gain.gain.linearRampToValueAtTime(1, attackOffset)
        gain.gain.linearRampToValueAtTime(0, releaseOffset)
        // gain.gain.linearRampToValueAtTime(1, "+0.02")

        // console.log({
        //   now,
        //   attackOffset,
        //   releaseOffset,
        //   grainSize: gs,
        // })
      }

      // play grain
      grain.start(now, grainOffset, this.grainSize)

      // draw grains
      // console.log({ grainOffset })
      const x = mapNumber(
        grainOffset,
        0,
        this.audioNode.buffer.duration,
        0,
        this.width
      )
      // console.log({ x })
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
      // this.canvasCtx.stroke()
      // this.canvasCtx.fillStyle = "red"
      // this.canvasCtx.arc(this.x, this.height / 2, r, 0, 2 * Math.PI)

      for (let i = 0; i < this.settings.granular.grains.length; i++) {
        const { x } = this.settings.granular.grains[i]
        this.canvasCtx.fillStyle = "var(--blue)"

        // rect
        // const minW = 5
        // const w =
        //   (this.width / this.audioNode.buffer.duration) *
        //   this.grainSize
        // const h = 20
        // const size = Math.max(minW, w)
        // this.canvasCtx.fillRect(x - w / 2, this.height / 2 - h / 2, size, h)

        // circle
        this.canvasCtx.beginPath()
        const r =
          ((this.width / this.audioNode.buffer.duration) * this.grainSize) / 2
        this.canvasCtx.arc(x, this.height / 2, r, 0, 2 * Math.PI)
        // this.canvasCtx.stroke()
        this.canvasCtx.fill()
      }
    },

    updateDistance() {
      // Calculate the distance between this sample center and the global reverb center
      const reverbRect = document
        .getElementById("reverb-center")
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

.granularSliders {
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

#loop-icon,
#one-shot-icon {
  width: 50px;
  height: 50px;
}

#one-shot-icon {
  background-image: url("/public/icons/one-shot.svg");
}

#loop-icon {
  background-image: url("/public/icons/loop.svg");
}
</style>
