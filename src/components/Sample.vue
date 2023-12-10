<template>
  <div ref="container" class="container">
    <div class="sample" :class="{ playing: isPlaying }">
      <div
        v-show="controls === 'settings'"
        class="controls no-select"
        @click.stop
      >
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
        <div v-show="mode === 'granular'" class="granular-sliders spaced-out">
          <div :id="`grainSize-${idx}`">Gs</div>
          <div :id="`rate-${idx}`">Rt</div>
          <div :id="`random-${idx}`">Rd</div>
        </div>
      </div>
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
      <div id="waveform-wrapper" ref="waveformWrapper">
        <div ref="waveform" :class="`waveform-${idx}`"></div>
        <canvas ref="canvas" class="canvas"></canvas>
      </div>
      <div id="buttons">
        <div
          id="settings-btn"
          :class="{ active: controls === 'settings' }"
          @click.stop="toggleControls('settings')"
        >
          <img src="icons/overlay.svg" class="control-icon" alt="" />
        </div>
        <div id="mode-btn" @click.stop="toggleMode()">
          <img
            :src="mode === 'sample' ? '/icons/play.svg' : '/icons/granular.svg'"
            class="control-icon"
            alt=""
          />
        </div>
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
import Tone from "tone"
import gsap from "gsap"

// eslint-disable-next-line no-unused-vars
import {
  mapNumber,
  randomGaussian,
  // eslint-disable-next-line no-unused-vars
  randomInt,
  clamp,
  lerpColor,
  // eslint-disable-next-line no-unused-vars
  mapExp,
  mapLog,
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
  },

  data() {
    return {
      isEditingName: false,
      editName: null,
      audioNode: null, // to be used as source of the grains
      audioElementSource: null, // to be used to route the audio from waveform into the Tone.js
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
      },
      region: null, // regions are used in both granular and delimiters for the play and loop
      isPlaying: false,
      canvas: null,
      canvasCtx: null,
      width: null,
      height: null,
      pixelsPerSecond: 40,
      maxWidth: 750,
      minWidth: 200,
      originalDuration: null, // so that can revert with double click
      originalWidth: null, // so that can revert with double click
      effectSends: {
        reverb: null,
        delay: null,
      },
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
      console.log("isPlaying", this.isPlaying)
    },

    controls() {
      console.log("controls are now", this.controls)
      const bool = this.controls === null || this.controls === "scale"
      this.settings.region.setOptions({
        resize: bool,
        drag: bool,
      })
    },
  },

  mounted() {
    window.WaveSurfer = WaveSurfer
    window.region = this.settings.region
    window.settings = this.settings

    window.propAudioBuffer = this.audioBuffer
    window.propAudio = this.audio

    this.editName = this.name

    this.initWaveform()
    this.initAudio()
    this.initGranularSliders()
    this.initCanvas()

    this.$refs.container.style.minWidth = this.minWidth + "px"
    this.$refs.container.style.maxWidth = this.maxWidth + "px"

    this.$root.$on("toggleControls", this.toggleControls)
    this.$root.$on("effectDrag", this.effectDrag)

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Backspace" &&
        this.$root.lastSampleInteractionIdx === this.idx &&
        !this.isEditingName
      ) {
        this.$destroy()
      }
    })

    // gsap.to(this.$refs.container, { opacity: 1, duration: 2 })

    window.grains = this.settings.granular.grains
  },

  beforeDestroy() {
    console.log("this is going to be destroyed")
    this.resizeObserver.unobserve(this.$refs.container)
    this.$root.$off("toggleCofftrols", this.toggleControls)
    this.$root.$off("effectDrag", this.effectDrag)
    this.$el.parentNode.removeChild(this.$el)
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

    initWaveform() {
      const wavesurfer = WaveSurfer.create({
        container: this.$refs.waveform,
        backgroundColor: "white",
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

      wavesurfer.on("ready", () => {
        console.log("waveform ready for", this.audio)
        this.audioElementSource = Tone.context.createMediaElementSource(
          wavesurfer.media
        )
        Tone.connect(this.audioElementSource, this.audioGainNode)

        this.resize()
        // const initX = randomInt(0, window.innerWidth - this.width * 1.2)
        // const initY = randomInt(0, window.innerHeight - this.height * 1.2)
        // const initX = window.innerWidth / 2 - this.width / 2
        // const initY = window.innerHeight / 2 - this.height / 2
        // gsap.to(this.$refs.container, {
        //   x: initX,
        //   y: initY,
        //   ease: "power2.out",
        //   duration: 0,
        // })
      })

      wavesurfer.on("finish", () => {
        // since region-out doesn't get fired when region is full sample
        if (this.isLooping) this.settings.region.play()
      })

      wavesurfer.on("load", (evt) => {
        console.log("ON LOAD", evt)
      })

      wavesurfer.on("loading", () => {
        console.log("ON LOADING")
      })

      this.wavesurfer = wavesurfer
      window.wavesurfer = wavesurfer
      this.$refs.waveform.addEventListener("click", this.onClick)

      if (!this.audioBuffer) wavesurfer.load(this.audio)
      else {
        console.log("this.audio", this.audio)

        // this draws the waveform but throws the error GET /blob
        const p = wavesurfer.loadBlob(
          this.audio,
          [this.audioBuffer.getChannelData(0)],
          this.audioBuffer.duration
        )
        console.log(p)
        window.p = p

        // this DOES NOT get the error /GET a blob, but does not draw the waveform at all
        // window.p2 = wavesurfer.loadAudio(
        //   this.audio,
        //   this.audioBuffer.getChannelData(0),
        //   this.audioBuffer.duration
        // )
      }

      this.draggable = Draggable.create(this.$refs.container, {
        trigger: this.$refs.header,
        type: "x,y",
        bounds: "html",
        zIndexBoost: true,
        onDrag: () => {
          this.$root.$emit("effectDrag", this.$parent.$refs.reverb.$children[0])
          this.$root.$emit("effectDrag", this.$parent.$refs.delay.$children[0])
        },
      })[0]
    },

    initAudio() {
      console.log("init audio")
      // init audio node
      this.audioNode = new Tone.Player(this.audio, () => {
        console.log("loaded audio", this.audio)
        this.originalDuration = this.bufferDuration
        this.$refs.container.style.width = `${
          this.bufferDuration * this.pixelsPerSecond
        }px`
        this.originalWidth = parseInt(this.$refs.container.style.width)
        console.log("originalWidth", this.originalWidth)

        this.resetTimestretch()
        this.initResizeObserver()
        this.initScaleDraggable()
        setTimeout(() => {
          this.initRegion()
          this.stop() // to avoid UI jump at play
        }, 200) // TODO: requiring timeout
      })
      this.audioNode.volume.value = -6
      window.audioNode = this.audioNode

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

      // and create audio gain to master
      this.audioGainNode.connect(Tone.Master)
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

      grainSizeSlider.on("change", (val) => {
        const expGrainSize = mapLog(
          val,
          this.settings.granular.params.grainSize.min,
          this.settings.granular.params.grainSize.max
        )
        console.log("grainSize is now", val.toFixed(2), expGrainSize.toFixed(2))
        this.settings.granular.params.grainSize.value = expGrainSize
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
        // console.log(
        //   "inverted rate before exp",
        //   this.getInvertedRate().toFixed(2)
        // )
        // this.settings.granular.params.rate.value = logRate
        // console.log(
        //   "inverted rate after exp",
        //   this.getInvertedRate().toFixed(2)
        // )
        console.log(
          "rate is now",
          val.toFixed(2),
          logRate.toFixed(2),
          this.getInvertedRate().toFixed(2)
        )
      })

      // random
      const randomSlider = new Nexus.Slider(`#random-${this.idx}`, {
        ...opts,
        ...this.settings.granular.params.random,
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

    updateAmplitude(val) {
      // amplitude maps at a 1:1 to barHeight
      console.log("amplitude is now", val)
      this.wavesurfer.setOptions({
        barHeight: val,
      })
      console.log("using amplitude of ", val, "to apply in gain node")
      this.audioGainNode.gain.exponentialRampToValueAtTime(val, 0.02)
      this.settings.scale.params.amplitude.value = val
    },

    updateTimestretch(width) {
      console.log("timestretch is now", width)
      this.$refs.container.style.width = `${width}px`
      const playbackRate = 1 / (width / this.originalWidth)

      // interpolate color
      const startColor = [255, 255, 255, 0.95]
      const stopColor = [255, 255, 255, 0.95]
      const color = lerpColor(
        startColor,
        stopColor,
        mapNumber(width, this.minWidth, this.maxWidth, 0, 1)
      )
      this.$refs.container.style.backgroundColor = `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`

      this.settings.scale.params.timestretch.value = playbackRate
      console.log("playbackRate", playbackRate)

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
          console.log("end", this.endX, this.endY)
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
          console.log("newWidth", newWidth)
          this.updateTimestretch(newWidth)
        })
      })

      resizeObserver.observe(this.$refs.container)
      this.resizeObserver = resizeObserver // so that later can unobserve before destroy
    },

    resetTimestretch() {
      this.updateTimestretch(this.originalDuration * this.pixelsPerSecond)
      this.updateAmplitude(1)
    },

    initRegion() {
      console.log("initting region...")
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
      console.log("added region", this.settings.region)
      window.region = this.settings.region

      // this is equivalent to onDragEnd
      this.settings.region.on("update", () => {
        if (this.mode === "granular") {
          const { start, end } = this.settings.region
          const mx = (end - start) / 2 + start
          this.settings.granular.origin = this.timestamp2Progress(mx)
        }
      })

      this.settings.region.on("update-end", () => {
        if (this.mode === "sample" && !this.isPlaying) {
          // to avoid UI jump
          this.stop()
        }
      })

      // workaround for looping region, since loop proper of region not working...
      this.settings.region.on("region-out", () => {
        console.log("region out")
        if (this.isLooping) {
          console.log("playing region again")
          this.settings.region.play()
        } else {
          this.stop()
        }
      })
    },

    resize() {
      console.log("resizing...")
      this.width = this.$refs.waveformWrapper.clientWidth
      this.height = this.$refs.waveformWrapper.clientHeight
      console.log({ height: this.height })
      console.log(this.width, this.height)
      this.canvas.setAttribute("width", this.width)
      this.canvas.setAttribute("height", this.height)
      this.wavesurfer.setOptions({ height: this.height })
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
      console.log("toggling controls:", controls)
      this.controls = this.controls === controls ? null : controls
    },

    toggleMode() {
      this.stop()

      this.mode = this.mode === "sample" ? "granular" : "sample"
      console.log("mode is now", this.mode)

      switch (this.mode) {
        case "sample":
          this.wavesurfer.setOptions({ interact: true })
          break

        case "granular":
          this.wavesurfer.setOptions({ interact: false })
          break
      }
    },

    clearGranularInterval() {
      console.log(
        "clearing granular interval",
        this.settings.granular.params.rate.interval
      )
      clearInterval(this.settings.granular.params.rate.interval)
    },

    updateRateInterval() {
      this.clearGranularInterval()
      const delay = Math.round(this.getInvertedRate() * 1000)
      console.log("INVERTED RATE", delay)
      this.settings.granular.params.rate.interval = setInterval(
        (delay) => {
          this.addGrain()
          // update interval at setInterval end with new interval, only if changed from previous
          const currentDelay = Math.round(this.getInvertedRate() * 1000)
          if (delay !== currentDelay) {
            // console.log("updating")
            this.updateRateInterval()
          } else {
            // console.log("not updating")
          }
        },
        delay,
        delay
      )
    },

    addGrain() {
      // console.log("adding grain...")
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
      // console.log({ baseOffset, mappedStdDev, randOffset, grainOffset })

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
      window.grain = grain
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
        console.log("HEIGHT", this.height)
        this.canvasCtx.arc(x, this.height / 2, r, 0, 2 * Math.PI)
        // this.canvasCtx.stroke()
        this.canvasCtx.fill()
        this.canvasCtx.closePath()
      }
    },

    onClick() {
      Tone.context.resume() // so that it works in Chrome/Edge
      if (this.controls) return
      console.log("click")
      if (this.mode === "sample") {
        if (this.wavesurfer.isPlaying()) {
          console.log("stopping...")
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

    effectDrag(evt) {
      // console.log("got event", evt.$el, evt.name, evt.rangeRadius)
      // Calculate the distance between this sample center and the effect center
      const { name: effectName, rangeRadius: effectRadius } = evt
      const effectElem = evt.$el
      const effectRect = effectElem.getBoundingClientRect()
      const x1 = effectRect.left + effectRect.width / 2
      const y1 = effectRect.top + effectRect.height / 2
      const waveformRect = this.$refs.waveform.getBoundingClientRect()
      const x2 = waveformRect.left + waveformRect.width / 2
      const y2 = waveformRect.top + waveformRect.height / 2
      const dx = x1 - x2
      const dy = y1 - y2
      const distance = Math.round(Math.sqrt(dx * dx + dy * dy))

      console.log(`"d(${this.name}, ${effectName})"`, distance)

      if (distance > effectRadius) return
      const val = mapNumber(distance, 0, effectRadius, 1, 0).toFixed(2)
      console.log(val)

      this.effectSends[effectName].gain.exponentialRampToValueAtTime(val, 0.02)
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
  // margin-top: 3px;
  height: var(--buttons-height);
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
  pointer-events: none;
}

.container {
  position: relative;
  width: 200px;
  margin: 0 auto;
  border-radius: var(--border-radius);
  background: rgb(255, 255, 255);
  &.playing {
    background: var(--blue-light) !important;
  }
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  resize: horizontal;
  overflow: hidden;
  // opacity: 0;
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
  background-image: url("/public/icons/stretch.svg");
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
