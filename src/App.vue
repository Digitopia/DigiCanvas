<template>
  <div id="app" class="no-select" @dragover.prevent @drop.prevent="handleDrop">
    <img
      id="add-button"
      class="app-button scale-hover"
      src="icons/add.svg"
      style="right: 20px"
      @click="addSound"
    />
    <img
      id="save-button"
      class="app-button disabled"
      src="icons/save.svg"
      style="right: 80px"
      @click="save"
    />
    <img
      id="record-button"
      class="app-button"
      src="icons/record.svg"
      style="right: 140px"
      @click="record"
    />
    <img
      id="mic-button"
      class="app-button"
      src="icons/mic.svg"
      style="right: 200px"
      @click="microphone"
    />
    <template v-for="(sample, idx) in samples">
      <Sample
        :ref="`sample-${idx}`"
        :key="idx"
        :name="sample.name"
        :audio="sample.audio"
        :idx="idx"
        :audio-buffer="sample.buffer"
        @mouseover.native="$root.lastSampleInteractionIdx = idx"
      />
    </template>
    <Reverb ref="reverb" style="bottom: 50px; left: 30px" />
    <Delay ref="delay" style="bottom: 50px; left: 280px" />
    <input
      id="hiddenFileInput"
      ref="fileChooser"
      type="file"
      style="display: none"
      accept=".mp3"
      @change="handleAddSound"
    />
    <a href="https://github.com/Digitopia/DigiCanvas" target="_blank">
      <img
        id="info-button"
        class="app-button scale-hover"
        src="icons/info.svg"
        @click="showInfo = true"
      />
    </a>
  </div>
</template>

<script>
import * as Tone from "tone"

import Sample from "@/components/Sample"
import Reverb from "@/components/Reverb"
import Delay from "@/components/Delay"

// eslint-disable-next-line no-unused-vars
import { randomInt, logMap, mapExp, mapLog } from "@/utils"

const presets = {
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
}

export default {
  name: "App",

  components: {
    Sample,
    Reverb,
    Delay,
  },

  data() {
    return {
      samples: [],
      presets: presets,
    }
  },

  created() {
    // effect nodes will connect here from other places
    const useCompressor =
      new URLSearchParams(window.location.search).get("uc") === "1"
    this.$root.useCompressor = useCompressor
    console.log("useCompressor", useCompressor)

    this.$root.preMaster = new Tone.Compressor(-30, 3).connect(Tone.Master)
  },

  mounted() {
    this.samples.push(this.presets[1])

    // start with a ramdom sample?
    // this.samples.push(
    //   this.presets[randomInt(0, Object.keys(this.presets).length - 1)]
    // )

    // quick entry of presets with keyboard (1, 2, 3, 4)
    document.addEventListener("keydown", (event) => {
      if (
        event.key === 0 ||
        event.key === 1 ||
        event.key === 2 ||
        event.key === 3 ||
        event.key === 4 ||
        event.key === 5 ||
        event.key === 6 ||
        event.key === 7 ||
        event.key === 8 ||
        event.key === 9
      ) {
        this.samples.push(this.presets[event.key])
      }
    })

    window.Tone = Tone
  },

  methods: {
    addSound() {
      console.log("adding sound...")
      this.$refs.fileChooser.click()
    },

    handleAddSound(event) {
      const file = event.target.files[0]
      console.log("Selected file:", file)
      this.initSample(file)
    },

    record() {
      console.log("recording...")
      const recorder = new Tone.Recorder()
      const synth = new Tone.Synth().connect(recorder)
      // start recording
      recorder.start()
      // generate a few notes
      synth.triggerAttackRelease("C3", 0.5)
      synth.triggerAttackRelease("C4", 0.5, "+1")
      synth.triggerAttackRelease("C5", 0.5, "+2")
      // wait for the notes to end and stop the recording
      setTimeout(async () => {
        // the recorded audio is returned as a blob
        const recording = await recorder.stop()
        // download the recording by creating an anchor element and blob url
        const url = URL.createObjectURL(recording)
        const anchor = document.createElement("a")
        anchor.download = "recording.mp3"
        anchor.href = url
        anchor.click()
      }, 2000)
    },

    save() {
      console.log("saving...")
    },

    microphone() {
      console.log("microphoning...")
    },

    handleDrop(event) {
      console.log("handling drop")
      const file = event.dataTransfer.files[0]
      if (file && file.type.startsWith("audio/")) {
        this.initSample(file)
      } else {
        alert("Please drop a valid audio file.")
      }
    },

    initSample(file) {
      // Load the dropped audio file
      const reader = new FileReader()
      reader.onload = (evt) => {
        // option blob
        const blob = new Blob([reader.result], { type: file.type })
        console.log("BLOB", blob)
        const blobUrl = URL.createObjectURL(blob)

        // check audio duration (by creating an Audio element and getting its metadata)
        const audio = new Audio()
        audio.src = blobUrl
        audio.addEventListener("loadedmetadata", () => {
          console.log("Audio duration:", audio.duration)
          if (audio.duration > 5) {
            console.log(blobUrl)
            this.samples.push({
              audio: blobUrl,
              name: file.name.replace(/\.[^/.]+$/, ""),
            })
          } else {
            alert("Samples need to be between 5 and 15 seconds.")
            return
            // TODO: add some silence or crop
            // eslint-disable-next-line no-unreachable
            console.log("going to add some silence")
            const data = evt.target.result
            Tone.context.decodeAudioData(data, (buffer) => {
              const modifiedBuffer = this.addSilenceToEnd(buffer, 10)
              console.log(
                "Modified audio buffer:",
                modifiedBuffer,
                modifiedBuffer.duration
              )
              // create a new blob with the silence
              const blobSilence = new Blob([modifiedBuffer], {
                type: file.type,
              })
              window.modifiedBuffer = modifiedBuffer
              const blobSilenceUrl = URL.createObjectURL(blobSilence)
              console.log("BLOB", blobSilence)
              console.log(blobSilenceUrl)
              this.samples.push({
                audio: blobSilenceUrl,
                name: file.name.replace(/\.[^/.]+$/, ""),
                buffer: modifiedBuffer,
              })
            })
          }
        })
        audio.load()
      }
      reader.readAsArrayBuffer(file)
    },

    addSilenceToEnd(audioBuffer, targetDuration) {
      const currentDuration = audioBuffer.duration
      if (currentDuration >= targetDuration) {
        console.log(
          "Audio is already equal to or longer than the target duration."
        )
        return audioBuffer
      }
      const channels = audioBuffer.numberOfChannels
      const sampleRate = audioBuffer.sampleRate
      const targetLength = Math.floor(targetDuration * sampleRate)
      // Create a new AudioBuffer with the target duration
      const newBuffer = Tone.context.createBuffer(
        channels,
        targetLength,
        sampleRate
      )
      // Copy the original audio data to the new buffer
      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel)
        newBuffer.getChannelData(channel).set(channelData)
      }
      return newBuffer
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
  overflow: hidden;
  margin: 0;
}

.scale-hover {
  transition: all 0.05s;
  &:hover {
    transform: scale(1.05);
    cursor: pointer !important;
  }
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  width: 100%;
  min-height: 100vh;
}

.no-select {
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
}

.app-button {
  bottom: 20px;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  &:hover {
    cursor: pointer;
  }
  &.disabled {
    opacity: 0.2;
    &:hover {
      cursor: not-allowed !important;
    }
  }
}

#info-button {
  top: 10px;
  right: 10px;
  width: 15px;
  height: 15px;
}
</style>
