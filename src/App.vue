<template>
  <div id="app" class="no-select">
    <div id="add-button" @click="addSound">➕</div>
    <Sample
      v-for="(sample, idx) in samples"
      :key="idx"
      :name="sample.name"
      :audio="sample.audio"
      :idx="idx"
    />
    <Reverb />
  </div>
</template>

<script>
import Tone from "tone"

import Sample from "@/components/Sample"
import Reverb from "@/components/Reverb"

export default {
  name: "App",

  components: {
    Sample,
    Reverb,
  },

  data() {
    return {
      isPlaying: false,
      samples: [],
      presets: {
        1: {
          audio: "presets/sample 1_guit_plus_background.mp3",
          name: "guit + bg",
        },
        2: { audio: "presets/sample 2_guit.mp3", name: "guit" },
        3: { audio: "presets/sample 3_background.mp3", name: "bg" },
        4: { audio: "presets/sample 4_birds_and_chimes.mp3", name: "chimes" },
      },
    }
  },

  mounted() {
    this.samples.push(this.presets[1]) // 1-based as referring to keyboard key
    // this.samples = this.preset

    // unselect controls
    document.body.onclick = () => {
      console.log("clicked body")
      // any click in body, unselects the controls
      this.$root.$emit("toggleControls")
    }

    // quick entry of presets with keyboard (1, 2, 3, 4)
    document.addEventListener("keypress", (event) => {
      if (
        event.key == 1 ||
        event.key == 2 ||
        event.key == 3 ||
        event.key == 4
      ) {
        this.samples.push(this.presets[event.key])
      }
    })

    window.Tone = Tone
  },

  methods: {
    addSound() {
      console.log("adding sound TODO")
    },
  },
}
</script>

<style lang="scss">
:root {
  --blue: rgb(86, 143, 179);
  --blue-light: rgb(170, 197, 216);
  --yellow: rgb(255, 220, 96);
  --border-radius: 20px;
  --reverb-radius: 150px;
}

html,
body {
  background: var(--yellow);
  width: 100%;
  height: 100%;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
}

.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
}

#add-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background-color: var(--blue);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}
</style>
