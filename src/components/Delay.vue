<template>
  <Effect
    :params="params"
    :effect-node="delayNode"
    icon="icons/delay.svg"
    name="delay"
  ></Effect>
</template>

<script>
import * as Tone from "tone"
import Effect from "@/components/Effect"
import { mapExp } from "@/utils"

export default {
  components: {
    Effect,
  },

  data() {
    return {
      delayNode: null,
      params: {
        delayTime: {
          min: 0,
          max: 2.5,
          step: 0.01,
          value: 0.5,
          handler: (val) => {
            const { min, max } = this.params.delayTime
            const expVal = mapExp(val, min, max)
            console.log("delay time is now", val, expVal)
            // this.delayNode.delayTime.rampTo(expVal, 0.01)
          },
        },
        feedback: {
          min: 0,
          max: 1,
          step: 0.01,
          value: 0.5,
          handler: (val) => {
            console.log("feedback is now", val)
            this.delayNode.feedback.rampTo(val, 0.01)
          },
        },
      },
    }
  },

  mounted() {
    this.delayNode = new Tone.FeedbackDelay(
      this.params.delayTime.value,
      this.params.feedback.value
    ).toMaster()
    console.log("created delay node")
    if (!this.$root.effectNodes) this.$root.effectNodes = []
    this.$root.effectNodes["delay"] = this.delayNode
  },
}
</script>
