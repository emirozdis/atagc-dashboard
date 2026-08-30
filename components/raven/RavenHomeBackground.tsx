export default function RavenHomeBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <span className="raven-home-glow raven-home-glow-one" />
      <span className="raven-home-glow raven-home-glow-two" />
      <span className="raven-home-glow raven-home-glow-three" />
      <div className="raven-home-stars absolute inset-0">
        {Array.from({ length: 24 }, (_, index) => <span key={index} className={`raven-home-speck raven-home-speck-${index + 1}`} />)}
      </div>
    </div>
  );
}
