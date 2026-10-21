export const LINKS = {
  repo: 'https://github.com/mayakhalil-cmd/RICO',
  releases: 'https://github.com/mayakhalil-cmd/RICO/releases',
  issues: 'https://github.com/mayakhalil-cmd/RICO/issues',
  paper: 'https://computer-arts-society.com/eva/documents/2026/295_Khalil_EVA26.pdf',
  paperDoi: 'https://dx.doi.org/10.14236/ewic/EVA2026.56',
  ndiRuntime: 'https://downloads.ndi.tv/SDK/NDI_SDK/NDI%206%20Runtime.exe',
  teVirtualMidi: 'https://www.tobias-erichsen.de/software/virtualmidi/virtualmidi-sdk.html',
} as const

export const EXT = { target: '_blank', rel: 'noopener noreferrer' } as const

export const RELEASE = {
  name: 'RICO Beta v2.2.0',
  installer: 'RICO_Setup_v2.2.0.exe',
  platform: 'Windows 10/11 x64',
} as const

export interface Feature {
  name: string
  blurb: string
  note?: string
}
export interface FeatureGroup {
  title: string
  items: Feature[]
}

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: 'Control',
    items: [
      {
        name: 'MIDI',
        blurb:
          'Route, learn and remap any controller. Teach RICO what a knob or fader should control, then send it wherever it needs to go. Software MIDI ports let your other applications talk to each other.',
        note: 'Virtual MIDI ports use teVirtualMIDI',
      },
      {
        name: 'Guitar to MIDI',
        blurb:
          'Converts live audio input into MIDI in real time, so a guitar can drive synths or visuals.',
      },
      {
        name: 'Ableton Link',
        blurb:
          'Keeps tempo in sync with other Link-enabled software and devices on the same network.',
      },
    ],
  },
  {
    title: 'Data & hardware',
    items: [
      {
        name: 'OSC',
        blurb:
          'Send and receive OSC, and send to several destinations at once, so one source can feed TouchDesigner and other applications at the same time.',
      },
      {
        name: 'Serial',
        blurb:
          'Talk to microcontrollers and custom hardware over a serial port. In Phantom Performer, serial carried audio-analysis data to a Raspberry Pi Pico driving an LED strip.',
      },
      {
        name: 'MQTT',
        blurb: 'Connect to IoT devices and custom hardware that speak MQTT.',
      },
    ],
  },
  {
    title: 'Video',
    items: [
      {
        name: 'Spout',
        blurb: 'Share live textures between DirectX applications in real time.',
      },
      {
        name: 'NDI',
        blurb: 'Send and receive video streams over your network.',
        note: 'Requires the NDI Runtime',
      },
    ],
  },
  {
    title: 'Light & sound',
    items: [
      {
        name: 'DMX / Art-Net',
        blurb: 'Control lighting rigs from the same place you route everything else.',
      },
      {
        name: 'Audio analysis',
        blurb:
          'Captures the audio your computer is playing, analyses it with an FFT, and turns frequency bands and beat detection into control data for visuals, lighting and hardware.',
      },
    ],
  },
]

export const STEPS = [
  {
    n: '01',
    title: 'Connect',
    body: 'Open RICO and bring in what you work with: a MIDI controller, an audio source, a serial device, a video stream, or another application.',
  },
  {
    n: '02',
    title: 'Route',
    body: 'Choose where each signal goes. Learn and remap MIDI, add one or several OSC destinations, pick which audio bands to send, and set up your lighting or hardware outputs.',
  },
  {
    n: '03',
    title: 'Perform',
    body: 'Signals move between your software and hardware in real time. Your configuration is saved to a plain-text file, so a setup can travel to the next venue or machine.',
  },
]

export const WHO = [
  'VJs and live visual performers',
  'Musicians and live electronic artists',
  'New media artists building interactive installations',
  'Creative technologists prototyping AV systems',
  'Studios and agencies working with real-time media',
  'Developers building interactive or generative spatial systems',
]

export const SPECS: [string, string][] = [
  ['Platform', 'Windows 10/11 x64 only'],
  ['Status', 'Public beta (v2.2.0)'],
  ['Interface', 'C++ · DirectX 11 · Dear ImGui'],
  ['Libraries', 'RtMidi · oscpack · Spout · NDI SDK · paho-mqtt · miniaudio · pffft · Ableton Link'],
  ['Audio analysis', 'Loopback capture · 1024-point FFT · about 21 ms latency (EVA 2026 paper)'],
  ['Configuration', 'Saved to a plain-text file'],
  ['License', 'Free to download · currently closed source'],
]

export interface MediaItem {
  id: string
  kind: 'image' | 'video'
  title: string
  ratio: string
  file: string
  ready: boolean
  alt?: string
}

export const MEDIA: MediaItem[] = [
  {
    id: 'ui',
    kind: 'image',
    title: 'RICO interface',
    ratio: '16 / 10',
    file: 'media/rico-interface.png',
    ready: false,
    alt: 'Screenshot of the RICO interface',
  },
  {
    id: 'pp1',
    kind: 'image',
    title: 'Phantom Performer · photograph 1',
    ratio: '4 / 5',
    file: 'media/phantom-performer-1.jpg',
    ready: false,
    alt: 'Photograph of the Phantom Performer installation',
  },
  {
    id: 'pp2',
    kind: 'image',
    title: 'Phantom Performer · photograph 2',
    ratio: '3 / 2',
    file: 'media/phantom-performer-2.jpg',
    ready: false,
    alt: 'Photograph of the Phantom Performer installation',
  },
  {
    id: 'demo',
    kind: 'video',
    title: 'Demonstration video',
    ratio: '16 / 9',
    file: 'media/rico-demo.mp4',
    ready: false,
  },
]

export const VIDEOS = [
  { title: 'Audio-reactive projection in TouchDesigner (Phantom Performer)', url: 'https://www.youtube.com/watch?v=JMEpWeDxqos' },
  { title: 'RICO live demo', url: 'https://www.youtube.com/watch?v=WFSsrMt0q5o' },
  { title: 'RICO as a switcher', url: 'https://www.youtube.com/watch?v=pCdKzlmJL9U' },
  { title: 'VJing in After Effects in real time with RICO', url: 'https://www.youtube.com/watch?v=H7p1swY0vSk' },
]