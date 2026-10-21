export const links = {
  maya: 'https://mayakhalil.com',

  aePlugin: '',
  github: 'https://github.com/mayakhalil-cmd/RICO',
  releases: 'https://github.com/mayakhalil-cmd/RICO/releases',
  paper: 'https://computer-arts-society.com/eva/documents/2026/295_Khalil_EVA26.pdf',
  ndiTools: 'https://ndi.video/tools/',
  teVirtualMidi: 'https://www.tobias-erichsen.de/software/virtualmidi.html',
}

export const release = {
  version: 'v2.2.0',
  label: 'Public beta',
  installer: 'RICO_Setup_v2.2.0.exe',
  note: 'Core features are stable. Some are still being refined.',
}

export const requirements = [
  { key: 'OS', value: 'Windows 10 or 11' },
  { key: 'Architecture', value: 'x64 only' },
  { key: 'Price', value: 'Free' },
  { key: 'Source', value: 'Closed source (public source release planned)' },
]

export type FeatureStatus = 'available' | 'in-progress'

export interface Feature {
  id: string
  tab: string
  title: string
  status: FeatureStatus
  summary: string
  uses: string[]
}

export const features: Feature[] = [
  {
    id: 'midi', tab: 'MIDI', title: 'MIDI routing, learn and remap', status: 'available',
    summary: 'Plug in any controller or keyboard. Move a knob and RICO picks it up, gives it an address, and lets you send it wherever you need it.',
    uses: [
      'Use one MIDI keyboard to drive Unreal Engine and TouchDesigner at the same time',
      'Learn a control by moving it, then rename it so your setup stays readable',
      'Create virtual MIDI ports so other apps can see RICO as a device (needs teVirtualMIDI)',
    ],
  },
  {
    id: 'osc', tab: 'OSC', title: 'OSC to many destinations', status: 'available',
    summary: 'Send the same data to several apps at once, each on its own IP and port, and receive OSC back. No port conflicts, no duplicate patches.',
    uses: [
      'Feed one controller into TouchDesigner, Unreal and Ableton together',
      'Fill in your machine’s IP with one click and match the port in the other app',
      'Turn incoming OSC back into MIDI for hardware or a DAW',
    ],
  },
  {
    id: 'audio', tab: 'Audio', title: 'Audio analysis and beat detection', status: 'available',
    summary: 'RICO listens to your system audio, splits it into frequency bands with an FFT, detects beats, and sends those values on as control data.',
    uses: [
      'Make projection-mapped visuals react to music in real time',
      'Route one frequency band to an LED strip and another to a shader',
      'Works with whatever is playing: a DAW, a DJ set, a YouTube video',
    ],
  },
  {
    id: 'serial', tab: 'Serial', title: 'Serial and custom hardware', status: 'available',
    summary: 'Talk to microcontrollers over a serial port, so physical builds can join the same signal flow as your software.',
    uses: [
      'Drive a WS2811 LED strip through a Raspberry Pi Pico',
      'Adapt the same LED protocol to an Arduino setup',
      'Connect custom pieces like a volumetric display',
    ],
  },
  {
    id: 'spout', tab: 'Spout', title: 'Spout texture sharing', status: 'available',
    summary: 'Share live GPU textures between DirectX applications on the same machine, without recording or re-encoding.',
    uses: ['Receive a live feed from TouchDesigner or OBS', 'Pass visuals between apps during a performance'],
  },
  {
    id: 'ndi', tab: 'NDI', title: 'NDI video over the network', status: 'available',
    summary: 'Send and receive video between computers on the same network. Requires the free NDI Runtime.',
    uses: ['Send a feed from one machine to another in an installation', 'Bring a networked camera or app output into your setup'],
  },
  {
    id: 'dmx', tab: 'DMX', title: 'DMX / Art-Net lighting', status: 'available',
    summary: 'Control lighting fixtures over Art-Net from the same hub that handles your MIDI and audio.',
    uses: ['Map controller knobs to dimmers or RGB fixtures', 'Keep lights and visuals driven by the same source'],
  },
  {
    id: 'mqtt', tab: 'MQTT', title: 'MQTT for IoT and devices', status: 'available',
    summary: 'Publish and subscribe over MQTT to connect networked devices and custom hardware.',
    uses: ['Trigger events from wireless sensors or boards', 'Send values out to networked devices around a space'],
  },
  {
    id: 'guitar', tab: 'Guitar', title: 'Guitar to MIDI', status: 'available',
    summary: 'Turn a live guitar signal into MIDI notes, so playing an instrument can trigger and shape visuals or synths.',
    uses: ['Play single-note lines into a synth or visual system', 'Use your instrument as the controller for a live set'],
  },
  {
    id: 'link', tab: 'Link', title: 'Ableton Link',

    status: 'in-progress',
    summary: 'Tempo sync with other Link-enabled apps on the same network.',
    uses: ['Keep tempo-based effects in time with Ableton and other Link apps'],
  },
]

