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
      class="app-button"
      src="icons/save.svg"
      style="right: 80px"
      @click="saveSession"
    />
    <img
      id="record-button"
      class="app-button"
      src="icons/record.svg"
      style="right: 140px"
      :class="{ recording: recording }"
      @click="toggleSimpleRecord"
    />
    <img
      id="mic-button"
      class="app-button"
      src="icons/mic.svg"
      style="right: 200px"
      :class="{ recording: microphoning }"
      @click="toggleMicrophone"
    />
    <Sample
      v-for="(sample, idx) in samples"
      ref="samples"
      :key="idx"
      :name="sample.name"
      :audio="sample.audio"
      :idx="idx"
      :audio-buffer="sample.buffer"
      @mouseover.native="$root.lastSampleInteractionIdx = idx"
      @destroyed="destroyed"
    />
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
// import Vue from "vue"

import * as lamejs from "@breezystack/lamejs"

import Sample from "@/components/Sample"
import Reverb from "@/components/Reverb"
import Delay from "@/components/Delay"
import { isMobile, audioBufferToWav } from "@/utils"
// eslint-disable-next-line no-unused-vars
import { MediaRecorder, register } from "extendable-media-recorder"
// eslint-disable-next-line no-unused-vars
import { connect } from "extendable-media-recorder-wav-encoder"

// import merge from "lodash.merge"

