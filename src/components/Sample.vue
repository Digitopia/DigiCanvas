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
            class="overlay-icon"
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
      <div ref="header" class="header">{{ name }}</div>
      <div id="waveform-wrapper">
        <div ref="waveform" :class="`waveform-${idx}`"></div>
        <canvas id="canvas" ref="canvas"></canvas>
      </div>
      <div id="buttons">
        <div id="settings-btn" @click.stop="toggleControls('settings')">
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
// import gsap from "gsap"

import { mapNumber, randomGaussian, clamp, lerpColor } from "@/utils"

export default {
  props: {
    audio: {
      type: String,
      required: true,
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
      audioNode: null, // to be used as source of the grains
      wavesurfer: null,
      controls: "", // other options: 'settings', 'granular' (ui)
      mode: "sample", // or 'granular'
      settings: {
        sample: {
          // modes: ["one-shot", "back-and-forth", "loop"],
          modes: ["one-shot", "loop"],
          // mode: "one-shot",
          mode: "loop",
        },
        granular: {
          origin: null, // this is stored in [0, 1] range of the progress of the sample
          params: {
            grainSize: {
              min: 0.05,
              max: 1.5,
              value: 1.5,
            },
            rate: {
              // how often a new grain is produced [100ms, 2000ms]
              min: 0.1,
              max: 2,
              value: 1,
            },
            random: {
              // how random (0 is at center, 1 is almost linearly, but still follows normal distribution)
              min: 0.0,
              max: 1.0,
              value: 0.5,
            },
          },
          sliders: {},
          grains: [],
          envelope: {
            attack: 0.2,
            release: 0.2,
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
              min: mapNumber(100, 200 * 0.1, 200 * 2, 0.1, 2),
              max: 2,
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
      pixelsPerSecond: 30,
      maxWidth: 800,
      minWidth: 250,
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
      if (this.audioNode && this.audioNode.buffer)
        return this.audioNode.buffer.duration
      return NaN
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

    mode() {
      console.log("mode is now", this.mode)
    },

    controls() {
      console.log("controls are now", this.controls)
      this.settings.region.setOptions({
        resize: !this.controls,
        drag: !this.controls,
      })
    },
  },

  mounted() {
    window.WaveSurfer = WaveSurfer
    window.region = this.settings.region
    window.settings = this.settings

    this.initWaveform()
    this.initAudio()
    this.initGranularSliders()
    this.initCanvas()

    this.$refs.container.style.minWidth = this.minWidth + "px"
    this.$refs.container.style.maxWidth = this.maxWidth + "px"

    this.$root.$on("toggleControls", this.toggleControls)
    this.$root.$on("effectDrag", this.effectDrag)

    setTimeout(() => {
      this.resize()
    }, 1000)
  },

  methods: {
    progress2Timestamp(progress) {
      return mapNumber(progress, 0, 1, 0, this.bufferDuration)
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
        cursorColor: "black", // start black, should change to black
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
      })

      wavesurfer.on("interaction", () => {
        console.log("interaction event")
      })

      wavesurfer.on("play", () => {
        console.log("play event")
      })

      wavesurfer.on("pause", () => {
        console.log("pause event")
      })

      // wavesurfer.on("finish", () => {
      //   wavesurfer.seekTo(0)
      //   this.isPlaying = false
      //   if (this.settings.sample.mode == "loop") this.play()
      // })

      this.$refs.waveform.addEventListener("click", () => {
        if (this.controls) return
        console.log("click")
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

      wavesurfer.load(this.audio)

      Draggable.create(this.$refs.container, {
        trigger: this.$refs.header,
        type: "x,y",
        // edgeResistance: 0.65,
        bounds: "html",
        zIndexBoost: true,
        onDrag: () => {
          this.$root.$emit("effectDrag", this.$parent.$refs.reverb.$children[0])
          this.$root.$emit("effectDrag", this.$parent.$refs.delay.$children[0])
        },
      })

      this.wavesurfer = wavesurfer
      window.wavesurfer = wavesurfer
      this.$root.wavesurfer = this.wavesurfer
    },

    initAudio() {
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
        // this.initScaleDraggable()
        // this.$refs.waveform.style.width = `${
        //   this.bufferDuration * this.pixelsPerSecond
        // }px`
        setTimeout(() => {
          this.initRegion()
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

      // connect audio node to gain and master (previously connect to effect sends)
      this.audioNode.connect(this.audioGainNode)
      this.audioGainNode.connect(Tone.Master)
    },

    initGranularSliders() {
      const opts = {
        size: [20, 80],
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
      const playbackRate = mapNumber(
        width,
        0,
        this.maxWidth,
        0,
        this.originalDuration
      )

      // interpolate color
      const startColor = [255, 255, 255, 0.8]
      const stopColor = [255, 255, 255, 1]
      const color = lerpColor(
        startColor,
        stopColor,
        mapNumber(width, 0, this.maxWidth, 0, 1)
      )
      this.$refs.container.style.backgroundColor = `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`

      // this.settings.scale.params.timestretch.value = playbackRate
      console.log({ playbackRate })

      this.resize()

      // const invertedPlaybackRate = mapNumber(
      //   val,
      //   this.settings.scale.params.timestretch.min,
      //   this.settings.scale.params.timestretch.max,
      //   this.settings.scale.params.timestretch.max,
      //   this.settings.scale.params.timestretch.min
      // )
      // console.log({ invertedPlaybackRate })
      // this.audioNode.playbackRate = invertedPlaybackRate
      // this.wavesurfer.setOptions({ audioRate: invertedPlaybackRate })
    },

    initCanvas() {
      this.canvas = this.$refs.canvas
      this.canvasCtx = this.canvas.getContext("2d")
      this.resize()
    },

    initScaleDraggable() {
      // const deltaX = (200 - 24) / 2
      const that = this
      const minX = -(that.originalWidth - that.minWidth)
      const maxX = that.maxWidth - that.originalWidth
      console.log({ minX, maxX })
      Draggable.create(this.$refs.scaleButton, {
        trigger: this.$refs.scaleImage,
        type: "x,y",
        lockAxis: true,
        bounds: {
          // minX: -deltaX,
          // maxX: deltaX,
          minX,
          maxX,
          minY: 0,
          maxY: -128,
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
          } else {
            // const mappedTimestretch = mapNumber(
            //   this.endX,
            //   0,
            //   deltaX,
            //   that.settings.scale.params.timestretch.min,
            //   that.settings.scale.params.timestretch.max
            // )
            // const w = parseInt(that.$refs.container.style.width)
            const newWidth = that.width + this.deltaX
            if (newWidth > that.maxWidth || newWidth < that.minWidth) {
              // gsap.to(this.target, {
              //   x: 0,
              //   y: 0,
              //   ease: "power2.out",
              //   duration: 0.01,
              // })
              // return
            }
            that.updateTimestretch(newWidth)
            // gsap.to(this.target, {
            //   x: 0,
            //   y: 0,
            //   ease: "power2.out",
            //   duration: 0.01,
            // })
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
    },

    resetTimestretch() {
      this.updateTimestretch(this.originalDuration * this.pixelsPerSecond)
    },

    initRegion() {
      console.log("initting region...")
      let start, end
      if (this.mode === "granular") {
        if (!this.settings.granular.origin) {
          // if no source point set to middle
          this.settings.granular.origin = 0.5
        }
        // if (!this.settings.region.start) {
        //   const relX =
        //     this.settings.granular.origin * this.bufferDuration
        //   const randOffsetRange = this.grainSize * 2
        //   start = relX - randOffsetRange
        //   end = relX + randOffsetRange
        // } else {
        //   start = this.settings.region.start
        //   end = this.settings.region.end
        // }
      } else if (this.mode === "sample") {
        start = 2.5
        end = this.bufferDuration - 2.5
      }
      this.settings.region = this.regionsPlugin.addRegion({
        start,
        end,
        content: "",
        color: "rgba(170, 197, 216, 0.1)",
        resize: true,
        drag: true,
        loop: false, // NOTE: his prop doesn't work, so need to work around with region events
      })
      console.log("added region", this.settings.region)
      window.region = this.settings.region

      // to avoid UI jump at play
      this.stop()

      this.regionsPlugin.on("region-updated", (region) => {
        console.log("updated region")
        if (this.mode === "granular") {
          const mx = (region.end - region.start) / 2 + region.start
          const source = this.timestamp2Progress(mx)
          this.settings.granular.source = source
        } else if (this.mode === "sample") {
          if (!this.isPlaying) {
            // to avoid UI jump
            this.stop()
          }
        }
      })

      // workaround for looping region, since loop proper of region not working...
      this.regionsPlugin.on("region-out", (region) => {
        console.log("region out", region)
        if (this.isLooping) {
          console.log("playing region again")
          region.play()
        } else {
          this.stop()
        }
      })

      // if (this.mode === "granular") {
      //   this.updateRateInterval()
      //   this.addGrain()
      // }
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
      this.wavesurfer.setOptions({ cursorColor: "black" })
      this.settings.region.play()
      this.isPlaying = true
    },

    stop() {
      this.wavesurfer.setOptions({ cursorColor: "transparent" })
      this.wavesurfer.stop()
      this.wavesurfer.seekTo(
        this.timestamp2Progress(this.settings.region.start)
      )
      this.isPlaying = false
    },

    toggleControls(controls) {
      console.log("toggling controls:", controls)
      this.controls = this.controls === controls ? null : controls
    },

    toggleMode() {
      this.mode = this.mode === "sample" ? "granular" : "sample"

      switch (this.mode) {
        case "sample":
          this.wavesurfer.setOptions({
            // progressColor: "lightblack",
            interact: "false",
          })
          break

        case "granular":
          this.wavesurfer.setOptions({
            // progressColor: "lightgray",
            interact: "true",
          })
          break
      }

      // cleanup of granular
      clearInterval(this.settings.granular.params.rate.interval)
      this.clearCanvas()

      this.settings.region = {
        start: this.settings.region.start,
        end: this.settings.region.end,
      }
    },

    updateRateInterval() {
      clearInterval(this.settings.granular.params.rate.interval)
      this.settings.granular.params.rate.interval = setInterval(() => {
        this.addGrain()
      }, this.invertedRate * 1000)
    },

    addGrain() {
      // access buffer
      window.audioNode = this.audioNode
      this.buffer = this.audioNode.buffer.getChannelData(0)
      window.buffer = this.buffer

      // determine where to read the grain from
      const baseOffset = mapNumber(
        this.settings.granular.origin,
        0,
        1,
        0,
        this.bufferDuration
      )

      const space = (this.settings.region.end - this.settings.region.start) / 2
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

      // create a grain buffer
      const grain = new Tone.Player(this.audioNode.buffer)
      setTimeout(() => {
        this.settings.granular.grains.shift()
        this.drawGrains()
      }, this.grainSize * 1000)

      grain.volume.value = -6
      window.grain = grain

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
      const x = mapNumber(grainOffset, 0, this.bufferDuration, 0, this.width)
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
        //   (this.width / this.bufferDuration) *
        //   this.grainSize
        // const h = 20
        // const size = Math.max(minW, w)
        // this.canvasCtx.fillRect(x - w / 2, this.height / 2 - h / 2, size, h)

        // circle
        this.canvasCtx.beginPath()
        const r = ((this.width / this.bufferDuration) * this.grainSize) / 2
        this.canvasCtx.arc(x, this.height / 2, r, 0, 2 * Math.PI)
        // this.canvasCtx.stroke()
        this.canvasCtx.fill()
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

      // this.effectSends[effectName].gain.exponentialRampToValueAtTime(val, 0.02)
    },
  },
}
</script>

<style lang="scss">
#waveform {
  position: relative;
  width: 100%;
  height: 100%;
  // border-bottom-left-radius: var(--border-radius);
  // border-bottom-right-radius: var(--border-radius);
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
  // border-top-right-radius: var(--border-radius);
  // border-top-left-radius: var(--border-radius);
  // border-bottom-left-radius: 3px;
  // border-bottom-right-radius: 3px;
  background: rgb(255, 255, 255);
  &.playing {
    background: var(--blue-light) !important;
  }
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  resize: horizontal;
  overflow: hidden;
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
  img {
    pointer-events: auto; // to override the none of the parent
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

.overlay-icon {
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

// #scale-btn,
// #scale-img {
//   // background-image: url("/public/icons/stretch.svg") !important;
//   background-color: var(--blue-light);
//   &:hover {
//     cursor: move !important;
//   }
// }

.control-icon {
  // border-radius: 3px;
  padding: 2px;
  background-color: var(--blue-light);
  // width: calc(var(--buttons-height) * 0.9);
  // height: calc(var(--buttons-height) * 0.9);
  width: 30px;
  height: 30px;
  &:hover {
    cursor: pointer;
  }
  pointer-events: auto;
}

#settings-btn > img {
  border-top-right-radius: var(--border-radius);
  border-bottom-left-radius: var(--border-radius);
}

#mode-btn > img {
  border-top-left-radius: var(--border-radius);
  border-top-right-radius: var(--border-radius);
}

#scale-img {
  border-top-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
  &:hover {
    cursor: default !important;
  }
}

.disabled {
  opacity: 0.2 !important;
  pointer-events: none;
  &:hover {
    cursor: not-allowed !important;
  }
}
</style>