export const diagramNodes = ['MIDI', 'OSC', 'Spout', 'NDI', 'DMX / Art-Net', 'Audio analysis', 'Serial / Hardware']

export const steps = [
  {
    n: '01', title: 'Connect inputs and outputs',
    body: 'Plug in your controller, audio interface or hardware, and open the apps you want to use. RICO lists available MIDI devices, serial ports, Spout senders and NDI sources.',
  },
  {
    n: '02', title: 'Set up routing and destinations',
    body: 'Move a control to map it, then add destinations: an app’s IP and port for OSC, a MIDI output, a DMX channel, or a COM port. Presets cover common apps.',
  },
  {
    n: '03', title: 'Perform',
    body: 'RICO translates and sends everything in real time, in both directions, and runs in the background while you work. Settings are saved to a plain-text file you can carry between machines.',
  },
]

export const about = {
  title: 'Why RICO exists',
  paragraphs: [
    'Real-time audiovisual work usually means several programs, protocols and devices that don’t easily talk to each other. Getting them connected often takes programming, complex patching, or subscription software that independent artists and students can’t always afford.',
    'RICO came out of building that kind of work. It gathers routing and translation for the protocols artists actually use into one lightweight Windows application, so the setup gets out of the way and the time goes back into the piece.',
  ],
  userTest:
    'In testing, a digital musician with no prior OSC experience connected a MIDI controller, routed audio bands to TouchDesigner, and adapted RICO’s serial LED protocol to an Arduino setup without instruction.',
}

export const phantom = {
  title: 'Phantom Performer',
  where: 'Open Studios, School of Visual Arts, New York',
  body:
    'An installation where one piece of music becomes three layers of light at once. From a single machine, RICO captured live audio, analyzed it, and sent it to a GLSL shader in TouchDesigner over OSC for the projection mapping, to a Raspberry Pi Pico over serial for the LED strip, and over SSH to a volumetric display I built.',
  parts: [
    { name: 'Projection mapping', detail: 'GLSL shader in TouchDesigner, audio-reactive over OSC. A Kinect cuts out the silhouette of anyone in front of it.' },
    { name: 'LED strip', detail: 'WS2811 strip on a Raspberry Pi Pico, driven by one of RICO’s frequency bands over serial' },
    { name: 'Volumetric display', detail: 'Spinning persistence-of-vision display on a Raspberry Pi 4 with two LED panels, reached over SSH' },
  ],
}

export const thesisVideo = 'wAIUQFccu6g'

export const media = {

  interfaceLoop: { id: thesisVideo, start: 22, end: 35, title: 'RICO interface' },
  userTest: { id: thesisVideo, start: 38, end: 110, title: 'User test: a musician tries RICO for the first time' },
  fretboard: { id: thesisVideo, start: 110, end: 177, title: 'Hybrid After Effects plugin on a guitar fretboard' },
  building: { id: thesisVideo, start: 177, end: 256, title: 'Building Phantom Performer' },
  installationLoop: { id: thesisVideo, start: 257, end: 271, title: 'Phantom Performer running' },

  phantomPhoto: '2-1.jpg',
  phantomSpheres: '6.jpg',
  phantomMacro: 'phantom-macro.jpg',
}

export const logoHover: 'decode' | 'hex' | 'binary' | 'scan' | 'rgb' = 'decode'

export const cursorStyle: 'trail' | 'gcode' | 'piano' | 'wave' | 'pixel' | 'osc' | 'led' = 'osc'

export const heroBackground: 'field' | 'bands' | 'prisms' | 'warp' | 'sdf' = 'sdf'
