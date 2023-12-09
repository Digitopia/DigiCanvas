<template>
  <Effect
    :params="params"
    :effect-node="reverbNode"
    icon="icons/reverb.svg"
    name="reverb"
  ></Effect>
</template>

<script>
import Tone from "tone"
import Effect from "@/components/Effect"

export default {
  components: {
    Effect,
  },

  data() {
    return {
      reverbNode: null,
      params: {
        dampening: {
          min: 0,
          max: 10000,
          step: 10,
          value: 3000,
          handler: (val) => {
            console.log("dampening is now", val)
            this.reverbNode.dampening.value = val
          },
        },
        decay: {
          min: 0,
          max: 1,
          step: 0.01,
          value: 0.2,
          handler: (val) => {
            console.log("decay/roomsize is now", val)
            this.reverbNode.roomSize.value = val
          },
        },
      },
    }
  },

  mounted() {
    this.reverbNode = new Tone.Freeverb(
      this.params.decay.value,
      this.params.dampening.value
    ).toMaster()
    this.$root.reverbNode = this.reverbNode
  },
}
</script>
