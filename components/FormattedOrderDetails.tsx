"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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
  const fields = details
    .split("\n")
    .flatMap((line) => line.split(embeddedLabelPattern))
    .map((line) => line.trim())
    .filter(Boolean);

  return fields.reduce<string[]>((result, field) => {
    const previous = result.at(-1);
    const startsKnownField = embeddedFieldLabels.some(
      (label) => new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`, "i").test(field),
    );
    if (previous && /^message card\s*:/i.test(previous) && !startsKnownField) {
      result[result.length - 1] = `${previous}\n${field}`;
    } else {
      result.push(field);
    }
    return result;
  }, []);
}
export function FormattedOrderDetails({
  details,
  className = "",
  orderId,
  recipientName,
  recipientPhone,
  deliveryAddressLine1,
  deliveryAddressLine2,
}: {
  details: string;
  className?: string;
  orderId?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  deliveryAddressLine1?: string | null;
  deliveryAddressLine2?: string | null;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const addressCopyText = orderId && deliveryAddressLine1 && deliveryAddressLine2
    ? [
        orderId,
        [recipientName, recipientPhone].filter(Boolean).join(" "),
        deliveryAddressLine1,
        deliveryAddressLine2,
      ].filter(Boolean).join("\n")
    : null;

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1600);
    } catch {
      // Clipboard access can be unavailable in an embedded or non-secure preview.
      // Keep the card text visible so it can still be selected manually.
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {splitEmbeddedFields(details).map((line, index) => {
        const separator = line.indexOf(":");
        if (separator <= 0) {
          return <p key={index} className="whitespace-pre-wrap">{line}</p>;
        }

        const label = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trimStart();
        const isMessageCard = label.toLowerCase() === "message card";
        const isAddress = label.toLowerCase() === "address";
        const copyValue = isMessageCard ? value : isAddress ? addressCopyText : null;
        const copyKey = `${isMessageCard ? "message" : "address"}-${index}`;

        return (
          <div key={index} className={isAddress ? "space-y-1" : undefined}>
            {isAddress && (recipientName || recipientPhone) && (
              <p className="text-gray-900">
                <strong className="font-semibold">Recipient:</strong>
                {recipientName ? ` ${recipientName}` : ""}
                {recipientPhone ? ` · ${recipientPhone}` : ""}
              </p>
            )}
            <p className="whitespace-pre-wrap">
              <strong className="font-semibold text-gray-900">{line.slice(0, separator + 1)}</strong>
              {copyValue && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyText(copyValue, copyKey);
                  }}
                  className="ml-2 inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 align-middle text-xs font-medium text-gray-700 hover:bg-gray-50"
                  aria-label={isMessageCard ? "Copy message card" : "Copy delivery address"}
                >
                  {copiedKey === copyKey ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey === copyKey ? "已复制" : "复制"}
                </button>
              )}
              {value ? ` ${value}` : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}
