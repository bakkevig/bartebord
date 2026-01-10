function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#hjem" className="font-serif text-lg text-zinc-100 hover:text-amber-500 transition-colors">
            Bartebord
          </a>
          <div className="flex gap-6 text-sm">
            <a href="#om" className="text-zinc-400 hover:text-amber-500 transition-colors">Om</a>
            <a href="#lokaler" className="text-zinc-400 hover:text-amber-500 transition-colors">Lokaler</a>
            <a href="#movember" className="text-zinc-400 hover:text-amber-500 transition-colors">Movember</a>
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
          <p className="text-xl md:text-2xl text-zinc-300 max-w-md">
            En feiring av barter i alle størrelser og fasonger
          </p>
        </div>
        <a href="#om" className="absolute bottom-12 animate-bounce z-10">
          <svg className="w-6 h-6 text-zinc-400 hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      {/* About Section */}
      <section id="om" className="py-24 px-6 bg-zinc-900">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-amber-500 uppercase tracking-[0.3em] text-sm mb-4">
            Tradisjonen
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-100 mb-8">
            Hva er Bartebord?
          </h2>
          <div className="text-zinc-400 text-lg leading-relaxed space-y-6">
            <p>
              Bartebord er en årlig feiring av barten – i alle dens størrelser og fasonger. Hver november samles menn i mørke dresser til en aften med stil, eleganse og godt selskap.
            </p>
            <p>
              Kvelden byr på cocktails, kaviar, vodka og utsøkt mat i sofistikerte omgivelser. Det er en anledning til å hedre bartens tradisjon, samtidig som vi støtter en god sak.
            </p>
          </div>
        </div>
      </section>

      {/* Practical Info Section */}
      <section id="lokaler" className="py-24 px-6 bg-zinc-950">
        <div className="max-w-2xl mx-auto">
          <p className="text-amber-500 uppercase tracking-[0.3em] text-sm text-center mb-4">
            Bartebord 2025
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-100 text-center mb-6">
            Lokaler
          </h2>
          <p className="text-zinc-500 text-center mb-16">
            Lokaler for 2026 kommer snart
          </p>

          <div className="space-y-8">
            <div className="border border-zinc-800 p-8">
              <p className="text-amber-500 text-sm uppercase tracking-wider mb-2">Første stopp</p>
              <h3 className="text-2xl font-serif text-zinc-100 mb-2">
                Gaffel & Karaffel
              </h3>
              <p className="text-zinc-500 mb-4">Øvre Holmegate 20, Stavanger</p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Gaffel+%26+Karaffel+Øvre+Holmegate+20+Stavanger"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Se på kart
              </a>
            </div>

            <div className="border border-zinc-800 p-8">
              <p className="text-amber-500 text-sm uppercase tracking-wider mb-2">Hovedarrangement</p>
              <h3 className="text-2xl font-serif text-zinc-100 mb-2">
                Greenhouse Rooftop
              </h3>
              <p className="text-zinc-500 mb-4">Hospitalsgata 6, Stavanger</p>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Hospitalsgata+6+Stavanger"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Se på kart
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Movember Section */}
      <section id="movember" className="py-24 px-6 bg-zinc-900">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-amber-500 uppercase tracking-[0.3em] text-sm mb-4">
            Veldedighet
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-100 mb-6">
            Movember
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-10">
            Bartebord støtter Movember-stiftelsen. I løpet av november samler vi inn penger til menns helse.
          </p>
          <div className="bg-white p-4 rounded-lg inline-block mb-8">
            <img
              src="/movember-qr.png"
              alt="QR-kode til Movember-innsamling"
              className="w-48 h-48"
            />
          </div>
          <div>
            <a
              href="https://movember.com/t/bartebord-2025"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-lg text-zinc-950 bg-amber-500 hover:bg-amber-400 px-8 py-4 font-semibold transition-colors"
            >
              Doner til Movember
            </a>
          </div>
        </div>
      </section>

      {/* Board Section */}
      <section className="py-24 px-6 bg-zinc-950">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-amber-500 uppercase tracking-[0.3em] text-sm mb-4">
            Styret
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-100 mb-6">
            Bartebord Board of Directors
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-12">
            Bartebord arrangeres av en gruppe ildsjeler kjent som Bartebord Board of Directors.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Alf Georg Gratveit</div>
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Chris Bateman</div>
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Eivind Bakkevig</div>
            <div className="text-lg md:text-xl font-serif text-zinc-100 whitespace-nowrap">Jan-Erik Hauge</div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="kontakt" className="py-24 px-6 bg-zinc-900">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-amber-500 uppercase tracking-[0.3em] text-sm mb-4">
            Spørsmål?
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-zinc-100 mb-8">
            Kontakt
          </h2>
          <a
            href="mailto:post@bartebord.no"
            className="text-xl text-zinc-300 hover:text-amber-500 transition-colors border-b border-zinc-700 hover:border-amber-500 pb-1"
          >
            post@bartebord.no
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-zinc-950 border-t border-zinc-900 text-center">
        <p className="text-zinc-600 text-sm">&copy; {new Date().getFullYear()} Bartebord</p>
      </footer>
    </div>
  )
}

export default App
