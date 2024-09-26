<template>
  <!-- CONTAINER -->
  <div
    ref="sample"
    class="container"
    :class="{ debug: $root.debug }"
    style="margin: 0"
  >
    <!-- SAMPLE -->
    <div class="sample" :class="{ playing: isPlaying }">
      <div
        v-show="controls === 'settings'"
        class="controls no-select"
        @click.stop="toggleControls(controls)"
      >
        <!-- SAMPLE mode controls -->
        <div v-show="mode == 'sample'" class="spaced-out">
          <img
            v-for="m in settings.sample.modes"
            :key="m"
            :class="{
              active: settings.sample.mode === m,
              disabled: m === 'back-and-forth',
            }"
            class="sample-mode-icon"
            :src="`icons/${m}.svg`"
            @click.stop="settings.sample.mode = m"
          />
        </div>
        <!-- GRANULAR mode controls -->
        <div v-show="mode === 'granular'" class="granular-sliders spaced-out">
          <div :id="`filtering-${idx}`" @click.stop>Fs</div>
          <div :id="`grainSize-${idx}`" @click.stop>Gs</div>
          <div :id="`rate-${idx}`" @click.stop>Rt</div>
          <div :id="`random-${idx}`" @click.stop>Rd</div>
        </div>
      </div>
      <!-- HEADER -->
      <div ref="header" class="header scale-hover" @dblclick="toggleEditName">
        <template v-if="!isEditingName">
          {{ name }}
        </template>
        <template v-else>
          <input
            v-model="editName"
            type="text"
            maxlength="20"
            style="text-align: center"
            @keypress.enter="toggleEditName"
          />
        </template>
      </div>
      <!-- WAVEFORM -->
      <div id="waveform-wrapper" ref="waveformWrapper">
        <div ref="waveform" :class="`waveform-${idx}`"></div>
        <canvas ref="canvas" class="canvas"></canvas>
      </div>
      <!-- BUTTONS -->
      <div id="buttons">
        <!-- SETTINGS button -->
        <div
          id="settings-btn"
          :class="{ active: controls === 'settings' }"
          @click.stop="toggleControls('settings')"
        >
          <img src="icons/overlay.svg" class="control-icon" alt="" />
        </div>
        <!-- MODE button -->
        <div id="mode-btn" @click.stop="toggleMode()">
          <img
            :src="mode === 'sample' ? 'icons/play.svg' : 'icons/granular.svg'"
            class="control-icon"
            alt=""
          />
        </div>
        <!-- SCALE button -->
        <div
          id="scale-btn"
          ref="scaleButton"
          style="background-image: url('icons/stretch.svg')"
          @click.stop="toggleControls('scale')"
        >
          <img
            id="scale-img"
            ref="scaleImage"
            src="icons/stretch.svg"
            class="control-icon"
            alt=""
            @dblclick="resetTimestretch"
          />
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
import * as Tone from "tone"
import gsap from "gsap"

export const SAMPLE_PIXELS_PER_SECOND = 40
export const SAMPLE_MAX_WIDTH = 600
export const SAMPLE_MIN_WIDTH = 120
export const SAMPLE_MIN_WIDTH_UPLOAD = 200
export const SAMPLE_HEIGHT = 128

import {
  mapNumber,
  randomGaussian,
  randomInt,
  clamp,
  lerpColor,
  mapExp,
  mapLog,
  round,
  getCenter,
} from "@/utils"

