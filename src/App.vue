<template>
  <div id="app" class="no-select" @dragover.prevent @drop.prevent="handleDrop">
    <canvas
      id="paper-canvas"
      ref="paperCanvas"
      width="100%"
      height="100%"
      style="z-index: 0"
      :class="{ debug: $root.debug }"
    ></canvas>
    <img
      id="add-button"
      class="app-button scale-hover"
      src="icons/add.svg"
      style="right: 20px"
      @click="addSample"
    />
    <img
      id="add-button"
      class="app-button scale-hover"
      src="icons/trash.svg"
      style="right: 80px"
      @click="removeSample"
    />
    <img
      id="save-button"
      class="app-button"
      src="icons/save.svg"
      style="right: 140px"
      @click="saveSession"
    />
    <img
      id="record-button"
      class="app-button"
      src="icons/record.svg"
      style="right: 200px"
      :class="{ recording: recording }"
      @click="toggleSimpleRecord"
    />
    <img
      id="mic-button"
      class="app-button"
      src="icons/mic.svg"
      style="right: 260px"
      :class="{ recording: microphoning }"
      @click="toggleMicrophone"
    />
    <Sample
      v-for="(sample, idx) in samples"
      ref="samples"
      :key="idx"
      :name="sample.name"
      :audio="sample.audio"
      :position="sample.position"
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
      @change="handleSampleFileUpload"
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
import Delay from "@/components/Delay"
import Reverb from "@/components/Reverb"
import Sample from "@/components/Sample"

import { audioBufferToWav } from "@/utils"

