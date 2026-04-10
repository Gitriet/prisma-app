export default function VerifyPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-sm">
        <div className="text-3xl mb-4">✉️</div>
        <h1 className="font-serif font-bold text-xl mb-3">Controleer je inbox</h1>
        <p className="text-muted text-sm leading-relaxed">
          We hebben je een inloglink gestuurd. Klik op de link in de e-mail om in te loggen.
          <br />
          <br />
          Geen mail ontvangen? Controleer je spam of probeer opnieuw.
        </p>
      </div>
    </div>
  );
}
