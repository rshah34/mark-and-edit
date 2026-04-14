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
      <h2>Hello Styles</h2>
      <p className="muted">Inter font, dark theme, marker colors, and marker icons.</p>

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
        <span className="icon-pill"><Scissors size={16} /> Audio Edit</span>
        <span className="icon-pill"><Type size={16} /> Caption</span>
      </div>

      <div className="type-grid">
        <p className="type-sample inter-400">Inter 400: Marker created at 0:12</p>
        <p className="type-sample inter-500">Inter 500: Marker created at 0:12</p>
        <p className="type-sample inter-600">Inter 600: Marker created at 0:12</p>
        <p className="type-sample inter-700">Inter 700: Marker created at 0:12</p>
      </div>
    </section>
  );
}
