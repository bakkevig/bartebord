const MAP_PIN = (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

function MapLink({ href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-amber-500 transition-colors"
    >
      {MAP_PIN}
      Se på kart
    </a>
  )
}

function SectionHeading({ eyebrow, title, className = 'mb-6' }) {
  return (
    <>
      <p className="text-amber-500 uppercase tracking-[0.3em] text-sm mb-4">
        {eyebrow}
      </p>
      <h2 className={`text-3xl md:text-4xl xl:text-5xl font-serif font-bold text-zinc-100 ${className}`}>
        {title}
      </h2>
    </>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#hjem" className="font-serif text-lg md:text-xl text-zinc-100 hover:text-amber-500 transition-colors">
            Bartebord
          </a>
          <div className="flex gap-6 md:gap-8 text-sm md:text-base">
            <a href="#om" className="text-zinc-400 hover:text-amber-500 transition-colors">Om</a>
            <a href="#lokaler" className="text-zinc-400 hover:text-amber-500 transition-colors">Hvor</a>
            <a href="#kuvert" className="text-zinc-400 hover:text-amber-500 transition-colors">Kuvert</a>
            <a href="#kontakt" className="text-zinc-400 hover:text-amber-500 transition-colors">Kontakt</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        id="hjem"
        className="min-h-screen flex flex-col items-center justify-start px-6 pt-32 text-center relative bg-cover bg-center"
        style={{ backgroundImage: 'url(/hero.jpg)' }}
      >
        <div className="absolute inset-0 bg-zinc-950/70" />
        <div className="relative z-10">
          <p className="text-amber-500 uppercase tracking-[0.3em] text-sm mb-6">
            Stavanger
          </p>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-zinc-100 mb-4">
            Bartebord
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 max-w-md md:max-w-none">
            En feiring av barter i alle størrelser og fasonger
          </p>
          <p className="text-amber-500 text-lg md:text-xl font-serif mt-8">
            Lørdag 28. november 2026
          </p>
        </div>
        <a href="#om" className="absolute bottom-12 animate-bounce z-10">
          <svg className="w-6 h-6 text-zinc-400 hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      {/* About Section */}
      <section id="om" className="py-24 bg-zinc-900">
        <div className="max-w-5xl mx-auto px-6">
          <SectionHeading eyebrow="Tradisjonen" title="Hva er Bartebord?" className="mb-8" />
          <div className="max-w-3xl text-zinc-400 text-lg xl:text-xl leading-relaxed space-y-6">
            <p>
              Bartebord er en høytidelig sammenkomst til ære for mannen, barten og den gode selskapsånd. Hver november møtes bartebrødrene i mørk dress til skål og festmiddag, og i år arrangeres Bartebord for syvende gang.
            </p>
            <p>
              Deltakelse forutsetter behørig oppspart bart, påbegynt senest 1. november. Det gis ikke dispensasjon. Tradisjonen tro blir kveldens fremste bart premiert.
            </p>
          </div>
        </div>
      </section>

      {/* Practical Info Section */}
      <section id="lokaler" className="py-24 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6">
          <SectionHeading eyebrow="Bartebord 2026" title="Lokaler" className="mb-4" />
          <p className="text-zinc-400 text-lg xl:text-xl mb-12">Lørdag 28. november</p>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="border border-zinc-800 p-8">
              <p className="text-amber-500 text-sm uppercase tracking-wider mb-2">Kl. 17.00 · Innledende skål</p>
              <h3 className="text-2xl xl:text-3xl font-serif text-zinc-100 mb-2">
                Emne
              </h3>
              <p className="text-zinc-400 mb-2">Kongsgårdbakken 3, 6. etasje, Stavanger</p>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Inngangen ligger på hjørnet mot Domkirken, ved siden av NIO Space. Ring på knappen merket «Emne».
              </p>
              <MapLink href="https://www.google.com/maps/search/?api=1&query=Kongsgårdbakken+3+Stavanger" />
            </div>

            <div className="border border-zinc-800 p-8">
              <p className="text-amber-500 text-sm uppercase tracking-wider mb-2">Kl. 20.00 · Festmiddag</p>
              <h3 className="text-2xl xl:text-3xl font-serif text-zinc-100 mb-2">
                Seid Grill & Cocktailbar
              </h3>
              <p className="text-zinc-400 mb-2">Knud Holms gate 8, Stavanger</p>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Treretters middag med drikke, i eget lokale.
              </p>
              <MapLink href="https://www.google.com/maps/search/?api=1&query=Seid+Grill+%26+Cocktailbar+Knud+Holms+gate+8+Stavanger" />
            </div>
          </div>
        </div>
      </section>

      {/* Payment Section */}
      <section id="kuvert" className="py-24 bg-zinc-900">
        <div className="max-w-5xl mx-auto px-6">
          <SectionHeading eyebrow="Kuvert og Movember" title="Årets kuvert" className="mb-8 lg:mb-12" />
          <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-16 lg:items-start">
            <div className="text-zinc-400 text-lg xl:text-xl leading-relaxed space-y-6 mb-12 lg:mb-0">
              <p>
                Kuvertprisen er minst kr 2 000 per bartebror. Det som blir til overs etter middagen, gir vi til Movember på vegne av deltakerne. Vil du gi mer, betaler du bare inn et høyere beløp.
              </p>
              <p>
                Movember jobber med menns helse: psykisk helse og selvmordsforebygging, prostatakreft og testikkelkreft. For oss er det arbeidet med menns psykiske helse som betyr mest. Selvmord kan i stor grad forebygges, og det begynner med at vi snakker sammen.
              </p>
              <p>
                <a
                  href="https://no.movember.com/mens-health/mental-health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-300 hover:text-amber-500 transition-colors border-b border-zinc-700 hover:border-amber-500 pb-0.5"
                >
                  Les mer om Movembers arbeid for psykisk helse
                </a>
              </p>
            </div>

            {/* On phones the QR code is hidden (you can't scan your own screen) and the button comes first; on desktop the QR code does */}
            <div className="flex flex-col items-start gap-6 border border-zinc-800 p-8 lg:p-10">
              <p className="order-1 text-zinc-300 text-lg xl:text-xl">
                Betal med Vipps innen <span className="text-amber-500 whitespace-nowrap">12. desember</span>
              </p>
              <a
                href="https://qr.vipps.no/box/b9246fa5-45c9-4177-a7ec-12ab9fa16a9c/pay-in"
                target="_blank"
                rel="noopener noreferrer"
                className="order-2 lg:order-4 inline-block text-lg text-zinc-950 bg-amber-500 hover:bg-amber-400 px-8 py-4 font-semibold transition-colors"
              >
                Betal med Vipps
              </a>
              <div className="hidden md:block order-3 lg:order-2 bg-white p-2 rounded-lg">
                <img
                  src="/vipps-qr.png"
                  alt="QR-kode for betaling med Vipps"
                  className="w-40 h-40 lg:w-48 lg:h-48"
                />
              </div>
              <p className="order-4 lg:order-3 text-zinc-400 -mt-2">
                Boksnummer <span className="text-zinc-200 font-semibold tracking-wider">2261SC</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Board Section */}
      <section className="py-24 bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6">
          <SectionHeading eyebrow="Styret" title="Bartebord Board of Directors" />
          <p className="text-zinc-400 text-lg xl:text-xl leading-relaxed mb-10">
            Bartebord arrangeres av en gruppe ildsjeler kjent som Bartebord Board of Directors.
          </p>
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Alf Georg Grastveit</div>
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Chris Bateman</div>
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Eivind Bakkevig</div>
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Jan-Erik Hauge</div>
          </div>
        </div>
      </section>

      {/* Footer with contact */}
      <footer id="kontakt" className="py-16 bg-zinc-900">
        <div className="max-w-5xl mx-auto px-6 flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-amber-500 uppercase tracking-[0.3em] text-sm mb-4">
              Spørsmål?
            </p>
            <a
              href="mailto:post@bartebord.no"
              className="text-xl text-zinc-200 hover:text-amber-500 transition-colors border-b border-zinc-700 hover:border-amber-500 pb-1"
            >
              post@bartebord.no
            </a>
          </div>
          <p className="text-zinc-400 text-sm">Vi bartes. &copy; {new Date().getFullYear()} Bartebord</p>
        </div>
      </footer>
    </div>
  )
}

export default App
