const embeddedFieldLabels = [
  "Preferred bump-in / delivery time",
  "Event start time",
  "Full delivery address / venue name",
  "Venue access instructions, including any loading zone, parking or lift access information",
  "Best contact person on the day, including their mobile number",
  "Venue access instructions",
  "Best contact person",
  "Delivery Instructions",
  "Message Card",
  "Delivery Fee",
  "Requested date",
  "Requested time",
  "Colour of Roses",
  "Address",
  "Style",
  "Size",
];

const embeddedLabelPattern = new RegExp(
  `\\s+(?=(?:${embeddedFieldLabels.sort((a, b) => b.length - a.length).join("|")})\\s*:)`,
  "gi",
);

function splitEmbeddedFields(details: string): string[] {
  return details
    .split("\n")
    .flatMap((line) => line.split(embeddedLabelPattern))
    .map((line) => line.trim())
    .filter(Boolean);
}

export function FormattedOrderDetails({
  details,
  className = "",
}: {
  details: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {splitEmbeddedFields(details).map((line, index) => {
        const separator = line.indexOf(":");
        if (separator <= 0) {
          return <p key={index} className="whitespace-pre-wrap">{line}</p>;
        }

        return (
          <p key={index} className="whitespace-pre-wrap">
            <strong className="font-semibold text-gray-900">{line.slice(0, separator + 1)}</strong>
            {line.slice(separator + 1) ? ` ${line.slice(separator + 1).trimStart()}` : ""}
          </p>
        );
      })}
    </div>
  );
}
