"use client";

import { useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/StatusBadge";
import type { ItemResponse } from "@/lib/types";

type ItemDetailModalProps = {
  item: ItemResponse;
  onClose: () => void;
};

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopyDraft() {
    if (!item.suggested_reply) {
      return;
    }

    try {
      await navigator.clipboard.writeText(item.suggested_reply);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  return (
    <Modal title={`Message #${item.id}`} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {item.category && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize text-slate-700">
              {item.category}
            </span>
          )}
          {item.priority && (
            <span className="text-xs text-slate-500">Priority: {item.priority}</span>
          )}
          {item.sentiment && (
            <span className="text-xs text-slate-500">Sentiment: {item.sentiment}</span>
          )}
        </div>

        <DetailSection label="Original message">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
            {item.input_text}
          </p>
        </DetailSection>

        <DetailSection label="Summary">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {item.summary ?? "—"}
          </p>
        </DetailSection>

        <DetailSection
          label="Draft reply"
          action={
            item.suggested_reply ? (
              <Button
                variant="secondary"
                onClick={handleCopyDraft}
                className="px-3 py-1.5 text-xs"
              >
                {copyState === "copied"
                  ? "Copied!"
                  : copyState === "error"
                    ? "Copy failed"
                    : "Copy draft reply"}
              </Button>
            ) : undefined
          }
        >
          <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-900">
            {item.suggested_reply ?? "—"}
          </p>
        </DetailSection>
      </div>
    </Modal>
  );
}

function DetailSection({
  label,
  children,
  action,
}: {
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
