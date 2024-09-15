<template>
  <Effect
    :params="params"
    :effect-node="reverbNode"
    icon="icons/reverb.svg"
    name="reverb"
  ></Effect>
</template>

<script>
import * as Tone from "tone"
import Effect from "@/components/Effect"
import { getCenter } from "@/utils"

export default {
  components: {
    Effect,
  },

  data() {
    return {
      reverbNode: null,
      params: {
        dampening: {
          min: 0.1,
          max: 0.1,
          step: 100,
          value: 0.1,
          handler: (val) => {
            console.debug("dampening is now", val)
            // this.reverbNode.dampening.rampTo(val, 0.01)
            this.reverbNode.dampening = val
          },
        },
        decay: {
          min: 0.15,
          max: 1.5,
          step: 0.01,
          value: 0.5,
          handler: (val) => {
            console.debug("decay/roomsize is now", val)
            // this.reverbNode.roomSize.rampTo(val, 0.01)
            this.reverbNode.decay = val
          },
        },
      },
    }
  },

  mounted() {
    if (this.$root.debug) {
      window.reverb = this
    }

    // Freeverb
    // Freeverb doesn't dampening breaking when changing freq in tone@15, so using simple Reverb instead
    // this.reverbNode = new Tone.Freeverb(
    //   this.params.decay.value,
    //   this.params.dampening.value
    // )

    // Reverb (Simple)
    this.reverbNode = new Tone.Reverb(this.params.decay.value)

    // compressor node
    const threshold = -30
    const ratio = 3
    this.compressorNode = new Tone.Compressor(threshold, ratio)

    this.reverbNode.chain(this.compressorNode, this.$root.preMaster)
    if (!this.$root.effectNodes) this.$root.effectNodes = []
    this.$root.effectNodes["reverb"] = this.reverbNode
  },

  methods: {
    getSaveData() {
      return {
        ...getCenter(this.$el),
        name: this.name,
        params: {
          dampening: {
            value: this.params.dampening.value,
          },
          decay: {
            value: this.params.decay.value,
          },
          range: {
            value: this.params.range.value,
          },
        },
      }
    },
  },
}
</script>