import * as lamejs from "@breezystack/lamejs"
import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from "@zip.js/zip.js"
import { MediaRecorder } from "extendable-media-recorder"
import paper from "paper"
import * as Tone from "tone"

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
      presets,
      recording: false,
      microphoning: false,
    }
  },

  created() {
    // effect nodes will connect here from other places
    this.$root.preMaster = new Tone.Compressor(-30, 3).connect(Tone.Master)

    this.initMicrophone()
    this.initRecord()

    const urlParams = new URLSearchParams(window.location.search)
    this.$root.debug = urlParams.get("debug") === "1"
    if (this.$root.debug) {
      console.debug("DEBUG mode on")
      window.samples = this.samples
    }
  },

  mounted() {
    // start with a sample already loaded
    this.samples.push(this.presets[1])
    this.$root.lastSampleInteractionIdx = 0

    setTimeout(() => {
      window.sample = this.$refs.samples[0]
    }, 1000)

    // quick entry of presets with keyboard
    document.addEventListener("keydown", (event) => {
      if (event.key >= "0" && event.key <= "9" && this.samples.length < 6) {
        this.samples.push(this.presets[event.key])
      }
    })

    this.setupPaper()
    this.resizeCanvas()
    window.addEventListener("resize", this.resizeCanvas)
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.resizeCanvas)
  },

  methods: {
    addSample() {
      this.$refs.fileChooser.click()
    },

    handleSampleFileUpload(event) {
      const file = event.target.files[0]
      console.debug("Selected file:", file)
      this.initSample(file)
    },

    removeSample() {
      if (this.samples.length == 0) return
      console.log(this.samples.length)
      window.samples = this.samples
      const sample = this.$refs.samples[this.$root.lastSampleInteractionIdx]
      console.debug("sample to be destroyed", sample.name)
      window.sample = sample
      sample.$destroy()
      // this.destroyed(sample.name)
    },

    destroyed(name) {
      // find the sample by name and remove it
      console.info("trying to destroy", name)
      const sample = this.samples.find((sample) => sample.name === name)
      if (sample) {
        this.samples.splice(this.samples.indexOf(sample), 1)
      }
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
      console.debug("recording...")

      this.mediaRecorder = null
      this.audioBlobs = []
      this.capturedStream = null

      // Register the extendable-media-recorder-wav-encoder
      // await register(await connect())
    },

    async record() {
      if (!this.recording) {
        console.debug("recording...")
        this.startRecording()
        this.recording = true
      } else {
        console.debug("finished recording")
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
          console.debug("stopped")
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

      // first read config
      const configEntry = entries.find(
        (entry) => entry.filename === "config.json"
      )
      const configJson = await configEntry.getData(configWriter)
      const config = JSON.parse(configJson)

      // TODO: load effects settings
      // const d1 = this.$refs.delay.$data
      // const d2 = config.effects.delay
      // const merged = merge(this.$refs.delay.$data, config.effects.delay)
      // this.$refs.delay.$data.params.range = 350

      // load samples
      const sampleEntries = entries.filter((entry) => entry != configEntry)
      sampleEntries.forEach(async (entry) => {
        console.debug("entry", entry)
        const sampleName = entry.filename.split(".mp3")[0]
        const sampleConfig = config.samples.find(
          (sample) => sample.name === sampleName
        )
        const blobWriter = new BlobWriter()
        const blobMp3 = await entry.getData(blobWriter)
        const blobUrl = URL.createObjectURL(blobMp3)
        this.samples.push({
          audio: blobUrl,
          name: sampleName,
          position: {
            x: sampleConfig.x,
            y: sampleConfig.y,
          },
        })
        console.debug(blobMp3)
      })
      await zipReader.close()
    },

    async saveSession() {
      const saveFilename = prompt("name to save?")
      if (!saveFilename) return
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
        console.debug("microphoning...")
        this.microphoning = true
        this.recorder.start()
      } else {
        console.debug("finished microphoning")
        this.microphoning = false
        const data = await this.recorder.stop()
        const blobUrl = URL.createObjectURL(data)
        // const player = new Tone.Player(blobUrl, () => {}).toDestination()
        this.samples.push({
          audio: blobUrl,
          name: "my recording",
        })
      }
    },

    handleDrop(event) {
      console.debug("handling drop")
      const file = event.dataTransfer.files[0]
      console.debug(file)
      if (file && file.type.startsWith("audio/")) {
        this.initSample(file)
      } else if (file.name.endsWith(".digicanvas")) {
        console.debug("should load this one")
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
        console.debug("BLOB", blob)
        const blobUrl = URL.createObjectURL(blob)

        // check audio duration (by creating an Audio element and getting its metadata)
        const audio = new Audio()
        audio.src = blobUrl
        audio.addEventListener("loadedmetadata", () => {
          console.debug("Audio duration:", audio.duration)
          if (audio.duration > 5) {
            console.debug(blobUrl)
            this.samples.push({
              audio: blobUrl,
              name: file.name.replace(/\.[^/.]+$/, ""),
            })
          } else {
            alert("Samples need to be between 5 and 15 seconds.")
            return
            // TODO: add some silence or crop
            // eslint-disable-next-line no-unreachable
            console.debug("going to add some silence")
            const data = evt.target.result
            Tone.context.decodeAudioData(data, (buffer) => {
              const modifiedBuffer = this.addSilenceToEnd(buffer, 10)
              console.debug(
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
              console.debug("BLOB", blobSilence)
              console.debug(blobSilenceUrl)
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
        console.debug(
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

    setupPaper() {
      const canvas = this.$refs.paperCanvas
      window.onload = () => {
        paper.setup(canvas)
        paper.install(canvas)
        this.$root.paper = canvas.paper // save paperScope to be used other places
      }
    },

    resizeCanvas() {
      const app = this.$el
      const canvas = this.$refs.paperCanvas
      canvas.width = app.clientWidth
      canvas.height = app.clientHeight
      if (paper.view) {
        paper.view.viewSize = new paper.Size(canvas.width, canvas.height)
      }
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
  height: 100vh;
  position: relative;
  overflow: hidden;
}

#paper-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: none;
  &.debug {
    display: block;
    z-index: 1;
  }
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
  z-index: 2;
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
