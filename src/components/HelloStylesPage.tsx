import { Circle, Scissors, Type } from "lucide-react";

const swatches = [
  { name: "Blue Marker", css: "var(--marker-length)" },
  { name: "Red Marker", css: "var(--marker-edit)" },
  { name: "Orange Marker", css: "var(--marker-caption)" },
  { name: "Green Resolved", css: "var(--marker-resolved)" },
];

export function HelloStylesPage() {
  return (
    <section className="card">
      <p className="kicker">Requirement 2</p>
      <h2>Hello Styles</h2>
      <p className="muted">Dark theme + accent colors + Inter + marker iconography.</p>

      <div className="swatch-grid">
        {swatches.map((swatch) => (
          <div className="swatch" key={swatch.name}>
            <div className="swatch-chip" style={{ background: swatch.css }} />
            <span>{swatch.name}</span>
          </div>
        ))}
      </div>

      <div className="icon-row">
        <span className="icon-pill"><Circle size={16} /> Length Edit</span>
        <span className="icon-pill"><Scissors size={16} /> Audio/Visual Edit</span>
        <span className="icon-pill"><Type size={16} /> Caption</span>
      </div>
    </section>
  );
}
