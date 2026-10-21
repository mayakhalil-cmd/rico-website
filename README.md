# RICO Website

This repository contains the official website for **RICO (Real-time Integration Control Operations)**, a free tool for artists and designers who work with real-time audiovisual systems.

**Live site:** https://mayakhalil-cmd.github.io/rico-website/

## About RICO

RICO is a lightweight hub that connects creative software, communication protocols and hardware. It routes and translates MIDI, OSC, Spout, NDI, DMX / Art-Net, serial data and audio analysis between applications in real time, without the need for code or complex patching.

The project began as a response to a problem I faced repeatedly in my own installation work. Each piece required several programs and devices to communicate with each other, and connecting them often took more time than creating the work itself. RICO was designed to make this process simple and accessible, especially for independent artists and students.

RICO was presented at **EVA London 2026**. It is also the system behind my installation **Phantom Performer**, exhibited at Open Studios, School of Visual Arts, New York.

## About the Website

The website is designed to reflect the identity of RICO itself. It uses a terminal-inspired visual language, the RICO color palette, and interactive visuals that respond to sound.

**Generative visuals.** The backgrounds at the top of the page are generated in real time. They are written in TypeScript and GLSL shaders using WebGL, and they respond to mouse movement, clicks and audio.

**Audio reactivity.** Visitors can play a demo beat, upload their own music or use a microphone. The audio is analyzed into the same six frequency bands that RICO uses, and these values drive the visuals.

**Signal Lab.** An interactive section where visitors can build their own visual and control it with sound, as a small demonstration of how RICO works.

**Privacy.** All processing happens in the browser. No audio or personal data is uploaded or stored.

## Download

RICO is free and available for Windows 10 and 11 (x64).
Download the latest version from the [releases page](https://github.com/mayakhalil-cmd/RICO/releases).

## Author

Designed and developed by **Maya Khalil**
[mayakhalil.com](https://mayakhalil.com)

