<template>
  <div id="app" class="no-select">
    <div id="add-button" @click="addSound"></div>
    <div id="record-button" @click="record"></div>
    <Sample
      v-for="(sample, idx) in samples"
      :key="idx"
      :name="sample.name"
      :audio="sample.audio"
      :idx="idx"
    />
    <Delay style="bottom: 50px; left: 280px" />
    <Reverb style="bottom: 50px; left: 30px" />
  </div>
</template>

<script>
import Tone from "tone"

import Sample from "@/components/Sample"
import Reverb from "@/components/Reverb"
import Delay from "@/components/Delay"

export default {
  name: "App",

  components: {
    Sample,
    Reverb,
    Delay,
  },

  data() {
    return {
      isPlaying: false,
      samples: [],
      presets: {
        0: {
          audio: "presets/guit_plus_background.mp3",
          name: "guit + bg",
        },
        1: {
          audio: "presets/birds1_mono.mp3",
          name: "birds",
        },
        2: {
          audio: "presets/chains1_mono.mp3",
          name: "chains",
        },
        3: {
          audio: "presets/flute1_mono.mp3",
          name: "flute",
        },
        4: {
          audio: "presets/horse1_mono.mp3",
          name: "horse",
        },
        5: {
          audio: "presets/marimba_roll_and_clarinet1_mono.mp3",
          name: "marimba",
        },
        6: {
          audio: "presets/metalHit1_mono.mp3",
          name: "metal 1",
        },
        7: {
          audio: "presets/metalHit2_mono.mp3",
          name: "metal 2",
        },
        8: {
          audio: "presets/sailing1_mono.mp3",
          name: "sailing",
        },
        9: {
          audio: "presets/snoring1_mono.mp3",
          name: "snoring",
        },
      },
    }
  },

  mounted() {
    this.samples.push(this.presets[0])
    // this.samples = this.preset

    // quick entry of presets with keyboard (1, 2, 3, 4)
    document.addEventListener("keypress", (event) => {
      if (
        event.key == 0 ||
        event.key == 1 ||
        event.key == 2 ||
        event.key == 3 ||
        event.key == 4 ||
        event.key == 5 ||
        event.key == 6 ||
        event.key == 7 ||
        event.key == 8 ||
        event.key == 9
      ) {
        this.samples.push(this.presets[event.key])
      }
    })

    window.Tone = Tone
  },

  methods: {
    addSound() {
      // TODO:
      console.log("adding sound...")
    },

    record() {
      // TODO:
      console.log("recording...")
    },
  },
}
</script>

<style lang="scss">
:root {
  --blue: rgb(86, 143, 179);
  --blue-light: rgb(170, 197, 216);
  --yellow: rgb(255, 220, 96);
  --border-radius: 10px;
  --reverb-radius: 150px;
  --buttons-height: 34px;
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
  bottom: 20px;
  right: 20px;
  background-image: url("/public/icons/add.svg");
}

#record-button {
  bottom: 20px;
  right: 80px;
  background-image: url("/public/icons/record.svg");
}

#add-button,
#record-button {
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.2;
  position: absolute;
  &:hover {
    cursor: not-allowed;
  }
}
</style>
