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
          max: 20000,
          step: 100,
          value: 8000,
          handler: (val) => {
            console.log("dampening is now", val)
            this.reverbNode.dampening.value = val
          },
        },
        decay: {
          min: 0.15,
          max: 1,
          step: 0.01,
          value: 0.5,
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
    console.log("created reverb node")
    if (!this.$root.effectNodes) this.$root.effectNodes = []
    this.$root.effectNodes["reverb"] = this.reverbNode
  },
}
</script>