import {
  BlobWriter,
  TextReader,
  ZipWriter,
  BlobReader,
  ZipReader,
  TextWriter,
} from "@zip.js/zip.js"

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
      recording: false,
      microphoning: false,
    }
  },

  created() {
    // effect nodes will connect here from other places
    const useCompressor =
      new URLSearchParams(window.location.search).get("uc") === "1"
    this.$root.useCompressor = useCompressor
    console.log("useCompressor", useCompressor)

    this.$root.preMaster = new Tone.Compressor(-30, 3).connect(Tone.Master)

    this.initMicrophone()
    this.initRecord()

    console.log("isMobile", isMobile())
  },

  mounted() {
    this.samples.push(this.presets[1])

    // quick entry of presets with keyboard (1, 2, 3, 4)
    document.addEventListener("keydown", (event) => {
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
        if (this.samples.length >= 10) return
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

    toggleSimpleRecord() {
      if (!this.recording) {
        this.startSimpleRecord()
        this.recording = true
      } else {
        this.stopSimpleRecord()
        this.recording = false
      }
    },

    startSimpleRecord() {
      this.simpleRecorder = new Tone.Recorder()
      this.$root.preMaster.connect(this.simpleRecorder)
      // start recording
      this.simpleRecorder.start()
    },

    async stopSimpleRecord() {
      const recording = await this.simpleRecorder.stop()
      const url = URL.createObjectURL(recording)
      const anchor = document.createElement("a")
      anchor.download = "recording.webm"
      anchor.href = url
      anchor.click()
    },

    async initRecord() {
      console.log("recording...")

      this.mediaRecorder = null
      this.audioBlobs = []
      this.capturedStream = null

      // Register the extendable-media-recorder-wav-encoder
      // await register(await connect())
    },

    async record() {
      if (!this.recording) {
        console.log("recording...")
        this.startRecording()
        this.recording = true
      } else {
        console.log("finished recording")
        const audioBlob = await this.stopRecording()
        if (audioBlob) {
          const audio = new Audio()
          audio.src = URL.createObjectURL(audioBlob)
          audio.play()
        }
        this.recording = false
      }
    },

    // Starts recording audio
    startRecording() {
      return navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
          },
        })
        .then((stream) => {
          this.audioBlobs = []
          this.capturedStream = stream

          // Use the extended MediaRecorder library
          this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/ogg",
          })

          // Add audio blobs while recording
          this.mediaRecorder.addEventListener("dataavailable", (event) => {
            this.audioBlobs.push(event.data)
          })

          this.mediaRecorder.start()
        })
        .catch((e) => {
          console.error(e)
        })
    },

    stopRecording() {
      return new Promise((resolve) => {
        if (!this.mediaRecorder) {
          resolve(null)
          return
        }

        this.mediaRecorder.addEventListener("stop", () => {
          console.log("stopped")
          const mimeType = this.mediaRecorder.mimeType
          const audioBlob = new Blob(this.audioBlobs, { type: mimeType })

          if (this.capturedStream) {
            this.capturedStream.getTracks().forEach((track) => track.stop())
          }

          resolve(audioBlob)
        })

        this.mediaRecorder.stop()
      })
    },

    convertWavToMp3(wavBlob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = function () {
          const arrayBuffer = this.result

          // Create a WAV decoder
          const wavDecoder = lamejs.WavHeader.readHeader(
            new DataView(arrayBuffer)
          )

          // Get the WAV audio data as an array of samples
          // const wavSamples = new Int16Array(arrayBuffer, wavDecoder.dataOffset, wavDecoder.dataLen / 2);
          const wavSamples = new Int16Array(
            arrayBuffer,
            wavDecoder.dataOffset,
            wavDecoder.dataLen / 2
          )

          // Create an MP3 encoder
          const mp3Encoder = new lamejs.Mp3Encoder(
            wavDecoder.channels,
            wavDecoder.sampleRate,
            128
          )

          // Encode the WAV samples to MP3
          const mp3Buffer = mp3Encoder.encodeBuffer(wavSamples)

          // Finalize the MP3 encoding
          const mp3Data = mp3Encoder.flush()

          // Combine the MP3 header and data into a new ArrayBuffer
          const mp3BufferWithHeader = new Uint8Array(
            mp3Buffer.length + mp3Data.length
          )
          mp3BufferWithHeader.set(mp3Buffer, 0)
          mp3BufferWithHeader.set(mp3Data, mp3Buffer.length)

          // Create a Blob from the ArrayBuffer
          const mp3Blob = new Blob([mp3BufferWithHeader], { type: "audio/mp3" })

          resolve(mp3Blob)
        }

        reader.onerror = function (error) {
          reject(error)
        }

        // Read the input blob as an ArrayBuffer
        reader.readAsArrayBuffer(wavBlob)
      })
    },

    destroyed(name) {
      // find the sample by name and remove it
      const sample = this.samples.find((sample) => sample.name === name)
      if (sample) {
        this.samples.splice(this.samples.indexOf(sample), 1)
      }
    },

    downloadFile(blob, filename) {
      const a = document.createElement("a")
      const url = URL.createObjectURL(blob)
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      setTimeout(function () {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }, 0)
    },

    async loadSession(zipFileBlob) {
      this.samples = []

      const zipFileReader = new BlobReader(zipFileBlob)
      const configWriter = new TextWriter()
      const zipReader = new ZipReader(zipFileReader)

      const entries = await zipReader.getEntries()
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        console.log("entry", entry)
        const blobWriter = new BlobWriter()
        if (entry.filename === "config.json") {
          const configJson = await entry.getData(configWriter)
          const config = JSON.parse(configJson)
          const d1 = this.$refs.delay.$data
          const d2 = config.effects.delay
          // const merged = merge(this.$refs.delay.$data, config.effects.delay)
          this.$refs.delay.$data.params.range = 100
          // this.$refs.delay.$data = merged
          // Vue.set(this.$refs.delay, "$data", merged)
          window.d1 = d1
          window.d2 = d2
          // window.merged = merged
        } else {
          const blobMp3 = await entry.getData(blobWriter)
          window.blob = blobMp3
          const blobUrl = URL.createObjectURL(blobMp3)
          this.samples.push({
            audio: blobUrl,
            name: "foo", // TODO: fix the name
          })
          console.log(blobMp3)
        }
      }
      await zipReader.close()
    },

    async saveSession() {
      const saveFilename = prompt("name to save?")
      const zipFileWriter = new BlobWriter()
      const zipWriter = new ZipWriter(zipFileWriter)

      // save session state
      const configData = this.getSaveData()
      const configJson = JSON.stringify(configData, null, 4)
      const configBlob = new Blob([configJson], { type: "application/json" })
      const configReader = new TextReader(configBlob)
      await zipWriter.add("config.json", configReader)

      // save audio samples
      for (let idx = 0; idx < this.$refs.samples.length; idx++) {
        const sample = this.$refs.samples[idx]
        const buffer = sample.audioNode.buffer
        var wav = audioBufferToWav(buffer)
        const blobWav = new Blob([wav], { type: "audio/mpeg" })
        const blobMp3 = await this.convertWavToMp3(blobWav)
        const blobReader = new BlobReader(blobMp3)
        await zipWriter.add(`${sample.name}.mp3`, blobReader)
      }

      await zipWriter.close()

      // zip the thing and download it
      const zipFileBlob = await zipFileWriter.getData()
      this.downloadFile(zipFileBlob, `${saveFilename}.digicanvas`)
    },

    getSaveData() {
      return {
        samples: this.$refs.samples.map((sample) => sample.getSaveData()),
        effects: {
          reverb: this.$refs.reverb.getSaveData(),
          delay: this.$refs.delay.getSaveData(),
        },
      }
    },

    initMicrophone() {
      this.microphone = new Tone.UserMedia()
      this.recorder = new Tone.Recorder()
      this.microphone.connect(this.recorder)
      this.microphone.open()
    },

    async toggleMicrophone() {
      // Tone.context.resume()
      if (!this.microphoning) {
        console.log("microphoning...")
        this.microphoning = true
        this.recorder.start()
      } else {
        console.log("finished microphoning")
        this.microphoning = false
        const data = await this.recorder.stop()
        const blobUrl = URL.createObjectURL(data)
        // const player = new Tone.Player(blobUrl, () => {}).toDestination()
        this.samples.push({
          audio: blobUrl,
          name: "my recording",
        })
        // window.player = player
      }
    },

    handleDrop(event) {
      console.log("handling drop")
      const file = event.dataTransfer.files[0]
      window.file = file
      console.log(file)
      if (file && file.type.startsWith("audio/")) {
        this.initSample(file)
      } else if (file.name.endsWith(".digicanvas")) {
        console.log("should load this one")
        if (
          confirm(
            "Loading this configuration file will loose all current state session. Are you sure you want to proceed?"
          )
        )
          this.loadSession(file)
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

.recording {
  background: red;
}
</style>
