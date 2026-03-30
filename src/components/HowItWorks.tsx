export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Browse",
      description:
        "Explore community-created dashboard layouts and DBC files. Filter by vehicle type, rating, or popularity to find exactly what you need.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      number: "02",
      title: "Download",
      description:
        "Download .rdm layout files or .dbc CAN database files directly to your device. Free and premium options available.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
    {
      number: "03",
      title: "Install",
      description:
        "Open the file in RDM-7 Visual Designer and your new layout or signal database is ready to use. One click, fully configured.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  ];

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div key={step.number} className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-heading text-lg font-bold shrink-0">
                {step.number}
              </div>
              <div className="text-[var(--accent)]">{step.icon}</div>
            </div>
            <h3 className="text-xl font-bold font-heading mb-2">{step.title}</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
