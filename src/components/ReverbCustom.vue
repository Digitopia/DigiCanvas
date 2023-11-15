<template>
  <div id="reverb-area" ref="reverbArea">
    <div id="sliders" v-show="showSliders">
      <round-slider
        v-for="(param, paramName, idx) in params"
        :key="paramName"
        v-model="param.value"
        :start-angle="
          idx * sliderArcAngle +
          idx * sliderArcAngleStep -
          sliderArcAngleAngleOffset
        "
        :end-angle="`+${sliderArcAngle}`"
        line-cap="round"
        width="12"
        pathColor="rgba(255,255,255,0.4)"
        rangeColor="var(--blue)"
        :animation="false"
        :radius="reverbRadius"
        :showTooltip="false"
        :keyboardAction="false"
        :min="param.min"
        :max="param.max"
        :step="param.step"
        :id="paramName"
        handleSize="-3"
        style="position: absolute"
        :update="handleParamChange"
      />
    </div>
    <div
      id="reverb"
      ref="reverbDiv"
      @dblclick.stop="showSliders = !showSliders"
    ></div>
  </div>
</template>

<script>
import Tone from "tone"
import RoundSlider from "vue-round-slider"
import Draggable from "gsap/Draggable"

import gsap from "gsap"

gsap.registerPlugin(Draggable)

export default {
  components: {
    RoundSlider,
  },

  data() {
    return {
      reverbNode: null,
      showSliders: true,
      sliderArcAngle: 110,
      params: {
        dampening: { min: 0, max: 10000, step: 10, value: 3000 },
        range: { min: 50, max: 200, step: 1, value: 100 },
        decay: { min: 0, max: 1, step: 0.01, value: 0.2 },
      },
    }
  },

  computed: {
    reverbRadius() {
      return this.params.range.value
    },

    sliderArcAngleStep() {
      const n = Object.keys(this.params).length
      const remaining = 360 - n * this.sliderArcAngle
      return remaining / n
    },

    sliderArcAngleAngleOffset() {
      return this.sliderArcAngle + this.sliderArcAngleStep / 2 - 90
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
    this.initDraggable()
    this.initAudio()
    window.reverbNode = this.reverbNode
  },

  methods: {
    initDraggable() {
      this.draggable = Draggable.create("#reverb-area", {
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

    handleParamChange(roundSliderEvt) {
      const paramName = roundSliderEvt.id
      const val = roundSliderEvt.value
      if (paramName === "dampening") {
        console.log("dampening is now", val)
        this.reverbNode.dampening.value = val
      } else if (paramName === "decay") {
        console.log("decay/roomsize is now", val)
        this.reverbNode.roomSize.value = val
      }
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
  width: 200px;
  height: 200px;
  border-radius: 100%;
  background: radial-gradient(circle, var(--blue-light), rgba(0, 0, 0, 0.2));
  z-index: 10;
  // pointer-events: none; // so that can move a sample behind
}

#reverb {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  // background: var(--blue);
  width: 50px;
  height: 50px;
  border-radius: 100%;
  pointer-events: auto; // to override the none of the parent
  background-image: url("/public/icons/reverb.svg");
}

#sliders {
  // display: flex;
  position: absolute !important;
  top: 0;
  // left: 0;
  // bottom: 0;
  pointer-events: auto; // to override the none of the parent
  width: 100%;
}

.rs-handle {
  box-shadow: 0 0 2px 0 #000 !important;
  &:hover {
    cursor: pointer !important;
  }
}
</style>
