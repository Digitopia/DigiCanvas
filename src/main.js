import Vue from "vue"
import App from "./App.vue"

Vue.config.productionTip = false

new Vue({
  render: (h) => h(App),
}).$mount("#app")

// import { VueHammer } from "vue2-hammer"
// add double tap support
// const doubleTap = { type: "Tap", event: "doubletap", taps: 2 }
// VueHammer.customEvents = {
//   doubletap: doubleTap,
// }
// Vue.use(VueHammer)