export default {
  props: {
    audio: {
      type: String,
      required: true,
    },
    // eslint-disable-next-line vue/require-default-prop
    audioBuffer: {
      type: AudioBuffer,
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    idx: {
      type: Number,
      required: true,
    },
    // eslint-disable-next-line vue/require-default-prop
    position: {
      type: Object,
      required: false,

      // default: () => ({ x: null, y: null }),
    },
  },

  data() {
    return {
      // audio nodes
      audioNode: null, // to be used as source of the grains
      audioGainNode: null, // gain node to control via amplitude slider
      effectSends: {
        // gain nodes for each effect send
        reverb: null,
        delay: null,
      },
      audioElementSource: null, // to be used to route the audio from waveform into the Tone.js
      isEditingName: false,
      editName: null,
      wavesurfer: null,
      controls: "", // other options: 'settings', 'granular' (ui)
      mode: "sample", // or 'granular'
      settings: {
        sample: {
          modes: ["one-shot", "loop"],
          mode: "loop",
        },
        granular: {
          origin: 0.5, // this is stored in [0, 1] range of the progress of the sample (start at middle)
          params: {
            grainSize: {
              min: 0.1,
              max: 1.5,
              step: 0.01,
              value: 0.2,
            },
            rate: {
              // how often a new grain is produced [100ms, 1500s]
              min: 0.1,
              max: 1.5,
              value: 1.5, // NOTE: since nexus-ui doesn't support inverted sliders (min > max), for better UX these values later get inverted
            },
            random: {
              // how random (0 is at center, 1 is almost linearly, but still follows normal distribution)
              min: 0,
              max: 1,
              value: 0.8,
            },
          },
          sliders: {},
          grains: [],
          envelope: {
            attack: 0.02,
            release: 0.02,
          },
        },
        scale: {
          params: {
            amplitude: {
              min: 0.05,
              max: 1.5,
              value: 1,
            },
            timestretch: {
              // min and max are given by minWidth and maxWidth
              value: 1,
            },
          },
        },
        filtering: {
          active: null,
          slider: {
            min: 0,
            max: 1,
            value: 0.2,
            step: 0.01,
          },
          highpass: {
            min: 0,
            max: 5000,
            value: 2000,
            audioNode: null,
          },
          lowpass: {
            min: 200,
            max: 20000,
            value: 1,
            audioNode: null,
          },
        },
      },
      region: null, // regions are used in both granular and delimiters for the play and loop
      isPlaying: false,
      canvas: null,
      canvasCtx: null,
      width: null,
      height: null,
      pixelsPerSecond: SAMPLE_PIXELS_PER_SECOND,
      maxWidth: SAMPLE_MAX_WIDTH,
      minWidth: SAMPLE_MIN_WIDTH,
      originalDuration: null, // so that can revert with double click
      originalWidth: null, // so that can revert with double click
      paperRect: null,
    }
  },

  computed: {
    maxDuration() {
      return this.maxWidth / this.pixelsPerSecond
    },

    isLooping() {
      return !(
        this.mode === "sample" && this.settings.sample.mode === "one-shot"
      )
    },

    bufferDuration() {
      if (this.audioNode && this.audioNode.buffer) {
        return this.audioNode.buffer.duration
      }
      return NaN
    },

    grainSize() {
      return this.settings.granular.params.grainSize.value
    },
  },

  watch: {
    isPlaying() {
      console.debug("isPlaying", this.isPlaying)
    },

    controls() {
      console.debug("controls are now", this.controls)
      const bool = this.controls === null || this.controls === "scale"
      this.settings.region.setOptions({
        resize: bool,
        drag: bool,
      })
    },
  },

  created() {
    window.sample = this
    window.getCenter = getCenter
  },

  mounted() {
    this.editName = this.name

    this.initWaveform()
    this.initAudio()
    this.initGranularSliders()
    this.initCanvas()

    this.$refs.sample.style.minWidth = this.minWidth + "px"
    this.$refs.sample.style.maxWidth = this.maxWidth + "px"

    this.$root.$on("toggleControls", this.toggleControls)
    this.$root.$on("effectDragUseArea", this.effectDragUseArea)

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Backspace" &&
        this.$root.lastSampleInteractionIdx === this.idx &&
        !this.isEditingName
      ) {
        this.$destroy()
      }
    })

    window.grains = this.settings.granular.grains
    window.mapLog = mapLog
  },

  beforeDestroy() {
    console.info("beforeDestroy", this.name, this.idx)
    this.resizeObserver.unobserve(this.$refs.sample)
    this.$root.$off("toggleControls", this.toggleControls)
    this.$root.$off("effectDragUseArea", this.effectDragUseArea)
    this.$el.parentNode.removeChild(this.$el)

    // clean up audio nodes
    const nodes = [
      this.audioNode,
      this.audioGainNode,
      this.effectSends.reverb,
      this.effectSends.delay,
      this.settings.filtering.lowpass.audioNode,
      this.settings.filtering.highpass.audioNode,
      // this.audioElementSource,
    ]
    nodes.forEach((node) => {
      if (node) {
        node.dispose()
        node = null
      }
    })
  },

  methods: {
    getInvertedRate() {
      return mapNumber(
        this.settings.granular.params.rate.value,
        this.settings.granular.params.rate.min,
        this.settings.granular.params.rate.max,
        this.settings.granular.params.rate.max,
        this.settings.granular.params.rate.min
      )
    },

    toggleEditName() {
      this.isEditingName = !this.isEditingName
      if (this.isEditingName) {
        this.draggable.disable()
      } else {
        // eslint-disable-next-line vue/no-mutating-props
        this.name = this.editName
        this.draggable.enable()
      }
    },

    timestamp2Progress(timestamp) {
      return mapNumber(timestamp, 0, this.bufferDuration, 0, 1)
    },

    async initWaveform() {
      const wavesurfer = WaveSurfer.create({
        container: this.$refs.waveform,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        waveColor: "lightgray",
        progressColor: "lightgray",
        cursorColor: "black",
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
      this.regionsPlugin = wavesurfer.registerPlugin(RegionsPlugin.create())

      wavesurfer.on("ready", async () => {
        console.debug("waveform ready for", this.audio)
        this.audioElementSource = Tone.getContext().createMediaElementSource(
          wavesurfer.media
        )
        Tone.connect(this.audioElementSource, this.audioGainNode)

        await this.resize()
        this.initDraggable()
        this.initPosition()
      })

      wavesurfer.on("finish", () => {
        // since region-out doesn't get fired when region is full sample
        if (this.isLooping) this.settings.region.play()
      })

      this.wavesurfer = wavesurfer
      this.$refs.waveform.addEventListener("click", this.onClick)

      if (!this.audioBuffer) wavesurfer.load(this.audio)
      else {
        // this draws the waveform but throws the error GET /blob
        const p = wavesurfer.loadBlob(
          this.audio,
          [this.audioBuffer.getChannelData(0)],
          this.audioBuffer.duration
        )
        console.debug(p)

        // this DOES NOT get the error /GET a blob, but does not draw the waveform at all
        // window.p2 = wavesurfer.loadAudio(
        //   this.audio,
        //   this.audioBuffer.getChannelData(0),
        //   this.audioBuffer.duration
        // )
      }
    },

    initPosition() {
      let x, y
      if (this.position) {
        // use position if prop is provided
        console.log("using provided position", this.position)
        x = this.position.x
        y = this.position.y
      } else {
        // otherwise first sample is centered
        if (this.idx === 0) {
          x = window.innerWidth / 2 - this.width / 2
          y = window.innerHeight / 2 - this.height / 2 - 75
        } else {
          // and others are random
          x = randomInt(0, window.innerWidth - this.width * 1.2)
          y = randomInt(0, window.innerHeight - this.height * 1.2)
        }
      }

      // now that is init, we can show it and avoid flickering of positioning
      gsap.to(this.$refs.sample, {
        x,
        y,
        ease: "power2.out",
        duration: 0.4,
        opacity: 1,
        onComplete: () => {
          // set paper rect to be used for intersection with effects area
          const { x, y } = getCenter(this.$refs.waveform)
          this.paperRect = new this.$root.paper.Path.Rectangle({
            position: { x, y },
            size: [this.width, this.height],
            fillColor: "lightblue",
            strokeColor: "blue",
          })
        },
      })
    },

    // Called from within initWaveform, since needs width of the waveform container
    initDraggable() {
      this.draggable = Draggable.create(this.$refs.sample, {
        trigger: this.$refs.header,
        type: "x,y",
        bounds: "html",
        zIndexBoost: true,
        onDrag: () => {
          this.$root.$emit(
            "effectDragUseArea",
            this.$parent.$refs.reverb.$children[0]
          )
          this.$root.$emit(
            "effectDragUseArea",
            this.$parent.$refs.delay.$children[0]
          )
          // update paper rect
          const { x, y } = getCenter(this.$refs.waveform)
          this.paperRect.set({ position: { x, y } })
        },
      })[0]

      gsap.set(this.$refs.sample, {
        x: window.innerWidth / 2 - this.width / 2,
        y: window.innerHeight / 2 - this.height / 2,
      })
    },

    initAudio() {
      console.debug("init audio")

      this.audioNode = new Tone.Player(this.audio, () => {
        console.debug("loaded audio", this.audio)
        this.originalDuration = this.bufferDuration
        this.$refs.sample.style.width = `${
          this.bufferDuration * this.pixelsPerSecond
        }px`
        this.originalWidth = parseInt(this.$refs.sample.style.width)

        this.resetTimestretch()
        this.initResizeObserver()
        this.initScaleDraggable()
        setTimeout(() => {
          this.initRegion()
          this.stop() // to avoid UI jump at play
        }, 200) // TODO: requiring timeout
      })
      this.audioNode.volume.value = -6

      // gain node to control via amplitude slider
      this.audioGainNode = new Tone.Gain(
        this.settings.scale.params.amplitude.value
      )

      // create effect send (gain) nodes and connect them to the global effect nodes
      const effects = ["reverb", "delay"]
      effects.forEach((effect) => {
        this.effectSends[effect] = new Tone.Gain(0)
        this.effectSends[effect].connect(this.$root.effectNodes[effect])
        this.audioGainNode.connect(this.effectSends[effect])
      })

      // init frequency filters
      const filterTypes = ["highpass", "lowpass"]
      filterTypes.forEach((filterType) => {
        const filterSettings = this.settings.filtering[filterType]
        const filterNode = new Tone.Filter(filterSettings.value, filterType)
        filterNode.connect(this.$root.preMaster)
        filterSettings.audioNode = filterNode
      })
    },

    initGranularSliders() {
      const opts = {
        size: [20, 80],
        mode: "relative",
      }

      // grain size
      const grainSizeSlider = new Nexus.Slider(`#grainSize-${this.idx}`, {
        ...opts,
        ...this.settings.granular.params.grainSize,
      })
      this.settings.granular.sliders.grainSize = grainSizeSlider

      const that = this
      grainSizeSlider.on("change", function (val) {
        const expGrainSize = mapExp(
          val,
          that.settings.granular.params.grainSize.min,
          that.settings.granular.params.grainSize.max
        )
        console.debug(
          "[grain-size]",
          `val=${round(val).toString().padStart(2)}`,
          `exp=${round(expGrainSize).toString().padStart(2)}`
        )
        that.settings.granular.params.grainSize.value = expGrainSize
      })

      // rate
      const rateSlider = new Nexus.Slider(`#rate-${this.idx}`, {
        ...opts,
        ...this.settings.granular.params.rate,
      })
      this.settings.granular.sliders.rate = rateSlider
      rateSlider.on("change", (val) => {
        const logRate = mapLog(
          val,
          this.settings.granular.params.rate.min,
          this.settings.granular.params.rate.max
        )
        this.settings.granular.params.rate.value = logRate
        console.debug(
          "[rate]",
          `val=${round(val)}`,
          `log=${round(logRate)}`,
          `inv=${round(this.getInvertedRate())}`
        )
      })

      // random
      const randomSlider = new Nexus.Slider(`#random-${this.idx}`, {
        ...opts,
        ...this.settings.granular.params.random,
      })
      this.settings.granular.sliders.rate = randomSlider
      randomSlider.on("change", (val) => {
        console.debug("[random]", `val=${round(val)}`)
        this.settings.granular.params.random.value = val
      })

      // filtering
      const filteringSlider = new Nexus.Slider(`#filtering-${this.idx}`, {
        ...opts,
        ...this.settings.filtering.slider,
      })
      filteringSlider.on("change", (val) => {
        let filterFrequency
        let filterType
        if (val >= 0.5) {
          filterType = "highpass"
          filterFrequency = mapNumber(
            val,
            0.5,
            1,
            this.settings.filtering.highpass.min,
            this.settings.filtering.highpass.max
          )
          this.settings.filtering.highpass.value = filterFrequency
          this.settings.filtering.highpass.audioNode.frequency.rampTo(
            filterFrequency,
            0.1
          )
        } else {
          filterType = "lowpass"
          filterFrequency = mapNumber(
            val,
            0,
            0.5,
            this.settings.filtering.lowpass.min,
            this.settings.filtering.lowpass.max
          )
          this.settings.filtering.lowpass.value = filterFrequency
          this.settings.filtering.lowpass.audioNode.frequency.rampTo(
            filterFrequency,
            0.1
          )
        }

        console.debug(
          "[filtering]",
          `val=${round(val)}`,
          `type=${filterType}`,
          `freq=${round(filterFrequency)}`
        )

        // toggle which filter to use after the gainNode
        if (this.settings.filtering.active !== filterType) {
          this.audioGainNode.disconnect() // disconnect all outgoing connections
          this.audioGainNode.connect(
            this.settings.filtering[filterType].audioNode
          )
          this.settings.filtering.active = filterType
        }

        this.settings.filtering.value = val
      })
      // trigger on change of the slider on init
      // eslint-disable-next-line no-self-assign
      filteringSlider.value = filteringSlider.value

      // colors
      const sliders = [
        grainSizeSlider,
        rateSlider,
        randomSlider,
        filteringSlider,
      ]
      sliders.forEach((slider) => {
        slider.colorize("accent", "var(--blue)")
        slider.colorize("fill", "var(--blue-light)")
      })
    },

    updateAmplitude(val) {
      // amplitude maps at a 1:1 to barHeight
      console.debug("amplitude is now", val)
      this.wavesurfer.setOptions({
        barHeight: val,
      })
      console.debug("using amplitude of ", val, "to apply in gain node")
      this.audioGainNode.gain.exponentialRampToValueAtTime(val, 0.02)
      this.settings.scale.params.amplitude.value = val
    },

    updateTimestretch(width) {
      console.debug("timestretch is now", width)
      this.$refs.sample.style.width = `${width}px`
      const playbackRate = 1 / (width / this.originalWidth)

      // interpolate color
      const startColor = [255, 255, 255, 0.95]
      const stopColor = [255, 255, 255, 0.95]
      const color = lerpColor(
        startColor,
        stopColor,
        mapNumber(width, this.minWidth, this.maxWidth, 0, 1)
      )
      this.$refs.sample.style.backgroundColor = `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`

      this.settings.scale.params.timestretch.value = playbackRate
      console.debug("playbackRate", playbackRate)

      this.resize()

      this.wavesurfer.setPlaybackRate(playbackRate, false)
    },

    initCanvas() {
      this.canvas = this.$refs.canvas
      this.canvasCtx = this.canvas.getContext("2d")
      this.resize()
    },

    initScaleDraggable() {
      const that = this
      Draggable.create(this.$refs.scaleImage, {
        trigger: this.$refs.scaleImage,
        type: "y",
        lockAxis: true,
        bounds: {
          minY: 0,
          maxY: -128,
        },
        onDragEnd: function () {
          gsap.to(this.target, {
            y: 0,
            ease: "power2.out",
            duration: 0.2,
          })
          return
        },
        onDragStart: () => {
          gsap.set(this.$refs.scaleImage, { cursor: "grabbing" })
        },
        onDrag: function () {
          console.debug("end", this.endX, this.endY)
          if (this.lockedAxis === "x") {
            const mappedAmplitude = mapNumber(
              this.endY,
              0,
              -128,
              that.settings.scale.params.amplitude.min,
              that.settings.scale.params.amplitude.max
            )
            that.updateAmplitude(mappedAmplitude)
          }
        },
      })
    },

    initResizeObserver() {
      const resizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const newWidth = entry.contentRect.width
          console.debug("newWidth", newWidth)
          this.updateTimestretch(newWidth)
        })
      })

      resizeObserver.observe(this.$refs.sample)
      this.resizeObserver = resizeObserver // so that later can unobserve before destroy
    },

    resetTimestretch() {
      this.updateTimestretch(this.originalDuration * this.pixelsPerSecond)
      this.updateAmplitude(1)
    },

    initRegion() {
      console.debug("initting region...")
      const start = 0
      const end = this.audioNode.buffer.duration
      this.settings.region = this.regionsPlugin.addRegion({
        start,
        end,
        content: "",
        color: "rgba(170, 197, 216, 0.1)",
        resize: true,
        drag: true,
        loop: false, // NOTE: his prop doesn't work, so need to work around with region and wavesurfer events
      })
      console.debug("added region", this.settings.region)

      this.settings.region.on("update", () => {
        if (this.mode === "granular") {
          this.updateGranularOrigin()
        }
      })

      this.regionsPlugin.on("region-update-end", () => {
        if (this.mode === "sample" && !this.isPlaying) {
          // to avoid UI jump
          this.stop()
        }
      })

      // workaround for looping region, since loop proper of region not working...
      this.regionsPlugin.on("region-out", (region) => {
        console.debug("region out")
        if (this.isLooping) {
          console.debug("playing region again")
          region.play()
        } else {
          this.stop()
        }
      })
    },

    updateGranularOrigin() {
      const { start, end } = this.settings.region
      const mx = (end - start) / 2 + start
      this.settings.granular.origin = this.timestamp2Progress(mx)
    },

    async resize() {
      console.debug("resizing...")
      return new Promise((resolve) => {
        setTimeout(() => {
          this.width = this.$refs.waveformWrapper.clientWidth
          console.debug("init in resize width is", this.width)
          this.height = this.$refs.waveformWrapper.clientHeight
          console.debug({ height: this.height })
          console.debug(this.width, this.height)
          this.canvas.setAttribute("width", this.width)
          this.canvas.setAttribute("height", this.height)
          this.wavesurfer.setOptions({ height: this.height })
          resolve()
        }, 100)
      })
    },

    play() {
      if (this.mode === "sample") {
        this.wavesurfer.setOptions({ cursorColor: "black" })
        this.settings.region.play()
        this.audioGainNode.gain.exponentialRampToValueAtTime(1, 0.02)
      } else {
        this.resize()
        this.addGrain()
        this.updateRateInterval()
      }
      this.isPlaying = true
    },

    stop() {
      if (this.mode === "sample") {
        this.wavesurfer.setOptions({ cursorColor: "transparent" })
        // this.audioGainNode.gain.exponentialRampToValueAtTime(0, 0.02)
        this.wavesurfer.stop()
        this.wavesurfer.seekTo(
          this.timestamp2Progress(this.settings.region.start)
        )
      } else {
        // cleanup of granular
        this.clearGranularInterval()
        this.clearCanvas()
      }
      this.isPlaying = false
    },

    toggleControls(controls) {
      console.debug("toggling controls:", controls)
      this.controls = this.controls === controls ? null : controls
    },

    toggleMode() {
      const wasPlaying = this.isPlaying
      this.updateGranularOrigin()
      this.stop() // need to play/stop between modes
      this.clearGrains()

      this.mode = this.mode === "sample" ? "granular" : "sample"
      console.debug("mode is now", this.mode)

      if (this.mode == "sample") {
        this.wavesurfer.setOptions({ interact: true })
      } else if (this.mode == "granular") {
        this.wavesurfer.setOptions({ interact: false })
      }
      if (wasPlaying) {
        this.play()
      }
    },

    clearGranularInterval() {
      console.debug(
        "clearing granular interval",
        this.settings.granular.params.rate.interval
      )
      clearInterval(this.settings.granular.params.rate.interval)
    },

    updateRateInterval() {
      this.clearGranularInterval()
      const delay = Math.round(this.getInvertedRate() * 1000)
      console.debug("INVERTED RATE", delay)
      this.settings.granular.params.rate.interval = setInterval(
        (delay) => {
          this.addGrain()
          // update interval at setInterval end with new interval, only if changed from previous
          const currentDelay = Math.round(this.getInvertedRate() * 1000)
          if (delay !== currentDelay) {
            // console.debug("updating")
            this.updateRateInterval()
          } else {
            // console.debug("not updating")
          }
        },
        delay,
        delay
      )
    },

    addGrain() {
      // console.debug("adding grain...")
      // access buffer
      this.buffer = this.audioNode.buffer.getChannelData(0)

      // determine where to read the grain from
      const baseOffset = mapNumber(
        this.settings.granular.origin,
        0,
        1,
        0,
        this.bufferDuration
      )

      // use 1/4 of the spray (the region of the granular) as std dev
      const space = (this.settings.region.end - this.settings.region.start) / 4
      const mappedStdDev = mapNumber(
        this.settings.granular.params.random.value,
        0,
        1,
        0,
        space
      )
      const randOffset = randomGaussian(0, mappedStdDev)

      const grainOffset = clamp(
        baseOffset + randOffset,
        this.settings.region.start,
        this.settings.region.end
      )
      // console.debug({ baseOffset, mappedStdDev, randOffset, grainOffset })

      // create a grain buffer
      const grain = new Tone.Player(this.audioNode.buffer)
      grain.fadeIn = this.settings.granular.envelope.attack
      grain.fadeOut = this.settings.granular.envelope.release
      grain.playbackRate = this.settings.scale.params.timestretch.value
      setTimeout(() => {
        this.settings.granular.grains.shift() // remove the last grain created
        this.drawGrains()
      }, this.grainSize * 1000)

      grain.volume.value = -6
      grain.connect(this.audioGainNode)

      // play grain
      // grain.start(now, grainOffset, this.grainSize) // this clicks!
      grain.start("+0", grainOffset, this.grainSize) // this doesn't!

      // draw grains
      const x = mapNumber(grainOffset, 0, this.bufferDuration, 0, this.width)
      this.settings.granular.grains.push({ x })
      this.drawGrains()

      // TODO: cleanup grain after playing
    },

    clearCanvas() {
      this.canvasCtx.clearRect(0, 0, this.width, this.height)
    },

    clearGrains() {
      this.settings.granular.grains = []
      this.drawGrains()
    },

    drawGrains() {
      this.clearCanvas()

      this.canvasCtx.fillStyle = "rgba(10, 10, 10, 0.4)"
      this.canvasCtx.beginPath()

      // drawing source point
      // const r = 5
      // this.canvasCtx.beginPath()
      // this.canvasCtx.stroke()
      // this.canvasCtx.fillStyle = "red"
      // this.canvasCtx.arc(this.x, this.height / 2, r, 0, 2 * Math.PI)
      // this.canvasCtx.closePath()

      for (let i = 0; i < this.settings.granular.grains.length; i++) {
        const { x } = this.settings.granular.grains[i]
        this.canvasCtx.fillStyle = "var(--blue)"

        // circle
        this.canvasCtx.beginPath()
        const r = ((this.width / this.bufferDuration) * this.grainSize) / 2
        console.debug("HEIGHT", this.height)
        this.canvasCtx.arc(x, this.height / 2, r, 0, 2 * Math.PI)
        // this.canvasCtx.stroke()
        this.canvasCtx.fill()
        this.canvasCtx.closePath()
      }
    },

    onClick() {
      Tone.context.resume() // so that it works in Chrome/Edge
      if (this.controls) return
      console.debug("click")
      if (this.mode === "sample") {
        if (this.wavesurfer.isPlaying()) {
          console.debug("stopping...")
          this.stop()
        } else {
          this.play()
        }
      } else if (this.mode === "granular") {
        if (this.settings.granular.grains.length === 0) {
          this.play()
        } else {
          this.stop()
        }
      }
    },

    // @deprecated, use effectDragUseArea instead
    effectDragUseDistance(evt) {
      // Calculate the distance between this sample center and the effect center
      const effectName = evt.name
      const effectAreaEl = evt.$el.querySelector(".effect-area")
      const { x: x1, y: y1 } = getCenter(effectAreaEl)
      const { x: x2, y: y2 } = getCenter(this.$refs.waveform)
      const dx = x1 - x2
      const dy = y1 - y2
      const distance = Math.round(Math.sqrt(dx * dx + dy * dy))

      const effectAreaRect = effectAreaEl.getBoundingClientRect()
      const effectRadius = effectAreaRect.width
      if (distance > effectRadius) return

      const effectSendVal = mapNumber(distance, 0, effectRadius, 1, 0).toFixed(
        2
      )
      console.debug(
        `d(${this.name}, ${effectName}) = ${distance}px effectSend(${effectSendVal})`
      )

      this.effectSends[effectName].gain.exponentialRampToValueAtTime(
        effectSendVal,
        0.02
      )
    },

    effectDragUseArea(evt) {
      const effectName = evt.name
      const sampleRect = this.paperRect
      const effectCricle = evt.$data.paperCircle

      // circle needs to be converted into a path so that can calculate intersection
      const effectCirclePath = effectCricle.toPath()
      const intersection = sampleRect.intersect(effectCirclePath)
      effectCirclePath.remove()
      if (!intersection) return
      const intersectionRate = intersection.area / sampleRect.area
      intersection.remove()
      console.debug(
        `U(${effectName},${this.name})=`,
        `${(intersectionRate * 100).toFixed(2)}%`
      )

      const effectSendVal = intersectionRate
      if (effectSendVal) {
        this.setEffectSend(effectName, effectSendVal)
      }
    },

    setEffectSend(effectName, effectSendVal) {
      // this.effectSends[effectName].gain.exponentialRampToValueAtTime(
      //   effectSendVal,
      //   0.02
      // )
      this.effectSends[effectName].gain.value = effectSendVal
    },

    getSaveData() {
      return {
        ...getCenter(this.$el),
        name: this.name,
        mode: this.mode,
        settings: {
          sample: {
            mode: this.settings.sample.mode,
          },
          granular: {
            origin: this.settings.granular.origin,
            params: {
              grainSize: {
                value: this.settings.granular.params.grainSize.value,
              },
              rate: {
                value: this.settings.granular.params.rate.value,
              },
              random: {
                value: this.settings.granular.params.random.value,
              },
            },
          },
          scale: {
            params: {
              amplitude: {
                value: this.settings.scale.params.amplitude.value,
              },
              timestretch: {
                value: this.settings.scale.params.timestretch.value,
              },
            },
          },
        },
      }
    },
  },
}
</script>

