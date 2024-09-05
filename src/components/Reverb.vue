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
            this.reverbNode.dampening.rampTo(val, 0.01)
          },
        },
        decay: {
          min: 0.15,
          max: 0.5,
          step: 0.01,
          value: 0.5,
          handler: (val) => {
            console.log("decay/roomsize is now", val)
            this.reverbNode.roomSize.rampTo(val, 0.01)
          },
        },
      },
    }
  },

  mounted() {
    // reverb node
    this.reverbNode = new Tone.Freeverb(
      this.params.decay.value,
      this.params.dampening.value
    )
    if (this.$root.useCompressor) {
      // compressor node
      const threshold = -30
      const ratio = 3
      this.compressorNode = new Tone.Compressor(threshold, ratio)
      this.reverbNode.chain(this.compressorNode, this.$root.preMaster)
    } else {
      this.reverbNode.toMaster()
    }
    console.log("created reverb node and compressor node")
    if (!this.$root.effectNodes) this.$root.effectNodes = []
    this.$root.effectNodes["reverb"] = this.reverbNode
  },
}
</script>
