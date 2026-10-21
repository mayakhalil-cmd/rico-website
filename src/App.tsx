import './App.css'
import About from './components/About'
import BootScreen from './components/BootScreen'
import Cursor from './components/Cursor'
import Download from './components/Download'
import Features from './components/Features'
import Footer from './components/Footer'
import Hero from './components/Hero'
import HowItWorks from './components/HowItWorks'
import Marquee from './components/Marquee'
import Nav from './components/Nav'
import SignalLab from './components/SignalLab'
import SignalMap from './components/SignalMap'
import Work from './components/Work'

export default function App() {
  return (
    <>
      <BootScreen />
      <Cursor />
      <a className="skip-link" href="#main">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <Marquee />
        <SignalMap />
        <Features />
        <SignalLab />
        <HowItWorks />
        <About />
        <Work />
        <Download />
      </main>
      <Footer />
    </>
  )
}