<style lang="scss" scoped>
#waveform {
  position: relative;
  width: 100%;
  height: 100%;
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
  border: 1px solid var(--blue);
  &:hover {
    cursor: grab !important;
  }
}

#buttons {
  display: flex;
  justify-content: space-between;
  height: 34px;
}

.controls {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
  display: flex;
  font-size: 50px;
  span {
    opacity: 0.65;
  }
  border-radius: var(--border-radius);
  // pointer-events: none;
}

.container {
  position: absolute;
  width: 200px;
  // margin: 0 auto;
  border-radius: var(--border-radius);
  background: rgb(255, 255, 255);
  &.playing {
    background: var(--blue-light) !important;
  }
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  resize: horizontal;
  overflow: hidden;
  opacity: 0;

  &.debug {
    opacity: 0.2 !important;
  }
}

.spaced-out {
  display: flex;
  justify-content: space-evenly;
  flex-direction: row;
  align-items: center;
  width: 100%;
}

.granular-sliders {
  display: flex;
  width: 100%;
  font-size: 0.9rem;
  & > div {
    pointer-events: auto;
  }
  margin-top: -30px; // so that don't get so much on top of bottom row buttons
}

.grain {
  width: 20px;
}

#waveform-wrapper {
  position: relative;
  #waveform,
  .canvas {
    border-radius: calc(var(--border-radius) / 2);
  }

  .canvas {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 100% !important;
    z-index: 0;
    height: 128px;
  }

  #waveform {
    width: 100%;
  }
}

.sample-mode-icon {
  width: 50px;
  height: 50px;
  opacity: 0.4;
  &:hover {
    cursor: pointer;
  }
  &.active {
    opacity: 1;
  }
  pointer-events: auto !important;
}

#scale-btn {
  background-color: var(--blue-light);
  &:-moz-drag-over {
    cursor: move !important;
  }
  &:hover {
    // cursor: move !important;
  }
}

.control-icon,
.sample-mode-icon,
#scale-btn {
  transition: all 0.05s;
  &:hover {
    transform: scale(1.05);
    cursor: pointer !important;
  }
}

.control-icon {
  padding: 2px;
  background-color: var(--blue-light);
  width: 30px;
  height: 30px;
  pointer-events: auto !important;
}

#settings-btn > img {
  border-top-right-radius: var(--border-radius);
  border-bottom-left-radius: var(--border-radius);
}

#mode-btn > img {
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
}

#scale-img,
#scale-btn {
  border-top-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
  &:hover {
    cursor: n-resize !important;
  }
}

#scale-img {
  opacity: 0.15;
}

.disabled {
  opacity: 0.2 !important;
  pointer-events: none;
  &:hover {
    cursor: not-allowed !important;
  }
}
</style>
