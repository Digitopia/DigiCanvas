<template>
  <Effect
    :params="params"
    :effect-node="delayNode"
    icon="icons/granular.svg"
    name="delay"
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
      delayNode: null,
      params: {
        delayTime: {
          min: 0,
          max: 2.5,
          step: 0.01,
          value: 0.5,
          handler: (val) => {
            console.log("delay time is now", val)
            this.delayNode.delayTime.value = val
          },
        },
        feedback: {
          min: 0,
          max: 1,
          step: 0.01,
          value: 0.2,
          handler: (val) => {
            console.log("feedback is now", val)
            this.delayNode.feedback.value = val
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
