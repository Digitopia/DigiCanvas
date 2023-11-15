<template>
  <div :id="`${name}-area`" class="effect-area" :ref="`${name}Area`">
    <div class="sliders" v-show="showSliders">
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
        :radius="rangeRadius"
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
      :id="`${name}-center`"
      class="effect-center"
      :style="`background-image: url('${icon}')`"
      :ref="`${name}Center`"
      @dblclick.stop="showSliders = !showSliders"
    ></div>
  </div>
</template>

<script>
import RoundSlider from "vue-round-slider"
import Draggable from "gsap/Draggable"

import gsap from "gsap"

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
      sliderArcAngle: 110,
      rangeRadius: null, // need a specific var so that <round-slider> auto changes
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
    // eslint-disable-next-line vue/no-mutating-props
    this.params.range = {
      min: 50,
      max: 200,
      step: 1,
      value: 100,
      handler: (val) => {
        this.rangeRadius = val
        const el = document.querySelector(`#${this.name}-area`)
        el.style.width = `${val * 2}px`
        el.style.height = `${val * 2}px`
        // TODO: need to update in the root too
        // this.$root.reverbRadius = this.effectRadius
      },
    }

    this.rangeRadius = this.params.range.value
  },

  mounted() {
    this.initDraggable()
  },

  methods: {
    initDraggable() {
      this.draggable = Draggable.create(`#${this.name}-area`, {
        trigger: `#${this.name}-center`,
        type: "x,y",
        // edgeResistance: 0.65,
        bounds: "html",
        inertia: true,
        onDrag: () => {
          // TODO:
          // this.$root.$emit("reverbOnDrag")
        },
      })[0]
    },

    handleParamChange(roundSliderEvt) {
      const paramName = roundSliderEvt.id
      const val = roundSliderEvt.value
      console.log(paramName, val)
      this.params[paramName].handler(val)
    },
  },
}
</script>

<style lang="scss">
.effect-area {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 100%;
  background: radial-gradient(circle, var(--blue-light), rgba(0, 0, 0, 0.2));
  z-index: 10;
  // pointer-events: none; // so that can move a sample behind
}

.effect-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  // background: var(--blue);
  width: 50px;
  height: 50px;
  border-radius: 100%;
  pointer-events: auto; // to override the none of the parent
}

.sliders {
  position: absolute !important;
  top: 0;
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
