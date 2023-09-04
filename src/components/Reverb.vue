<template>
  <div id="reverb-area" ref="reverbArea">
    <div
      id="reverb"
      ref="reverbDiv"
      @dblclick.stop="showSliders = !showSliders"
    ></div>
    <div id="sliders" v-show="showSliders">
      <div id="dampening">Da</div>
      <div id="decay">De</div>
      <div id="range">Ra</div>
    </div>
  </div>
</template>

<script>
import gsap from "gsap"
import Draggable from "gsap/Draggable"
import Tone from "tone"

import Nexus from "nexusui"

gsap.registerPlugin(Draggable)

export default {
  data() {
    return {
      reverbNode: null,
      showSliders: false,
      draggables: [],
      sliders: {
        dampening: 0,
        range: 0,
        decay: 0,
      },
    }
  },

  computed: {
    reverbRadius() {
      return this.sliders.range.value
    },
  },

  watch: {
    reverbRadius() {
      console.log("reverbRadius:", this.reverbRadius)
      this.$refs.reverbArea.style.width = `${this.reverbRadius * 2}px`
      this.$refs.reverbArea.style.height = `${this.reverbRadius * 2}px`
      this.$root.reverbRadius = this.reverbRadius
    },
  },

  mounted() {
    this.initDraggables()
    this.initSliders()
    this.initAudio()
    window.reverbNode = this.reverbNode
  },

  methods: {
    initDraggables() {
      // define dragging for reverb
      this.draggables = Draggable.create("#reverb-area", {
        trigger: "#reverb",
        type: "x,y",
        // edgeResistance: 0.65,
        bounds: "html",
        inertia: true,
        onDrag: () => {
          this.$root.$emit("reverbOnDrag")
        },
      })[0]
    },

    initSliders() {
      const opts = {
        size: [20, 100],
        mode: "relative", // 'relative' or 'absolute'
      }

      // dampening
      const dampeningSlider = new Nexus.Slider("#dampening", {
        ...opts,
        ...{ min: 0, max: 10000, step: 10, value: 3000 },
      })
      this.sliders.dampening = dampeningSlider
      dampeningSlider.on("change", (val) => {
        console.log("dampening is now", val)
        this.reverbNode.dampening.value = val
      })

      // range
      const rangeSlider = new Nexus.Slider("#range", {
        ...opts,
        ...{ min: 50, max: 200, value: 150 },
      })
      this.sliders.range = rangeSlider

      // decay
      const decaySlider = new Nexus.Slider("#decay", {
        ...opts,
        ...{ min: 0, max: 1, value: 0.2 },
      })
      this.sliders.decay = decaySlider
      decaySlider.on("change", (val) => {
        console.log("decay/roomsize is now", val)
        this.reverbNode.roomSize.value = val
      })

      // colors
      dampeningSlider.colorize("accent", "var(--blue)")
      dampeningSlider.colorize("fill", "var(--blue-light)")
      rangeSlider.colorize("accent", "var(--blue)")
      rangeSlider.colorize("fill", "var(--blue-light)")
      decaySlider.colorize("accent", "var(--blue)")
      decaySlider.colorize("fill", "var(--blue-light)")
    },

    initAudio() {
      this.reverbNode = new Tone.Freeverb(0.05, 8000).toMaster()
      this.$root.reverbNode = this.reverbNode
    },
  },
}
</script>

<style lang="scss">
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

#sliders {
  display: flex;
  pointer-events: auto; // to override the none of the parent
  width: 100%;

  #dampening {
    width: 10px;
    height: 100px;
  }
}
</style>
