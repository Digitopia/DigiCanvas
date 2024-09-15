<template>
  <div ref="effect" class="effect">
    <div ref="effectArea" class="effect-area"></div>
    <div
      ref="effectCenter"
      class="effect-center"
      :style="{ backgroundImage: `url('${icon}')` }"
      @dblclick.stop="showSliders = !showSliders"
    ></div>
    <div v-show="showSliders" class="sliders">
      <round-slider
        v-for="(param, paramName, idx) in params"
        :id="paramName"
        :key="paramName"
        v-model="param.value"
        :start-angle="
          idx * sliderArcAngle +
          idx * sliderArcAngleStep -
          sliderArcAngleAngleOffset
        "
        :end-angle="`+${sliderArcAngle}`"
        line-cap="round"
        width="8"
        path-color="rgba(255,255,255,0.4)"
        range-color="var(--blue)"
        :animation="false"
        radius="50"
        :show-tooltip="false"
        :keyboard-action="false"
        :min="param.min"
        :max="param.max"
        :step="param.step"
        handle-size="+2"
        style="position: absolute"
        :update="handleParamChange"
      />
    </div>
  </div>
</template>

<script>
import RoundSlider from "vue-round-slider"
import Draggable from "gsap/Draggable"

import gsap from "gsap"
import { getCenter, mapNumber } from "@/utils"
import { SAMPLE_MAX_WIDTH, SAMPLE_HEIGHT } from "@/components/Sample"

gsap.registerPlugin(Draggable)

export default {
  components: {
    RoundSlider,
  },

  props: {
    params: {
      type: Object,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    icon: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      effectNode: null,
      showSliders: false,
      sliderArcAngle: 90,
      rangeRadius: null, // need a specific var so that <round-slider> auto changes
      paperCircle: null,
    }
  },

  computed: {
    sliderArcAngleStep() {
      const n = Object.keys(this.params).length
      const remaining = 360 - n * this.sliderArcAngle
      return remaining / n
    },

    sliderArcAngleAngleOffset() {
      return this.sliderArcAngle + this.sliderArcAngleStep / 2 - 90
    },
  },

  created() {
    // calculate the diagonal (hypothenuse) of the biggest possible sample
    const maxRangeWith =
      Math.sqrt(SAMPLE_MAX_WIDTH ** 2 + SAMPLE_HEIGHT ** 2) * 1.05
    console.debug("maxRangeWith", maxRangeWith)
    // eslint-disable-next-line vue/no-mutating-props
    this.params.range = {
      // NOTE: this is actual width, not radius! (because svg files require to be in 200px width)
      min: 200,
      // max: 500,
      // max: SAMPLE_MAX_WIDTH,
      max: maxRangeWith,
      step: 1,
      value: 200,
      handler: (val) => {
        console.debug("handler in EFFECT of range is now", val)
        // this.rangeRadius = val
        // changing width/height
        // this.$refs.area.style.width = `${val * 2}px`
        // this.$refs.area.style.height = `${val * 2}px`
        const { min, max } = this.params.range
        // const scale = mapNumber(val, min, max, 1, max / min).toFixed(2)
        const scale = mapNumber(val, min, max, 1, max / min)
        console.debug(`range is now ${val}px scale(${scale})`)

        // using scale transform so that can scale the div from the center
        this.$refs.effectArea.style.transform = `scale(${scale}) `
        const newRadius = (this.$refs.effectArea.clientWidth / 2) * scale
        console.debug("newRadius", newRadius)
        this.paperCircle.set({ radius: newRadius })

        this.updatePaperCircle()
      },
    }

    this.rangeRadius = this.params.range.value
  },

  mounted() {
    this.initDraggable()

    setTimeout(() => {
      const { x, y } = getCenter(this.$refs.effectArea)
      // const radius = this.$refs.effectArea.getBoundingClientRect().width / 2
      // const radius = this.params.range.value
      const radius = this.$refs.effectArea.clientWidth / 2
      // this.paperCircle = new this.$root.paper.Path.Circle({
      this.paperCircle = new this.$root.paper.Shape.Circle({
        center: [x, y],
        radius,
        fillColor: "red",
        strokeColor: "black",
        strokeWidth: 2,
      })
    }, 1000)
  },

  methods: {
    initDraggable() {
      Draggable.create(this.$refs.effect, {
        trigger: this.$refs.effectCenter,
        type: "x,y",
        bounds: "html",
        zIndexBoost: false,
        onDragStart: () => {
          // simulate zIndexBoost, but only within effects
          const areas = document.querySelectorAll(".effect-area")
          const highest = Math.max(
            ...Array.from(areas).map((area) => parseInt(area.style.zIndex))
          )
          this.$refs.effectArea.style.zIndex = highest + 1
        },
        onDrag: () => {
          // this.$root.$emit("effectDrag", {
          //   name: this.name,
          //   el: this.$el,
          //   radius: this.rangeRadius,
          // })
          this.$root.$emit("effectDragUseArea", this)
          this.updatePaperCircle()
        },
      })
    },

    updatePaperCircle() {
      const { x, y } = getCenter(this.$refs.effectArea)
      // const radius = this.$refs.effectArea.getBoundingClientRect().width / 2
      this.paperCircle.set({ position: { x, y } })
    },

    handleParamChange(roundSliderEvt) {
      // NOTE: this seems to be doing nothin'
      const paramName = roundSliderEvt.id
      const val = roundSliderEvt.value
      this.params[paramName].handler(val)
      this.updatePaperCircle()
    },
  },
}
</script>

<style lang="scss">
.effect {
  position: absolute;
  width: 200px;
  height: 200px;
}

.effect-area {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 100%;
  background: radial-gradient(circle, var(--blue-light), rgba(0, 0, 0, 0.2));
  pointer-events: none; // so that can move a sample behind
}

.effect-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  border-radius: 100%;
  pointer-events: auto; // to override the none of the parent
  &:hover {
    border: 1px solid black;
  }
  z-index: 1000;
}

.sliders {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-100%, -100%);
  width: 50px;
  height: 50px;
  pointer-events: auto !important; // to override the none of the parent
}

.rs-handle {
  box-shadow: 0 0 2px 0 #000 !important;
  transition: all 0.05s;
  &:hover {
    transform: scale(1.1);
    cursor: pointer !important;
  }
}
</style>
